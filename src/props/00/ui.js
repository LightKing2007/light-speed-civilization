/* 00 · 手机屏幕界面（Canvas2D 绘制，作为屏幕自发光贴图）。
   paintChat：聊天界面（深色/浅色），输入框逐字出现、发送键、气泡上滑；paintLock：锁屏 + 通知横幅。
   所有状态由调用方按章内时间 t 计算后传入（纯函数）。 */
import { clamp, lerp, easeOut } from '../../engine/util.js';

export const SW = 780, SH = 1650;
const F = '"PingFang SC","Hiragino Sans GB","Noto Sans SC",-apple-system,"Helvetica Neue",sans-serif';
const font = (px, w = 400) => `${w} ${px}px ${F}`;
const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function wrap(g, text, maxW) { const out = []; let cur = ''; for (const ch of text) { if (cur && g.measureText(cur + ch).width > maxW && !'，。！？、'.includes(ch)) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); return out; }

function statusBar(g, w, o) {
  const c = o.dark ? '#f5f5f7' : '#111';
  g.fillStyle = c; g.font = font(33, 600); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.time, 78, 62);
  // 信号格
  for (let i = 0; i < 4; i++) { const h = 10 + i * 6; g.fillStyle = c; rrect(g, w - 236 + i * 13, 74 - h, 9, h, 2); g.fill(); }
  g.font = font(27, 600); g.fillText(o.net || '5G', w - 176, 63);
  // 电池
  g.strokeStyle = c; g.globalAlpha = .45; g.lineWidth = 2.5; rrect(g, w - 118, 49, 54, 27, 8); g.stroke(); g.globalAlpha = 1;
  rrect(g, w - 114, 53, 40, 19, 5); g.fill(); g.fillRect(w - 61, 57, 4, 11);
  // 灵动岛
  g.fillStyle = '#000'; rrect(g, w / 2 - 112, 24, 224, 70, 35); g.fill();
}
function keyboard(g, w, h, o) {
  const top = h - 620; const dark = o.dark;
  g.fillStyle = dark ? '#1c1c1e' : '#d2d4da'; g.fillRect(0, top, w, 620);
  g.fillStyle = dark ? 'rgba(235,235,240,.75)' : 'rgba(30,30,32,.8)'; g.font = font(32); g.textBaseline = 'middle';
  (o.cands || ['好', '的', '到了', '一切', '都好', '嗯']).forEach((s, i) => { g.textAlign = 'center'; g.fillText(s, 70 + i * 122, top + 46); });
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], kw = (w - 16) / 10, kh = 96;
  let idx = 0;
  rows.forEach((row, ri) => {
    const off = (w - row.length * kw) / 2;
    for (let i = 0; i < row.length; i++, idx++) {
      const x = off + i * kw + 5, y = top + 98 + ri * (kh + 22), hot = idx === o.keyIdx;
      g.fillStyle = hot ? (dark ? '#8e8e93' : '#ffffff') : (dark ? '#4a4a4e' : '#fdfdfe'); rrect(g, x, y, kw - 10, kh, 12); g.fill();
      g.fillStyle = dark ? '#f2f2f4' : '#111'; g.font = font(40); g.textAlign = 'center'; g.fillText(row[i], x + (kw - 10) / 2, y + kh / 2 + 2);
      if (hot) { g.fillStyle = dark ? '#6c6c70' : '#ffffff'; rrect(g, x - 12, y - 118, kw + 14, 112, 18); g.fill(); g.fillStyle = dark ? '#fff' : '#000'; g.font = font(58); g.fillText(row[i], x + (kw - 10) / 2, y - 62); }
    }
  });
  const y = top + 98 + 3 * (kh + 22);
  g.fillStyle = dark ? '#2f2f33' : '#abb0bc'; rrect(g, 13, y, 150, kh, 12); g.fill(); rrect(g, w - 163, y, 150, kh, 12); g.fill();
  g.fillStyle = dark ? '#4a4a4e' : '#fdfdfe'; rrect(g, 175, y, w - 350, kh, 12); g.fill();
  g.fillStyle = dark ? '#f2f2f4' : '#111'; g.font = font(30); g.textAlign = 'center'; g.fillText('123', 88, y + kh / 2); g.fillText('空格', w / 2, y + kh / 2); g.fillText('换行', w - 88, y + kh / 2);
  g.fillStyle = dark ? '#f2f2f4' : '#111'; rrect(g, w / 2 - 70, h - 20, 140, 8, 4); g.fill();
}
function bubble(g, x, y, lines, me, dark, maxRight = SW - 30) {
  const lh = 46, pw = 28, ph = 20; g.font = font(33);
  const bw = Math.max(...lines.map(s => g.measureText(s).width)) + pw * 2, bh = lines.length * lh + ph * 2;
  const bx = me ? maxRight - bw : x;
  g.fillStyle = me ? (dark ? '#1e8e4f' : '#34c759') : (dark ? '#2a2a2d' : '#e9e9eb'); rrect(g, bx, y, bw, bh, 34); g.fill();
  g.fillStyle = me ? '#fff' : (dark ? '#f2f2f4' : '#111'); g.textAlign = 'left'; g.textBaseline = 'middle';
  lines.forEach((s, i) => g.fillText(s, bx + pw, y + ph + lh * i + lh / 2 + 1));
  return bh;
}
/** 聊天界面。o = { dark, time, peer, peerSub, avatar, history:[{ts}|{me,text}], draft, caret, sendPress(0..1), newText, sendP(−1 = 未发送, 0..1 上滑进度), newTs, keyIdx, status } */
export function paintChat(g, w, h, o) {
  const dark = o.dark;
  g.fillStyle = dark ? '#000' : '#fff'; g.fillRect(0, 0, w, h);
  statusBar(g, w, o);
  // 标题栏
  g.fillStyle = dark ? '#0a84ff' : '#007aff'; g.font = font(64, 300); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('‹', 30, 168);
  g.fillStyle = o.avatarColor || '#c98a6b'; g.beginPath(); g.arc(w / 2, 150, 40, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = font(36, 500); g.textAlign = 'center'; g.fillText(o.avatar, w / 2, 152);
  g.fillStyle = dark ? '#f2f2f4' : '#111'; g.font = font(25, 500); g.fillText(o.peer + '  ›', w / 2, 214);
  g.fillStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)'; g.fillRect(0, 246, w, 2);
  // 消息
  const kb = o.keyboard !== false, inTop = h - (kb ? 620 : 40) - 112;
  let y = 290; g.font = font(33);
  for (const m of o.history) {
    if (m.ts) { g.fillStyle = dark ? 'rgba(235,235,245,.45)' : 'rgba(60,60,67,.55)'; g.font = font(23); g.textAlign = 'center'; g.fillText(m.ts, w / 2, y + 10); y += 52; continue; }
    g.font = font(33); const lines = wrap(g, m.text, w * .6); y += bubble(g, 30, y, lines, m.me, dark) + 18;
  }
  if (o.sendP != null && o.sendP >= 0) {
    const e = easeOut(clamp(o.sendP));
    if (o.newTs) { g.globalAlpha = clamp(o.sendP * 2); g.fillStyle = dark ? 'rgba(235,235,245,.45)' : 'rgba(60,60,67,.55)'; g.font = font(23); g.textAlign = 'center'; g.fillText(o.newTs, w / 2, y + 10); g.globalAlpha = 1; y += 52; }
    g.font = font(33); const lines = wrap(g, o.newText, w * .6);
    const yy = lerp(inTop + 6, y, e); g.save(); g.translate(w - 30, yy); const s = lerp(.92, 1, e); g.scale(s, s); bubble(g, 0, 0, lines, true, dark, 0); g.restore();
    y += lines.length * 46 + 58;
    if (o.status && o.sendP >= 1) { g.fillStyle = dark ? 'rgba(235,235,245,.5)' : 'rgba(60,60,67,.6)'; g.font = font(21); g.textAlign = 'right'; g.fillText(o.status, w - 40, y); }
  }
  // 输入栏
  g.fillStyle = dark ? '#000' : '#fff'; g.fillRect(0, inTop - 6, w, 118);
  g.strokeStyle = dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(58, inTop + 52, 28, 0, 7); g.stroke(); g.fillStyle = dark ? '#a1a1a6' : '#8e8e93'; g.font = font(44, 300); g.textAlign = 'center'; g.fillText('+', 58, inTop + 50);
  rrect(g, 104, inTop + 16, w - 104 - 30, 72, 36); g.stroke();
  g.font = font(31); g.textAlign = 'left'; g.fillStyle = dark ? '#f2f2f4' : '#111';
  const draft = o.draft || '';
  if (draft) g.fillText(draft, 132, inTop + 53); else { g.fillStyle = dark ? 'rgba(235,235,245,.3)' : 'rgba(60,60,67,.3)'; g.fillText('信息', 132, inTop + 53); }
  if (o.caret) { const cx = 132 + (draft ? g.measureText(draft).width : 0) + 3; g.fillStyle = dark ? '#0a84ff' : '#007aff'; g.fillRect(cx, inTop + 32, 3, 42); }
  if (draft || o.sendPress > 0) {
    const s = 1 - .12 * Math.sin(Math.PI * clamp(o.sendPress || 0)); g.save(); g.translate(w - 66, inTop + 52); g.scale(s, s);
    g.fillStyle = dark ? '#30d158' : '#34c759'; g.beginPath(); g.arc(0, 0, 27, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 13); g.lineTo(0, -12); g.moveTo(-10, -2); g.lineTo(0, -13); g.lineTo(10, -2); g.stroke(); g.restore();
  }
  if (kb) keyboard(g, w, h, o); else { g.fillStyle = dark ? '#f2f2f4' : '#111'; rrect(g, w / 2 - 70, h - 20, 140, 8, 4); g.fill(); }
}

