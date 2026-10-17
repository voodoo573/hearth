// UI polish — an old saved 'important' dice-on-projector pref is migrated to 'ask' on load,
// so dice never go up on the projector by themselves anywhere.
// Serve the repo root (python3 -m http.server 8816), then: node tests/dice-migrate.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => { const k = 'hearth.prefs.v1'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o.diceProjector = 'important'; o.diceAnim = 'off'; o.textSize = 'l'; localStorage.setItem(k, JSON.stringify(o)); });
  await p.reload(); await p.waitForTimeout(900);
  const m = await p.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('hearth.prefs.v1')).diceProjector, text: JSON.parse(localStorage.getItem('hearth.prefs.v1')).textSize, live: state.prefs.diceProjector, dp: hearthDicePrefs().projector }));
  check("a saved 'important' becomes 'ask' on load, is written back, and other prefs are kept", m.saved === 'ask' && m.live === 'ask' && m.dp === 'ask' && m.text === 'l', m);
  const r = await p.evaluate(async () => {
    const realT = window.hearthDiceProjectorTarget, realO = window.hearthDiceOnProjector; let sent = 0;
    window.hearthDiceProjectorTarget = () => ({}); window.hearthDiceOnProjector = () => { sent++; };
    await hearthDiceRoll({ who: 'DM', label: 'Ogre attack', groups: [{ sides: 20, values: [20] }], total: 27 });
    await hearthDiceRoll({ who: 'DM', label: 'Death save', groups: [{ sides: 20, values: [1] }], total: 1, deathSave: true });
    await hearthDiceRoll({ who: 'DM', label: 'Dragon breath', groups: [{ sides: 6, values: [6, 6] }], total: 12, boss: true });
    window.hearthDiceProjectorTarget = realT; window.hearthDiceOnProjector = realO; return sent;
  });
  check('after migration a nat 20, nat 1 death save and boss roll are not projected by themselves', r === 0, r);
  const s = await p.evaluate(() => { hearthDiceSetPref('diceProjector', 'important'); return { live: hearthDicePrefs().projector, saved: loadPrefs().diceProjector }; });
  check("setting 'important' (old buttons, scripts) stores 'ask' instead", s.live === 'ask' && s.saved === 'ask', s);
  const st = await p.evaluate(() => { const x = loadPrefs(); x.diceProjector = 'important'; state.prefs = x; return hearthDicePrefs().projector; });
  check("an in-memory 'important' pref still reads as 'ask'", st === 'ask', st);
  const opts = await p.evaluate(async () => { state.prefs = loadPrefs(); HearthUI.go('settings'); await new Promise(z => setTimeout(z, 200)); const b2 = document.querySelector('[data-u-act="set-sec"][data-v="dice"]'); if (b2) { b2.click(); await new Promise(z => setTimeout(z, 200)); } return [...document.querySelectorAll('[data-dice-pref="diceProjector"]')].map(x => x.dataset.diceVal); });
  check('Settings offers only Off / Ask each time', opts.length > 0 && !opts.includes('important'), opts);
  await p.evaluate(() => { const k = 'hearth.prefs.v1'; const o = JSON.parse(localStorage.getItem(k)); o.diceProjector = 'off'; localStorage.setItem(k, JSON.stringify(o)); });
  await p.reload(); await p.waitForTimeout(600);
  check("'off' stays 'off' (migration only touches 'important')", await p.evaluate(() => loadPrefs().diceProjector === 'off' && hearthDicePrefs().projector === 'off'));
  await ctx.close(); await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real.slice(0, 5));
  const pass = results.filter(x => x.ok).length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
