// UI polish — the player's live-game bar (release shots player-view-desk / -phone, FIXES item 5).
// On the sheet it is docked into the page (the sheet makes room), so it never covers a card at any width or
// scroll position; elsewhere it floats. node tests/linkbar-ui.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 600) : '')); }
const JOIN = () => { const ch = loadCharacters()[0];
  HearthLink.join = { status: 'linked', code: 'hearth-7K2Q-9MXD', token: 't', charId: ch.id, game: 'Crypt', combat: { started: true, round: 2, yourTurn: false, order: [{ n: 'Elowen', i: 18, k: 'p', turn: true }, { n: 'Goblin', i: 16, k: 'm' }, { n: ch.name, i: 14, k: 'p', you: true }, { n: 'Wolf', i: 13, k: 'm' }, { n: 'Thessaly', i: 12, k: 'p' }] } };
  HearthLink.ui.barOpen = true; linkRefreshPlayer(); };
// every visible sheet card / tile / row the bar could cover, checked against the bar's box
const OVERLAP = () => {
  const bar = document.getElementById('hearthLinkBar'); if (!bar) return { bar: false };
  const b = bar.getBoundingClientRect();
  const sel = '#content .u-cs .u-card, #content .u-cs .u-seg, #content .u-cs [data-cs-slot] > *, #content .u-cs .u-cs-atk, #content .u-cs .u-chip, #content .u-cs button';
  const hits = [...document.querySelectorAll(sel)].filter(e => !bar.contains(e) && !e.contains(bar)).filter(e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || getComputedStyle(e).visibility === 'hidden') return false;
    return r.left < b.right - 1 && r.right > b.left + 1 && r.top < b.bottom - 1 && r.bottom > b.top + 1; }).map(e => (e.className || e.tagName).toString().slice(0, 40) + ':' + (e.textContent || '').trim().slice(0, 20));
  const tabs = document.querySelector('.u-tabbar'); const tr = tabs && getComputedStyle(tabs).display !== 'none' ? tabs.getBoundingClientRect() : null;
  return { bar: true, hits, docked: bar.classList.contains('u-lb-dock'), overTabs: !!tr && tr.height > 0 && b.bottom > tr.top + 1 && b.top < tr.bottom };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768], [412, 892], [360, 740]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {});
    await p.evaluate(async () => { HearthUI.go('sheet'); await new Promise(r => setTimeout(r, 300)); }); await p.evaluate(JOIN); await p.waitForTimeout(200);
    const tag = `${w}px:`;
    const m = await p.evaluate(() => { const bar = document.getElementById('hearthLinkBar'); const cs = getComputedStyle(bar);
      return { bg: cs.backgroundColor, btns: [...bar.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().height)), txt: bar.textContent,
        emoji: /[\u{1F300}-\u{1FAFF}]/u.test(bar.textContent), turn: !!bar.querySelector('li.turn'), you: (bar.querySelector('li.you') || {}).textContent }; });
    check(tag + ' bar in the polish look (not the old flat #1a1814 panel)', m.bg !== 'rgb(26, 24, 20)', m.bg);
    check(tag + ' turn row and your row marked', m.turn && /\(you\)/.test(m.you || ''), m);
    check(tag + ' 44px buttons', m.btns.every(x => x >= 44), m.btns);
    check(tag + ' no emoji, no monster HP or AC', !m.emoji && !/AC \d|\d+\/\d+ HP|Goblin[^\n]*HP/.test(m.txt), m.txt);
    // no overlap with the sheet, open and collapsed, at the top, middle and bottom of the page
    for (const open of [true, false]) {
      await p.evaluate((o) => { HearthLink.ui.barOpen = o; linkRefreshPlayer(); }, open); await p.waitForTimeout(150);
      const res = [];
      for (const f of [0, 0.5, 1]) { res.push(await p.evaluate((f) => { window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f); return null; }, f)); await p.waitForTimeout(120); res[res.length - 1] = await p.evaluate(OVERLAP); }
      check(tag + ` sheet: ${open ? 'open' : 'collapsed'} bar docked and covers nothing (top, middle, bottom)`, res.every(r => r.bar && r.docked && r.hits.length === 0 && !r.overTabs), res);
    }
    await p.evaluate(() => { window.scrollTo(0, 0); HearthLink.ui.barOpen = true; linkRefreshPlayer(); });
    // still there, still docked, after a re-render (tab switch) and a resize
    await p.evaluate(async () => { const t = document.querySelector('[data-u-act="cs-tab"][data-v="spells"], [data-cs-tab="spells"]'); if (t) t.click(); else render(); await new Promise(r => setTimeout(r, 250)); render(); await new Promise(r => setTimeout(r, 250)); });
    const rr = await p.evaluate(OVERLAP);
    check(tag + ' survives a re-render, docked, still covering nothing', rr.bar && rr.docked && rr.hits.length === 0, rr);
    // the roll dialog's Roll button is never under the bar
    await p.evaluate(() => { const t = document.querySelector('[data-cs-tab="actions"], [data-u-act="cs-tab"][data-v="actions"]'); if (t) t.click(); });
    await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('.u-cs-roll.u-hit').click()); await p.waitForTimeout(300);
    const top = await p.evaluate(() => { const r = document.querySelector('.roll-dialog [data-roll-line="0"]'); if (!r) return 'no dialog'; const q = r.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return e && (e === r || r.contains(e)); });
    check(tag + ' roll dialog Roll button is on top (not under the bar)', top === true, top);
    await p.evaluate(() => { const c = document.getElementById('rollDialogCancel'); if (c) c.click(); }); await p.waitForTimeout(300);
    // off the sheet it floats again, clear of the tab bar, and steps aside for dialogs
    await p.evaluate(async () => { HearthUI.go('gear'); await new Promise(r => setTimeout(r, 300)); });
    const g = await p.evaluate(() => { const bar = document.getElementById('hearthLinkBar'); const r = bar && bar.getBoundingClientRect(); const tabs = document.querySelector('.u-tabbar'); const tr = tabs && getComputedStyle(tabs).display !== 'none' ? tabs.getBoundingClientRect() : null;
      return { bar: !!bar, docked: bar && bar.classList.contains('u-lb-dock'), inBody: bar && bar.parentNode === document.body, fixed: bar && getComputedStyle(bar).position === 'fixed', inView: r && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, overTabs: !!(tr && tr.height && r.bottom > tr.top + 1) }; });
    check(tag + ' off the sheet: floats on screen, clear of the tab bar', g.bar && !g.docked && g.inBody && g.fixed && g.inView && !g.overTabs, g);
    await p.evaluate(async () => { HearthUI.go('sheet'); await new Promise(r => setTimeout(r, 300)); });
    const back = await p.evaluate(OVERLAP);
    check(tag + ' back on the sheet: docked again', back.bar && back.docked && back.hits.length === 0, back);
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
