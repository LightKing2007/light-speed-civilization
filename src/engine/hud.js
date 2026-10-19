/* HUD：叠在画面上的 DOM / SVG / Canvas2D 图层。坐标系固定为 1920×1080 的「舞台」像素（整体缩放到窗口）。
   所有元素都是「章内时间」的纯函数——导出时逐帧截图，结果与实时播放一致。

   视觉规范（机能风）：白色 1.25px 细线、8px 方形锚点、等宽小字编号、橙色只做强调；
   出现时线条先「画出来」，文字随后淡入；消失时整体淡出。 */
import * as THREE from 'three';
import { clamp, ss, win, lerp, easeOut, easeIO } from './util.js';

export const W = 1920, H = 1080;
const $ = id => document.getElementById(id);
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const _v = new THREE.Vector3();

/** 3D 点 → 舞台像素；返回 null 表示在镜头后方 */
export function project(p, camera, out = { x: 0, y: 0, z: 0 }) {
  _v.copy(p).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  out.x = (_v.x * .5 + .5) * W; out.y = (-_v.y * .5 + .5) * H; out.z = _v.z; return out;
}
const resolve = (at, t) => typeof at === 'function' ? at(t) : at;

/* ---------- 单个 HUD 元素 ---------- */
class Callout {
  constructor(o, layers) {
    Object.assign(this, { side: 'auto', dx: 110, dy: -70, style: '', code: '', sub: '', title: '', fade: .35 }, o);
    this.g = svgEl('g', { class: 'co-g ' + this.style, opacity: 0 }, layers.svg);
    this.box = svgEl('rect', { width: 13, height: 13, class: 'co-anchor' }, this.g);
    this.dot = svgEl('circle', { r: 3.2, class: 'co-dot' }, this.g);
    this.line = svgEl('polyline', { class: 'co-line', fill: 'none' }, this.g);
    this.el = document.createElement('div'); this.el.className = 'co ' + this.style; layers.labels.appendChild(this.el);
    this.setText(this.title, this.sub, this.code);
  }
  setText(title, sub = this.sub, code = this.code) {
    const k = title + '|' + sub + '|' + code; if (k === this._k) return; this._k = k;
    this.el.innerHTML = (code ? `<i>${code}</i>` : '') + `<b>${title}</b>` + (sub ? `<small>${sub}</small>` : '');
    this._w = null;   // 文字变了，重新量尺寸
  }
  update(t, vis, cam) {
    let a = (this.t1 == null ? ss(this.t0, this.t0 + this.fade, t) : win(t, this.t0, this.t1, this.fade)) * vis;
    const wp = a > .002 && cam ? resolve(this.at, t) : null;
    const P = wp ? project(wp, cam) : null;
    if (P && this.occlude && this.occlude(cam.position, wp)) a = 0;
    if (!P || P.x < -50 || P.x > W + 50 || P.y < -50 || P.y > H + 50) a = 0;
    if (a <= .002) { if (this._on) { this.g.setAttribute('opacity', 0); this.el.style.opacity = 0; this.el.style.visibility = 'hidden'; this._on = false; } return; }
    this._on = true;
    let side = this.side; if (side === 'auto') side = P.x > W * .6 ? 'left' : 'right';
    const sx = side === 'left' ? -1 : 1, dx = Math.abs(this.dx) * sx, dy = this.dy;
    if (this._w == null) { this._w = this.el.offsetWidth || 0; this._h = this.el.offsetHeight || 0; }
    // 文字框整个留在画面里、并避开底部字幕区：先按框的实际大小限制折线终点
    const bw = this._w + 12, bh2 = this._h / 2 + 6;
    const ex = sx > 0 ? clamp(P.x + dx, 40, W - 30 - bw) : clamp(P.x + dx, 30 + bw, W - 40), ey = clamp(P.y + dy, 30 + bh2, H - 175 - bh2);
    const kx = P.x + (ex - P.x) * (Math.abs(ey - P.y) < 1 ? 0 : .42);   // 先斜后平的折线引线
    const pts = [[P.x, P.y], [kx, ey], [ex, ey]];
    const Lt = Math.hypot(kx - P.x, ey - P.y) + Math.abs(ex - kx) || 1;
    const p = easeOut(ss(this.t0, this.t0 + .45, t));
    let rem = p * Lt; const draw = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (rem >= seg) { draw.push(pts[i]); rem -= seg; } else { const f = seg ? rem / seg : 0; draw.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); break; } }
    this.line.setAttribute('points', draw.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '));
    this.box.setAttribute('x', (P.x - 6.5).toFixed(1)); this.box.setAttribute('y', (P.y - 6.5).toFixed(1)); this.dot.setAttribute('cx', P.x.toFixed(1)); this.dot.setAttribute('cy', P.y.toFixed(1));
    this.g.setAttribute('opacity', a.toFixed(3));
    const ta = a * ss(this.t0 + .25, this.t0 + .6, t);
    const s = this.el.style; s.visibility = 'visible'; s.opacity = ta.toFixed(3);
    s.transform = `translate(${(ex + (sx > 0 ? 12 : -12)).toFixed(1)}px,${ey.toFixed(1)}px) translate(${sx > 0 ? '0' : '-100%'},-50%)`;
    this.el.classList.toggle('l', sx < 0);
  }
}
class Bracket {
  constructor(o, layers) { Object.assign(this, { pad: 14, arm: 18, label: '', style: '', fade: .35 }, o); this.g = svgEl('g', { class: 'br-g ' + this.style, opacity: 0 }, layers.svg); this.p = svgEl('path', { class: 'br-line', fill: 'none' }, this.g); this.tx = svgEl('text', { class: 'br-text' }, this.g); this.tx.textContent = this.label; }
  update(t, vis, cam) {
    let a = (this.t1 == null ? ss(this.t0, this.t0 + this.fade, t) : win(t, this.t0, this.t1, this.fade)) * vis;
    let x0, y0, x1, y1;
    if (a > .002 && this.rect) { [x0, y0, x1, y1] = resolve(this.rect, t); }
    else if (a > .002 && cam) {
      const b = resolve(this.box, t); x0 = 1e9; y0 = 1e9; x1 = -1e9; y1 = -1e9; let any = false;
      for (let i = 0; i < 8; i++) { _c.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z); const P = project(_c, cam); if (!P) continue; any = true; x0 = Math.min(x0, P.x); y0 = Math.min(y0, P.y); x1 = Math.max(x1, P.x); y1 = Math.max(y1, P.y); }
      if (!any) a = 0;
    } else a = 0;
    if (a <= .002) { if (this._on) { this.g.setAttribute('opacity', 0); this._on = false; } return; }
    this._on = true;
    const e = easeOut(ss(this.t0, this.t0 + .5, t)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, pd = this.pad;
    x0 = lerp(cx, x0 - pd, e); x1 = lerp(cx, x1 + pd, e); y0 = lerp(cy, y0 - pd, e); y1 = lerp(cy, y1 + pd, e);
    const A = Math.min(this.arm, (x1 - x0) / 3, (y1 - y0) / 3);
    const d = `M${x0},${y0 + A}V${y0}H${x0 + A}M${x1 - A},${y0}H${x1}V${y0 + A}M${x1},${y1 - A}V${y1}H${x1 - A}M${x0 + A},${y1}H${x0}V${y1 - A}`;
    this.p.setAttribute('d', d); this.tx.setAttribute('x', x0.toFixed(1)); this.tx.setAttribute('y', (y0 - 8).toFixed(1));
    this.g.setAttribute('opacity', a.toFixed(3));
  }
}
const _c = new THREE.Vector3();
class Measure {
  constructor(o, layers) { Object.assign(this, { label: '', off: 22, style: '', fade: .35 }, o); this.g = svgEl('g', { class: 'ms-g ' + this.style, opacity: 0 }, layers.svg); this.p = svgEl('path', { class: 'ms-line', fill: 'none' }, this.g); this.el = document.createElement('div'); this.el.className = 'ms'; layers.labels.appendChild(this.el); this.el.textContent = this.label; }
  update(t, vis, cam) {
    let a = (this.t1 == null ? ss(this.t0, this.t0 + this.fade, t) : win(t, this.t0, this.t1, this.fade)) * vis;
    const A = a > .002 && cam ? project(resolve(this.a, t), cam, {}) : null, B = A ? project(resolve(this.b, t), cam, {}) : null;
    if (!A || !B) a = 0;
    if (a <= .002) { if (this._on) { this.g.setAttribute('opacity', 0); this.el.style.opacity = 0; this._on = false; } return; }
    this._on = true;
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * this.off, ny = dx / L * this.off, tx = -dy / L * 7, ty = dx / L * 7;
    const e = easeOut(ss(this.t0, this.t0 + .5, t)), mx = (A.x + B.x) / 2 + nx, my = (A.y + B.y) / 2 + ny;
    const a1x = lerp(mx, A.x + nx, e), a1y = lerp(my, A.y + ny, e), b1x = lerp(mx, B.x + nx, e), b1y = lerp(my, B.y + ny, e);
    this.p.setAttribute('d', `M${a1x - tx},${a1y - ty}L${a1x + tx},${a1y + ty}M${a1x},${a1y}L${b1x},${b1y}M${b1x - tx},${b1y - ty}L${b1x + tx},${b1y + ty}` + `M${A.x},${A.y}L${A.x + nx * 1.25},${A.y + ny * 1.25}M${B.x},${B.y}L${B.x + nx * 1.25},${B.y + ny * 1.25}`);
    this.g.setAttribute('opacity', a.toFixed(3));
    const s = this.el.style; s.opacity = (a * ss(this.t0 + .3, this.t0 + .6, t)).toFixed(3); s.transform = `translate(${(mx + nx * .9).toFixed(1)}px,${(my + ny * .9).toFixed(1)}px) translate(-50%,-50%)`;
  }
}
class Readout {
  constructor(o, layers) { Object.assign(this, { x: 80, y: 80, align: 'left', cls: '', fade: .3 }, o); this.el = document.createElement('div'); this.el.className = 'ro ' + this.cls; layers.labels.appendChild(this.el); }
  update(t, vis) {
    const a = (this.t1 == null ? ss(this.t0, this.t0 + this.fade, t) : win(t, this.t0, this.t1, this.fade)) * vis;
    const s = this.el.style;
    if (a <= .002) { if (this._on) { s.opacity = 0; s.visibility = 'hidden'; this._on = false; } return; }
    this._on = true; s.visibility = 'visible'; s.opacity = a.toFixed(3);
    const h = typeof this.html === 'function' ? this.html(t) : this.html; if (h !== this._h) { this._h = h; this.el.innerHTML = h; }
    const x = resolve(this.x, t), y = resolve(this.y, t);
    s.transform = `translate(${x}px,${y}px)` + (this.align === 'right' ? ' translate(-100%,0)' : this.align === 'center' ? ' translate(-50%,0)' : '');
  }
}
class Draw2D { constructor(o) { Object.assign(this, { fade: .3 }, o); } }

