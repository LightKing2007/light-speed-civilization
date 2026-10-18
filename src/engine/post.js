/* 后期管线（每个镜头一套参数）：
   MSAA HDR 渲染 → [GTAO 环境光遮蔽] → [景深] → 物理辉光（13 点降采样 + 帐篷升采样，阈值软膝） → AgX 色调映射 + 调色 + 暗角 + 颗粒 → LDR
   两个 LDR 槽位再交给转场合成器。

   辉光设计要点（避免「廉价辉光」）：
   - 只有线性 HDR 亮度超过阈值（默认 1.0，即比漫反射白还亮）的像素才进入辉光；
   - 扩散由 scatter 控制（每级升采样与上一级的混合比例），默认偏小，核心紧、拖尾淡；
   - 强度默认很低（0.12）；真正亮的光源（火花、灯丝、太阳）才会明显。 */
import * as THREE from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function quad(fs, uniforms, defines = {}) {
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, defines, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(quadGeo, m); mesh.frustumCulled = false; const s = new THREE.Scene(); s.add(mesh);
  return { m, u: m.uniforms, draw(r, target) { r.setRenderTarget(target); r.render(s, quadCam); } };
}
// three 以 GLSL 3.00 es 编译 ShaderMaterial，并提供 gl_FragColor / texture2D 兼容宏，因此 texture()/textureLod() 也可直接用
const DOWN_FS = `uniform sampler2D tSrc;uniform vec2 uTexel;uniform float uThresh,uKnee;uniform int uFirst;varying vec2 vUv;
vec3 S(float x,float y){return texture2D(tSrc,vUv+vec2(x,y)*uTexel).rgb;}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 karis(vec3 c){return c/(1.+lum(c));}
void main(){
 vec3 a=S(-2.,2.),b=S(0.,2.),c=S(2.,2.),d=S(-2.,0.),e=S(0.,0.),f=S(2.,0.),g=S(-2.,-2.),h=S(0.,-2.),i=S(2.,-2.),j=S(-1.,1.),k=S(1.,1.),l=S(-1.,-1.),m=S(1.,-1.);
 vec3 col;
 if(uFirst==1){
  vec3 g0=(j+k+l+m)*.25,g1=(a+b+d+e)*.25,g2=(b+c+e+f)*.25,g3=(d+e+g+h)*.25,g4=(e+f+h+i)*.25;
  float w0=.5/(1.+lum(g0)),w1=.125/(1.+lum(g1)),w2=.125/(1.+lum(g2)),w3=.125/(1.+lum(g3)),w4=.125/(1.+lum(g4));
  col=(g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4);
  float br=max(col.r,max(col.g,col.b));float rq=clamp(br-uThresh+uKnee,0.,2.*uKnee);rq=rq*rq/(4.*uKnee+1e-4);
  col*=max(rq,br-uThresh)/max(br,1e-4);
  col=min(col,vec3(64.));
 } else {
  col=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125;
 }
 gl_FragColor=vec4(col,1.);}`;
const UP_FS = `uniform sampler2D tLow,tHigh;uniform vec2 uTexel;uniform float uScatter;varying vec2 vUv;
vec3 L(float x,float y){return texture2D(tLow,vUv+vec2(x,y)*uTexel).rgb;}
void main(){vec3 up=(L(-1.,1.)+L(1.,1.)+L(-1.,-1.)+L(1.,-1.))*.0625+(L(0.,1.)+L(0.,-1.)+L(-1.,0.)+L(1.,0.))*.125+L(0.,0.)*.25;
 gl_FragColor=vec4(mix(texture2D(tHigh,vUv).rgb,up,uScatter),1.);}`;
