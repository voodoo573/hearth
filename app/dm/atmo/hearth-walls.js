/* Hearth wall data for HearthAtmosphere light occlusion. HEARTH'S OWN PAINTED MAPS ONLY:
   uploaded maps get global weather + lighting with no walls (product decision, see NOTES.md).
   Traced from the painted-map generator (painted-maps.v6.js MAPS.* / PP.room / PP.pillar / PP.blob) with
   trace-walls.js, and checked by overlaying on the rendered maps (png/walls-*.png).
   Format (all units are grid squares, origin top-left of the map):
     { boxes:    [[x0,y0,x1,y1], ...]          solid rectangles (wall runs, pillars)
       polygons: [[[x,y],[x,y],...], ...]      solid closed outlines (cave rock edge, round pillars)
       segments: [[x0,y0,x1,y1], ...]          thin one-sided walls (fences, palisades)
       doors:    [{id, seg:[x0,y0,x1,y1], open}] block light while closed; atm.setDoor(id, true) opens
       ref:      [cols, rows]                   optional: the size the data was authored at (scaled to the live grid) }
   A map entry is either that object or a function (cols, rows) -> object, for maps whose layout follows the grid size. */
(function (root) {
  'use strict';
  function pillarPoly(x, y, h, k) { // rounded square pillar, half-size h, corner k
    var p = [], c = [[x + h - k, y - h + k, -Math.PI / 2], [x + h - k, y + h - k, 0], [x - h + k, y + h - k, Math.PI / 2], [x - h + k, y - h + k, Math.PI]];
    c.forEach(function (q) { for (var i = 0; i <= 2; i++) { var a = q[2] + i * Math.PI / 4; p.push([+(q[0] + Math.cos(a) * k).toFixed(3), +(q[1] + Math.sin(a) * k).toFixed(3)]); } });
    return p;
  }
  // room perimeter walls 1 square thick; gaps per side as [from,to] along that side (absolute squares)
  function room(C, R, g) {
    var b = [];
    function run(horiz, fixed0, fixed1, a0, a1, gaps) { var cuts = (gaps || []).slice().sort(function (p, q) { return p[0] - q[0]; }), u = a0;
      cuts.concat([[a1, a1]]).forEach(function (c) { if (c[0] > u) b.push(horiz ? [u, fixed0, c[0], fixed1] : [fixed0, u, fixed1, c[0]]); u = Math.max(u, c[1]); }); }
    run(true, 0, 1, 0, C, g.n); run(true, R - 1, R, 0, C, g.s); run(false, 0, 1, 1, R - 1, g.w); run(false, C - 1, C, 1, R - 1, g.e);
    return b;
  }
  var CAVERN = {"16x12": [[12.38, 10.33], [10.58, 11.2], [8.41, 11.23], [6.48, 10.66], [4.45, 10.49], [2.77, 9.63], [2.31, 8.15], [0.81, 7.04], [1.27, 5.58], [0.71, 3.96], [2.49, 2.95], [3.89, 1.94], [5.69, 1.34], [7.6, 0.94], [9.54, 1.28], [11.35, 1.76], [12.82, 2.65], [14.49, 3.56], [14.83, 5.01], [14.56, 6.41], [15.36, 8.06], [13.5, 9.04]], "20x15": [[15.13, 13.24], [12.18, 12.86], [9.98, 14.01], [7.64, 13.22], [5.28, 12.74], [2.74, 11.99], [2.19, 10.04], [0.89, 8.42], [2.22, 6.69], [2.55, 5.05], [3.62, 3.52], [5.29, 2.23], [7.62, 1.66], [10.02, 0.95], [12.46, 1.55], [14.84, 2.13], [15.86, 3.88], [17.24, 5.14], [17.73, 6.71], [19.01, 8.44], [17.48, 9.96], [17.11, 11.93]], "24x18": [[21.58, 6.48], [21.98, 8.52], [22.89, 10.73], [21.8, 12.87], [19.35, 14.31], [17.3, 16.02], [14.47, 17.32], [11.11, 17.43], [8.39, 15.83], [4.85, 15.78], [3.72, 13.4], [2.89, 11.4], [1.31, 9.51], [1.09, 7.27], [2.49, 5.25], [4.09, 3.29], [6.47, 1.68], [9.54, 0.73], [12.87, 0.74], [15.85, 1.7], [17.6, 3.69], [21.17, 4.13]], "30x20": [[20.97, 16.75], [17.82, 17.77], [14.27, 17.89], [10.84, 17.39], [8.07, 16.05], [5.01, 14.89], [1.21, 13.4], [2.19, 10.69], [2.43, 8.37], [3.26, 6.04], [6.4, 4.66], [7.89, 1.96], [12.29, 2.53], [15.83, 0.97], [18.94, 3.01], [22.82, 3.18], [24.78, 5.22], [28.11, 6.77], [28.93, 9.25], [27.98, 11.69], [26.18, 13.77], [24.75, 16.05]], "32x24": [[8.65, 20.11], [5.74, 18.32], [3.09, 16.18], [1.16, 13.48], [1.4, 10.46], [4.52, 8.21], [6.59, 6.12], [9.32, 4.49], [11.86, 1.75], [16.05, 2.37], [20.48, 1.23], [22.93, 4.35], [27.01, 5.22], [29.61, 7.59], [30.42, 10.56], [29.0, 13.38], [27.25, 15.71], [26.52, 18.58], [23.43, 20.34], [19.87, 21.57], [15.95, 21.04], [11.56, 22.68]]};
  function nearestTrace(C, R) { var best = null, bd = 1e9; for (var k in CAVERN) { var s = k.split('x'), d = Math.abs(s[0] - C) + Math.abs(s[1] - R); if (d < bd) { bd = d; best = k; } } return best; }
  function smoothClosed(p) { // the generator draws the blob with quadratic midpoint smoothing; follow that curve
    var out = [], n = p.length;
    for (var i = 0; i < n; i++) { var a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n], m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m1 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      for (var s = 0; s < 3; s++) { var t = s / 3, u = 1 - t; out.push([+(u * u * m0[0] + 2 * u * t * b[0] + t * t * m1[0]).toFixed(3), +(u * u * m0[1] + 2 * u * t * b[1] + t * t * m1[1]).toFixed(3)]); } }
    return out;
  }
  var MAPS = {
    // Dungeon Chamber: perimeter walls, closed door north (centre), open archway east
    dungeon: function (C, R) { var dX = Math.floor(C / 2) - 1, wY = Math.floor(R / 2) - 1, pil = [];
      [0.3, 0.7].forEach(function (fx) { [0.33, 0.67].forEach(function (fy) { pil.push(pillarPoly(Math.round(C * fx) + 0.5, Math.round(R * fy) + 0.5, 0.48, 0.14)); }); });
      return { boxes: room(C, R, { n: [[dX, dX + 2]], e: [[wY, wY + 2]] }), polygons: pil, doors: [{ id: 'north-door', seg: [dX, 0.55, dX + 2, 0.55], open: false }] }; },
    // Crypt: perimeter walls, open doorway south, two rows of pillars
    crypt: function (C, R) { var dX = Math.floor(C / 2) - 1, pil = [];
      [0.12, 0.88].forEach(function (fx) { for (var y = 3; y < R - 2; y += 3.5) pil.push(pillarPoly(Math.round(C * fx) + 0.5, y, 0.43, 0.12)); });
      return { boxes: room(C, R, { s: [[dX, dX + 2]] }), polygons: pil }; },
    // Tavern ("night interior"): perimeter walls, open door south, glazed windows north + west let light out
    tavern: function (C, R) { var dx0 = Math.floor(C / 2) - 1, wy0 = Math.floor(R / 2) - 1, nwx = Math.floor(C * 0.45);
      return { boxes: room(C, R, { n: [[nwx, nwx + 2]], s: [[dx0, dx0 + 2]], w: [[wy0, wy0 + 2]] }) }; },
    // Cavern: rock outside the traced floor outline (generator blob is seeded per grid size; traced sizes below, others scaled)
    cavern: function (C, R) { var k = nearestTrace(C, R), s = k.split('x'); return { polygons: [smoothClosed(CAVERN[k])], ref: [+s[0], +s[1]] }; }
  };
  function wallsFor(id, C, R) { var m = MAPS[id]; if (!m) return null; return typeof m === 'function' ? m(C, R) : m; }
  var H = root.HearthAtmosphere = root.HearthAtmosphere || {};
  H.mapWalls = MAPS; H.wallsFor = wallsFor; H.pillarPoly = pillarPoly; H.roomWalls = room;
})(typeof window !== 'undefined' ? window : this);
