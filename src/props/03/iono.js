/* 03 · 地球侧视的几何与电离层（单位：1 = 1000 km，地心在原点）
   - sideBasis：以「波尔杜—信号山」大圆所在平面建立坐标：M（两地中点方向）、U（平面内指向波尔杜）、N（平面法线，相机所在侧）
   - ionoShell：约 85–160 km 的薄壳，按视线穿过各高度层的路程积分着色（只在地球边缘显出一条极淡的气辉色带）
   - hopPath：电离层 E 层（约 100 km）两跳 + 海面一次反射的射线路径 */
import * as THREE from 'three';
import { V } from '../../engine/util.js';

export function sideBasis(A, B) {
  const a = A.clone().normalize(), b = B.clone().normalize();
  const N = a.clone().cross(b).normalize(), M = a.clone().add(b).normalize();
  const U = a.clone().sub(M.clone().multiplyScalar(a.dot(M))).normalize();
  const th = a.angleTo(b);
  const P = (phi, r, out = V()) => out.copy(M).multiplyScalar(Math.cos(phi) * r).add(U.clone().multiplyScalar(Math.sin(phi) * r));
  const phiOf = p => Math.atan2(p.dot(U), p.dot(M));
  return { M, U, N, th, phiA: th / 2, phiB: -th / 2, P, phiOf };
}

/** 侧视相机：look 点在 φ 处地表以下，使地平线（地球边缘）落在屏幕 limbY 像素；width = 画面宽（千公里） */
export function sidePose(camera, S, R, phi, width, limbY = 430, { D = 30, roll = 0 } = {}) {
  const up = S.P(phi, 1);
  const hh = width / 2 / (16 / 9);
  const delta = (540 - limbY) / 540 * hh;
  const tgt = up.clone().multiplyScalar(R - delta);
  camera.position.copy(tgt).add(S.N.clone().multiplyScalar(D));
  camera.up.copy(up); if (roll) camera.up.applyAxisAngle(S.N, roll);
  camera.lookAt(tgt);
  const fov = 2 * Math.atan(hh / D) * 180 / Math.PI;
  if (Math.abs(camera.fov - fov) > 1e-6) { camera.fov = fov; camera.updateProjectionMatrix(); }
  return tgt;
}

const VS = `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FS = `uniform vec3 uCenter;uniform float uR,uK,uOp;varying vec3 vW;
vec2 rs(vec3 ro,vec3 rd,float r){float b=dot(ro,rd);float c=dot(ro,ro)-r*r;float h=b*b-c;if(h<0.)return vec2(1e9,-1e9);h=sqrt(h);return vec2(-b-h,-b+h);}
float sg(vec3 ro,vec3 rd,float r,float tm){vec2 a=rs(ro,rd,r);if(a.x>a.y)return 0.;return max(0.,min(a.y,tm)-max(a.x,0.));}
void main(){vec3 ro=cameraPosition-uCenter;vec3 rd=normalize(vW-cameraPosition);
 vec2 e=rs(ro,rd,uR);float tm=(e.x<e.y&&e.x>0.)?e.x:1e9;
 float s0=sg(ro,rd,uR+.082,tm),s1=sg(ro,rd,uR+.092,tm),s2=sg(ro,rd,uR+.100,tm),s3=sg(ro,rd,uR+.108,tm),s4=sg(ro,rd,uR+.120,tm),s5=sg(ro,rd,uR+.140,tm),s6=sg(ro,rd,uR+.165,tm);
 vec3 g=vec3(.32,1.,.52),v=vec3(.62,.32,1.);
 vec3 col=g*((s1-s0)*.35+(s2-s1)*1.+(s3-s2)*.8)+mix(g,v,.5)*(s4-s3)*.32+v*((s5-s4)*.12+(s6-s5)*.05);
 gl_FragColor=vec4(col*uK*uOp,1.);}`;
export function ionoShell(R, { k = .3 } = {}) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uCenter: { value: new THREE.Vector3() }, uR: { value: R }, uK: { value: k }, uOp: { value: 0 } } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(R + .17, 256, 128), mat); m.renderOrder = 6; m.frustumCulled = false;
  return { mesh: m, set(op) { mat.uniforms.uOp.value = op; m.visible = op > .002; } };
}

/** 两跳射线：A → E 层顶点 → 海面 → E 层顶点 → B；返回点列与关键点 */
export function hopPath(S, R, { hops = 2, H = .102, n = 36 } = {}) {
  const pts = [], apex = [], ground = [];
  for (let k = 0; k < hops; k++) {
    const f0 = S.phiA + (S.phiB - S.phiA) * k / hops, f1 = S.phiA + (S.phiB - S.phiA) * (k + 1) / hops, fm = (f0 + f1) / 2;
    const G0 = S.P(f0, R), Ap = S.P(fm, R + H), G1 = S.P(f1, R), fr = .78;
    const Q0 = G0.clone().lerp(Ap, fr), Q2 = G1.clone().lerp(Ap, fr);
    const C = Ap.clone().multiplyScalar(2).sub(Q0.clone().add(Q2).multiplyScalar(.5));
    for (let i = k ? 1 : 0; i <= n; i++) pts.push(G0.clone().lerp(Q0, i / n));
    for (let i = 1; i <= n; i++) { const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; pts.push(Q0.clone().multiplyScalar(a).add(C.clone().multiplyScalar(b)).add(Q2.clone().multiplyScalar(c))); }
    for (let i = 1; i <= n; i++) pts.push(Q2.clone().lerp(G1, i / n));
    apex.push(Ap); ground.push(G0, G1);
  }
  return { pts, apex, ground };
}