/* ---------- 全局 HUD ---------- */
export class HUD {
  constructor() {
    this.stage = $('stage'); this.svg = $('hudsvg'); this.labels = $('hudlabels'); this.cv = $('hud2d'); this.g2 = this.cv.getContext('2d');
    this.cap = $('cap'); this.card = $('card'); this.stamp = $('stamp'); this.stat = $('stat'); this.lower = $('lower');
    this.dpr = 0; this._cap = null; this._card = null; this._stat = null; this._lower = null;
    this.speak = null; this.onError = null;
  }
  setScale(stageScale, dpr) {
    this.stage.style.transform = `scale(${stageScale})`;
    const k = Math.min(2, stageScale * dpr); if (this.cv.width !== Math.round(W * k) || this.cv.height !== Math.round(H * k)) { this.cv.width = Math.round(W * k); this.cv.height = Math.round(H * k); } this.dpr = k;
  }
  /** 为章节创建登记器（章节 build 时使用） */
  registry(ch) {
    const layers = { svg: this.svg, labels: this.labels }, items = ch._hud = [], draws = ch._draw = [];
    const add = (Cls, o) => { const it = new Cls(o, layers); items.push(it); return it; };
    return {
      callout: o => add(Callout, o), bracket: o => add(Bracket, o), measure: o => add(Measure, o), readout: o => add(Readout, o),
      draw2d: o => { const d = new Draw2D(o); draws.push(d); return d; },
    };
  }
  /** 隐藏某章的全部元素（离开该章后调用一次） */
  hideChapter(ch) { for (const it of ch._hud || []) it.update(-1e9, 0, null); }

