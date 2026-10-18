/* =====================================================================
   SCENES 0–5 : prologue · Hertz · telegraph & radio · Turing & ENIAC ·
                von Neumann · transistor → Moore
   ===================================================================== */
const COPPER = 0xff9d52, AMBER = 0xffb35c, CYAN = 0x7fe0ff, VIOLET = 0xa58bff, CORAL = 0xff7b8a, WHITE = 0xffffff;

/* ---------- 00 prologue ---------- */
Scene({
  id: 'pro', name: '序章', dur: 14, era: '#ff9d52', bloom: { s: 1.35, r: .7, th: .5 },
  caps: [[1.4, 5.8, '1864 年以前，人类最快的远距离通信，是一匹快马、一艘帆船。'], [6.2, 10, '直到有人发现：一种看不见的波，能以光速奔跑。']],
  dom: [['title', 9.6, 13.9]],
  build(S) {
    S.sw = makeSwarm(7000); S.group.add(S.sw);
    S.spark = makeSpark(V(0, -.35, 0), V(0, .35, 0), 0xcfe8ff, .25); S.group.add(S.spark.grp);
    S.core = glow(0xffd2a0, 1, 2); S.group.add(S.core);
  },
  update(t, dt, ck) {
    S0.sw.material.uniforms.uP.value = started ? ss(.6, 12.2, t) * .98 : .03 + Math.sin(ck * .3) * .01;
    const c = ss(8.5, 12, t); S0.core.scale.setScalar(.2 + c * 3.5 + Math.sin(ck * 9) * .2 * c);
    const on = t > 11.6 && Math.random() < .55; S0.spark.set(on, 1.2);
    if (on && !S0._lo && playing) AU.crackle(.8); S0._lo = on;
    if (t > 12.3 && !S0._fl) { S0._fl = 1; flash = .55; } if (t < 12) S0._fl = 0;
    $('title').style.letterSpacing = lerp(.55, .12, easeOut(ss(9.6, 13.6, t))).toFixed(3) + 'em';
  },
  cam: camPath([[0, [0, 8, 74], [0, 0, 0], 42], [7, [0, 4, 40], [0, 0, 0], 42], [14, [0, .6, 7], [0, 0, 0], 40]])
});
const S0 = SCENES[0];

