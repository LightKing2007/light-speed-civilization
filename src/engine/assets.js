/* 资源加载：贴图 / HDRI / glTF / JSON / 图片，带缓存（同一资源只加载一次）与加载进度。
   路径一律相对于项目根目录（例如 'assets/photos/act1/maxwell_portrait.jpg'）。
   assets/index.json 由 tools/build.mjs 生成，列出 assets/ 下所有文件，供按名字查找。 */
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* 缓存规则
   - 先查缓存，命中就直接返回同一个 Promise；没命中才调用 start() 真正发起加载（避免「先建任务再查缓存」的重复加载）。
   - 加载中的 Promise 也在缓存里：多个镜头同时请求同一资源时共享同一个加载任务。
   - 失败的条目会从缓存移除：之后再次请求就是一次明确的重试；重试成功后从 progress.failed 中去掉。
   - stats 记录实际发起的加载次数与缓存命中次数，供测试与性能检查使用。
   - setOwner(set)：构建某一章时把用到的文件路径（含缓存命中）记进 set，tools/render.mjs 据此判断分段缓存是否失效。 */
const cache = new Map();
export const progress = { total: 0, done: 0, failed: [], onChange: null };
export const stats = { loads: 0, hits: 0 };
const notify = () => { progress.onChange && progress.onChange(progress); };
let owner = null;
export function setOwner(set) { owner = set; }
function track(key, start, url) {
  if (owner && url) owner.add(url);
  const hit = cache.get(key);
  if (hit) { stats.hits++; return hit; }
  stats.loads++; progress.total++; notify();
  let p; try { p = Promise.resolve(start()); } catch (e) { p = Promise.reject(e); }
  const q = p.then(v => {
    progress.done++; const i = progress.failed.indexOf(key); if (i >= 0) progress.failed.splice(i, 1); notify(); return v;
  }, e => {
    progress.done++; if (!progress.failed.includes(key)) progress.failed.push(key);
    if (cache.get(key) === q) cache.delete(key);
    console.error('[assets] failed:', key, e && e.message || e); notify(); throw e;
  });
  cache.set(key, q); return q;
}
/** 是否已有该键的缓存（加载中或已成功） */
export const cached = key => cache.has(key);
/** 加载器的错误回调常给 DOM 事件而不是 Error；统一成带路径的 Error，报告里才看得出是哪个文件 */
const fail = (url, rej) => e => rej(e instanceof Error ? e : new Error('load failed: ' + url));

let renderer = null, pmrem = null;
export function initAssets(r, gen = new THREE.PMREMGenerator(r)) { renderer = r; pmrem = gen; pmrem.compileEquirectangularShader(); }

let INDEX = null;
export async function loadIndex() { if (!INDEX) { try { INDEX = await (await fetch('assets/index.json')).json(); } catch (e) { INDEX = []; console.warn('[assets] no index.json'); } } return INDEX; }
/** 按正则在资源索引里查找文件（返回路径数组） */
export function find(re) { return (INDEX || []).filter(f => re.test(f)); }

const texLoader = new THREE.TextureLoader();
/** 贴图。srgb=true 用于颜色贴图；数据贴图（法线/粗糙度/高度）传 srgb:false */
export function tex(url, { srgb = true, repeat = null, aniso = 8, wrap = null, flipY = true, mipmaps = true } = {}) {
  const key = 'tex:' + url + '|' + JSON.stringify([srgb, repeat, aniso, wrap, flipY, mipmaps]);
  return track(key, () => new Promise((res, rej) => texLoader.load(url, t => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = renderer ? Math.min(aniso, renderer.capabilities.getMaxAnisotropy()) : aniso;
    t.flipY = flipY; t.generateMipmaps = mipmaps; if (!mipmaps) t.minFilter = THREE.LinearFilter;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...(Array.isArray(repeat) ? repeat : [repeat, repeat])); }
    if (wrap) t.wrapS = t.wrapT = wrap;
    res(t);
  }, undefined, fail(url, rej))), url);
}
/** 原始 HDR 等距柱状贴图（用作可见背景） */
export function hdrTex(url) {
  return track(`hdr:${url}`, () => new Promise((res, rej) => new HDRLoader().load(url, t => { t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, fail(url, rej))), url);
}
/** HDRI → PMREM 环境贴图（用于 scene.environment），同一文件只预滤一次 */
export function env(url) {
  return track(`env:${url}`, () => hdrTex(url).then(t => pmrem.fromEquirectangular(t).texture), url);
}
/** 任意场景 → PMREM 环境（例如程序化影棚） */
export function envFromScene(s, sigma = .04) { return pmrem.fromScene(s, sigma).texture; }

const gltfLoader = new GLTFLoader();
/** glTF / glb，返回 gltf 对象（gltf.scene 每次克隆后再用：model.scene.clone(true)） */
export function gltf(url) { return track(`gltf:${url}`, () => new Promise((res, rej) => gltfLoader.load(url, res, undefined, fail(url, rej))), url); }
export function json(url) { return track(`json:${url}`, () => fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }), url); }
export function text(url) { return track(`text:${url}`, () => fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); }), url); }
export function image(url) { return track(`img:${url}`, () => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = fail(url, rej); im.src = url; }), url); }

/** 便捷：加载 Poly Haven 风格的 PBR 贴图组（assets/tex/<id>/...），返回 MeshStandardMaterial 参数 */
export async function pbrMaps(id, { repeat = 1 } = {}) {
  await loadIndex();
  const files = find(new RegExp(`^assets/tex/${id}/`));
  const pick = re => files.find(f => re.test(f.toLowerCase()));
  const o = {};
  const d = pick(/(diff|albedo|color|basecolor)[^/]*\.(jpg|png|webp)$/), n = pick(/(nor_gl|normal_gl|nor-gl|_nor)[^/]*\.(jpg|png|webp)$/) || pick(/normal[^/]*\.(jpg|png|webp)$/),
    r = pick(/rough[^/]*\.(jpg|png|webp)$/), m = pick(/metal[^/]*\.(jpg|png|webp)$/), ao = pick(/_ao[^/]*\.(jpg|png|webp)$/), arm = pick(/_arm[^/]*\.(jpg|png|webp)$/);
  const jobs = [];
  if (d) jobs.push(tex(d, { repeat }).then(t => o.map = t));
  if (n) jobs.push(tex(n, { srgb: false, repeat }).then(t => o.normalMap = t));
  if (arm) jobs.push(tex(arm, { srgb: false, repeat }).then(t => { o.aoMap = t; o.roughnessMap = t; o.metalnessMap = t; }));
  else {
    if (r) jobs.push(tex(r, { srgb: false, repeat }).then(t => o.roughnessMap = t));
    if (m) jobs.push(tex(m, { srgb: false, repeat }).then(t => o.metalnessMap = t));
    if (ao) jobs.push(tex(ao, { srgb: false, repeat }).then(t => o.aoMap = t));
  }
  await Promise.all(jobs);
  if (!files.length) console.warn('[assets] no PBR maps for', id);
  return o;
}