  /** 每帧：ch = 当前章（字幕/章节卡归属），chapters = 所有需要更新标注的章 [{ch, t, shotVis(shot)→0..1}] */
  update(cur, tl, list, live) {
    for (const { ch, t, vis } of list) for (const it of ch._hud || []) { const v = it.shot ? vis(it.shot) : vis(null); it.update(t, v, it.shot ? it.shot.camera : null); }
    // Canvas2D
    const g = this.g2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const { ch, t, vis } of list) for (const d of ch._draw || []) {
      const v = d.shot ? vis(d.shot) : vis(null);
      const a = (d.t1 == null ? ss(d.t0, d.t0 + d.fade, t) : win(t, d.t0, d.t1, d.fade)) * v;
      if (a > .002) { g.save(); g.globalAlpha = a; try { d.draw(g, t, a, p => d.shot ? project(p, d.shot.camera, {}) : null); } catch (e) { this.onError ? this.onError(e, ch, t) : console.error(e); } g.restore(); }
    }
    this.updCaption(cur, tl, live); this.updCard(cur, tl); this.updStat(cur, tl); this.updLower(cur, tl);
  }
  updCaption(ch, t, live) {
    const cp = ch ? (ch.caps || []).find(c => t >= c[0] && t <= c[1]) : null;
    if (cp !== this._cap) { this._cap = cp; this.cap.innerHTML = cp ? `<span>${cp[2]}</span>` : ''; if (cp && live && this.speak) this.speak(cp[2]); }
    const a = cp ? ss(cp[0], cp[0] + .22, t) * (1 - ss(cp[1] - .22, cp[1], t)) : 0;
    this.cap.style.opacity = a.toFixed(3);
  }
  updCard(ch, t) {
    const c = ch && ch.card; const s = this.stamp, k = this.card;
    if (!c) { k.style.opacity = 0; s.style.opacity = 0; return; }
    if (this._card !== ch) {
      this._card = ch;
      k.innerHTML = (c.act ? `<div class="act"><span>${c.act}</span><em>${c.actName || ''}</em></div>` : '') +
        `<div class="num">${ch.id}</div><h2>${c.title}</h2><div class="meta">${c.meta || ''}</div>`;
      this._stampKey = null;
    }
    const t0 = c.t0 ?? .2, dur = c.dur ?? 3.4;
    const a = win(t, t0, t0 + dur, .5);
    k.style.opacity = a.toFixed(3);
    k.style.setProperty('--p', easeOut(ss(t0, t0 + 1.2, t)).toFixed(3));
    // 角标：章节卡收起后常驻，章尾淡出
    const yr = (ch.stamps || []).reduce((y, s2) => t >= s2[0] ? s2[1] : y, (ch.stamps && ch.stamps[0] && ch.stamps[0][1]) || '');
    const key = ch.id + yr; if (key !== this._stampKey) { this._stampKey = key; s.innerHTML = `<b>${ch.id}</b><span>${c.short || c.title}</span><em>${yr}</em>`; s.classList.remove('flip'); void s.offsetWidth; s.classList.add('flip'); }
    const sa = ss(t0 + dur - .3, t0 + dur + .3, t) * (1 - ss(ch.dur - .6, ch.dur - .1, t)) * (c.stamp === false ? 0 : 1);
    s.style.opacity = sa.toFixed(3);
  }
  updStat(ch, t) {
    const st = ch ? (ch.stats || []).find(s => t >= s.t0 && t <= s.t1) : null;
    if (st !== this._stat) { this._stat = st; if (st) this.stat.innerHTML = `<div class="v"><span class="n"></span><span class="u">${st.unit || ''}</span></div><div class="l">${st.label}</div>` + (st.src ? `<div class="s">${st.src}</div>` : ''); this._n = this.stat.querySelector('.n'); }
    const a = st ? win(t, st.t0, st.t1, .45) : 0; this.stat.style.opacity = a.toFixed(3);
    if (st) { const p = easeOut(ss(st.t0, st.t0 + (st.dur || 1.8), t)); const txt = st.fmt(p, t); if (txt !== this._nt) { this._nt = txt; this._n.textContent = txt; } }
    this.stat.classList.toggle('left', !!(st && st.side === 'left'));
  }
  updLower(ch, t) {
    const lt = ch ? (ch.lowers || []).find(s => t >= s.t0 && t <= s.t1) : null;
    if (lt !== this._lower) { this._lower = lt; if (lt) this.lower.innerHTML = `<b>${lt.name}</b>` + (lt.meta ? `<span>${lt.meta}</span>` : '') + (lt.credit ? `<small>${lt.credit}</small>` : ''); }
    const a = lt ? win(t, lt.t0, lt.t1, .4) : 0; this.lower.style.opacity = a.toFixed(3);
    this.lower.style.setProperty('--p', lt ? easeOut(ss(lt.t0, lt.t0 + .6, t)).toFixed(3) : 0);
  }
}

