/* 影片核心：章节 → 镜头时间线、渲染循环、转场合成、HUD、音频调度、实时播放器与逐帧导出接口。

   时间模型
   - 每章有 dur（秒），章与章首尾相接：START[i] = 前面各章时长之和。
   - 章内由镜头（shot）组成，shot.t0 为章内开始时间；镜头的结束时间自动推导为「下一个镜头开始 + 其转场时长」，
     因此镜头总是首尾相接，转场期间两个镜头同时渲染再合成。
   - 第一个镜头的 in 转场会和上一章最后一个镜头重叠（上一章最后一个镜头会继续被调用 update，t 可能略大于 dur）。
   - 所有 update(t) 必须是 t 的纯函数（不要依赖上一帧状态，不要用 Math.random）。

   两种模式
   - 预览（实时播放、tools/spot.mjs）：章节构建失败时换成标明「第 NN 章构建失败」的错误画面继续运行，方便开发；
     占位章节在右上角标出「占位章节」。
   - 正式导出（#render&strict，由 tools/render.mjs / tools/audio.mjs 使用）：所有问题记进 FILM.errors，
     渲染某一帧时只要有镜头更新或 HUD 绘制出错，renderFrame 直接抛出带章节 / 镜头 / 时间的错误，由工具停止导出并报告。 */
import * as THREE from 'three';
import { Pipeline, mergePost, GRADES, TRANSITIONS } from './post.js';
import { HUD, W, H } from './hud.js';
import * as A from './assets.js';
import { AU } from './audio.js';
import { makeTransport } from './clock.js';
import { clamp, ss, win, rng } from './util.js';
import * as KIT from './kit.js';
import { makeEarth } from './earth.js';

const $ = id => document.getElementById(id);
const HASH = location.hash.replace(/^#/, '');
const Q = new URLSearchParams(HASH.replace(/^render&?/, '').replace(/^render$/, ''));
export const RENDER = /^render/.test(HASH);
export const FPS = 30;
export const OPTS = { only: Q.get('only'), scale: +(Q.get('scale') || (RENDER ? 1.5 : 1)), debug: Q.has('debug'), from: Q.get('from'), strict: RENDER && Q.has('strict') };

let renderer, pipe, hud;
const CH = [];          // 章节
const SHOTS = [];       // 所有镜头（全局排序）
let STARTS = [], TOTAL = 0;
const CUES = [];        // [globalT, name, args]
let T = 0, started = false, lastHudSet = new Set();
/* 问题记录：{ kind: 'build' | 'asset' | 'shot' | 'hud', chapter, shot, t, message }。同一处问题只记一次。 */
const ERRORS = [], FRAME_ERR = [], seenErr = new Set();
function report(e, frame = true) {
  const k = [e.kind, e.chapter, e.shot, e.message].join('|');
  if (frame) FRAME_ERR.push(e);
  if (seenErr.has(k)) return; seenErr.add(k); ERRORS.push(e);
  console.error(`[${e.kind}] 第 ${e.chapter ?? '?'} 章${e.shot ? ' · 镜头 ' + e.shot : ''}${e.t != null ? ' · t=' + e.t.toFixed(2) + 's' : ''}：${e.message}`);
}
const errMsg = e => String(e && (e.stack || e.message) || e).split('\n').slice(0, 3).join(' | ');

export function getT() { return T; }

/* ---------- 章节构建上下文 ---------- */
function makeCtx(ch) {
  const reg = hud.registry(ch);
  ch.shots = []; ch.caps = ch.caps || []; ch.stats = ch.stats || []; ch.lowers = ch.lowers || []; ch.doms = [];
  const ctx = {
    THREE, A, KIT, renderer, chapter: ch, rng,
    /** 新建镜头：{ t0, in:{type,dur,params}, scene, camera, post, update(t, st), name } */
    shot(o) {
      const s = { ch, name: o.name || `${ch.id}.${ch.shots.length + 1}`, t0: o.t0 || 0, in: o.in || null, scene: o.scene, camera: o.camera, update: o.update || (() => { }), post: mergePost(o.post), t1: o.t1, clip: o.clip || null, offline: !!o.offline };
      if (s.in && s.in.type && !(s.in.type in TRANSITIONS)) console.warn('unknown transition', s.in.type);
      if (s.camera && s.camera.isPerspectiveCamera) { s.camera.aspect = W / H; s.camera.updateProjectionMatrix(); }
      ch.shots.push(s); return s;
    },
    /** 引用其他章的画面（尾声蒙太奇用）：{ chapter:'02', at: 41.0, t0, rate, in } */
    clip(o) { return ctx.shot({ ...o, clip: { chapter: o.chapter, at: o.at, rate: o.rate ?? 1 } }); },
    callout: reg.callout, bracket: reg.bracket, measure: reg.measure, readout: reg.readout, draw2d: reg.draw2d,
    caption(t0, t1, text) { ch.caps.push([t0, t1, text]); },
    stat(o) { ch.stats.push(o); return o; },
    lower(o) { ch.lowers.push(o); return o; },
    dom(id, t0, t1, fade = .8) { ch.doms.push({ id, t0, t1, fade }); },
    cue(t, name, ...args) { CUES.push([t, name, args, ch]); },
    grade: GRADES,
    earth: o => makeEarth(ctx, o),
  };
  return ctx;
}

function placeholder(ch, err) {
  ch.status = 'failed'; ch.error = String(err && err.message || err);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0b0b);
  const camera = new THREE.PerspectiveCamera(40, W / H, .1, 100);
  ch.shots = [{ ch, name: ch.id + '.ERR', t0: 0, in: { type: 'dissolve', dur: .5 }, scene, camera, update() { }, post: mergePost({}) }];
  ch.caps = [[0, ch.dur, `【第 ${ch.id} 章构建失败】${String(err && err.message || err).slice(0, 80)}`]];
}

