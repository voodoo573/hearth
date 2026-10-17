// Hearth v1.6.0 — condition badges (tokens + initiative tiles) and animated spell areas on the DM map.
// Serve the repo root (python3 -m http.server 8816), then: node tests/effects160.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const SHOTS = process.env.SHOTS || '/workspace/dice-160/shots/';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [tag, w, h] of [['desktop', 1366, 900], ['phone', 412, 860]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done'); localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); });
    await p.reload(); await p.waitForTimeout(700);
    await p.evaluate(() => {
      setActiveTab('dm'); render();
      dmEncounterAddCustomMonster('Goblin', 7, 15, 2, ''); dmEncounterAddCustomMonster('Ogre', 59, 11, -1, '');
      const enc = loadEncounter(); enc.combatants[0].statuses = ['Poisoned', 'Prone']; enc.combatants[1].statuses = ['Frightened', 'Restrained', 'Exhaustion 3'];
      enc.combatants[0].mapX = 8; enc.combatants[0].mapY = 6; enc.combatants[1].mapX = 12; enc.combatants[1].mapY = 7; saveEncounter(enc); render();
    });
    await p.waitForTimeout(300);
    const tiles = await p.evaluate(() => document.querySelectorAll('.dm-status-pill .he-badge svg').length);
    check(`${tag}: initiative tiles show condition badges`, tiles === 5, tiles);
    await p.screenshot({ path: SHOTS + `effects-${tag}-initiative-badges.png`, fullPage: false });
    await p.evaluate(() => { state.ui.dmMapMode = true; render(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { state.ui.dmAoeColor = '#e8552d'; hearthDropAoe('circle', 20); state.ui.dmAoeFree = true; state.ui.dmAoeColor = '#4aa3df'; hearthDropAoe('cone', 30); state.ui.dmAoeColor = '#f6d743'; hearthDropAoe('line', 60); });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ cv: document.querySelectorAll('#heAoeLayer canvas.he-ov').length, tok: document.querySelectorAll('[data-map-token] .ht-token .he-badge, [data-map-token] .he-tok-badges .he-badge').length, els: (loadEncounter().aoes || []).map(a => a.element) }));
    check(`${tag}: fire/cold/lightning areas get animated overlays`, r.cv === 3 && r.els.join() === 'fire,cold,lightning', r);
    check(`${tag}: map tokens show condition badges`, r.tok >= 5, r.tok);
    const snap = await p.evaluate(() => { const enc = loadEncounter(); const a = enc.aoes[1]; a.angle = 0.3; saveEncounter(enc); return true; });
    await p.evaluate(() => { const g = document.getElementById('dmMapGrid'); g && g.scrollIntoView({ block: 'center' }); render(); }); await p.waitForTimeout(500);
    await p.screenshot({ path: SHOTS + `effects-${tag}-map-aoe-badges.png` });
    await ctx.close();
  }
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const f = results.filter(x => !x.ok); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