/* ---------- 01 Maxwell & Hertz ---------- */
const S1 = Scene({
  id: 'hertz', name: '电磁波', dur: 26, era: '#ffb066', years: [[0, 1864], [9.2, 1864], [10.4, 1887]], bloom: { s: 1.2, r: .6, th: .6 },
  dom: [['eq', 5.4, 10.2]],
  caps: [[1.4, 8.6, '1864 年，麦克斯韦用四个方程预言：变化的电场与磁场会互相激发，以光速向外传播。'], [9.2, 16.6, '1887 年，赫兹让电火花跳过一道空气间隙——几米外的金属环里，同时闪出了微弱的火花。'], [17.2, 25.2, '电与磁交替推动，化作一列看不见的波。此后所有的无线通信，都从这一跳开始。']],
  stats: [{ t0: 18, t1: 25.4, unit: 'km/s', label: '电磁波在真空中的速度', fmt: p => fmtInt(299792 * p) }],
  build(S) {
    const G = S.group;
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a06a, metalness: 1, roughness: .26, envMapIntensity: 1.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: .3, roughness: .6 });
    for (const sg of [1, -1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 3.3, 24), brass); rod.position.y = sg * 1.92; G.add(rod);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.72, 48, 32), brass); ball.position.y = sg * 3.95; G.add(ball);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 24), brass); knob.position.y = sg * .27; G.add(knob);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, .28, 64), dark); base.position.y = -5.4; G.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .9, 16), dark); pole.position.y = -4.95; G.add(pole);
    S.spark = makeSpark(V(0, -.08, 0), V(0, .08, 0), 0xd8eeff, .5); G.add(S.spark.grp);
    S.light = new THREE.PointLight(0xbfe3ff, 0, 14, 1.6); G.add(S.light);
    const warm = new THREE.PointLight(0xff9a50, 1.1, 30, 1.5); warm.position.set(-5, 4, 6); G.add(warm);
    // receiver loop at z = 7, plane ⟂ x, gap facing the transmitter
    const rr = 1.5, arcLen = Math.PI * 2 - .22;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, .045, 16, 160, arcLen), brass);
    ring.position.set(0, 0, 7); ring.rotation.set(0, Math.PI / 2, 0); ring.rotateZ(Math.PI + .11); G.add(ring); ring.updateMatrixWorld();
    const pA = V(rr * Math.cos(arcLen), rr * Math.sin(arcLen), 0).applyMatrix4(ring.matrixWorld), pB = V(rr, 0, 0).applyMatrix4(ring.matrixWorld);
    for (const p of [pA, pB]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 12), brass); k.position.copy(p); G.add(k); }
    S.rx = makeSpark(pA, pB, 0xffe0b0, .45); G.add(S.rx.grp); S.rxPos = pA.clone().lerp(pB, .5);
    // wave sheets
    S.NS = 260; S.LEN = 46;
    const sheet = (col) => {
      const n = S.NS, pos = new Float32Array(n * 2 * 3), ed = new Float32Array(n * 2), idx = [];
      for (let i = 0; i < n; i++) { ed[i * 2] = 0; ed[i * 2 + 1] = 1; if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aE', new THREE.BufferAttribute(ed, 1)); g.setIndex(idx);
      const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: hdr(col, 1) } }, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, vertexShader: 'attribute float aE;varying float vE;void main(){vE=aE;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 uC;varying float vE;void main(){gl_FragColor=vec4(uC*(.05+.5*vE*vE),1.);}' });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; G.add(mesh);
      const vecs = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.ceil(n / 4) * 6), 3)), lineMat(col, .9, 1.6)); vecs.frustumCulled = false; G.add(vecs);
      const tip = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)), lineMat(col, 1, 3)); tip.frustumCulled = false; G.add(tip);
      return { mesh, vecs, tip };
    };
    S.E = sheet(0xff9a40); S.B = sheet(0x49c8ff);
    const axis = polyline([V(0, 0, 0), V(0, 0, S.LEN)], 0xffffff, .25); G.add(axis);
    S.rings = []; const circ = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2; circ.push(V(Math.cos(a), 0, Math.sin(a))); } for (let k = 0; k < 7; k++) { const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circ), lineMat(0x9fdcff, 1, 2.2)); m.frustumCulled = false; G.add(m); S.rings.push(m); }
    const dust = new Float32Array(1500 * 3); for (let i = 0; i < 1500; i++) dust.set([(Math.random() - .5) * 40, (Math.random() - .5) * 20, Math.random() * 50 - 10], i * 3);
    G.add(mkPoints(dust, { color: 0xffd0a0, size: .05, opacity: .5, flicker: .6 }));
    S.TW = 8.6; S.VEL = 4.2;
    lab(S, '<b>火花间隙</b>高压在此击穿空气', V(.25, 0, 0), 1.8, 8.4);
    lab(S, '<b>接收环</b>距离数米，没有任何导线相连', V(0, 1.55, 7), 9.6, 16.2);
    lab(S, '<b>电场 E</b>', V(0, 1.75, 15), 16.6, 25.5);
    lab(S, '<b>磁场 B</b>', V(1.75, 0, 18.5), 17.2, 25.5);
    lab(S, '传播方向 →', () => V(0, -.3, Math.min(S.LEN, (Math.max(0, (T - STARTS[1]) - S.TW)) * S.VEL) - 1), 19, 25.5, 'under');
  },
  update(t, dt, ck) {
    const S = S1, k = 1.35, w = k * S.VEL, front = Math.max(0, t - S.TW) * S.VEL;
    const pre = t < S.TW;
    const sp = pre ? (t % 1.15 < .13 && t > 1) : Math.random() < .6;
    S.spark.set(sp, 1); S.light.intensity = sp ? 3.2 + Math.random() * 2 : 0;
    if (sp && !S._sp && playing) AU.crackle(pre ? 1 : .5); S._sp = sp;
    const rxOn = front > 7 && (front < 8.5 || Math.random() < .12);
    S.rx.set(rxOn, .8); if (rxOn && !S._rx && playing) AU.crackle(.35); S._rx = rxOn;
    if (front > 7 && !S._hit) { S._hit = 1; flash = .25; } if (front < 6) S._hit = 0;
    for (const [F, ax] of [[S.E, 1], [S.B, 0]]) {
      const pa = F.mesh.geometry.attributes.position.array, va = F.vecs.geometry.attributes.position.array, ta = F.tip.geometry.attributes.position.array;
      let vi = 0;
      for (let i = 0; i < S.NS; i++) {
        const z = i / (S.NS - 1) * S.LEN, env = ss(front, front - 2.2, z) * (.55 + .45 * ss(0, 3, z)) * (1 - .35 * z / S.LEN);
        const a = 1.55 * env * Math.sin(k * z - w * (t - S.TW));
        const x = ax ? 0 : a, y = ax ? a : 0;
        pa.set([0, 0, z, x, y, z], i * 6); ta.set([x, y, z], i * 3);
        if (i % 4 === 0) { va.set([0, 0, z, x, y, z], vi * 6); vi++; }
      }
      F.mesh.geometry.attributes.position.needsUpdate = F.vecs.geometry.attributes.position.needsUpdate = F.tip.geometry.attributes.position.needsUpdate = true;
    }
    S.rings.forEach((m, i) => { const r = front - i * (2 * Math.PI / k); const vis = r > .3; m.visible = vis; if (vis) { m.scale.setScalar(r); m.material.opacity = .55 * (1 - clamp(r / 40, 0, 1)); } });
  },
  cam: camPath([[0, [1.6, .5, 3.1], [0, 0, 0], 40], [4.5, [2.6, 1.1, 5.4], [0, 0, 0], 40], [8.6, [6.5, 2.6, 7.5], [0, 0, 3], 42], [14, [8.5, 3.6, 13], [0, 0, 9], 44], [20, [10.5, 5, 21], [0, 0, 15], 45], [26, [12.5, 6.4, 30], [0, 0, 22], 46]])
});