// 单通道散景景深（Dennis Gustafsson 方法），CoC 以像素计
const DOF_FS = `#include <packing>
uniform sampler2D tColor,tDepth;uniform vec2 uRes;uniform float uFocus,uAperture,uMaxBlur,cameraNear,cameraFar;varying vec2 vUv;
float vz(vec2 uv){float d=texture2D(tDepth,uv).x;return -perspectiveDepthToViewZ(d,cameraNear,cameraFar);}
float coc(float z){return clamp(uAperture*abs(1./uFocus-1./z)*uRes.y,0.,uMaxBlur);}
void main(){
 vec2 px=1./uRes;float cz=vz(vUv);float cs=coc(cz);vec3 col=texture2D(tColor,vUv).rgb;float tot=1.;float rad=.5;float ang=0.;
 for(int i=0;i<160;i++){ if(rad>=uMaxBlur) break;
  vec2 tc=vUv+vec2(cos(ang),sin(ang))*px*rad;vec3 sc=texture2D(tColor,tc).rgb;float sz=vz(tc);float ssz=coc(sz);
  if(sz>cz) ssz=clamp(ssz,0.,cs*2.);
  float m=smoothstep(rad-.5,rad+.5,ssz);col+=mix(col/tot,sc,m);tot+=1.;rad+=.5/rad*1.2;ang+=2.39996323;}
 gl_FragColor=vec4(col/tot,1.);}`;
// AgX（Troy Sobotka / Benjamin Wrensch 的近似）+ 调色
const FINAL_FS = `uniform sampler2D tScene,tBloom;uniform float uExpo,uBloom,uVig,uGrain,uCA,uTime,uSat,uContrast,uFlicker,uFade,uWeave,uTone;uniform int uMode;
uniform vec3 uLift,uGamma,uGain,uTint;uniform vec2 uRes;varying vec2 vUv;
vec3 agxC(vec3 x){vec3 x2=x*x;vec3 x4=x2*x2;return 15.5*x4*x2-40.14*x4*x+31.96*x4-6.868*x2*x+.4298*x2+.1191*x-.00232;}
vec3 agx(vec3 v){const mat3 M=mat3(.842479062253094,.0423282422610123,.0423756549057051,.0784335999999992,.878468636469772,.0784336,.0792237451477643,.0791661274605434,.879142973793104);
 const float lo=-12.47393,hi=4.026069;v=M*v;v=clamp(log2(max(v,vec3(1e-10))),lo,hi);v=(v-lo)/(hi-lo);return agxC(v);}
vec3 agxEotf(vec3 v){const mat3 Mi=mat3(1.19687900512017,-.0528968517574562,-.0529716355144438,-.0980208811401368,1.15190312990417,-.0980434501171241,-.0990297440797205,-.0989611768448433,1.15107367264116);
 v=Mi*v;return pow(max(v,vec3(0.)),vec3(2.2));}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
void main(){
 vec2 uv=vUv;
 if(uWeave>0.){float fr=floor(uTime*24.);uv+=(vec2(h12(vec2(fr,1.)),h12(vec2(fr,7.)))-.5)*uWeave/uRes*2.;}
 vec2 c=uv-.5;float d=length(c*vec2(uRes.x/uRes.y,1.))/1.0;
 vec2 off=c*uCA*(d*d)*2.;
 vec3 col=vec3(texture2D(tScene,uv+off).r,texture2D(tScene,uv).g,texture2D(tScene,uv-off).b);
 col+=texture2D(tBloom,uv).rgb*uBloom;
 col*=uExpo*uTint;
 col=uTone>.5?agxEotf(agx(col)):clamp(col,0.,1.);
 // 调色（显示线性空间）：lift / gamma / gain，对比度，饱和度
 col=uGain*(col+uLift*(1.-col));col=pow(max(col,vec3(0.)),1./uGamma);
 col=.18*pow(max(col,vec3(0.))/.18,vec3(uContrast));
 float L=dot(col,vec3(.2126,.7152,.0722));col=max(mix(vec3(L),col,uSat),vec3(0.));
 if(uMode==1){col=vec3(L);} else if(uMode==2){col=vec3(L)*vec3(1.08,.97,.82)+vec3(.012,.008,.0);}
 col*=1.+uFlicker*(h12(vec2(floor(uTime*24.),3.))-.5);
 float vg=smoothstep(1.25,.25,d);col*=mix(1.,vg,uVig);
 col=toSRGB(clamp(col,0.,1.));
 float n=h12(gl_FragCoord.xy+fract(uTime*13.37)*317.)+h12(gl_FragCoord.xy*1.37+fract(uTime*7.1)*91.)-1.;
 col+=n*uGrain*(1.-abs(L*2.-1.)*.6);
 col*=1.-uFade;
 gl_FragColor=vec4(col,1.);}`;
