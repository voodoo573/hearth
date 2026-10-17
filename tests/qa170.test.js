// Hearth v1.7.1 — regression tests for Lee's 1.7.0 QA pass (/workspace/hearth/qa-170/report.md), one block per bug,
// built from Lee's repro scripts (qa/*.js). Every player-facing channel asks the same playerVisibility(enc) question.
// Serve the repo root, then: node tests/qa170.test.js 8816   (PW_MODULE = your playwright-core path)
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const BASE = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
let browser;
async function boot(opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 1440, height: 900 }, serviceWorkers: 'block', deviceScaleFactor: 1, hasTouch: !!opts.touch });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.evaluate(S.SEED, opts.layout || null); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, opts.stage || {}); await p.waitForTimeout(1300);
  const I = await p.evaluate(() => { const o = {}; loadEncounter().combatants.forEach(c => o[c.name] = c.id); return o; });
  return { ctx, p, I };
}
async function projector(ctx, p) {
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  pop.on('pageerror', e => errs.push('projector: ' + e.message));
  await pop.setViewportSize({ width: 1280, height: 720 });
  await pop.evaluate(() => { window.__msgs = []; new BroadcastChannel('hearth-projector-map').onmessage = (ev) => { window.__msgs.push(ev.data); }; });
  await p.waitForTimeout(500);
  return pop;
}
const lastMap = (pop) => pop.evaluate(() => { const m = window.__msgs.filter(x => x.type === 'hearth-map').pop(); return m ? JSON.parse(JSON.stringify(m)) : null; });
const b2s = (p, x, y) => p.evaluate(([x, y]) => { const X = HearthMI._x(), r = X.grid.getBoundingClientRect(), z = X.getZoom ? X.getZoom() : 1; return [r.left + x * X.cell * z, r.top + y * X.cell * z]; }, [x, y]);
async function dragBoard(p, a, b) { const s = await b2s(p, a[0], a[1]), e = await b2s(p, b[0], b[1]); await p.mouse.move(s[0], s[1]); await p.mouse.down(); await p.mouse.move(e[0], e[1], { steps: 8 }); await p.mouse.up(); }
async function dragToken(p, id, to, beforeUp) {
  const r = await p.evaluate((id) => { const t = document.querySelector('[data-map-token="' + id + '"]').getBoundingClientRect(); return [t.left + t.width / 2, t.top + t.height / 2]; }, id);
  const e = await b2s(p, to[0] + 0.5, to[1] + 0.5);
  await p.mouse.move(r[0], r[1]); await p.mouse.down(); await p.mouse.move(r[0] + 10, r[1] + 10, { steps: 2 });
  await p.mouse.move(e[0], e[1], { steps: 10 }); if (beforeUp) await beforeUp(); await p.mouse.up(); await p.waitForTimeout(400);
}
const fogState = (p) => p.evaluate(() => { const e = loadEncounter(); return { n: (e.fog && e.fog.revealed || []).length, rev: (e.fog && e.fog.revealed || []).slice().sort(), hist: HearthMI._hist().pos + '/' + HearthMI._hist().items.length }; });
const linkOrder = (p) => p.evaluate(() => new Promise(res => { const out = []; HearthLink.host = HearthLink.host || { devices: {} };
  HearthLink.host.devices = { d1: { accepted: true, deviceId: 'd1', conn: { send: (m) => out.push(m) } } }; linkPushCombat(true); setTimeout(() => res(out), 150); }));
// fog everywhere except a Ranger strip (Lee's fog scripts)
const STRIP = () => { const e = loadEncounter(); e.aoes = []; e.fog = { on: true, revealed: [] }; for (let x = 3; x <= 8; x++) for (let y = 7; y <= 12; y++) e.fog.revealed.push(x + ',' + y); saveEncounter(e); state.ui.c2Card = null; render(); };