/* ---------- 02 telegraph → radio ---------- */
const PL = { val: [51.93, -10.35], hc: [47.88, -53.37], pol: [50.03, -5.26], sj: [47.57, -52.68] };
const S2 = Scene({
  id: 'radio', name: '越过大洋', dur: 26, era: '#ff9d52', years: [[0, 1866], [9.3, 1866], [10.6, 1901]], drone: 'wind', bloom: { s: 1.15, r: .6, th: .6 },
  caps: [[1.4, 8.6, '1866 年，第一条长期运行的跨大西洋电报电缆铺通，欧美之间的消息从十天缩短到几分钟。'], [9.3, 16.8, '但电缆昂贵又笨重。1901 年 12 月 12 日，马可尼在纽芬兰的信号山上，举着风筝天线等待。'], [17.3, 25.3, '耳机里传来三声轻响：摩尔斯码的“S”。信号无需导线，越过了约 3500 公里的大西洋。']],
  build(S) {
    const G = S.group;
    S.cable = flowLine(seaRoute([PL.val, [52.6, -24], [51, -40], PL.hc], 10.05), { color: COPPER, dash: 9, speed: .35, base: .5, pulse: 2.2, head: 0 }); G.add(S.cable);
    S.radio = flowLine(gcArc(PL.pol, PL.sj, 10.08, 2.4, 140), { color: 0x9fe6ff, dash: 1, speed: 0, base: .9, pulse: 0, head: 0 }); G.add(S.radio);
    S.rPath = new Path(gcArc(PL.pol, PL.sj, 10.08, 2.4, 140));
    S.dots = [0, 1, 2].map(() => { const g = glow(0xd8f4ff, 1.1, 3); g.visible = false; G.add(g); return g; });
    const iono = new THREE.Mesh(new THREE.SphereGeometry(12.2, 64, 48), new THREE.ShaderMaterial({ uniforms: { uOp: { value: 0 }, uC: { value: hdr(0x7fe0ff, .7) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: 'varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uC;uniform float uOp;varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(vN,vV)),4.);gl_FragColor=vec4(uC*f*uOp,1.);}' }));
    G.add(iono); S.iono = iono;
    S.ripples = []; const n = ll(...PL.pol, 1);
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 96), new THREE.MeshBasicMaterial({ color: hdr(0xbfefff, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.copy(n.clone().multiplyScalar(10.06)); m.lookAt(n.clone().multiplyScalar(20)); G.add(m); S.ripples.push(m); }
    for (const [p, c] of [[PL.val, COPPER], [PL.hc, COPPER], [PL.pol, 0xbfefff], [PL.sj, 0xbfefff]]) { const g = glow(c, .7, 2.4); g.position.copy(ll(p[0], p[1], 10.08)); G.add(g); }
    lab(S, '<b>瓦伦西亚岛</b>爱尔兰 · 1866', ll(...PL.val, 10.1), 2.6, 9.2);
    lab(S, '<b>心之港</b>纽芬兰', ll(...PL.hc, 10.1), 5.5, 9.2, 'left');
    lab(S, '<b>波尔杜</b>英格兰康沃尔 · 发射站', ll(...PL.pol, 10.1), 11.5, 25.5);
    lab(S, '<b>信号山</b>纽芬兰 · 1901.12.12', ll(...PL.sj, 10.1), 14, 25.5, 'left');
    lab(S, '电离层反射', ll(52, -30, 12.25), 13.6, 17);
    lab(S, '· · ·  = S', ll(PL.sj[0] + 4, PL.sj[1] - 2, 10.6), 19.9, 25.5, 'c big');
    S.dt = [17.6, 18.25, 18.9];
    S.events = S.dt.map(d => [d + 1.25, () => AU.beep(760, .12, .3)]);
  },
  enter() { S2.group.add(GLOBE.group); GLOBE.style(0xffc796, 0xff8a3a, 0xff8a3a, 1.2); GLOBE.grat.visible = true; },
  update(t, dt, ck) {
    const S = S2;
    S.cable.material.uniforms.uHead.value = ss(2, 7.4, t);
    S.radio.material.uniforms.uHead.value = ss(12.8, 15.6, t); S.radio.material.uniforms.uOp.value = .55 + .45 * Math.sin(ck * 4) ** 2;
    S.iono.material.uniforms.uOp.value = win(t, 11.6, 26, 1.5) * .8;
    S.dots.forEach((g, i) => { const u = (t - S.dt[i]) / 1.25; g.visible = u > 0 && u < 1.6; if (g.visible) { S.rPath.at(Math.min(u, 1), g.position); g.scale.setScalar(u >= 1 ? .9 + (u - 1) * 2.2 : .8); g.material.opacity = u >= 1 ? 1 - (u - 1) / .6 : 1; } });
    S.ripples.forEach((m, k) => { const ph = ((t - 12.8) * .8 + k / 4) % 1; m.visible = t > 12.8 && t < 23; m.scale.setScalar(.2 + ph * 2.6); m.material.opacity = (1 - ph) * .8; });
  },
  cam: orbitPath([[0, 30, -26, 46, [0, 0, 0], 40], [7, 42, -30, 28, [0, 1.2, -1], 40], [12, 50, -20, 25, [0, 1.5, -1], 40], [18, 55, -30, 21.5, [0, 2.5, -1.5], 42], [26, 44, -42, 24, [0, 2, -1], 44]])
});

/* ---------- 03 Turing & ENIAC ---------- */
const S3 = Scene({
  id: 'eniac', name: '会计算的机器', dur: 28, era: '#ffb35c', years: [[0, 1936], [11.1, 1936], [12.4, 1946]], drone: 'hum', bloom: { s: 1.15, r: .6, th: .58 },
  caps: [[1.4, 10.2, '1936 年，图灵设想出一台极简的机器：一条纸带，一个读写头，一张规则表——却能完成一切可计算的任务。'], [12.2, 19.2, '十年后，计算有了钢铁之躯。1946 年，ENIAC 公开亮相：重约 30 吨，占满整整一个房间。'], [19.7, 27.3, '它每秒能做 5000 次加法。可要换一道题，工程师得重新插线、拨开关，一忙就是好几天。']],
  stats: [{ t0: 13.6, t1: 19.4, unit: '根', label: 'ENIAC 的真空管数量', fmt: p => fmtInt(17468 * p) }, { t0: 20.2, t1: 27.4, unit: '次 / 秒', label: 'ENIAC 的加法速度', fmt: p => fmtInt(5000 * p) }],
  cuts: [11.1],
  build(S) {
    /* --- Turing tape --- */
    const TA = new THREE.Group(); S.group.add(TA); S.TA = TA;
    const glass = new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: .6, roughness: .22, envMapIntensity: .8 });
    S.tex = { '0': textTex('0', { color: '#ffd9a8' }), '1': textTex('1', { color: '#ffffff' }), ' ': textTex('', {}) };
    S.cells = []; const NC = 23;
    for (let i = 0; i < NC; i++) {
      const x = (i - 11) * 1.12, box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .14), glass); box.position.x = x; TA.add(box);
      const e = edges(box.geometry, AMBER, .35, 1.2); e.position.x = x; TA.add(e);
      const sym = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), new THREE.MeshBasicMaterial({ map: S.tex[' '], transparent: true, color: hdr(0xffffff, 1.4), depthWrite: false })); sym.position.set(x, 0, .08); TA.add(sym);
      const fl = glow(AMBER, 1.8, 2.5); fl.position.set(x, 0, .2); fl.material.opacity = 0; TA.add(fl);
      S.cells.push({ sym, fl, x });
    }
    S.head = new THREE.Group(); TA.add(S.head);
    const hb = new THREE.BoxGeometry(1.22, 1.3, .5); S.head.add(edges(hb, 0xffe2b8, 1, 3));
    const beam = new THREE.Mesh(new THREE.ConeGeometry(.62, 2.4, 48, 1, true), new THREE.MeshBasicMaterial({ color: hdr(AMBER, .25), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 1.85; S.head.add(beam);
    const hg = glow(0xffd29a, .9, 2); hg.position.y = 3.05; S.head.add(hg);
    // binary counter program, precomputed: start 0101 1011 in cells 7..14
    const tape = Array(NC).fill(' '); '01011011'.split('').forEach((c, k) => tape[7 + k] = c);
    S.tape0 = tape.slice(); let pos = 14, st = 'carry'; S.steps = [];
    for (let k = 0; k < 40; k++) {
      const r = tape[pos]; let w = null, rule = '', np = pos;
      if (st === 'carry') { if (r === '1') { w = '0'; rule = '读 1 → 写 0，左移（进位）'; np = pos - 1; } else { w = '1'; if (pos < 14) { rule = `读 ${r === ' ' ? '空' : '0'} → 写 1，转入“返回”`; st = 'ret'; np = pos + 1; } else { rule = '读 0 → 写 1，本次加一完成'; np = pos; } } }
      else { if (pos < 14) { rule = '读到数字 → 不写，右移'; np = pos + 1; } else { rule = '到达末位 → 转入“进位”'; st = 'carry'; np = pos; } }
      if (w) tape[pos] = w;
      S.steps.push({ pos, np, tape: tape.slice(), wrote: w ? pos : -1, rule, st });
      pos = np;
    }
    S.headLbl = lab(S, '', () => S.head.position.clone().add(V(0, -.85, 0)), 2.2, 10.5, 'under');
    lab(S, '<b>无限长的纸带</b>', V(-8.5, -.75, 0), 2.6, 7.5, 'under');
    /* --- ENIAC hall --- */
    const EN = new THREE.Group(); S.group.add(EN); S.EN = EN;
    const metal = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: .75, roughness: .42, envMapIntensity: .7 });
    const pg = new THREE.BoxGeometry(1, 2.6, .6);
    const panels = [];
    for (let i = 0; i < 12; i++) panels.push({ c: V(-7, 0, -1 - i * 1.02), n: V(1, 0, 0) });
    for (let i = 0; i < 16; i++) panels.push({ c: V(-7.65 + .5 + i * 1.02 * .94, 0, -13.2), n: V(0, 0, 1) });
    for (let i = 0; i < 12; i++) panels.push({ c: V(7, 0, -12 + i * 1.02), n: V(-1, 0, 0) });
    const tubes = [], cols = [], dels = [], r = rng(5);
    panels.forEach((P, pi) => {
      const m = new THREE.Mesh(pg, metal); m.position.copy(P.c); m.lookAt(P.c.clone().add(P.n)); EN.add(m);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(.86, .12), new THREE.MeshBasicMaterial({ color: hdr(AMBER, .9) })); plate.position.copy(P.c).addScaledVector(P.n, .305).add(V(0, 1.16, 0)); plate.lookAt(plate.position.clone().add(P.n)); EN.add(plate);
      const side = V(0, 1, 0).cross(P.n).normalize();
      for (let k = 0; k < 437; k++) {
        const u = ((k % 13) / 12 - .5) * .8 + (r() - .5) * .02, v = (Math.floor(k / 13) / 33 - .5) * 2.1;
        const p = P.c.clone().addScaledVector(P.n, .32).addScaledVector(side, u).add(V(0, v - .08, 0));
        tubes.push(p.x, p.y, p.z); const h = r(); cols.push(1, .55 + h * .35, .2 + h * .25); dels.push(12.4 + pi * .07 + r() * .35);
      }
    });
    S.tubes = mkPoints(new Float32Array(tubes), { color: 0xffffff, size: .055, cols: new Float32Array(cols), delays: new Float32Array(dels), flicker: .35, k: 1.8 }); EN.add(S.tubes);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x050608, metalness: .3, roughness: .7, envMapIntensity: .3 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.3; EN.add(floor);
    S.lamps = [new THREE.PointLight(0xff8a3a, 0, 22, 1.4), new THREE.PointLight(0xff8a3a, 0, 22, 1.4)]; S.lamps[0].position.set(-3, 2.5, -6); S.lamps[1].position.set(3, 2.5, -10); S.lamps.forEach(l => EN.add(l));
    lab(S, '<b>开关与插线板</b>“编程” = 重新接线', V(-6.6, -.4, -4.5), 21, 27.5);
    lab(S, '<b>ENIAC</b>宾夕法尼亚大学 · 1946', V(0, 1.6, -13), 14, 20);
  },
  enter() { scene.fog = new THREE.FogExp2(0x03050a, .055); },
  exit() { scene.fog = null; },
  update(t, dt, ck) {
    const S = S3, partA = t < 11.1;
    S.TA.visible = partA; S.EN.visible = !partA; scene.fog.density = partA ? .07 : .035;
    if (partA) {
      const DT = .42, x = (t - 1.2) / DT, k = clamp(Math.floor(x), 0, S.steps.length - 1), f = clamp(x - k, 0, 1), s = S.steps[k];
      const px = lerp(S.cells[s.pos].x, S.cells[s.np].x, easeIO(ss(.45, 1, f)));
      S.head.position.set(t < 1.2 ? S.cells[14].x : px, 0, 0);
      const prev = k > 0 ? S.steps[k - 1].tape : S.tape0, shown = t < 1.2 ? S.tape0 : (f >= .3 ? s.tape : prev);
      S.cells.forEach((c, i) => { c.sym.material.map = S.tex[shown[i]] || S.tex[' ']; c.fl.material.opacity = t >= 1.2 && i === s.wrote ? (1 - ss(.3, 1, f)) * ss(.2, .32, f) : 0; });
      if (k !== S._k && t > 1.2) { S._k = k; if (playing) AU.blip(s.wrote >= 0 ? 1400 : 900, .1); }
      S.headLbl.set(`<b>${s.st === 'carry' ? '状态：进位' : '状态：返回'}</b>${s.rule}`);
    } else {
      const ig = ss(12.4, 15.5, t); S.tubes.material.uniforms.uReveal.value = t; S.lamps.forEach(l => l.intensity = ig * 1.3 * (.9 + .1 * Math.sin(ck * 13)));
    }
  },
  cam(t) { return t < 11.1 ? S3.camA(t) : S3.camB(t); },
  camA: camPath([[0, [-4.5, 1.8, 7], [-1, 0, 0], 40], [5, [1.2, .8, 4.6], [3.5, 0, 0], 38], [11.1, [6.5, 2.6, 6], [2, 0, 0], 40]]),
  camB: camPath([[11.1, [0, 10, 15], [0, 0, -6], 44], [16, [0, 3.4, 5], [0, .4, -8], 46], [21.5, [-3.2, .7, -2.5], [-7, .3, -8.5], 48], [28, [1.5, .9, -9.2], [-7, .2, -12.6], 50]])
});

