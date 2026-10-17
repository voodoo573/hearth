// Hearth v1.6.0 — Jenny's framed tokens + portrait library. node tests/tokens160.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.reskin160', 'done'); localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true })); });
  await p.reload(); await p.waitForTimeout(700);
  const sw = await p.evaluate(async () => await (await fetch('sw.js')).text());
  check('library has 32 portraits incl. goblin-archer + ranger', await p.evaluate(() => HEARTH_TOKEN_LIBRARY.length === 32 && HEARTH_TOKEN_LIBRARY.includes('goblin-archer') && HEARTH_TOKEN_LIBRARY.includes('ranger')));
  check('sw precaches module + every WebP', sw.includes("'./tokens/hearth-tokens.js'") && await p.evaluate((sw) => HEARTH_TOKEN_LIBRARY.every(k => sw.includes(`'./tokens/lib/${k}.webp'`)), sw));
  const ok = await p.evaluate(async () => (await Promise.all(HEARTH_TOKEN_LIBRARY.map(k => fetch(hearthTokenLibPath(k)).then(r => r.ok)))).every(Boolean));
  check('every library WebP is served', ok);
  check('tiny = half a square; position maths still one square', await p.evaluate(() => tokenSizeCells('Tiny') === 0.5 && tokenFootprint('Tiny') === 1 && tokenFootprint('Large') === 2 && tokenSizeCells('Medium') === 1));
  const r = await p.evaluate(() => {
    setActiveTab('dm'); render();
    dmEncounterAddCustomMonster('Rat', 1, 10, 0, ''); dmEncounterAddCustomMonster('Goblin', 7, 15, 2, '');
    const e = loadEncounter(); const [rat, gob] = e.combatants;
    rat.mapX = 2; rat.mapY = 2; rat.size = 'Tiny'; gob.mapX = 5; gob.mapY = 5; gob.tokenImage = hearthTokenLibPath('goblin-archer'); gob.statuses = ['Poisoned', 'Exhaustion 2']; gob.hp = 3;
    saveEncounter(e); state.ui.dmMapMode = true; render();
    const rt = document.querySelector(`[data-map-token="${rat.id}"]`), gt = document.querySelector(`[data-map-token="${gob.id}"]`);
    const ri = rt.querySelector('.ht-token'), gi = gt.querySelector('.ht-token');
    const cell = +document.getElementById('heAoeLayer').dataset.cell;
    return { cell, outer: rt.offsetWidth, inner: ri && ri.offsetWidth, gImg: gi && gi.querySelector('img') && gi.querySelector('img').getAttribute('src'), bloodied: gi && gi.classList.contains('ht-bloodied'), badges: gt.querySelectorAll('.ht-token .he-badge, .ht-token svg.he-cond, .ht-token [class*="badge"]').length, dup: gt.querySelectorAll('.he-tok-badges').length };
  });
  check('tiny token renders at half a square, centred in a full square', r.outer === r.cell && Math.abs(r.inner - r.cell / 2) <= 1, r);
  check('library portrait + bloodied state on the framed token', r.gImg === 'tokens/lib/goblin-archer.webp' && r.bloodied, r);
  check('condition badges come from the token rim (no duplicate cluster)', r.badges >= 2 && r.dup === 0, r);
  const pick = await p.evaluate(() => { const id = loadEncounter().combatants[0].id; state.ui.tokenImageFor = id; render(); document.querySelector('[data-token-lib="ranger"]').click(); return loadEncounter().combatants[0].tokenImage; });
  check('token picker: Hearth library sets the portrait', pick === 'tokens/lib/ranger.webp', pick);
  check('credits list token frames + portrait library', await p.evaluate(() => { hearthOpenLegal(); return /Token portrait library/.test(document.body.innerText) && /Token frames/.test(document.body.innerText); }));
  const mk = await p.evaluate(() => { state.ui.tokenImageFor = null; render(); const e = loadEncounter(); const gob = e.combatants[1]; const t = document.querySelector(`[data-map-token="${gob.id}"] .ht-token`); const plain = document.querySelector(`[data-map-token="${e.combatants[0].id}"] .ht-mark`); const proj = document.getElementById('dmMapProject'); return { mark: !!(t && t.querySelector('.ht-mark-goblin-archer svg')), plain: !!plain, projSvg: !!(proj && proj.querySelector('svg')), glyph: document.body.innerHTML.includes('\u29C9') }; });
  check('goblin-archer gets a bow mark (other portraits do not); projector icon is inline SVG, no ⧉ glyph', mk.mark && !mk.plain && mk.projSvg && !mk.glyph, mk);
  await p.setViewportSize({ width: 360, height: 800 }); await p.waitForTimeout(300);
  const ttl = await p.evaluate(() => { const e = document.querySelector('.dm-map-title'); const cs = getComputedStyle(e); return { h: e.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, ws: cs.whiteSpace }; });
  check('phone (360px): Battle Map title stays on one line', ttl.ws === 'nowrap' && ttl.h <= ttl.lh * 1.4, ttl);
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const f = results.filter(x => !x.ok).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