(async () => {
  browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

  // ---------------- P1-01 (Blocker): the live game link uses the projector's footprint test
  {
    const { ctx, p, I } = await boot();
    await p.evaluate(() => { const e = loadEncounter(); e.aoes = []; e.fog = { on: true, revealed: [] };
      for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) { const inD = x >= 15 && x <= 17 && y >= 9 && y <= 11; if (!inD || (x === 15 && y === 9)) e.fog.revealed.push(x + ',' + y); }
      e.fog.mask = null; saveEncounter(e); state.ui.c2Card = null; render(); });
    const pop = await projector(ctx, p);
    const sent = await linkOrder(p);
    await p.evaluate(() => broadcastMap(loadEncounter())); await pop.waitForTimeout(900);
    const m = await lastMap(pop);
    const phone = sent.length ? sent[0].order.map(o => o.n) : null;
    check('P1-01 fogged Huge dragon (only its top-left square revealed): not in the phones\u2019 turn order', phone && phone.indexOf('Adult Red Dragon') < 0 && phone.length === 5, phone);
    check('P1-01 \u2026and no "its turn" flag reaches any phone', sent.length && !sent[0].order.some(o => o.turn), sent[0] && sent[0].order);
    check('P1-01 projector and phones list the same creatures', m && JSON.stringify(m.initiative.map(r => r.name)) === JSON.stringify(phone), { proj: m && m.initiative.map(r => r.name), phone });
    // the same question everywhere: random fog patterns, the projector and the link always agree
    const agree = await p.evaluate(() => {
      let bad = [], seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 40; k++) {
        const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) if (R() < 0.55) e.fog.revealed.push(x + ',' + y);
        e.combatants.forEach(c => { c.hiddenFromPlayers = R() < 0.15; }); saveEncounter(e);
        const ms = buildMapState(loadEncounter()), vis = playerVisibility(loadEncounter());
        const want = sortedCombatants(loadEncounter()).filter(vis).map(c => playerVisibleName(c));
        if (JSON.stringify(ms.initiative.map(r => r.name)) !== JSON.stringify(want)) bad.push(k);
      }
      return bad;
    });
    check('P1-01 one shared playerVisibility(): projector turn order = shared test, 40 random fog/hidden boards', agree.length === 0, agree);
    const ctl = await p.evaluate(() => { const e = loadEncounter(); e.combatants.forEach(c => c.hiddenFromPlayers = false); for (let x = 15; x <= 17; x++) for (let y = 9; y <= 11; y++) e.fog.revealed.push(x + ',' + y); e.fog.mask = null; saveEncounter(e); return 1; });
    void ctl; const sent2 = await linkOrder(p);
    check('P1-01 control: once its space is revealed the dragon and its turn reach the phones', sent2.length && sent2[0].order.some(o => o.n === 'Adult Red Dragon' && o.turn), sent2[0] && sent2[0].order);
    await ctx.close();
  }

  // ---------------- P1-02: an aura that follows a hidden creature is not sent
  {
    const { ctx, p, I } = await boot();
    await p.evaluate((I) => { const e = loadEncounter(); const d = e.combatants.find(c => c.id === I['Adult Red Dragon']); d.hiddenFromPlayers = true;
      e.aoes = [{ id: 'aoe_aura', kind: 'circle', x: 0, y: 0, len: 3, angle: 0, color: '#f5c542', pinned: true, attachedTo: d.id }]; saveEncounter(e); state.ui.c2Card = null; render(); }, I);
    const pop = await projector(ctx, p);
    await pop.evaluate(() => { window.__msgs = []; }); await p.evaluate(() => broadcastMap(loadEncounter())); await pop.waitForTimeout(900);
    const a1 = (await lastMap(pop)).aoes;
    await p.evaluate((I) => { const e = loadEncounter(); const d = e.combatants.find(c => c.id === I['Adult Red Dragon']); d.mapX = 3; d.mapY = 11; saveEncounter(e); broadcastMap(loadEncounter()); render(); }, I);
    await pop.waitForTimeout(800);
    const a2 = (await lastMap(pop)).aoes;
    const drawn = await pop.evaluate(() => document.querySelectorAll('#grid svg circle, #grid .aoe, #grid [data-aoe-id]').length);
    check('P1-02 shown aura on a hidden dragon: not in the projector message', a1.length === 0, a1);
    check('P1-02 \u2026and it doesn\u2019t follow the hidden dragon when it moves', a2.length === 0, a2);
    await p.evaluate((I) => { const e = loadEncounter(); e.combatants.find(c => c.id === I['Adult Red Dragon']).hiddenFromPlayers = false; saveEncounter(e); broadcastMap(loadEncounter()); }, I);
    await pop.waitForTimeout(800);
    const a3 = (await lastMap(pop)).aoes;
    check('P1-02 control: once the dragon is visible its aura shows, on the dragon', a3.length === 1 && a3[0].x === 4.5 && a3[0].y === 12.5, a3);
    void drawn; await ctx.close();
  }

  // ---------------- P1-03: a hidden monster's roll never reaches the projector, in either layout
  {
    const { ctx, p, I } = await boot();
    await p.evaluate((I) => { const e = loadEncounter(); e.combatants.find(c => c.id === I['Adult Red Dragon']).hiddenFromPlayers = true; e.aoes = []; saveEncounter(e);
      state.prefs.diceProjector = 'important'; state.prefs.diceAnim = 'off'; dmSetLayout('classic'); render(); }, I);
    await p.waitForTimeout(700);
    const pop = await projector(ctx, p);
    await p.evaluate(() => { window.__realRollDie = rollDie; rollDie = () => 20; });
    const save = async (id) => { await p.evaluate((id) => { state.ui.dmSaveFor = id; state.ui.dmSaveResult = null; render(); }, id); await p.waitForTimeout(350); await p.click('[data-dm-save-roll="dex"]'); await pop.waitForTimeout(1000); return pop.evaluate(() => window.__msgs.filter(m => m.type === 'hearth-dice').map(m => m.label + ' ' + m.total)); };
    let dice = await save(I['Adult Red Dragon']);
    check('P1-03 classic layout, "important rolls": hidden dragon\u2019s nat-20 DEX save never projected', dice.length === 0, dice);
    const conc = await p.evaluate((id) => { const e = loadEncounter(); const r = []; const ch = getMapChannel(); const orig = ch.postMessage.bind(ch); ch.postMessage = (m) => { r.push(m.type); return orig(m); };
      const ok1 = hearthDiceSendToProjector({ id: 'x', label: 'secret', secret: true, total: '1' });
      _hearthDiceCurrentEntry = { id: 'y', label: 'secret', secret: true }; hearthDiceOnProjector(); ch.postMessage = orig; return { ok1, posted: r }; }, I['Adult Red Dragon']);
    check('P1-03 the Send-to-projector path refuses a secret (hidden creature) roll too', conc.ok1 === false && conc.posted.length === 0, conc);
    const secret = await p.evaluate((id) => hearthDiceRoll({ who: 'DM', label: 'x', groups: [{ sides: 20, values: [20] }], total: 20, subject: id, animate: false }).then(e => !!(e && e.secret)), I['Adult Red Dragon']);
    check('P1-03 a roll for a hidden creature is marked DM-only (stat-card rolls on C2 pass their creature too)', secret === true);
    await p.evaluate(() => { window.__msgs = []; }); await pop.evaluate(() => { window.__msgs = []; });
    await p.evaluate((I) => { const e = loadEncounter(); e.combatants.find(c => c.id === I['Adult Red Dragon']).hiddenFromPlayers = false; saveEncounter(e); render(); }, I);
    dice = await save(I['Adult Red Dragon']);
    check('P1-03 control: the same nat 20 for the visible dragon still goes up', dice.length === 1 && /Adult Red Dragon DEX save/.test(dice[0]), dice);
    // fogged counts as hidden too
    await pop.evaluate(() => { window.__msgs = []; });
    await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 12; x++) for (let y = 0; y < 15; y++) e.fog.revealed.push(x + ',' + y); saveEncounter(e); render(); });
    dice = await save(I['Adult Red Dragon']);
    check('P1-03 a fogged dragon\u2019s roll stays off the projector', dice.length === 0, dice);
    await ctx.close();
  }

  // ---------------- P1-04 / P1-06: hidden torches: no embers or smoke from them, weather stays in sync, no sound
  {
    const { ctx, p, I } = await boot();
    await p.evaluate((I) => { const e = loadEncounter(); const d = e.combatants.find(c => c.id === I['Adult Red Dragon']); d.hiddenFromPlayers = true;
      e.aoes = []; e.atmo = { w: 'embers', i: 0.7, t: 'night', d: 0.3, wind: 0.3, mapLights: true, doors: {}, seed: 5, lights: { [d.id]: 'torch' } }; saveEncounter(e); state.ui.c2Card = null; render(); }, I);
    await p.waitForTimeout(1500);
    const pop = await projector(ctx, p);
    await p.evaluate(() => broadcastMap(loadEncounter()));
    await pop.waitForFunction(() => window.HearthAtmo && HearthAtmo._proj().atm, null, { timeout: 20000 }); await pop.waitForTimeout(1500);
    const REC = () => { const A = window.HearthAtmo && (HearthAtmo.atm || HearthAtmo._proj().atm); window.__ck = {}; A.on('frame', () => { const c = A.checksum(); window.__ck[c.tick] = c.parts + '|' + c.smokes; }); };
    await p.evaluate(REC); await pop.evaluate(REC); await p.bringToFront(); await p.waitForTimeout(2500); await pop.bringToFront(); await pop.waitForTimeout(2500);
    const A = await p.evaluate(() => window.__ck), B = await pop.evaluate(() => window.__ck);
    const both = Object.keys(A).filter(t => t in B), bad = both.filter(t => A[t] !== B[t]);
    check('P1-04 hidden dragon with a torch: DM and projector embers/smoke identical tick for tick', both.length >= 3 && bad.length === 0, { compared: both.length, mismatched: bad.length });
    const dmL = await p.evaluate(() => HearthAtmo.atm.lights().map(l => ({ id: l.id, dmOnly: !!l.dmOnly })));
    const pjL = await pop.evaluate(() => HearthAtmo._proj().atm.lights().map(l => l.id));
    check('P1-04 the hidden torch glows on the DM screen only (DM-only light, not sent to the projector)', dmL.some(l => l.dmOnly && /Adult|tok-/.test(l.id)) && !pjL.some(id => id.indexOf(I['Adult Red Dragon']) >= 0), { dmL, pjL });
    // the dragon (3x3 at 15,9) stands at x = 16.5 / 20 = 0.825 across the map; the map's own torches stay
    const atDragon = (f) => f.filter(q => Math.abs(q.x - 0.825) < 0.01);
    const fires = await p.evaluate(() => HearthAtmo.atm.audioState().fires);
    check('P1-06 DM\u2019s own sound leaves out the hidden torch (no crackle panned to where nobody is)', fires.length > 0 && atDragon(fires).length === 0, fires);
    await p.evaluate((I) => { const e = loadEncounter(); e.combatants.find(c => c.id === I['Adult Red Dragon']).hiddenFromPlayers = false; saveEncounter(e); render(); }, I);
    await p.waitForTimeout(600);
    const fires2 = await p.evaluate(() => HearthAtmo.atm.audioState().fires);
    check('P1-06 control: the same torch on a visible dragon crackles', atDragon(fires2).length === 1 && fires2.length === fires.length + 1, fires2);
    // fogged creatures' torches are DM-only too
    await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 12; x++) for (let y = 0; y < 15; y++) e.fog.revealed.push(x + ',' + y); saveEncounter(e); render(); });
    await p.waitForTimeout(600);
    const fires3 = await p.evaluate(() => HearthAtmo.atm.audioState().fires);
    check('P1-04/06 a fogged dragon\u2019s torch: no sound, and DM-only (no embers source)', atDragon(fires3).length === 0 && await p.evaluate(() => HearthAtmo.atm.lights().some(l => l.dmOnly)), fires3);
    await ctx.close();
  }

  // ---------------- P1-05: a "hide name" creature's real name never travels to the projector
  {
    const { ctx, p, I } = await boot();
    await p.evaluate((I) => { const e = loadEncounter(); const c = e.combatants.find(c => c.id === I['Cultist']); c.hideName = true; c.name = 'Vampire Spawn (disguised)'; e.aoes = []; saveEncounter(e); state.ui.c2Card = null; render(); }, I);
    const pop = await projector(ctx, p);
    await pop.evaluate(() => { window.__msgs = []; }); await p.evaluate(() => broadcastMap(loadEncounter())); await pop.waitForTimeout(900);
    const raw = await pop.evaluate(() => JSON.stringify(window.__msgs.filter(m => m.type === 'hearth-map')));
    const m = await lastMap(pop); const t = m.tokens.find(t => t.hideName);
    check('P1-05 hide-name creature: the real name is nowhere in the projector message', raw.indexOf('Vampire') < 0 && t && t.name === '' && t.label === '4', t);
    const sent = await linkOrder(p);
    check('P1-05 \u2026nor in the phones\u2019 turn order', sent.length && JSON.stringify(sent[0]).indexOf('Vampire') < 0, sent[0] && sent[0].order.map(o => o.n));
    check('P1-05 hidden / dead / fogged flags are never true in a sent token (those creatures aren\u2019t sent)', m.tokens.every(t => !t.hidden && !t.dead && !t.fogHidden));
    await ctx.close();
  }

  // ---------------- F-01: undo after a classic "Hide all" doesn't bring fog back (or the Ogre)
  {
    const { ctx, p, I } = await boot();
    await p.evaluate(STRIP); await p.waitForTimeout(600);
    const pop = await projector(ctx, p);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.click('[data-mi-ftool="rect"]');
    await dragBoard(p, [9, 5], [14, 8]); await p.waitForTimeout(600);
    await p.click('[data-mi-fdone]'); await p.waitForTimeout(300);
    await p.evaluate(() => { dmSetLayout('classic'); render(); }); await p.waitForTimeout(700);
    await p.click('[data-fog-cover]'); await p.waitForTimeout(700);
    const s2 = await fogState(p);
    await p.evaluate(() => { dmSetLayout('c2'); render(); }); await p.waitForTimeout(700);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(1000);
    const s3 = await fogState(p);
    const pj = await pop.evaluate(() => [...document.querySelectorAll('#grid .tok')].map(t => t.getAttribute('data-tok-id')));
    check('F-01 classic Hide all, then C2 undo: nothing comes back from under the fog', s2.n === 0 && s3.n === 0, { afterHideAll: s2.n, afterUndo: s3.n, hist: s3.hist });
    check('F-01 \u2026the Ogre and Goblin stay off the projector', pj.indexOf(I['Ogre']) < 0 && pj.indexOf(I['Goblin']) < 0, pj);
    // undoing a C2 "Re-cover all" brings back exactly what it covered
    await p.evaluate(STRIP); await p.waitForTimeout(500);
    const before = await fogState(p);
    await p.click('[data-mi-fall="cover"]'); await p.waitForTimeout(250);
    await p.evaluate(() => { const y = [...document.querySelectorAll('.dialog button, [role="dialog"] button')].find(b => /re-cover/i.test(b.textContent)); y.click(); }); await p.waitForTimeout(700);
    const covered = await fogState(p);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(900);
    const back = await fogState(p);
    check('F-01 undoing the C2 Re-cover all restores exactly the squares it covered', covered.n === 0 && JSON.stringify(back.rev) === JSON.stringify(before.rev), { before: before.n, covered: covered.n, back: back.n });
    await ctx.close();
  }

  // ---------------- F-02: undo keeps squares darkvision revealed afterwards
  {
    const { ctx, p, I } = await boot();
    await p.evaluate(() => { const coll = loadGames(), g = activeGame(coll); g.players.find(x => x.name === 'Ranger').vision = 15; saveGames(coll); });
    await p.evaluate(STRIP); await p.waitForTimeout(600);
    const s0 = await fogState(p);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.click('[data-mi-ftool="rect"]');
    await dragBoard(p, [12, 10], [14, 13]); await p.waitForTimeout(600);
    const a = await fogState(p);
    await p.click('[data-mi-fdone]'); await p.waitForTimeout(400);
    await dragToken(p, I['Ranger'], [10, 9]); await p.waitForTimeout(700);
    const b = await fogState(p); const vis = b.rev.filter(k => a.rev.indexOf(k) < 0);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(900);
    const c = await fogState(p); const area = a.rev.filter(k => s0.rev.indexOf(k) < 0);
    check('F-02 darkvision reveals made after the step survive its undo', vis.length > 5 && vis.every(k => c.rev.indexOf(k) >= 0), { vision: vis.length, lost: vis.filter(k => c.rev.indexOf(k) < 0).length });
    check('F-02 \u2026and only that step\u2019s squares are covered again', area.length > 0 && area.filter(k => vis.indexOf(k) < 0).every(k => c.rev.indexOf(k) < 0) && c.n === b.n - area.filter(k => vis.indexOf(k) < 0).length, { area: area.length, before: b.n, after: c.n });
    await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(900);
    const d = await fogState(p);
    check('F-02 redo puts that step back', JSON.stringify(d.rev) === JSON.stringify(b.rev), { redo: d.n, want: b.n });
    await ctx.close();
  }

  // ---------------- F-03: undo history survives a reload (kept for the browser tab)
  {
    const { ctx, p, I } = await boot();
    await p.evaluate(STRIP); await p.waitForTimeout(600);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.click('[data-mi-ftool="rect"]');
    await dragBoard(p, [9, 5], [14, 8]); await p.waitForTimeout(600);
    await dragBoard(p, [14, 9], [19, 13]); await p.waitForTimeout(600);
    const s2 = await fogState(p);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(700);
    const s3 = await fogState(p);
    await p.click('[data-mi-fdone]'); await p.waitForTimeout(300);
    await dragToken(p, I['Ogre'], [8, 7]); await p.waitForTimeout(500);
    await p.reload(); await p.waitForTimeout(900); await p.evaluate(() => { setActiveTab('dm'); state.ui.dmMapMode = true; render(); }); await p.waitForTimeout(900);
    const mv = await p.evaluate(() => HearthMI._moves().length);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(700);
    const after = await p.evaluate(() => ({ hist: HearthMI._hist().pos + '/' + HearthMI._hist().items.length, undo: !document.querySelector('[data-mi-fundo]').disabled, redo: !document.querySelector('[data-mi-fredo]').disabled, note: (document.querySelector('.mi-hist .mi-hnote') || {}).textContent || '' }));
    check('F-03 after a reload the fog history is still there (1 of 2, undo and redo live)', after.hist === '1/2' && after.undo && after.redo, after);
    check('F-03 \u2026and says how long it lasts', /close this tab/.test(after.note), after.note);
    check('F-03 move undo survives the reload too', mv === 1, mv);
    await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(800);
    const r = await fogState(p);
    check('F-03 redo after the reload works', JSON.stringify(r.rev) === JSON.stringify(s2.rev), { redo: r.n, want: s2.n, s3: s3.n });
    await ctx.close();
  }

  // ---------------- T-01: a big caster's cone/line starts on its edge; hidden creatures count on the DM label
  {
    const { ctx, p, I } = await boot({ stage: { dragonAt: [0, 5] } });
    const r = await p.evaluate(() => {
      const e = loadEncounter(); const by = n => e.combatants.find(c => c.name === n);
      const D = by('Adult Red Dragon'), G = by('Goblin'), O = by('Ogre'), R = by('Ranger');
      e.combatants.forEach((c, i) => { c.mapX = i; c.mapY = 14; });
      D.mapX = 0; D.mapY = 5; G.mapX = 14; G.mapY = 6;
      const cone = { id: 'c', kind: 'cone', x: 1.5, y: 6.5, len: 12, angle: 0, from: D.id };
      const line = { id: 'l', kind: 'line', x: 1.5, y: 6.5, len: 12, angle: 0, from: D.id };
      const out = { cone55to60: HearthMI._hits(cone, e).map(c => c.name), line55to60: HearthMI._hits(line, e).map(c => c.name), apex: HearthMI._geo(cone, e) };
      G.mapX = 15; out.cone60to65 = HearthMI._hits(cone, e).map(c => c.name);
      O.mapX = 4; O.mapY = 4; const oc = { id: 'o', kind: 'cone', x: 5, y: 5, len: 6, angle: 0, from: O.id }; out.largeApex = HearthMI._geo(oc, e);
      G.mapX = 4 + 2 + 5; G.mapY = 4; out.large30ftLast = HearthMI._hits(oc, e).map(c => c.name);
      R.mapX = 3; R.mapY = 3; const rc = { id: 'r', kind: 'cone', x: 3.5, y: 3.5, len: 3, angle: 0, from: R.id }; out.medApex = HearthMI._geo(rc, e);
      const diag = { id: 'dg', kind: 'cone', x: 1.5, y: 6.5, len: 12, angle: Math.PI / 4, from: D.id }; out.diagApex = HearthMI._geo(diag, e);
      const moved = { id: 'm', kind: 'cone', x: 6.5, y: 6.5, len: 12, angle: 0, from: D.id }; out.movedApex = HearthMI._geo(moved, e);
      return out;
    });
    check('T-01 Huge dragon 60 ft cone: apex on the edge of its space (x=3), not its centre', Math.abs(r.apex.x - 3) < 1e-6 && Math.abs(r.apex.y - 6.5) < 1e-6, r.apex);
    check('T-01 \u2026catches a Goblin 55\u201360 ft from the dragon\u2019s edge', r.cone55to60.indexOf('Goblin') >= 0, r.cone55to60);
    check('T-01 \u2026and not one 60\u201365 ft away', r.cone60to65.indexOf('Goblin') < 0, r.cone60to65);
    check('T-01 a 60 ft line from the Huge dragon reaches the full 60 ft too', r.line55to60.indexOf('Goblin') >= 0, r.line55to60);
    check('T-01 Large Ogre: apex on its edge, and its 30 ft cone reaches its last square', Math.abs(r.largeApex.x - 6) < 1e-6 && r.large30ftLast.indexOf('Goblin') >= 0, r);
    check('T-01 Medium casters unchanged (apex at the centre of their square)', Math.abs(r.medApex.x - 3.5) < 1e-6 && Math.abs(r.medApex.y - 3.5) < 1e-6, r.medApex);
    check('T-01 aimed diagonally, the apex sits on the footprint\u2019s corner', Math.abs(r.diagApex.x - 3) < 1e-6 && Math.abs(r.diagApex.y - 8) < 1e-6, r.diagApex);
    check('T-01 a template the DM dragged off the dragon keeps its own point', Math.abs(r.movedApex.x - 6.5) < 1e-6, r.movedApex);
    // the stat card's Fire Breath, as Lee placed it: DM label + projector shape both start at the edge
    await p.evaluate(() => { const e = loadEncounter(); const by = n => e.combatants.find(c => c.name === n);
      by('Goblin').mapX = 14; by('Goblin').mapY = 6; by('Ranger').mapX = 9; by('Ranger').mapY = 6; by('Ogre').mapX = 6; by('Ogre').mapY = 11; by('Goblin Archer').mapX = 18; by('Goblin Archer').mapY = 1; by('Cultist').mapX = 4; by('Cultist').mapY = 1;
      e.aoes = []; saveEncounter(e); state.ui.dmMapZoomInit = false; render(); });
    await p.waitForTimeout(600);
    await p.evaluate((D) => HearthMI.placeFromCard(D, 'cone', 60, 'fire', 'Fire Breath', 'DC 21', 'breath'), I['Adult Red Dragon']); await p.waitForTimeout(1000);
    await p.evaluate(() => { const e = loadEncounter(); const t = e.aoes[e.aoes.length - 1]; t.angle = 0; t.pinned = true; saveEncounter(e); render(); }); await p.waitForTimeout(700);
    let lbl = await p.evaluate(() => [...document.querySelectorAll('.mi-chip')].map(c => c.textContent));
    check('T-01 Fire Breath from the stat card: label reads 2 creatures (Ranger + Goblin)', lbl.some(t => /Fire Breath/.test(t) && /\b2 creatures\b/.test(t)), lbl);
    const ms = await p.evaluate(() => buildMapState(loadEncounter()).aoes);
    check('T-01 the projector draws the same cone from the dragon\u2019s edge', ms.length === 1 && Math.abs(ms[0].x - 3) < 1e-6, ms);
    // Lumi's decision on Lee's question: hidden creatures count on the DM's label, marked, never on the projector
    await p.evaluate(() => { const e = loadEncounter(); e.combatants.find(c => c.name === 'Goblin').hiddenFromPlayers = true; saveEncounter(e); render(); }); await p.waitForTimeout(600);
    lbl = await p.evaluate(() => [...document.querySelectorAll('.mi-chip')].map(c => c.textContent));
    check('Template label: a hidden creature counts on the DM\u2019s label, as "2 creatures (1 hidden)"', lbl.some(t => /2 creatures \(1 hidden\)/.test(t)), lbl);
    const pl = await p.evaluate(() => buildMapState(loadEncounter()).aoes.map(a => a.lbl));
    check('Template label: the projector label is size only (no count, no "hidden")', pl.length === 1 && !/creature|hidden/i.test(pl[0]), pl);
    await ctx.close();
  }

  // ---------------- T-02: template counts readable on light themes (WCAG AA 4.5:1 on every palette)
  {
    const { ctx, p } = await boot();
    const pals = await p.evaluate(() => ['hearth'].concat(Object.keys(HEARTH_PALETTES)));
    const low = [];
    for (const pal of pals) {
      await p.evaluate((pal) => { hearthApplyLook({ palette: pal }); state.ui.c2Card = null; render(); }, pal); await p.waitForTimeout(120);
      const cr = await p.evaluate(() => {
        const cv = document.createElement('canvas').getContext('2d');
        const rgb = (c) => { cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return cv.getImageData(0, 0, 1, 1).data; };
        const L = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const n = document.querySelector('.mi-chip .mi-hitc'); if (!n) return 0;
        const a = L(rgb(getComputedStyle(n).color)), b = L(rgb(getComputedStyle(n.closest('.mi-chip')).backgroundColor));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      if (!(cr >= 4.5)) low.push([pal, +cr.toFixed(2)]);
    }
    check('T-02 template creature count has 4.5:1 contrast or better on all ' + pals.length + ' palettes (light ones included)', low.length === 0, low);
    await ctx.close();
  }

  // ---------------- M-01: Measure and the move chip use the same diagonal rule
  {
    const { ctx, p } = await boot();
    await p.evaluate(() => { const e = loadEncounter(); e.aoes = []; e.fog = null; saveEncounter(e); state.ui.c2Card = null; render(); }); await p.waitForTimeout(400);
    await p.click('[data-c2-fab]'); await p.waitForTimeout(600);
    await p.click('[data-c2-fan-i="measure"]'); await p.waitForTimeout(400);
    const res = {};
    for (const [a, c, lbl] of [[[5.5, 5.5], [9.5, 9.5], 'diag4'], [[5.5, 5.5], [9.5, 5.5], 'straight4'], [[4.5, 5.5], [10.5, 11.5], 'diag6'], [[4.5, 5.5], [10.5, 8.5], 'knight']]) {
      await dragBoard(p, a, c); await p.waitForTimeout(250); res[lbl] = await p.evaluate(() => (document.querySelector('#dmRulerLayer text') || {}).textContent);
    }
    const chip = await p.evaluate(() => { const w = HearthMI._walk(5, 5, 9, 9); return w.length * 5; });
    check('M-01 Measure: 4 squares diagonal = 20 ft, 6 = 30 ft (one diagonal square is 5 ft)', res.diag4 === '20 ft' && res.diag6 === '30 ft', res);
    check('M-01 Measure: straight 4 = 20 ft, 6 across + 3 down = 30 ft', res.straight4 === '20 ft' && res.knight === '30 ft', res);
    check('M-01 Measure agrees with the move chip\u2019s count on the same diagonal', res.diag4 === chip + ' ft', { measure: res.diag4, chip });
    await ctx.close();
  }

  // ---------------- M-02: a drag is charged along the cheapest route, as the reach shading assumes
  {
    const { ctx, p, I } = await boot();
    await p.evaluate(() => { const e = loadEncounter(); e.mapId = 'sewer'; e.aoes = []; e.fog = null; saveEncounter(e); state.ui.c2Card = null; render(); }); await p.waitForTimeout(1500);
    await p.evaluate(([id]) => { const e = loadEncounter(); e.combatants.forEach(o => { if (o.kind === 'monster' && o.mapX >= 7 && o.mapX <= 13 && o.mapY >= 4 && o.mapY <= 9) { o.mapX = 1; o.mapY = 1 + (o.mapY % 3); } }); const c = e.combatants.find(x => x.id === id); c.mapX = 8; c.mapY = 8; saveEncounter(e); render(); }, [I['Goblin']]);
    await p.waitForTimeout(500);
    let chip = '', reach = null, cells = null;
    await dragToken(p, I['Goblin'], [12, 6], async () => { chip = await p.evaluate(() => (document.querySelector('.mi-mchip') || {}).textContent); reach = await p.evaluate(() => !!document.querySelector('.mi-reach[x="' + (12 * HearthMI._x().cell) + '"][y="' + (6 * HearthMI._x().cell) + '"]')); cells = await p.evaluate(() => document.querySelectorAll('.mi-pcell').length); });
    const straight = await p.evaluate(() => { const t = HearthMI._terrain(loadEncounter()); return HearthMI._walk(8, 8, 12, 6).filter(q => t && t.water && t.water[q[1] * 20 + q[0]]).length; });
    check('M-02 sewer: the straight line crosses water, but the chip charges the dry route (25 ft, within speed)', straight > 0 && /^25 ft/.test(chip) && !/over speed/.test(chip), { chip, waterOnStraight: straight });
    check('M-02 \u2026on a square the reach shading marks as reachable', reach === true);
    const moved = await p.evaluate((id) => { const c = loadEncounter().combatants.find(x => x.id === id); return [c.mapX, c.mapY, (HearthMI._moves().slice(-1)[0] || {}).ft]; }, I['Goblin']);
    check('M-02 the move logs the same cost the chip showed', moved[0] === 12 && moved[1] === 6 && moved[2] === 25, moved);
    void cells; await ctx.close();
  }

  // ---------------- follow-ups from the QA-170 screenshots (dark plates on light themes, the corner fan, phone markers)
  const CR = () => { // text contrast on each dark plate / fan label; semi-transparent plates are composited over black and over mid grey
    const cv = document.createElement('canvas').getContext('2d');
    const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = 'rgba(0,0,0,0)'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
    const L = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const over = (t, b) => { const a = t[3] / 255; return [0, 1, 2].map(i => t[i] * a + b[i] * (1 - a)); };
    const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const out = {};
    const one = (key, n, bgEl, fill) => { if (!n || !n.getBoundingClientRect().width) return; const b = rgba(fill ? getComputedStyle(bgEl).fill : getComputedStyle(bgEl).backgroundColor);
      const bs = b[3] > 250 ? [b] : [over(b, [0, 0, 0]), over(b, [110, 110, 110])]; const f = rgba(getComputedStyle(n).color);
      const r = Math.min(...bs.map(x => cr(over(f, x), x))); out[key] = Math.min(out[key] || 99, r); };
    document.querySelectorAll('.mi-hint').forEach(n => one('help line', n, n));
    document.querySelectorAll('.mi-offhit, .mi-offhit b').forEach(n => one('phone marker', n, n.closest('.mi-offhit')));
    document.querySelectorAll('.mi-afan .mi-af small').forEach(n => one('template fan label', n, document.querySelector('.mi-afbg'), true));
    document.querySelectorAll('.c2-fan.open .c2-fan-i small').forEach(n => one('tool fan label', n, document.querySelector('.c2-fan-bg'), true));
    document.querySelectorAll('.mi-chip b').forEach(n => one('template name', n, n.closest('.mi-chip')));
    return out;
  };
  {
    const desk = await boot(), phone = await boot({ vp: { width: 412, height: 880 }, stage: { dragonAt: [14, 7] } });
    const pals = await desk.p.evaluate(() => ['hearth'].concat(Object.keys(HEARTH_PALETTES)));
    const low = [], seen = {};
    const fire = () => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); };
    for (const pal of pals) {
      const note = (o) => Object.keys(o).forEach(k => { seen[k] = 1; if (!(o[k] >= 4.5)) low.push([pal, k, +o[k].toFixed(2)]); });
      await desk.p.evaluate((pal) => { hearthApplyLook({ palette: pal }); state.ui.c2Card = null; state.ui.c2Fan = true; render(); }, pal); await desk.p.waitForTimeout(450);
      note(await desk.p.evaluate(CR));
      await desk.p.evaluate(() => { state.ui.c2Fan = false; render(); HearthMI.openAoe('circle'); }); await desk.p.waitForTimeout(400);
      note(await desk.p.evaluate(CR));
      await desk.p.evaluate(() => { HearthMI.closeAoe(false); render(); });
      await phone.p.evaluate((pal) => { hearthApplyLook({ palette: pal }); render(); }, pal); await phone.p.evaluate(fire); await phone.p.waitForTimeout(800);
      note(await phone.p.evaluate(CR));
      await phone.p.evaluate(() => { HearthMI.closeAoe(false); const e = loadEncounter(); e.aoes = []; saveEncounter(e); render(); }); await phone.p.waitForTimeout(150);
    }
    check('Follow-up: help line, phone markers, both fans\u2019 labels and template names reach 4.5:1 on all ' + pals.length + ' palettes', low.length === 0 && Object.keys(seen).length === 5, { low: low.slice(0, 8), seen: Object.keys(seen) });
    await desk.ctx.close(); await phone.ctx.close();
  }
  {
    // the corner fan never covers a creature's name; the phone markers never sit under a template label (Lee's tmpl-phone scene)
    const phone = await boot({ vp: { width: 412, height: 880 }, stage: { dragonAt: [14, 7] }, touch: true }), p = phone.p;
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); }); await p.waitForTimeout(1200);
    const lay = await p.evaluate(() => {
      const fe = document.querySelector('.mi-afan'), f = fe.getBoundingClientRect(), S = parseFloat(fe.style.getPropertyValue('--afS'));
      const inFan = (r) => { const nx = Math.max(r.left, Math.min(f.right, r.right)), ny = Math.max(r.top, Math.min(f.bottom, r.bottom)); return Math.hypot(nx - f.right, ny - f.bottom) < S; };
      const caps = [...document.querySelectorAll('#dmMapGrid .map-token-caption')].filter(c => c.getBoundingClientRect().width);
      const sc = document.getElementById('dmMapScroll').getBoundingClientRect();
      const onScreen = caps.filter(c => { const r = c.getBoundingClientRect(); return r.right > sc.left && r.left < sc.right && r.bottom > sc.top && r.top < sc.bottom; });
      const ov = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const chips = [...document.querySelectorAll('#miTpl .mi-chip')].map(n => n.getBoundingClientRect()), marks = [...document.querySelectorAll('.mi-offhit')].map(n => n.getBoundingClientRect());
      return { under: onScreen.filter(c => inFan(c.getBoundingClientRect())).map(c => c.textContent), moved: caps.filter(c => c.classList.contains('mi-cap-up') || c.classList.contains('mi-cap-l')).map(c => c.textContent),
        marks: marks.length, clash: marks.filter(m => chips.some(c => ov(m, c))).length, markClash: marks.filter((m, i) => marks.some((o, j) => j !== i && ov(m, o))).length };
    });
    check('Follow-up: with the template fan open on phone, no creature\u2019s name sits under the fan (the dragon\u2019s moves above its token)', lay.under.length === 0 && lay.moved.indexOf('Adult Red Dragon') >= 0, lay);
    check('Follow-up: phone off-screen markers ("Ranger in cone") clear every template label and each other', lay.marks >= 2 && lay.clash === 0 && lay.markClash === 0, lay);
    await phone.ctx.close();
    // the tool fan on a small desk (1024x640), dragon in its corner as staged
    const desk = await boot({ vp: { width: 1024, height: 640 } }), q = desk.p;
    await q.evaluate(() => { state.ui.c2Card = null; render(); }); await q.click('[data-c2-fab]'); await q.waitForTimeout(500);
    const tf = await q.evaluate(() => { const w = document.querySelector('.c2-fan.open .c2-fan-wrap'); if (!w) return null; const f = document.querySelector('.c2-fan').getBoundingClientRect(), S = parseFloat(w.style.width);
      return [...document.querySelectorAll('#dmMapGrid .map-token-caption')].filter(c => { const r = c.getBoundingClientRect(); if (!r.width) return false; const nx = Math.max(r.left, Math.min(f.right, r.right)), ny = Math.max(r.top, Math.min(f.bottom, r.bottom)); return Math.hypot(nx - f.right, ny - f.bottom) < S; }).map(c => c.textContent); });
    check('Follow-up: the tool fan (\u2726) doesn\u2019t cover a creature\u2019s name either (desk 1024\u00d7640, dragon in the corner)', Array.isArray(tf) && tf.length === 0, tf);
    const up = await q.evaluate(() => [...document.querySelectorAll('#dmMapGrid .map-token-caption.mi-cap-up, #dmMapGrid .map-token-caption.mi-cap-l')].map(c => c.textContent));
    await q.mouse.click(300, 300); await q.waitForTimeout(400); // a tap on the map closes the fan
    const back = await q.evaluate(() => [...document.querySelectorAll('#dmMapGrid .map-token-caption.mi-cap-up, #dmMapGrid .map-token-caption.mi-cap-l')].map(c => c.textContent));
    check('Follow-up: names go back under their tokens once nothing covers them', up.indexOf('Adult Red Dragon') >= 0 && back.length === 0 && !(await q.evaluate(() => !!document.querySelector('.c2-fan.open'))), { open: up, closed: back });
    await desk.ctx.close();
  }

  console.log('\n' + results.filter(r => r.ok).length + '/' + results.length + ' passed' + (errs.length ? '  page errors: ' + JSON.stringify(errs.slice(0, 5)) : ''));
  await browser.close();
  process.exit(results.every(r => r.ok) && !errs.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