/* ---------- 时间线 ---------- */
function layout() {
  STARTS = []; let acc = 0; for (const c of CH) { STARTS.push(acc); c.start = acc; acc += c.dur; } TOTAL = acc;
  SHOTS.length = 0;
  for (const c of CH) for (const s of c.shots) { s.gStart = c.start + s.t0; if (!s.offline) SHOTS.push(s); }
  SHOTS.sort((a, b) => a.gStart - b.gStart);
  for (let i = 0; i < SHOTS.length; i++) {
    const s = SHOTS[i], n = SHOTS[i + 1];
    s.gEnd = n ? n.gStart + (n.in && n.in.type !== 'cut' ? (n.in.dur || 0) : 0) : TOTAL + 1;
    if (s.t1 != null && n) s.gEnd = Math.max(s.gEnd, s.ch.start + s.t1);
  }
}
/** 渲染这一章的时间段时会画到哪些章的镜头（转场重叠的上一章、尾声引用的章节），供导出缓存判断依赖 */
function renderDeps(c) {
  const a = c.start, b = c.start + c.dur, ids = new Set([c.id]);
  for (const s of SHOTS) if (s.gStart < b && s.gEnd > a) { ids.add(s.ch.id); if (s.clip) ids.add(s.clip.chapter); }
  return [...ids].sort();
}
function locate(t) { for (let i = CH.length - 1; i >= 0; i--) if (t >= STARTS[i]) return i; return 0; }
/** 引用：先在「仅供引用」的离线镜头里找（t 落在其 t0..t1），再在正片镜头里找 */
function findShotAt(ch, t) { for (const s of ch.shots) if (s.offline && t >= s.t0 && t < (s.t1 ?? s.t0 + 30)) return s; let best = null; for (const s of ch.shots) if (!s.offline && s.t0 <= t) best = s; return best || ch.shots[0]; }

