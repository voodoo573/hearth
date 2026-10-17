// UI polish — Forge with seeded homebrew (FIXES minor 7): Continue-editing draft panel, Draft tag, phone rows.
// node tests/forge-ui.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js'); const FS = require('./forge-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[1920, 1080], [1440, 900], [412, 892]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {}); await p.evaluate(FS.FORGE); await p.evaluate(() => HearthUI.go('forge')); await p.waitForTimeout(300);
    const tag = `${w}px:`;
    const m = await p.evaluate(() => { const d = document.querySelector('.u-fdraft'); const rows = [...document.querySelectorAll('.u-frow')];
      const small = [...document.querySelectorAll('#content .u-fwrap button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44 && b.getBoundingClientRect().width > 0).map(b => b.textContent.trim().slice(0, 20));
      return { panel: d && d.textContent, steps: d ? d.querySelectorAll('.u-fstep').length : 0, done: d ? d.querySelectorAll('.u-fstep.u-done').length : 0, rows: rows.length,
        draftRow: rows.filter(r => /Oath of the Hearthfire/.test(r.textContent) && /Draft/.test(r.textContent)).length, dels: document.querySelectorAll('[data-u-act="forge-del"]').length, small }; });
    check(tag + ' 7 seeded entries listed', m.rows === 7, m.rows);
    check(tag + ' Continue editing panel for the draft with the forge steps', /Oath of the Hearthfire/.test(m.panel || '') && /Continue editing/.test(m.panel) && /2 of 4 written/.test(m.panel) && m.steps === 4 && m.done === 2, m);
    check(tag + ' draft row tagged Draft', m.draftRow === 1, m);
    check(tag + ' delete reachable for subclasses and items', m.dels === 5, m.dels);
    if (w < 1280) check(tag + ' 44px targets', m.small.length === 0, m.small);
    await p.click('[data-u-act="forge-continue"]'); await p.waitForTimeout(400);
    const f = await p.evaluate(() => state.ui.forge && state.ui.forge.draft && state.ui.forge.draft.name);
    check(tag + ' Continue editing opens the draft in the forge editor', f === 'Oath of the Hearthfire', f);
    if (w < 1280) {
      await p.evaluate(() => { state.ui.forge = null; HearthUI.go('forge'); }); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('.u-frow')].find(r => /Circle of Embers/.test(r.textContent)).querySelector('.u-t-h3').click()); await p.waitForTimeout(400);
      const g = await p.evaluate(() => state.ui.forge && state.ui.forge.draft && state.ui.forge.draft.name);
      check(tag + ' tapping a row opens it', g === 'Circle of Embers', g);
    }
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
