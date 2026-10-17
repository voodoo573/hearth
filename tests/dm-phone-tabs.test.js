// UI polish — phone tab bar on the DM screens (Jenny's "your two gaps"): the DM dashboard lights Home (where DM
// is entered from); the live Battle Map keeps the tab bar hidden. node tests/dm-phone-tabs.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js'); const C2 = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
const TB = () => { const t = document.querySelector('.u-tabbar'); const r = t && t.getBoundingClientRect(); return { shown: !!t && getComputedStyle(t).display !== 'none' && r.height > 0, on: t ? [...t.querySelectorAll('.u-on')].map(b => b.textContent.trim()) : [], route: HearthUI.route() }; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  { const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, serviceWorkers: 'block', hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800); await p.evaluate(S.STAGE, {});
    await p.evaluate(() => HearthUI.go('dm')); await p.waitForTimeout(300);
    const m = await p.evaluate(TB);
    check('DM dashboard: tab bar shown with Home lit (only Home)', m.shown && m.on.length === 1 && m.on[0] === 'Home', m);
    await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 412, height: 880 }, deviceScaleFactor: 2, serviceWorkers: 'block', hasTouch: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(C2.SEED); await p.reload(); await p.waitForTimeout(700);
    await p.waitForFunction(() => window.HearthMI && window.HearthC2, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(C2.STAGE, {}); await p.waitForTimeout(1200);
    const m = await p.evaluate(TB);
    check('live Battle Map: tab bar hidden', !m.shown, m);
    await ctx.close(); }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