/* ---------- 每帧 ---------- */
const slotShot = [null, null];
let FRAMES = 0;          // 已渲染的帧数（tools/perf.mjs 用来检查暂停时是否还在渲染）
function renderAt(Tg, dt, live) {
  FRAME_ERR.length = 0; FRAMES++;
  // 活动镜头
  const act = []; for (const s of SHOTS) { if (s.gStart > Tg) break; if (Tg < s.gEnd) act.push(s); }
  let base = null, top = null, f = 0;
  for (const s of act) {
    const d = s.in && s.in.type !== 'cut' ? (s.in.dur || 0) : 0;
    const ff = d > 0 ? clamp((Tg - s.gStart) / d) : 1;
    if (ff >= 1 || !base) { base = s; top = null; f = 0; } else { top = s; f = ff; }
  }
  const vis = new Map(); if (base) vis.set(base, top ? 1 - f : 1); if (top) vis.set(top, f);
  const texs = [];
  [base, top].forEach((s, k) => {
    if (!s) return;
    let src = s, lt = Tg - s.ch.start;
    if (s.clip) { // 引用其他章
      const c2 = CH.find(c => c.id === s.clip.chapter); if (c2) { const t2 = s.clip.at + (lt - s.t0) * s.clip.rate; src = findShotAt(c2, t2); lt = t2; } else src = null;
    }
    if (!src || !src.scene) { texs.push(null); return; }
    try { src.update(lt, lt - src.t0, dt); } catch (e) { report({ kind: 'shot', chapter: src.ch.id, shot: src.name, t: lt, message: errMsg(e) }); }
    const P = { ...(s.clip ? src.post : s.post) };
    texs.push(pipe.renderShot(src.scene, src.camera, P, k, Tg));
  });
  const ty = top ? TRANSITIONS[top.in.type] ?? 1 : 1;
  const fade = (RENDER || started) && !OPTS.only ? Math.max(1 - ss(0, .9, Tg), ss(TOTAL - 1.2, TOTAL - .05, Tg)) : 0;
  if (texs[0]) pipe.composite(texs[0], texs[1] || null, ty, top ? (top.in.ease === 'lin' ? f : f * f * (3 - 2 * f)) : 0, top && top.in.params, fade);
  else { renderer.setRenderTarget(null); renderer.setClearColor(0, 1); renderer.clear(); }

  // HUD
  const ci = locate(Tg), cur = CH[ci], list = [], seen = new Set();
  for (const s of [base, top]) {
    if (!s || seen.has(s.ch) || s.clip) continue; seen.add(s.ch);
    const ch = s.ch, chW = [...vis.entries()].filter(([x]) => x.ch === ch).reduce((a, [, w]) => a + w, 0);
    list.push({ ch, t: Tg - ch.start, vis: sh => sh ? (vis.get(sh) || 0) : chW });
  }
  if (!seen.has(cur)) list.push({ ch: cur, t: Tg - cur.start, vis: () => 1 });
  for (const ch of lastHudSet) if (!list.some(l => l.ch === ch)) hud.hideChapter(ch);
  lastHudSet = new Set(list.map(l => l.ch));
  try { hud.update(cur, Tg - cur.start, list, live); } catch (e) { report({ kind: 'hud', chapter: cur.id, t: Tg - cur.start, message: errMsg(e) }); }
  // 占位 / 构建失败的章节：右上角明确标出，避免误当成完成画面（正式导出默认拒绝占位章节，见 tools/render.mjs）
  const st = $('chstate'); if (st) { const k = cur.status === 'placeholder' || cur.status === 'failed' ? cur.id + cur.status : ''; if (k !== st.dataset.k) { st.dataset.k = k; st.className = k ? cur.status : ''; st.textContent = !k ? '' : cur.status === 'failed' ? `第 ${cur.id} 章构建失败 · BUILD FAILED` : `第 ${cur.id} 章 · 占位画面 · PLACEHOLDER`; } }
  // 章节 DOM 块（片名 / 片尾）
  for (const id of DOM_IDS) { let a = 0; for (const d of cur.doms) if (d.id === id) a = Math.max(a, win(Tg - cur.start, d.t0, d.t1, d.fade)); const el = $(id); if (el) el.style.opacity = a.toFixed(3); }
  if (OPTS.debug) $('dbg').textContent = `${Tg.toFixed(2)}s · ch ${cur.id} t=${(Tg - cur.start).toFixed(2)} · ${base ? base.name : '-'}${top ? ' → ' + top.name + ' ' + f.toFixed(2) : ''}`;
}
const DOM_IDS = ['title', 'endcard'];

/* ---------- 尺寸 ---------- */
function resize() {
  const fw = RENDER ? W : innerWidth, fh = RENDER ? H : innerHeight;
  const k = Math.min(fw / W, fh / H), w = Math.round(W * k), h = Math.round(H * k);
  const fr = $('frame'); fr.style.width = w + 'px'; fr.style.height = h + 'px';
  const pr = RENDER ? 1 : Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(1); renderer.setSize(Math.round(w * pr), Math.round(h * pr), false);
  $('gl').style.width = w + 'px'; $('gl').style.height = h + 'px';
  pipe.setSize(Math.round(w * pr), Math.round(h * pr), OPTS.scale);
  hud.setScale(k, RENDER ? 1 : (devicePixelRatio || 1));
}

