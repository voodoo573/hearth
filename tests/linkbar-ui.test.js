// UI polish — the player's live-game bar (release shots player-view-desk / -phone, FIXES item 5).
// node tests/linkbar-ui.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[1920, 1080], [1440, 900], [412, 892], [360, 740]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {});
    const m = await p.evaluate(async () => {
      const W = ms => new Promise(r => setTimeout(r, ms)); const ch = loadCharacters()[0];
      HearthLink.join = { status: 'linked', code: 'hearth-7K2Q-9MXD', token: 't', charId: ch.id, game: 'Crypt', combat: { started: true, round: 2, yourTurn: false, order: [{ n: 'Elowen', i: 18, k: 'p', turn: true }, { n: 'Goblin', i: 16, k: 'm' }, { n: ch.name, i: 14, k: 'p', you: true }] } };
      HearthUI.go('sheet'); await W(300); HearthLink.ui.barOpen = true; linkRefreshPlayer(); await W(200);
      const bar = document.getElementById('hearthLinkBar'); const r = bar.getBoundingClientRect(); const cs = getComputedStyle(bar);
      const centre = document.querySelector('.u-cs-center'); const cr = centre && centre.getBoundingClientRect();
      const tabs = document.querySelector('.u-tabbar'); const tr = tabs && tabs.offsetParent ? tabs.getBoundingClientRect() : null;
      const btns = [...bar.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().height));
      return { inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, bg: cs.backgroundColor, radius: cs.borderRadius, btns,
        overCentre: cr ? !(r.left >= cr.right || r.right <= cr.left) : false, overTabs: tr ? r.bottom > tr.top : false,
        txt: bar.textContent, emoji: /[\u{1F300}-\u{1FAFF}]/u.test(bar.textContent), turn: !!bar.querySelector('li.turn'), you: (bar.querySelector('li.you') || {}).textContent };
    });
    const tag = `${w}px:`;
    check(tag + ' bar on screen in the polish look (not the old flat #1a1814 panel)', m.inView && m.bg !== 'rgb(26, 24, 20)', m);
    check(tag + ' turn row and your row marked', m.turn && /\(you\)/.test(m.you || ''), m);
    check(tag + ' 44px buttons', m.btns.every(x => x >= 44), m.btns);
    check(tag + ' no emoji, no monster HP or AC', !m.emoji && !/AC \d|\d+\/\d+ HP|Goblin[^\n]*HP/.test(m.txt), m.txt);
    if (w >= 1600) check(tag + ' clear of the sheet centre column', !m.overCentre, m); // below 1600 the sheet is two columns edge to edge
    if (w < 1280) check(tag + ' sits above the tab bar', !m.overTabs, m);
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
