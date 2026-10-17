/* HearthEffects v1 - condition badges + spell area overlays. Original work (Jenny, Hearth Art Director). No dependencies, offline. */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  // type palettes: [light, dark]
  var T = {
    sense:  ['#5d84b8', '#1c3157'], mind: ['#c25aa0', '#4a1640'], fear: ['#8a5cc8', '#2c1652'],
    body:   ['#c98a3e', '#4d2c0c'], ctrl: ['#7b6fb0', '#251d48'], stone: ['#9a948a', '#3a3631'],
    poison: ['#6fae3a', '#1f3d10'], exh: ['#e0782e', '#5a1f06'], buff: ['#3aa6a0', '#0d3a38'],
    holy:   ['#e5b93e', '#5c3f08'], rage: ['#d94a32', '#4f0d06'], blood: ['#c42a2a', '#3d0606'],
    dead:   ['#4a4440', '#0b0908'], hex: ['#a63cc0', '#2e0838'], focus: ['#4f9de0', '#0d2a4d'], sleep: ['#5a6aa0', '#151b38']
  };
  // glyphs drawn in a 64 box, centre 32; 's' = stroke paths, 'f' = filled paths
  var G = {
    blinded:   { t: 'sense', s: 'M14 32 Q32 16 50 32 Q32 48 14 32 Z M16 48 L48 16', f: '<circle cx="32" cy="32" r="5"/>' },
    charmed:   { t: 'mind',  f: '<path d="M32 48 L17 33 A8 8 0 0 1 32 22 A8 8 0 0 1 47 33 Z"/>' },
    deafened:  { t: 'sense', s: 'M44 18 L18 46', f: '<path d="M16 27 H23 L33 18 V46 L23 37 H16 Z"/>', s2: 'M39 25 Q44 32 39 39 M44 21 Q51 32 44 43' },
    frightened:{ t: 'fear',  f: '<ellipse cx="25" cy="27" rx="4.5" ry="6.5"/><ellipse cx="39" cy="27" rx="4.5" ry="6.5"/><ellipse cx="32" cy="42" rx="5" ry="6"/>' },
    grappled:  { t: 'body',  s: 'M24 21 A11 11 0 1 1 23.9 21 M40 21 A11 11 0 1 1 39.9 21' },
    incapacitated: { t: 'ctrl', s: 'M32 15 A17 17 0 1 1 31.9 15 M20 20 L44 44' },
    invisible: { t: 'sense', s: 'M32 16 a6 6 0 1 1 -0.1 0 M20 48 Q20 30 32 30 Q44 30 44 48', dash: '4 4' },
    paralyzed: { t: 'ctrl',  f: '<path d="M36 12 L18 36 H30 L26 52 L46 27 H34 Z"/>' },
    petrified: { t: 'stone', f: '<path d="M18 22 L32 14 L46 22 V42 L32 50 L18 42 Z"/>', s2: 'M32 14 L29 28 L36 34 L31 50 M18 32 L29 28', dark: 1 },
    poisoned:  { t: 'poison',f: '<path d="M32 13 C40 26 45 32 45 39 A13 13 0 0 1 19 39 C19 32 24 26 32 13 Z"/>', s2: 'M27 40 a3 3 0 1 0 0.1 0 M36 34 a2 2 0 1 0 0.1 0', dark: 1 },
    prone:     { t: 'body',  s: 'M27 34 H48 M12 46 H52', f: '<circle cx="18" cy="33" r="6"/>' },
    restrained:{ t: 'body',  s: 'M21 30 V24 a11 11 0 0 1 22 0 V30', f: '<rect x="16" y="30" width="32" height="20" rx="3"/>', s2: 'M32 37 V43', dark: 1 },
    stunned:   { t: 'ctrl',  f: '<path d="M32 12 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z M16 34 l2 4 4 .6 -3 3 .7 4 -3.7 -2 -3.7 2 .7 -4 -3 -3 4 -.6z M48 34 l2 4 4 .6 -3 3 .7 4 -3.7 -2 -3.7 2 .7 -4 -3 -3 4 -.6z"/>' },
    unconscious:{ t: 'sleep',s: 'M16 22 H30 L16 38 H30 M36 34 H48 L36 48 H48' },
    concentrating:{ t: 'focus', s: 'M32 14 A18 18 0 1 1 31.9 14 M32 23 A9 9 0 1 1 31.9 23', f: '<circle cx="32" cy="32" r="3.5"/>' },
    bloodied:  { t: 'blood', f: '<path d="M32 12 C41 26 46 33 46 40 A14 14 0 0 1 18 40 C18 33 23 26 32 12 Z"/>', s2: 'M25 39 Q25 46 31 47', dark: 1 },
    dead:      { t: 'dead',  f: '<path d="M32 13 A16 15 0 0 1 48 28 V36 L42 40 V48 H22 V40 L16 36 V28 A16 15 0 0 1 32 13 Z"/>', s2: '', holes: '<circle cx="25" cy="30" r="4.5"/><circle cx="39" cy="30" r="4.5"/><path d="M32 35 L29 41 H35 Z"/><path d="M27 44 V48 M32 44 V48 M37 44 V48" stroke-width="2.5"/>' },
    raging:    { t: 'rage',  s: 'M18 18 Q26 32 22 48 M30 15 Q38 32 33 50 M42 18 Q50 32 46 48' },
    hasted:    { t: 'buff',  s: 'M16 18 L30 32 L16 46 M32 18 L46 32 L32 46' },
    blessed:   { t: 'holy',  s: 'M20 16 a12 4.5 0 1 0 24 0 a12 4.5 0 1 0 -24 0', f: '<path d="M32 22 L36 34 L48 38 L36 42 L32 54 L28 42 L16 38 L28 34 Z"/>' },
    hex:       { t: 'hex',   s: 'M32 14 L42.6 46.6 L14.9 26.4 H49.1 L21.4 46.6 Z' }
  };
  // v1.1 small-size (<=24px) glyph overrides
  G.concentrating.sm = { t: 'focus', f: '<path d="M16 26 L24 15 H40 L48 26 L32 51 Z"/>', s2: 'M16 26 H48 M24 15 L32 26 L40 15 M32 26 V48', dark: 1 };
  G.incapacitated.sm = { t: 'ctrl', f: '<circle cx="32" cy="32" r="17"/>', s2: 'M21 21 L43 43', dark: 1 };
  G.petrified.sm = { t: 'stone', f: '<rect x="15" y="16" width="34" height="32" rx="3"/>', s2: 'M33 16 L28 30 L37 36 L32 48', dark: 1 };
  G.prone.sm = { t: 'body', s: 'M12 48 H52', f: '<circle cx="18" cy="33" r="7"/><rect x="27" y="28" width="24" height="11" rx="5"/>' };
  G.marked = G.hex;
  var CREAM = '#fff4dc', INK = '#120a05';
  function exhaustion(n) { return { t: 'exh', n: n }; }
  function key(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var ALIAS = { hexmarked: 'hex', huntersmark: 'marked', concentration: 'concentrating', haste: 'hasted', bless: 'blessed', rage: 'raging', poison: 'poisoned', unconcious: 'unconscious' };
  function lookup(name) {
    var k = key(name); k = ALIAS[k] || k;
    var m = k.match(/^exhaust(?:ion|ed)?(\d)$/); if (m) return exhaustion(Math.min(6, Math.max(1, +m[1])));
    return G[k] || null;
  }
  var uid = 0;
  /* svgString(name, size) -> standalone SVG markup. Small sizes (<=24) get a thinner rim and bolder glyph. */
  function svgString(name, size) {
    size = size || 48; var g = lookup(name); if (!g) return null;
    var small = size <= 24; if (small && g.sm) g = g.sm; var id = 'he' + (++uid), c = T[g.t];
    var sw = small ? 7 : 5.2, rimW = small ? 5 : 6, out = small ? 3.2 : 2.6;
    var glyphR = small ? 25 : 24;
    var gl = '';
    if (g.n) {
      var pips = ''; for (var i = 0; i < 6; i++) pips += '<circle cx="' + (17 + i * 6) + '" cy="47" r="' + (small ? 2.4 : 2.1) + '" fill="' + (i < g.n ? CREAM : 'rgba(0,0,0,.45)') + '"/>';
      gl = '<text x="32" y="' + (small ? 41 : 40) + '" text-anchor="middle" font-family="Georgia,\'Noto Serif\',serif" font-weight="900" font-size="' + (small ? 32 : 28) + '" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="' + out + '" paint-order="stroke">' + g.n + '</text>' + (small ? '' : pips);
    } else {
      // outline pass (dark halo) then cream pass, so glyphs read on any token art
      var sAll = (g.s || '') + ' ' + (g.s2 && !g.dark ? g.s2 : '');
      var dash = g.dash ? ' stroke-dasharray="' + g.dash + '"' : '';
      var halo = '<g fill="' + INK + '" stroke="' + INK + '" stroke-width="' + (out * 2) + '" stroke-linejoin="round" stroke-linecap="round">' + (g.f || '') + '</g>' +
        (sAll.trim() ? '<path d="' + sAll + '" fill="none" stroke="' + INK + '" stroke-width="' + (sw + out * 2) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '');
      var body = '<g fill="' + CREAM + '">' + (g.f || '') + '</g>' +
        (sAll.trim() ? '<path d="' + sAll + '" fill="none" stroke="' + CREAM + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' + (small ? '' : dash) + '/>' : '') +
        (g.dark && g.s2 ? '<path d="' + g.s2 + '" fill="none" stroke="' + c[1] + '" stroke-width="' + (small ? 4.5 : 3) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
        (g.holes ? '<g fill="' + c[1] + '" stroke="' + c[1] + '">' + g.holes + '</g>' : '');
      gl = '<g transform="translate(32 32) scale(' + (glyphR / 24).toFixed(3) + ') translate(-32 -32)">' + halo + body + '</g>';
    }
    var rimR = 32 - rimW / 2 - 0.5;
    return '<svg xmlns="' + NS + '" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" class="he-badge">' +
      '<defs><radialGradient id="' + id + 'f" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".45" stop-color="#c9993f"/><stop offset="1" stop-color="#5a3c14"/></linearGradient></defs>' +
      '<circle cx="32" cy="32" r="31.5" fill="' + INK + '"/>' +
      '<circle cx="32" cy="32" r="' + rimR + '" fill="url(#' + id + 'f)" stroke="url(#' + id + 'r)" stroke-width="' + rimW + '"/>' +
      (small ? '' : '<circle cx="32" cy="32" r="' + (rimR - rimW / 2 - 0.6) + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/><path d="M14 22 A20 20 0 0 1 40 12" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-linecap="round"/>') +
      gl + '</svg>';
  }
  function createConditionBadge(name, size) {
    var s = svgString(name, size); if (!s) return null;
    var d = document.createElement('span'); d.className = 'he-badge-wrap'; d.title = String(name);
    d.setAttribute('role', 'img'); d.setAttribute('aria-label', String(name));
    d.style.cssText = 'display:inline-block;line-height:0;width:' + (size || 48) + 'px;height:' + (size || 48) + 'px';
    d.innerHTML = s; return d;
  }
  var NAMES = ['blinded','charmed','deafened','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious','exhaustion1','exhaustion2','exhaustion3','exhaustion4','exhaustion5','exhaustion6','concentrating','bloodied','dead','raging','hasted','blessed','hex'];

  /* ---------------- spell area overlays ---------------- */
  // element: [core rgb, edge rgb, deep rgb, flow speed, style]
  var EL = {
    fire:      [[255,170,60],[255,90,20],[120,20,0], 1.0, 'rise'],
    cold:      [[200,240,255],[120,200,255],[20,60,120], 0.35, 'frost'],
    lightning: [[230,240,255],[140,170,255],[30,30,110], 1.6, 'arc'],
    acid:      [[200,255,90],[120,210,40],[30,70,0], 0.5, 'bubble'],
    poison:    [[170,220,110],[90,150,60],[30,50,20], 0.4, 'smoke'],
    necrotic:  [[150,230,170],[60,120,90],[15,15,25], 0.45, 'smoke'],
    radiant:   [[255,248,200],[255,210,90],[140,90,10], 0.6, 'rays'],
    force:     [[220,190,255],[150,100,240],[40,10,90], 0.7, 'runes'],
    thunder:   [[210,220,240],[130,150,200],[30,40,70], 1.2, 'rings']
  };
  // value-noise tile (seamless) per element, built once, cached
  var tileCache = {};
  function hash(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noiseTile(el) {
    if (tileCache[el]) return tileCache[el];
    var N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
    var cx = cv.getContext('2d'), img = cx.createImageData(N, N), E = EL[el];
    function vn(x, y, p, s) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash(xi % p, yi % p, s), b = hash((xi + 1) % p, yi % p, s), c = hash(xi % p, (yi + 1) % p, s), d = hash((xi + 1) % p, (yi + 1) % p, s);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var n = 0, amp = .5, f = 4;
      for (var o = 0; o < 4; o++) { n += amp * vn(x / N * f, y / N * f, f, o + 7); amp *= .5; f *= 2; }
      if (E[4] === 'arc' || E[4] === 'frost') n = 1 - Math.abs(n * 2 - 1); // ridged
      var t = Math.min(1, Math.max(0, (n - .25) / .6)), i = (y * N + x) * 4, A = E[2], B = E[1], C = E[0];
      var k = t < .5 ? t * 2 : (t - .5) * 2, P = t < .5 ? A : B, Q = t < .5 ? B : C;
      img.data[i] = P[0] + (Q[0] - P[0]) * k; img.data[i + 1] = P[1] + (Q[1] - P[1]) * k; img.data[i + 2] = P[2] + (Q[2] - P[2]) * k;
      img.data[i + 3] = 255 * (0.35 + 0.65 * t);
    }
    cx.putImageData(img, 0, 0); return (tileCache[el] = cv);
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* createAreaOverlay({shape, size, element, angle, gridPx, width, cellFt})
     shape: 'sphere'|'circle'|'cone'|'line'|'cube'|'square'|'cylinder'|'wall'
     size: feet (radius for sphere/circle/cylinder, length for cone/line/wall, side for cube)
     width: feet for line (default 5) / wall (default 5; use 1 for thin walls)
     angle: degrees, 0 = pointing right (cone, line, wall). Origin = canvas.origin {x,y} in px.
     gridPx: px per 5-ft cell (default 64). Returns a <canvas class="he-ov"> with
     .origin, .start(), .stop(), .destroy(), .renderAt(tSeconds). Position it so origin sits on the caster/point. */
  function createAreaOverlay(o) {
    o = o || {}; var shape = (o.shape || 'sphere').toLowerCase(); if (shape === 'circle') shape = 'sphere'; if (shape === 'square') shape = 'cube';
    var el = EL[o.element] ? o.element : 'fire', E = EL[el], gp = o.gridPx || 64, cell = o.cellFt || 5, px = gp / cell;
    var L = (o.size || 20) * px, W = (o.width || 5) * px, ang = (o.angle || 0) * Math.PI / 180, pad = Math.round(gp * .35);
    var bw, bh, ox, oy;
    if (shape === 'sphere' || shape === 'cylinder') { bw = bh = 2 * L + 2 * pad; ox = oy = L + pad; }
    else if (shape === 'cube') { bw = bh = L + 2 * pad; ox = oy = pad; }
    else { bw = bh = 2 * L + 2 * pad; ox = oy = L + pad; } // cone/line/wall rotate about origin
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var cv = document.createElement('canvas'); cv.className = 'he-ov he-ov-' + shape + ' he-el-' + el;
    cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr); cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
    cv.style.pointerEvents = 'none'; cv.origin = { x: ox, y: oy };
    var cx = cv.getContext('2d'), tile = noiseTile(el), pat = null;
    function path() {
      cx.beginPath();
      if (shape === 'sphere' || shape === 'cylinder') cx.arc(ox, oy, L, 0, Math.PI * 2);
      else if (shape === 'cube') cx.rect(ox, oy, L, L);
      else { cx.save(); cx.translate(ox, oy); cx.rotate(ang);
        if (shape === 'cone') { var h = L / 2; cx.moveTo(0, 0); cx.lineTo(L, -h); cx.quadraticCurveTo(L * 1.04, 0, L, h); cx.closePath(); }
        else if (shape === 'line') cx.rect(0, -W / 2, L, W);
        else cx.rect(-L / 2, -W / 2, L, W); // wall centred on origin
        cx.restore(); }
    }
    function rnd(i, t) { return hash(i, Math.floor(t), 99); }
    function draw(t) {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, bw, bh);
      if (!pat) pat = cx.createPattern(tile, 'repeat');
      var sp = E[3], st = E[4];
      cx.save(); path(); cx.clip();
      // base wash
      cx.fillStyle = rgba(E[2], .18); cx.fillRect(0, 0, bw, bh);
      // two drifting noise layers (painted flow)
      cx.globalCompositeOperation = 'lighter';
      var s1 = gp / 40, dx = t * 18 * sp, dy = st === 'rise' ? -t * 30 * sp : t * 9 * sp;
      for (var l = 0; l < 2; l++) {
        cx.save(); cx.globalAlpha = l ? .14 : .20; cx.scale(s1 * (l ? 1.7 : 1), s1 * (l ? 1.7 : 1));
        cx.translate((l ? -dx * .6 : dx) % 128, (l ? dy * .5 : dy) % 128); cx.fillStyle = pat; cx.fillRect(-256, -256, bw / s1 + 512, bh / s1 + 512); cx.restore();
      }
      cx.globalCompositeOperation = 'source-over';
      // element accents
      var cxm = shape === 'cube' ? ox + L / 2 : ox, cym = shape === 'cube' ? oy + L / 2 : oy;
      if (st === 'rings') { for (var r = 0; r < 3; r++) { var ph = ((t * .7 + r / 3) % 1); cx.strokeStyle = rgba(E[0], .45 * (1 - ph)); cx.lineWidth = gp * .12;
        cx.beginPath(); cx.arc(cxm, cym, ph * L * 1.5, 0, 7); cx.stroke(); } }
      if (st === 'rays') { cx.save(); cx.translate(cxm, cym); cx.rotate(t * .15); for (var q = 0; q < 12; q++) { cx.rotate(Math.PI / 6);
        var g = cx.createLinearGradient(0, 0, L * 1.4, 0); g.addColorStop(0, rgba(E[0], .35)); g.addColorStop(1, rgba(E[0], 0));
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(L * 1.4, -gp * .25); cx.lineTo(L * 1.4, gp * .25); cx.fill(); } cx.restore(); }
      if (st === 'arc') { var fr = t * 9; for (var a = 0; a < 3; a++) { if (rnd(a, fr) < .35) continue; cx.strokeStyle = rgba(E[0], .85); cx.lineWidth = Math.max(1.5, gp * .035);
        cx.shadowColor = rgba(E[1], 1); cx.shadowBlur = gp * .2; cx.beginPath();
        var x = rnd(a + 10, fr) * bw, y = rnd(a + 20, fr) * bh; cx.moveTo(x, y);
        for (var k2 = 0; k2 < 7; k2++) { x += (rnd(a * 31 + k2, fr) - .5) * gp * 1.4; y += (rnd(a * 17 + k2 + 50, fr) - .5) * gp * 1.4; cx.lineTo(x, y); } cx.stroke(); cx.shadowBlur = 0; } }
      if (st === 'bubble' || st === 'rise') { var n = Math.round(bw * bh / (gp * gp) * 1.2);
        for (var b = 0; b < n; b++) { var life = (t * (st === 'rise' ? .9 : .4) + hash(b, 3, 5)) % 1, bx = hash(b, 1, 5) * bw, by = hash(b, 2, 5) * bh - (st === 'rise' ? life * gp : 0);
          cx.fillStyle = rgba(E[0], .5 * Math.sin(life * Math.PI)); cx.beginPath(); cx.arc(bx, by, gp * (st === 'rise' ? .04 : .07) * (0.5 + life), 0, 7); cx.fill(); } }
      if (st === 'runes') { cx.save(); cx.translate(cxm, cym); cx.rotate(t * .25); cx.strokeStyle = rgba(E[0], .4); cx.lineWidth = gp * .04;
        var rr = shape === 'sphere' || shape === 'cylinder' || shape === 'cube' ? (shape === 'cube' ? L * .42 : L * .82) : gp * .8;
        cx.setLineDash([gp * .18, gp * .12]); cx.beginPath(); cx.arc(0, 0, rr, 0, 7); cx.stroke(); cx.setLineDash([]);
        for (var p = 0; p < 6; p++) { cx.rotate(Math.PI / 3); cx.beginPath(); cx.moveTo(rr * .9, -gp * .08); cx.lineTo(rr * .78, 0); cx.lineTo(rr * .9, gp * .08); cx.stroke(); } cx.restore(); }
      if (st === 'frost') { cx.strokeStyle = rgba(E[0], .35); cx.lineWidth = Math.max(1, gp * .02);
        for (var f = 0; f < 10; f++) { var fx = hash(f, 7, 1) * bw, fy = hash(f, 8, 1) * bh, s = gp * .18 * (.8 + .2 * Math.sin(t + f));
          for (var sp6 = 0; sp6 < 3; sp6++) { var aa = sp6 * Math.PI / 3; cx.beginPath(); cx.moveTo(fx - Math.cos(aa) * s, fy - Math.sin(aa) * s); cx.lineTo(fx + Math.cos(aa) * s, fy + Math.sin(aa) * s); cx.stroke(); } } }
      // inner edge glow
      path(); cx.strokeStyle = rgba(E[1], .45); cx.lineWidth = gp * .3; cx.stroke();
      cx.restore();
      // brass-tinted crisp rim so the rules edge is unambiguous on the grid
      path(); cx.lineWidth = Math.max(1.5, gp * .04); cx.strokeStyle = rgba(E[0], .9); cx.setLineDash(st === 'runes' ? [gp * .15, gp * .08] : []); cx.stroke(); cx.setLineDash([]);
      if (shape === 'cylinder') { cx.save(); cx.strokeStyle = rgba(E[0], .5); cx.lineWidth = gp * .05; cx.beginPath(); cx.arc(ox, oy, L * .72, 0, 7); cx.stroke();
        cx.globalAlpha = .25; cx.beginPath(); cx.arc(ox, oy, L * .45, 0, 7); cx.stroke(); cx.restore(); }
      if (shape === 'cone' || shape === 'line') { cx.fillStyle = '#f3d58a'; cx.strokeStyle = '#120a05'; cx.lineWidth = 2; cx.beginPath(); cx.arc(ox, oy, gp * .09, 0, 7); cx.fill(); cx.stroke(); }
    }
    // lifecycle: 30fps (15 on low-core devices), stops when hidden/off-screen, static on reduced motion
    var raf = 0, running = false, visible = true, last = 0, t0 = performance.now(), fps = (navigator.hardwareConcurrency || 4) <= 2 ? 15 : 30;
    var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    function reduced() { return mq.matches || (root.HearthEffects && root.HearthEffects.animationsOff); }
    function loop(now) { raf = 0; if (!running) return; if (now - last >= 1000 / fps - 2) { last = now; draw((now - t0) / 1000); } if (visible && !document.hidden && !reduced()) raf = requestAnimationFrame(loop); }
    function kick() { if (running && !raf && visible && !document.hidden && !reduced()) raf = requestAnimationFrame(loop); }
    var io = root.IntersectionObserver ? new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }) : null;
    function onVis() { kick(); }
    cv.start = function () { running = true; draw(reduced() ? 1.3 : (performance.now() - t0) / 1000); if (io) io.observe(cv); document.addEventListener('visibilitychange', onVis); if (mq.addEventListener) mq.addEventListener('change', onVis); kick(); return cv; };
    cv.stop = function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    cv.destroy = function () { cv.stop(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); if (mq.removeEventListener) mq.removeEventListener('change', onVis); };
    cv.renderAt = function (t) { draw(t); };
    draw(1.3);
    if (o.autostart !== false) cv.start();
    return cv;
  }
  root.HearthEffects = { version: '1.1.0', createConditionBadge: createConditionBadge, conditionSVG: svgString, conditions: NAMES.slice(),
    createAreaOverlay: createAreaOverlay, elements: Object.keys(EL), shapes: ['sphere','circle','cone','line','cube','square','cylinder','wall'], animationsOff: false };
})(typeof window !== 'undefined' ? window : this);
