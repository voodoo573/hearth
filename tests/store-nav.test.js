// UI polish — Hearth Maps entry (FIXES item 6): nowhere while the store flag is off; with it on, the same
// "Hearth Maps · New" entry on every desk screen (sidebar) and on phone Home.
// node tests/store-nav.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
const ROUTES = ['home', 'characters', 'sheet', 'gear', 'forge', 'reference', 'dm', 'library', 'settings'];
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const flag of [false, true]) for (const [w, h] of [[1440, 900], [412, 892]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {});
    await p.evaluate((f) => { if (f) localStorage.setItem('hearth.flag.store', '1'); else localStorage.removeItem('hearth.flag.store'); }, flag);
    const seen = {};
    for (const r of ROUTES) {
      seen[r] = await p.evaluate(async (r) => { HearthUI.go(r); await new Promise(x => setTimeout(x, 250));
        return [...document.querySelectorAll('[data-u-go="store"]')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => /Hearth Maps/.test(e.textContent) && /New/.test(e.textContent)).length; }, r);
    }
    const tag = `${w}px store ${flag ? 'on' : 'off'}:`;
    if (!flag) check(tag + ' no Hearth Maps entry anywhere', Object.values(seen).every(n => n === 0), seen);
    else if (w >= 1280) check(tag + ' Hearth Maps · New in the sidebar on every screen', Object.values(seen).every(n => n === 1), seen);
    else {
      check(tag + ' Hearth Maps · New on phone Home', seen.home === 1, seen);
      await p.evaluate(() => HearthUI.go('home')); await p.waitForTimeout(200); await p.click('[data-u-go="store"]'); await p.waitForTimeout(300);
      const r = await p.evaluate(() => HearthUI.route());
      check(tag + ' it opens the store', r === 'store', r);
      const hh = await p.evaluate(() => document.querySelector('.u-pmaps') ? 0 : 1);
    }
    if (!flag) { const r = await p.evaluate(async () => { HearthUI.go('store'); await new Promise(x => setTimeout(x, 200)); return HearthUI.route(); }); check(tag + ' the store route stays shut', r !== 'store', r); }
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
