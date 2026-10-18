/* =====================================================================
   SCENES 6–12 : ARPANET · TCP/IP · cellular · fibre & subsea cables ·
                 World Wide Web · today · finale
   ===================================================================== */

/* ---------- 06 ARPANET ---------- */
const USM = b64bits(US_B64);
const mapXZ = (lat, lon, y = .06) => V((lon + 96) * .5, y, -(lat - 37) * .5);
const NODES = { UCLA: [34.07, -118.44], SRI: [37.45, -122.18], UCSB: [34.41, -119.85], UTAH: [40.76, -111.89], NCAR: [40.0, -105.27], TINK: [35.4, -97.4], ILL: [40.11, -88.23], CASE: [41.5, -81.61], CMU: [40.44, -79.94], DC: [38.9, -77.04], BBN: [42.39, -71.15] };
const S6 = Scene({
  id: 'arpa', name: '第一句话', dur: 28, era: '#ffcf6b', years: [[0, 1969]], bloom: { s: 1.15, r: .5, th: .6 },
  caps: [[2.4, 9.3, '1969 年 10 月 29 日晚，加州大学洛杉矶分校的一台计算机，准备向斯坦福研究所发送“LOGIN”。'], [9.8, 15.2, '只传出了“L”和“O”，系统就崩溃了。网络说出的第一句话，是“LO”。'], [16, 27.5, 'ARPANET 采用分组交换：数据被切成小包，各自寻路，到终点再重新拼合——一条线路断了，数据会绕道而行。']],
  build(S) {
    const G = S.group;
    // dot-matrix map of the continental US from a 0.25° land mask
    const pts = [], cols = []; const W = 236, H = 104;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const i = r * W + c; if ((USM[i >> 3] >> (7 - (i & 7))) & 1) { const lat = 50 - (r + .5) * .25, lon = -125 + (c + .5) * .25; const p = mapXZ(lat, lon, 0); pts.push(p.x, 0, p.z); const v = .35 + Math.random() * .3; cols.push(v, v, v * 1.1); } }
    S.map = mkPoints(new Float32Array(pts), { color: 0x9fb2d0, size: .1, cols: new Float32Array(cols), k: 1 }); G.add(S.map);
    S.np = {}; S.nodeG = {};
    for (const [k, v] of Object.entries(NODES)) { const p = mapXZ(v[0], v[1]); S.np[k] = p; const g = new THREE.Group(); g.position.copy(p); const gl = glow(0xffd88a, 1.1, 2.4); g.add(gl); const ring = new THREE.Mesh(new THREE.RingGeometry(.28, .33, 48), new THREE.MeshBasicMaterial({ color: hdr(0xffd88a, 1.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; g.add(ring); const pil = new THREE.Mesh(new THREE.PlaneGeometry(.05, 2.2), new THREE.MeshBasicMaterial({ color: hdr(0xffd88a, .9), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); pil.position.y = 1.1; g.add(pil); g.userData = { gl, ring }; g.scale.setScalar(.001); G.add(g); S.nodeG[k] = g; }
    S.appear = { UCLA: 3.2, SRI: 3.8, UCSB: 4.6, UTAH: 5.4, NCAR: 14, TINK: 14.3, ILL: 14.6, CASE: 14.9, CMU: 15.1, DC: 15.3, BBN: 15.5 };
    const L = [['UCLA', 'SRI', 3.9], ['UCLA', 'UCSB', 4.7], ['SRI', 'UCSB', 5.2], ['SRI', 'UTAH', 5.8], ['UTAH', 'NCAR', 14.2], ['NCAR', 'ILL', 14.6], ['UCLA', 'TINK', 14.4], ['TINK', 'ILL', 14.9], ['TINK', 'DC', 15.1], ['ILL', 'CASE', 15.2], ['ILL', 'CMU', 15.4], ['CASE', 'CMU', 15.5], ['CASE', 'BBN', 15.7], ['CMU', 'DC', 15.8], ['DC', 'BBN', 16]];
    S.links = {}; S.linkList = [];
    for (const [a, b, at] of L) { const A = S.np[a], B = S.np[b], len = A.distanceTo(B), cp = []; for (let i = 0; i <= 28; i++) { const f = i / 28; cp.push(A.clone().lerp(B, f).add(V(0, .05 + Math.sin(Math.PI * f) * len * .09, 0))); } const fl = flowLine(cp, { color: 0xffcf6b, dash: Math.max(1, len / 1.4), speed: .4, base: .45, pulse: 1.6, head: 0 }); G.add(fl); const o = { a, b, at, pts: cp, fl }; S.links[a + '-' + b] = o; S.linkList.push(o); }
    const R = [['UCLA', 'SRI', 'UTAH', 'NCAR', 'ILL', 'CASE', 'BBN'], ['UCLA', 'TINK', 'ILL', 'CMU', 'DC', 'BBN'], ['UCLA', 'TINK', 'ILL', 'CASE', 'BBN'], ['UCLA', 'SRI', 'UTAH', 'NCAR', 'ILL', 'CMU', 'DC', 'BBN'], ['UCLA', 'TINK', 'ILL', 'CASE', 'CMU', 'DC', 'BBN']];
    const seq = r => { const out = []; for (let i = 0; i < r.length - 1; i++) { const f = S.links[r[i] + '-' + r[i + 1]], g = S.links[r[i + 1] + '-' + r[i]]; const p = f ? f.pts : g.pts.slice().reverse(); out.push(...(i ? p.slice(1) : p)); } return new Path(out); };
    S.pk = R.map((r, i) => { const path = seq(r), grp = new THREE.Group(); grp.add(glow(0xfff0c8, .8, 3)); const num = textSprite(String(i + 1), 0xffffff, .55, 1.8); num.position.y = .5; grp.add(num); grp.visible = false; G.add(grp); return { path, grp, t0: 17.9 + [0, .35, .7, 1.05, 1.4][i], ord: i }; });
    S.pk.forEach(p => p.t1 = p.t0 + p.path.L / 7);
    S.events = [[12.9, () => { AU.glitch(); flash = .35; kick = 1.4; }], [16.8, () => AU.glitch()]];
    S.slot = n => S.np.BBN.clone().add(V(-1.6 + n * .8, 1.7, 0));
    S.letters = ['L', 'O', 'G'].map(c => { const s = textSprite(c, 0xfff1d0, .55, 2.4); s.visible = false; const g = glow(0xffd88a, 1.4, 2); s.add(g); g.scale.setScalar(1.2); G.add(s); return s; });
    S.loPath = new Path(S.links['UCLA-SRI'].pts);
    lab(S, '<b>UCLA</b>洛杉矶', S.np.UCLA, 3.4, 15.5, 'under'); lab(S, '<b>SRI</b>斯坦福研究所', S.np.SRI, 4, 15.5, 'left'); lab(S, '<b>UCSB</b>', S.np.UCSB.clone().add(V(0, 0, -.2)), 4.8, 9.5, 'left'); lab(S, '<b>犹他大学</b>', S.np.UTAH, 5.6, 15.5);
    S.loLbl = lab(S, '', S.np.SRI.clone().add(V(0, 1.6, 0)), 10.6, 16, 'c big');
    lab(S, '系统崩溃', S.np.SRI.clone().add(V(0, .2, 0)), 12.95, 15.4, 'warn');
    lab(S, '线路中断', S.np.TINK.clone().lerp(S.np.DC, .5).add(V(0, .9, 0)), 16.8, 24.5, 'warn');
    lab(S, '<b>BBN</b>剑桥（马萨诸塞州）', S.np.BBN, 16, 27.8, 'under');
    lab(S, '<b>按序号重组</b>到达顺序被打乱，也能还原', S.np.BBN.clone().add(V(-1.6, 2.4, 0)), 23.6, 27.8, 'left');
  },
  update(t, dt, ck) {
    const S = S6;
    for (const [k, g] of Object.entries(S.nodeG)) { const u = easeOut(ss(S.appear[k], S.appear[k] + .5, t)); g.scale.setScalar(Math.max(.001, u)); const crash = k === 'SRI' && t > 12.9 && t < 15.2; g.userData.gl.material.color.copy(hdr(crash ? 0xff4a4a : 0xffd88a, crash ? (Math.random() < .5 ? 3 : .6) : 2.4)); g.userData.ring.scale.setScalar(1 + ((ck * .8 + k.length * .1) % 1) * .8); g.userData.ring.material.opacity = 1 - ((ck * .8 + k.length * .1) % 1); }
    for (const o of S.linkList) { o.fl.material.uniforms.uHead.value = ss(o.at, o.at + .9, t); const br = o.a === 'TINK' && o.b === 'DC' && t > 16.8; o.fl.material.uniforms.uColor.value.copy(hdr(br ? 0xff4040 : 0xffcf6b, 1)); o.fl.material.uniforms.uOp.value = br ? (t < 17.6 ? (Math.random() < .5 ? 1 : .2) : .22) : 1; }
    // LO
    const lt = [[9.5, 10.7], [11.0, 12.2], [12.4, 13.6]];
    S.letters.forEach((s, i) => { const [a, b] = lt[i]; let u = (t - a) / (b - a); if (i === 2) u = Math.min(u, .42); s.visible = t > a && (i < 2 ? t < b + .15 : t < 13.4); if (s.visible) { S.loPath.at(clamp(u, 0, 1), s.position); s.position.y += .45; if (i === 2 && t > 12.9) s.material.opacity = Math.random() < .5 ? 1 : .1; } });
    S.loLbl.set(t > 12.2 ? 'LO' : 'L');
    if (t > 10.7 && !S._l1) { S._l1 = 1; if (playing) AU.beep(980, .09, .25); } if (t < 10) S._l1 = 0;
    if (t > 12.2 && !S._l2) { S._l2 = 1; if (playing) AU.beep(980, .09, .25); } if (t < 11.5) S._l2 = 0;
    // packets
    const arr = S.pk.filter(p => t > p.t1).sort((a, b) => a.t1 - b.t1);
    S.pk.forEach(p => {
      p.grp.visible = t > p.t0 && t < 27.9;
      if (!p.grp.visible) return;
      if (t < p.t1) p.path.at((t - p.t0) / (p.t1 - p.t0), p.grp.position);
      else { const s = S.slot(p.ord), u = easeOut(ss(p.t1, p.t1 + .6, t)); p.grp.position.copy(S.np.BBN).lerp(s, u); if (!p._a) { p._a = 1; if (playing) AU.blip(1000 + p.ord * 160, .12); } }
      if (t < p.t1) p._a = 0;
    });
  },
  cam: camPath([[0, [-3, 26, 25], [-2, 0, 0], 42], [4, [-9.5, 9, 10.5], [-10.8, 0, .2], 42], [9, [-11.5, 4.6, 6.8], [-12, 0, .5], 40], [13.5, [-12.6, 4.2, 6], [-12.3, .4, .3], 40], [17, [-3, 15.5, 16.5], [-1.5, 0, 0], 44], [22.5, [4, 13, 13], [4, 0, -1], 44], [28, [11.5, 5.2, 6.8], [11.6, .8, -2.2], 42]])
});

/* ---------- 07 TCP/IP ---------- */
const LAYERS = [['应用层', 'HTTP · 你要的内容', VIOLET, 4.2], ['传输层', 'TCP · 端口 / 序号 / 重传', CYAN, 2.8], ['网络层', 'IP · 源地址 / 目的地址', AMBER, 1.4], ['链路层', '以太网 / Wi-Fi · 帧', CORAL, 0]];
const S7 = Scene({
  id: 'tcp', name: '通用语言', dur: 27, era: '#8fb4ff', years: [[0, 1974], [18.4, 1974], [19.8, 1983]], bloom: { s: 1.1, r: .5, th: .62 },
  caps: [[1.3, 8.4, '1974 年，瑟夫和卡恩提出 TCP/IP：一套让任何网络都能与任何网络对话的通用语言。'], [9, 17.8, '数据每往下走一层，就套上一层“信封”：端口、地址、帧头。路由器只拆到地址这一层，查表、转发。'], [18.4, 26.4, '1983 年 1 月 1 日，ARPANET 全面切换到 TCP/IP。很多人把这一天，称作互联网的生日。']],
  build(S) {
    const G = S.group;
    const stack = (x, n, w) => LAYERS.slice(4 - n).forEach(([nm, , col, y]) => { const geo = new THREE.BoxGeometry(w, .12, 2.6); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: .1, metalness: .2, roughness: .3, depthWrite: false })); m.position.set(x, y, 0); G.add(m); const e = edges(geo, col, .9, 1.3); e.position.copy(m.position); G.add(e); });
    stack(-8, 4, 3.4); stack(8, 4, 3.4); stack(0, 2, 2.6);
    LAYERS.forEach(([nm, sub, , y]) => lab(S, `<b>${nm}</b>${sub}`, V(-9.9, y, 0), 2 + (4.2 - y) * .3, 18.4, 'left'));
    const dev = new THREE.MeshStandardMaterial({ color: 0x151a24, metalness: .7, roughness: .35 });
    for (const x of [-8, 8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, .5, 1.6), dev); b.position.set(x, -1.75, 0); G.add(b); const be = edges(b.geometry, 0x8fb4ff, .5, 1); be.position.copy(b.position); G.add(be); }
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .5, 6), dev); rt.position.set(0, -1.75, 0); G.add(rt); const re = edges(rt.geometry, 0x8fb4ff, .7, 1.2); re.position.copy(rt.position); G.add(re);
    G.add(flowLine([V(-8, -1.3, 0), V(8, -1.3, 0)], { color: 0x8fb4ff, dash: 12, speed: .5, base: .35, pulse: 1.2 }));
    lab(S, '<b>主机 A</b>你的电脑', V(-8, -2.1, .8), 2, 26.5, 'under'); lab(S, '<b>主机 B</b>服务器', V(8, -2.1, .8), 2, 26.5, 'under'); lab(S, '<b>路由器</b>', V(0, -2.1, 1.1), 2, 26.5, 'under');
    S.P = [[3, -8, 4.2], [4.4, -8, 2.8], [5.8, -8, 1.4], [7.2, -8, 0], [8, -8, -1.3], [10, 0, -1.3], [10.6, 0, 0], [11.3, 0, 1.4], [11.9, 0, 1.4], [12.5, 0, 0], [13, 0, -1.3], [15, 8, -1.3], [15.6, 8, 0], [16.4, 8, 1.4], [17.2, 8, 2.8], [18, 8, 4.2]];
    S.SH = [[[4.4, 17.2]], [[5.8, 16.4]], [[7.2, 10.6], [12.5, 15.6]]];
    const mkPacket = () => {
      const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.BoxGeometry(.46, .46, .46), new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 2.2) })); g.add(core); g.add(glow(0xe8e0ff, 1.4, 1.2));
      const shells = [.8, 1.12, 1.44].map((s, i) => { const col = [CYAN, AMBER, CORAL][i]; const geo = new THREE.BoxGeometry(s, s, s); const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hdr(col, .35), transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); const e = edges(geo, col, 1, 2.2); const sg = new THREE.Group(); sg.add(fill, e); g.add(sg); return { sg, fill, e }; });
      G.add(g); return { g, shells };
    };
    S.main = mkPacket(); S.pool = Array.from({ length: 9 }, mkPacket);
    lab(S, 'GET /index.html', () => S.main.g.position.clone().add(V(0, .75, 0)), 3, 4.5, 'c');
    lab(S, '<b>+ TCP 头</b>端口 · 序号', () => S.main.g.position.clone().add(V(.6, .2, 0)), 4.5, 6.6);
    lab(S, '<b>+ IP 头</b>源地址 · 目的地址', () => S.main.g.position.clone().add(V(.75, .2, 0)), 5.9, 8);
    lab(S, '<b>+ 帧头</b>MAC 地址 · 校验', () => S.main.g.position.clone().add(V(.9, .2, 0)), 7.3, 9.6);
    lab(S, '<b>只读到 IP 层</b>查路由表 → 转发', V(1.4, 1.6, 0), 10.8, 13);
    lab(S, '<b>逐层拆封</b>交给应用', V(9.4, 3.4, 0), 15.6, 18.2);
    S.events = [4.4, 5.8, 7.2, 11.3, 12.5, 15.6, 16.4, 17.2, 18].map((x, i) => [x, () => AU.blip(700 + i * 90, .1)]);
  },
  pose(tt, out) {
    const P = S7.P; if (tt <= P[0][0]) return out.set(P[0][1], P[0][2], 0); let i = 0; while (i < P.length - 2 && tt > P[i + 1][0]) i++;
    const a = P[i], b = P[i + 1], u = easeIO(clamp((tt - a[0]) / (b[0] - a[0]), 0, 1)); return out.set(lerp(a[1], b[1], u), lerp(a[2], b[2], u), 0);
  },
  setShells(pk, tt) {
    pk.shells.forEach((s, i) => { let v = 0, sc = 1; for (const [on, off] of S7.SH[i]) { if (tt >= on - .01 && tt < off + .45) { const a = ss(on, on + .35, tt), d = 1 - ss(off, off + .45, tt); v = Math.max(v, a * d); sc = tt < off ? 1 + (1 - a) * 1.1 : 1 + (1 - d) * .8; } } s.sg.visible = v > .01; s.sg.scale.setScalar(sc); s.fill.material.opacity = .25 * v; s.e.material.opacity = v; });
  },
  update(t) {
    const S = S7; const m = S.main;
    m.g.visible = t > 3 && t < 18.5; if (m.g.visible) { S.pose(t, m.g.position); S.setShells(m, t); m.g.rotation.y = t * .4; m.g.scale.setScalar(t < 3.4 ? easeOut((t - 3) / .4) : t > 18 ? 1 + (t - 18) * 3 : 1); }
    const ip = m.shells[1].e.material; ip.color.copy(hdr(AMBER, t > 11.3 && t < 11.9 ? 5 : 2.2));
    S.pool.forEach((p, k) => { const tt = 3 + ((t - 18.6) * 3.2 - k * 1.65); p.g.visible = t > 18.6 && tt > 3 && tt < 18; if (p.g.visible) { S.pose(tt, p.g.position); S.setShells(p, tt); p.g.rotation.y = tt * .4; } });
  },
  cam: camPath([[0, [-2, 7, 22], [0, 1.5, 0], 42], [3, [-12, 5.5, 10.5], [-8, 2.4, 0], 40], [8, [-8, 2.4, 10], [-5.5, .6, 0], 40], [11.4, [-.5, 3.6, 9.5], [0, .6, 0], 40], [15.5, [5.5, 3.4, 10], [7, 1.4, 0], 40], [18.6, [10, 5, 10.5], [7, 2.6, 0], 42], [27, [0, 9, 25], [0, 1.4, 0], 44]])
});

