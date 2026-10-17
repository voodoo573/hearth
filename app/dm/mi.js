/* Hearth v1.7.0 — map interactions on the C2 DM screen (design: Jenny,
   /jenny-art/map-interactions/SPEC.md + MOTION.md):
   1. Area templates: the AoE fan (shape, size dial, undo, delete, snap, show players),
      on-map handles (✥ move, ◆ resize, ⟳ aim), and a live label on every shape
      (shape · size · creatures inside); creatures inside get an ember ring.
   2. Token movement: lift, ghost, a gold path through the snapped squares, reach tint,
      a distance chip with difficult terrain, waypoints, cancel, and an undo toast.
   3. Fog of war: brush / area / room tools that clear or cover, reveal all / re-cover all,
      undo / redo with a history list, a live projector preview, soft alpha-mask fog.
   The board, ids and data attributes are the classic battle map's (wireDMMap); this file
   adds layers on top and owns the gestures while one of its tools is open. */
(function () {
  'use strict';
  var W = window, F = 4;
  var FIRE = '#e8552d'; // ember orange: fixed on purpose, it means "area of effect" in every theme
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function U() { return state.ui; }
  function wide() { return W.innerWidth >= 900; }
  function FL() { return W.HearthFogLib; }
  function reduced() { try { return (W.hearthReducedMotion && W.hearthReducedMotion()) || W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function dims(enc) { return { cols: enc.mapCols || 20, rows: enc.mapRows || 15 }; }
  function find(enc, id) { return (enc.combatants || []).find(function (c) { return c.id === id; }); }
  function spanOf(c) { if (!c || c.kind === 'player') return 1; try { return tokenFootprint(tokenSize({ monsterId: c.monsterId, isBoss: !!c.isBoss, size: c.size })) || 1; } catch (e) { return 1; } }
  function active() { return !!(W.HearthC2 && document.querySelector('.c2 #dmMapGrid')); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function vibrate(ms) { try { if (navigator.vibrate && !wide()) navigator.vibrate(ms); } catch (e) {} }

  // =====================================================================
  // Fog model: enc.fog = { on, revealed: ['x,y'], mask: base64 bits, mw, mh, fx }
  // `revealed` stays the per-square list every older feature reads; it is
  // derived from the mask (a square counts as revealed when half of it is clear).
  // =====================================================================
  function fillCell(m, mw, x, y, v) { for (var j = 0; j < F; j++) for (var i = 0; i < F; i++) m[(y * F + j) * mw + x * F + i] = v; }
  function derived(m, d) {
    var mw = d.cols * F, out = [];
    for (var y = 0; y < d.rows; y++) for (var x = 0; x < d.cols; x++) {
      var s = 0; for (var j = 0; j < F; j++) for (var i = 0; i < F; i++) s += m[(y * F + j) * mw + x * F + i];
      if (s * 2 >= F * F) out.push(x + ',' + y);
    }
    return out;
  }
  function fogMask(enc) {
    var f = enc && enc.fog, d = dims(enc);
    if (!f || !f.mask || f.mw !== d.cols * F || f.mh !== d.rows * F || !FL()) return null;
    return FL().decode(f.mask, f.mw * f.mh);
  }
  function maskFromRevealed(enc) {
    var d = dims(enc), mw = d.cols * F, m = new Uint8Array(mw * d.rows * F);
    ((enc.fog && enc.fog.revealed) || []).forEach(function (k) { var p = String(k).split(','), x = +p[0], y = +p[1]; if (x >= 0 && y >= 0 && x < d.cols && y < d.rows) fillCell(m, mw, x, y, 1); });
    return m;
  }
  function fogPut(enc, m) {
    var d = dims(enc);
    if (!enc.fog) enc.fog = { on: true, revealed: [] };
    enc.fog.mask = FL().encode(m); enc.fog.mw = d.cols * F; enc.fog.mh = d.rows * F; enc.fog.revealed = derived(m, d);
  }
  // Older code (vision auto-reveal, the classic brush, Reveal all) edits `revealed`;
  // fold any such change back into the mask, whole squares at a time.
  function fogSync(enc) {
    if (!enc || !enc.fog || !enc.fog.on || !FL()) return false;
    var d = dims(enc), m = fogMask(enc);
    if (!m) { fogPut(enc, maskFromRevealed(enc)); return true; }
    var want = new Set(enc.fog.revealed || []), have = new Set(derived(m, d)), mw = d.cols * F, ch = false;
    want.forEach(function (k) { if (!have.has(k)) { var p = k.split(','); if (+p[0] < d.cols && +p[1] < d.rows) { fillCell(m, mw, +p[0], +p[1], 1); ch = true; } } });
    have.forEach(function (k) { if (!want.has(k)) { var p = k.split(','); fillCell(m, mw, +p[0], +p[1], 0); ch = true; } });
    if (ch) fogPut(enc, m);
    return ch;
  }
  // Brush: every sub-square whose centre is within r squares of the segment (x0,y0)-(x1,y1).
  function stampSeg(m, d, x0, y0, x1, y1, r, v) {
    var mw = d.cols * F, mh = d.rows * F, minx = Math.max(0, Math.floor((Math.min(x0, x1) - r) * F)), maxx = Math.min(mw - 1, Math.ceil((Math.max(x0, x1) + r) * F)),
      miny = Math.max(0, Math.floor((Math.min(y0, y1) - r) * F)), maxy = Math.min(mh - 1, Math.ceil((Math.max(y0, y1) + r) * F)), dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, ch = false;
    for (var yy = miny; yy <= maxy; yy++) for (var xx = minx; xx <= maxx; xx++) {
      var px = (xx + 0.5) / F, py = (yy + 0.5) / F, t = L2 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2)) : 0;
      var qx = x0 + dx * t - px, qy = y0 + dy * t - py;
      if (qx * qx + qy * qy <= r * r) { var i = yy * mw + xx; if (m[i] !== v) { m[i] = v; ch = true; } }
    }
    return ch;
  }
  function fillRect(m, d, x0, y0, x1, y1, v) { var mw = d.cols * F; for (var y = Math.max(0, y0); y <= Math.min(d.rows - 1, y1); y++) for (var x = Math.max(0, x0); x <= Math.min(d.cols - 1, x1); x++) fillCell(m, mw, x, y, v); }

  // ----- map metadata (walls, water = difficult terrain, rooms) from painted maps
  var terr = {}, terrWaiters = [];
  function terrainFor(enc) {
    var id = typeof encPaintedId === 'function' ? encPaintedId(enc) : null; if (!id) return null;
    var d = dims(enc), k = id + '|' + d.cols + '|' + d.rows, t = terr[k];
    if (t && t !== 'pending') return t;
    if (!t && typeof loadPaintedMaps === 'function') {
      terr[k] = 'pending';
      loadPaintedMaps().then(function (H) { return H.terrain ? H.terrain(id, d.cols, d.rows) : null; })
        .then(function (r) { terr[k] = r || { wall: [], water: [], rooms: [] }; terrWaiters.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); })
        .catch(function () { terr[k] = { wall: [], water: [], rooms: [] }; });
    }
    return null;
  }
  function difficultAt(t, d, x, y, span) {
    if (!t || !t.water) return false;
    for (var j = 0; j < span; j++) for (var i = 0; i < span; i++) { var X = x + i, Y = y + j; if (X < d.cols && Y < d.rows && t.water[Y * d.cols + X]) return true; }
    return false;
  }

  // =====================================================================
  // Templates: geometry, creatures inside, labels
  // =====================================================================
  var HALF = Math.atan(0.5); // 5e cone: width at any distance equals that distance
  function geo(a, enc) { var p = (enc && typeof resolveAoePos === 'function') ? resolveAoePos(a, enc) : { x: a.x, y: a.y }; return { kind: a.kind, x: p.x, y: p.y, len: a.len || 1, ang: a.angle || 0 }; }
  function insideG(g, px, py) {
    var e = 1e-6;
    if (g.kind === 'circle') return Math.hypot(px - g.x, py - g.y) <= g.len + e;
    if (g.kind === 'square') return px >= g.x - e && px <= g.x + g.len + e && py >= g.y - e && py <= g.y + g.len + e;
    var dx = px - g.x, dy = py - g.y, c = Math.cos(g.ang), s = Math.sin(g.ang), t = dx * c + dy * s, n = -dx * s + dy * c;
    if (g.kind === 'line') return t >= -e && t <= g.len + e && Math.abs(n) <= 0.5 + e;
    return t > e && t <= g.len + e && Math.abs(n) <= t * 0.5 + e;
  }
  function originId(a, enc) {
    if (a.attachedTo) return a.attachedTo;
    if (a.from) return a.from;
    if (a.kind !== 'cone' && a.kind !== 'line') return null;
    var hit = (enc.combatants || []).find(function (c) { if (c.mapX == null) return false; var s = spanOf(c); return a.x >= c.mapX && a.x <= c.mapX + s && a.y >= c.mapY && a.y <= c.mapY + s; });
    return hit ? hit.id : null;
  }
  // A creature is caught when the centre of any square it fills is inside.
  function hits(a, enc) {
    var g = geo(a, enc), org = originId(a, enc), out = [];
    (enc.combatants || []).forEach(function (c) {
      if (c.mapX == null || c.mapY == null || c.dead || c.id === org) return;
      var s = spanOf(c), hit = false;
      for (var j = 0; j < s && !hit; j++) for (var i = 0; i < s && !hit; i++) if (insideG(g, c.mapX + i + 0.5, c.mapY + j + 0.5)) hit = true;
      if (hit) out.push(c);
    });
    return out;
  }
  function deg(ang) { var d = Math.round((ang || 0) * 180 / Math.PI) % 360; return d < 0 ? d + 360 : d; }
  var KIND = { circle: 'Circle', cone: 'Cone', line: 'Line', square: 'Cube' };
  function sizeWords(a) { var ft = Math.round((a.len || 0) * 5); return a.kind === 'circle' ? ft + ' ft radius' : ft + ' ft'; }
  function labelHTML(a, n) {
    var p = ['<b>' + KIND[a.kind] + '</b>', sizeWords(a)];
    if (a.label) p.push(E(a.label)); else if (a.kind === 'cone') p.push(deg(a.angle) + '\u00b0');
    p.push('<span class="mi-hitc">' + plural(n, 'creature') + '</span>');
    if (a.pinned) p.push('<span class="mi-shown" title="Shown to players">\uD83D\uDCCD</span>');
    return p.join(' \u00b7 ');
  }
  function labelPlain(a, n) { return labelHTML(a, n).replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
  // Projector: a clean size label, no counts.
  function projLabel(a) { var ft = Math.round((a.len || 0) * 5); return a.kind === 'circle' ? ft + ' ft radius' : a.kind === 'square' ? ft + ' ft cube' : ft + ' ft ' + a.kind; }
  function colourOf(a) { return a.color || FIRE; }

  function shapeSVG(a, cell, enc, o) {
    o = o || {};
    var g = geo(a, enc), ox = g.x * cell, oy = g.y * cell, L = g.len * cell, ang = g.ang, s = '';
    if (a.kind === 'circle') s = '<circle class="s" cx="' + ox.toFixed(1) + '" cy="' + oy.toFixed(1) + '" r="' + L.toFixed(1) + '"/>';
    else if (a.kind === 'square') s = '<rect class="s" x="' + ox.toFixed(1) + '" y="' + oy.toFixed(1) + '" width="' + L.toFixed(1) + '" height="' + L.toFixed(1) + '"/>';
    else if (a.kind === 'line') { var px = -Math.sin(ang) * cell / 2, py = Math.cos(ang) * cell / 2, ex = ox + Math.cos(ang) * L, ey = oy + Math.sin(ang) * L;
      s = '<polygon class="s" points="' + [[ox + px, oy + py], [ex + px, ey + py], [ex - px, ey - py], [ox - px, oy - py]].map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>'; }
    else { var Lc = L / Math.cos(HALF), x1 = ox + Math.cos(ang - HALF) * Lc, y1 = oy + Math.sin(ang - HALF) * Lc, x2 = ox + Math.cos(ang + HALF) * Lc, y2 = oy + Math.sin(ang + HALF) * Lc;
      s = '<polygon class="s" points="' + ox.toFixed(1) + ',' + oy.toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) + '"/>'; }
    var axis = '';
    if (o.handles) {
      var hs = handlePts(a, g, cell, enc), mv = hs.filter(function (h) { return h.k === 'move'; })[0], far = hs.filter(function (h) { return h.k === (a.kind === 'circle' ? 'size' : 'aim'); })[0];
      if (mv && far && a.kind !== 'square') axis = '<line class="mi-axis" x1="' + mv.x.toFixed(1) + '" y1="' + mv.y.toFixed(1) + '" x2="' + far.x.toFixed(1) + '" y2="' + far.y.toFixed(1) + '"/>';
    }
    return '<g class="dm-aoe-shape mi-tpl k-' + a.kind + (o.sel ? ' sel' : '') + (a.pinned ? ' pinned' : '') + (o.ghost ? ' ghost' : '') + (o.pulse ? ' pulse' : '') + '" data-aoe-id="' + E(a.id) + '" style="--aoe-color:' + E(colourOf(a)) + ';">' + s + axis + '</g>';
  }
  // Handle positions in board px.
  function handlePts(a, g, cell, enc) {
    var ox = g.x * cell, oy = g.y * cell, L = g.len * cell, d = dims(enc || {}), BW = d.cols * cell, out = [];
    if (a.kind === 'circle') {
      out.push({ k: 'move', x: ox, y: oy, t: '\u2725' });
      var rx = ox + L <= BW - cell * 0.3 ? ox + L : ox - L; out.push({ k: 'size', x: rx, y: oy, t: '\u25C6' });
    } else if (a.kind === 'square') {
      out.push({ k: 'move', x: ox + L / 2, y: oy + L / 2, t: '\u2725' }); out.push({ k: 'size', x: ox + L, y: oy + L, t: '\u25C6' });
    } else {
      out.push({ k: 'move', x: ox, y: oy, t: '\u2725' });
      out.push({ k: 'aim', x: ox + Math.cos(g.ang) * L, y: oy + Math.sin(g.ang) * L, t: '\u27F3' });
      if (a.kind === 'cone') { var Lc = L / Math.cos(HALF); out.push({ k: 'size', x: ox + Math.cos(g.ang + HALF) * Lc, y: oy + Math.sin(g.ang + HALF) * Lc, t: '\u25C6' }); }
    }
    return out;
  }

  // =====================================================================
  // Live board context (reset by every render via wire())
  // =====================================================================
  var X = null; // { enc, cell, cols, rows, grid, scroll, stage, getZoom, setZoom, fitZoom, onTap, fog: FogView }
  function zoom() { return X && X.getZoom ? X.getZoom() : (U().dmMapZoom || 1); }
  function boardPt(ev) { var r = X.grid.getBoundingClientRect(), z = zoom(); return { x: (ev.clientX - r.left) / z / X.cell, y: (ev.clientY - r.top) / z / X.cell }; }
  function el(id) { return document.getElementById(id); }

  // ----- the layers dmMapBoardHTML adds on the C2 screen
  function under(enc, cell, cols, rows) {
    var fogOn = !!(enc.fog && enc.fog.on);
    return (fogOn ? '<canvas class="mi-fog" id="miFog" style="width:' + cols * cell + 'px;height:' + rows * cell + 'px" aria-hidden="true"></canvas>' : '');
  }
  function aoeGroup() { return '<g id="miAoeG"></g>'; }
  function pathLayer(cols, rows, cell) {
    return '<svg class="mi-path" id="miPath" width="' + cols * cell + '" height="' + rows * cell + '" viewBox="0 0 ' + cols * cell + ' ' + rows * cell + '" aria-hidden="true">' +
      '<defs><pattern id="miHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="9" fill="rgba(255,200,90,.5)"/></pattern></defs><g id="miPathG"></g></svg>';
  }
  function over() { return '<div class="mi-ov" id="miOv"></div>'; }

  // ----- label placement: just outside the shape, clear of tokens, handles and other labels
  function tokenBoxes(enc, cell) {
    var out = [];
    (enc.combatants || []).forEach(function (c) { if (c.mapX == null) return; var s = spanOf(c); out.push([c.mapX * cell - 2, c.mapY * cell - 2, s * cell + 4, s * cell + 14]); });
    return out;
  }
  function overlapScore(b, boxes) { var s = 0; boxes.forEach(function (q) { var ix = Math.min(b[0] + b[2], q[0] + q[2]) - Math.max(b[0], q[0]), iy = Math.min(b[1] + b[3], q[1] + q[3]) - Math.max(b[1], q[1]); if (ix > 0 && iy > 0) s += ix * iy; }); return s; }
  function placeLabel(a, g, cell, w, h, boxes, BW, BH) {
    var ox = g.x * cell, oy = g.y * cell, L = g.len * cell, c = [], cs = Math.cos(g.ang), sn = Math.sin(g.ang), gap = 8 / zoom();
    if (a.kind === 'circle') { c.push([ox, oy + L + gap + h / 2]); c.push([ox, oy - L - gap - h / 2]); c.push([ox + L + gap + w / 2, oy]); c.push([ox - L - gap - w / 2, oy]); c.push([ox + L * 0.75 + w / 2, oy + L * 0.75 + h / 2]); c.push([ox - L * 0.75 - w / 2, oy - L * 0.75 - h / 2]); }
    else if (a.kind === 'square') { c.push([ox + L / 2, oy - gap - h / 2]); c.push([ox + L / 2, oy + L + gap + h / 2]); c.push([ox + L + gap + w / 2, oy + L / 2]); c.push([ox - gap - w / 2, oy + L / 2]); }
    else {
      var tip = L + gap + Math.abs(cs) * w / 2 + Math.abs(sn) * h / 2; c.push([ox + cs * tip, oy + sn * tip]);
      [0.55, 0.8, 0.3, 1].forEach(function (f) {
        var half = (a.kind === 'cone' ? L * f * 0.5 : cell * 0.5) + gap + Math.abs(sn) * w / 2 + Math.abs(cs) * h / 2;
        c.push([ox + cs * L * f - sn * half, oy + sn * L * f + cs * half]); c.push([ox + cs * L * f + sn * half, oy + sn * L * f - cs * half]);
      });
    }
    var best = null, bs = Infinity;
    for (var i = 0; i < c.length; i++) {
      var b = [c[i][0] - w / 2, c[i][1] - h / 2, w, h], s = overlapScore(b, boxes) + i * 0.5;
      if (b[0] < 2 || b[1] < 2 || b[0] + w > BW - 2 || b[1] + h > BH - 2) s += 1e6;
      if (s < bs) { bs = s; best = c[i]; }
      if (s < 1) break;
    }
    return best || [ox, oy];
  }

  // =====================================================================
  // 1. Area templates
  // =====================================================================
  var DEF_FT = { circle: 20, cone: 15, line: 30, square: 15 };
  var aoeUndo = [];
  function A() { return U().miAoe || null; }
  function aoes() { return (X && X.enc && X.enc.aoes) || []; }
  function selAoe() { var a = A(); return a && a.sel ? aoes().find(function (t) { return t.id === a.sel; }) : null; }
  function snapAoe() { aoeUndo.push(JSON.stringify(aoes())); if (aoeUndo.length > 40) aoeUndo.shift(); }
  function commitAoes(broadcast) { saveEncounter(X.enc); if (broadcast !== false && typeof broadcastMap === 'function') broadcastMap(X.enc); }
  function turnToken(enc) {
    var ord = typeof sortedCombatants === 'function' ? sortedCombatants(enc) : [], tid = ord.length && enc.started ? (ord[dmTurnIdx(enc, ord)] || {}).id : null;
    var c = tid ? find(enc, tid) : null; return c && c.mapX != null ? c : null;
  }
  function originOf(c) { var s = spanOf(c); return { x: c.mapX + s / 2, y: c.mapY + s / 2 }; }

  function refresh() {
    if (!X || !el('miOv')) return;
    var enc = X.enc, cell = X.cell, a = A(), d = dims(enc), BW = d.cols * cell, BH = d.rows * cell, z = zoom();
    var list = aoes(), sel = a && a.sel, open = !!a;
    var g = el('miAoeG');
    var ghost = open && a.armed && a.ghost ? a.ghost : null;
    if (g) g.innerHTML = list.map(function (t) { return shapeSVG(t, cell, enc, { sel: t.id === sel, handles: open, pulse: t.id === (U().miPulse || '') }); }).join('') + (ghost ? shapeSVG(ghost, cell, enc, { ghost: true, sel: true }) : '');
    var boxes = tokenBoxes(enc, cell), html = '', hitSet = {};
    var hs = W.innerWidth < 900 ? 44 : 26, hb = (hs + 6) / z;
    if (open) list.forEach(function (t) { var b2 = t.id === sel ? hb : 32 / z; var g2 = geo(t, enc); handlePts(t, g2, cell, enc).forEach(function (h) { if (t.id === sel) h = thumbOff(t, g2, h); boxes.push([h.x - b2 / 2, h.y - b2 / 2, b2, b2]); }); });
    list.concat(ghost ? [ghost] : []).forEach(function (t) {
      var gg = geo(t, enc), hit = hits(t, enc), isSel = t.id === sel || t === ghost, big = isSel && open;
      hit.forEach(function (c) { hitSet[c.id] = 1; });
      var txt = labelPlain(t, hit.length), w = (txt.length * (big ? 7.6 : 6.9) + 22) / z, h = (big ? 30 : 25) / z;
      var p = placeLabel(t, gg, cell, w, h, boxes, BW, BH);
      boxes.push([p[0] - w / 2, p[1] - h / 2, w, h]);
      html += '<div class="mi-chip' + (big ? ' big' : '') + (t === ghost ? ' ghost' : '') + '" data-mi-sel="' + E(t.id) + '" style="left:' + p[0].toFixed(1) + 'px;top:' + p[1].toFixed(1) + 'px" title="' + E((t.label ? t.label + (t.dc ? ' \u00b7 ' + t.dc : '') + ' \u2014 ' : '') + (open ? 'Select this template' : 'Edit templates')) + '">' + labelHTML(t, hit.length) + '</div>';
      if (open && t !== ghost) handlePts(t, gg, cell, enc).map(function (hp) { return isSel ? thumbOff(t, gg, hp) : hp; }).forEach(function (hp) {
        html += '<button class="mi-hdl k-' + hp.k + (isSel ? ' on' : ' sm') + (U().miDragH === t.id + hp.k ? ' active' : '') + '" data-mi-h="' + hp.k + '" data-mi-id="' + E(t.id) + '" style="left:' + hp.x.toFixed(1) + 'px;top:' + hp.y.toFixed(1) + 'px" aria-label="' + ({ move: 'Move', size: 'Resize', aim: 'Aim' })[hp.k] + ' ' + KIND[t.kind] + '">' + hp.t + '</button>';
      });
    });
    var tpl = el('miTpl'); if (tpl) tpl.innerHTML = html;
    X.grid.querySelectorAll('[data-map-token]').forEach(function (te) { te.classList.toggle('mi-hit', !!hitSet[te.dataset.mapToken]); });
    offHits();
  }
  // Phone: creatures caught by the selected template but off screen get an edge marker at their row.
  function offHits() {
    var box = el('miOff'); if (!box) return;
    var a = A(), t = selAoe(); if (!a || !t || wide() || !X.scroll) { box.innerHTML = ''; return; }
    var sr = X.scroll.getBoundingClientRect(), br = box.getBoundingClientRect(), h = '';
    hits(t, X.enc).forEach(function (c) {
      var te = X.grid.querySelector('[data-map-token="' + c.id + '"]'); if (!te) return;
      var r = te.getBoundingClientRect(), cy = r.top + r.height / 2 - br.top;
      var word = t.kind === 'circle' ? 'circle' : t.kind === 'square' ? 'cube' : t.kind;
      if (r.right < sr.left + 4) h += '<div class="mi-offhit l" style="top:' + cy.toFixed(0) + 'px">\u25C2 <b>' + E(c.name) + '</b> in ' + word + '</div>';
      else if (r.left > sr.right - 4) h += '<div class="mi-offhit r" style="top:' + cy.toFixed(0) + 'px"><b>' + E(c.name) + '</b> in ' + word + ' \u25B8</div>';
    });
    box.innerHTML = h;
  }

  // ----- the AoE fan (replaces the tool fan, anchored on the screen's bottom-right corner)
  function fanGeom() { return wide() ? { R1: 230, R2: 150, sz: 56, isz: 46, cr: 92, chip: 30, hub: 116 } : { R1: 226, R2: 146, sz: 52, isz: 44, cr: 92, chip: 32, hub: 132 }; }
  function pos(r, deg, w, h) { var a = deg * Math.PI / 180; return 'right:' + (-r * Math.cos(a) - w / 2).toFixed(1) + 'px;bottom:' + (r * Math.sin(a) - h / 2).toFixed(1) + 'px;width:' + w + 'px;height:' + h + 'px;--fx:' + (r * Math.cos(a)).toFixed(1) + 'px;--fy:' + (-r * Math.sin(a)).toFixed(1) + 'px;'; }
  function arc(S, r, a0, a1) { var p = function (d) { var a = d * Math.PI / 180; return (S + r * Math.cos(a)).toFixed(1) + ',' + (S - r * Math.sin(a)).toFixed(1); }; return 'M' + p(a0) + ' A' + r + ',' + r + ' 0 0 0 ' + p(a1); }
  var SHAPE_ICO = { circle: '\u25EF', cone: '\u25BD', line: '\u2571', square: '\u25A2' };
  function fanHTML() {
    var a = A(); if (!a) return '';
    var G = fanGeom(), S = G.R1 + G.sz / 2 + 16, t = selAoe(), kind = t ? t.kind : a.kind, ft = t ? Math.round(t.len * 5) : a.ft;
    var shown = t ? !!t.pinned : !!a.show;
    var b = '<svg class="mi-afsvg" width="' + S + '" height="' + S + '" viewBox="0 0 ' + S + ' ' + S + '" aria-hidden="true"><path class="mi-afbg" d="M' + S + ',' + S + ' L' + S + ',0 A' + S + ',' + S + ' 0 0 0 0,' + S + ' Z"/>' +
      '<path class="mi-afrim" d="' + arc(S, S - 1.5, 90, 180) + '"/><path class="mi-aftrack" d="' + arc(S, G.R1, 90, 180) + '"/><path class="mi-afdivide" d="' + arc(S, (G.R1 + G.R2) / 2, 90, 180) + '"/><path class="mi-afdial" d="' + arc(S, G.R2, 106, 164) + '"/></svg>';
    var i = 0;
    ['circle', 'cone', 'line', 'square'].forEach(function (k, n) {
      b += '<button class="mi-af' + (k === kind ? ' on' : '') + '" style="' + pos(G.R1, 108 + n * 18, G.sz, G.sz) + '--i:' + (i++) + '" data-mi-shape="' + k + '" aria-pressed="' + (k === kind) + '" aria-label="' + KIND[k] + '"><span>' + SHAPE_ICO[k] + '</span><small>' + KIND[k] + '</small></button>';
    });
    b += '<button class="mi-ai" style="' + pos(G.R2, 109, G.isz, G.isz) + '--i:' + (i++) + '" data-mi-step="-5" aria-label="Smaller by 5 ft">\u2212</button>';
    b += '<div class="mi-aival" style="' + pos(G.R2, 135, G.isz + 30, G.isz - 8) + '--i:' + (i++) + '" data-mi-dial="1" role="slider" tabindex="0" aria-label="Template size" aria-valuenow="' + ft + '" aria-valuemin="5" aria-valuemax="200" title="Drag along the arc or scroll to resize">' + ft + ' ft</div>';
    b += '<button class="mi-ai" style="' + pos(G.R2, 161, G.isz, G.isz) + '--i:' + (i++) + '" data-mi-step="5" aria-label="Bigger by 5 ft">+</button>';
    b += '<button class="mi-achip" style="' + pos(G.cr, 160, G.chip, G.chip) + '--i:' + (i++) + '" data-mi-undo="1" title="Undo (Ctrl+Z)" aria-label="Undo"' + (aoeUndo.length ? '' : ' disabled') + '>\u21B6</button>';
    b += '<button class="mi-achip del" style="' + pos(G.cr, 110, G.chip, G.chip) + '--i:' + (i++) + '" data-mi-del="1" title="Delete template (Delete)" aria-label="Delete template"' + (t ? '' : ' disabled') + '>\uD83D\uDDD1</button>';
    var peek = !wide() && U().c2Card;
    var pills = '<div class="mi-aftogs' + (peek ? ' left' : '') + '" style="' + (wide() ? 'right:' + (S + 10) + 'px;bottom:14px' : (peek ? '' : 'right:12px;bottom:' + (S + 12) + 'px')) + '">' +
      '<button class="mi-pill' + (a.snap !== false ? ' on' : '') + '" data-mi-snap="1" aria-pressed="' + (a.snap !== false) + '" title="Snap to the grid (hold Shift for a free position or angle)">\u2317 Snap</button>' +
      '<button class="mi-pill' + (shown ? ' on' : '') + '" data-mi-show="1" aria-pressed="' + shown + '" title="Show this template on the projector">\uD83D\uDCCD Show players</button>' +
      '<button class="mi-pill" data-c2-fly="aoe" title="Template colours and clear all">\uD83C\uDFA8</button></div>';
    var hint = '';
    if (a.armed && !t) hint = kind === 'cone' || kind === 'line' ? (wide() ? 'Click where the ' + KIND[kind].toLowerCase() + ' should point \u00b7 Shift = free angle \u00b7 Esc cancels' : 'Tap where the ' + KIND[kind].toLowerCase() + ' should point') : (wide() ? 'Click to place the ' + KIND[kind].toLowerCase() + ' \u00b7 Shift = free position \u00b7 Esc cancels' : 'Tap to place the ' + KIND[kind].toLowerCase());
    else if (t) hint = wide() ? 'Drag \u2725 to move' + (t.kind === 'cone' || t.kind === 'line' ? ' \u00b7 \u27F3 to aim' : '') + (t.kind !== 'line' ? ' \u00b7 \u25C6 to resize' : ' \u00b7 \u27F3 sets the length too') + ' \u00b7 [ ] size \u00b7 Delete removes' : '';
    return '<div class="mi-afan' + (U().miFanIn ? ' in' : '') + '" style="--afS:' + S + 'px" role="toolbar" aria-label="Area template tools">' +
      '<div class="mi-afwrap" style="width:' + S + 'px;height:' + S + 'px">' + b.slice(0, b.indexOf('</svg>') + 6) + '</div>' + b.slice(b.indexOf('</svg>') + 6) +
      '<button class="mi-hub" data-mi-done="1" style="width:' + G.hub + 'px;height:' + G.hub + 'px;right:' + (-G.hub / 2) + 'px;bottom:' + (-G.hub / 2) + 'px" title="Done (commit the template)" aria-label="Done"><span>\u2713</span></button>' + pills + '</div>' +
      (hint ? '<div class="mi-hint mi-hint-aoe">' + hint + '</div>' : '');
  }

  function openAoe(o) {
    o = o || {};
    var u = U(), last = u.dmAoeLastSize || {}, kind = o.kind || (u.miAoeKind || 'circle');
    u.miAoe = { kind: kind, ft: o.ft || last[kind] || DEF_FT[kind], sel: o.sel || null, armed: !o.sel, snap: u.miSnap !== false, show: false, from: o.from || null, ghost: null };
    u.miFanIn = true; u.c2Fan = false; u.c2Fly = null; u.miFog = null; dmDragToolsOff('aoe');
    if (!wide()) u.c2Help = false;
    render();
    setTimeout(function () { U().miFanIn = false; var f = document.querySelector('.mi-afan'); if (f) f.classList.remove('in'); }, 400);
  }
  function closeAoe(back) {
    var u = U(), a = u.miAoe; if (!a) return;
    var keep = a.sel; u.miAoe = null; u.miPulse = keep || null;
    if (back) u.c2Fan = true; // ✓ Done morphs back to the tool fan
    restoreCamera();
    render();
    if (keep) setTimeout(function () { if (U().miPulse === keep) { U().miPulse = null; var g = document.querySelector('#miAoeG [data-aoe-id="' + keep + '"]'); if (g) g.classList.remove('pulse'); } }, 260);
  }
  function setFt(ft, live) {
    var a = A(); if (!a) return;
    ft = Math.max(5, Math.min(200, Math.round(ft / 5) * 5));
    var t = selAoe(), u = U();
    a.ft = ft; u.dmAoeLastSize = u.dmAoeLastSize || {}; u.dmAoeLastSize[t ? t.kind : a.kind] = ft;
    if (t) { if (Math.round(t.len * 5) === ft) return; if (!live) snapAoe(); t.len = ft / 5; commitAoes(!!t.pinned); }
    var v = document.querySelector('.mi-aival'); if (v) { v.textContent = ft + ' ft'; v.setAttribute('aria-valuenow', ft); }
    refresh(); camera();
  }
  function newTemplate(kind, at, ev) {
    var a = A(), enc = X.enc, len = a.ft / 5, free = ev && ev.shiftKey || a.snap === false;
    var t = { id: 'aoe_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: kind, len: len, angle: 0, color: U().dmAoeColor || null, element: null, pinned: !!a.show };
    if (typeof aoeElementForColor === 'function' && t.color) t.element = aoeElementForColor(t.color);
    if (kind === 'cone' || kind === 'line') {
      var tc = turnToken(enc), o = tc ? originOf(tc) : { x: Math.floor(at.x) + 0.5, y: Math.floor(at.y) + 0.5 };
      if (tc) t.from = tc.id;
      var ang = Math.atan2(at.y - o.y, at.x - o.x); if (!isFinite(ang) || (Math.abs(at.y - o.y) < 0.01 && Math.abs(at.x - o.x) < 0.01)) ang = 0;
      if (!free) ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
      t.x = o.x; t.y = o.y; t.angle = ang;
    } else if (kind === 'circle') { t.x = free ? at.x : Math.round(at.x); t.y = free ? at.y : Math.round(at.y); }
    else { t.x = free ? at.x - len / 2 : Math.round(at.x - len / 2); t.y = free ? at.y - len / 2 : Math.round(at.y - len / 2); }
    return t;
  }
  function placeAt(at, ev) {
    var a = A(); if (!a) return;
    var t = newTemplate(a.kind, at, ev);
    snapAoe(); X.enc.aoes = (X.enc.aoes || []).concat(t);
    a.sel = t.id; a.armed = false; a.ghost = null; U().dmAoeLastDropped = t.id;
    commitAoes(!!t.pinned); render(); camera();
  }
  // Stat card "Place cone": open the fan with that shape and size, already aimed at the nearest foe.
  function placeFromCard(id, kind, ft, type, label, dc, key) {
    var enc = loadEncounter(), c = find(enc, id); if (!c) return;
    if (c.mapX == null) { showToast(c.name + ' isn\u2019t on the map yet.'); return; }
    var o = originOf(c), foes = (enc.combatants || []).filter(function (q) { return q.id !== c.id && q.mapX != null && !q.dead && (c.kind === 'monster' ? (q.kind === 'player' || q.disposition === 'ally') : q.kind === 'monster'); });
    var best = null, bd = Infinity; foes.forEach(function (q) { var p = originOf(q), dd = Math.hypot(p.x - o.x, p.y - o.y); if (dd < bd) { bd = dd; best = q; } });
    var bp = best ? originOf(best) : null;
    var EL = { fire: '#e8552d', cold: '#4aa3df', lightning: '#f6d743', acid: '#7ac74f', poison: '#8e44ad', radiant: '#f5c542', necrotic: '#5b2c6f', force: '#c56cf0', thunder: '#95a5a6', psychic: '#e84393' };
    var t = { id: 'aoe_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind: kind, len: Math.max(1, Math.round(ft / 5)), angle: bp ? Math.atan2(bp.y - o.y, bp.x - o.x) : Math.PI, color: EL[type] || FIRE, element: type || 'fire', pinned: false, label: label, dc: dc || null };
    if (kind === 'cone' || kind === 'line') { t.x = o.x; t.y = o.y; t.from = c.id; }
    else if (kind === 'circle') { var p = bp || o; t.x = Math.round(p.x); t.y = Math.round(p.y); }
    else { var q = bp || o; t.x = Math.round(q.x - t.len / 2); t.y = Math.round(q.y - t.len / 2); }
    aoeUndo.push(JSON.stringify(enc.aoes || []));
    enc.aoes = (enc.aoes || []).concat(t); saveEncounter(enc);
    U().miAoeKind = kind;
    openAoe({ kind: kind, ft: ft, sel: t.id, from: { id: id, key: key || label, aoe: t.id } });
    setTimeout(camera, 30);
  }
  function placing(id, key) { var a = A(); return !!(a && a.from && a.from.id === id && a.from.key === key); }
  function deleteSel() {
    var t = selAoe(), a = A(); if (!t) return;
    snapAoe(); X.enc.aoes = aoes().filter(function (q) { return q.id !== t.id; }); a.sel = null; a.armed = false;
    if (U().dmAoeLastDropped === t.id) U().dmAoeLastDropped = null;
    commitAoes(true); render();
  }
  function undoAoe() {
    if (!aoeUndo.length) return;
    X.enc.aoes = JSON.parse(aoeUndo.pop()); var a = A();
    if (a && a.sel && !aoes().some(function (q) { return q.id === a.sel; })) { a.sel = null; a.armed = false; }
    commitAoes(true); render();
  }
  // ----- camera: keep the active template, its origin creature and its label clear of the fan
  function fanZoneR() { var G = fanGeom(); return G.R1 + G.sz / 2 + 16 + 40; }
  function camera() {
    var a = A(), t = selAoe(); if (!X || !X.scroll || !a || !t) return;
    var sc = X.scroll, cell = X.cell;
    var box = function () {
      var z = zoom(), gr = X.grid.getBoundingClientRect(), g = geo(t, X.enc), pts = [];
      var push = function (x, y) { pts.push([gr.left + x * cell * z, gr.top + y * cell * z]); };
      if (t.kind === 'circle') { push(g.x - g.len, g.y - g.len); push(g.x + g.len, g.y + g.len); }
      else if (t.kind === 'square') { push(g.x, g.y); push(g.x + g.len, g.y + g.len); }
      else { var Lc = t.kind === 'cone' ? g.len / Math.cos(HALF) : g.len, hh = t.kind === 'cone' ? HALF : 0; push(g.x, g.y); push(g.x + Math.cos(g.ang - hh) * Lc, g.y + Math.sin(g.ang - hh) * Lc); push(g.x + Math.cos(g.ang + hh) * Lc, g.y + Math.sin(g.ang + hh) * Lc); }
      var org = t.from ? find(X.enc, t.from) : null;
      if (org && org.mapX != null) { var s = spanOf(org); push(org.mapX, org.mapY); push(org.mapX + s, org.mapY + s + 0.4); }
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      return { z: z, pts: pts, x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
    };
    var b = box(), R = fanZoneR(), cx = W.innerWidth, cy = W.innerHeight, sr = sc.getBoundingClientRect();
    var inZone = function (dx, dy) { return b.pts.some(function (p) { return Math.hypot(cx - (p[0] - dx), cy - (p[1] - dy)) < R; }) || (b.x1 - dx > cx - R && b.y1 - dy > cy - R); };
    var behavior = reduced() ? 'auto' : 'smooth';
    if (wide()) {
      if (!inZone(0, 0)) return;
      // slide the map left (the stage has a fan-wide pad on the right while the fan is open); fall back to up
      var dx = 0, step = 12; while (dx < R + 40 && inZone(dx, 0)) dx += step;
      var maxX = sc.scrollWidth - sc.clientWidth - sc.scrollLeft;
      if (!inZone(dx, 0) && dx <= maxX + 1) { sc.scrollTo({ left: sc.scrollLeft + dx, behavior: behavior }); }
      else { var need = (b.y1 - (cy - R)); sc.scrollTo({ left: sc.scrollLeft + Math.min(dx, Math.max(0, maxX)), top: sc.scrollTop + Math.max(0, need), behavior: behavior }); }
    } else {
      // phone: the template (and its origin creature) must fit in the band above the fan; zoom out if it can't
      var top = sr.top + 6, availW = sr.width - 12, availH = Math.max(140, (cy - R * 0.92) - top - 34);
      var bw = (b.x1 - b.x0) / b.z + cell, bh = (b.y1 - b.y0) / b.z + cell;
      var zf = Math.min(availW / bw, availH / bh);
      if (zf < b.z - 0.01 && X.setZoom) { X.setZoom(Math.max(0.4, zf), false); b = box(); }
      var ddx = (b.x0 + b.x1) / 2 - (sr.left + 6 + availW / 2), ddy = (b.y0 + b.y1) / 2 - (top + 34 + availH / 2);
      // then nudge sideways so the selected template's 44 px thumb handles aren't cut off by the screen edge
      var gr2 = X.grid.getBoundingClientRect(), g2 = geo(t, X.enc), hx = handlePts(t, g2, cell, X.enc).map(function (hp) { return gr2.left + thumbOff(t, g2, hp).x * b.z; });
      var hx0 = Math.min.apply(null, hx) - 24, hx1 = Math.max.apply(null, hx) + 24;
      if (hx0 - ddx < sr.left + 4) ddx = hx0 - sr.left - 4; else if (hx1 - ddx > sr.right - 4) ddx = hx1 - sr.right + 4;
      sc.scrollTo({ left: sc.scrollLeft + ddx, top: sc.scrollTop + ddy, behavior: behavior });
    }
    setTimeout(offHits, reduced() ? 0 : 320);
  }
  // Desktop: while the fan is open the map fills the pane's width, edge to edge (it pans vertically only).
  function coverCamera() {
    if (!X || !X.scroll || !wide() || !X.setZoom) return;
    var a = A(); if (!a) return;
    // The board keeps its fitted zoom (C2-desk-open.png); camera() slides it left if the fan would cover the template.
    void a;
  }
  function restoreCamera() {
    var u = U();
    if (!u.c2ManualZoom) u.dmMapZoomInit = false; // the next render refits
  }

  // Phone: the selected template's 44 px handles sit just off the point they control (out past the rim or tip,
  // behind the origin), so the thumb doesn't hide what it is dragging. startHandle keeps the grab offset.
  function thumbOff(t, g, hp) {
    if (wide() || t.kind === 'circle' || t.kind === 'square') return hp;
    var d = 30 / zoom(), a = hp.k === 'move' ? g.ang + Math.PI : hp.k === 'size' ? g.ang + HALF : g.ang;
    var dm = dims(X.enc), r = 24 / zoom(), BW = dm.cols * X.cell, BH = dm.rows * X.cell;
    var cl = function (v, m) { return Math.max(r, Math.min(m - r, v)); }; // keep the whole thumb target on the board
    return { k: hp.k, t: hp.t, x: cl(hp.x + Math.cos(a) * d, BW), y: cl(hp.y + Math.sin(a) * d, BH) };
  }
  // ----- gestures while the AoE fan is open
  var hdrag = null;
  function startHandle(ev, id, k) {
    var t = aoes().find(function (q) { return q.id === id; }); if (!t) return;
    ev.preventDefault(); ev.stopPropagation();
    var a = A(); if (a) { a.sel = id; a.armed = false; a.ghost = null; a.kind = t.kind; a.ft = Math.round(t.len * 5); }
    snapAoe();
    if (t.attachedTo && k === 'move') { var p = resolveAoePos(t, X.enc); t.x = p.x; t.y = p.y; t.attachedTo = null; }
    var p0 = boardPt(ev), g0 = handlePts(t, geo(t, X.enc), X.cell, X.enc).find(function (q) { return q.k === k; });
    var off = g0 ? { x: g0.x / X.cell - p0.x, y: g0.y / X.cell - p0.y } : { x: 0, y: 0 };
    if (Math.hypot(off.x, off.y) > 2) off = { x: 0, y: 0 };
    hdrag = { t: t, k: k, pid: ev.pointerId, moved: false, off: off };
    U().miDragH = id + k;
    try { X.grid.setPointerCapture(ev.pointerId); } catch (e) {}
    if (X.scroll) X.scroll.style.touchAction = 'none';
    syncFan(); refresh();
  }
  function moveHandle(ev) {
    var h = hdrag, t = h.t, p = boardPt(ev); p = { x: p.x + h.off.x, y: p.y + h.off.y }; var free = ev.shiftKey || (A() && A().snap === false), st = Math.PI / 12; h.moved = true;
    if (h.k === 'move') {
      if (t.kind === 'circle') { t.x = free ? p.x : Math.round(p.x); t.y = free ? p.y : Math.round(p.y); }
      else if (t.kind === 'square') { t.x = free ? p.x - t.len / 2 : Math.round(p.x - t.len / 2); t.y = free ? p.y - t.len / 2 : Math.round(p.y - t.len / 2); }
      else { t.x = free ? p.x : Math.floor(p.x) + 0.5; t.y = free ? p.y : Math.floor(p.y) + 0.5; t.from = null; }
    } else if (h.k === 'aim') {
      var ang = Math.atan2(p.y - t.y, p.x - t.x); t.angle = free ? ang : Math.round(ang / st) * st;
      if (t.kind === 'line') t.len = Math.max(1, Math.round(Math.hypot(p.x - t.x, p.y - t.y)));
    } else {
      var L;
      if (t.kind === 'circle') L = Math.hypot(p.x - t.x, p.y - t.y);
      else if (t.kind === 'square') L = Math.max(p.x - t.x, p.y - t.y);
      else L = (p.x - t.x) * Math.cos(t.angle) + (p.y - t.y) * Math.sin(t.angle);
      t.len = Math.max(1, Math.min(40, Math.round(L)));
    }
    var a = A(); if (a) { a.ft = Math.round(t.len * 5); var v = document.querySelector('.mi-aival'); if (v) { v.textContent = a.ft + ' ft'; v.setAttribute('aria-valuenow', a.ft); } }
    refresh();
  }
  function endHandle() {
    var h = hdrag; hdrag = null; U().miDragH = null;
    if (X.scroll) X.scroll.style.touchAction = '';
    if (!h) return;
    if (!h.moved) aoeUndo.pop();
    else { commitAoes(true); }
    refresh(); syncFan(); camera();
  }
  // Re-render just the fan (sizes, undo / delete enabled) without rebuilding the board.
  function syncFan() {
    var f = document.querySelector('.mi-afan'); if (!f || !A()) return;
    var hold = U().miFanIn; U().miFanIn = false;
    var tmp = document.createElement('div'); tmp.innerHTML = fanHTML(); U().miFanIn = hold;
    var nf = tmp.querySelector('.mi-afan'), oh = document.querySelector('.mi-hint-aoe'), nh = tmp.querySelector('.mi-hint-aoe');
    if (nf) f.replaceWith(nf);
    if (oh && nh) oh.replaceWith(nh); else if (oh) oh.remove(); else if (nh) { var st = document.querySelector('.c2-stage'); if (st) st.appendChild(nh); }
  }
  // The size dial: drag the value pill along the inner arc (5 ft detents) or scroll over it.
  var dial = null;
  function dialAngle(ev) { return Math.atan2(W.innerHeight - ev.clientY, W.innerWidth - ev.clientX) * 180 / Math.PI; }
  function startDial(ev) { var a = A(); if (!a) return; ev.preventDefault(); ev.stopPropagation(); var t = selAoe(); if (t) snapAoe(); dial = { a0: dialAngle(ev), ft0: t ? Math.round(t.len * 5) : a.ft, last: null, pid: ev.pointerId, snapped: !!t }; try { ev.target.setPointerCapture(ev.pointerId); } catch (e) {} }
  function moveDial(ev) {
    if (!dial) return;
    var steps = Math.round((dialAngle(ev) - dial.a0) / 6), ft = Math.max(5, Math.min(200, dial.ft0 + steps * 5));
    if (ft !== dial.last) { dial.last = ft; vibrate(6); setFt(ft, true); }
  }
  function endDial() { if (!dial) return; var d = dial; dial = null; if (d.snapped && d.last == null) aoeUndo.pop(); syncFan(); }

  // =====================================================================
  // 3. Fog of war tools
  // =====================================================================
  var hist = {}; // per encounter: { items: [{ label, before, after, fx }], pos }
  function H() { var id = X && X.enc ? X.enc.id : 'x'; return hist[id] || (hist[id] = { items: [], pos: 0 }); }
  function Fg() { return U().miFog || null; }
  var stroke = null, rect = null, hoverRoom = null, ring = null, fogFxSeq = 0;
  function fogEnsure() {
    var enc = X.enc;
    if (!enc.fog || !enc.fog.on) { enc.fog = Object.assign({ revealed: [] }, enc.fog || {}, { on: true }); if (!enc.fog.revealed) enc.fog.revealed = []; if (typeof dmRevealVision === 'function') dmRevealVision(enc); fogSync(enc); saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc); return true; }
    return false;
  }
  function openFog() {
    var u = U(); u.miFog = { tool: (u.miFogLast && u.miFogLast.tool) || 'brush', mode: (u.miFogLast && u.miFogLast.mode) || 'clear', size: (u.miFogLast && u.miFogLast.size) || 10 };
    u.c2Fan = false; u.c2Fly = null; u.miAoe = null; dmDragToolsOff('none');
    var enc = loadEncounter(); X = X || {}; X.enc = enc;
    if (!enc.fog || !enc.fog.on) { enc.fog = Object.assign({ revealed: [] }, enc.fog || {}, { on: true }); if (typeof dmRevealVision === 'function') dmRevealVision(enc); fogSync(enc); saveEncounter(enc); }
    render();
  }
  function closeFog() { var u = U(); if (u.miFog) u.miFogLast = Object.assign({}, u.miFog); u.miFog = null; stroke = rect = hoverRoom = ring = null; render(); }
  function fogCommit(m, label, fx) {
    var enc = X.enc, before = enc.fog && enc.fog.mask ? enc.fog.mask : FL().encode(maskFromRevealed(enc));
    fogPut(enc, m); var after = enc.fog.mask;
    if (before === after) return false;
    enc.fog.fx = Object.assign({ seq: ++fogFxSeq + Date.now() % 100000 }, fx || {});
    var h = H(); h.items = h.items.slice(0, h.pos); h.items.push({ label: label, before: before, after: after, fx: fx || {}, t: Date.now() }); h.pos = h.items.length;
    if (h.items.length > 60) { h.items.shift(); h.pos--; }
    saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc);
    logEvent(label);
    return true;
  }
  function fogGoto(pos, speed) {
    var h = H(); pos = Math.max(0, Math.min(h.items.length, pos)); if (pos === h.pos) return;
    var back = pos < h.pos, it = back ? h.items[pos] : h.items[pos - 1], str = back ? it.before : it.after;
    h.pos = pos;
    var enc = X.enc, m = FL().decode(str, dims(enc).cols * F * dims(enc).rows * F);
    fogPut(enc, m);
    var fx = Object.assign({}, it.fx || {}, { dur: Math.round(((it.fx && it.fx.dur) || 450) / 1.5), seq: ++fogFxSeq + Date.now() % 100000 });
    enc.fog.fx = fx; saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc);
    if (X.fog) X.fog.set(m, { origin: fx.origin, dur: Math.round(((it.fx && it.fx.dmDur) || 450) / 1.5) });
    if (X.pv) X.pv.set(m, { origin: fx.origin, dur: fx.dur });
    pvTokens(); syncFogBar(); refresh();
  }
  function curMask() { return fogMask(X.enc) || maskFromRevealed(X.enc); }
  function modeNow(ev) { var f = Fg(); var m = f ? f.mode : 'clear'; if (ev && ev.altKey) m = m === 'clear' ? 'cover' : 'clear'; return m; }
  function brushR() { var f = Fg(); return Math.max(0.5, (f ? f.size : 10) / 5 / 2); }
  function roomAt(p) {
    var t = terrainFor(X.enc); if (!t || !t.rooms) return null;
    var d = dims(X.enc), x = Math.floor(p.x), y = Math.floor(p.y), i = y * d.cols + x;
    for (var r = 0; r < t.rooms.length; r++) if (t.rooms[r].cells.indexOf(i) >= 0) return t.rooms[r];
    return null;
  }
  function roomName(r) { var w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, n = r.cells.length; return n <= 12 ? 'Alcove' : (Math.max(w, h) >= 3 * Math.min(w, h) ? 'Corridor' : 'Room'); }
  function fogDown(ev) {
    var f = Fg(); if (!f || ev.button === 2) return;
    if (ev.target.closest && ev.target.closest('.mi-fbar, .mi-hist, .mi-pview')) return;
    ev.preventDefault(); ev.stopPropagation();
    var p = boardPt(ev), mode = modeNow(ev), d = dims(X.enc);
    try { X.grid.setPointerCapture(ev.pointerId); } catch (e) {}
    if (X.scroll) X.scroll.style.touchAction = 'none';
    X.grid.classList.add('mi-busy');
    if (f.tool === 'brush') {
      var m = curMask(); stroke = { before: m.slice(), m: m, mode: mode, last: p, sum: [p.x, p.y, 1], pid: ev.pointerId };
      stampSeg(m, d, p.x, p.y, p.x, p.y, brushR(), mode === 'clear' ? 1 : 0);
      if (X.fog) X.fog.set(m, { dur: 350, origin: [p.x, p.y] });
      ring = { x: p.x, y: p.y, on: true }; fxRefresh();
    } else if (f.tool === 'rect') {
      rect = { x0: Math.max(0, Math.min(d.cols, Math.round(p.x))), y0: Math.max(0, Math.min(d.rows, Math.round(p.y))), x1: null, y1: null, mode: mode, pid: ev.pointerId };
      rect.x1 = rect.x0; rect.y1 = rect.y0; fxRefresh();
    } else if (f.tool === 'room') {
      var r = roomAt(p); hoverRoom = r; fxRefresh();
      if (r) { var mm = curMask(), mw = d.cols * F; r.cells.forEach(function (i) { fillCell(mm, mw, i % d.cols, Math.floor(i / d.cols), mode === 'clear' ? 1 : 0); });
        var org = [(r.x0 + r.x1 + 1) / 2, (r.y0 + r.y1 + 1) / 2];
        if (fogCommit(mm, (mode === 'clear' ? '\u2600 ' : '\u2601 ') + 'Room: ' + roomName(r), { origin: org, dur: 500, dmDur: 500 })) { if (X.fog) X.fog.set(mm, { origin: org, dur: 500 }); afterFog(mm, org, 500); }
      }
      fogUp(ev);
    }
  }
  function fogMove(ev) {
    var f = Fg(); if (!f) return;
    var p = boardPt(ev), d = dims(X.enc);
    if (stroke) {
      var m = stroke.m, r = brushR(), mode = stroke.mode;
      var ch = stampSeg(m, d, stroke.last.x, stroke.last.y, p.x, p.y, r, mode === 'clear' ? 1 : 0);
      stroke.sum[0] += p.x; stroke.sum[1] += p.y; stroke.sum[2]++;
      stroke.last = p; if (ch && X.fog) X.fog.set(m, { dur: 350, origin: [p.x, p.y] });
      ring = { x: p.x, y: p.y, on: true }; fxRefresh(); return;
    }
    if (rect) { rect.x1 = Math.max(0, Math.min(d.cols, Math.round(p.x))); rect.y1 = Math.max(0, Math.min(d.rows, Math.round(p.y))); fxRefresh(); return; }
    if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') {
      if (f.tool === 'brush') { ring = { x: p.x, y: p.y, on: false }; fxRefresh(); }
      else if (f.tool === 'room') { var rr = roomAt(p); if (rr !== hoverRoom) { hoverRoom = rr; fxRefresh(); } }
    }
  }
  function fogUp(ev) {
    if (X.scroll) X.scroll.style.touchAction = '';
    X.grid.classList.remove('mi-busy');
    try { X.grid.releasePointerCapture(ev.pointerId); } catch (e) {}
    var d = dims(X.enc), f = Fg();
    if (stroke) {
      var s = stroke; stroke = null; ring = ring && ev.pointerType !== 'touch' ? { x: ring.x, y: ring.y, on: false } : null;
      var org = [s.sum[0] / s.sum[2], s.sum[1] / s.sum[2]];
      if (fogCommit(s.m, s.mode === 'clear' ? '\u2600 Brush clear' : '\u2601 Brush cover', { origin: org, dur: 600, dmDur: 350 })) afterFog(s.m, org, 600);
      fxRefresh(); syncFogBar(); return;
    }
    if (rect) {
      var r = rect; rect = null;
      var x0 = Math.min(r.x0, r.x1), x1 = Math.max(r.x0, r.x1), y0 = Math.min(r.y0, r.y1), y1 = Math.max(r.y0, r.y1);
      if (x1 === x0 || y1 === y0) { var p = boardPt(ev); x0 = Math.floor(p.x); y0 = Math.floor(p.y); x1 = x0 + 1; y1 = y0 + 1; }
      var m = curMask(); fillRect(m, d, x0, y0, x1 - 1, y1 - 1, r.mode === 'clear' ? 1 : 0);
      var org = [(x0 + x1) / 2, (y0 + y1) / 2];
      if (fogCommit(m, (r.mode === 'clear' ? '\u2600 Area ' : '\u2601 Area ') + (x1 - x0) * 5 + '\u00d7' + (y1 - y0) * 5 + ' ft', { origin: org, dur: r.mode === 'clear' ? 500 : 450, dmDur: 500 })) { if (X.fog) X.fog.set(m, { origin: org, dur: 500 }); afterFog(m, org, 500); }
      fxRefresh(); syncFogBar(); return;
    }
    void f;
  }
  function cancelStroke() {
    if (stroke) { var s = stroke; stroke = null; fogPut(X.enc, s.before); if (X.fog) X.fog.set(s.before, { dur: 180 }); ring = null; fxRefresh(); X.grid.classList.remove('mi-busy'); if (X.scroll) X.scroll.style.touchAction = ''; return true; }
    if (rect) { rect = null; fxRefresh(); X.grid.classList.remove('mi-busy'); return true; }
    return false;
  }
  function afterFog(m, org, dur) { if (X.pv) X.pv.set(m, { origin: org, dur: dur }); pvTokens(); refresh(); }
  function globalFog(clear) {
    var d = dims(X.enc);
    confirmDialog(clear ? 'Clear all the fog? Players will see the whole map.' : 'Cover the whole map with fog again?', function () {
      var m = new Uint8Array(d.cols * F * d.rows * F); if (clear) m.fill(1);
      if (fogCommit(m, clear ? '\u2600 Reveal all' : '\u2601 Re-cover all', { origin: 'left', dur: 800, dmDur: 800 })) { if (X.fog) X.fog.set(m, { origin: 'left', dur: 800 }); afterFog(m, 'left', 800); }
      syncFogBar();
    }, { title: clear ? 'Reveal all' : 'Re-cover all', yes: clear ? '\u2600 Reveal all' : '\u2601 Re-cover all' });
  }
  function fogOff() {
    var enc = X.enc; enc.fog = Object.assign({}, enc.fog || {}, { on: false }); saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc);
    logEvent('Fog turned off'); closeFog();
  }
  // brush ring, rectangle and room highlight, in board px
  function fxRefresh() {
    var box = el('miFx'); if (!box || !X) return;
    var f = Fg(), cell = X.cell, h = '';
    if (f && f.tool === 'brush' && ring) {
      var D = (f.size / 5) * cell;
      h += '<div class="mi-ring' + (ring.on ? ' on' : '') + (modeNow() === 'cover' ? ' cover' : '') + '" style="left:' + (ring.x * cell).toFixed(1) + 'px;top:' + (ring.y * cell).toFixed(1) + 'px;width:' + D.toFixed(1) + 'px;height:' + D.toFixed(1) + 'px"><span>' + f.size + ' ft</span></div>';
      if (ring.on) h += '<div class="mi-fchip" style="left:' + (ring.x * cell).toFixed(1) + 'px;top:' + ((ring.y * cell) + D / 2 + 22 / zoom()).toFixed(1) + 'px">' + (stroke && stroke.mode === 'cover' ? 'Covering\u2026' : 'Clearing\u2026') + ' <small>release to commit' + (wide() ? ' \u00b7 Esc cancels stroke' : '') + '</small></div>';
    }
    if (rect) {
      var x0 = Math.min(rect.x0, rect.x1), x1 = Math.max(rect.x0, rect.x1), y0 = Math.min(rect.y0, rect.y1), y1 = Math.max(rect.y0, rect.y1);
      h += '<div class="mi-rectsel' + (rect.mode === 'cover' ? ' cover' : '') + '" style="left:' + x0 * cell + 'px;top:' + y0 * cell + 'px;width:' + (x1 - x0) * cell + 'px;height:' + (y1 - y0) * cell + 'px"><span>' + (x1 - x0) * 5 + ' \u00d7 ' + (y1 - y0) * 5 + ' ft</span><i></i></div>';
    }
    if (f && f.tool === 'room' && hoverRoom) {
      var r = hoverRoom, d = dims(X.enc), set = {}, seg = '';
      r.cells.forEach(function (i) { set[i] = 1; });
      r.cells.forEach(function (i) { var x = i % d.cols, y = Math.floor(i / d.cols), X0 = x * cell, Y0 = y * cell, X1 = X0 + cell, Y1 = Y0 + cell;
        if (y === 0 || !set[i - d.cols]) seg += 'M' + X0 + ',' + Y0 + 'H' + X1; if (y === d.rows - 1 || !set[i + d.cols]) seg += 'M' + X0 + ',' + Y1 + 'H' + X1;
        if (x === 0 || !set[i - 1]) seg += 'M' + X0 + ',' + Y0 + 'V' + Y1; if (x === d.cols - 1 || !set[i + 1]) seg += 'M' + X1 + ',' + Y0 + 'V' + Y1; });
      var fill = r.cells.map(function (i) { var x = i % d.cols, y = Math.floor(i / d.cols); return 'M' + x * cell + ',' + y * cell + 'h' + cell + 'v' + cell + 'h' + (-cell) + 'z'; }).join('');
      h += '<svg class="mi-roomhi" width="' + d.cols * cell + '" height="' + d.rows * cell + '"><path class="f" d="' + fill + '"/><path class="o" d="' + seg + '"/></svg>' +
        '<div class="mi-fchip room" style="left:' + ((r.x0 + r.x1 + 1) / 2 * cell).toFixed(1) + 'px;top:' + (r.y0 * cell - 16 / zoom()).toFixed(1) + 'px">\u2302 ' + roomName(r) + ' \u00b7 ' + (r.x1 - r.x0 + 1) * 5 + '\u00d7' + (r.y1 - r.y0 + 1) * 5 + ' ft \u00b7 tap to ' + (modeNow() === 'clear' ? 'reveal' : 'cover') + '</div>';
    }
    box.innerHTML = h;
  }

  // ----- fog bar, history list, projector preview
  function fbtn(attr, glyph, label, on, extra) { return '<button class="' + (on ? 'on' : '') + '" ' + attr + (extra || '') + ' aria-pressed="' + !!on + '"><span>' + glyph + '</span><small>' + label + '</small></button>'; }
  function fogBarHTML() {
    var f = Fg(); if (!f) return '';
    var h = H(), t = X && X.enc ? terrainFor(X.enc) : null, hasRooms = !!(t && t.rooms && t.rooms.length);
    var tools = '<div class="mi-seg">' + fbtn('data-mi-ftool="brush"', '\uD83D\uDD8C', 'Brush', f.tool === 'brush') + fbtn('data-mi-ftool="rect"', '\u25AD', 'Area', f.tool === 'rect') +
      fbtn('data-mi-ftool="room"', '\u2302', 'Room', f.tool === 'room', (t && !hasRooms) ? ' disabled title="This map has no rooms to pick"' : ' title="Tap a room to reveal it"') + '</div>';
    var modes = '<div class="mi-seg">' + fbtn('data-mi-fmode="clear"', '\u2600', 'Clear', f.mode === 'clear', ' title="Clear fog (hold Alt to cover)"') + fbtn('data-mi-fmode="cover"', '\u2601', 'Cover', f.mode === 'cover', ' title="Cover with fog (hold Alt to clear)"') + '</div>';
    var size = '<label class="mi-step' + (f.tool === 'brush' ? '' : ' dim') + '"><small>Size</small><input type="range" min="5" max="30" step="5" value="' + f.size + '" data-mi-fsize="1" aria-label="Brush size"><b>' + f.size + ' ft</b></label>';
    var undo = '<button class="mi-ic" data-mi-fundo="1" title="Undo (Ctrl+Z)" aria-label="Undo"' + (h.pos ? '' : ' disabled') + '>\u21B6</button><button class="mi-ic" data-mi-fredo="1" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"' + (h.pos < h.items.length ? '' : ' disabled') + '>\u21B7</button>';
    var done = '<button class="mi-done c2-brass" data-mi-fdone="1">\u2713' + (wide() ? ' Done' : '') + '</button>';
    if (wide()) return '<div class="mi-fbar" role="toolbar" aria-label="Fog of war">' + tools + modes + size + '<span class="mi-sep"></span><button class="mi-tx" data-mi-fall="clear">\u2600 Reveal all</button><button class="mi-tx" data-mi-fall="cover">\u2601 Re-cover all</button><span class="mi-sep"></span>' + undo + done + '</div>' + histHTML() + pviewHTML();
    var more = U().miFogMore ? '<div class="mi-fmore" role="menu">' + size + '<button class="mi-tx" data-mi-fall="clear">\u2600 Reveal all</button><button class="mi-tx" data-mi-fall="cover">\u2601 Re-cover all</button><button class="mi-tx" data-mi-foff="1">Turn fog off</button></div>' : '';
    return more + '<div class="mi-fbar phone" role="toolbar" aria-label="Fog of war">' + tools.replace(/<small>[^<]*<\/small>/g, '') + modes.replace(/<small>[^<]*<\/small>/g, '') + undo + '<button class="mi-ic' + (U().miFogMore ? ' on' : '') + '" data-mi-fmore="1" aria-label="More fog tools" aria-expanded="' + !!U().miFogMore + '">\u22EF</button>' + done + '</div>';
  }
  function ago(t) { var s = Math.round((Date.now() - t) / 1000); return s < 45 ? 'now' : s < 3600 ? Math.round(s / 60) + ' min' : Math.round(s / 3600) + ' h'; }
  function histHTML() {
    var h = H(), rows = '';
    for (var i = h.items.length - 1; i >= 0 && h.items.length - i <= 8; i--) {
      var it = h.items[i], cur = i === h.pos - 1, undone = i >= h.pos;
      rows += '<button class="mi-hi' + (cur ? ' on' : '') + (undone ? ' undone' : '') + '" data-mi-fgoto="' + (i + 1) + '" title="' + (undone ? 'Redo up to here' : 'Step back to here') + '">' + E(it.label) + '<small>' + (cur ? 'now' : ago(it.t)) + '</small></button>';
    }
    if (h.items.length && h.pos === 0) rows += '<button class="mi-hi on" data-mi-fgoto="0">Start<small>now</small></button>';
    return '<div class="mi-hist" aria-label="Fog history"><b>Fog history</b>' + (rows || '<em>Each stroke, area or room you clear shows up here.</em>') + '<button class="mi-link" data-mi-foff="1">Turn fog off</button></div>';
  }
  function pviewHTML() {
    return '<div class="mi-pview" aria-label="Projector preview"><div class="mi-pvt">\uD83D\uDDA5 Projector preview <small>live</small></div><div class="mi-pvmap" id="miPvMap"><canvas id="miPvFog"></canvas><div class="mi-pvtok" id="miPvTok"></div></div></div>';
  }
  function syncFogBar() {
    var st = document.querySelector('.c2-stage'); if (!st || !Fg()) return;
    st.querySelectorAll('.mi-fbar, .mi-hist, .mi-fmore').forEach(function (n) { n.remove(); });
    var tmp = document.createElement('div'); tmp.innerHTML = fogBarHTML();
    Array.prototype.slice.call(tmp.children).forEach(function (n) { if (n.classList.contains('mi-pview')) return; st.appendChild(n); });
  }
  function baseImageURL() {
    var b = el('dmPaintedBase'); if (b) { var m = /url\(["']?([^"')]+)["']?\)/.exec(b.style.backgroundImage || ''); if (m) return m[1]; }
    var enc = X.enc; if (enc.mapImage && !/^idb:/.test(enc.mapImage)) return enc.mapImage;
    var img = X.grid.querySelector('.dm-map-img img'); return img ? img.src : null;
  }
  function pvTokens() {
    var box = el('miPvTok'), map = el('miPvMap'); if (!box || !map || !X) return;
    var enc = X.enc, d = dims(enc), m = fogMask(enc), fogOn = !!(enc.fog && enc.fog.on), h = '';
    (enc.combatants || []).forEach(function (c) {
      if (c.mapX == null || c.hiddenFromPlayers || (c.kind === 'monster' && c.dead)) return;
      var s = spanOf(c);
      if (fogOn && c.kind !== 'player' && m && FL().tokenHidden(m, d.cols * F, d.rows * F, c.mapX, c.mapY, s)) return;
      h += '<i class="' + (c.kind === 'player' ? 'pc' : (c.disposition === 'ally' ? 'ally' : 'foe')) + '" style="left:' + (c.mapX / d.cols * 100) + '%;top:' + (c.mapY / d.rows * 100) + '%;width:' + (s / d.cols * 100) + '%;height:' + (s / d.rows * 100) + '%;' + (c.tokenImage ? 'background-image:url(\'' + E(c.tokenImage) + '\')' : '') + '"></i>';
    });
    box.innerHTML = h;
  }
  function setupPreview() {
    var map = el('miPvMap'), cv = el('miPvFog'); if (!map || !cv || !X) return;
    var d = dims(X.enc), url = baseImageURL();
    map.style.aspectRatio = d.cols + ' / ' + d.rows;
    if (url) map.style.backgroundImage = 'url("' + url + '")';
    var w = map.clientWidth || 280, hh = w * d.rows / d.cols;
    X.pv = (X.enc.fog && X.enc.fog.on) ? new (FL().FogView)(cv, { look: 'proj', cols: d.cols, rows: d.rows }) : null;
    if (X.pv) { X.pv.size(w, hh); X.pv.set(curMask(), { instant: true }); }
    pvTokens();
  }

  // ----- round history (moves and fog changes), listed from the ⋯ More menu
  var log = {};
  function logEvent(txt) { var enc = X && X.enc; if (!enc) return; var L = log[enc.id] || (log[enc.id] = []); L.unshift({ r: enc.started ? (enc.round || 1) : 0, txt: txt, t: Date.now() }); if (L.length > 80) L.pop(); }
  function historyHTML(enc) {
    var L = log[enc.id] || [];
    if (!L.length) return '<div class="mi-rh"><b>Round history</b><em>Moves, templates and fog changes this session show up here.</em></div>';
    var out = '<div class="mi-rh"><b>Round history</b>', last = null;
    L.slice(0, 14).forEach(function (e) { if (e.r !== last) { out += '<small class="mi-rhr">' + (e.r ? 'Round ' + e.r : 'Before combat') + '</small>'; last = e.r; } out += '<span>' + E(e.txt) + '</span>'; });
    return out + '</div>';
  }

  // =====================================================================
  // 2. Token movement
  // =====================================================================
  var mv = null, moveUndo = [];
  function speedOf(c) {
    if (c.kind === 'player') {
      try { var ch = c.fromCharId ? (loadCharacters() || []).find(function (x) { return x && x.id === c.fromCharId; }) : null;
        if (ch) { var rd = typeof raceDataFor === 'function' ? raceDataFor(ch) : null; return ((rd && +rd.speed) || 30) + (typeof activeSpeedBonus === 'function' ? (+activeSpeedBonus(ch) || 0) : 0); } } catch (e) {}
      return 30;
    }
    var m = c.monsterId && typeof findMonster === 'function' ? findMonster(c.monsterId) : null;
    if (m && m.speed) { var w = m.speed.walk != null ? m.speed.walk : Object.values(m.speed)[0]; return parseInt(w, 10) || 30; }
    if (c.isBoss && c.bossStat && c.bossStat.speed) return parseInt(c.bossStat.speed.walk || c.bossStat.speed, 10) || 30;
    return 30;
  }
  // squares stepped through from a to b (5e grid: a diagonal step is one square)
  function walk(ax, ay, bx, by) {
    var out = [], dx = Math.abs(bx - ax), dy = Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, n = Math.max(dx, dy);
    for (var i = 1; i <= n; i++) out.push([Math.round(ax + (bx - ax) * i / n), Math.round(ay + (by - ay) * i / n)]);
    void sx; void sy; return out;
  }
  function pathCost(m) {
    var t = m.terrain, d = m.d, cells = [], ft = 0, extra = 0, pts = m.way.concat([m.cur]);
    for (var k = 1; k < pts.length; k++) walk(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]).forEach(function (q) {
      var diff = difficultAt(t, d, q[0], q[1], m.span); cells.push([q[0], q[1], diff]); ft += diff ? 10 : 5; if (diff) extra += 5;
    });
    return { cells: cells, ft: ft, extra: extra };
  }
  function reachOf(m) {
    var d = m.d, t = m.terrain, s = m.span, best = {}, q = [[m.x0, m.y0, 0]], out = [];
    var wallAt = function (x, y) { if (!t || !t.wall) return false; for (var j = 0; j < s; j++) for (var i = 0; i < s; i++) if (t.wall[(y + j) * d.cols + x + i]) return true; return false; };
    best[m.x0 + ',' + m.y0] = 0;
    while (q.length) {
      q.sort(function (a, b) { return a[2] - b[2]; }); var c = q.shift();
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; var nx = c[0] + dx, ny = c[1] + dy;
        if (nx < 0 || ny < 0 || nx > d.cols - s || ny > d.rows - s || wallAt(nx, ny)) continue;
        var cost = c[2] + (difficultAt(t, d, nx, ny, s) ? 10 : 5); if (cost > m.speed) continue;
        var k = nx + ',' + ny; if (best[k] != null && best[k] <= cost) continue; best[k] = cost; q.push([nx, ny, cost]);
      }
    }
    Object.keys(best).forEach(function (k) { if (best[k] > 0) { var p = k.split(','); out.push([+p[0], +p[1]]); } });
    return out;
  }
  function drawPath() {
    var g = el('miPathG'); if (!g || !mv) return;
    var cell = X.cell, s = mv.span, pc = pathCost(mv), h = '', d = mv.d, t = mv.terrain;
    mv.cost = pc;
    if (!mv.reachCells) { var rc = {}; mv.reach.concat([[mv.x0, mv.y0]]).forEach(function (q) { for (var j = 0; j < s; j++) for (var i = 0; i < s; i++) rc[(q[0] + i) + ',' + (q[1] + j)] = 1; }); mv.reachCells = Object.keys(rc).map(function (k) { return k.split(',').map(Number); }); }
    mv.reachCells.forEach(function (q) { h += '<rect class="mi-reach" x="' + q[0] * cell + '" y="' + q[1] * cell + '" width="' + cell + '" height="' + cell + '"/>'; }); // each square once: a big creature's reach doesn't stack
    if (t && t.water) for (var i = 0; i < t.water.length; i++) if (t.water[i]) h += '<rect class="mi-diffzone" x="' + (i % d.cols) * cell + '" y="' + Math.floor(i / d.cols) * cell + '" width="' + cell + '" height="' + cell + '"/>';
    if (!mv.free) pc.cells.forEach(function (q) { h += '<rect class="mi-pcell' + (q[2] ? ' diff' : '') + '" x="' + q[0] * cell + '" y="' + q[1] * cell + '" width="' + s * cell + '" height="' + s * cell + '"/>'; });
    var pts = mv.way.concat([mv.cur]).map(function (q) { return ((q[0] + s / 2) * cell).toFixed(1) + ',' + ((q[1] + s / 2) * cell).toFixed(1); });
    if (mv.free && mv.fp) pts[pts.length - 1] = (mv.fp.x * cell).toFixed(1) + ',' + (mv.fp.y * cell).toFixed(1);
    h += '<polyline class="mi-pline" points="' + pts.join(' ') + '"/>';
    mv.way.slice(1).forEach(function (q) { h += '<circle class="mi-wp" cx="' + ((q[0] + s / 2) * cell).toFixed(1) + '" cy="' + ((q[1] + s / 2) * cell).toFixed(1) + '" r="' + (cell * 0.18).toFixed(1) + '"/>'; });
    if (!mv.free) h += '<rect class="mi-snapcell" x="' + mv.cur[0] * cell + '" y="' + mv.cur[1] * cell + '" width="' + s * cell + '" height="' + s * cell + '"/>';
    g.innerHTML = h;
    // distance chip under the destination; "×2" on the first difficult square of the path
    var prevPt = mv.way[mv.way.length - 1], chipAbove = prevPt[1] > mv.cur[1] && mv.cur[1] > 0; // keep the chip off the path it came along
    var ft = mv.free && mv.fp ? Math.round(Math.hypot(mv.fp.x - (mv.x0 + s / 2), mv.fp.y - (mv.y0 + s / 2)) * 5) : pc.ft, over = ft > mv.speed;
    var chip = '<div class="mi-mchip' + (over ? ' over' : '') + '" style="left:' + ((mv.cur[0] + s / 2) * cell).toFixed(1) + 'px;top:' + (chipAbove ? mv.cur[1] * cell - 24 / zoom() : (mv.cur[1] + s) * cell + 24 / zoom()).toFixed(1) + 'px"><b>' + ft + ' ft</b> <small>of ' + mv.speed + '</small>' + (pc.extra && !mv.free ? ' \u00b7 <span class="mi-dt">difficult +' + pc.extra + '</span>' : '') + (over ? ' \u00b7 <span class="mi-ov2">over speed</span>' : '') + '</div>';
    var fd = pc.cells.filter(function (q) { return q[2]; })[0];
    if (fd && !mv.free) chip += '<div class="mi-x2" style="left:' + ((fd[0] + 0.5) * cell).toFixed(1) + 'px;top:' + ((fd[1] - 0.15) * cell).toFixed(1) + 'px">\u00d72</div>';
    var box = el('miMv'); if (box) box.innerHTML = chip;
  }
  function tokenDown(ev, tel) {
    if (!X || !active()) return false;
    var u = U(); if (u.dmGroupMode || u.dmPointerMode || ev.button === 2 || u.miFog || u.dmRulerTool) return false;
    var id = tel.dataset.mapToken, enc = X.enc, c = find(enc, id); if (!c || c.mapX == null) return false;
    ev.stopPropagation(); ev.preventDefault();
    var r = tel.getBoundingClientRect();
    mv = { id: id, el: tel, c: c, x0: c.mapX, y0: c.mapY, span: spanOf(c), d: dims(enc), terrain: terrainFor(enc), speed: speedOf(c), touch: ev.pointerType === 'touch',
      sx: ev.clientX, sy: ev.clientY, offX: ev.clientX - (r.left + r.width / 2), offY: ev.clientY - (r.top + r.height / 2), lifted: false, way: [[c.mapX, c.mapY]], cur: [c.mapX, c.mapY], pid: ev.pointerId, timer: 0, free: false };
    try { tel.setPointerCapture(ev.pointerId); } catch (e) {}
    return true;
  }
  function lift() {
    var m = mv; m.lifted = true;
    m.reach = reachOf(m);
    var gh = m.el.cloneNode(true); gh.removeAttribute('data-map-token'); gh.classList.add('mi-ghost'); gh.classList.remove('token-turn', 'mi-hit', 'token-highlight'); m.el.parentNode.insertBefore(gh, m.el); m.ghost = gh;
    m.el.classList.add('dragging', 'mi-lift'); X.grid.classList.add('mi-moving');
    if (X.scroll) X.scroll.style.touchAction = 'none';
    var st = document.querySelector('.c2-stage');
    if (st) {
      var hint = document.createElement('div'); hint.className = 'mi-hint mi-hint-move';
      hint.textContent = wide() ? 'Pause or press W to add a waypoint \u00b7 Esc or right-click cancels \u00b7 Alt = ignore snapping' : 'Pause to add a waypoint';
      st.appendChild(hint); m.hint = hint;
    }
    if (m.touch) { var cz = document.createElement('div'); cz.className = 'mi-cancel'; cz.textContent = '\u2715 Drag here to cancel'; (document.querySelector('.c2') || document.body).appendChild(cz); m.cz = cz; }
    vibrate(8);
  }
  function tokenMove(ev) {
    var m = mv; if (!m || ev.pointerId !== m.pid) return;
    if (ev.buttons & 2) { endMove(ev, true); return; } // right button pressed mid-drag: cancel
    if (!m.lifted) { if (Math.hypot(ev.clientX - m.sx, ev.clientY - m.sy) < 6) return; lift(); }
    var z = zoom(), gr = X.grid.getBoundingClientRect(), cell = X.cell, s = m.span;
    var cx = (ev.clientX - m.offX - gr.left) / z, cy = (ev.clientY - m.offY - gr.top) / z - (m.touch ? 30 / z : 0);
    var left = Math.max(-cell * 0.3, Math.min((m.d.cols - s + 0.3) * cell, cx - s * cell / 2)), top = Math.max(-cell * 0.3, Math.min((m.d.rows - s + 0.3) * cell, cy - s * cell / 2));
    m.el.style.left = left + 'px'; m.el.style.top = top + 'px';
    var nx = Math.max(0, Math.min(m.d.cols - s, Math.round(left / cell))), ny = Math.max(0, Math.min(m.d.rows - s, Math.round(top / cell)));
    m.free = !!ev.altKey; m.fp = { x: cx / cell, y: cy / cell };
    var changed = nx !== m.cur[0] || ny !== m.cur[1];
    m.cur = [nx, ny];
    if (m.cz) { var zr = m.cz.getBoundingClientRect(); m.inCancel = ev.clientY >= zr.top; m.cz.classList.toggle('hot', m.inCancel); }
    clearTimeout(m.timer); m.timer = setTimeout(addWaypoint, 400);
    if (changed || m.free) drawPath();
    if (!m.drawn) { m.drawn = true; drawPath(); }
  }
  function addWaypoint() {
    var m = mv; if (!m || !m.lifted) return;
    var last = m.way[m.way.length - 1];
    if (last[0] === m.cur[0] && last[1] === m.cur[1]) return;
    if (m.way.length > 1 || !(m.cur[0] === m.x0 && m.cur[1] === m.y0)) { m.way.push(m.cur.slice()); vibrate(10); drawPath(); }
  }
  function cleanupMove() {
    var m = mv; mv = null; if (!m) return;
    clearTimeout(m.timer);
    if (m.ghost) m.ghost.remove(); if (m.hint) m.hint.remove(); if (m.cz) m.cz.remove();
    var g = el('miPathG'); if (g) g.innerHTML = ''; var b = el('miMv'); if (b) b.innerHTML = '';
    m.el.classList.remove('dragging', 'mi-lift'); X.grid.classList.remove('mi-moving');
    if (X.scroll) X.scroll.style.touchAction = '';
  }
  function endMove(ev, cancel) {
    var m = mv; if (!m) return;
    try { m.el.releasePointerCapture(m.pid); } catch (e) {}
    if (!m.lifted) { cleanupMove(); if (!cancel && X.onTap) X.onTap(m.id, m.el); return; }
    var cell = X.cell, back = cancel || m.inCancel || (m.cur[0] === m.x0 && m.cur[1] === m.y0);
    var el2 = m.el, rm = reduced();
    if (back) {
      el2.style.transition = rm ? 'none' : 'left .18s ease-out, top .18s ease-out';
      el2.style.left = m.x0 * cell + 'px'; el2.style.top = m.y0 * cell + 'px';
      var gpath = el('miPathG'); if (gpath) gpath.innerHTML = ''; var mb = el('miMv'); if (mb) mb.innerHTML = '';
      setTimeout(function () { el2.style.transition = ''; cleanupMove(); }, rm ? 0 : 190);
      return;
    }
    var pc = pathCost(m), to = m.cur.slice(), ft = pc.ft, path = m.way.concat([to]);
    el2.style.transition = rm ? 'none' : 'left .08s cubic-bezier(.3,1.5,.6,1), top .08s cubic-bezier(.3,1.5,.6,1)';
    el2.style.left = to[0] * cell + 'px'; el2.style.top = to[1] * cell + 'px';
    var enc = loadEncounter(), c = find(enc, m.id);
    if (!c) { cleanupMove(); return; }
    c.mapX = to[0]; c.mapY = to[1]; X.enc = enc;
    if (typeof dmRevealVision === 'function') dmRevealVision(enc);
    saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc);
    moveUndo.push({ id: m.id, name: c.name, from: [m.x0, m.y0], to: to, path: path, ft: ft }); if (moveUndo.length > 30) moveUndo.shift();
    logEvent(c.name + ' moved ' + ft + ' ft');
    setTimeout(function () { cleanupMove(); el2.style.transition = ''; render(); toastMove(c.name + ' moved ' + ft + ' ft'); }, rm ? 0 : 100);
  }
  var toastT = 0;
  function toastMove(txt) {
    document.querySelectorAll('.mi-toast').forEach(function (n) { n.remove(); });
    clearTimeout(toastT);
    var t = document.createElement('div'); t.className = 'mi-toast' + (wide() ? ' desk' : ''); t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + E(txt) + '</span><button data-mi-mundo="1">\u21B6 Undo</button>' + (wide() ? '<small>Ctrl+Z</small>' : '');
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    toastT = setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 220); }, 6000);
  }
  function undoMove() {
    var u = moveUndo.pop(); if (!u) return false;
    document.querySelectorAll('.mi-toast').forEach(function (n) { n.remove(); });
    var enc = loadEncounter(), c = find(enc, u.id); if (!c) return true;
    var finish = function () { c.mapX = u.from[0]; c.mapY = u.from[1]; saveEncounter(enc); if (typeof broadcastMap === 'function') broadcastMap(enc); if (X) { X.enc = enc; } logEvent('\u21B6 ' + c.name + ' back to the start of the move'); render(); };
    var tel = X && X.grid.querySelector('[data-map-token="' + u.id + '"]');
    if (!tel || reduced() || !tel.animate) { finish(); return true; }
    var cell = X.cell, frames = u.path.slice().reverse().map(function (q) { return { left: q[0] * cell + 'px', top: q[1] * cell + 'px' }; });
    var an = tel.animate(frames, { duration: 220, easing: 'ease-in-out', fill: 'forwards' });
    an.onfinish = finish;
    return true;
  }

  // =====================================================================
  // Wiring
  // =====================================================================
  FogAdopt();
  function FogAdopt() {
    var FV = FL() && FL().FogView; if (!FV || FV.prototype.adopt) return;
    FV.prototype.adopt = function (o) { if (!o || o.fw !== this.fw || o.fh !== this.fh) return false; this.cur.set(o.cur); this.to.set(o.to); this.from.set(o.from); this.t0.set(o.t0); this.d.set(o.d); this.mask = o.mask; o.stop(); if (o.anim) this.go(); else this.paint(); return true; };
  }
  function sizeFog() {
    if (!X || !X.fog) return;
    var z = zoom(); X.fog.size(X.cols * X.cell * z, X.rows * X.cell * z);
  }
  var ghostRaf = 0, tapDown = null;
  function wire(ctx) {
    install(); FogAdopt();
    var prev = X;
    X = { enc: ctx.enc, cell: ctx.cell, cols: ctx.cols, rows: ctx.rows, grid: el('dmMapGrid'), scroll: el('dmMapScroll'), getZoom: ctx.getZoom, setZoom: ctx.setZoom, fitZoom: ctx.fitZoom, onTap: ctx.onTap };
    if (!X.grid) { X = null; return; }
    if (X.scroll) X.scroll.style.setProperty('--mi-fanpad', A() ? (wide() ? fanZoneR() + 20 : Math.round(fanZoneR() * 0.9)) + 'px' : '0px');
    var ov = el('miOv'); if (ov) ov.innerHTML = '<div id="miTpl"></div><div id="miFx"></div><div id="miMv"></div>';
    X.grid.style.setProperty('--mi-inv', (1 / zoom()).toFixed(4));
    X.grid.classList.toggle('mi-phone', !wide());
    var cv = el('miFog');
    if (cv && FL()) {
      X.fog = new (FL().FogView)(cv, { look: 'dm', cols: X.cols, rows: X.rows });
      sizeFog();
      var m = curMask(), adopted = !!(prev && prev.fog && X.fog.adopt(prev.fog));
      if (!adopted) X.fog.set(m, { instant: true });
      else if (!prev.fog.mask || FL().encode(prev.fog.mask) !== FL().encode(m)) X.fog.set(m, { dur: 450 });
    }
    if (prev && prev.pv) prev.pv.stop();
    terrainFor(X.enc);
    if (!terrWaiters.length) terrWaiters.push(function () { if (Fg()) syncFogBar(); });
    // gestures on the board (capture: they run before the pan and the classic tools)
    var g = X.grid, sc = X.scroll;
    var tp = {}, tpan = null, mid = function () { var k = Object.keys(tp), x = 0, y = 0; k.forEach(function (i) { x += tp[i].x; y += tp[i].y; }); return { x: x / k.length, y: y / k.length }; };
    g.addEventListener('pointerdown', function (ev) {
      var t = ev.target;
      if (Fg() && ev.pointerType === 'touch') {
        tp[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
        if (Object.keys(tp).length >= 2) { cancelStroke(); var m0 = mid(); tpan = { x: m0.x, y: m0.y, l: sc.scrollLeft, t: sc.scrollTop }; ev.preventDefault(); ev.stopPropagation(); return; } // two fingers pan
        if (tpan) return;
      }
      if (Fg()) { fogDown(ev); return; }
      var h = t.closest && t.closest('[data-mi-h]');
      if (h && A()) { startHandle(ev, h.getAttribute('data-mi-id'), h.getAttribute('data-mi-h')); return; }
      if (t.closest && t.closest('.mi-chip')) { ev.stopPropagation(); return; }
    }, true);
    g.addEventListener('pointermove', function (ev) {
      if (tp[ev.pointerId]) { tp[ev.pointerId] = { x: ev.clientX, y: ev.clientY }; if (tpan && sc) { var m1 = mid(); sc.scrollLeft = tpan.l - (m1.x - tpan.x); sc.scrollTop = tpan.t - (m1.y - tpan.y); return; } }
      if (hdrag) { moveHandle(ev); return; }
      if (Fg()) { fogMove(ev); return; }
      var a = A();
      if (a && a.armed && !a.sel && ev.pointerType === 'mouse' && !ev.buttons) {
        var p = boardPt(ev); cancelAnimationFrame(ghostRaf);
        ghostRaf = requestAnimationFrame(function () { if (!A() || !A().armed) return; A().ghost = newTemplate(A().kind, p, ev); A().ghost.id = '__ghost'; refresh(); });
      }
    });
    g.addEventListener('pointerleave', function () { var a = A(); if (a && a.ghost) { a.ghost = null; refresh(); } if (Fg() && ring && !stroke) { ring = null; fxRefresh(); } if (Fg() && hoverRoom) { hoverRoom = null; fxRefresh(); } });
    var untouch = function (ev) { if (tp[ev.pointerId]) { delete tp[ev.pointerId]; if (tpan) { if (!Object.keys(tp).length) tpan = null; return true; } } return false; };
    var up = function (ev) { if (untouch(ev)) return; if (hdrag) { endHandle(ev); return; } if (Fg() && (stroke || rect)) fogUp(ev); };
    g.addEventListener('pointerup', up); g.addEventListener('pointercancel', function (ev) { untouch(ev); if (hdrag) endHandle(ev); else if (stroke || rect) { cancelStroke(); } });
    if (sc) {
      sc.addEventListener('pointerdown', function (ev) { tapDown = A() && ev.button === 0 ? { x: ev.clientX, y: ev.clientY, t: Date.now(), on: !(ev.target.closest && ev.target.closest('.mi-hdl, .mi-chip')) } : null; }, true);
      sc.addEventListener('pointerup', function (ev) {
        var d = tapDown; tapDown = null; if (!d || !d.on || !A() || hdrag) return;
        if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 7 || Date.now() - d.t > 700) return;
        var gr = X.grid.getBoundingClientRect(); if (ev.clientX < gr.left || ev.clientY < gr.top || ev.clientX > gr.right || ev.clientY > gr.bottom) { if (!A().armed) closeAoe(false); return; }
        var a = A();
        if (a.armed) placeAt(boardPt(ev), ev);
        else if (a.sel) { a.sel = null; a.armed = false; a.ghost = null; syncFan(); refresh(); }
        else closeAoe(false);
      }, true);
      sc.addEventListener('scroll', function () { if (A()) { cancelAnimationFrame(ghostRaf); ghostRaf = requestAnimationFrame(offHits); } }, { passive: true });
    }
    refresh(); fxRefresh();
    if (A()) { coverCamera(); setTimeout(camera, 20); }
    if (Fg()) setupPreview();
  }
  function onZoom(z) {
    if (!X || !X.grid) return;
    X.grid.style.setProperty('--mi-inv', (1 / z).toFixed(4));
    clearTimeout(onZoom.t); onZoom.t = setTimeout(function () { sizeFog(); refresh(); fxRefresh(); }, 60);
  }
  function ownsPointer(ev) {
    if (stroke || rect || hdrag || dial || mv) return true;
    if (Fg()) return true;
    var t = ev && ev.target; return !!(t && t.closest && t.closest('.mi-hdl, .mi-chip, .mi-afan, .mi-fbar, .mi-hist, .mi-pview'));
  }
  // tokens: true = MI owns this press, 'pass' = leave it to the map (template placement), false = classic handling
  function tokenHook(ev, tel) {
    var a = A();
    if (a && a.armed && !a.sel) return 'pass';
    return tokenDown(ev, tel);
  }
  function stageHTML() { return '<div class="mi-offbox" id="miOff" aria-hidden="true"></div>' + (Fg() ? fogBarHTML() : ''); }

  function onClick(ev) {
    var t = ev.target && ev.target.closest ? ev.target : null; if (!t || !t.closest('.c2, .mi-toast')) return;
    var b, a = A();
    if ((b = t.closest('[data-mi-mundo]'))) { undoMove(); return; }
    if (t.closest('[data-mi-aoe-open]')) { openAoe(); return; }
    if (t.closest('[data-mi-fog-open]')) { openFog(); return; }
    if ((b = t.closest('[data-mi-sel]')) && a) { var id = b.getAttribute('data-mi-sel'), tt = aoes().find(function (q) { return q.id === id; }); if (tt) { a.sel = id; a.armed = false; a.ghost = null; a.kind = tt.kind; a.ft = Math.round(tt.len * 5); syncFan(); refresh(); camera(); } return; }
    if ((b = t.closest('[data-mi-sel]')) && !a) { var id2 = b.getAttribute('data-mi-sel'), t2 = aoes().find(function (q) { return q.id === id2; }); openAoe(t2 ? { kind: t2.kind, ft: Math.round(t2.len * 5), sel: id2 } : {}); return; }
    if (a && (b = t.closest('[data-aoe-color]'))) { var cs = selAoe(); if (cs) { snapAoe(); cs.color = b.getAttribute('data-aoe-color'); cs.element = typeof aoeElementForColor === 'function' ? aoeElementForColor(cs.color) : null; commitAoes(!!cs.pinned); } return; }
    if (a) {
      if ((b = t.closest('[data-mi-shape]'))) { var k = b.getAttribute('data-mi-shape'), u = U(), last = u.dmAoeLastSize || {}; a.kind = k; u.miAoeKind = k; a.sel = null; a.armed = true; a.ghost = null; a.ft = last[k] || DEF_FT[k]; syncFan(); refresh(); return; }
      if ((b = t.closest('[data-mi-step]'))) { var tt2 = selAoe(); setFt((tt2 ? Math.round(tt2.len * 5) : a.ft) + (+b.getAttribute('data-mi-step')), false); syncFan(); return; }
      if (t.closest('[data-mi-undo]')) { undoAoe(); return; }
      if (t.closest('[data-mi-del]')) { deleteSel(); return; }
      if (t.closest('[data-mi-snap]')) { a.snap = a.snap === false; U().miSnap = a.snap; syncFan(); return; }
      if (t.closest('[data-mi-show]')) { var s = selAoe(); if (s) { snapAoe(); s.pinned = !s.pinned; commitAoes(true); logEvent((s.pinned ? '\uD83D\uDCCD Shown: ' : 'Hidden: ') + KIND[s.kind] + ' ' + sizeWords(s)); } else a.show = !a.show; syncFan(); refresh(); return; }
      if (t.closest('[data-mi-done]')) { closeAoe(true); return; }
    }
    if (Fg()) {
      var f = Fg();
      if ((b = t.closest('[data-mi-ftool]'))) { if (b.disabled) return; f.tool = b.getAttribute('data-mi-ftool'); ring = null; hoverRoom = null; syncFogBar(); fxRefresh(); return; }
      if ((b = t.closest('[data-mi-fmode]'))) { f.mode = b.getAttribute('data-mi-fmode'); syncFogBar(); fxRefresh(); return; }
      if ((b = t.closest('[data-mi-fall]'))) { U().miFogMore = false; globalFog(b.getAttribute('data-mi-fall') === 'clear'); return; }
      if (t.closest('[data-mi-fundo]')) { fogGoto(H().pos - 1); return; }
      if (t.closest('[data-mi-fredo]')) { fogGoto(H().pos + 1); return; }
      if ((b = t.closest('[data-mi-fgoto]'))) { fogGoto(+b.getAttribute('data-mi-fgoto')); return; }
      if (t.closest('[data-mi-fmore]')) { U().miFogMore = !U().miFogMore; syncFogBar(); return; }
      if (t.closest('[data-mi-foff]')) { fogOff(); return; }
      if (t.closest('[data-mi-fdone]')) { closeFog(); return; }
    }
    if (t.closest('[data-mi-rh]')) { U().miRH = !U().miRH; render(); return; }
  }
  function onInput(ev) {
    var t = ev.target; if (!t || !t.matches || !t.matches('[data-mi-fsize]')) return;
    var f = Fg(); if (!f) return; f.size = +t.value || 10;
    var b = t.parentNode.querySelector('b'); if (b) b.textContent = f.size + ' ft';
    fxRefresh();
  }
  function typing() { var ae = document.activeElement; return ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'range'; }
  function onKey(ev) {
    if (!active() || typing()) return;
    var k = ev.key, mod = ev.ctrlKey || ev.metaKey, a = A();
    if (mv && mv.lifted) {
      if (k === 'Escape') { ev.preventDefault(); endMove(ev, true); return; }
      if (k === 'w' || k === 'W' || k === ' ') { ev.preventDefault(); addWaypoint(); return; }
      return;
    }
    if (Fg()) {
      if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); if (!cancelStroke()) closeFog(); return; }
      if (mod && (k === 'z' || k === 'Z')) { ev.preventDefault(); fogGoto(H().pos + (ev.shiftKey ? 1 : -1)); return; }
      if (mod && (k === 'y' || k === 'Y')) { ev.preventDefault(); fogGoto(H().pos + 1); return; }
      if (k === 'Alt') { fxRefresh(); }
      return;
    }
    if (a) {
      if (k === 'Escape') {
        ev.preventDefault(); ev.stopPropagation();
        if (a.from && a.sel === a.from.aoe) { X.enc.aoes = aoes().filter(function (q) { return q.id !== a.from.aoe; }); commitAoes(true); U().miAoe = null; restoreCamera(); render(); return; }
        if (a.armed && aoes().length) { a.armed = false; a.ghost = null; syncFan(); refresh(); return; }
        closeAoe(false); return;
      }
      if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); deleteSel(); return; }
      if (mod && (k === 'z' || k === 'Z')) { ev.preventDefault(); undoAoe(); return; }
      if (k === '[' || k === ']') { ev.preventDefault(); var t = selAoe(); setFt((t ? Math.round(t.len * 5) : a.ft) + (k === ']' ? 5 : -5), false); syncFan(); return; }
      return;
    }
    if (mod && (k === 'z' || k === 'Z') && !ev.shiftKey && moveUndo.length) { ev.preventDefault(); undoMove(); }
  }
  var installed = false;
  function install() {
    if (installed) return; installed = true;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', function (ev) { if (ev.key === 'Alt' && Fg()) fxRefresh(); });
    document.addEventListener('pointermove', function (ev) { if (mv) tokenMove(ev); else if (dial) moveDial(ev); });
    document.addEventListener('pointerup', function (ev) { if (mv && ev.pointerId === mv.pid) endMove(ev, false); if (dial) endDial(); });
    document.addEventListener('pointercancel', function (ev) { if (mv && ev.pointerId === mv.pid) endMove(ev, true); if (dial) endDial(); });
    document.addEventListener('contextmenu', function (ev) { if (mv && mv.lifted) { ev.preventDefault(); endMove(ev, true); } }, true);
    document.addEventListener('pointerdown', function (ev) { var t = ev.target; if (t && t.closest && t.closest('[data-mi-dial]')) startDial(ev); }, true);
    document.addEventListener('wheel', function (ev) { var t = ev.target; if (!A() || !t || !t.closest || !t.closest('[data-mi-dial]')) return; ev.preventDefault(); var s = selAoe(); setFt((s ? Math.round(s.len * 5) : A().ft) + (ev.deltaY < 0 ? 5 : -5), false); }, { passive: false });
  }
  if (typeof document !== 'undefined') install();

  W.HearthMI = {
    fogSync: fogSync, fogMask: fogMask, fogPut: fogPut, under: under, aoeGroup: aoeGroup, pathLayer: pathLayer, over: over, wire: wire, onZoom: onZoom,
    tokenDown: tokenHook, ownsPointer: ownsPointer, fanHTML: fanHTML, stageHTML: stageHTML, openAoe: openAoe, openFog: openFog, closeAoe: closeAoe,
    placeFromCard: placeFromCard, placing: placing, projLabel: projLabel, historyHTML: historyHTML, undoMove: undoMove,
    aoeOpen: function () { return !!A(); }, fogOpen: function () { return !!Fg(); },
    _hits: hits, _inside: insideG, _label: labelPlain, _stamp: stampSeg, _derived: derived, _walk: walk, _speed: speedOf, _terrain: terrainFor, _hist: H, _moves: function () { return moveUndo; }, _x: function () { return X; }
  };
})();
