/* 写实地球：NASA 昼景（含海底地形）/ 夜景灯光 / 云层（含云影）/ 海面太阳反光 / 法线起伏 / 单次散射大气（瑞利 + 米氏）/ 星空。
   单位：1 = 1000 km。地球半径 R = 6.371，大气层顶 R + 0.1。卫星 550 km 高度 = R + 0.55。
   用法：
     const E = await ctx.earth({ quality: '8k' });  scene.add(E.group); E.addStars(scene);
     E.setSunFromUTC(Date.UTC(2026,9,18,1,42));  // 或 E.setSun(dirVector)
     每帧在镜头 update 里调用 E.update(t, camera)
     E.ll(lat, lon, alt)  → 世界坐标；E.path([[lat,lon],...], {...}) → 贴地光路线（kit.pathLine）
     E.cables(filterFn)  → 读取 assets/data 下 TeleGeography 海缆 GeoJSON 生成线条组 */
import * as THREE from 'three';
import * as A from './assets.js';
import { ll, surfacePath, gcArc, sunDirection, V, clamp } from './util.js';
import { pathLine } from './kit.js';

export const R_EARTH = 6.371, ATM_H = .1;

const SURF_VS = `varying vec2 vUv;varying vec3 vN,vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const SURF_FS = `uniform sampler2D tDay,tNight,tClouds,tNormal,tWater;uniform vec3 uSun,uCenter;uniform float uNight,uBump,uCloudShadow,uCloudRot,uSpec,uDayK,uHasNormal,uHasWater,uHasClouds,uHasNight,uRp,uRa;
varying vec2 vUv;varying vec3 vN,vW;
const vec3 BR=vec3(5.8,13.5,33.1);
vec2 rs(vec3 ro,vec3 rd,float r){float b=dot(ro,rd);float c=dot(ro,ro)-r*r;float h=b*b-c;if(h<0.)return vec2(1e9,-1e9);h=sqrt(h);return vec2(-b-h,-b+h);}
void main(){
 vec3 N=normalize(vN);vec3 L=normalize(uSun);vec3 Vd=normalize(cameraPosition-vW);
 // 法线贴图（球面切线空间）
 vec3 Nb=N;
 if(uHasNormal>.5){vec3 T=normalize(cross(vec3(0.,1.,0.),N));vec3 B=cross(N,T);vec3 nm=texture2D(tNormal,vUv).xyz*2.-1.;nm.xy*=uBump;Nb=normalize(T*nm.x+B*nm.y+N*nm.z);}
 float w=uHasWater>.5?texture2D(tWater,vUv).r:0.;
 vec3 alb=texture2D(tDay,vUv).rgb*uDayK;
 float mu=dot(N,L);
 // 地表处的太阳透过率（低角度时偏红）
 vec3 sunT=exp(-BR*.008*1.2/max(.06,mu+.1)*.35);
 float day=smoothstep(-.08,.12,mu);
 float NdL=max(dot(mix(Nb,N,w),L),0.);
 // 云影
 float cs=0.;if(uHasClouds>.5){vec2 o=vec2(L.x,L.y)*0.;vec3 Lt=L-N*mu;vec2 cuv=vUv+vec2(uCloudRot,0.);vec2 du=vec2(-dot(Lt,normalize(cross(vec3(0.,1.,0.),N)))*.0016,dot(Lt,cross(N,normalize(cross(vec3(0.,1.,0.),N))))*.0016);cs=texture2D(tClouds,cuv+du).r;}
 vec3 col=alb*NdL*sunT*(1.-uCloudShadow*cs)*3.2;
 // 海面高光（GGX 近似）
 if(uSpec>0.){vec3 Hh=normalize(L+Vd);float nh=max(dot(N,Hh),0.);float a=.09;float a2=a*a;float dd=nh*nh*(a2-1.)+1.;float D=a2/(3.14159*dd*dd);float F=.02+.98*pow(1.-max(dot(Hh,Vd),0.),5.);
  col+=vec3(1.,.96,.9)*sunT*D*F*NdL*w*uSpec*(1.-cs*.8)*.9;}
 // 夜景灯光
 if(uHasNight>.5){vec3 nl=texture2D(tNight,vUv).rgb;float lum=dot(nl,vec3(.3333));col+=vec3(1.,.72,.42)*pow(lum,1.6)*uNight*(1.-smoothstep(-.2,.05,mu))*(1.-cs*.6);}
 // 视线方向大气（简化的空气透视；精确的散射由大气壳完成）
 gl_FragColor=vec4(col,1.);}`;

const CLOUD_FS = `uniform sampler2D tClouds;uniform vec3 uSun;uniform float uRot,uOp;varying vec2 vUv;varying vec3 vN,vW;
void main(){vec3 N=normalize(vN);vec3 L=normalize(uSun);float mu=dot(N,L);float c=texture2D(tClouds,vUv+vec2(uRot,0.)).r;c=smoothstep(.08,.95,c);
 vec3 sunT=exp(-vec3(5.8,13.5,33.1)*.008*1.2/max(.06,mu+.1)*.35);
 float lit=smoothstep(-.1,.25,mu);vec3 col=vec3(1.)*sunT*(max(mu,0.)*.85+.12*lit)*3.2;
 gl_FragColor=vec4(col*c,c*uOp*(.35+.65*smoothstep(-.25,.1,mu)));}`;

const ATM_VS = `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const ATM_FS = `uniform vec3 uSun,uCenter;uniform float uRp,uRa,uHR,uHM,uSunI,uG,uBM,uOp;uniform vec3 uBR;varying vec3 vW;
vec2 rs(vec3 ro,vec3 rd,float r){float b=dot(ro,rd);float c=dot(ro,ro)-r*r;float h=b*b-c;if(h<0.)return vec2(1e9,-1e9);h=sqrt(h);return vec2(-b-h,-b+h);}
// Schüler 的 Chapman 掠射函数近似：返回（以半高为单位）斜程柱密度，乘以标高即光学厚度
float chap(float X,float h,float c){float s=sqrt(X+h);if(c>=0.)return s/(s*c+1.)*exp2(-h);float x0=sqrt(max(0.,1.-c*c))*(X+h);float c0=sqrt(x0);return 2.*c0*exp2(X-x0)-s/(1.-s*c)*exp2(-h);}
float odSun(vec3 x,vec3 L,float H){float r=length(x);float H50=H*.6931472;return H*chap(uRp/H50,max(r-uRp,0.)/H50,dot(x/r,L));}
void main(){
 vec3 ro=cameraPosition-uCenter;vec3 rd=normalize(vW-cameraPosition);vec3 L=normalize(uSun);
 vec2 a=rs(ro,rd,uRa);if(a.x>a.y||a.y<0.)discard;
 vec2 p=rs(ro,rd,uRp);float t0=max(a.x,0.);float t1=a.y;bool hit=p.x<p.y&&p.x>0.;if(hit)t1=min(t1,p.x);
 if(t1<=t0)discard;
 // 采样点向视线离地心最近处加密（那里空气最稠密）
 float tc=clamp(-dot(ro,rd),t0,t1);
 const int N=28;vec3 sR=vec3(0.),sM=vec3(0.);float oR=0.,oM=0.;
 float mu=dot(rd,L);float phR=.0596831*(1.+mu*mu);float g=uG;float phM=.1193662*((1.-g*g)*(1.+mu*mu))/((2.+g*g)*pow(1.+g*g-2.*g*mu,1.5));
 float prev=t0;
 for(int i=1;i<=N;i++){
  float u=float(i)/float(N);float tt;
  float f=(tc-t0)/max(t1-t0,1e-6);
  if(u<f){float k=u/f;tt=tc-(tc-t0)*(1.-k)*(1.-k);}else{float k=(u-f)/max(1.-f,1e-6);tt=tc+(t1-tc)*k*k;}
  float ds=tt-prev;float tm=(tt+prev)*.5;prev=tt;if(ds<=0.)continue;
  vec3 x=ro+rd*tm;float h=max(length(x)-uRp,0.);
  float dR=exp(-h/uHR)*ds,dM=exp(-h/uHM)*ds;oR+=dR*.5;oM+=dM*.5;
  float lR=odSun(x,L,uHR),lM=odSun(x,L,uHM);
  vec3 att=exp(-(uBR*(oR+lR)+uBM*1.1*(oM+lM)));sR+=dR*att;sM+=dM*att;
  oR+=dR*.5;oM+=dM*.5;}
 vec3 col=uSunI*(sR*uBR*phR+sM*uBM*phM);
 vec3 tr=exp(-(uBR*oR+uBM*1.1*oM));float al=hit?1.-dot(tr,vec3(.3333)):0.;
 gl_FragColor=vec4(col*uOp,al*uOp);}`;

