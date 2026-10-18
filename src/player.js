/* ============ boot: live player, or frame-exact export when opened with #render ============ */
function mmss(s) { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function boot() {
  SCENES.forEach(S => S.build && S.build(S));
  let acc = 0; SCENES.forEach(S => { STARTS.push(acc); acc += S.dur; }); TOTAL = acc;
  SCENES.forEach((S, i) => { if (i) WHIPS.push(STARTS[i]); S.cuts.forEach(c => WHIPS.push(STARTS[i] + c)); });
  onResize(); $('loading').remove();

  if (RENDER) {
    document.body.classList.add('render'); started = true; playing = true; AU.record();
    window.FILM = { TOTAL, ready: true };
    window.renderFrame = t => { T = t; step(1 / 30, t + 50); return true; };
    window.primeAt = t => { T = t; prevT = t; cur = -1; yearDisp = null; };
    return;
  }

  let soundOn = true, idle;
  const poke = () => { $('hud').classList.remove('hide'); clearTimeout(idle); idle = setTimeout(() => { if (playing) $('hud').classList.add('hide'); }, 2400); };
  const go = () => {
    AU.init(); AU.play(); AU.setOn(soundOn);
    $('intro').classList.add('gone'); $('replay').hidden = true; $('hud').style.display = '';
    started = true; playing = true; cur = -1; seek(0); $('bPlay').textContent = '❚❚';
    try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => { }); } catch (e) { }
    poke();
  };
  const finish = () => { playing = false; AU.pause(); $('bPlay').textContent = '▶'; $('replay').hidden = false; $('hud').classList.remove('hide'); };
  const toggle = () => { if (!started || T >= TOTAL - .1) return go(); playing = !playing; $('bPlay').textContent = playing ? '❚❚' : '▶'; $('bPlay').setAttribute('aria-label', playing ? '暂停' : '播放'); playing ? AU.play() : (AU.pause(), hush()); poke(); };
  $('bGo').onclick = go; $('replay').onclick = go; $('bPlay').onclick = toggle;
  $('bSound').onclick = () => { soundOn = !soundOn; AU.setOn(soundOn); $('bSound').classList.toggle('off', !soundOn); };
  $('bVoice').onclick = () => { voiceOn = !voiceOn; $('bVoice').classList.toggle('off', !voiceOn); AU.duck(voiceOn); if (!voiceOn) hush(); else if (capObj) speak(capObj[2]); };
  $('bFull').onclick = () => { const d = document; if (!d.fullscreenElement) { const p = d.documentElement.requestFullscreen && d.documentElement.requestFullscreen(); p && p.catch && p.catch(() => { }); } else d.exitFullscreen && d.exitFullscreen(); };
  const tr = $('track'), posT = e => { const r = tr.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * TOTAL; };
  let drag = false;
  tr.addEventListener('pointerdown', e => { drag = true; tr.setPointerCapture(e.pointerId); seek(posT(e)); });
  tr.addEventListener('pointermove', e => { if (drag) seek(posT(e)); });
  tr.addEventListener('pointerup', () => drag = false);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && started) seek(T + 10); else if (e.key === 'ArrowLeft' && started) seek(T - 10);
    else if (e.key === 'f' || e.key === 'F') $('bFull').onclick(); else if (e.key === 'm' || e.key === 'M') $('bSound').onclick();
    if (started) poke();
  });
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; if (started) poke(); });
  addEventListener('pointerdown', () => started && poke());
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) toggle(); });
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (playing) { T += dt; if (T >= TOTAL) { T = TOTAL - .001; finish(); } }
    step(dt, now / 1000);
    if (started) { $('fill').style.width = (T / TOTAL * 100).toFixed(2) + '%'; $('tNow').textContent = `${mmss(T)} / ${mmss(TOTAL)}`; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(boot);
