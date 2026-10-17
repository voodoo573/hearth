/* HearthAtmosphere v2.0.0 - weather + lighting overlays for Hearth painted battle maps (Jenny).
   Original procedural code. Offline, no dependencies, no images, no CDN. See NOTES.md.
   const atm = HearthAtmosphere.create({cols, rows, container?, quality?, animate?, dmView?, seed?, clock?});
   atm.weatherEl -> mount BETWEEN map (+ .pm-ov) and tokens.   atm.lightEl -> mount ABOVE tokens, below UI / fog-of-war.
   (atm.el = both stacked, for the simple "all under tokens" case.)                                                     */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  // ---------- noise ----------
  var N = 256, M = N - 1, G = new Float32Array(N * N);
  (function () { var s = 1234567; for (var i = 0; i < N * N; i++) { s = (s * 1664525 + 1013904223) >>> 0; G[i] = s / 4294967296; } })();
  function vn(x, y) { // value noise 0..1, C1 smooth
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var x0 = xi & M, x1 = (xi + 1) & M, y0 = (yi & M) * N, y1 = ((yi + 1) & M) * N;
    var a = G[y0 + x0], b = G[y0 + x1], c = G[y1 + x0], d = G[y1 + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, o) { var s = 0, a = 0.5, n = 0; for (var i = 0; i < o; i++) { s += a * vn(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 - 9.7; a *= 0.5; } return s / n; }
  function n1(t, seed) { return vn(t, seed * 13.37) * 0.6 + vn(t * 2.7, seed * 7.1 + 50) * 0.28 + vn(t * 6.1, seed * 3.3 + 90) * 0.12; } // 0..1
  function rnd(s) { s = Math.sin(s * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function mixc(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

  var TIMES = { // multiply tint (ambient). day is neutral.
    day: [255, 255, 255], dawn: [255, 226, 214], dusk: [236, 168, 140], night: [92, 108, 160]
  };
  var DARK = [16, 19, 34];
  var LIGHTS = { // preset light sources; radius in squares (bright ~ 0.5 r, dim to r)
    torch:    { radius: 4,   colour: [255, 168, 92],  flicker: 0.55, speed: 1.0 },
    lantern:  { radius: 3.5, colour: [255, 206, 140], flicker: 0.18, speed: 0.6 },
    candle:   { radius: 1.6, colour: [255, 190, 120], flicker: 0.35, speed: 1.3 },
    campfire: { radius: 6,   colour: [255, 150, 70],  flicker: 0.6,  speed: 0.9 },
    light:    { radius: 4,   colour: [236, 240, 255], flicker: 0.0,  speed: 0.3 }, // the Light cantrip
    faerie:   { radius: 2.5, colour: [186, 150, 255], flicker: 0.12, speed: 0.4 },
    daylight: { radius: 12,  colour: [255, 250, 236], flicker: 0.0,  speed: 0.2 },
    moonbeam: { radius: 1.5, colour: [190, 220, 255], flicker: 0.08, speed: 0.3 }
  };
  function parseColour(c, d) {
    if (!c) return d; if (Array.isArray(c)) return c;
    var m = /^#?([0-9a-f]{6})$/i.exec(c); if (m) { var v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
    return d;
  }
  function slowDevice() {
    var n = root.navigator || {};
    return (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 3) ||
      (root.screen && Math.max(root.screen.width, root.screen.height) <= 900);
  }
  function sprite(r, stops) { // pre-rendered soft round sprite
    var c = document.createElement('canvas'); c.width = c.height = r * 2; var g = c.getContext('2d');
    var gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
  }

  function hashStr(s) { s = String(s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function nowAbs() { var p = root.performance || Date; return (p.timeOrigin || 0) + p.now(); } // shared across windows of one machine
  function create(o) {
    o = o || {};
    var cols = o.cols || 20, rows = o.rows || 15;
    var slow = o.quality ? o.quality === 'low' : slowDevice();
    var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var st = {
      weather: 'none', wI: 0.6, time: 'day', darkness: 0, wind: 0.35, windDir: o.windDir != null ? o.windDir : 0.35,
      lightning: false, lightningRate: 1, splashes: true, dmView: !!o.dmView, ambientOverride: null,
      lowq: slow, indoor: !!o.indoor, buildRate: o.buildUpRate || 1
    };
    var animate = o.animate !== false, reduced = !!(mq && mq.matches);
    function mk(cls, blend) {
      var c = document.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block' + (blend ? ';mix-blend-mode:' + blend : '');
      return c;
    }
    function wrap(cls) { var d = document.createElement('div'); d.className = cls; d.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;isolation:auto'; return d; }
    var weatherEl = wrap('hatm hatm-weather'), lightEl = wrap('hatm hatm-light'), el = wrap('hatm-root');
    var cB = mk('hatm-build'), cW = mk('hatm-w'), cF = mk('hatm-fog'), cL = mk('hatm-mul', 'multiply'), cG = mk('hatm-glow', 'screen'), cE = mk('hatm-add', 'screen');
    var veil = document.createElement('div'); veil.className = 'hatm-desat'; veil.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:#808080;mix-blend-mode:saturation;opacity:0;display:none';
    weatherEl.appendChild(cB); weatherEl.appendChild(veil); weatherEl.appendChild(cF); weatherEl.appendChild(cW); weatherEl.appendChild(cE); lightEl.appendChild(cL); lightEl.appendChild(cG);
    el.appendChild(weatherEl); el.appendChild(lightEl);
    var gB = cB.getContext('2d'), gE = cE.getContext('2d'), gW = cW.getContext('2d'), gF = cF.getContext('2d'), gL = cL.getContext('2d'), gG = cG.getContext('2d');
    var LT = document.createElement('canvas'), gT = LT.getContext('2d'), BLUR = 'filter' in gL;
    // Simulation space is resolution-independent (48 units per square) so every screen simulates identical particles;
    // the canvases are scaled by K at draw time.
    var SQ = 48, W = cols * SQ, H = rows * SQ, sq = SQ;
    var CW = 0, CH = 0, K = 1;
    var fogBuf = null, fogImg = null, fw = 0, fh = 0, fogCell = 1, fogPhase = 0;
    var lw = 0, lh = 0;
    var CAP = slow ? 1280 : 1920, DPR = Math.min(root.devicePixelRatio || 1, slow ? 1.5 : 2);
    var parts = [], smokes = [], splashes = [], ripples = [], lights = [], lid = 0;
    var flake = sprite(16, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
    var core = sprite(16, [[0, 'rgba(255,255,236,1)'], [0.25, 'rgba(255,236,150,1)'], [0.55, 'rgba(255,170,60,.55)'], [1, 'rgba(255,110,20,0)']]);
    var bloom = sprite(32, [[0, 'rgba(255,150,50,.55)'], [0.3, 'rgba(255,100,20,.22)'], [1, 'rgba(255,60,0,0)']]);
    var halo = sprite(16, [[0, 'rgba(120,34,4,.75)'], [0.55, 'rgba(90,22,4,.45)'], [1, 'rgba(40,10,2,0)']]);
    var smokeS = sprite(32, [[0, 'rgba(34,24,18,.55)'], [0.5, 'rgba(30,22,16,.28)'], [1, 'rgba(26,18,12,0)']]);
    var ember = sprite(16, [[0, 'rgba(255,240,190,1)'], [0.18, 'rgba(255,170,70,.9)'], [0.5, 'rgba(255,90,20,.25)'], [1, 'rgba(255,60,0,0)']]);
    // ---------- deterministic clock + RNG ----------
    var clock = o.clock || nowAbs, HZ = 30, DT = 1 / HZ;
    var t0abs = clock() - (o.timeOffset || 0) * 1000, tick = 0, tNow = 0, flashV = 0, nextFlash = 3, flashSeq = null, flashLog = [];
    var rs = (o.seed != null ? o.seed : (Math.random() * 4294967296)) >>> 0, seed0 = rs;
    function R() { rs = (rs + 0x6D2B79F5) | 0; var x = Math.imul(rs ^ (rs >>> 15), 1 | rs); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }
    var build = { wet: 0, snow: 0 }, bMask = null, bKey = '';
    var listeners = {};
    function emit(ev, a) { (listeners[ev] || []).slice().forEach(function (f) { try { f(a); } catch (e) { } }); }
    function changed() { emit('change'); }

    function host() { return o.container || weatherEl.parentNode || lightEl.parentNode || el.parentNode; }
    function resize() {
      var hh = host(), r = hh && hh.getBoundingClientRect ? hh.getBoundingClientRect() : { width: cols * 48, height: rows * 48 };
      var cw = Math.max(1, r.width || cols * 48), ch = Math.max(1, r.height || rows * 48);
      var s = Math.min(DPR, CAP / Math.max(cw, ch));
      var nW = Math.round(cw * s), nH = Math.round(ch * s);
      if (nW === CW && nH === CH) return; CW = cW.width = cE.width = nW; CH = cW.height = cE.height = nH; K = CW / W;
      // fog / sand field: per-pixel at ~6-8 px per square on the map, capped
      fogCell = Math.max(CW / (slow ? 150 : 230), 2); fw = Math.ceil(CW / fogCell); fh = Math.ceil(CH / fogCell);
      cF.width = fw; cF.height = fh; fogImg = gF.createImageData(fw, fh); fogBuf = fogImg.data;
      // light buffer: 12 px per square, capped
      var lc = Math.min(12, (slow ? 240 : 400) / cols); lw = cL.width = cG.width = LT.width = Math.ceil(cols * lc); lh = cL.height = cG.height = LT.height = Math.ceil(rows * lc);
      bKey = '';
    }

    // ---------- particles (all state in sim units; spawned from the seeded RNG only) ----------
    function areaScale() { return (cols * rows) / 300; }
    function reseed() {
      parts.length = 0; splashes.length = 0; ripples.length = 0; var w = st.weather, I = st.wI, n = 0, A = areaScale(), lq = st.lowq;
      if (w === 'rain' || w === 'heavyrain' || w === 'storm') n = Math.round((w === 'rain' ? 1500 : 2600) * (0.25 + 0.75 * I) * A * (lq ? 0.55 : 1));
      else if (w === 'snow') n = Math.round(1000 * I * A * (lq ? 0.6 : 1));
      else if (w === 'embers') n = Math.round(380 * (0.3 + 0.7 * I) * A * (lq ? 0.6 : 1));
      else if (w === 'ash') n = Math.round(460 * I * A);
      else if (w === 'sandstorm') n = Math.round(1700 * (0.3 + 0.7 * I) * A * (lq ? 0.55 : 1));
      n = Math.min(n, lq ? 1500 : 3200);
      for (var i = 0; i < n; i++) parts.push(spawn({}, true, i));
      smokes.length = 0; if (w === 'embers') for (var j = 0, m = Math.round(46 * (0.3 + 0.7 * I) * A); j < m; j++) smokes.push(spawnSmoke({}, true));
    }
    function spawn(p, initial, i) {
      var w = st.weather; p.k = (i != null ? i : (R() * 1e6) | 0);
      p.x = R() * (W + 200) - 100; p.y = R() * (H + 200) - 100;
      p.z = Math.pow(R(), 1.4);            // 0 far .. 1 near
      p.s = R(); p.age = 0;
      if (w === 'snow') { p.life = 1e9; p.r = (1.0 + p.z * 2.3) * sq / 40 * (0.7 + p.s * 0.6); }
      else if (w === 'embers') {
        p.life = 2.2 + R() * 4.5; p.age = initial ? R() * p.life : 0;
        p.flake = R() < 0.12; p.r = (p.flake ? 2.2 + R() * 1.8 : 0.8 + Math.pow(R(), 2.0) * 2.6) * sq / 40; p.rot = R() * TAU; p.h = []; p.ht = 0;
        var src = fireSources(); if (src.length && R() < 0.82) { var f = src[(R() * src.length) | 0], an = R() * TAU, rr = R() * f.r;
          p.x = (f.x + Math.cos(an) * rr) * sq; p.y = (f.y + Math.sin(an) * rr) * sq; if (initial) { p.x += (R() - 0.5) * sq * 4; p.y -= R() * sq * 4; } }
      }
      else if (w === 'sandstorm') { p.life = 1e9; p.z = R(); p.layer = p.z < 0.6 ? 0 : p.z < 0.9 ? 1 : 2; p.dark = R() < 0.15; }
      else if (w === 'ash') { p.life = 1e9; p.r = (1.4 + R() * 2.4) * sq / 40; p.rot = R() * TAU; }
      else { p.life = 0.18 + R() * 0.3; p.age = initial ? R() * p.life : 0; }
      return p;
    }
    var emitters = [];
    function fireSources() { var o2 = emitters.slice(); for (var i = 0; i < lights.length; i++) { var l = lights[i]; if (l.dmOnly) continue; if (l.type === 'campfire' || l.type === 'torch') { var q = lightPos(l); o2.push({ x: q.x, y: q.y, r: l.type === 'campfire' ? 0.45 : 0.15 }); if (l.type === 'campfire') o2.push(o2[o2.length - 1], o2[o2.length - 1]); } } return o2; }
    function spawnSmoke(p, initial) { p.x = R() * W; p.y = R() * H; p.life = 4 + R() * 5; p.age = initial ? R() * p.life : 0; p.r = (0.7 + R() * 1.3) * sq; p.k = R() * 1000;
      var src = fireSources(); if (src.length && R() < 0.6) { var f = src[(R() * src.length) | 0]; p.x = (f.x + (R() - 0.5) * 0.6) * sq; p.y = (f.y + (R() - 0.5) * 0.6) * sq; if (initial) p.y -= R() * sq * 3; }
      return p; }
    function curl(x, y, t) { // divergence-free swirl from a scalar noise potential (grid squares in, squares/s out)
      var e = 0.35, f = 0.22, a = t * 0.06, b = t * 0.045;
      var py1 = fbm((x) * f + a, (y + e) * f - b, 2), py0 = fbm((x) * f + a, (y - e) * f - b, 2);
      var px1 = fbm((x + e) * f + a, (y) * f - b, 2), px0 = fbm((x - e) * f + a, (y) * f - b, 2);
      return { x: (py1 - py0) / (2 * e) * 9, y: -(px1 - px0) / (2 * e) * 9 };
    }
    // sandstorm: one shared field so haze waves, billows, whiteouts and grit density agree.
    // v2: gusts never drop below ~45% and cycle faster, so there are no long tame lulls.
    function sandGust(t) { return 0.45 + 0.55 * n1(t * 0.16, 21); }
    function sandWhite(t) { return sstep(0.62, 0.8, n1(t * 0.3, 53)); } // brief near-whiteouts, a few per minute
    function sandWave(u, v, t, I) { var wq = vn(u * 0.05 + 3, v * 0.07 - t * 0.02) * 3.2; return sstep(0.34, 0.66, fbm(u * 0.11 - t * (0.3 + 0.3 * I) + wq * 0.35, v * 0.07 + 11 + wq * 0.2, 3)); }
    function windVec(t, gust) {
      var g = (n1(t * 0.18, 3) - 0.5) * gust; var a = st.windDir + g * 0.6;
      return { x: Math.cos(a), y: Math.sin(a), g: 1 + g * 0.9 };
    }

    // ---------- lights ----------
    function addLight(L) {
      L = L || {}; var p = LIGHTS[L.type] || LIGHTS.torch, id = L.id || ('l' + (++lid));
      var l = { id: id, x: L.x || 0, y: L.y || 0, follow: L.follow || null, token: L.token || null,
        radius: L.radius || p.radius, colour: parseColour(L.colour || L.color, p.colour), flicker: L.flicker != null ? L.flicker : p.flicker,
        speed: L.speed || p.speed, intensity: L.intensity != null ? L.intensity : 1, seed: L.seed != null ? L.seed : (hashStr(id) % 10000) / 100, type: L.type || 'torch', occlude: L.occlude !== false,
        dmOnly: !!L.dmOnly }; // Hearth 1.7.1: a DM-only light (carried by a creature the players can't see) glows on the DM's light layer only — no embers, smoke or sound

      lights.push(l); kick(); return l.id;
    }
    function removeLight(id) { for (var i = lights.length - 1; i >= 0; i--) if (lights[i].id === id || id === '*') lights.splice(i, 1); kick(); }
    function lightPos(l) {
      if (l.follow) { var p = l.follow(); if (p) return p; }
      if (l.token && l.token.offsetParent !== undefined) { var c = host(); if (c && c.clientWidth) {
        return { x: (l.token.offsetLeft + l.token.offsetWidth / 2) / c.clientWidth * cols, y: (l.token.offsetTop + l.token.offsetHeight / 2) / c.clientHeight * rows }; } }
      return l;
    }
    function lightState(l, t) { // flicker: layered noise, no shared rhythm
      var f = l.flicker, s = l.speed, k = t * s * 7;
      var a = n1(k, l.seed), b = n1(k * 2.3, l.seed + 31);
      var gutter = Math.pow(n1(t * s * 0.9, l.seed + 77), 3);   // occasional slower dips
      var inten = l.intensity * (1 - f * (0.22 * a + 0.12 * b + 0.25 * gutter));
      var rad = l.radius * (1 - f * 0.06 * (a - 0.5) * 2);
      var p = lightPos(l);
      return { x: p.x + f * 0.05 * (b - 0.5), y: p.y + f * 0.05 * (n1(k * 1.7, l.seed + 9) - 0.5), bx: p.x, by: p.y, r: rad, i: inten, c: l.colour, l: l };
    }

    // ---------- walls: visibility-polygon shadow casting ----------
    var walls = null, wallVer = 0;   // {segs:[[x0,y0,x1,y1]...], src, doors:{id:{seg,open}}}
    function compileWalls(d) {
      if (!d) return null;
      var sx = d.ref ? cols / d.ref[0] : 1, sy = d.ref ? rows / d.ref[1] : 1, segs = [], doors = {};
      function S(a, b, c, e) { segs.push([a * sx, b * sy, c * sx, e * sy]); }
      (d.segments || []).forEach(function (s) { S(s[0], s[1], s[2], s[3]); });
      (d.boxes || []).forEach(function (b) { S(b[0], b[1], b[2], b[1]); S(b[2], b[1], b[2], b[3]); S(b[2], b[3], b[0], b[3]); S(b[0], b[3], b[0], b[1]); });
      (d.polygons || []).forEach(function (p) { for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; S(a[0], a[1], b[0], b[1]); } });
      var n = segs.length;
      (d.doors || []).forEach(function (dr) { doors[dr.id] = { seg: [dr.seg[0] * sx, dr.seg[1] * sy, dr.seg[2] * sx, dr.seg[3] * sy], open: !!dr.open }; });
      var bx = (d.boxes || []).map(function (b) { return [Math.min(b[0], b[2]) * sx, Math.min(b[1], b[3]) * sy, Math.max(b[0], b[2]) * sx, Math.max(b[1], b[3]) * sy]; });
      var pl = (d.polygons || []).map(function (p) { return p.map(function (q) { return [q[0] * sx, q[1] * sy]; }); });
      return { base: segs.slice(0, n), doors: doors, segs: null, src: d, bx: bx, pl: pl, sg: segs.slice(0, n) };
    }
    function wallSegs() { if (!walls) return null; if (!walls.segs) { var s = walls.base.slice(); for (var id in walls.doors) if (!walls.doors[id].open) s.push(walls.doors[id].seg); walls.segs = s; } return walls.segs; }
    function visPoly(lx, ly, Rr) {
      var all = wallSegs(), segs = [], i, x0 = lx - Rr, y0 = ly - Rr, x1 = lx + Rr, y1 = ly + Rr;
      for (i = 0; i < all.length; i++) { var s = all[i]; if (Math.max(s[0], s[2]) < x0 || Math.min(s[0], s[2]) > x1 || Math.max(s[1], s[3]) < y0 || Math.min(s[1], s[3]) > y1) continue; segs.push(s); }
      var nw = segs.length; segs.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
      var ang = [];
      for (i = 0; i < segs.length; i++) { var q = segs[i];
        var a1 = Math.atan2(q[1] - ly, q[0] - lx), a2 = Math.atan2(q[3] - ly, q[2] - lx); ang.push(a1 - 1e-4, a1, a1 + 1e-4, a2 - 1e-4, a2, a2 + 1e-4); }
      ang.sort(function (a, b) { return a - b; });
      var pts = [];
      for (i = 0; i < ang.length; i++) {
        var dx = Math.cos(ang[i]), dy = Math.sin(ang[i]), tm = 1e9, hitWall = false;
        for (var j = 0; j < segs.length; j++) { var g = segs[j], ex = g[2] - g[0], ey = g[3] - g[1], den = dx * ey - dy * ex; if (den > -1e-12 && den < 1e-12) continue;
          var ox = g[0] - lx, oy = g[1] - ly, tt = (ox * ey - oy * ex) / den, u = (ox * dy - oy * dx) / den;
          if (tt > 0 && u >= -1e-9 && u <= 1 + 1e-9 && tt < tm) { tm = tt; hitWall = j < nw; } }
        if (tm > 1e8) continue;
        if (hitWall) tm += 0.18;     // light catches the face of the wall it hits
        pts.push(lx + dx * tm, ly + dy * tm);
      }
      return pts;
    }
    var SOFT = [[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]];
    function visFor(s) { // cached per light; recomputed only when the light (or a door) moves
      var l = s.l, Rr = l.radius * 1.12, key = s.bx.toFixed(3) + ',' + s.by.toFixed(3) + ',' + Rr.toFixed(2) + ',' + wallVer + (st.lowq ? 'l' : 'h');
      if (l._vk === key) return l._vp;
      var ns = st.lowq ? 3 : 5, out = [];
      for (var i = 0; i < ns; i++) out.push(visPoly(s.bx + SOFT[i][0], s.by + SOFT[i][1], Rr));
      l._vk = key; l._vp = out; return out;
    }
    function pathPts(g, p, k) { g.beginPath(); g.moveTo(p[0] * k, p[1] * k); for (var i = 2; i < p.length; i += 2) g.lineTo(p[i] * k, p[i + 1] * k); g.closePath(); }

    function ambient() {
      if (st.ambientOverride) return st.ambientOverride;
      var a = (TIMES[st.time] || TIMES.day).slice(), d = st.darkness;
      if (st.dmView) d *= 0.55;
      a = mixc(a, DARK, d);
      if (st.weather === 'rain') a = mixc(a, [a[0] * 0.88, a[1] * 0.9, a[2] * 0.95], st.wI);
      if (st.weather === 'heavyrain' || st.weather === 'storm') a = mixc(a, [a[0] * 0.78, a[1] * 0.82, a[2] * 0.9], st.wI);
      if (st.weather === 'sandstorm') a = mixc(a, [a[0] * 0.96, a[1] * 0.8, a[2] * 0.6], st.wI * (0.75 + 0.25 * sandGust(tNow)));
      if (st.weather === 'snow') a = mixc(a, [a[0] * 0.93, a[1] * 0.96, a[2] * 1.0], st.wI * 0.6);
      return a;
    }
    function lum(a) { return (a[0] * 0.3 + a[1] * 0.55 + a[2] * 0.15) / 255; }

    // ---------- lighting pass (multiply + screen, low res) ----------
    var LS = [];
    function drawLight(t) {
      var a = ambient(), fl = flashV;
      if (fl > 0) a = mixc(a, [235, 240, 255], Math.min(1, fl) * 0.85);
      var neutral = a[0] > 252 && a[1] > 252 && a[2] > 252 && !lights.length;
      gL.globalCompositeOperation = 'source-over'; gL.fillStyle = 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; gL.fillRect(0, 0, lw, lh); snowTint(a);
      gG.clearRect(0, 0, lw, lh);
      cL.style.display = neutral ? 'none' : '';
      var sx = lw / cols, dark = 1 - lum(a), ws = walls ? wallSegs() : null;
      LS = [];
      if (dark > 0.02) {
        gL.globalCompositeOperation = 'source-over'; gG.globalCompositeOperation = 'lighter';
        for (var i = 0; i < lights.length; i++) {
          var s = lightState(lights[i], t); LS.push(s);
          var x = s.x * sx, y = s.y * sx, R0 = s.r * sx, c0 = s.c, k = s.i;
          // multiply colour of a lit pixel: the light's hue, softened toward white so the painting keeps its colours
          var c = [mix(c0[0], 255, 0.4), mix(c0[1], 255, 0.4), mix(c0[2], 255, 0.4)];
          var occl = ws && ws.length && s.l.occlude, polys = occl ? visFor(s) : null; s.vis = polys;
          var tg = occl ? gT : gL;
          // soft falloff: bright core to ~45% then smooth tail
          var g = tg.createRadialGradient(x, y, 0, x, y, R0);
          var cs = function (m) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + clamp(m * k, 0, 1).toFixed(3) + ')'; };
          g.addColorStop(0, cs(1)); g.addColorStop(0.2, cs(0.95)); g.addColorStop(0.45, cs(0.75)); g.addColorStop(0.7, cs(0.34)); g.addColorStop(0.88, cs(0.09)); g.addColorStop(1, cs(0));
          if (!occl) { gL.fillStyle = g; gL.fillRect(x - R0, y - R0, R0 * 2, R0 * 2); }
          else { // area-light soft shadows: union of N jittered visibility polygons, then a light blur
            gT.globalCompositeOperation = 'source-over'; gT.clearRect(0, 0, lw, lh); gT.globalCompositeOperation = 'lighter'; gT.globalAlpha = 1 / polys.length; gT.fillStyle = g;
            for (var pi = 0; pi < polys.length; pi++) { gT.save(); pathPts(gT, polys[pi], sx); gT.clip(); gT.fillRect(x - R0, y - R0, R0 * 2, R0 * 2); gT.restore(); }
            gT.globalAlpha = 1; gT.globalCompositeOperation = 'source-over';
            if (BLUR) gL.filter = 'blur(' + Math.max(1, sx * 0.09).toFixed(1) + 'px)';
            gL.drawImage(LT, 0, 0); if (BLUR) gL.filter = 'none';
          }
          // warm bloom on the screen layer, stronger the darker it is
          var Rb = R0 * 0.42, gb = gG.createRadialGradient(x, y, 0, x, y, Rb), bm = 0.3 * k * dark; c = c0;
          gb.addColorStop(0, 'rgba(' + c[0] + ',' + (c[1] * 0.85 | 0) + ',' + (c[2] * 0.6 | 0) + ',' + bm.toFixed(3) + ')');
          gb.addColorStop(0.4, 'rgba(' + c[0] + ',' + (c[1] * 0.8 | 0) + ',' + (c[2] * 0.5 | 0) + ',' + (bm * 0.35).toFixed(3) + ')');
          gb.addColorStop(1, 'rgba(0,0,0,0)'); gG.fillStyle = gb;
          if (occl) { gG.save(); pathPts(gG, polys[0], sx); gG.clip(); }
          gG.fillRect(x - Rb, y - Rb, Rb * 2, Rb * 2);
          if (occl) gG.restore();
        }
      } else for (var j = 0; j < lights.length; j++) LS.push(lightState(lights[j], t));
      if (fl > 0) { gG.globalCompositeOperation = 'source-over'; gG.fillStyle = 'rgba(170,190,255,' + (Math.min(1, fl) * 0.28).toFixed(3) + ')'; gG.fillRect(0, 0, lw, lh); }
    }

    // ---------- lightning (seeded; one tick at a time) ----------
    function lightningStep(t) {
      flashV = 0; if (!st.lightning || !(st.weather === 'storm' || st.weather === 'heavyrain' || st.weather === 'rain')) return;
      if (!flashSeq && t >= nextFlash) { // a strike = 2-4 irregular pulses within ~0.6 s
        var n = 2 + ((R() * 3) | 0), seq = [], at = t, amax = 0;
        for (var i = 0; i < n; i++) { var aa = i === 0 ? 0.6 + R() * 0.4 : 0.35 + R() * 0.65; amax = Math.max(amax, aa); seq.push({ t: at, a: aa, d: 0.05 + R() * 0.09 }); at += 0.07 + R() * 0.18; }
        flashSeq = { s: seq, end: at + 0.6 }; nextFlash = at + (5 + R() * 11) / st.lightningRate;
        var ev = { t: t, a: amax, dist: R() }; flashLog.push(ev); if (flashLog.length > 20) flashLog.shift(); emit('flash', ev);
      }
      if (flashSeq) {
        for (var k = 0; k < flashSeq.s.length; k++) { var p = flashSeq.s[k], u = t - p.t; if (u >= 0) flashV = Math.max(flashV, p.a * (u < p.d ? 1 : Math.exp(-(u - p.d) * 9))); }
        if (t > flashSeq.end) flashSeq = null;
      }
    }

    // ---------- weather build-up: puddles (rain) + snow/frost creeping in from the edges (snow) ----------
    var BW = Math.min(slow ? 240 : 400, cols * 16), BH = Math.round(BW * rows / cols), bField = null, bPud = null;
    cB.width = BW; cB.height = BH; var bImg = gB.createImageData(BW, BH);
    // ground mask: where standing water may form (Hearth maps: traced data + wall data). No mask and no walls -> no puddles.
    var gMask = null, gGrid = null, GR = 4, gw = cols * GR, gh = rows * GR;
    function polyArea(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a) / 2; }
    function inPoly(p, x, y) { var c = false; for (var i = 0, j = p.length - 1; i < p.length; j = i++) { var a = p[i], b = p[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
    function segDist(x, y, g) { var dx = g[2] - g[0], dy = g[3] - g[1], L2 = dx * dx + dy * dy || 1e-9, u = clamp(((x - g[0]) * dx + (y - g[1]) * dy) / L2, 0, 1); return Math.hypot(x - g[0] - u * dx, y - g[1] - u * dy); }
    function wallBlocked(x, y) { if (!walls) return false; var m = 0.3, i;
      for (i = 0; i < walls.bx.length; i++) { var b = walls.bx[i]; if (x > b[0] - m && x < b[2] + m && y > b[1] - m && y < b[3] + m) return true; }
      for (i = 0; i < walls.pl.length; i++) { var p = walls.pl[i], big = polyArea(p) > cols * rows * 0.25, inside = inPoly(p, x, y);
        if (big ? !inside : inside) return true; }   // big outline = the floor boundary (cavern); small = solid pillar
      for (i = 0; i < walls.sg.length; i++) if (segDist(x, y, walls.sg[i]) < m) return true;
      return false; }
    function rebuildGround() { bKey = ''; if (!gMask && !walls) { gGrid = null; return; }
      var g = new Uint8Array(gw * gh);
      for (var y = 0, i = 0; y < gh; y++) for (var x = 0; x < gw; x++, i++) { var px = (x + 0.5) / GR, py = (y + 0.5) / GR, v = 1;
        if (gMask) v = gMask.data[Math.min(gMask.h - 1, Math.floor(py / rows * gMask.h)) * gMask.w + Math.min(gMask.w - 1, Math.floor(px / cols * gMask.w))] ? 1 : 0;
        if (v && wallBlocked(px, py)) v = 0; g[i] = v; }
      gGrid = g; }
    function groundAt(x, y) { if (!gGrid) return 0; var X = Math.floor(x * GR), Y = Math.floor(y * GR); return X < 0 || Y < 0 || X >= gw || Y >= gh ? 0 : gGrid[Y * gw + X]; }
    function groundSoft(x, y) { if (!gGrid) return 0; var fx = x * GR - 0.5, fy = y * GR - 0.5, X = Math.floor(fx), Y = Math.floor(fy), u = fx - X, v = fy - Y;
      function G(a, b) { return a < 0 || b < 0 || a >= gw || b >= gh ? 0 : gGrid[b * gw + a]; }
      return (G(X, Y) * (1 - u) + G(X + 1, Y) * u) * (1 - v) + (G(X, Y + 1) * (1 - u) + G(X + 1, Y + 1) * u) * v; }
    function pudTh() { return 0.79 - 0.12 * build.wet; }
    function inPuddle(x, y) { return build.wet > 0.05 && groundAt(x, y) && fbm(x * 0.5 + 50, y * 0.5 - 20, 4) > pudTh() + 0.012; }   // analytic: same on every screen
    function buildStep(dt) {
      var w = st.weather, I = st.wI, rate = st.buildRate, raining = w === 'rain' || w === 'heavyrain' || w === 'storm';
      if (raining) build.wet = Math.min(0.45 + 0.55 * I, build.wet + dt / 50 * (0.35 + 0.65 * I) * rate);
      else build.wet = Math.max(0, build.wet - dt / 150 * rate * (w === 'sandstorm' ? 3 : 1));
      if (w === 'snow') build.snow = Math.min(0.5 + 0.5 * I, build.snow + dt / 70 * (0.3 + 0.7 * I) * rate);
      else build.snow = Math.max(0, build.snow - dt / 240 * rate * (raining ? 3 : 1));
      for (var j = ripples.length - 1; j >= 0; j--) { ripples[j].a += dt / 0.7; if (ripples[j].a >= 1) ripples.splice(j, 1); }
    }
    function buildFields() { if (bField) return; bField = new Float32Array(BW * BH * 4); bPud = new Float32Array(BW * BH);
      var mn = Math.min(cols, rows) * 0.5;
      for (var y = 0, i = 0; y < BH; y++) for (var x = 0; x < BW; x++, i++) { var gx = (x + 0.5) / BW * cols, gy = (y + 0.5) / BH * rows;
        bField[i * 4] = fbm(gx * 0.5 + 50, gy * 0.5 - 20, 4);                                  // puddle basins
        bField[i * 4 + 1] = fbm(gx * 0.9 - 7, gy * 2.2 + 3, 2);                                // sky-sheen streaks
        var d = Math.min(gx, gy, cols - gx, rows - gy) / mn;                                   // 0 at the map edge .. 1 at the centre
        bField[i * 4 + 2] = (1 - Math.min(1, d)) * 0.55 + fbm(gx * 0.55 + 9, gy * 0.55 + 90, 4) * 0.6;   // snow settles from the edges inward, in drifts
        bField[i * 4 + 3] = fbm(gx * 3.6 + 31, gy * 3.6 - 5, 3); } }                            // fine grain: snow lies in crevices, not as a sheet
    // puddle mask (for light reflections) and snow mask (for the partial light tint), same size as the build buffer
    function mkc(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    var cPm = mkc(BW, BH), gPm = cPm.getContext('2d'), pImg = gPm.createImageData(BW, BH), cSm = mkc(BW, BH), gSm = cSm.getContext('2d'), sImg = gSm.createImageData(BW, BH);
    var cRt = mkc(BW, BH), gRt = cRt.getContext('2d'), hasPud = false, hasSnow = false, sTintKey = '', cSt = mkc(BW, BH), gSt = cSt.getContext('2d');
    function drawBuild(t) {
      var wet = build.wet, sn = build.snow;
      cB.style.display = wet > 0.01 || sn > 0.01 ? '' : 'none'; if (wet <= 0.01 && sn <= 0.01) { hasPud = hasSnow = false; return; }
      var a = ambient(), L = lum(a), key = wet.toFixed(2) + '|' + sn.toFixed(2) + '|' + L.toFixed(2) + '|' + (gGrid ? 1 : 0);
      if (key === bKey) return; bKey = key; buildFields();
      var d = bImg.data, pd = pImg.data, sd = sImg.data, th = pudTh(), sth = 1.06 - 0.4 * sn, lit = 0.55 + 0.45 * L, anyP = false, anyS = false;
      // sky seen in the water: the ambient light, cooled and lifted (water reflects the sky, not the ground)
      var skyR = Math.min(255, a[0] * 0.62 + 70), skyG = Math.min(255, a[1] * 0.68 + 78), skyB = Math.min(255, a[2] * 0.78 + 92);
      for (var i = 0, n = BW * BH; i < n; i++) {
        var f = i * 4, r = 24, g = 28, b = 34, al = 0, water = 0, ca = 0;
        if (wet > 0.01) {
          al = 0.07 * wet;                                                 // all ground darkens a little when wet
          var x = i % BW, y = (i / BW) | 0, gs = gGrid ? groundSoft((x + 0.5) / BW * cols, (y + 0.5) / BH * rows) : 0;
          if (gs > 0.01) {
            var dep = bField[f] - th;                                       // > 0 inside a puddle
            water = sstep(0.0, 0.012, dep) * sstep(0.35, 0.85, gs);
            var ring = sstep(-0.05, -0.002, dep) * (1 - water) * gs;        // dark wet soil ring around each puddle
            if (ring > 0) { r = 16; g = 18; b = 20; al = Math.max(al, al + ring * 0.3 * wet); }
            if (water > 0) {
              var sh = sstep(0.38, 0.78, bField[f + 1]), deep = sstep(0.01, 0.07, dep);
              var refl = 0.12 + 0.6 * sh * sh - 0.08 * deep;                    // streaky sky reflection, darker toward the deep middle
              var wr = mix(20, skyR, refl) * lit, wg = mix(26, skyG, refl) * lit, wb = mix(34, skyB, refl) * lit;
              var lip = Math.max(0, 1 - Math.abs(dep - 0.008) / 0.008) * 0.9;   // bright meniscus sheen ring at the water's edge
              wr = mix(wr, skyR * 1.05 * lit + 20, lip); wg = mix(wg, skyG * 1.05 * lit + 20, lip); wb = mix(wb, skyB * 1.05 * lit + 22, lip);
              r = mix(r, wr, water); g = mix(g, wg, water); b = mix(b, wb, water); al = mix(al, 0.58 + 0.2 * lip, water);
              anyP = true;
            }
          }
        }
        if (sn > 0.01) { // snow: drifts from the edges inward, broken up by fine grain; a sparse frost fringe ahead of it
          var ev = bField[f + 2], gr = bField[f + 3], cov = sstep(sth, sth + 0.1, ev) * sstep(0.36, 0.56, gr + (ev - sth) * 1.2);
          var fr = sstep(sth - 0.1, sth, ev) * (1 - cov) * sstep(0.54, 0.68, gr) * 0.35;
          ca = Math.max(cov * (0.34 + 0.2 * sn) * (0.55 + 0.6 * sstep(0.3, 0.75, gr)), fr);
          if (ca > 0) { var oa = ca + al * (1 - ca), wk = oa > 1e-4 ? ca / oa : 0, sl = 0.74 + 0.26 * L;
            r = mix(r, 222 * sl + 22, wk); g = mix(g, 230 * sl + 18, wk); b = mix(b, 244 * sl + 10, wk); al = oa; anyS = true; }
        }
        d[f] = r; d[f + 1] = g; d[f + 2] = b; d[f + 3] = al * 255;
        pd[f] = pd[f + 1] = pd[f + 2] = 255; pd[f + 3] = water * 255;
        sd[f] = sd[f + 1] = sd[f + 2] = 255; sd[f + 3] = ca * 255;
      }
      gB.putImageData(bImg, 0, 0); hasPud = anyP; hasSnow = anyS; sTintKey = '';
      if (anyP) gPm.putImageData(pImg, 0, 0); if (anyS) gSm.putImageData(sImg, 0, 0);
    }
    // standing water mirrors the lights: a warm glint of every nearby light inside the puddles, plus lightning (screen blend)
    function drawPudLights(t, fl) {
      if (!hasPud) return false; var used = false, kx = BW / cols;
      gRt.globalCompositeOperation = 'source-over'; gRt.clearRect(0, 0, BW, BH);
      for (var i = 0; i < lights.length; i++) { var ls = lightState(lights[i], t), c = ls.c || [255, 190, 120], rr = Math.max(0.8, ls.r * 0.55) * kx, x = ls.x * kx, y = ls.y * kx;
        var gg = gRt.createRadialGradient(x, y, 0, x, y, rr), k = clamp(ls.i, 0, 1.5);
        gg.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.75 * k).toFixed(3) + ')'); gg.addColorStop(0.45, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.25 * k).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(0,0,0,0)');
        gRt.fillStyle = gg; gRt.fillRect(x - rr, y - rr, rr * 2, rr * 2); used = true; }
      if (fl > 0.02) { gRt.fillStyle = 'rgba(215,225,255,' + Math.min(0.85, fl * 0.85).toFixed(3) + ')'; gRt.fillRect(0, 0, BW, BH); used = true; }
      if (!used) return false;
      gRt.globalCompositeOperation = 'destination-in'; gRt.drawImage(cPm, 0, 0);
      gE.setTransform(1, 0, 0, 1, 0, 0); gE.globalAlpha = 1; gE.drawImage(cRt, 0, 0, CW, CH); return true;
    }
    // snow keeps reading white: under snow, the multiply light tint is pulled toward a cool neutral of the same brightness
    function snowTint(a) {
      if (!hasSnow || build.snow <= 0.01) return; var Lm = lum(a) * 255 * 1.25, k = Lm.toFixed(0) + bKey;
      if (k !== sTintKey) { sTintKey = k; gSt.globalCompositeOperation = 'source-over'; gSt.clearRect(0, 0, BW, BH); gSt.drawImage(cSm, 0, 0);
        gSt.globalCompositeOperation = 'source-in'; gSt.fillStyle = 'rgb(' + Math.min(255, Lm * 0.95 | 0) + ',' + Math.min(255, Lm * 0.99 | 0) + ',' + Math.min(255, Lm * 1.08 | 0) + ')'; gSt.fillRect(0, 0, BW, BH); }
      gL.globalAlpha = 0.85; gL.drawImage(cSt, 0, 0, lw, lh); gL.globalAlpha = 1;
    }
    function drawRipples(L) {
      if (!ripples.length) return; var lw0 = Math.max(0.7, sq * 0.016);
      for (var i = 0; i < ripples.length; i++) { var p = ripples[i], e = 1 - Math.pow(1 - p.a, 2.2), r = p.r * (0.2 + 1.1 * e) * sq, fa = (1 - p.a) * (0.55 + 0.45 * L);
        gW.lineWidth = lw0 * (1.3 - 0.6 * p.a);
        gW.strokeStyle = 'rgba(222,232,245,' + (0.6 * fa).toFixed(3) + ')';
        gW.beginPath(); gW.ellipse(p.x * sq, p.y * sq, r, r * 0.86, 0, 0, TAU); gW.stroke();
        gW.strokeStyle = 'rgba(10,14,20,' + (0.3 * fa).toFixed(3) + ')';       // dark trough just inside the crest
        gW.beginPath(); gW.ellipse(p.x * sq, p.y * sq, r * 0.84, r * 0.72, 0, 0, TAU); gW.stroke();
        if (p.a > 0.15) { var r2 = r * 0.5; gW.strokeStyle = 'rgba(222,232,245,' + (0.35 * fa).toFixed(3) + ')';
          gW.beginPath(); gW.ellipse(p.x * sq, p.y * sq, r2, r2 * 0.86, 0, 0, TAU); gW.stroke(); }
        if (p.a < 0.18) { gW.fillStyle = 'rgba(235,242,250,' + (0.7 * (1 - p.a / 0.18)).toFixed(3) + ')'; gW.beginPath(); gW.arc(p.x * sq, p.y * sq, sq * 0.03, 0, TAU); gW.fill(); } }
    }
    // ---------- fog / mist / sand (per-pixel, low res, smooth upscale) ----------
    function drawFog(t, kind, I) {
      var d = fogBuf, a = ambient(), L = lum(a), sxs = cols / fw, i = 0, wv = windVec(t, 0.5);
      var col, base, aMax, sp1, sp2, sc1, sc2, aniso = 0, sand = kind === 'sand';
      if (sand) { col = [206, 168, 118]; base = 0.22 + 0.24 * I; aMax = 0.62 + 0.33 * I; sp1 = 1.6 + 2.4 * I; sp2 = 3.0 + 3.5 * I; sc1 = 0.16; sc2 = 0.42; aniso = 0.3; }
      else if (kind === 'rainmist') { col = [168, 178, 192]; base = 0.0; aMax = 0.30 * I; sp1 = 1.4; sp2 = 2.6; sc1 = 0.13; sc2 = 0.3; aniso = 0.45; }
      else { var nt = 1 - L; col = [208 + 28 * nt, 214 + 28 * nt, 222 + 33 * nt]; base = 0.06 + 0.16 * I; aMax = (0.30 + 0.5 * I) * (1 - 0.3 * L); sp1 = 0.2; sp2 = 0.5; sc1 = 0.15; sc2 = 0.42; }
      var ox1 = -wv.x * t * sp1, oy1 = -wv.y * t * sp1, ox2 = -wv.x * t * sp2, oy2 = -wv.y * t * sp2;
      var ca = Math.cos(st.windDir), sa = Math.sin(st.windDir), stretch = 1 - aniso;
      var ls = LS, nl = ls.length, dark = 1 - L;
      for (var y = 0; y < fh; y++) {
        var gy = (y + 0.5) * sxs;
        for (var x = 0; x < fw; x++, i += 4) {
          var gx = (x + 0.5) * sxs;
          // rotate into wind frame so sand/rain sheets stretch along the wind
          var u = gx * ca + gy * sa, v = -gx * sa + gy * ca; u *= stretch;
          var wx = fbm(u * 0.08 + t * 0.013, v * 0.08 - t * 0.011, 2);         // slow domain warp
          var far = fbm((u * sc1 + ox1 * sc1 * stretch) + wx * 1.6, (v * sc1 + oy1 * sc1) - wx * 1.2, 4);
          var near = fbm((u * sc2 + ox2 * sc2 * stretch) - wx * 2.2 + 40, (v * sc2 + oy2 * sc2) + wx * 1.4 + 40, sand ? 4 : 3);
          var dF = sstep(0.36, 0.7, far), dN = sstep(0.5, 0.7, near) * (0.35 + 0.65 * dF);
          var al = base + (aMax - base) * (dF * 0.6 + dN * 0.7);
          var r = col[0], g = col[1], b = col[2];
          if (sand) { var sd = clamp(sstep(0.27, 0.6, far) * 0.8 + dN * 0.3, 0, 1); r = mix(232, 128, sd); g = mix(198, 84, sd); b = mix(148, 42, sd); al = base + (aMax - base) * (sd * 0.8 + dN * 0.4); }
          // depth: near wisps are brighter / warmer in sand
          var nb = dN * (sand ? 14 : 22) - (1 - dF) * (sand ? 0 : 18); r += nb; g += nb; b += nb * (sand ? 0.5 : 1);
          if (nl && dark > 0.05) { // light scattering in fog: torches glow inside it
            var gl = 0, gr = 0, gg = 0, gb = 0;
            for (var k = 0; k < nl; k++) { var s = ls[k], dx = gx - s.x, dy = gy - s.y, dd = (dx * dx + dy * dy) / (s.r * s.r * 1.3);
              if (dd < 1) { var w = (1 - dd); w = w * w * s.i; gl += w; gr += w * s.c[0]; gg += w * s.c[1]; gb += w * s.c[2]; } }
            if (gl > 0) { var m = Math.min(1, gl) * dark * 0.9, inv = 1 / gl; r = mix(r, gr * inv, m); g = mix(g, gg * inv, m); b = mix(b, gb * inv, m); al += 0.1 * Math.min(1, gl) * dark; }
          }
          d[i] = r > 255 ? 255 : r; d[i + 1] = g > 255 ? 255 : g; d[i + 2] = b > 255 ? 255 : b; d[i + 3] = (al > 1 ? 1 : al) * 255;
        }
      }
      gF.putImageData(fogImg, 0, 0);
    }

    function drawSand(t, kind, I) {
      var d = fogBuf, sxs = cols / fw, i = 0, ca = Math.cos(st.windDir), sa = Math.sin(st.windDir);
      var wht = sandWhite(t), gust = sandGust(t), spd = 1.2 + 2.2 * I;
      var base = 0.36 + 0.24 * I + 0.08 * gust, wvA = 0.3 + 0.12 * I;
      for (var y = 0; y < fh; y++) {
        var gy = (y + 0.5) * sxs;
        for (var x = 0; x < fw; x++, i += 4) {
          var gx = (x + 0.5) * sxs, u = gx * ca + gy * sa, v = -gx * sa + gy * ca;
          var wave = sandWave(u, v, t, I);                                         // density walls rolling down-wind
          var wp = fbm(u * 0.07 - t * 0.05, v * 0.07 + t * 0.04, 2);              // slow warp
          var bu = u * 0.26 - t * spd * 0.3 + wp * 2.4, bv = v * 0.4 + wp * 1.6;   // billows, faster (parallax)
          var bl = fbm(bu, bv, 4), blS = fbm(bu - 0.18, bv - 0.18, 3);             // second tap = self-shadowed volume
          var bil = sstep(0.4, 0.7, bl), shade = clamp((bl - blS) * 7, -1, 1);
          var den = clamp(wave * 0.7 + bil * 0.55 * (0.4 + 0.6 * wave), 0, 1);
          var al = base + wvA * wave + 0.26 * bil + 0.42 * wht - 0.08 * (1 - bil) * (1 - wave);
          // colour: dense cores dark ochre, lit billow faces pale, whiteout washes toward bright dust
          var lit = 0.5 + 0.5 * shade;
          var sh = (lit - 0.45) * bil, r = mix(214, 146, den) + 70 * sh, g = mix(170, 98, den) + 60 * sh, b = mix(112, 50, den) + 40 * sh;
          r = mix(r, 232, wht * 0.7); g = mix(g, 196, wht * 0.7); b = mix(b, 140, wht * 0.7);
          d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = (al > 0.94 ? 0.94 : al) * 255;
        }
      }
      gF.putImageData(fogImg, 0, 0);
    }
    // ---------- weather particles: sim (upd=true, mutates, no drawing) / draw (upd=false, pure) ----------
    function T(g, x, y) { g.setTransform(K, 0, 0, K, x * K, y * K); }
    function simWeather(t, dt) {
      var w = st.weather, I = st.wI;
      if (w === 'rain' || w === 'heavyrain' || w === 'storm') rain(t, dt, I, 1, w !== 'rain', true);
      else if (w === 'snow') snow(t, dt, I, 1, true);
      else if (w === 'embers') embers(t, dt, I, true);
      else if (w === 'ash') ash(t, dt, I, 1, true);
      else if (w === 'sandstorm') sand(t, dt, I, 1, true);
    }
    function drawWeather(t) {
      var w = st.weather, I = st.wI, a = ambient(), L = 0.5 + 0.5 * lum(a), fl = flashV;
      gW.setTransform(1, 0, 0, 1, 0, 0); gW.globalCompositeOperation = 'source-over'; gW.clearRect(0, 0, CW, CH); T(gW, 0, 0);
      var fogKind = (w === 'fog') ? 'fog' : w === 'sandstorm' ? 'sand' : (w === 'heavyrain' || w === 'storm') ? 'rainmist' : null;
      cF.style.display = fogKind ? '' : 'none';
      if (fogKind) { fogPhase++; if (!slow || fogPhase % 2 || !animating()) (fogKind === 'sand' ? drawSand : drawFog)(t, fogKind, I); }
      veil.style.display = w === 'sandstorm' ? '' : 'none'; if (w === 'sandstorm') veil.style.opacity = (0.42 + 0.33 * I + 0.15 * sandWhite(t)).toFixed(3);
      if (cE._used) { gE.setTransform(1, 0, 0, 1, 0, 0); gE.clearRect(0, 0, CW, CH); cE._used = false; } var pl0 = false;
      T(gE, 0, 0);
      drawBuild(t); if (hasPud && build.wet > 0.01) { pl0 = drawPudLights(t, fl); if (pl0) cE._used = true; } drawRipples(L); T(gE, 0, 0);
      cE.style.display = w === 'embers' || w === 'ash' || pl0 ? '' : 'none';
      if (w === 'rain' || w === 'heavyrain' || w === 'storm') rain(t, 0, I, L + fl * 0.5, w !== 'rain', false);
      else if (w === 'snow') snow(t, 0, I, L, false);
      else if (w === 'embers') embers(t, 0, I, false);
      else if (w === 'ash') ash(t, 0, I, L, false);
      else if (w === 'sandstorm') sand(t, 0, I, L, false);
      gW.setTransform(1, 0, 0, 1, 0, 0); gE.setTransform(1, 0, 0, 1, 0, 0);
    }
    var BK = 12;
    function rain(t, dt, I, L, heavy, upd) {
      var wv = windVec(t, heavy ? 1 : 0.5), sp = sq * (heavy ? 30 : 24) * wv.g; // units/s at z=1
      var vx = wv.x * 0.55 + 0.0, vy = wv.y * 0.55 + 0.83; var vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
      var i, p;
      if (upd) {
        for (i = 0; i < parts.length; i++) {
          p = parts[i]; p.age += dt;
          var spd = sp * (0.45 + 0.55 * p.z) * (0.85 + p.s * 0.3);
          p.x += vx * spd * dt; p.y += vy * spd * dt;
          if (p.age > p.life) { // impact: a ripple if the drop lands in a puddle, else a splash
            if (gGrid && ripples.length < 240 && inPuddle(p.x / sq, p.y / sq)) ripples.push({ x: p.x / sq, y: p.y / sq, a: 0, r: 0.1 + p.z * 0.14 + p.s * 0.05 });
            else if (st.splashes && p.z > 0.45 && splashes.length < 260 && p.x > 0 && p.y > 0 && p.x < W && p.y < H) splashes.push({ x: p.x, y: p.y, a: 0, r: sq * (0.07 + p.z * 0.1) * (0.8 + p.s * 0.5) });
            spawn(p, false, p.k); p.age = 0;
          }
          if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) { p.x = (p.x + W + 120) % (W + 120) - 60; p.y = (p.y + H + 120) % (H + 120) - 60; }
        }
        for (var s0 = splashes.length - 1; s0 >= 0; s0--) { splashes[s0].a += dt / 0.28; if (splashes[s0].a >= 1) splashes.splice(s0, 1); }
        return;
      }
      var paths = []; for (var b = 0; b < BK; b++) paths.push([]);
      var curT = t * 0.12;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        // rain curtains: density + brightness vary in moving bands (no uniform rain)
        var cu = fbm(p.x / sq * 0.09 - curT * wv.x * 6, p.y / sq * 0.09 - curT * wv.y * 6 - curT * 3, 2);
        var dens = sstep(0.28, 0.72, cu); if (rnd(p.k * 1.7) > dens * 0.85 + 0.15) continue;
        var bucket = Math.min(BK - 1, ((p.z * 3) | 0) * 4 + Math.min(3, (dens * 4) | 0));
        var len = sq * (0.28 + 0.75 * p.z) * (heavy ? 1.25 : 1) * (0.7 + p.s * 0.6);
        paths[bucket].push(p.x, p.y, p.x - vx * len, p.y - vy * len);
      }
      gW.lineCap = 'round';
      for (var bb = 0; bb < BK; bb++) {
        var pa = paths[bb]; if (!pa.length) continue; var zb = (bb >> 2) / 2, db = (bb & 3) / 3;
        var alpha = (0.12 + 0.22 * zb + 0.08 * db) * (heavy ? 1.1 : 0.95) * (0.55 + 0.45 * L);
        var c = (190 + 50 * L) | 0;
        gW.strokeStyle = 'rgba(' + (c - 12) + ',' + (c - 4) + ',' + c + ',' + Math.min(0.75, alpha).toFixed(3) + ')';
        gW.lineWidth = Math.max(0.6, sq * (0.012 + 0.022 * zb));
        gW.beginPath(); for (var q = 0; q < pa.length; q += 4) { gW.moveTo(pa[q], pa[q + 1]); gW.lineTo(pa[q + 2], pa[q + 3]); } gW.stroke();
      }
      // splashes: tiny expanding rings, short-lived
      gW.lineWidth = Math.max(0.6, sq * 0.014);
      for (var s = 0; s < splashes.length; s++) {
        var sp2 = splashes[s], e = 1 - Math.pow(1 - sp2.a, 2), R1 = sp2.r * (0.3 + e);
        gW.strokeStyle = 'rgba(225,232,240,' + (0.38 * (1 - sp2.a) * (0.5 + 0.5 * L)).toFixed(3) + ')';
        gW.beginPath(); gW.ellipse(sp2.x, sp2.y, R1, R1 * 0.8, 0, 0, TAU); gW.stroke();
      }
    }
    function snow(t, dt, I, L, upd) {
      var wv = windVec(t, 0.8), base = sq * 1.1, i, p;
      if (upd) {
        for (i = 0; i < parts.length; i++) {
          p = parts[i]; var z = p.z, sp = base * (0.25 + 0.75 * z);
          var sway = (n1(t * 0.35 + p.s * 40, p.k % 97) - 0.5) * 2.2;
          p.x += (wv.x * 0.6 * wv.g + sway * 0.35) * sp * dt; p.y += (wv.y * 0.6 + 0.55 + sway * 0.12) * sp * dt;
          if (p.x < -30) p.x += W + 60; else if (p.x > W + 30) p.x -= W + 60; if (p.y < -30) p.y += H + 60; else if (p.y > H + 30) p.y -= H + 60;
        }
        return;
      }
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; var r = p.r * (p.z > 0.9 ? 1.35 : 1);
        gW.globalAlpha = (0.35 + 0.55 * p.z) * (p.z > 0.9 ? 0.5 : 1) * (0.55 + 0.45 * L);
        gW.drawImage(flake, p.x - r * 2, p.y - r * 2, r * 4, r * 4);
      }
      gW.globalAlpha = 1;
    }
    function embers(t, dt, I, upd) {
      var wv = windVec(t, 0.8), sqi = 1 / sq, TR = 7, j, i, m, p;
      if (upd) {
        for (j = 0; j < smokes.length; j++) {
          m = smokes[j]; m.age += dt; if (m.age > m.life) spawnSmoke(m, false);
          var cv = curl(m.x * sqi, m.y * sqi, t + m.k); m.x += (cv.x * 0.35 + wv.x * 0.45) * sq * dt; m.y += (cv.y * 0.35 + wv.y * 0.45 - 0.22) * sq * dt;
          if (m.x < -m.r) m.x += W + 2 * m.r; else if (m.x > W + m.r) m.x -= W + 2 * m.r; if (m.y < -m.r) m.y += H + 2 * m.r; else if (m.y > H + m.r) m.y -= H + 2 * m.r;
        }
        for (i = 0; i < parts.length; i++) {
          p = parts[i]; p.age += dt; if (p.age > p.life) { spawn(p, false, p.k); p.h.length = 0; }
          p.ht += dt;
          var cv2 = curl(p.x * sqi, p.y * sqi, t + p.s * 3), lift = p.flake ? 0.15 : 0.32, spd = (0.8 + p.s * 0.8) * sq;
          p.x += (cv2.x * 1.7 + wv.x * 0.45) * spd * dt; p.y += (cv2.y * 1.7 + wv.y * 0.45 - lift) * spd * dt; p.rot += dt * (p.k & 1 ? 2 : -2.6);
          if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) { p.age = p.life + 1; continue; }
          if (p.ht > 0.05 || !p.h.length) { p.ht = 0; p.h.unshift(p.x, p.y); if (p.h.length > TR * 2) p.h.length = TR * 2; }
        }
        return;
      }
      cE._used = true;
      // 1) dark smoke / ash wisps (normal blend): give the embers something dark to read against on bright lava
      for (j = 0; j < smokes.length; j++) {
        m = smokes[j]; var u0 = m.age / m.life, a0 = Math.sin(Math.PI * clamp(u0, 0, 1)) * (0.55 + 0.45 * n1(t * 0.4 + m.k, 4)), R0 = m.r * (0.7 + 0.6 * u0);
        gW.globalAlpha = a0 * 0.95; gW.drawImage(smokeS, m.x - R0, m.y - R0 * 0.8, R0 * 2, R0 * 1.6);
      }
      gW.globalAlpha = 1;
      // 2) embers: soft smoke trail, dark-orange halo (normal) + hot core and bloom (screen canvas)
      var step = slow ? 4 : 2;
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; if (p.age > p.life || !p.h.length) continue;
        var u = p.age / p.life, life = Math.min(1, u * 6) * Math.pow(1 - u, 0.7);
        var tw = 0.6 + 0.4 * n1(t * 5 + p.k * 0.37, p.k % 53), heat = life * tw;
        for (var q = 2; q < p.h.length; q += step) { var kk = q / (p.h.length), rs2 = p.r * (2.2 + 4 * kk);
          gW.globalAlpha = 0.5 * (1 - kk) * Math.min(1, life * 2); gW.drawImage(smokeS, p.h[q] - rs2, p.h[q + 1] - rs2, rs2 * 2, rs2 * 2); }
        var r = p.r * (0.75 + 0.5 * life);
        if (p.flake) { // larger glowing ash flake: dark body, glowing interior
          var sx = Math.abs(Math.cos(p.rot)) * 0.75 + 0.25;
          T(gW, p.x, p.y); gW.rotate(p.rot * 0.4); gW.globalAlpha = Math.min(1, life * 1.4) * 0.9;
          gW.fillStyle = 'rgb(46,30,22)'; gW.beginPath(); gW.ellipse(0, 0, r * 1.5, r * 1.5 * sx * 0.7, 0, 0, TAU); gW.fill();
          T(gE, p.x, p.y); gE.rotate(p.rot * 0.4);
          var fw2 = r * 2.3, fh2 = r * 2.3 * sx * 0.7; gE.globalAlpha = clamp(heat * 0.75, 0, 1); gE.drawImage(core, -fw2 * 0.8, -fh2 * 0.8, fw2 * 1.6, fh2 * 1.6);
          gE.globalAlpha = clamp(heat * 0.55, 0, 1); gE.drawImage(bloom, -r * 4, -r * 4, r * 8, r * 8);
          T(gW, 0, 0); T(gE, 0, 0);
        } else {
          gW.globalAlpha = clamp(0.35 + life * 0.65, 0, 1); gW.drawImage(halo, p.x - r * 2.6, p.y - r * 2.6, r * 5.2, r * 5.2);
          gE.globalAlpha = clamp(heat * 0.6, 0, 1); gE.drawImage(bloom, p.x - r * 5.5, p.y - r * 5.5, r * 11, r * 11);
          gE.globalAlpha = clamp(heat * 1.2, 0, 1); gE.drawImage(core, p.x - r * 1.5, p.y - r * 1.5, r * 3, r * 3);
        }
      }
      gW.globalAlpha = 1; gE.globalAlpha = 1;
    }
    function ash(t, dt, I, L, upd) {
      var wv = windVec(t, 0.7), c = (150 + 80 * L) | 0, i, p;
      if (upd) {
        for (i = 0; i < parts.length; i++) {
          p = parts[i]; var sp = sq * (0.35 + p.z * 0.6), sw = (n1(t * 0.5 + p.s * 30, p.k % 89) - 0.5) * 2;
          p.x += (wv.x * 0.7 * wv.g + sw * 0.4) * sp * dt; p.y += (wv.y * 0.7 + 0.35) * sp * dt; p.rot += dt * (1 + p.s * 3) * (p.k & 1 ? 1 : -1);
          if (p.x < -20) p.x += W + 40; else if (p.x > W + 20) p.x -= W + 40; if (p.y < -20) p.y += H + 40; else if (p.y > H + 20) p.y -= H + 40;
        }
        return;
      }
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; var r = p.r, sq2 = Math.abs(Math.cos(p.rot)) * 0.8 + 0.2;
        gW.fillStyle = 'rgba(' + c + ',' + (c - 4) + ',' + (c - 8) + ',' + (0.35 + 0.45 * p.z).toFixed(2) + ')';
        T(gW, p.x, p.y); gW.rotate(p.rot * 0.3);
        gW.beginPath(); gW.ellipse(0, 0, r, r * sq2 * 0.6, 0, 0, TAU); gW.fill();
      }
      T(gW, 0, 0);
      gW.globalCompositeOperation = 'lighter';  // occasional stray ember among the ash
      for (var j = 0; j < parts.length; j += 9) { var qq = parts[j], tw = Math.pow(n1(t * 1.5 + qq.k, 3), 4); if (tw < 0.12) continue; var rr = qq.r * 3; gW.globalAlpha = tw; gW.drawImage(ember, qq.x - rr, qq.y - rr, rr * 2, rr * 2); }
      gW.globalAlpha = 1; gW.globalCompositeOperation = 'source-over';
    }
    function sand(t, dt, I, L, upd) {
      var wv = windVec(t, 1), gust = sandGust(t), wht = sandWhite(t), sqi = 1 / sq;
      var ca = Math.cos(st.windDir), sa = Math.sin(st.windDir);
      var SPD = [5.5, 10, 17], LEN = [0.16, 0.45, 1.3], WID = [0.008, 0.014, 0.03], ALP = [0.16, 0.14, 0.08];
      var paths = [[], [], [], [], [], []], i, p;
      for (i = 0; i < parts.length; i++) {
        p = parts[i]; var ly = p.layer, wob = (n1(t * 1.1 + p.k * 0.1, 7) - 0.5);
        var a = st.windDir + wob * 0.25 + (wv.g - 1) * 0.15, vx = Math.cos(a), vy = Math.sin(a);
        if (upd) {
          var s = SPD[ly] * sq * (0.55 + 0.6 * I) * (0.75 + 0.5 * gust) * (0.85 + p.s * 0.3);
          p.x += vx * s * dt; p.y += vy * s * dt;
          var m = 60 + LEN[2] * sq; if (p.x < -m) p.x += W + 2 * m; else if (p.x > W + m) p.x -= W + 2 * m; if (p.y < -m) p.y += H + 2 * m; else if (p.y > H + m) p.y -= H + 2 * m;
          continue;
        }
        var gx = p.x * sqi, gy = p.y * sqi, wave = sandWave(gx * ca + gy * sa, -gx * sa + gy * ca, t, I);
        if (rnd(p.k * 2.3) > 0.35 + 0.65 * wave) continue;                        // grit rides the density waves (never fully absent)
        var len = LEN[ly] * sq * (0.6 + p.s * 0.8) * (0.7 + 0.5 * I);
        paths[ly * 2 + (p.dark ? 1 : 0)].push(p.x, p.y, p.x - vx * len, p.y - vy * len);
      }
      if (upd) return;
      gW.lineCap = 'round';
      for (var b = 0; b < 6; b++) { var pa = paths[b], ly2 = b >> 1, dk = b & 1; if (!pa.length) continue;
        var al = ALP[ly2] * (1 - 0.5 * wht) * (0.7 + 0.5 * I);
        gW.strokeStyle = dk ? 'rgba(96,62,30,' + (al * 0.9).toFixed(3) + ')' : 'rgba(246,222,178,' + al.toFixed(3) + ')';
        gW.lineWidth = Math.max(0.7, sq * WID[ly2]);
        gW.beginPath(); for (var q = 0; q < pa.length; q += 4) { gW.moveTo(pa[q], pa[q + 1]); gW.lineTo(pa[q + 2], pa[q + 3]); } gW.stroke();
        if (ly2) { gW.lineWidth = Math.max(1.4, sq * WID[ly2] * 3); gW.globalAlpha = 0.35; gW.stroke(); gW.globalAlpha = 1; } } // soft motion-blur sheath
    }

    // ---------- loop: fixed 30 Hz simulation ticks keyed to a shared clock; drawing at 30 fps (15 when slow / long frames) ----------
    var raf = 0, lastFrame = 0, fps = slow ? 15 : 30, cost = 0, stopped = false, visible = true, io = null, detachedSince = 0, maxCatch = 90;
    function animating() { return animate && !reduced; }
    function stepTick() { tick++; var t = tick * DT; tNow = t; lightningStep(t); simWeather(t, DT); buildStep(DT); if (listeners.tick && listeners.tick.length) emit('tick', tick); }
    function advance() {
      var target = Math.floor((clock() - t0abs) / 1000 * HZ + 1e-3); if (target < 0) target = 0;
      if (target < tick) { tick = target; return; }            // clock moved back (e.g. new epoch): hold
      var n = target - tick, jumped = false; if (n > maxCatch) { tick = target - maxCatch; n = maxCatch; jumped = true; } maxCatch = 90;
      while (n-- > 0) stepTick();
      if (jumped) emit('jump');   // this screen was paused (hidden tab): sync asks the other screen for its state
      tNow = tick * DT;
    }
    function frame(now) {
      raf = 0; if (stopped) return;
      if (!el.isConnected && !weatherEl.isConnected && !lightEl.isConnected) { if (!detachedSince) detachedSince = now; if (now - detachedSince > 60000) return stop(); setTimeout(schedule, 500); return; }
      detachedSince = 0;
      if (document.hidden || !visible) return; // resumed by visibilitychange / IntersectionObserver
      schedule();
      if (now - lastFrame < 1000 / fps - 2) return;
      lastFrame = now;
      var t0 = (root.performance || Date).now();
      render();
      var c = (root.performance || Date).now() - t0; cost = cost * 0.95 + c * 0.05;
      if (fps === 30 && cost > 20) fps = 15; else if (fps === 15 && !slow && cost < 8) fps = 30;
    }
    function schedule() { if (!raf && !stopped && animating()) raf = root.requestAnimationFrame(frame); }
    function render() { resize(); advance(); var t = tick * DT; drawLight(t); drawWeather(t); emit('frame', t); }
    function staticFrame() { // reduced motion / animations off: one representative still, no lightning, no flicker
      resize(); var save = st.lightning; st.lightning = false; flashV = 0;
      var fl = lights.map(function (l) { var f = l.flicker; l.flicker = 0; return f; });
      if (!parts.length) reseed();
      advance(); var t = Math.max(tick * DT, 4); drawLight(t); drawWeather(t);
      lights.forEach(function (l, i) { l.flicker = fl[i]; }); st.lightning = save;
    }
    function kick() { if (stopped) return; if (animating()) schedule(); else if (host()) staticFrame(); }
    function onVis() { kick(); }
    document.addEventListener('visibilitychange', onVis);
    if (mq) { var onMq = function (e) { reduced = e.matches; kick(); }; mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq); }
    if (root.IntersectionObserver) { io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) onVis(); }); setTimeout(function () { if (!stopped) io.observe(weatherEl.isConnected ? weatherEl : el); }, 0); }
    if (root.ResizeObserver) { var ro = new ResizeObserver(function () { kick(); }); setTimeout(function () { var c = host(); if (c && !stopped) ro.observe(c); }, 0); }
    function stop() { stopped = true; if (raf) root.cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); if (io) io.disconnect(); emit('stop'); }
    if (o.container) o.container.appendChild(el);
    reseed();
    setTimeout(kick, 0);

    function cp(x) { return JSON.parse(JSON.stringify(x)); }
    function chk(arr) { var h = 0; for (var i = 0; i < arr.length; i++) { var p = arr[i]; h = (Math.imul(h, 31) + Math.round(p.x * 1000) * 7 + Math.round(p.y * 1000)) | 0; } return h >>> 0; }
    var api = {
      el: el, weatherEl: weatherEl, lightEl: lightEl, version: '2.0.0',
      get reduced() { return !animating(); }, get fps() { return fps; }, get frameMs() { return +cost.toFixed(2); }, get tick() { return tick; },
      setWeather: function (type, intensity) { // none|rain|heavyrain|storm|snow|fog|embers|ash|sandstorm
        if (type === 'mist') { type = 'fog'; if (intensity == null) intensity = 0.35; }
        st.weather = type || 'none'; if (intensity != null) st.wI = clamp(+intensity, 0, 1);
        if (type === 'storm') st.lightning = true; reseed(); kick(); changed(); return api; },
      setIntensity: function (v) { st.wI = clamp(+v, 0, 1); reseed(); kick(); changed(); return api; },
      setTime: function (t) { st.time = TIMES[t] ? t : 'day'; kick(); changed(); return api; },
      setDarkness: function (v) { st.darkness = clamp(+v, 0, 1); kick(); changed(); return api; },
      setWind: function (dirRadians) { if (dirRadians != null) st.windDir = dirRadians; kick(); changed(); return api; },
      setLightning: function (on, rate) { st.lightning = !!on; if (rate) st.lightningRate = rate; nextFlash = tNow + 1.5; kick(); changed(); return api; },
      flash: function () { nextFlash = tNow; st.lightning = true; kick(); changed(); },
      setSplashes: function (on) { st.splashes = !!on; changed(); return api; },
      setDmView: function (on) { st.dmView = !!on; kick(); return api; },          // per screen, not synced
      setAnimate: function (on) { animate = !!on; kick(); return api; },
      setIndoor: function (on) { st.indoor = !!on; changed(); return api; },
      setEmitters: function (list) { emitters = (list || []).map(function (e) { return { x: e.x, y: e.y, r: e.r || 0.5 }; }); if (st.weather === 'embers') reseed(); kick(); changed(); return api; },
      // walls (Hearth's own maps only): {segments, boxes, polygons, doors:[{id, seg, open}], ref:[cols,rows]} in squares, or null
      setWalls: function (d) { walls = compileWalls(d); wallVer++; rebuildGround(); kick(); return api; },
      setGroundMask: function (m) { gMask = m && m.data ? m : null; rebuildGround(); kick(); changed(); return api; },
      groundMask: function () { return gMask; },
      setDoor: function (id, open) { if (walls && walls.doors[id]) { walls.doors[id].open = !!open; walls.segs = null; wallVer++; kick(); } return api; },
      walls: function () { return walls ? { segments: wallSegs().slice(), doors: cp(walls.doors) } : null; },
      // weather build-up 0..1 (puddles / snow cover); rate multiplies the natural build + dry/melt speed
      setBuildUp: function (b) { if (b) { if (b.wet != null) build.wet = clamp(+b.wet, 0, 1); if (b.snow != null) build.snow = clamp(+b.snow, 0, 1); if (b.rate != null) st.buildRate = +b.rate; } bKey = ''; kick(); changed(); return api; },
      buildUp: function () { return { wet: build.wet, snow: build.snow, rate: st.buildRate }; },
      addLight: addLight, removeLight: removeLight, lights: function () { return lights.slice(); },
      updateLight: function (id, p) { lights.forEach(function (l) { if (l.id === id) { for (var k in p) l[k] = k === 'colour' || k === 'color' ? parseColour(p[k], l.colour) : p[k]; if (p.color) l.colour = parseColour(p.color, l.colour); } }); kick(); },
      /* brightness the token layer can use when lightEl is NOT mounted above tokens */
      tokenFilter: function () { var a = ambient(), l = lum(a); return l > 0.97 ? '' : 'brightness(' + (0.45 + 0.55 * l).toFixed(2) + ')'; },
      state: function () { return cp(st); },
      on: function (ev, f) { (listeners[ev] = listeners[ev] || []).push(f); return function () { var a = listeners[ev] || [], i = a.indexOf(f); if (i >= 0) a.splice(i, 1); }; },
      // ---- determinism / sync ----
      get seed() { return seed0; },
      setSeed: function (s) { seed0 = rs = (s >>> 0); reseed(); kick(); changed(); return api; },
      snapshot: function () { return { v: 2, tick: tick, t0abs: t0abs, rs: rs, seed: seed0, st: cp(st), parts: cp(parts), smokes: cp(smokes), splashes: cp(splashes), ripples: cp(ripples),
        nextFlash: nextFlash, flashSeq: cp(flashSeq), build: cp(build), emitters: cp(emitters) }; },
      loadSnapshot: function (s) { if (!s || s.v !== 2) return api; var dm = st.dmView;
        st = cp(s.st); st.dmView = dm; tick = s.tick; t0abs = s.t0abs; rs = s.rs; seed0 = s.seed; parts = cp(s.parts); smokes = cp(s.smokes); splashes = cp(s.splashes); ripples = cp(s.ripples);
        nextFlash = s.nextFlash; flashSeq = cp(s.flashSeq); build = cp(s.build); emitters = cp(s.emitters); bKey = ''; maxCatch = 900; kick(); return api; },
      checksum: function () { return { tick: tick, parts: chk(parts), smokes: chk(smokes), rs: rs >>> 0, wet: +build.wet.toFixed(6), snow: +build.snow.toFixed(6), ripples: chk(ripples) }; },
      // ---- audio feed (see hearth-atmosphere-audio.js): one call per frame, drains new lightning strikes ----
      audioState: function () { var f = flashLog.splice(0, flashLog.length), t = tick * DT;
        return { t: t, weather: st.weather, wI: st.wI, time: st.time, darkness: st.darkness, indoor: st.indoor, wet: build.wet, snow: build.snow,
          gust: n1(t * 0.18, 3), sandGust: st.weather === 'sandstorm' ? sandGust(t) : 0, sandWhite: st.weather === 'sandstorm' ? sandWhite(t) : 0, flash: flashV,
          strikes: f, fires: lights.filter(function (l) { return !l.dmOnly && /campfire|torch|candle|lantern/.test(l.type); }).map(function (l) { var p = lightPos(l); return { type: l.type, x: p.x / cols, i: l.intensity }; }),
          lava: st.weather === 'embers' ? Math.min(1, emitters.length / 12) : 0 }; },
      renderAt: function (t) { t0abs = clock() - t * 1000; tick = Math.max(0, Math.floor(t * HZ) - 60); reseed(); render(); },
      stop: stop
    };
    return api;
  }
  // ---------- DM <-> projector sync over the existing BroadcastChannel ('hearth-projector-map') or a postMessage port ----------
  // Same seed + same clock + same snapshot => both screens simulate identical particles, tick for tick.
  function sync(atm, o) {
    o = o || {}; var role = o.role || 'dm', ch = null, own = false, port = o.port || null, timer = 0, off = [];
    if (!port) { if (o.channel && typeof o.channel === 'object') ch = o.channel; else if (typeof BroadcastChannel !== 'undefined') { ch = new BroadcastChannel(o.channel || 'hearth-projector-map'); own = true; } }
    function post(m) { try { if (ch) ch.postMessage(m); else if (port) port.postMessage(m, o.targetOrigin || (root.location && root.location.origin) || '*'); } catch (e) { } }
    function onMsg(ev) { var d = ev.data; if (!d || typeof d.type !== 'string' || d.type.indexOf('hearth-atmos') !== 0) return;
      if (port && o.targetOrigin && ev.origin && ev.origin !== o.targetOrigin) return;
      if (d.type === 'hearth-atmos-snapshot' && d.from !== role) atm.loadSnapshot(d.snap);        // DM state is authoritative; projector state only answers a paused DM
      else if (d.type === 'hearth-atmos-hello' && d.from !== role) send(); }
    var pend = 0; function send() { pend = 0; post({ type: 'hearth-atmos-snapshot', from: role, snap: atm.snapshot() }); }
    function soon() { if (!pend) pend = setTimeout(send, 30); }
    function hello() { post({ type: 'hearth-atmos-hello', from: role }); }
    var src = ch || root; src.addEventListener('message', onMsg);
    off.push(atm.on('jump', hello));      // came back from a hidden/paused state: adopt the other screen's running simulation
    if (role === 'dm') { off.push(atm.on('change', soon)); timer = setInterval(send, o.resyncMs || 10000); send(); }
    else hello();
    return { stop: function () { src.removeEventListener('message', onMsg); off.forEach(function (f) { f(); }); clearInterval(timer); if (own) ch.close(); }, resync: send, channel: ch };
  }
  function emittersFromMeta(meta) { // painted-map overlays (lava pools/channels, fires) -> ember emitters
    var out = []; ((meta && meta.overlays) || []).forEach(function (o) {
      if (!/lava|fire|torch/.test(o.kind)) return;
      if (o.pts) { for (var i = 0; i < o.pts.length - 1; i++) { var a = o.pts[i], b = o.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var s = 0; s < L; s += 0.8) out.push({ x: a[0] + (b[0] - a[0]) * s / L, y: a[1] + (b[1] - a[1]) * s / L, r: (o.w || 1) / 2 }); } }
      else if (o.x != null) { var r = o.w ? Math.min(o.w, o.h || o.w) / 2 : 0.4; var n = Math.max(1, Math.round(r * r)); for (var k = 0; k < n; k++) out.push({ x: o.x, y: o.y, r: r }); }
    }); return out;
  }
  var HA = root.HearthAtmosphere = root.HearthAtmosphere || {}, ex = { create: create, sync: sync, emittersFromMeta: emittersFromMeta, lightTypes: Object.keys(LIGHTS), times: Object.keys(TIMES), weatherTypes: ['none', 'rain', 'heavyrain', 'storm', 'snow', 'fog', 'mist', 'embers', 'ash', 'sandstorm'], version: '2.0.0' }; for (var k in ex) HA[k] = ex[k];
})(typeof window !== 'undefined' ? window : this);