function pickFile(re) { const fs = A.find(re); return fs[0] || null; }

export async function makeEarth(ctx, o = {}) {
  const q = o.quality || '8k';
  const f = name => pickFile(new RegExp(`^assets/earth/earth_${name}_${q}\\.(jpg|png)$`)) || pickFile(new RegExp(`^assets/earth/earth_${name}_4k\\.(jpg|png)$`)) || pickFile(new RegExp(`^assets/earth/earth_${name}[^/]*\\.(jpg|png)$`));
  const files = { day: f('day'), night: f('lights') || f('night'), clouds: f('clouds'), normal: f('normal'), water: f('water_mask') };
  const load = (k, opt) => files[k] ? A.tex(files[k], { aniso: 16, ...opt }).catch(() => null) : Promise.resolve(null);
  const [day, night, clouds, normal, water] = await Promise.all([load('day'), load('night'), load('clouds', { srgb: false }), load('normal', { srgb: false }), load('water', { srgb: false })]);
  const R = R_EARTH, group = new THREE.Group();
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
  const sun = V(1, .2, .3).normalize();
  const surf = new THREE.ShaderMaterial({
    vertexShader: SURF_VS, fragmentShader: SURF_FS,
    uniforms: { tDay: { value: day || white }, tNight: { value: night || white }, tClouds: { value: clouds || white }, tNormal: { value: normal || white }, tWater: { value: water || white },
      uSun: { value: sun }, uCenter: { value: new THREE.Vector3() }, uNight: { value: o.nightIntensity ?? 2.2 }, uBump: { value: o.bump ?? 1.2 }, uCloudShadow: { value: clouds ? .55 : 0 }, uCloudRot: { value: 0 }, uSpec: { value: o.spec ?? 1 }, uDayK: { value: o.dayK ?? 1 },
      uHasNormal: { value: normal ? 1 : 0 }, uHasWater: { value: water ? 1 : 0 }, uHasClouds: { value: clouds && o.clouds !== false ? 1 : 0 }, uHasNight: { value: night && o.night !== false ? 1 : 0 }, uRp: { value: R }, uRa: { value: R + ATM_H } },
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(R, 256, 128), surf); group.add(surface);
  let cloudMesh = null;
  if (clouds && o.clouds !== false) {
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R + .012, 192, 96), new THREE.ShaderMaterial({ vertexShader: SURF_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, uniforms: { tClouds: { value: clouds }, uSun: { value: sun }, uRot: { value: 0 }, uOp: { value: o.cloudOpacity ?? .95 } } }));
    cloudMesh.renderOrder = 1; group.add(cloudMesh);
  }
  let atm = null;
  if (o.atmosphere !== false) {
    atm = new THREE.Mesh(new THREE.SphereGeometry(R + ATM_H, 128, 64), new THREE.ShaderMaterial({ vertexShader: ATM_VS, fragmentShader: ATM_FS, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      uniforms: { uSun: { value: sun }, uCenter: { value: new THREE.Vector3() }, uRp: { value: R }, uRa: { value: R + ATM_H }, uHR: { value: .008 }, uHM: { value: .0012 }, uBR: { value: new THREE.Vector3(5.8, 13.5, 33.1) }, uBM: { value: 8 }, uG: { value: .76 }, uSunI: { value: o.sunIntensity ?? 9 }, uOp: { value: 1 } } }));
    atm.renderOrder = 5; group.add(atm);
  }
  const E = {
    R, group, surface, clouds: cloudMesh, atm, sun, files,
    ll: (lat, lon, alt = 0) => ll(lat, lon, R + alt).applyMatrix4(group.matrixWorld),
    setSun(d) { sun.copy(d).normalize(); return E; },
    /** 给 HUD 标注用：p 在地球背面（被挡住）时返回 true */
    occlude: (cam, p) => { const c = group.getWorldPosition(_c2), d = _d2.copy(p).sub(cam), L = d.length(); d.divideScalar(L); const oc = _o2.copy(cam).sub(c); const b = oc.dot(d), q = oc.lengthSq() - (R * .998) ** 2, h = b * b - q; if (h < 0) return false; const t = -b - Math.sqrt(h); return t > 0 && t < L - .02; },
    setSunFromUTC(ms) { sunDirection(ms, sun); return E; },
    /** 每帧调用：云层缓慢漂移、相机进入大气层时切换渲染面 */
    update(t, camera) {
      group.updateMatrixWorld(); const c = group.getWorldPosition(_c);
      surf.uniforms.uCenter.value.copy(c);
      const rot = (o.cloudDrift ?? .0004) * t; surf.uniforms.uCloudRot.value = rot; if (cloudMesh) cloudMesh.material.uniforms.uRot.value = rot;
      if (atm) { atm.material.uniforms.uCenter.value.copy(c); const inside = camera.position.distanceTo(c) < R + ATM_H; atm.material.side = inside ? THREE.BackSide : THREE.FrontSide; }
    },
    /** 贴地/离地光路线：lls=[[lat,lon],...]，alt 为离地高度（单位 1000 km） */
    path(lls, opt = {}) { const pts = surfacePath(lls, R + (opt.alt ?? .004), opt.maxDeg ?? .5); const m = pathLine(pts, opt); group.add(m); return m; },
    arc(a, b, opt = {}) { const pts = gcArc(a, b, R + (opt.alt ?? .004), opt.h ?? .4, opt.n ?? 160); const m = pathLine(pts, opt); group.add(m); return m; },
    /** 真实海缆（TeleGeography GeoJSON）。filter(feature)→bool；返回 {group, lines:[{mesh, feature}]} */
    async cables(filter = () => true, opt = {}) {
      const file = pickFile(/^assets\/data\/.*cable-geo.*\.json$/i);
      if (!file) { console.warn('[earth] no cable-geo json'); return { group: new THREE.Group(), lines: [] }; }
      const gj = await A.json(file), g = new THREE.Group(), lines = [];
      for (const ft of gj.features || []) {
        if (!filter(ft)) continue;
        const geom = ft.geometry; if (!geom) continue;
        const parts = geom.type === 'MultiLineString' ? geom.coordinates : geom.type === 'LineString' ? [geom.coordinates] : [];
        for (const part of parts) {
          if (part.length < 2) continue;
          // GeoJSON 是 [lon, lat]；跨越 ±180° 的段已由数据拆开
          const lls = part.map(p => [p[1], p[0]]);
          const pts = surfacePath(lls, R + (opt.alt ?? .003), .6);
          const m = pathLine(pts, { width: opt.width ?? 1.4, color: opt.colorFn ? opt.colorFn(ft) : (opt.color ?? (ft.properties && ft.properties.color) ?? 0x9fdcff), opacity: opt.opacity ?? .9, intensity: opt.intensity ?? 1, head: opt.head ?? 1 });
          g.add(m); lines.push({ mesh: m, feature: ft });
        }
      }
      group.add(g); return { group: g, lines };
    },
    /** 星空背景（NASA 星图，若有）；k 为亮度 */
    async addStars(scene, k = .35) {
      const fsr = A.find(/^assets\/earth\/stars.*\.(jpg|png|exr|hdr)$/i);
      if (!fsr.length) { scene.background = new THREE.Color(0x000000); return; }
      const t = /\.(hdr|exr)$/.test(fsr[0]) ? await A.hdrTex(fsr[0]) : await A.tex(fsr[0]); t.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = t; scene.backgroundIntensity = k;
    },
    /** 太阳本体（远处的 HDR 圆盘，只在逆光镜头需要） */
    sunDisc(scene, { dist = 400, size = 3.2, k = 60 } = {}) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .96, .9).multiplyScalar(k), toneMapped: false }));
      const upd = () => { m.position.copy(sun).multiplyScalar(dist); m.lookAt(0, 0, 0); };
      upd(); m.userData.update = upd; scene.add(m); return m;
    },
  };
  return E;
}
const _c = new THREE.Vector3(), _c2 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _o2 = new THREE.Vector3();