// 转场合成
const COMP_FS = `uniform sampler2D tA,tB;uniform float uMix,uFade;uniform int uType;uniform vec4 uP;uniform vec2 uRes;varying vec2 vUv;
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec3 blurA(vec2 uv,float lod){if(lod<.05)return texture(tA,uv).rgb;vec2 r=exp2(lod)/uRes;vec3 s=textureLod(tA,uv,max(lod-1.,0.)).rgb;float w=1.;for(int i=0;i<12;i++){float a=float(i)*2.39996;float d=sqrt((float(i)+.5)/12.);vec2 o=vec2(cos(a),sin(a))*d*r*1.6;s+=textureLod(tA,uv+o,max(lod-1.,0.)).rgb;w+=1.;}return s/w;}
vec3 blurB(vec2 uv,float lod){if(lod<.05)return texture(tB,uv).rgb;vec2 r=exp2(lod)/uRes;vec3 s=textureLod(tB,uv,max(lod-1.,0.)).rgb;float w=1.;for(int i=0;i<12;i++){float a=float(i)*2.39996;float d=sqrt((float(i)+.5)/12.);vec2 o=vec2(cos(a),sin(a))*d*r*1.6;s+=textureLod(tB,uv+o,max(lod-1.,0.)).rgb;w+=1.;}return s/w;}
void main(){
 vec2 uv=vUv;float f=uMix;vec3 a=texture(tA,uv).rgb;vec3 col;
 if(uType==0){col=texture(tB,uv).rgb;}
 else if(uType==1){vec3 b=texture(tB,uv).rgb;col=mix(a,b,f);}
 else if(uType==2){vec3 b=texture(tB,uv).rgb;col=f<.5?a*(1.-f*2.):b*(f*2.-1.);}
 else if(uType==3){float k=sin(3.14159*f);vec3 aa=blurA(uv,k*uP.x);vec3 bb=blurB(uv,k*uP.x);col=mix(aa,bb,smoothstep(.2,.8,f));}
 else if(uType==4){vec2 dir=vec2(cos(uP.x),sin(uP.x));vec2 p=(uv-.5)*vec2(uRes.x/uRes.y,1.);float x=dot(p,dir)/(abs(dir.x)*uRes.x/uRes.y*.5+abs(dir.y)*.5)*.5+.5;
  float s=uP.y;float e=f*(1.+s)-s;float m=smoothstep(e,e+s,x);vec3 b=texture(tB,uv).rgb;col=mix(b,a,m);
  col+=uP.z*vec3(1.)*exp(-abs(x-e-s*.5)*uRes.x*.35)*step(.001,f)*step(f,.999);}
 else if(uType==5){vec3 b=texture(tB,uv).rgb;float l=lum(a);float e=f*1.3-.15;float m=smoothstep(e-.15,e+.15,1.-l);col=mix(a,b,clamp(m*(uP.x>0.?1.:1.),0.,1.));col=mix(col,b,smoothstep(.85,1.,f));}
 else if(uType==6){vec3 b=texture(tB,uv).rgb;float w=1.-abs(f*2.-1.);col=mix(mix(a,b,step(.5,f)),vec3(1.,.98,.95),pow(w,1.5)*uP.x);}
 else {vec3 b=texture(tB,uv).rgb;col=mix(a,b,f);}
 col*=1.-uFade;
 gl_FragColor=vec4(col,1.);}`;

export const TRANSITIONS = { cut: 0, dissolve: 1, dip: 2, blur: 3, wipe: 4, luma: 5, flash: 6 };

