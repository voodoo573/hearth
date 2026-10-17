// Hearth v1.7.0 — clean C2 screenshots (staged scene, no toasts). node tests/showcase-c2.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const OUT = process.env.SHOTS || '/workspace/dm-c2/shots/';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const errs = [];
async function page(b, w, h, dpr, stage) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, stage || {}); await p.waitForTimeout(1600);
  return { ctx, p };
}
const clean = p => p.evaluate(() => document.querySelectorAll('.toast, #toast, .hearth-toast').forEach(t => t.remove()));
async function shot(p, name) { if (ONLY && !ONLY.test(name)) return; await clean(p); await p.waitForTimeout(250); await p.screenshot({ path: OUT + name }); console.log('shot', name); }
const scrollCard = (p, re) => p.evaluate((src) => { const re = new RegExp(src); const body = document.querySelector('.c2-sbbody'); const sec = [...body.querySelectorAll('.c2-sec')].find(s => re.test(s.querySelector('.c2-sech').textContent)); if (sec) body.scrollTop = sec.offsetTop - body.offsetTop - 4; }, re.source);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // desktop, dragon's turn with Fire Breath placed
  for (const pal of ['hearth', 'arcane', 'scott-ultramarine']) {
    const { ctx, p } = await page(b, 1440, 900);
    if (pal !== 'hearth') await p.evaluate((pal) => { document.documentElement.setAttribute('data-palette', pal); render(); }, pal);
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); state.ui.dmAoeLastDropped = null; render(); });
    await p.waitForTimeout(900); await scrollCard(p, /Actions/);
    await shot(p, `c2-desk-dragon-turn${pal === 'hearth' ? '' : '-' + pal}.png`);
    await ctx.close();
  }
  { const { ctx, p } = await page(b, 1440, 900, 1, { turn: 'Ranger' });
    await shot(p, 'c2-desk-ranger-turn.png');
    await p.click('[data-c2-fab]'); await p.waitForTimeout(450); await shot(p, 'c2-desk-fan.png');
    await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) if (x < 12 || y > 4) e.fog.revealed.push(x + ',' + y); saveEncounter(e); state.ui.c2Fan = false; state.ui.c2Fly = 'fog'; render(); });
    await p.waitForTimeout(700); await shot(p, 'c2-desk-flyout-fog.png');
    await p.evaluate(() => { state.ui.c2Fly = null; const e = loadEncounter(); e.fog = null; saveEncounter(e); state.ui.c2More = true; render(); }); await p.waitForTimeout(400);
    await shot(p, 'c2-desk-more.png');
    await ctx.close(); }
  // phone
  { const { ctx, p } = await page(b, 412, 880, 2, { turn: 'Ranger' });
    await shot(p, 'c2-phone.png');
    await p.click('[data-c2-fab]'); await p.waitForTimeout(450); await shot(p, 'c2-phone-fan.png');
    await ctx.close(); }
  { const { ctx, p } = await page(b, 412, 880, 2);
    await shot(p, 'c2-phone-sheet.png');
    await scrollCard(p, /Actions/); await p.waitForTimeout(200); await shot(p, 'c2-phone-sheet-actions.png');
    await ctx.close(); }
  console.log(errs.length ? 'PAGE ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors');
  await b.close();
})();