/* ---------- 04 von Neumann ---------- */
const S4 = Scene({
  id: 'vonn', name: '存储程序', dur: 26, era: '#a58bff', years: [[0, 1945]], bloom: { s: 1.1, r: .5, th: .62 },
  caps: [[1.4, 8.4, '1945 年，冯·诺依曼在 EDVAC 报告中写下关键一笔：把程序和数据一起存进同一个存储器。'], [9, 16.6, '运算器、控制器、存储器、输入、输出——五大部件由总线连成一体。换一道题，只需改写存储器里的内容。'], [17.2, 25.4, '取指、译码、执行、写回。这个节拍至今仍在你手中的芯片里重复，每秒数十亿次。']],
  dom: [['stages', 8.6, 25.5]],
  build(S) {
    const G = S.group;
    const comp = (geo, col, pos, fill = .5) => { const g = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0c0e18, metalness: .4, roughness: .3, transparent: true, opacity: fill, depthWrite: false })); const e = edges(geo, col, 1, 1.6); g.add(m, e); g.position.copy(pos); G.add(g); g.userData = { home: pos.clone(), e }; return g; };
    S.CU = comp(new THREE.BoxGeometry(3.2, 1.6, 1.2), VIOLET, V(-5, 2.2, 0));
    const sh = new THREE.Shape(); sh.moveTo(-1.6, 1); sh.lineTo(-.45, 1); sh.lineTo(0, .45); sh.lineTo(.45, 1); sh.lineTo(1.6, 1); sh.lineTo(.75, -1); sh.lineTo(-.75, -1); sh.closePath();
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); ag.translate(0, 0, -.5);
    S.ALU = comp(ag, AMBER, V(-5, -1.25, 0));
    S.CPU = comp(new THREE.BoxGeometry(5, 6.6, 2.2), 0x8aa0ff, V(-5, .5, 0), .06); S.CPU.userData.e.material.opacity = .35;
    S.IN = comp(new THREE.BoxGeometry(2.2, 1, 1), 0xdfe6f2, V(-.6, -4.7, 0));
    S.OUT = comp(new THREE.BoxGeometry(2.2, 1, 1), 0xdfe6f2, V(4.4, -4.7, 0));
    S.MEM = comp(new THREE.BoxGeometry(4.2, 6, .4), CYAN, V(5, .58, -.3), .4);
    // memory cells
    S.mx = c => 3.46 + c * .44; S.my = r => 3.0 - r * .44;
    const cg = new THREE.BoxGeometry(.34, .34, .1), cm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    S.cellsM = new THREE.InstancedMesh(cg, cm, 96); S.cellsM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(96 * 3), 3);
    const d = new THREE.Object3D(); S.base = [];
    for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) { const i = r * 8 + c; d.position.set(S.mx(c) - 5, S.my(r) - .58, .3); d.updateMatrix(); S.cellsM.setMatrixAt(i, d.matrix); const col = r < 5 ? new THREE.Color(VIOLET) : r > 6 ? new THREE.Color(AMBER) : new THREE.Color(0x1b2030); const k = r < 5 || r > 6 ? (.18 + Math.random() * .25) : 1; S.base.push(col.multiplyScalar(k)); }
    S.MEM.add(S.cellsM); S.heat = new Float32Array(96);
    // bus segments
    S.busMat = []; const seg = (a, b, r = .07) => { const len = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, len, 12, 1, true); const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uLen: { value: len }, uC: { value: hdr(0x9fdcff, 1) }, uOp: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform float uTime,uLen,uOp;uniform vec3 uC;varying vec2 vUv;void main(){float p=pow(fract(vUv.y*uLen*.6-uTime*1.2),10.);gl_FragColor=vec4(uC*(.35+p*2.2)*uOp,1.);}' }); TIMED.push(m); S.busMat.push(m); const mesh = new THREE.Mesh(g, m); mesh.position.copy(a).lerp(b, .5); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); G.add(mesh); };
    seg(V(-2.6, -1.25, 0), V(-2.6, 2.2, 0)); seg(V(-3.4, 2.2, 0), V(-2.6, 2.2, 0)); seg(V(-3.55, -1.25, 0), V(-2.6, -1.25, 0)); seg(V(-2.6, .5, 0), V(3, .5, 0), .11);
    seg(V(3, -2.4, 0), V(3, 3.4, 0)); seg(V(-2.6, -1.25, 0), V(-2.6, -3.5, 0)); seg(V(-2.6, -3.5, 0), V(4.4, -3.5, 0)); seg(V(-.6, -3.5, 0), V(-.6, -4.2, 0)); seg(V(4.4, -3.5, 0), V(4.4, -4.2, 0));
    S.pk = glow(0xffffff, .9, 3); S.pkCore = new THREE.Mesh(new THREE.BoxGeometry(.26, .26, .26), new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 3) })); S.pk.add(S.pkCore); S.pkCore.scale.setScalar(1 / .9); G.add(S.pk);
    S.trail = [0, 1, 2, 3, 4].map(k => { const g = glow(0xffffff, .55 - k * .07, 1.4 - k * .22); G.add(g); return g; }); S.hist = [];
    lab(S, '<b>控制器</b>指挥：下一步做什么', V(-6.5, 3.1, .6), 6, 25.5, 'left');
    lab(S, '<b>运算器</b>加减乘除 · 逻辑判断', V(-6.4, -1.3, .6), 6.4, 25.5, 'left');
    lab(S, '<b>存储器</b>', V(7.2, 3.6, 0), 6.8, 25.5);
    lab(S, '程序（指令）', V(7.2, 2.1, .3), 2.6, 25.5);
    lab(S, '数据', V(7.2, -1.3, .3), 2.8, 25.5);
    lab(S, '<b>总线</b>', V(.4, .5, 0), 7.5, 16.6, 'under');
    lab(S, '输入', V(-.6, -4.7, .6), 7.6, 25.5, 'under'); lab(S, '输出', V(4.4, -4.7, .6), 7.8, 25.5, 'under');
    // cycle period integration (piecewise constant period)
    const segsP = [[8.6, 3.6], [17.2, 1.9], [20.6, .85], [22.8, .32], [26, .32]];
    S.phase = t => { if (t < 8.6) return -1; let ph = 0, a = 8.6; for (let i = 0; i < segsP.length - 1; i++) { const b = segsP[i + 1][0], P = segsP[i][1]; if (t <= b) return ph + (t - a) / P; ph += (b - a) / P; a = b; } return ph; };
    S.stEls = [...document.querySelectorAll('#stages span')];
  },
  update(t, dt, ck) {
    const S = S4;
    // assembly
    [S.CPU, S.CU, S.ALU, S.MEM, S.IN, S.OUT].forEach((g, i) => { const u = easeOut(ss(.6 + i * .45, 3.2 + i * .45, t)); const h = g.userData.home; const off = V(Math.sin(i * 2.1) * 14, Math.cos(i * 1.7) * 9, -18 + i * 3); g.position.copy(h).addScaledVector(off, 1 - u); g.rotation.set((1 - u) * 1.2 * Math.sin(i), (1 - u) * 2.4, 0); g.userData.e.material.opacity = u * (g === S.CPU ? .35 : 1); });
    S.busMat.forEach(m => m.uniforms.uOp.value = ss(5, 7.5, t));
    for (let i = 0; i < 96; i++) S.heat[i] *= Math.pow(.25, dt);
    const ph = S.phase(t);
    const route = (r, c, toCU, rev) => { const p = [V(S.mx(c), S.my(r), .45), V(3, S.my(r), .2), V(3, .5, 0), V(-2.6, .5, 0), toCU ? V(-2.6, 2.2, 0) : V(-2.6, -1.25, 0), toCU ? V(-3.4, 2.2, .3) : V(-3.6, -1.25, .3)]; return new Path(rev ? p.reverse() : p); };
    if (ph >= 0) {
      const cyc = Math.floor(ph), f = ph - cyc, stg = Math.floor(f * 4), u = easeIO(clamp(f * 4 - stg, 0, 1));
      const ir = cyc % 5, ic = (cyc * 3) % 8, dr = 7 + (cyc + 1) % 5, dc = (cyc * 5 + 2) % 8, wr = 7 + (cyc + 3) % 5, wc = (cyc * 7 + 1) % 8;
      let P = null, col = 0xffffff;
      if (stg === 0) { P = route(ir, ic, true, false).at(u); col = VIOLET; S.heat[ir * 8 + ic] = 1; }
      else if (stg === 1) { P = V(-3.4, 2.2, .3); col = VIOLET; }
      else if (stg === 2) { P = route(dr, dc, false, false).at(u); col = AMBER; S.heat[dr * 8 + dc] = 1; }
      else { P = route(wr, wc, false, true).at(u); col = 0xffe9c4; if (u > .95) S.heat[wr * 8 + wc] = 1.6; }
      S.pk.visible = true; S.pk.position.copy(P); S.pk.material.color.copy(hdr(col, 3)); S.pkCore.material.color.copy(hdr(col, 3));
      S.hist.unshift(P.clone()); S.hist.length = Math.min(S.hist.length, 12);
      S.trail.forEach((g, k) => { const h = S.hist[(k + 1) * 2]; g.visible = !!h; if (h) { g.position.copy(h); g.material.color.copy(hdr(col, 1.4 - k * .22)); } });
      S.CU.userData.e.material.color.copy(hdr(VIOLET, stg === 1 ? 4 : 1.6)); S.ALU.userData.e.material.color.copy(hdr(AMBER, stg === 2 && u > .9 || stg === 3 && u < .15 ? 4 : 1.6));
      if (stg !== S._stg) { S._stg = stg; S.stEls.forEach((e, k) => e.classList.toggle('a', k === stg)); if (playing) AU.blip([880, 1175, 1320, 1568][stg], ph < 40 ? .12 : .05); }
    } else { S.pk.visible = false; S.trail.forEach(g => g.visible = false); }
    const c = new THREE.Color();
    for (let i = 0; i < 96; i++) { c.copy(S.base[i]); if (S.heat[i] > 0) c.lerp(new THREE.Color(0xffffff).multiplyScalar(2.6), clamp(S.heat[i], 0, 1)); c.multiplyScalar(ss(1.6, 4, t) * (1 + .15 * Math.sin(ck * 3 + i))); S.cellsM.setColorAt(i, c); }
    S.cellsM.instanceColor.needsUpdate = true;
  },
  cam: camPath([[0, [-6, 7, 22], [0, .2, 0], 42], [7, [-3, 4, 17], [0, .2, 0], 42], [14, [3, 2.5, 15.5], [0, -.2, 0], 42], [20, [7, 3, 13], [1, 0, 0], 40], [26, [10, 4.5, 11.5], [1.5, 0, 0], 40]])
});

