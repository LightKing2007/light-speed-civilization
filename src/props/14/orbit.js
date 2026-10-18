/* 14 · 今天：道具。
   satellites：assets/data/celestrak/sats_T0.json 里 16 754 颗在轨卫星（2026-10-18 01:42 UTC 用 SGP4 推算好的圆轨道近似），
               每颗 [group, inc, raanFixed, u0, r(1000 km), n(rad/s)]。位置在顶点着色器里算：
               Ω = raanFixed − ωE·τ（地球不转，轨道面相对地面西移），u = u0 + n·τ，
               p = r·(cos u·N + sin u·M)，N = (cosΩ, sinΩ, 0)，M = (−sinΩ cos i, cosΩ cos i, sin i)（地固系：x→经度 0，y→东经 90°，z→北极），
               本片坐标 = (p.x, p.z, −p.y)。落在地球阴影里的卫星不反光。
   starlinkV2Mini：扁平机身 + 两翼太阳能板（翼展约 30 m），按 1 单位 = 1 m 建模，由章节决定放大倍数。 */
import * as THREE from 'three';

const W_EARTH = 7.2921159e-5;
export async function satellites(A, { size = 2.2, R = 6.371 } = {}) {
  const d = await A.json('assets/data/celestrak/sats_T0.json'), a = d.data, n = a.length / 6;
  if (n < 10000 || n !== d.count) throw new Error('卫星数据不完整：' + n);
  const pos = new Float32Array(n * 3), el = new Float32Array(n * 4), mm = new Float32Array(n), grp = new Float32Array(n);
  for (let i = 0; i < n; i++) { grp[i] = a[i * 6]; el[i * 4] = a[i * 6 + 1]; el[i * 4 + 1] = a[i * 6 + 2]; el[i * 4 + 2] = a[i * 6 + 3]; el[i * 4 + 3] = a[i * 6 + 4]; mm[i] = a[i * 6 + 5]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aEl', new THREE.BufferAttribute(el, 4)); g.setAttribute('aN', new THREE.BufferAttribute(mm, 1)); g.setAttribute('aG', new THREE.BufferAttribute(grp, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTau: { value: 0 }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uSize: { value: size }, uScale: { value: 1 }, uOp: { value: 1 }, uR: { value: R }, uStar: { value: 1 }, uOther: { value: 1 } },
    vertexShader: `attribute vec4 aEl;attribute float aN,aG;uniform float uTau,uSize,uScale,uR,uStar,uOther;uniform vec3 uSun;varying float vA;varying vec3 vC;
void main(){float inc=aEl.x,Om=aEl.y-${W_EARTH}*uTau,u=aEl.z+aN*uTau,r=aEl.w;
vec3 N=vec3(cos(Om),sin(Om),0.),M=vec3(-sin(Om)*cos(inc),cos(Om)*cos(inc),sin(inc));vec3 p=r*(cos(u)*N+sin(u)*M);vec3 w=vec3(p.x,p.z,-p.y);
vec3 S=normalize(uSun);float along=dot(w,S);float lit=along>0.?1.:step(uR*1.01,length(w-along*S));
bool star=abs(aG-1.)<.5;vA=lit*(star?uStar:uOther);vC=star?vec3(1.,.97,.92):(aG>5.5?vec3(1.,.85,.55):vec3(.75,.88,1.));
vec4 mv=modelViewMatrix*vec4(w,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uScale*(star?1.:1.15);}`,
    fragmentShader: 'uniform float uOp;varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=1.-smoothstep(.2,1.,d);if(a*vA<=.01)discard;gl_FragColor=vec4(vC*1.6,a*vA*uOp);}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 7;
  const _v = new THREE.Vector2();
  pts.onBeforeRender = r => { const t = r.getRenderTarget(); m.uniforms.uScale.value = (t ? t.height : r.getDrawingBufferSize(_v).y) / 1080; };
  return { points: pts, material: m, count: n, groups: d.groups, byGroup: d.groups.map((_, k) => grp.reduce((s, v) => s + (v === k), 0)) };
}

export function starlinkV2Mini(KIT) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: .8, roughness: .35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.1, .35, 2.7), bodyM); g.add(body);
  const phased = new THREE.Mesh(new THREE.BoxGeometry(3.6, .04, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xd8d6d0, roughness: .6 })); phased.position.y = -.2; g.add(phased);
  const cellTex = KIT.canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#0d1530'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(150,170,220,.35)'; c.lineWidth = 1; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, { aniso: 16 });
  const panelM = new THREE.MeshPhysicalMaterial({ map: cellTex, metalness: .4, roughness: .25, clearcoat: 1, clearcoatRoughness: .1 });
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.2, 8), bodyM); arm.rotation.z = Math.PI / 2; arm.position.x = s * 2.65; g.add(arm);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(12.4, .05, 2.6), panelM); wing.position.x = s * (3.2 + 6.2); g.add(wing);
  }
  return g;
}