/* ---------- 启动 ---------- */
export async function boot(chapters) {
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  A.initAssets(renderer); await A.loadIndex();
  pipe = new Pipeline(renderer); hud = new HUD();
  hud.onError = (e, ch, t) => report({ kind: 'hud', chapter: ch.id, t, message: errMsg(e) });
  KIT.init(renderer);
  resize(); addEventListener('resize', resize);
  if (OPTS.debug) document.body.classList.add('debug');

  const list = OPTS.only ? chapters.filter(c => OPTS.only.split(',').includes(c.id)) : chapters;
  const lp = $('loading'); A.progress.onChange = p => { if (lp) lp.textContent = `LOADING · ${p.done}/${p.total}`; };
  for (const def of list) {
    const ch = { ...def, status: def.status || 'implemented', assets: new Set() }; CH.push(ch);
    A.setOwner(ch.assets);
    try { await def.build(makeCtx(ch)); if (!ch.shots.length) throw new Error('no shots'); }
    catch (e) { report({ kind: 'build', chapter: ch.id, message: errMsg(e) }, false); placeholder(ch, e); }
  }
  A.setOwner(null);
  // 引用其他章画面（ctx.clip）时，被引用的章必须也载入了，否则那一段会是黑场 —— 明确报错，不静默
  for (const c of CH) for (const s of c.shots) if (s.clip && !CH.some(x => x.id === s.clip.chapter)) report({ kind: 'clip', chapter: c.id, shot: s.name, message: `引用的第 ${s.clip.chapter} 章没有载入（预览时请一起 --only ${s.clip.chapter}）` }, false);
  layout();
  CUES.forEach(c => c[0] += c[3].start); CUES.sort((a, b) => a[0] - b[0]);
  // 预编译着色器
  for (const s of SHOTS) if (s.scene && s.camera) { try { renderer.compile(s.scene, s.camera); } catch (e) { console.warn(e); } }
  lp && lp.remove();

  window.FILM = {
    TOTAL, FPS, ready: true, mode: OPTS.strict ? 'strict' : 'preview',
    chapters: CH.map(c => ({ id: c.id, title: c.title, start: c.start, dur: c.dur, status: c.status, error: c.error || null, assets: [...c.assets].sort(), renders: renderDeps(c) })),
    cues: CUES.map(c => [c[0], c[1], c[2]]), music: CH.map(c => ({ start: c.start, dur: c.dur, music: c.music || null })),
    failed: A.progress.failed, errors: ERRORS, bootMs: Math.round(performance.now()),
    /** 性能计数（tools/perf.mjs）：帧数、GPU 资源数量、资源加载统计、JS 堆 */
    perf: () => ({ frames: FRAMES, memory: { ...renderer.info.memory }, programs: (renderer.info.programs || []).length, assets: { ...A.stats, total: A.progress.total, failed: A.progress.failed.length }, heap: performance.memory ? performance.memory.usedJSHeapSize : null }),
  };
  /** 逐帧导出：按给定的影片时间渲染（与电脑速度无关）。正式导出模式下本帧出错就抛出 */
  window.renderFrame = t => {
    T = t; renderAt(t, 1 / FPS, false);
    if (OPTS.strict && FRAME_ERR.length) { const e = FRAME_ERR[0]; throw new Error(`[${e.kind}] 第 ${e.chapter} 章${e.shot ? ' 镜头 ' + e.shot : ''} t=${(e.t ?? 0).toFixed(3)}s（全片 ${t.toFixed(3)}s）：${e.message}`); }
    return true;
  };
  window.AU = AU;
  if (RENDER) { document.body.classList.add('render'); started = true; return; }
  livePlayer();
}