/* ---------- Canvas2D 机能风绘图小工具（draw2d 回调里使用） ---------- */
export const ink = {
  white: 'rgba(246,246,242,.97)', dim: 'rgba(238,238,232,.78)', faint: 'rgba(235,235,230,.3)', accent: '#ff7a30', warn: '#ff4d3d', cyan: '#8fd8ff',
  mono: (px, w = 500) => `${w} ${px}px "JetBrains Mono", ui-monospace, Menlo, monospace`,
  sans: (px, w = 400) => `${w} ${px}px "Noto Sans SC", "PingFang SC", sans-serif`,
  cond: (px, w = 600) => `${w} ${px}px "Barlow Condensed", "Oswald", "Arial Narrow", sans-serif`,
  line(g, pts, color = ink.white, w = 1.25) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); },
  rect(g, x, y, w, h, color = ink.white, lw = 1.25) { g.strokeStyle = color; g.lineWidth = lw; g.strokeRect(x, y, w, h); },
  text(g, s, x, y, { font = ink.mono(14), color = ink.white, align = 'left', base = 'alphabetic' } = {}) { g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); },
  /** 刻度轴 */
  ticks(g, x0, y0, x1, y1, n, len = 6, color = ink.dim) { g.strokeStyle = color; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n); g.moveTo(x, y); g.lineTo(x, y + len); } g.stroke(); },
  /** 角标框 */
  corners(g, x, y, w, h, arm = 14, color = ink.white, lw = 1.25) { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y + arm); g.lineTo(x, y); g.lineTo(x + arm, y); g.moveTo(x + w - arm, y); g.lineTo(x + w, y); g.lineTo(x + w, y + arm); g.moveTo(x + w, y + h - arm); g.lineTo(x + w, y + h); g.lineTo(x + w - arm, y + h); g.moveTo(x + arm, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - arm); g.stroke(); },
  /** 示波器面板：返回内部绘图区；fn(x01)→y(-1..1) */
  scope(g, x, y, w, h, fn, { color = ink.white, label = '', grid = true, head = 1, lw = 1.6 } = {}) {
    g.fillStyle = 'rgba(8,10,12,.55)'; g.fillRect(x, y, w, h); ink.rect(g, x, y, w, h, ink.faint, 1);
    if (grid) { g.strokeStyle = 'rgba(235,235,230,.07)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 10; i++) { const xx = x + w * i / 10; g.moveTo(xx, y); g.lineTo(xx, y + h); } for (let i = 1; i < 4; i++) { const yy = y + h * i / 4; g.moveTo(x, yy); g.lineTo(x + w, yy); } g.stroke(); }
    g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); const N = Math.max(2, Math.floor(w * head)); for (let i = 0; i <= N; i++) { const u = i / w; const yy = y + h / 2 - fn(u) * h * .42; i ? g.lineTo(x + i, yy) : g.moveTo(x, yy); } g.stroke();
    if (label) ink.text(g, label, x + 10, y + 18, { font: ink.mono(12), color: ink.dim });
  },
};
