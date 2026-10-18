// 资源缓存：先查缓存再加载、并发共享、失败可重试、贴图参数进入缓存键。
// 运行：npm test（node --test）。用假的加载器替换 three 的真实网络/解码，只统计「实际加载次数」。
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import * as A from '../src/engine/assets.js';

const calls = { tex: [], hdr: [], pmrem: 0, fetch: [] };
const failing = new Set();   // 在这里的 URL 下一次加载会失败
const defer = fn => setTimeout(fn, 5);

THREE.TextureLoader.prototype.load = function (url, onLoad, _p, onError) {
  calls.tex.push(url);
  defer(() => failing.has(url) ? onError({ type: 'error' }) : onLoad(new THREE.Texture()));
};
HDRLoader.prototype.load = function (url, onLoad, _p, onError) {
  calls.hdr.push(url);
  defer(() => failing.has(url) ? onError(new Error('404 ' + url)) : onLoad(new THREE.DataTexture()));
};
A.initAssets(null, { compileEquirectangularShader() { }, fromEquirectangular() { calls.pmrem++; return { texture: { pmrem: calls.pmrem } }; } });
globalThis.fetch = async url => {
  calls.fetch.push(url);
  await new Promise(r => setTimeout(r, 5));
  if (failing.has(url)) return { ok: false, status: 404 };
  return { ok: true, json: async () => ({ url }), text: async () => url };
};
const quiet = console.error; console.error = () => { };
beforeEach(() => { calls.tex.length = 0; calls.hdr.length = 0; calls.pmrem = 0; calls.fetch.length = 0; failing.clear(); });

test('重复请求同一贴图只加载一次，并发请求共享同一个任务', async () => {
  const p1 = A.tex('a.jpg'), p2 = A.tex('a.jpg');
  assert.equal(p1, p2, '并发请求应拿到同一个 Promise');
  const [t1, t2] = await Promise.all([p1, p2]);
  assert.equal(t1, t2);
  const t3 = await A.tex('a.jpg');
  assert.equal(t3, t1);
  assert.deepEqual(calls.tex, ['a.jpg']);
});

test('命中缓存时不再创建新的加载任务', async () => {
  await A.tex('b.jpg');
  const before = A.stats.loads;
  for (let i = 0; i < 5; i++) await A.tex('b.jpg');
  assert.equal(A.stats.loads, before, '命中缓存不应增加实际加载次数');
  assert.deepEqual(calls.tex, ['b.jpg']);
});

test('不同贴图配置（aniso / mipmaps / srgb / repeat）分别缓存', async () => {
  const base = await A.tex('c.jpg');
  const aniso = await A.tex('c.jpg', { aniso: 16 });
  const noMip = await A.tex('c.jpg', { mipmaps: false });
  const data = await A.tex('c.jpg', { srgb: false });
  const rep = await A.tex('c.jpg', { repeat: [2, 3] });
  const all = [base, aniso, noMip, data, rep];
  assert.equal(new Set(all).size, all.length, '每种配置应得到独立的贴图对象');
  assert.equal(aniso.anisotropy, 16);
  assert.equal(noMip.generateMipmaps, false);
  assert.equal(noMip.minFilter, THREE.LinearFilter);
  assert.equal(base.generateMipmaps, true);
  assert.equal(data.colorSpace, THREE.NoColorSpace);
  assert.deepEqual([rep.repeat.x, rep.repeat.y], [2, 3]);
  assert.equal(await A.tex('c.jpg', { aniso: 16 }), aniso, '相同配置仍命中缓存');
  assert.equal(calls.tex.length, 5);
});

test('环境贴图：重复请求只做一次 HDR 读取与 PMREM 转换', async () => {
  const [e1, e2] = await Promise.all([A.env('room.hdr'), A.env('room.hdr')]);
  const e3 = await A.env('room.hdr');
  assert.equal(e1, e2); assert.equal(e1, e3);
  assert.equal(calls.hdr.length, 1);
  assert.equal(calls.pmrem, 1, 'PMREM 预滤只能做一次');
  await A.hdrTex('room.hdr');
  assert.equal(calls.hdr.length, 1, '原始 HDR 与环境贴图共享同一次读取');
});

test('加载失败不留在缓存里，再次请求即重试，成功后从失败列表移除', async () => {
  failing.add('d.jpg');
  const p = A.tex('d.jpg'), p2 = A.tex('d.jpg');
  assert.equal(p, p2, '失败前的并发请求同样共享');
  await assert.rejects(p, /load failed: d\.jpg/);
  assert.ok(A.progress.failed.some(k => k.startsWith('tex:d.jpg')));
  assert.equal(A.cached('tex:d.jpg|' + JSON.stringify([true, null, 8, null, true, true])), false);
  failing.delete('d.jpg');
  const t = await A.tex('d.jpg');
  assert.ok(t.isTexture);
  assert.equal(calls.tex.length, 2, '失败后的再次请求应真正重新加载');
  assert.ok(!A.progress.failed.some(k => k.startsWith('tex:d.jpg')), '重试成功后不再算失败');
  await A.tex('d.jpg');
  assert.equal(calls.tex.length, 2, '重试成功后恢复缓存');
});

test('环境贴图失败后重试会重新读取 HDR', async () => {
  failing.add('bad.hdr');
  await assert.rejects(A.env('bad.hdr'));
  failing.delete('bad.hdr');
  const e = await A.env('bad.hdr');
  assert.ok(e);
  assert.equal(calls.hdr.length, 2);
  assert.equal(calls.pmrem, 1);
});

test('JSON：同一路径只请求一次，HTTP 错误可重试', async () => {
  const [a, b] = await Promise.all([A.json('x.json'), A.json('x.json')]);
  assert.equal(a, b);
  assert.deepEqual(calls.fetch, ['x.json']);
  failing.add('y.json');
  await assert.rejects(A.json('y.json'), /404 y\.json/);
  failing.delete('y.json');
  assert.deepEqual(await A.json('y.json'), { url: 'y.json' });
  assert.deepEqual(calls.fetch, ['x.json', 'y.json', 'y.json']);
});

test.after(() => { console.error = quiet; });