/* ---------- 实时播放器 ---------- */
function livePlayer() {
  // 统一时钟：画面 / 字幕 / 音效都读 tp 的时间；音频可用时以音频为基准（见 clock.js）
  const tp = makeTransport({ audio: AU, total: TOTAL - .05 });
  let soundOn = true, voiceOn = false, idle, prevT = 0;
  const poke = () => { $('ctrl').classList.remove('hide'); clearTimeout(idle); idle = setTimeout(() => { if (tp.playing) $('ctrl').classList.add('hide'); }, 2400); };
  const btn = () => { $('bPlay').textContent = tp.playing ? '❚❚' : '▶'; };
  const seek = t => { tp.seek(t); T = prevT = tp.clock.time(); hush(); };
  const go = () => {
    AU.init(window.FILM.music, { clock: tp.clock, cues: CUES.map(c => [c[0], c[1], c[2]]) }); AU.setOn(soundOn);
    $('intro').classList.add('gone'); $('replay').hidden = true; $('ctrl').style.display = '';
    started = true; tp.start(OPTS.from ? +OPTS.from : 0); T = prevT = tp.clock.time(); btn(); poke();
  };
  const finish = () => { tp.pause(); btn(); $('replay').hidden = false; $('ctrl').classList.remove('hide'); };
  const toggle = () => { if (!started || T >= TOTAL - .1) return go(); if (tp.playing) { tp.pause(); hush(); } else tp.play(); btn(); poke(); };
  // 旁白（浏览器语音合成，仅实时播放）
  let zh = null; const pick = () => { if (!('speechSynthesis' in window)) return; const vs = speechSynthesis.getVoices(); zh = vs.find(v => /zh[-_]CN/i.test(v.lang) && /Tingting|Xiaoxiao|Yunxi|Google/i.test(v.name)) || vs.find(v => /zh[-_]CN/i.test(v.lang)) || null; };
  if ('speechSynthesis' in window) { pick(); speechSynthesis.onvoiceschanged = pick; }
  const hush = () => { try { speechSynthesis.cancel(); } catch (e) { } };
  hud.speak = txt => { if (!voiceOn || !tp.playing || !('speechSynthesis' in window)) return; try { hush(); const u = new SpeechSynthesisUtterance(txt.replace(/[「」“”]/g, '')); u.lang = 'zh-CN'; if (zh) u.voice = zh; u.rate = 1.12; speechSynthesis.speak(u); } catch (e) { } };
  $('bGo').onclick = go; $('replay').onclick = go; $('bPlay').onclick = toggle;
  window.PLAYER = { transport: tp, go, toggle, seek };   // 调试与 tools/ 下的播放检查用
  $('bSound').onclick = () => { soundOn = !soundOn; AU.setOn(soundOn); $('bSound').classList.toggle('off', !soundOn); };
  $('bVoice').onclick = () => { voiceOn = !voiceOn; $('bVoice').classList.toggle('off', !voiceOn); AU.duck(voiceOn); if (!voiceOn) hush(); };
  $('bFull').onclick = () => { const d = document; if (!d.fullscreenElement) { const p = d.documentElement.requestFullscreen && d.documentElement.requestFullscreen(); p && p.catch && p.catch(() => { }); } else d.exitFullscreen && d.exitFullscreen(); };
  const tr = $('track'), posT = e => { const r = tr.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width) * TOTAL; };
  let drag = false;
  tr.addEventListener('pointerdown', e => { drag = true; tr.setPointerCapture(e.pointerId); seek(posT(e)); });
  tr.addEventListener('pointermove', e => { if (drag) seek(posT(e)); });
  tr.addEventListener('pointerup', () => drag = false);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && started) seek(tp.clock.time() + 10); else if (e.key === 'ArrowLeft' && started) seek(tp.clock.time() - 10);
    else if (e.key === 'f' || e.key === 'F') $('bFull').onclick(); else if (e.key === 'm' || e.key === 'M') $('bSound').onclick();
    if (started) poke();
  });
  addEventListener('pointermove', () => started && poke());
  document.addEventListener('visibilitychange', () => { if (document.hidden && tp.playing) toggle(); });
  // 章节刻度
  const ticks = $('ticks'); if (ticks) ticks.innerHTML = CH.map(c => `<i style="left:${(c.start / TOTAL * 100).toFixed(3)}%"></i>`).join('');
  const loop = () => {
    if (started) { T = tp.frame(); if (tp.playing && T >= TOTAL - .05) finish(); }
    const dt = Math.max(0, T - prevT); prevT = T;
    renderAt(started ? T : 0, dt, true);
    if (started) { $('fill').style.width = (T / TOTAL * 100).toFixed(2) + '%'; $('tNow').textContent = `${mmss(T)} / ${mmss(TOTAL)}`; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function mmss(s) { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
