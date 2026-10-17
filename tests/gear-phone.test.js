// UI polish — Gear on phone: Inventory / Catalogue segmented control (FIXES minor 9).
// node tests/gear-phone.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[412, 892], [360, 740], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {}); await p.evaluate(() => HearthUI.go('gear')); await p.waitForTimeout(300);
    const R = () => p.evaluate(() => { const seg = document.querySelector('.u-gpseg'); return { seg: seg ? [...seg.querySelectorAll('button')].map(b => b.textContent + (b.classList.contains('u-on') ? '*' : '') + ':' + Math.round(b.getBoundingClientRect().height)) : null,
      inv: !!document.querySelector('.u-invc'), cat: !!document.querySelector('.u-catc'), search: !!document.getElementById('gearCatSearch'), coins: !!document.querySelector('.u-coins') }; });
    const tag = `${w}px:`; let m = await R();
    if (w >= 1280) { check(tag + ' desk: no segmented control, inventory and catalogue side by side', !m.seg && m.inv && m.cat, m); await ctx.close(); continue; }
    check(tag + ' Inventory / Catalogue control, Inventory on, 44px', m.seg && m.seg[0] === 'Inventory*:44' && /^Catalogue:44$/.test(m.seg[1]), m.seg);
    check(tag + ' Inventory pane: AC, coins and items; no catalogue', m.inv && m.coins && !m.cat, m);
    await p.click('[data-u-act="gear-pane"][data-v="cat"]'); await p.waitForTimeout(300); m = await R();
    check(tag + ' Catalogue pane with search; inventory hidden', m.cat && m.search && !m.inv && /Catalogue\*/.test(m.seg[1]), m);
    await p.fill('#gearCatSearch', 'long'); await p.waitForTimeout(500);
    const hits = await p.evaluate(() => [...document.querySelectorAll('.u-catc .u-tr')].map(r => r.textContent).filter(t => /Longsword|Longbow/i.test(t)).length);
    check(tag + ' catalogue search still works', hits > 0, hits);
    await p.click('[data-u-act="gear-pane"][data-v="inv"]'); await p.waitForTimeout(300); m = await R();
    check(tag + ' back to Inventory', m.inv && !m.cat, m);
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
