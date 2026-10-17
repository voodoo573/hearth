// Hearth — the DM "Your games" rows (Jenny's live-app bug: the lone "Game 1" card read as running off the right edge).
// Serve the repo root, then: node tests/dm-games-row.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
const measure = () => {
  const sec = document.querySelector('#content > .section.home-buttons'), sr = sec.getBoundingClientRect();
  return { vw: document.documentElement.clientWidth, bg: getComputedStyle(sec).backgroundColor, secR: sr.right,
    rows: [...document.querySelectorAll('.home-tile-row')].map(r => { const t = r.querySelector('.home-tile'), side = r.querySelector('.home-tile-side'), tr = t.getBoundingClientRect(), cs = getComputedStyle(t);
      return { right: Math.max(tr.right, side ? side.getBoundingClientRect().right : 0), radius: [cs.borderTopRightRadius, cs.borderBottomRightRadius], side: !!side, over: r.scrollWidth > r.clientWidth + 1 }; }) };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [tag, w, h] of [['phone', 412, 892], ['desktop', 1920, 1080]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); }); await p.reload(); await p.waitForTimeout(900);
    await p.evaluate(() => { try { hearthCloseTour(); } catch (e) {} state.tab = 'character'; state.ui.homeMenu = 'dm'; state.ui.homePanel = null; render(); }); await p.waitForTimeout(300);
    if (!(await p.evaluate(() => !!document.querySelector('#content > .section.home-buttons')))) { check(`${tag}: legacy DM menu not shown (replaced by the new DM page)`, true); await ctx.close(); continue; }
    const one = await p.evaluate(measure);
    const r1 = one.rows[0];
    check(`${tag}: the only game's card keeps its rounded right corners and stays inside the column`, one.rows.length === 1 && !r1.side && parseFloat(r1.radius[0]) > 0 && parseFloat(r1.radius[1]) > 0 && r1.right <= one.secR + 0.5 && r1.right <= one.vw && !r1.over, one);
    check(`${tag}: no dark band behind the games list`, /rgba\(0, 0, 0, 0\)|transparent/.test(one.bg), one.bg);
    await p.evaluate(() => { const gc = loadGames(); const g = JSON.parse(JSON.stringify(gc.games[0])); g.id = 'g_two'; g.name = 'A very long campaign name that goes on and on past the edge'; gc.games.push(g); saveGames(gc); render(); }); await p.waitForTimeout(300);
    const two = await p.evaluate(measure);
    check(`${tag}: with two games (long name), each card and its delete button fit inside the column`, two.rows.length === 2 && two.rows.every(r => r.side && r.right <= two.secR + 0.5 && r.right <= two.vw && !r.over), two);
    await ctx.close();
  }
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