export const DEFAULT_POST = {
  exposure: 1, bloom: { strength: .12, threshold: 1, knee: .5, scatter: .62, levels: 6 },
  ao: null, dof: null,
  grade: { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], contrast: 1, saturation: 1, tint: [1, 1, 1], mode: 0 },
  vignette: .28, grain: .028, ca: .0007, flicker: 0, weave: 0, tonemap: true,
};
/** 合并镜头的 post 设置（浅合并到 bloom/grade/ao/dof 子对象） */
export function mergePost(p = {}) {
  const d = DEFAULT_POST, o = { ...d, ...p };
  o.bloom = { ...d.bloom, ...(p.bloom || {}) };
  o.grade = { ...d.grade, ...(p.grade || {}) };
  o.ao = p.ao ? { radius: .5, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, intensity: 1, ...(p.ao === true ? {} : p.ao) } : null;
  o.dof = p.dof ? { focus: 5, aperture: .015, maxBlur: 14, ...p.dof } : null;
  return o;
}
/** 常用调色预设 */
export const GRADES = {
  neutral: {},
  warm: { tint: [1.06, 1, .9], lift: [.01, .006, 0], saturation: .95 },
  cool: { tint: [.92, .98, 1.08], lift: [0, .004, .012] },
  archival: { mode: 1, contrast: 1.05, lift: [.03, .03, .03], gain: [.95, .95, .95] },
  sepia: { mode: 2, contrast: 1.04, lift: [.02, .015, .01], gain: [.96, .94, .9] },
  space: { tint: [.96, .98, 1.04], saturation: 1.05, lift: [0, 0, .004] },
  night: { tint: [.9, .96, 1.1], saturation: .9, lift: [0, .004, .012] },
  studio: { saturation: 1, contrast: 1.03 },
};

