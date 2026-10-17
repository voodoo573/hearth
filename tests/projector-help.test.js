// UI polish — projector setup sheet (Jenny): phone shows one short note instead of the Win+P / HDMI steps;
// desk keeps the full steps, Mac line in words. node tests/projector-help.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const C2 = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const desk of [true, false]) {
    const tag = desk ? 'desk:' : 'phone:';
    const ctx = await b.newContext({ viewport: desk ? { width: 1440, height: 900 } : { width: 412, height: 892 }, serviceWorkers: 'block', hasTouch: !desk });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(C2.SEED); await p.reload(); await p.waitForTimeout(700);
    await p.waitForFunction(() => window.HearthMI && window.HearthC2, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(C2.STAGE, {}); await p.waitForTimeout(1200);
    await p.evaluate(() => { const s = loadDmSettings(); s.projectorHelpDismissed = false; saveDmSettings(s); document.getElementById('dmMapProject').click(); }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const d = document.querySelector('.dm-proj-dialog'); if (!d) return null; const t = d.textContent;
      const btns = [...d.querySelectorAll('button')].map(x => { const r = x.getBoundingClientRect(); return { t: x.textContent.trim(), h: r.height, vis: r.height > 0 && r.bottom <= innerHeight }; });
      return { t, steps: d.querySelectorAll('.dm-proj-steps li').length, btns }; });
    check(tag + ' setup sheet opens', !!m);
    if (!m) { await ctx.close(); continue; }
    if (desk) {
      check(tag + ' full five steps kept', m.steps === 5, m.steps);
      check(tag + ' Win+P and HDMI still there', /Win/.test(m.t) && /HDMI/.test(m.t));
      check(tag + ' Mac line in words', m.t.includes('In System Settings, open Displays and turn off Mirror Displays.'), m.t);
      check(tag + ' no arrows in the sheet', !/→/.test(m.t));
    } else {
      check(tag + ' short note shown', m.t.includes('Open Hearth on the computer connected to your TV, then press Projector.'), m.t);
      check(tag + ' no Win+P / HDMI / Mac steps', m.steps === 0 && !/Win|HDMI|Mirror|System Settings/.test(m.t), m.t);
      check(tag + ' buttons 44px and on screen', m.btns.every(x => x.h >= 44 && x.vis), m.btns);
      await p.click('[data-dm-proj-cancel]'); await p.waitForTimeout(300);
      check(tag + ' Cancel closes it', await p.evaluate(() => !document.querySelector('.dm-proj-dialog')));
    }
    await ctx.close();
  }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