/* ---------- 05 transistor → chip → Moore ---------- */
const MOORE = [[1971, 'Intel 4004', 2300, '2,300'], [1978, 'Intel 8086', 29000, '2.9 万'], [1989, 'Intel 486', 1.2e6, '120 万'], [2000, 'Pentium 4', 4.2e7, '4,200 万'], [2010, 'Core i7', 1.17e9, '11.7 亿'], [2020, 'Apple M1', 1.6e10, '160 亿'], [2024, 'NVIDIA B200', 2.08e11, '2,080 亿']];
const mooreH = n => (Math.log10(n) - 3) * 1.3 + .4;
const S5 = Scene({
  id: 'chip', name: '硅的奇迹', dur: 30, era: '#7fe0ff', years: [[0, 1947], [10.6, 1958], [12.4, 1971], [20.6, 1971], [27.2, 2024]], bloom: { s: 1.15, r: .55, th: .62 },
  caps: [[1.3, 9.2, '1947 年，贝尔实验室造出第一只晶体管：一个没有灯丝、不会烧断的电子开关。栅极一加电，电流便能通过。'], [10.6, 18.8, '1958 年，集成电路诞生；1971 年，Intel 4004 把 2300 个晶体管装进指甲盖大小的芯片。'], [20, 29.4, '此后半个世纪，芯片上的晶体管数目大约每两年翻一番——2024 年的 AI 芯片，已集成 2080 亿个。']],
  stats: [{ t0: 24.6, t1: 29.6, unit: '万倍', label: '晶体管数增长 · 1971 → 2024', fmt: p => fmtInt(9000 * p) }],
  cuts: [10, 19.6],
  build(S) {
    /* MOSFET cut-away */
    const A = new THREE.Group(); S.group.add(A); S.A = A;
    const sub = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 4), new THREE.MeshStandardMaterial({ color: 0x15121f, metalness: .35, roughness: .6, envMapIntensity: .5 })); sub.position.y = -1.22; A.add(sub);
    const well = new THREE.MeshStandardMaterial({ color: 0x0b2230, emissive: 0x1a6a8a, emissiveIntensity: .4, metalness: .3, roughness: .45, envMapIntensity: .5 });
    for (const sx of [-2.6, 2.6]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2, .85, 3.3), well); w.position.set(sx, -.4, 0); A.add(w); const c = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 1.3, 24), new THREE.MeshStandardMaterial({ color: 0xc0c6d0, metalness: 1, roughness: .2 })); c.position.set(sx, .65, 0); A.add(c); }
    const ox = new THREE.Mesh(new THREE.BoxGeometry(3.4, .12, 3.3), new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: .35, roughness: .1 })); ox.position.y = .08; A.add(ox);
    S.gate = new THREE.Mesh(new THREE.BoxGeometry(3.1, .6, 3.1), new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: .25, emissive: 0xffc070, emissiveIntensity: 0 })); S.gate.position.y = .45; A.add(S.gate);
    S.chan = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.2), new THREE.MeshBasicMaterial({ color: hdr(CYAN, 1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); S.chan.rotation.x = -Math.PI / 2; S.chan.position.y = -.03; A.add(S.chan);
    const NE = 320, ep = new Float32Array(NE * 3); S.eSeed = []; for (let i = 0; i < NE; i++) S.eSeed.push([Math.random(), (Math.random() - .5) * 2.8, Math.random()]);
    S.elec = mkPoints(ep, { color: 0x9fefff, size: .09, k: 2.2 }); A.add(S.elec);
    lab(S, '<b>源极 S</b>', V(-2.6, 1.35, 0), 2, 9.6); lab(S, '<b>栅极 G</b>开关的“手柄”', V(0, 1, 0), 2.4, 9.6); lab(S, '<b>漏极 D</b>', V(2.6, 1.35, 0), 2.8, 9.6);
    S.chLbl = lab(S, '导电沟道', V(0, -.1, 1.75), 3.5, 9.6, 'under');
    /* die */
    const B = new THREE.Group(); S.group.add(B); S.B = B;
    const pkg = new THREE.Mesh(new THREE.BoxGeometry(14, .5, 14), new THREE.MeshStandardMaterial({ color: 0x0b1110, metalness: .3, roughness: .6 })); pkg.position.y = -.35; B.add(pkg);
    const pinG = new THREE.BoxGeometry(.18, .06, .5), pins = new THREE.InstancedMesh(pinG, new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: .25 }), 4 * 30); const o = new THREE.Object3D(); let pi = 0;
    for (let s = 0; s < 4; s++) for (let k = 0; k < 30; k++) { const a = (k - 14.5) * .42; o.position.set(s < 2 ? a : (s === 2 ? 6.6 : -6.6), -.08, s < 2 ? (s ? 6.6 : -6.6) : a); o.rotation.y = s < 2 ? 0 : Math.PI / 2; o.updateMatrix(); pins.setMatrixAt(pi++, o.matrix); }
    B.add(pins);
    const die = new THREE.Mesh(new THREE.BoxGeometry(9.2, .16, 9.2), new THREE.MeshStandardMaterial({ color: 0x161925, metalness: .95, roughness: .22 })); die.position.y = .0; B.add(die);
    const NB = 72, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .8, roughness: .3, envMapIntensity: 1.2 }), NB * NB); inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NB * NB * 3), 3);
    const pal = [new THREE.Color(0x3a5a78), new THREE.Color(0x6a4a2a), new THREE.Color(0x4a3a6a), new THREE.Color(0x2e5a52)], rr = rng(9); let n = 0;
    for (let i = 0; i < NB; i++) for (let j = 0; j < NB; j++) {
      const x = (i - NB / 2 + .5) * .122, z = (j - NB / 2 + .5) * .122, bx = Math.floor(i / 18), bz = Math.floor(j / 18), blk = (bx + bz * 2) % 4;
      const ring = i < 3 || j < 3 || i > NB - 4 || j > NB - 4, cache = blk === 1 && (i % 18) > 2 && (j % 18) > 2;
      if (!ring && ((i % 18) === 0 || (j % 18) === 0)) { o.scale.set(.001, .001, .001); }
      else { const h = ring ? .06 : cache ? .05 : .03 + Math.pow(rr(), 3) * .28; o.scale.set(.1, h, .1); }
      o.position.set(x, .08 + o.scale.y / 2, z); o.rotation.set(0, 0, 0); o.updateMatrix(); inst.setMatrixAt(n, o.matrix);
      const c = (ring ? new THREE.Color(0xb08a40) : pal[blk].clone()).multiplyScalar(.7 + rr() * .6); if (cache) c.set(0x5aa0c0); inst.setColorAt(n, c); n++;
    }
    B.add(inst);
    S.scan = new THREE.Mesh(new THREE.PlaneGeometry(.35, 9.2), new THREE.MeshBasicMaterial({ color: hdr(CYAN, 2.2), transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })); S.scan.rotation.x = -Math.PI / 2; S.scan.position.y = .42; B.add(S.scan);
    lab(S, '<b>集成电路</b>晶体管与导线一次刻在同一块硅片上', V(-2.2, .5, 2.2), 13.4, 19.2);
    lab(S, '缓存', V(-2.2, .3, -3.3), 15, 19.2); lab(S, '计算核心', V(2.2, .4, -2.2), 15.4, 19.2);
    /* Moore bars */
    const C = new THREE.Group(); S.group.add(C); S.C = C; C.position.set(0, -1, -30);
    const grid = new THREE.GridHelper(40, 40, 0x1b2a3a, 0x0f1824); C.add(grid);
    for (const [L, nm] of [[3, '千'], [6, '百万'], [9, '十亿']]) { const y = (L - 3) * 1.3 + .4; C.add(polyline([V(-9.5, y, -1), V(9.5, y, -1)], 0x7fa8d0, .22)); lab(S, nm, V(-9.6, y + C.position.y, C.position.z - 1), 20.2, 29.8, 'left'); }
    S.bars = MOORE.map((m, i) => {
      const x = (i - 3) * 2.6, H = mooreH(m[2]);
      const geo = new THREE.BoxGeometry(1.25, 1, 1.25); geo.translate(0, .5, 0);
      const mat = new THREE.ShaderMaterial({ uniforms: { uC: { value: hdr(i === 6 ? 0xc6f4ff : CYAN, 1) }, uH: { value: 1 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 uC;varying float vY;void main(){gl_FragColor=vec4(uC*(.06+.9*pow(vY,3.)),1.);}' });
      const mesh = new THREE.Mesh(geo, mat); mesh.position.x = x; C.add(mesh);
      const e = edges(new THREE.BoxGeometry(1.25, 1, 1.25).translate(0, .5, 0), CYAN, .7, 1.4); e.position.x = x; C.add(e);
      const cap = glow(0xd8f6ff, 1.6, 2.6); C.add(cap);
      const top = V(x, 0, 0);
      lab(S, `<b>${m[3]}</b>`, () => V(x, C.position.y + mesh.scale.y + .35, C.position.z), 20.8 + i * .8, 29.8, 'c');
      lab(S, `${m[0]} · ${m[1]}`, V(x, C.position.y - .05, C.position.z + .9), 20.2 + i * .8, 29.8, 'c');
      return { mesh, e, cap, H, top };
    });
    S.trend = flowLine(MOORE.map((m, i) => V((i - 3) * 2.6, mooreH(m[2]) + .02, 0)), { color: 0xffffff, dash: 5, speed: .6, base: .5, pulse: 2, head: 0 }); C.add(S.trend);
  },
  update(t, dt, ck) {
    const S = S5; S.A.visible = t < 10; S.B.visible = t >= 10 && t < 19.6; S.C.visible = t >= 19.6;
    if (S.A.visible) {
      const on = t > 1.6 ? (Math.floor((t - 1.6) / 1.8) % 2 === 0 ? ss(0, .3, (t - 1.6) % 1.8) : 1 - ss(0, .3, (t - 1.6) % 1.8)) : 0;
      S.gate.material.emissiveIntensity = on * .9; S.chan.material.opacity = on * .55;
      const a = S.elec.geometry.attributes.position.array;
      S.eSeed.forEach((e, i) => { const sx = -2.6 + (e[2] - .5) * 1.4, sy = -.45 + (e[0] - .5) * .6, mx = -2.8 + ((e[0] + ck * .45) % 1) * 5.6; a.set([lerp(sx + Math.sin(ck * 3 + i) * .05, mx, on), lerp(sy, -.1, on), e[1] * (on ? 1 : .9)], i * 3); });
      S.elec.geometry.attributes.position.needsUpdate = true;
      if (on > .5 !== S._on) { S._on = on > .5; if (playing && t > 1.6) AU.blip(S._on ? 1320 : 660, .1); }
    }
    if (S.B.visible) { S.scan.position.x = -4.6 + ((t - 10) * 2.2) % 9.2; S.B.rotation.y = (t - 10) * .03; }
    if (S.C.visible) {
      S.bars.forEach((b, i) => { const g = easeOut(ss(20.6 + i * .8, 21.9 + i * .8, t)); const h = Math.max(.001, b.H * g); b.mesh.scale.y = h; b.e.scale.y = h; b.cap.position.set(b.mesh.position.x, h, 0); b.cap.visible = g > .02; if (g > .02 && !b._p) { b._p = 1; if (playing) AU.chime(440 * Math.pow(2, i / 5), .1); } if (g < .01) b._p = 0; });
      S.trend.material.uniforms.uHead.value = ss(21, 27, t);
    }
  },
  cam(t) { return t < 10 ? S5.camA(t) : t < 19.6 ? S5.camB(t) : S5.camC(t); },
  camA: camPath([[0, [5.5, 4.2, 8.5], [0, -.2, 0], 40], [9.9, [-4.2, 1.8, 6.2], [0, -.2, 0], 40]]),
  camB: camPath([[10, [.8, .55, 1.6], [-.5, .2, -3], 50], [14.5, [3.2, 3.6, 6.5], [0, 0, 0], 44], [19.6, [0, 12.5, 9.5], [0, 0, 0], 42]]),
  camC: camPath([[19.6, [-10, 1.4, -18], [-4, 1.5, -30], 44], [24.5, [-3, 5, -14.5], [0, 3.5, -30], 46], [30, [5, 8, -12.5], [1.5, 5.2, -30], 48]])
});