/* ---------- 08 cellular 1G → 5G ---------- */
const GENS = [['1G', '1979', '模拟语音', 0, 7, 0xffb35c], ['2G', '1991', '14.4 kbps', 14400, 5, 0xff7b8a], ['3G', '2001', '2 Mbps', 2e6, 3.5, 0xc7a2ff], ['4G', '2009', '1 Gbps', 1e9, 2.3, 0x7fe0ff], ['5G', '2019', '20 Gbps', 2e10, 1.3, 0xe0f8ff]];
function hexOf(x, z, cell) { const u = x / cell, v = z / cell, sy = 1.7320508; const ax = Math.floor(u) + .5, ay = Math.floor(v / sy) + .5, bx = Math.floor(u - .5) + .5, by = Math.floor((v - 1) / sy) + .5; const h1 = [u - ax, v - ay * sy], h2 = [u - (bx + .5), v - (by + .5) * sy]; return h1[0] ** 2 + h1[1] ** 2 < h2[0] ** 2 + h2[1] ** 2 ? { id: [ax, ay], c: [ax * cell, ay * sy * cell] } : { id: [bx + .5, by + .5], c: [(bx + .5) * cell, (by + .5) * sy * cell] }; }
const S8 = Scene({
  id: 'cell', name: '蜂窝', dur: 27, era: '#c7a2ff', years: [[0, 1979], [17.8, 1979], [22.4, 2019]], bloom: { s: 1.2, r: .55, th: .6 },
  caps: [[1.3, 8.6, '1979 年，第一代蜂窝网络在东京开通。城市被切成一个个“蜂窝”小区，同一段频率可以在不同小区反复使用。'], [9.2, 17.2, '手机穿过小区边界时，通话被无缝交给下一座基站。每一代新技术，都把小区切得更密、把频谱用得更巧。'], [17.8, 26.4, '从 2G 的每秒十几千比特，到 5G 峰值 20 Gbps——四十年间，无线速率提升了上百万倍。']],
  stats: [{ t0: 22.4, t1: 26.6, unit: '万倍', label: '峰值速率 · 2G → 5G', fmt: p => fmtInt(140 * p) }],
  build(S) {
    const G = S.group;
    S.ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCell: { value: 7 }, uC: { value: hdr(0xffb35c, 1) }, uPh: { value: new THREE.Vector2(99, 99) } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uTime,uCell;uniform vec3 uC;uniform vec2 uPh;varying vec3 vW;
      const vec2 s=vec2(1.,1.7320508);
      float hd(vec2 p){p=abs(p);return max(dot(p,s*.5),p.x);}
      float h21(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5);}
      void main(){vec2 uv=vW.xz/uCell;vec4 hC=floor(vec4(uv,uv-vec2(.5,1.))/s.xyxy)+.5;vec4 h=vec4(uv-hC.xy*s,uv-(hC.zw+.5)*s);
      vec4 H=dot(h.xy,h.xy)<dot(h.zw,h.zw)?vec4(h.xy,hC.xy):vec4(h.zw,hC.zw+.5);
      float d=hd(H.xy),r=length(H.xy),rnd=h21(H.zw);
      float edge=smoothstep(.455,.5,d);
      float w=fract(r*2.6-uTime*.55-rnd);float ring=smoothstep(.1,0.,w)*(1.-smoothstep(.15,.5,r));
      float tower=smoothstep(.07,.0,r);
      float me=step(distance(H.zw,uPh),.01);
      float fall=1.-smoothstep(14.,34.,length(vW.xz));
      vec3 col=uC*(edge*.9+ring*.5+tower*3.+me*(.18+ring*1.2)+.02)*fall;
      gl_FragColor=vec4(col,1.);}`
    })); S.ground.rotation.x = -Math.PI / 2; TIMED.push(S.ground.material); G.add(S.ground);
    const r = rng(21), N = 34, mats = [], dummy = new THREE.Object3D(); let n = 0;
    const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x04060a, metalness: .85, roughness: .5, envMapIntensity: .22 }), N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = (i - N / 2 + .5) * 1.3, z = (j - N / 2 + .5) * 1.3; if (i % 6 === 0 || j % 6 === 0 || r() < .12 || (z > 5 && Math.abs(x) < 9.5)) continue; const d = Math.hypot(x, z); const h = .15 + 1.9 * Math.exp(-((d / 10) ** 2)) * (.3 + r()) + Math.pow(r(), 6) * .9; dummy.position.set(x, h / 2, z); dummy.scale.set(.8 + r() * .25, h, .8 + r() * .25); dummy.updateMatrix(); city.setMatrixAt(n++, dummy.matrix); }
    city.count = n; G.add(city);
    S.phone = glow(0xffffff, .9, 3); G.add(S.phone);
    S.tower = glow(0xffffff, 1.2, 2.4); G.add(S.tower);
    S.beam = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), lineMat(0xffffff, .9, 2.4)); S.beam.frustumCulled = false; G.add(S.beam);
    S.pa = V(-15, .35, -2.6); S.pb = V(15, .35, 4.2);
    S.hand = lab(S, '<b>切换基站</b>', () => S.phone.position.clone().add(V(0, .6, 0)), 0, 0);
    lab(S, '<b>手机</b>', () => S.phone.position, 2.2, 7.5, 'under');
    lab(S, '<b>基站</b>', () => S.tower.position, 3, 8.4);
    S.bars = GENS.map((g, i) => {
      const x = (i - 2) * 3, H = g[3] ? (Math.log10(g[3]) - 3) * .95 : .35, geo = new THREE.BoxGeometry(1.5, 1, .6).translate(0, .5, 0);
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uC: { value: hdr(g[5], 1) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 uC;varying float vY;void main(){gl_FragColor=vec4(uC*(.08+.9*vY*vY),1.);}' }));
      const e = edges(geo, g[5], .8, 1.5); const grp = new THREE.Group(); grp.add(m, e); grp.position.set(x, 0, 9); grp.scale.y = .001; G.add(grp);
      const cap = glow(g[5], 1.4, 2.6); cap.visible = false; G.add(cap);
      lab(S, `<b>${g[2]}</b>`, () => V(x, grp.scale.y + .45, 9), 18 + i * 1.1, 26.6, 'c');
      lab(S, `${g[0]} · ${g[1]}`, V(x, -.35, 9.6), 17.8 + i * 1.1, 26.6, 'c');
      return { grp, H, cap, x };
    });
  },
  update(t, dt, ck) {
    const S = S8;
    const gi = clamp((t - 17.8) / 1.1, 0, 4.6), lo = Math.floor(Math.min(gi, 4)), hi = Math.min(4, lo + 1), f = ss(0, 1, gi - lo);
    const cell = lerp(GENS[lo][4], GENS[hi][4], f); S.ground.material.uniforms.uCell.value = cell; S.ground.material.uniforms.uC.value.copy(new THREE.Color(GENS[lo][5]).lerp(new THREE.Color(GENS[hi][5]), f)).multiplyScalar(1.1);
    const pp = S.pa.clone().lerp(S.pb, clamp((t - .5) / 17, 0, 1)); S.phone.position.copy(pp);
    const h = hexOf(pp.x, pp.z, cell); S.ground.material.uniforms.uPh.value.set(h.id[0], h.id[1]);
    S.tower.position.set(h.c[0], 2.6, h.c[1]);
    const a = S.beam.geometry.attributes.position.array; a.set([pp.x, pp.y, pp.z, h.c[0], 2.6, h.c[1]]); S.beam.geometry.attributes.position.needsUpdate = true;
    S.beam.material.opacity = .5 + .5 * Math.sin(ck * 20) ** 2;
    const key = h.id.join(','); if (key !== S._id) { if (S._id && t > 1 && t < 17.8) { S.hand.t0 = t; S.hand.t1 = t + 1.2; if (playing) AU.blip(1500, .1); } S._id = key; }
    S.bars.forEach((b, i) => { const g = easeOut(ss(17.8 + i * 1.1, 18.9 + i * 1.1, t)); b.grp.scale.y = Math.max(.001, g * b.H); b.grp.visible = g > .005; b.cap.visible = g > .02; b.cap.position.set(b.x, b.grp.scale.y, 9); if (g > .02 && !b._p) { b._p = 1; if (playing) AU.chime(330 * Math.pow(2, i / 4), .1); } if (g < .01) b._p = 0; });
  },
  cam: camPath([[0, [0, 32, 24], [0, 0, 0], 42], [6, [9, 20, 16], [0, 0, 0], 42], [12, [-8, 18, 15], [0, 0, 1], 42], [17.8, [0, 5, 22], [0, 2.4, 8], 44], [27, [3, 7.4, 24], [0, 3.4, 8], 44]])
});

/* ---------- 09 fibre & subsea cables ---------- */
const ROUTES = [
  [[36.85, -75.98], [38, -60], [42, -35], [44.5, -12], [43.4, -3.0]],
  [[25.8, -80.1], [24, -74], [15, -58], [3, -42], [-3.7, -38.5]],
  [[-3.7, -38.5], [5, -30], [20, -24], [33, -14], [37.95, -8.87]],
  [[-3.7, -38.5], [-6, -25], [-8, 0], [-8.8, 13.2]],
  [[33.7, -118.3], [28, -140], [21.3, -157.9], [24, 175], [30, 150], [35, 139.8]],
  [[45.5, -124], [48, -150], [47, -175], [42, 160], [35.5, 140.5]],
  [[45.5, -124], [44, -150], [40, -175], [35, 160], [31, 135], [30.5, 130.5], [31.2, 121.9]],
  [[43.3, 5.4], [37.5, 11], [34, 20], [31.2, 29.9]],
  [[29.9, 32.6], [27.5, 34], [20, 38.5], [12.6, 43.4], [12.2, 50], [18, 60], [19, 72.8]],
  [[19, 72.8], [12, 72], [6, 76], [5.5, 80], [5, 90], [6, 95], [4, 99], [2.5, 101.5], [1.3, 103.8]],
  [[1.3, 103.8], [6, 108], [13, 112], [22.3, 114.2]],
  [[22.3, 114.2], [21, 119], [25, 123], [30, 128], [31.5, 134], [33.5, 138], [35, 139.8]],
  [[1.3, 103.8], [-3, 106], [-6.2, 105.5], [-9, 106], [-20, 111], [-31.95, 115.8]],
  [[-33.9, 151.2], [-28, 165], [-18, 178], [0, -172], [21.3, -157.9]],
  [[21.3, -157.9], [30, -135], [37.8, -122.5]],
  [[-33.9, 151.2], [-20, 152], [-5, 149], [13.4, 144.8], [25, 141], [34, 139.8]],
  [[38.7, -9.2], [28, -17], [14.7, -17.5], [4, -10], [4.5, 0], [6.4, 3.4], [-5, 8], [-8.8, 13.2], [-22, 11], [-33.9, 18.4]],
  [[-33.9, 18.4], [-36, 25], [-30, 33], [-25.9, 32.8], [-16, 41], [-4, 39.7], [3, 47], [11, 52.5], [12, 46], [11.6, 43.2]],
  [[25.8, -80.1], [22, -76], [18.4, -66]],
  [[25.8, -80.1], [23, -84], [16, -82], [9.4, -79.9]],
  [[8.9, -79.6], [2, -81.5], [-12, -77.2], [-33, -71.7]],
  [[50.8, -4.55], [48, -8], [43.4, -9.6], [38.7, -9.2]],
  [[1.3, 103.8], [6, 95], [10, 88], [13, 80.3]],
  [[51.5, 1.5], [53.5, 3], [55.7, 8.1]]
];
const TAT8 = [[39.6, -74.3], [42, -55], [47, -30], [50.4, -10], [50.78, -4.55]];
const CABLES = (() => {
  const g = new THREE.Group(), lines = [], ends = [];
  ROUTES.forEach((r, i) => { const l = flowLine(seaRoute(r), { color: CYAN, dash: Math.max(2, r.length * 2.5), speed: .25, base: .35, pulse: 2, head: 0 }); l.userData.d = i * .12; g.add(l); lines.push(l); for (const p of [r[0], r[r.length - 1]]) { const s = glow(0xbff2ff, .32, 2); s.position.copy(ll(p[0], p[1], 10.06)); g.add(s); ends.push(s); } });
  return { g, lines, ends };
})();
const S9 = Scene({
  id: 'fiber', name: '海底之光', dur: 28, era: '#7fe0ff', years: [[0, 1988], [13.6, 1988], [20.4, 2026]], drone: 'wind', bloom: { s: 1.25, r: .6, th: .58 },
  caps: [[1.3, 6.9, '光纤把信号变成光脉冲。光在纤芯与包层的交界处不断全反射，几乎毫无损耗地奔向远方。'], [7.4, 12.2, '再让上百种波长的光挤进同一根纤芯，容量便成百倍地增长。'], [13.6, 20.4, '1988 年，第一条跨大西洋光缆 TAT-8 投入使用。如今，600 多条海底光缆铺满洋底。'], [21, 27.5, '你发出的跨洋数据，绝大多数不经过卫星，而是沿着这些埋在海底的玻璃丝，以光速穿行。']],
  stats: [{ t0: 15.4, t1: 21, unit: '条', label: '在役海底光缆系统 · TeleGeography 2026', fmt: p => fmtInt(607 * p) }, { t0: 21.6, t1: 27.6, unit: '万倍', label: '单缆容量 · TAT-8（280 Mb/s）→ 今日跨大西洋光缆', fmt: p => fmtInt(70 * p) }],
  cuts: [12.6],
  build(S) {
    const A = new THREE.Group(); S.group.add(A); S.A = A;
    const glass = (k, col) => new THREE.ShaderMaterial({ uniforms: { uC: { value: hdr(col, k) } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: 'varying vec3 vN,vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}', fragmentShader: 'uniform vec3 uC;varying vec3 vN,vV;void main(){float f=pow(1.-abs(dot(vN,vV)),3.5);gl_FragColor=vec4(uC*(.05+f*1.4),1.);}' });
    const cyl = (r, mat, ts = 0, tl = Math.PI * 2) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 44, 72, 1, true, ts, tl), mat); m.rotation.z = Math.PI / 2; A.add(m); return m; };
    cyl(.5, glass(.11, 0x7fe0ff)); cyl(1.15, glass(.05, 0x8fb4ff)); cyl(1.45, new THREE.MeshStandardMaterial({ color: 0x080a0f, metalness: .2, roughness: .8, envMapIntensity: .15, side: THREE.DoubleSide }), Math.PI / 2, Math.PI);
    for (const x of [-12, -4, 4, 12]) { for (const [r, c] of [[.5, CYAN], [1.15, 0x8fb4ff]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 96), new THREE.MeshBasicMaterial({ color: hdr(c, 1.2), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.y = Math.PI / 2; ring.position.x = x; A.add(ring); } }
    const tri = x => 2 * Math.abs(2 * (x - Math.floor(x + .5))) - 1;
    S.rays = [[0xffffff, 2.6, 0, 0], [0xff6a6a, 2.1, .7, .5], [0xffb35c, 2.3, 1.3, 1.1], [0x7fe0ff, 2.8, 2.1, 1.7], [0xa58bff, 2.4, 2.6, 2.3]].map(([col, per, ph, rot], i) => {
      const pts = []; for (let k = 0; k <= 900; k++) { const x = -22 + k * 44 / 900, y = .47 * tri(x / per + ph); pts.push(V(x, y * Math.cos(rot), y * Math.sin(rot))); }
      const l = flowLine(pts, { color: col, dash: 16, speed: .32, base: i ? .25 : .5, pulse: 2.6, sharp: 14 }); A.add(l);
      const gl = []; for (let x = -22; x < 22; x += per / 2) { const xv = (Math.round((x / per + ph) * 2) / 2 - ph) * per; const y = .47 * tri(xv / per + ph); const s = glow(col, .35, 1.6); s.position.set(xv, y * Math.cos(rot), y * Math.sin(rot)); A.add(s); gl.push(s); }
      return { l, gl, i };
    });
    lab(S, '<b>纤芯</b>折射率较高 · 直径约 9 微米', V(-3.2, -.15, .35), 2, 7.2, 'under');
    lab(S, '<b>包层</b>折射率较低', V(-6.5, 1.05, .25), 2.6, 7.2);
    lab(S, '全反射', V(0, .47, 0), 3.4, 7.2);
    lab(S, '<b>波分复用</b>不同波长共用一根纤芯', V(2.5, .9, .3), 8, 12.2);
    S.B = new THREE.Group(); S.group.add(S.B);
    S.tat = flowLine(seaRoute(TAT8, 10.07), { color: 0xffffff, dash: 10, speed: .4, base: .8, pulse: 2.5, head: 0 }); S.B.add(S.tat);
    lab(S, '<b>TAT-8 · 1988</b>首条跨大西洋光缆 · 280 Mb/s', ll(47, -30, 10.1), 14.6, 20.4);
  },
  enter() { S9.B.add(GLOBE.group, CABLES.g); GLOBE.style(0x8fb8d8, 0x2aa0ff, 0x2a8cff, 1); GLOBE.grat.visible = false; CABLES.lines.forEach(l => l.material.uniforms.uOp.value = 1); scene.fog = new THREE.Fog(0x03050a, 6, 26); },
  exit() { scene.fog = null; },
  update(t, dt, ck) {
    const S = S9, a = t < 12.6; S.A.visible = a; S.B.visible = !a;
    if (scene.fog) { scene.fog.near = a ? 6 : 400; scene.fog.far = a ? 26 : 900; }
    if (a) S.rays.forEach(r => { const on = r.i === 0 ? 1 : ss(7.4 + r.i * .3, 8 + r.i * .3, t); r.l.material.uniforms.uOp.value = on; r.gl.forEach((g, k) => g.material.opacity = on * (.4 + .6 * Math.sin(ck * 3 + k) ** 2)); });
    else { CABLES.lines.forEach(l => l.material.uniforms.uHead.value = ss(13 + l.userData.d * .5, 15.5 + l.userData.d * .5, t)); S.tat.material.uniforms.uHead.value = ss(13.4, 15.4, t); S.tat.material.uniforms.uOp.value = 1 - ss(20, 21.5, t) * .6; }
  },
  cam(t) { return t < 12.6 ? S9.camA(t) : S9.camB(t); },
  camA: camPath([[0, [-9, 1.3, 4.2], [-3, 0, 0], 40], [6.5, [-.5, .9, 3.2], [3, 0, 0], 40], [12.6, [4.5, 2.6, 7], [2, 0, 0], 42]]),
  camB: orbitPath([[12.6, 22, -50, 34], [17.5, 30, -28, 26], [22, 18, 30, 28], [28, 8, 95, 30]])
});

/* ---------- 10 World Wide Web ---------- */
const PAGES = ['World Wide Web', 'Hypertext Terms', 'Physics Data', 'Software Library', 'Phone Book', 'Library Catalog', 'Preprints', 'Image Gallery', 'Newsgroups', 'People', 'Projects', 'Weather', 'Mailing Lists', 'Help'];
const LINKW = ['hypertext', 'servers', 'physics', 'people', 'help', 'software', 'catalog', 'images', 'news', 'projects', 'data', 'weather'];
function pageTex(title, i) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 352; const g = c.getContext('2d'); const r = rng(100 + i);
  g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, 512, 352); g.fillStyle = '#d8d4cb'; g.fillRect(0, 0, 512, 22); g.fillStyle = '#8a857a'; g.font = '12px "JetBrains Mono", monospace'; g.fillText('http://info.cern.ch/' + title.toLowerCase().replace(/ /g, '-') + '.html', 10, 15);
  g.fillStyle = '#111'; g.font = 'bold 34px "Times New Roman", Times, serif'; g.fillText(title, 24, 66);
  const links = []; let y = 100;
  for (let ln = 0; ln < 9; ln++) {
    let x = 24; while (x < 470) { const w = 18 + r() * 60; const isL = r() < .14 && links.length < 4 && x + w < 470; if (isL) { const word = LINKW[Math.floor(r() * LINKW.length)]; g.font = '17px "Times New Roman", serif'; const tw = g.measureText(word).width; g.fillStyle = '#1a3cff'; g.fillText(word, x, y + 5); g.fillRect(x, y + 8, tw, 1.5); links.push([(x + tw / 2) / 512, (y) / 352]); x += tw + 10; } else { g.fillStyle = '#9a968c'; g.fillRect(x, y - 3, Math.min(w, 488 - x), 5); x += w + 7; } }
    y += 26;
  }
  if (!links.length) { g.fillStyle = '#1a3cff'; g.font = '17px "Times New Roman", serif'; g.fillText('home', 24, 330); g.fillRect(24, 333, 38, 1.5); links.push([43 / 512, 326 / 352]); }
  return { tex: new THREE.CanvasTexture(c), links };
}
const S10 = Scene({
  id: 'www', name: '万维网', dur: 25, era: '#9fb8ff', years: [[0, 1989], [16.4, 1989], [17.6, 1993], [24, 2026]], bloom: { s: 1.15, r: .6, th: .7 },
  caps: [[1.3, 8.2, '1989 年，蒂姆·伯纳斯-李在 CERN 提出一个设想：用超链接，把散落在各处的文档连成一张网。'], [8.7, 15.8, 'URL 负责定位，HTTP 负责传送，HTML 负责描述。点一下链接，就能跳到世界另一端的页面。'], [16.4, 24.4, '1993 年，CERN 宣布免费开放万维网技术。网站从寥寥几个起步，一路增长到今天的十亿量级。']],
  stats: [{ t0: 17.4, t1: 24.6, unit: '亿 +', label: '网站总数 · 从 1991 年的第一个网站算起', fmt: p => (10 * p).toFixed(p < 1 ? 1 : 0) }],
  build(S) {
    const G = S.group, r = rng(31); S.pages = [];
    PAGES.forEach((title, i) => {
      const { tex, links } = pageTex(title, i); tex.anisotropy = 8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ map: tex, color: hdr(0xffffff, .2), side: THREE.DoubleSide, transparent: true }));
      const p = i === 0 ? V(0, 0, 0) : V((r() - .5) * 22, (r() - .5) * 11, (r() - .5) * 16 - 3);
      m.position.copy(p); m.lookAt(p.clone().multiplyScalar(.2).add(V(0, 0, 30))); G.add(m); m.updateMatrixWorld();
      const lw = links.map(([u, v]) => V((u - .5) * 3.2, (.5 - v) * 2.2, .02).applyMatrix4(m.matrixWorld));
      const fr = edges(m.geometry, 0x9fb8ff, .0, 1.4); fr.position.copy(m.position); fr.quaternion.copy(m.quaternion); G.add(fr);
      S.pages.push({ m, lw, fr, n: V(0, 0, 1).applyQuaternion(m.quaternion) });
    });
    S.hops = [[0, 3, 1.6], [3, 7, 3.6], [7, 11, 5.6]];
    S.curves = [];
    const link = (a, b, li, at) => { const A = S.pages[a].lw[li % S.pages[a].lw.length], B = S.pages[b].m.position; const mid = A.clone().lerp(B, .5).add(V(0, 2 + A.distanceTo(B) * .12, 1.5)); const crv = new THREE.QuadraticBezierCurve3(A, mid, B); const fl = flowLine(crv.getPoints(80), { color: 0x9fb8ff, dash: 3, speed: .8, base: .5, pulse: 2.2, head: 0 }); G.add(fl); const sp = glow(0x9fb8ff, .7, 2.6); sp.position.copy(A); G.add(sp); S.curves.push({ fl, at, sp }); };
    S.hops.forEach(([a, b, at]) => link(a, b, 0, at));
    for (let k = 0; k < 20; k++) { const a = Math.floor(r() * 14), b = (a + 1 + Math.floor(r() * 13)) % 14; link(a, b, k, 8.4 + k * .3); }
    // the explosion of the web
    const NP = 9000, pos = new Float32Array(NP * 3), del = new Float32Array(NP), col = new Float32Array(NP * 3), hubs = [];
    for (let h = 0; h < 90; h++) { const d = V(r() - .5, (r() - .5) * .7, r() - .5).normalize().multiplyScalar(6 + Math.pow(r(), .6) * 46); hubs.push(d); }
    const seg = [];
    for (let i = 0; i < NP; i++) { const h = hubs[i % 90], s = 1 + r() * 4; const p = h.clone().add(V((r() - .5) * s, (r() - .5) * s, (r() - .5) * s)); pos.set([p.x, p.y, p.z], i * 3); del[i] = 15.2 + p.length() / 52 * 7.5; const k = r(); col.set([.6 + k * .4, .7 + k * .3, 1], i * 3); if (i % 3 === 0) seg.push(p, h); }
    for (let k = 0; k < 160; k++) { seg.push(hubs[Math.floor(r() * 90)], hubs[Math.floor(r() * 90)]); }
    S.cloud = mkPoints(pos, { color: 0xc8d6ff, size: .14, cols: col, delays: del, k: 1.6, flicker: .25 }); G.add(S.cloud);
    const sg = new THREE.BufferGeometry().setFromPoints(seg); const sd = new Float32Array(seg.length); for (let i = 0; i < seg.length; i++) sd[i] = 15.2 + seg[i].length() / 52 * 7.5;
    sg.setAttribute('aD', new THREE.BufferAttribute(sd, 1));
    S.webl = new THREE.LineSegments(sg, new THREE.ShaderMaterial({ uniforms: { uR: { value: 0 }, uC: { value: hdr(0x9fb8ff, .5) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexShader: 'attribute float aD;uniform float uR;varying float vA;void main(){vA=smoothstep(aD,aD+.8,uR);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 uC;varying float vA;void main(){gl_FragColor=vec4(uC*vA*.5,1.);}' }));
    S.webl.frustumCulled = false; G.add(S.webl);
    lab(S, '<b>URL</b>它在哪里', S.pages[0].m.position.clone().add(V(-1.6, 1.1, 0)), 9, 15.6, 'left');
    lab(S, '<b>HTTP</b>怎么取回来', S.pages[3].m.position.clone().add(V(1.6, 1.1, 0)), 9.6, 15.6);
    lab(S, '<b>HTML</b>长什么样', S.pages[7].m.position.clone().add(V(1.6, -1.1, 0)), 10.2, 15.6, 'under');
    lab(S, '点击超链接', () => S.curves[0].sp.position, 1.6, 3.4);
  },
  update(t, dt, ck) {
    const S = S10;
    const lit = [0, 3, 7, 11].map((p, k) => k === 0 ? 0 : S.hops[k - 1][2] + .7);
    S.pages.forEach((p, i) => { const li = [0, 3, 7, 11].indexOf(i); const on = li >= 0 ? ss(lit[li], lit[li] + .5, t) : ss(8.2 + i * .12, 9 + i * .12, t); p.m.material.color.copy(hdr(0xffffff, .12 + .55 * on)); p.fr.material.opacity = on * .8; p.m.scale.setScalar(.92 + .08 * on); });
    S.curves.forEach(c => { const u = ss(c.at, c.at + .7, t); c.fl.material.uniforms.uHead.value = u; c.sp.visible = t > c.at - .4 && t < c.at + 1.1; c.sp.scale.setScalar(.5 + Math.sin(ck * 10) ** 2 * .6); });
    S.cloud.material.uniforms.uReveal.value = t; S.webl.material.uniforms.uR.value = t;
    S.group.rotation.y = Math.max(0, t - 15) * .035;
  },
  cam(t) {
    const S = S10; if (!S._k) { const P = S.pages, f = i => P[i].m.position.clone().addScaledVector(P[i].n, 4.6).add(V(.6, .4, 0)).toArray(), c = i => P[i].m.position.toArray(); S._k = camPath([[0, f(0), c(0), 40], [2.2, f(0), c(0), 40], [3.3, f(3), c(3), 40], [5.3, f(7), c(7), 40], [7.3, f(11), c(11), 40], [9, [4, 3, 18], [0, 0, -3], 46], [15.4, [0, 4, 24], [0, 0, -3], 46], [25, [0, 16, 72], [0, 0, 0], 48]]); }
    return S._k(t);
  }
});

/* ---------- 11 today ---------- */
const CITIES = [[40.7, -74], [37.8, -122.4], [34, -118.2], [41.9, -87.6], [19.4, -99.1], [-23.5, -46.6], [-34.6, -58.4], [51.5, -.1], [48.9, 2.35], [50.1, 8.7], [55.8, 37.6], [30, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28], [25.2, 55.3], [19.1, 72.9], [28.6, 77.2], [1.35, 103.8], [39.9, 116.4], [31.2, 121.5], [22.5, 114.1], [37.6, 127], [35.7, 139.7], [-33.9, 151.2], [-6.2, 106.8], [41, 29], [-12, -77], [4.7, -74.1], [43.7, -79.4]];
const S11 = Scene({
  id: 'today', name: '今天', dur: 27, era: '#ffd9a8', years: [[0, 2026]], drone: 'wind', bloom: { s: 1.3, r: .65, th: .55 },
  caps: [[1.3, 8.4, '今天，约 60 亿人连在同一张网上——差不多是世界人口的四分之三。'], [9, 15.8, '近地轨道上，上万颗卫星组成星座，把信号送到海洋、沙漠与山区。'], [16.4, 26.2, '而仍有约 22 亿人尚未接入。这场跨越一百六十年的接力，还没有跑完。']],
  stats: [{ t0: 2.4, t1: 8.6, unit: '亿人在线', label: '约占世界人口 3/4 · ITU 2025', fmt: p => fmtInt(60 * p) }, { t0: 9.4, t1: 16, unit: '颗', label: '在轨工作的卫星 · 2026 年 10 月', fmt: p => fmtInt(16800 * p) }, { t0: 17.2, t1: 26.4, unit: '亿人', label: '仍未接入互联网 · ITU 2025', fmt: p => fmtInt(22 * p) }],
  build(S) {
    const G = S.group, r = rng(41);
    S.arcs = [];
    for (let k = 0; k < 46; k++) { const a = CITIES[Math.floor(r() * CITIES.length)], b = CITIES[Math.floor(r() * CITIES.length)]; if (a === b) continue; const ang = ll(a[0], a[1], 1).angleTo(ll(b[0], b[1], 1)); const col = [0x7fe0ff, 0xffc796, 0xc7a2ff][k % 3]; const l = flowLine(gcArc(a, b, 10.05, .4 + ang * 2.2, 90), { color: col, dash: 1 + Math.floor(r() * 2), speed: .25 + r() * .4, base: .12, pulse: 3, sharp: 30, head: 0 }); l.userData.at = 1 + r() * 6; G.add(l); S.arcs.push(l); }
    for (const c of CITIES) { const g = glow(0xffe2b8, .7, 2.2); g.position.copy(ll(c[0], c[1], 10.08)); G.add(g); }
    const NS = 5200, orb = new Float32Array(NS * 4), pz = new Float32Array(NS * 3);
    const shells = [[53, 72, 22, 10.75], [43, 28, 30, 10.68], [70, 36, 20, 10.82], [97.6, 24, 24, 10.9]];
    let n = 0; for (const [inc, planes, per, R] of shells) { for (let p = 0; p < planes && n < NS; p++) for (let s = 0; s < per && n < NS; s++) { orb.set([inc * D2R, p / planes * Math.PI * 2, s / per * Math.PI * 2 + p * .37, R], n * 4); n++; } }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pz.subarray(0, n * 3), 3)); sg.setAttribute('aO', new THREE.BufferAttribute(orb.subarray(0, n * 4), 4));
    S.sats = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPx: UPX, uOp: { value: 0 }, uC: { value: hdr(0xd8f0ff, 1.8) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'attribute vec4 aO;uniform float uTime,uPx;varying float vF;vec3 sat(vec4 o,float t){float u=o.z+t*.05*(11./o.w);vec3 p=vec3(cos(u),-sin(u)*sin(o.x),sin(u)*cos(o.x));float c=cos(o.y),s=sin(o.y);return vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c)*o.w;}void main(){vec3 p=sat(aO,uTime);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(10.,.075*uPx/-mv.z);vF=1.;}',
      fragmentShader: 'uniform vec3 uC;uniform float uOp;void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));gl_FragColor=vec4(uC*a*uOp,1.);}' }));
    TIMED.push(S.sats.material); S.sats.frustumCulled = false; G.add(S.sats);
    S.orb = orb; S.beams = [];
    for (let k = 0; k < 18; k++) { const l = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), lineMat(0xbfe8ff, .7, 1.6)); l.frustumCulled = false; l.userData.i = Math.floor(r() * n); G.add(l); S.beams.push(l); }
    lab(S, '<b>近地轨道星座</b>高度约 550 公里', () => S.beamTip || V(), 10, 15.8);
  },
  enter() { S11.group.add(GLOBE.group, CABLES.g); GLOBE.style(0xffd9a8, 0x3aa8ff, 0x4a90ff, .75); GLOBE.grat.visible = false; CABLES.lines.forEach(l => { l.material.uniforms.uHead.value = 1; l.material.uniforms.uOp.value = .35; }); },
  update(t, dt, ck) {
    const S = S11; S.arcs.forEach(l => l.material.uniforms.uHead.value = ss(l.userData.at, l.userData.at + 1.2, t));
    S.sats.material.uniforms.uOp.value = ss(8.6, 11, t);
    const tt = ck;
    S.beams.forEach((l, k) => { const o = S.orb.subarray(l.userData.i * 4, l.userData.i * 4 + 4); const u = o[2] + tt * .05 * (11 / o[3]); let x = Math.cos(u), y = -Math.sin(u) * Math.sin(o[0]), z = Math.sin(u) * Math.cos(o[0]); const c = Math.cos(o[1]), s = Math.sin(o[1]); const p = V(x * c + z * s, y, -x * s + z * c).multiplyScalar(o[3]); const q = p.clone().normalize().multiplyScalar(10.05); l.geometry.attributes.position.array.set([p.x, p.y, p.z, q.x, q.y, q.z]); l.geometry.attributes.position.needsUpdate = true; l.visible = t > 10 && p.dot(camera.position) > 0; if (k === 0) S.beamTip = p; l.material.opacity = (.4 + .6 * Math.sin(ck * 6 + k) ** 2) * ss(10, 11.5, t); });
  },
  cam: orbitPath([[0, 24, 120, 38], [9, 28, 75, 27], [17, 20, 30, 25], [27, 14, -20, 34]])
});

/* ---------- 12 finale ---------- */
const S12 = Scene({
  id: 'end', name: '尾声', dur: 16, era: '#ff9d52', bloom: { s: 1.4, r: .75, th: .5 },
  caps: [[1.4, 7, '从一道跳过空气的电火花，到环绕地球的光。']],
  dom: [['endc', 7.4, 99]],
  build(S) { S.sw = makeSwarm(9000, 0x7fe0ff, 0xffc796); S.group.add(S.sw); S.spark = makeSpark(V(0, -.3, 0), V(0, .3, 0), 0xffe0c0, .3); S.group.add(S.spark.grp); },
  update(t, dt, ck) {
    const S = S12; S.sw.material.uniforms.uP.value = 1 - easeOut(ss(1.6, 12, t)) * .97;
    const on = t < 1.8 && Math.random() < .6; S.spark.set(on, 1); if (on && !S._s && playing) AU.crackle(.7); S._s = on;
    if (t > 1.8 && !S._f) { S._f = 1; flash = .9; kick = 1.5; if (playing) AU.boom(1.2); } if (t < 1.5) S._f = 0;
  },
  cam: camPath([[0, [0, .6, 7], [0, 0, 0], 40], [6, [0, 6, 46], [0, 0, 0], 44], [16, [0, 12, 92], [0, 0, 0], 46]])
});

