// Hearth v1.6.0 — Jenny's "Hearth" signature look as everyone's default (one-time switch).
// Serve the repo root first (python3 -m http.server 8816), then: node tests/reskin160.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const SHOTS = process.env.SHOTS || '/workspace/dice-160/shots/';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
const look = (p) => p.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), palette: document.documentElement.getAttribute('data-palette'), prefs: JSON.parse(localStorage.getItem('hearth.prefs.v1') || '{}'), flag: localStorage.getItem('hearth.reskin160') }));

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // 1) new install
  const c1 = await b.newContext({ viewport: { width: 412, height: 860 }, serviceWorkers: 'block' });
  const p1 = await c1.newPage(); p1.on('pageerror', e => errs.push(e.message));
  await p1.goto(URL); await p1.waitForTimeout(2200);
  const n = await look(p1);
  check('new install starts on dark + hearth', n.theme === 'dark' && n.palette === 'hearth' && n.flag === 'done', n);
  check('new install: no "new look" toast', !(await p1.evaluate(() => /new look/i.test(document.body.innerText))));
  // 2) existing user on Light with characters: switched once, told once
  const c2 = await b.newContext({ viewport: { width: 412, height: 860 }, serviceWorkers: 'block' });
  const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.goto(URL); await p2.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.prefs.v1', JSON.stringify({ theme: 'light', palette: '', textSize: 'l' })); });
  await p2.reload(); await p2.waitForTimeout(400);
  const m = await look(p2);
  check('upgrade: Light user switched to dark + hearth, other prefs kept', m.theme === 'dark' && m.palette === 'hearth' && m.prefs.textSize === 'l', m);
  const toast = await p2.waitForFunction(() => /new look/i.test(document.body.innerText) && /Settings/.test(document.body.innerText), null, { timeout: 6000 }).then(() => true).catch(() => false);
  check('upgrade: one-time note says it can be changed back in Settings', toast);
  await p2.screenshot({ path: SHOTS + 'reskin-01-upgrade-note-phone.png' });
  await p2.evaluate(() => { const pr = loadPrefs(); pr.palette = ''; pr.theme = 'light'; state.prefs = pr; savePrefs(pr); });
  await p2.reload(); await p2.waitForTimeout(2200);
  const m2 = await look(p2);
  check('switching back to Light sticks (migration runs once)', m2.theme === 'light' && !m2.palette && m2.flag === 'done' && !(await p2.evaluate(() => /new look/i.test(document.body.innerText))), m2);
  // 3) screenshots + chip colours (phone + desktop)
  for (const [tag, w, h] of [['phone', 412, 860], ['desktop', 1366, 900]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.evaluate(() => { localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); }); await p.reload(); await p.waitForTimeout(800);
    await p.screenshot({ path: SHOTS + `reskin-${tag}-home.png` });
    await p.evaluate(() => { const d = generateRandomCharacter(); Object.assign(d, { name: 'Ash Tallow', race: 'tiefling', subrace: null, klass: 'barbarian', subclass: null, level: 3, classLevels: { barbarian: 3 } }); saveCharacter(d); const ch = getCharacter(d.id); ch.currentHp = maxHp(ch); saveCharacter(ch); startRage(ch, false); saveCharacter(ch); state.activeCharId = d.id; setActiveTab('play'); render(); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: SHOTS + `reskin-${tag}-sheet.png` });
    const chip = await p.evaluate(() => { const c = document.querySelector('.resources-strip .resource-use-btn.danger'); const pip = document.querySelector('.resources-strip .res-pip'); if (!c) return null; const cs = getComputedStyle(c); return { chip: cs.color, bg: cs.backgroundColor, pip: pip && getComputedStyle(pip).backgroundColor }; });
    check(`${tag}: red End Rage button in the parchment strip stays red (not brown)`, chip && (() => { const m = chip.bg.match(/\d+/g).map(Number); return m[0] > m[1] + 60 && m[0] > 120; })(), chip);
    const renamed = await p.evaluate(() => ({ vital: getComputedStyle(document.querySelector('.vital-stat')).backgroundImage, score: getComputedStyle(document.querySelector('.stat-cell-score') || document.body).color }));
    check(`${tag}: 1.5.x classes (.vital-stat, .stat-cell-score) get the reskin`, /url|gradient/.test(renamed.vital) && renamed.score === 'rgb(247, 220, 152)', renamed);
    await p.evaluate(() => { setActiveTab('character'); state.ui.homePanel = 'settings'; render(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: SHOTS + `reskin-${tag}-settings.png` });
    // UI polish: the inline grid became the theme pop-up (Settings > Appearance > Theme > Change)
    check(`${tag}: Hearth (signature) first and selected in the theme picker`, await p.evaluate(() => { document.querySelector('[data-u-act="themes"]').click(); const f = document.querySelector('.u-layer [data-tk]'); const ok = f && f.dataset.tk === 'hearth' && f.getAttribute('aria-checked') === 'true'; document.querySelector('.u-layer [data-u-close="cancel"]').click(); return ok; }));
    await p.evaluate(() => { state.ui.homePanel = null; localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); setActiveTab('dm'); render(); dmEncounterAddCustomMonster('Goblin', 7, 15, 2, ''); render(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: SHOTS + `reskin-${tag}-dm.png` });
    await p.evaluate(() => hearthOpenLegal()); await p.waitForTimeout(300);
    if (tag === 'phone') check('credits screen lists the art credits (CREDITS.md)', await p.evaluate(() => /Art &? ?.*credits/i.test(document.querySelector('.hearth-legal').textContent) && /signature look/.test(document.querySelector('.hearth-legal').textContent)));
    await p.evaluate(() => { const l = document.querySelector('.hearth-legal-art'); l && l.scrollIntoView(); }); await p.waitForTimeout(150);
    await p.screenshot({ path: SHOTS + `reskin-${tag}-credits.png` });
    await c.close();
  }
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const f = results.filter(r => !r.ok); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