/** 锁屏 + 通知横幅。o = { time, date, banner(0..1), title, body, app } */
export function paintLock(g, w, h, o) {
  const gr = g.createLinearGradient(0, 0, w * .4, h); gr.addColorStop(0, '#f4c79c'); gr.addColorStop(.45, '#d99a86'); gr.addColorStop(1, '#4f6e99'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (const [x, y, r, c] of [[w * .2, h * .3, 420, 'rgba(255,236,200,.35)'], [w * .9, h * .7, 520, 'rgba(70,110,170,.45)'], [w * .5, h * .95, 400, 'rgba(40,60,100,.4)']]) { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = font(32, 600); g.fillText(o.date, w / 2, 222);
  g.font = `600 196px "SF Pro Display","Helvetica Neue",${F}`; g.fillText(o.time, w / 2, 420);
  g.fillStyle = '#000'; rrect(g, w / 2 - 112, 24, 224, 70, 35); g.fill();
  statusBar(g, w, { dark: true, time: '', net: '5G' });
  const p = easeOut(clamp(o.banner || 0));
  if (p > 0) {
    const bw = w - 60, bh = 196, bx = 30, by = lerp(h * .64, h * .585, p);
    g.globalAlpha = p; g.save(); g.translate(w / 2, by + bh / 2); const s = lerp(.94, 1, p); g.scale(s, s); g.translate(-w / 2, -(by + bh / 2));
    g.fillStyle = 'rgba(246,244,242,.9)'; rrect(g, bx, by, bw, bh, 44); g.fill();
    g.fillStyle = '#34c759'; rrect(g, bx + 30, by + 34, 76, 76, 18); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(bx + 68, by + 70, 25, 21, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(bx + 52, by + 84); g.lineTo(bx + 46, by + 98); g.lineTo(bx + 64, by + 89); g.fill();
    g.textAlign = 'left'; g.fillStyle = '#111'; g.font = font(30, 600); g.fillText(o.title, bx + 132, by + 66);
    g.fillStyle = 'rgba(60,60,67,.6)'; g.font = font(24); g.textAlign = 'right'; g.fillText('现在', bx + bw - 34, by + 64);
    g.textAlign = 'left'; g.fillStyle = '#1a1a1a'; g.font = font(30); g.fillText(o.body, bx + 132, by + 120);
    g.fillStyle = 'rgba(60,60,67,.55)'; g.font = font(22); g.fillText(o.app || '信息', bx + 132, by + 164);
    g.restore(); g.globalAlpha = 1;
  }
  // 底部快捷按钮与横条
  for (const x of [118, w - 118]) { g.fillStyle = 'rgba(30,30,40,.35)'; g.beginPath(); g.arc(x, h - 150, 50, 0, 7); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(100, h - 168, 36, 36); g.beginPath(); g.arc(w - 118, h - 150, 15, 0, 7); g.stroke();
  g.fillStyle = '#fff'; rrect(g, w / 2 - 70, h - 20, 140, 8, 4); g.fill();
}
