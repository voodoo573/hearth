/* Hearth v1.7.0 — fog of war renderer (design: Jenny, map-interactions SPEC.md §3 + MOTION.md).
   The fog is an alpha mask, 4 × 4 sub-squares per grid square, stored as a base64 bit field
   (1 = clear). It's drawn at screen resolution and blurred, never as hard per-square cells.
   DM look: translucent indigo with a fine hatch, tight soft edge (0.12 square).
   Projector look: opaque smoky umber, wide soft edge (0.35 square).
   Changes dissolve through a noise threshold that sweeps out from where the change began.
   This function has no outer references: the projector window embeds it via toString(). */
function hearthFogLib(root) {
  'use strict';
  var F = 4, Q = 16; // mask sub-squares per square; animation field pixels per square
  function decode(str, n) {
    var out = new Uint8Array(n); if (!str) return out;
    var bin = ''; try { bin = atob(str); } catch (e) { return out; }
    for (var i = 0; i < n; i++) out[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
    return out;
  }
  function encode(m) {
    var nb = Math.ceil(m.length / 8), bytes = new Uint8Array(nb), s = '';
    for (var i = 0; i < m.length; i++) if (m[i]) bytes[i >> 3] |= 1 << (i & 7);
    for (var j = 0; j < nb; j += 4096) s += String.fromCharCode.apply(null, bytes.subarray(j, Math.min(nb, j + 4096)));
    return btoa(s);
  }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // fbm value noise, w × h, 0..1
  function noise(w, h, seed, cells) {
    var out = new Float32Array(w * h), r = rng(seed), amp = 1, tot = 0;
    for (var o = 0; o < 4; o++, cells *= 2, amp *= 0.5) {
      var gw = cells + 2, gh = Math.ceil(cells * h / w) + 2, g = new Float32Array(gw * gh); tot += amp;
      for (var k = 0; k < g.length; k++) g[k] = r();
      for (var y = 0; y < h; y++) { var fy = y / w * cells, iy = fy | 0, ay = fy - iy; ay = ay * ay * (3 - 2 * ay);
        for (var x = 0; x < w; x++) { var fx = x / w * cells, ix = fx | 0, ax = fx - ix; ax = ax * ax * (3 - 2 * ax);
          var a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
          out[y * w + x] += amp * (a + (b - a) * ax + ((c + (d - c) * ax) - (a + (b - a) * ax)) * ay); } }
    }
    for (var i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  var _tex = {};
  function texture(look) {
    if (_tex[look]) return _tex[look];
    var N = look === 'proj' ? 192 : 12, c = canvas(N, N), x = c.getContext('2d');
    if (look === 'proj') {
      // painted, smoky dark umber: two noise octaves of warm browns over near-black
      var n1 = noise(N, N, 11, 3), n2 = noise(N, N, 29, 9), img = x.createImageData(N, N);
      for (var i = 0; i < N * N; i++) {
        var v = Math.max(0, Math.min(1, n1[i] * 0.75 + n2[i] * 0.35 - 0.18));
        img.data[i * 4] = 13 + v * 30; img.data[i * 4 + 1] = 10 + v * 21; img.data[i * 4 + 2] = 8 + v * 13; img.data[i * 4 + 3] = 255;
      }
      x.putImageData(img, 0, 0);
    } else {
      x.strokeStyle = 'rgba(255,255,255,0.075)'; x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(-2, N + 2); x.lineTo(N + 2, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(N - 2, N + 2); x.lineTo(N + 2, N - 2); x.stroke();
    }
    return (_tex[look] = c);
  }
  var canFilter = (function () { try { var t = document.createElement('canvas').getContext('2d'); return t && typeof t.filter === 'string'; } catch (e) { return false; } })();
  function reduced() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) || !!root.__hearthReduceMotion; } catch (e) { return false; } }

  // A fog layer drawn on one canvas. look: 'dm' | 'proj'.
  function FogView(cv, o) {
    this.cv = cv; this.look = o.look || 'dm'; this.cols = o.cols; this.rows = o.rows;
    this.mw = o.cols * F; this.mh = o.rows * F; this.fw = o.cols * Q; this.fh = o.rows * Q;
    this.blur = o.blur != null ? o.blur : (this.look === 'proj' ? 0.35 : 0.12);
    this.sc = canvas(this.mw, this.mh); this.fc = canvas(this.fw, this.fh);
    this.fimg = this.fc.getContext('2d').createImageData(this.fw, this.fh);
    var n = this.fw * this.fh;
    this.cur = new Float32Array(n); this.to = new Float32Array(n); this.from = new Float32Array(n); this.t0 = new Float32Array(n); this.d = new Float32Array(n);
    this.noise = noise(this.fw, this.fh, 7, Math.max(4, this.cols * 1.6));
    this.mask = null; this.raf = 0; this.anim = false; this.onFrame = o.onFrame || null;
  }
  FogView.prototype.size = function (w, h) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), sc = Math.min(dpr, Math.sqrt(4.2e6 / Math.max(1, w * h)));
    this.cv.width = Math.max(1, Math.round(w * sc)); this.cv.height = Math.max(1, Math.round(h * sc));
    this.paint();
  };
  // Target field from a mask: covered sub-squares are opaque, upscaled with smoothing.
  FogView.prototype.field = function (m) {
    var sx = this.sc.getContext('2d'), img = sx.createImageData(this.mw, this.mh);
    for (var i = 0; i < m.length; i++) img.data[i * 4 + 3] = m[i] ? 0 : 255;
    sx.putImageData(img, 0, 0);
    var fx = this.fc.getContext('2d'); fx.clearRect(0, 0, this.fw, this.fh); fx.imageSmoothingEnabled = true; try { fx.imageSmoothingQuality = 'high'; } catch (e) {}
    // edge pixels clamp to the border so the board edge doesn't feather in
    fx.drawImage(this.sc, 0, 0, this.mw, this.mh, 0, 0, this.fw, this.fh);
    var d = fx.getImageData(0, 0, this.fw, this.fh).data, out = new Float32Array(this.fw * this.fh);
    for (var k = 0; k < out.length; k++) out[k] = d[k * 4 + 3] / 255;
    return out;
  };
  // opts: { instant, dur (ms), origin: [x, y] in squares | 'left' }
  FogView.prototype.set = function (m, opts) {
    opts = opts || {};
    var tgt = this.field(m), first = !this.mask, now = performance.now();
    this.mask = m;
    if (first || opts.instant || reduced()) {
      if (!first && reduced() && !opts.instant) { this.fadeAll(tgt, 80); return; }
      this.cur.set(tgt); this.to.set(tgt); this.anim = false; this.paint(); return;
    }
    var dur = opts.dur || 350, fw = this.fw, fh = this.fh, org = opts.origin, spread = dur * 0.45, pd = dur - spread;
    var ox = 0, oy = 0, maxD = 1;
    if (org === 'left') maxD = fw; else if (org) { ox = org[0] * Q; oy = org[1] * Q; maxD = Math.max(Math.hypot(ox, oy), Math.hypot(fw - ox, oy), Math.hypot(ox, fh - oy), Math.hypot(fw - ox, fh - oy)); }
    var any = false;
    for (var i = 0; i < tgt.length; i++) {
      if (Math.abs(tgt[i] - this.to[i]) < 0.004) continue;
      var x = i % fw, y = (i / fw) | 0, dl = 0;
      if (org === 'left') dl = x / maxD; else if (org) dl = Math.hypot(x - ox, y - oy) / maxD;
      this.from[i] = this.cur[i]; this.to[i] = tgt[i]; this.t0[i] = now + (org ? dl * spread : 0); this.d[i] = org ? pd : dur; any = true;
    }
    if (any) this.go();
  };
  FogView.prototype.fadeAll = function (tgt, ms) { var now = performance.now(); for (var i = 0; i < tgt.length; i++) { this.from[i] = this.cur[i]; this.to[i] = tgt[i]; this.t0[i] = now; this.d[i] = ms; } this.go(); };
  FogView.prototype.go = function () { if (this.anim) return; this.anim = true; var me = this; var step = function () { if (!me.anim) return; me.tick(); if (me.anim) me.raf = requestAnimationFrame(step); }; this.raf = requestAnimationFrame(step); };
  FogView.prototype.stop = function () { this.anim = false; if (this.raf) cancelAnimationFrame(this.raf); };
  FogView.prototype.tick = function () {
    var now = performance.now(), busy = false, c = this.cur, n = this.noise, red = reduced();
    for (var i = 0; i < c.length; i++) {
      var to = this.to[i]; if (c[i] === to) continue;
      var q = (now - this.t0[i]) / (this.d[i] || 1);
      if (q >= 1) { c[i] = to; continue; }
      busy = true; if (q <= 0) continue;
      // noise threshold: each pixel switches when the sweep passes its noise value, with a soft band
      var th = red ? 0 : n[i] * 0.62, s = (q - th) / 0.38; s = s < 0 ? 0 : s > 1 ? 1 : s * s * (3 - 2 * s);
      c[i] = this.from[i] + (to - this.from[i]) * s;
    }
    this.paint();
    if (!busy) this.anim = false;
    if (this.onFrame) this.onFrame();
  };
  FogView.prototype.paint = function () {
    var cv = this.cv, W = cv.width, H = cv.height; if (!W || !H) return;
    var d = this.fimg.data, c = this.cur;
    for (var i = 0; i < c.length; i++) d[i * 4 + 3] = c[i] * 255;
    var fx = this.fc.getContext('2d'); fx.putImageData(this.fimg, 0, 0);
    var x = cv.getContext('2d'), cellPx = W / this.cols;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
    x.imageSmoothingEnabled = true;
    var bl = this.blur * cellPx, pad = Math.ceil(bl * 3);
    if (canFilter && bl > 0.5) x.filter = 'blur(' + bl.toFixed(1) + 'px)';
    // draw a little past the edges so the blur doesn't thin the fog at the board's border
    x.drawImage(this.fc, 0, 0, this.fw, this.fh, 0, 0, W, H);
    if (pad) { x.drawImage(this.fc, 0, 0, 1, this.fh, -pad, 0, pad, H); x.drawImage(this.fc, this.fw - 1, 0, 1, this.fh, W, 0, pad, H); x.drawImage(this.fc, 0, 0, this.fw, 1, 0, -pad, W, pad); x.drawImage(this.fc, 0, this.fh - 1, this.fw, 1, 0, H, W, pad); }
    x.filter = 'none';
    x.globalCompositeOperation = 'source-in';
    if (this.look === 'proj') {
      var p = x.createPattern(texture('proj'), 'repeat'), k = cellPx * 2.6 / 192;
      if (p.setTransform && root.DOMMatrix) p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
      x.fillStyle = p; x.fillRect(0, 0, W, H);
    } else {
      x.fillStyle = 'rgba(12,10,22,0.68)'; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-atop';
      var hp = x.createPattern(texture('dm'), 'repeat'), hk = Math.max(1, cellPx / 48);
      if (hp.setTransform && root.DOMMatrix) hp.setTransform(new DOMMatrix([hk, 0, 0, hk, 0, 0]));
      x.fillStyle = hp; x.fillRect(0, 0, W, H);
    }
    x.restore();
  };
  // Fog amount (0..1) the target mask puts over a point, in squares.
  FogView.prototype.coverAt = function (px, py) { return coverAt(this.mask, this.mw, this.mh, px, py); };
  function coverAt(m, mw, mh, px, py) { if (!m) return 0; var x = Math.max(0, Math.min(mw - 1, Math.floor(px * F))), y = Math.max(0, Math.min(mh - 1, Math.floor(py * F))); return m[y * mw + x] ? 0 : 1; }
  // Is a token (top-left x, y, span squares) hidden by fog? Hidden unless some of its middle is clear.
  function tokenHidden(m, mw, mh, x, y, span) {
    if (!m) return false; span = span || 1;
    var x0 = Math.floor((x + span * 0.2) * F), x1 = Math.ceil((x + span * 0.8) * F), y0 = Math.floor((y + span * 0.2) * F), y1 = Math.ceil((y + span * 0.8) * F), clear = 0, tot = 0;
    for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { if (xx < 0 || yy < 0 || xx >= mw || yy >= mh) continue; tot++; if (m[yy * mw + xx]) clear++; }
    return tot ? clear / tot < 0.5 : true;
  }
  root.HearthFogLib = { F: F, decode: decode, encode: encode, FogView: FogView, coverAt: coverAt, tokenHidden: tokenHidden, texture: texture };
}
if (typeof window !== 'undefined') { hearthFogLib(window); window.hearthFogLibSource = hearthFogLib.toString(); }