export class Pipeline {
  constructor(renderer) { this.r = renderer; this.w = 0; this.h = 0; this.scale = 1; this.mips = []; }
  setSize(w, h, scale = 1) {
    const W = Math.round(w * scale), H = Math.round(h * scale);
    if (W === this.w && H === this.h && this.ldr && this.ldr.width === w) return;
    this.w = W; this.h = H; this.ow = w; this.oh = h; this.scale = scale;
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.dispose();
    this.hdr = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
    this.hdrB = new THREE.WebGLRenderTarget(W, H, hf); this.hdrC = new THREE.WebGLRenderTarget(W, H, hf);
    this.mips = []; let mw = W, mh = H;
    for (let i = 0; i < 8; i++) { mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); this.mips.push({ down: new THREE.WebGLRenderTarget(mw, mh, hf), up: new THREE.WebGLRenderTarget(mw, mh, hf) }); }
    this.ldr = [0, 1].map(() => { const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true }); t.texture.generateMipmaps = true; return t; });
    if (!this.down) {
      this.down = quad(DOWN_FS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThresh: { value: 1 }, uKnee: { value: .5 }, uFirst: { value: 0 } });
      this.up = quad(UP_FS, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() }, uScatter: { value: .6 } });
      this.dof = quad(DOF_FS, { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uFocus: { value: 5 }, uAperture: { value: .02 }, uMaxBlur: { value: 12 }, cameraNear: { value: .1 }, cameraFar: { value: 100 } });
      this.fin = quad(FINAL_FS, { tScene: { value: null }, tBloom: { value: null }, uExpo: { value: 1 }, uBloom: { value: .1 }, uVig: { value: .3 }, uGrain: { value: .03 }, uCA: { value: .0007 }, uTime: { value: 0 }, uSat: { value: 1 }, uContrast: { value: 1 }, uFlicker: { value: 0 }, uFade: { value: 0 }, uWeave: { value: 0 }, uTone: { value: 1 }, uMode: { value: 0 }, uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uRes: { value: new THREE.Vector2() } });
      this.comp = quad(COMP_FS, { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uFade: { value: 0 }, uType: { value: 0 }, uP: { value: new THREE.Vector4() }, uRes: { value: new THREE.Vector2() } });
    }
    if (this.gtao) this.gtao.setSize(W, H);
  }
  dispose() { for (const k of ['hdr', 'hdrB', 'hdrC']) this[k] && this[k].dispose(); for (const m of this.mips) { m.down.dispose(); m.up.dispose(); } (this.ldr || []).forEach(t => t.dispose()); }

  /** 渲染一个镜头到 LDR 槽位 slot（0/1），返回该纹理 */
  renderShot(scene, camera, P, slot, time) {
    const r = this.r;
    r.setRenderTarget(this.hdr); r.setClearColor(0x000000, 1); r.clear(true, true, true); r.render(scene, camera);
    let cur = this.hdr;
    if (P.ao) {
      if (!this.gtao) { this.gtao = new GTAOPass(scene, camera, this.w, this.h); this.gtao.output = GTAOPass.OUTPUT.Default; }
      const g = this.gtao; g.scene = scene; g.camera = camera; g.blendIntensity = P.ao.intensity;
      g.updateGtaoMaterial({ radius: P.ao.radius, distanceExponent: P.ao.distanceExponent, thickness: P.ao.thickness, scale: P.ao.scale, samples: P.ao.samples });
      g.render(r, this.hdrB, cur); cur = this.hdrB;
    }
    if (P.dof) {
      const u = this.dof.u; u.tColor.value = cur.texture; u.tDepth.value = this.hdr.depthTexture; u.uRes.value.set(this.w, this.h);
      u.uFocus.value = P.dof.focus; u.uAperture.value = P.dof.aperture; u.uMaxBlur.value = P.dof.maxBlur * this.scale; u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
      const dst = cur === this.hdrB ? this.hdrC : this.hdrB; this.dof.draw(r, dst); cur = dst;
    }
    // bloom
    const B = P.bloom, n = Math.max(1, Math.min(8, B.levels | 0));
    let src = cur.texture, sw = this.w, sh = this.h;
    for (let i = 0; i < n; i++) {
      const u = this.down.u; u.tSrc.value = src; u.uTexel.value.set(1 / sw, 1 / sh); u.uFirst.value = i === 0 ? 1 : 0; u.uThresh.value = B.threshold; u.uKnee.value = Math.max(.001, B.knee);
      this.down.draw(r, this.mips[i].down); src = this.mips[i].down.texture; sw = this.mips[i].down.width; sh = this.mips[i].down.height;
    }
    let low = this.mips[n - 1].down;
    for (let i = n - 2; i >= 0; i--) {
      const u = this.up.u; u.tLow.value = low.texture; u.tHigh.value = this.mips[i].down.texture; u.uTexel.value.set(1 / low.width, 1 / low.height); u.uScatter.value = B.scatter;
      this.up.draw(r, this.mips[i].up); low = this.mips[i].up;
    }
    // final grade
    const f = this.fin.u, G = P.grade;
    f.tScene.value = cur.texture; f.tBloom.value = low.texture; f.uExpo.value = P.exposure; f.uBloom.value = B.strength;
    f.uVig.value = P.vignette; f.uGrain.value = P.grain; f.uCA.value = P.ca; f.uTime.value = time; f.uFlicker.value = P.flicker; f.uWeave.value = P.weave; f.uFade.value = P.fade || 0; f.uTone.value = P.tonemap === false ? 0 : 1;
    f.uSat.value = G.saturation; f.uContrast.value = G.contrast; f.uMode.value = G.mode | 0;
    f.uLift.value.fromArray(G.lift); f.uGamma.value.fromArray(G.gamma); f.uGain.value.fromArray(G.gain); f.uTint.value.fromArray(G.tint);
    f.uRes.value.set(this.ow, this.oh);
    this.fin.draw(r, this.ldr[slot]);
    return this.ldr[slot].texture;
  }
  /** 合成到屏幕：a 为底，b 以转场 type 按 mix 覆盖 */
  composite(texA, texB, type, mix, params, fade = 0) {
    const u = this.comp.u; u.tA.value = texA; u.tB.value = texB || texA; u.uMix.value = mix; u.uType.value = texB ? type : 1; u.uFade.value = fade;
    u.uP.value.set(...(params || [0, 0, 0, 0])); u.uRes.value.set(this.ow, this.oh);
    if (!texB) { u.uMix.value = 0; }
    this.comp.draw(this.r, null);
  }
}
