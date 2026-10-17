// UI polish — every action button on the Dungeon Master page fits inside its card (the "Game 1" overflow) at
// desktop widths and on phone, and stays a 44px touch target. node tests/dm-hub-fit.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
const MEASURE = () => {
  const bad = [], small = [], overlap = []; let n = 0;
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const content = document.getElementById('content');
  for (const b of content.querySelectorAll('button, a.u-btn')) {
    if (!vis(b)) continue;
    const card = b.parentElement && b.parentElement.closest('.u-card'); if (!card) continue;
    n++;
    const r = b.getBoundingClientRect(), c = card.getBoundingClientRect(), lbl = (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30);
    if (r.left < c.left - 0.5 || r.right > c.right + 0.5 || r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5) bad.push({ lbl, b: [Math.round(r.left), Math.round(r.right)], card: [Math.round(c.left), Math.round(c.right)] });
    // an ancestor that clips (overflow hidden/auto) must not cut the button either
    for (let a = b.parentElement; a && a !== card.parentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (/hidden|clip|auto|scroll/.test(cs.overflowX)) { const ar = a.getBoundingClientRect(); if (r.right > ar.right + 0.5 || r.left < ar.left - 0.5) { bad.push({ lbl, clippedBy: a.className.slice(0, 30) }); break; } } }
    // SPEC rule 5: 44px on phone; on desktop the game-card actions (lg, 52px) are checked
    const phone = document.body.classList.contains('u-phone');
    if ((phone ? b.matches('.u-btn, .u-ibtn') : !!b.closest('.u-gact, .u-pact')) && r.height < 44 - 0.5 && !b.closest('.u-sec-h')) small.push({ lbl, h: Math.round(r.height) });
  }
  const acts = [...content.querySelectorAll('.u-gact > *, .u-pact > *')].filter(vis).map(e => e.getBoundingClientRect());
  for (let i = 0; i < acts.length; i++) for (let j = i + 1; j < acts.length; j++) { const a = acts[i], c = acts[j]; if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) overlap.push([i, j]); }
  return { n, bad, small, overlap, pageOver: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h, d] of [[1024, 768, 1], [1280, 800, 1], [1440, 900, 1], [1920, 1080, 1], [412, 892, 2], [360, 780, 2]]) {
    for (const live of [false, true]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d, serviceWorkers: 'block' });
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
      await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
      await p.evaluate(S.STAGE, {}); await p.evaluate(async (live) => {
        if (live) { const gc = loadGames(); gc.games[0].name = 'The Sunken Crypt of the Forgotten Ember King'; saveGames(gc); }
        HearthUI.go('dm'); await new Promise(z => setTimeout(z, 300)); }, live);
      const m = await p.evaluate(MEASURE);
      const tag = `${w}px${live ? ' (long game name)' : ''}`;
      check(`${tag}: every DM-page action button sits inside its card`, m.n > 3 && m.bad.length === 0, m.bad);
      check(`${tag}: 44px touch targets (all buttons on phone, game actions on desktop), game actions don't overlap, no sideways scroll`, m.small.length === 0 && m.overlap.length === 0 && !m.pageOver, { small: m.small, overlap: m.overlap, pageOver: m.pageOver });
      await ctx.close();
    }
  }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real.slice(0, 5));
  const pass = results.filter(x => x.ok).length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
