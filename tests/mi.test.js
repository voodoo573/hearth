// Hearth v1.7.0 — Jenny's map interactions on the C2 DM screen: templates, token movement, fog.
// Serve the repo root, then: node tests/mi.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
async function open(b, w, h, opts, touch) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', hasTouch: !!touch, deviceScaleFactor: touch ? 2 : 1 });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, opts || {}); await p.waitForTimeout(900);
  return { ctx, p };
}
const cellPt = (p, x, y) => p.evaluate(([x, y]) => { const g = document.getElementById('dmMapGrid').getBoundingClientRect(), z = state.ui.dmMapZoom || 1; return { x: g.left + x * 34 * z, y: g.top + y * 34 * z }; }, [x, y]);
const tokPt = (p, name) => p.evaluate((n) => { const id = loadEncounter().combatants.find(c => c.name === n).id; const r = document.querySelector(`[data-map-token="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);
async function drag(p, a, b, n, hold) { await p.mouse.move(a.x, a.y); await p.mouse.down(); for (let i = 1; i <= (n || 8); i++) { await p.mouse.move(a.x + (b.x - a.x) * i / (n || 8), a.y + (b.y - a.y) * i / (n || 8)); await p.waitForTimeout(20); } if (hold) await hold(); await p.mouse.up(); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  let { ctx, p } = await open(b, 1440, 900);
  // ---------- templates ----------
  const lbl = await p.evaluate(() => {
    const e = loadEncounter(), L = (a) => HearthMI._label(a, HearthMI._hits(a, e).length);
    const c = e.aoes[0];
    const cone = { kind: 'cone', x: 16, y: 10, len: 12, angle: Math.PI, color: '#e8552d' }, line = { kind: 'line', x: 16, y: 10, len: 6, angle: Math.PI }, cube = { kind: 'square', x: 0, y: 12, len: 3 };
    return { circle: L(c), cone: L(cone), line: L(line), cube: L(cube), hits: HearthMI._hits(c, e).map(x => x.name).sort() };
  });
  check('the stage circle is 15 ft radius on a grid intersection and catches the two goblins', /^Circle · 15 ft radius · 2 creatures( ·)? ?$/.test(lbl.circle.trim() + ' ') && !/\p{Extended_Pictographic}/u.test(lbl.circle) && lbl.hits.join() === 'Goblin,Goblin Archer', lbl);
  check('every shape gets the same label: shape · size · creatures', /^Cone · 60 ft · 180° · \d+ creatures?$/.test(lbl.cone) && /^Line · 30 ft · \d+ creatures?$/.test(lbl.line) && /^Cube · 15 ft · 0 creatures$/.test(lbl.cube), lbl);
  const cg = await p.evaluate(() => { const g = { kind: 'cone', x: 0, y: 0, len: 4, ang: 0 }; return { axisEnd: HearthMI._inside(g, 3.9, 0), farCorner: HearthMI._inside(g, 3.9, 1.9), outside: HearthMI._inside(g, 3.9, 2.2), behind: HearthMI._inside(g, -0.5, 0) }; });
  check('cones follow 5e: as wide at the far end as they are long', cg.axisEnd && cg.farCorner && !cg.outside && !cg.behind, cg);
  // fan
  await p.evaluate(() => { state.ui.c2Card = null; render(); }); await p.waitForTimeout(300);
  await p.click('[data-c2-fab]'); await p.waitForTimeout(350); await p.click('.c2-fan [data-mi-aoe-open]'); await p.waitForTimeout(500);
  const fan = await p.evaluate(() => ({ shapes: [...document.querySelectorAll('.mi-afan [data-mi-shape]')].map(x => x.dataset.miShape), val: document.querySelector('[data-mi-dial]').textContent, fab: !!document.querySelector('.c2-fab'), handles: document.querySelectorAll('.mi-hdl').length, pills: [...document.querySelectorAll('.mi-pill')].length }));
  check('✦ → AoE morphs into the AoE fan: four shapes, − value + dial, undo/delete, Snap and Show players, ✓ Done hub', fan.shapes.join() === 'circle,cone,line,square' && /\d+ ft/.test(fan.val) && !fan.fab && fan.pills >= 2 && await p.evaluate(() => !!document.querySelector('.mi-hub[data-mi-done]') && !!document.querySelector('[data-mi-undo]') && !!document.querySelector('[data-mi-del]')), fan);
  check('the placed circle shows ✥ move and ◆ resize handles while the fan is open', fan.handles >= 2, fan);
  // place a cube by clicking on the map
  await p.click('[data-mi-shape="square"]');
  let pt = await cellPt(p, 3.4, 11.3); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
  const cube = await p.evaluate(() => { const a = loadEncounter().aoes.slice(-1)[0]; return { kind: a.kind, x: a.x, y: a.y, len: a.len, chip: [...document.querySelectorAll('.mi-chip')].map(c => c.textContent).find(t => /^Cube/.test(t)), sel: state.ui.miAoe.sel === a.id }; });
  check('a click places a 15 ft cube snapped to grid corners, selected, with its live label', cube.kind === 'square' && Number.isInteger(cube.x) && Number.isInteger(cube.y) && cube.len === 3 && /^Cube · 15 ft · \d+ creatures?/.test(cube.chip || '') && cube.sel, cube);
  await p.click('[data-mi-step="5"]'); await p.waitForTimeout(150);
  check('+ grows the selected template by 5 ft', await p.evaluate(() => loadEncounter().aoes.slice(-1)[0].len === 4));
  await p.keyboard.press('['); await p.waitForTimeout(100);
  check('[ shrinks it again', await p.evaluate(() => loadEncounter().aoes.slice(-1)[0].len === 3));
  // drag the ◆ handle to resize
  const hd = await p.evaluate(() => { const id = state.ui.miAoe.sel; const h = document.querySelector(`.mi-hdl[data-mi-id="${id}"][data-mi-h="size"]`); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const z = await p.evaluate(() => state.ui.dmMapZoom);
  await drag(p, hd, { x: hd.x + 34 * z * 2, y: hd.y + 34 * z * 2 }, 8); await p.waitForTimeout(200);
  check('dragging ◆ resizes the cube (and the fan’s value follows)', await p.evaluate(() => { const a = loadEncounter().aoes.slice(-1)[0]; return a.len === 5 && /25 ft/.test(document.querySelector('[data-mi-dial]').textContent); }));
  await p.click('[data-mi-show]'); await p.waitForTimeout(150);
  const shown = await p.evaluate(() => { const a = loadEncounter().aoes.slice(-1)[0]; const st = buildMapState(loadEncounter()); return { pinned: a.pinned, inState: st.aoes.some(x => x.id === a.id), lbl: (st.aoes.find(x => x.id === a.id) || {}).lbl }; });
  check('📍 Show players sends it to the projector with a size-only label', shown.pinned && shown.inState && shown.lbl === '25 ft cube', shown);
  const rh = () => p.evaluate(() => [...new DOMParser().parseFromString(HearthMI.historyHTML(loadEncounter()), 'text/html').querySelectorAll('.mi-rh span')].map(s => (s.classList.contains('undone') ? '~' : '') + s.textContent));
  const rh0 = await rh();
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  const rh1 = await rh();
  check('round history is honest: undoing Show players greys out its "Shown" entry', /^Shown to players: Cube/.test(rh0[0]) && /^~Shown to players: Cube.*undone$/.test(rh1[0]), { rh0: rh0.slice(0, 2), rh1: rh1.slice(0, 2) });
  check('Ctrl+Z undoes the last template change', await p.evaluate(() => !loadEncounter().aoes.slice(-1)[0].pinned));
  await p.keyboard.press('Delete'); await p.waitForTimeout(150);
  check('Delete removes the selected template', await p.evaluate(() => loadEncounter().aoes.length === 1));
  await p.click('[data-mi-done]'); await p.waitForTimeout(300);
  check('✓ Done commits and morphs back into the tool fan', await p.evaluate(() => !state.ui.miAoe && !!document.querySelector('.c2-fan.open')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // ---------- projector state ----------
  const proj = await p.evaluate(() => {
    const e = loadEncounter(); e.aoes.push({ id: 'aoe_hidden', kind: 'cone', x: 16, y: 10, len: 12, angle: Math.PI, pinned: false }); e.fog = { on: true, revealed: [] };
    for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) if (!(x >= 13 && y >= 7)) e.fog.revealed.push(x + ',' + y);
    const d = e.combatants.find(c => c.name === 'Ogre'); d.hiddenFromPlayers = true; saveEncounter(e);
    const st = buildMapState(e); const tok = (n) => st.tokens.find(t => t.name === n);
    return { aoes: st.aoes.map(a => a.id), counts: JSON.stringify(st.aoes).includes('creature'), dragonFog: !tok('Adult Red Dragon') || !!tok('Adult Red Dragon').fogHidden, goblinFog: !tok('Goblin') || !!tok('Goblin').fogHidden, ogreHidden: !tok('Ogre') || !!tok('Ogre').hidden, dragonSent: !!tok('Adult Red Dragon'), ogreSent: !!tok('Ogre'), init: st.initiative.map(i => i.name), mask: !!st.fog.mask };
  });
  check('projector: only shown templates, no creature counts', proj.aoes.join() === 'aoe_fb' && !proj.counts, proj);
  check('projector: a monster under fog and a hidden token aren\u2019t sent at all (and are left off the initiative list)', proj.dragonFog && !proj.dragonSent && !proj.ogreSent && !proj.goblinFog && proj.ogreHidden && !proj.init.includes('Adult Red Dragon') && !proj.init.includes('Ogre') && proj.mask, proj);
  // ---------- fog ----------
  await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; e.combatants.forEach(c => { c.hiddenFromPlayers = false; c.vision = 0; }); e.aoes = []; saveEncounter(e); render(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(500);
  const bar = await p.evaluate(() => ({ tools: [...document.querySelectorAll('[data-mi-ftool]')].map(x => x.dataset.miFtool), cv: !!document.getElementById('miFog'), pv: !!document.querySelector('.mi-pview canvas'), hist: !!document.querySelector('.mi-hist') }));
  check('fog bar: Brush, Area, Room; soft fog canvas; history list and live projector preview (desktop)', bar.tools.join() === 'brush,rect,room' && bar.cv && bar.pv && bar.hist, bar);
  const m0 = await p.evaluate(() => loadEncounter().fog.revealed.length);
  let A = await cellPt(p, 3, 7), B = await cellPt(p, 8, 7);
  let mid = null;
  await drag(p, A, B, 10, async () => { mid = await p.evaluate(() => ({ live: loadEncounter().fog.revealed.length, ring: !!document.querySelector('.mi-ring.on'), busy: !!document.querySelector('.mi-busy') })); });
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ rev: loadEncounter().fog.revealed.length, hist: HearthMI._hist().items.map(i => i.label), fx: loadEncounter().fog.fx }));
  check('brush: live on the DM screen, committed to the projector on release', mid.ring && mid.busy && mid.live === m0 && after.rev > m0 && after.fx && after.fx.dur === 600, { m0, mid, after: after.rev });
  check('the stroke is one history step', after.hist.length === 1 && /Brush clear/.test(after.hist[0]), after.hist);
  const sub = await p.evaluate(() => { const e = loadEncounter(), m = HearthMI.fogMask(e); let part = 0; for (let y = 0; y < 15; y++) for (let x = 0; x < 20; x++) { let s = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += m[(y * 4 + j) * 80 + x * 4 + i]; if (s > 0 && s < 16) part++; } return part; });
  check('fog is a fine mask: brush edges cut through squares (no per-square jaggies)', sub > 0, sub);
  await p.click('[data-mi-ftool="rect"]'); await p.evaluate(() => { document.getElementById('dmMapScroll').scrollTop = 0; }); await p.waitForTimeout(150); // the full-bleed board scrolls: bring row 2 into view
  A = await cellPt(p, 12, 2); B = await cellPt(p, 16, 5); await drag(p, A, B, 6); await p.waitForTimeout(300);
  const ar = await p.evaluate(() => { const r = new Set(loadEncounter().fog.revealed); let all = true; for (let x = 12; x < 16; x++) for (let y = 2; y < 5; y++) if (!r.has(x + ',' + y)) all = false; return { all, hist: HearthMI._hist().items.length, last: HearthMI._hist().items.slice(-1)[0].label }; });
  check('area reveal snaps to the grid (20×15 ft) and is one step', ar.all && ar.hist === 2 && /Area 20×15 ft/.test(ar.last), ar);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  check('Ctrl+Z steps the fog back', await p.evaluate(() => !loadEncounter().fog.revealed.includes('13,3') && HearthMI._hist().pos === 1));
  const fr1 = await rh();
  check('…and greys out that fog step in the round history', fr1.some(x => /^~\s*Area 20×15 ft/.test(x)) && fr1.some(x => /^\s*Brush clear/.test(x)), fr1.slice(0, 4));
  await p.keyboard.press('Control+Shift+Z'); await p.waitForTimeout(300);
  check('Ctrl+Shift+Z redoes it', await p.evaluate(() => loadEncounter().fog.revealed.includes('13,3') && HearthMI._hist().pos === 2));
  const fr2 = await rh();
  check('redo restores the history entry', fr2.some(x => /^\s*Area 20×15 ft/.test(x)) && !fr2.some(x => /^~\s*Area 20×15/.test(x)), fr2.slice(0, 4));
  // brush wobble then Esc: nothing changes
  await p.click('[data-mi-ftool="brush"]'); await p.evaluate(() => { const sc = document.getElementById('dmMapScroll'); sc.scrollTop = sc.scrollHeight; }); await p.waitForTimeout(150); // row 12 into view
  const before = await p.evaluate(() => loadEncounter().fog.mask);
  A = await cellPt(p, 5, 12); B = await cellPt(p, 9, 12);
  await drag(p, A, B, 6, async () => { await p.keyboard.press('Escape'); });
  await p.waitForTimeout(200);
  check('Esc mid-stroke cancels it (nothing reaches the projector)', await p.evaluate((b) => loadEncounter().fog.mask === b && HearthMI._hist().items.length === 2, before));
  await p.click('[data-mi-fall="clear"]'); await p.waitForTimeout(250);
  check('☀ Reveal all asks first', await p.evaluate(() => !!document.querySelector('.dialog, #dialogBackdrop, [role="dialog"]')));
  await p.evaluate(() => { const y = [...document.querySelectorAll('.dialog button, [role="dialog"] button')].find(b => /reveal/i.test(b.textContent)); y.click(); }); await p.waitForTimeout(300);
  check('…then clears every square and can be undone', await p.evaluate(() => loadEncounter().fog.revealed.length === 300 && /Reveal all/.test(HearthMI._hist().items.slice(-1)[0].label)));
  // classic edits fold into the mask
  const sync = await p.evaluate(() => { const e = loadEncounter(); e.fog.revealed = ['0,0']; HearthMI.fogSync(e); const m = HearthMI.fogMask(e); return { a: m[0], b: m[5] }; });
  check('older whole-square edits (vision, classic brush) fold into the mask', sync.a === 1 && sync.b === 0, sync);
  const css = await p.evaluate(async () => (await (await fetch('dm/mi.css')).text()));
  const hex = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => !['#000', '#fff', '#c0392b', '#f08a6e', '#ff8a3d', '#ffb347', '#a9c47e'].includes(h.toLowerCase()));
  check('mi.css takes its golds from the palette (only ember, reds, greens, black/white fixed)', hex.length === 0, hex);
  await p.click('[data-mi-fdone]'); await p.waitForTimeout(200);
  // ---------- token movement ----------
  await p.evaluate(() => { const e = loadEncounter(); e.fog = null; saveEncounter(e); render(); }); await p.waitForTimeout(300);
  const og = await tokPt(p, 'Ogre');
  let T1 = await cellPt(p, 9.5, 9.5), T2 = await cellPt(p, 12.5, 8.5), mv = null;
  await p.mouse.move(og.x, og.y); await p.mouse.down();
  for (let i = 1; i <= 8; i++) { await p.mouse.move(og.x + (T1.x - og.x) * i / 8, og.y + (T1.y - og.y) * i / 8); await p.waitForTimeout(20); }
  await p.waitForTimeout(480);
  for (let i = 1; i <= 6; i++) { await p.mouse.move(T1.x + (T2.x - T1.x) * i / 6, T1.y + (T2.y - T1.y) * i / 6); await p.waitForTimeout(20); }
  await p.waitForTimeout(100);
  mv = await p.evaluate(() => ({ chip: (document.querySelector('.mi-mchip') || {}).textContent, ghost: !!document.querySelector('.map-token.mi-ghost'), lift: !!document.querySelector('.map-token.mi-lift'), wp: document.querySelectorAll('.mi-wp').length, path: document.querySelectorAll('.mi-pcell').length, reach: document.querySelectorAll('.mi-reach').length }));
  check('lifting a token: ghost on the start square, gold path, reach tint, "N ft of 40" chip', mv.ghost && mv.lift && mv.path > 0 && mv.reach > 0 && /^\d+ ft of 40/.test(mv.chip || ''), mv);
  check('a 400 ms pause bends the path at a waypoint', mv.wp >= 1, mv);
  await p.mouse.up(); await p.waitForTimeout(400);
  const dn = await p.evaluate(() => ({ pos: (c => [c.mapX, c.mapY])(loadEncounter().combatants.find(c => c.name === 'Ogre')), toast: (document.querySelector('.mi-toast') || {}).textContent, log: HearthMI.historyHTML(loadEncounter()) }));
  check('drop saves the move and shows "Ogre moved N ft · ↶ Undo" (+ round history)', dn.pos[0] === 12 && /^Ogre moved \d+ ft/.test(dn.toast || '') && /Ogre moved/.test(dn.log), dn);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(500);
  check('Ctrl+Z puts the token back', await p.evaluate(() => { const c = loadEncounter().combatants.find(c => c.name === 'Ogre'); return c.mapX === 7 && c.mapY === 6; }));
  // right-click cancel
  const gb = await tokPt(p, 'Goblin'); T1 = await cellPt(p, 8.5, 8.5);
  await p.mouse.move(gb.x, gb.y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(gb.x + (T1.x - gb.x) * i / 6, gb.y + (T1.y - gb.y) * i / 6); await p.waitForTimeout(20); }
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(300); await p.mouse.up({ button: 'right' }); await p.mouse.up(); await p.waitForTimeout(300);
  check('right-click mid-drag cancels the move', await p.evaluate(() => { const c = loadEncounter().combatants.find(c => c.name === 'Goblin'); return c.mapX === 11 && c.mapY === 5 && !document.querySelector('.mi-lift'); }));
  // over speed + difficult terrain (pure functions)
  const pc = await p.evaluate(() => ({ walk: HearthMI._walk(0, 0, 3, 1).length, sp: HearthMI._speed(loadEncounter().combatants.find(c => c.name === 'Adult Red Dragon')) }));
  check('diagonals cost one square (5 ft); speed comes from the stat block', pc.walk === 3 && pc.sp === 40, pc);
  const terr = await p.evaluate(async () => { const t = await HearthPaintedMaps.terrain('sewer', 20, 15); return { water: t.water.filter(Boolean).length, rooms: t.rooms.length }; });
  check('painted maps carry terrain: the sewer has water squares (difficult)', terr.water > 0, terr);
  await ctx.close();
  // ---------- phone ----------
  ({ ctx, p } = await open(b, 412, 880, {}, true));
  await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); }); await p.waitForTimeout(900);
  const ph = await p.evaluate(() => { const f = document.querySelector('.mi-afan [data-mi-shape="cone"]').getBoundingClientRect(); const pk = document.querySelector('.mi-peek'); const hd = document.querySelector('.mi-hdl.on').getBoundingClientRect(), sm = document.querySelector('.mi-hdl.sm'); return { peek: pk ? pk.getBoundingClientRect().height : 0, cone: f.width, hdl: Math.round(hd.width), other: sm ? Math.round(sm.getBoundingClientRect().width) : 0, on: document.querySelector('[data-mi-shape="cone"]').classList.contains('on') }; });
  check('phone: Place cone folds the sheet to a 99 px peek bar and opens the thumb fan on Cone, 52 px slots, 44 px handles on the selected template (26 px on the others)', ph.peek === 99 && ph.cone === 52 && ph.hdl === 44 && ph.other === 26 && ph.on, ph);
  const vis = await p.evaluate(() => { const id = loadEncounter().combatants.find(c => c.name === 'Adult Red Dragon').id; const r = document.querySelector(`[data-map-token="${id}"]`).getBoundingClientRect(); const R = 226 + 26 + 16 + 40; return { inView: r.top >= 0 && r.left >= 0 && r.right <= innerWidth, clear: Math.hypot(innerWidth - (r.left + r.width / 2), innerHeight - (r.top + r.height / 2)) > R * 0.9 }; });
  check('phone: the map pans so the dragon (the cone’s origin) is visible, clear of the fan', vis.inView && vis.clear, vis);
  await ctx.close();
  // ---------- handles never cover a token (desktop and phone) ----------
  const hdlClear = (p) => p.evaluate(() => { const toks = [...document.querySelectorAll('[data-map-token]')].map(t => t.getBoundingClientRect()); const hs = [...document.querySelectorAll('.mi-hdl')]; return { n: hs.length, on: hs.filter(h => toks.some(t => { const r = h.getBoundingClientRect(); return r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top; })).map(h => h.getAttribute('aria-label')) }; });
  for (const [w, h, touch] of [[1440, 900, false], [412, 880, true]]) {
    ({ ctx, p } = await open(b, w, h, {}, touch));
    await p.evaluate(() => { const e = loadEncounter(); e.aoes.push({ id: 'aoe_cube', kind: 'square', x: 1, y: 11, len: 3, angle: 0, color: '#c0392b', pinned: false }); e.aoes.push({ id: 'aoe_ln', kind: 'line', x: 5.5, y: 9.5, len: 6, angle: -0.6, color: '#c0392b', pinned: false }); saveEncounter(e); render(); });
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); }); await p.waitForTimeout(900);
    const hc = await hdlClear(p);
    check(`${touch ? 'phone' : 'desktop'}: no template handle covers a token (cone on the dragon, circle on the goblin, line from the Ranger)`, hc.n >= 9 && hc.on.length === 0, hc);
    if (!touch) {
      // a handle that was slid off its point drags from where it sits: grabbing it doesn't jump the template
      const g0 = await p.evaluate(() => { const a = loadEncounter().aoes.find(x => x.kind === 'cone' && !x.pinned) || HearthMI._x().enc.aoes.slice(-1)[0]; return { ang: a.angle, len: a.len }; });
      const mh = await p.evaluate(() => { const h = [...document.querySelectorAll('.mi-hdl.on')].find(x => x.dataset.miH === 'aim'); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(mh.x, mh.y); await p.mouse.down(); await p.mouse.move(mh.x + 1, mh.y); await p.mouse.move(mh.x, mh.y); await p.mouse.up(); await p.waitForTimeout(200);
      const g1 = await p.evaluate(() => { const a = HearthMI._x().enc.aoes.slice(-1)[0]; return { ang: a.angle, len: a.len }; });
      check('grabbing an offset handle keeps the template where it was (no jump)', Math.abs(g1.ang - g0.ang) < 0.27 && g1.len === g0.len, { g0, g1 });
    }
    await ctx.close();
  }
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const n = results.filter(r => r.ok).length; console.log(`\n${n}/${results.length} passed`); process.exit(n === results.length ? 0 : 1);
})();
