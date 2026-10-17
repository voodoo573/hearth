// UI polish — Jenny's 3-step onboarding replaces the 5-step tour; anyone who saw the old tour never sees it again.
// Serve the repo root (python3 -m http.server 8816), then: node tests/onboarding.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
const EMOJI = () => { const re = /(?:(?![\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u21AA\u2713\u2715\u2716\u2717])\p{Extended_Pictographic}|[\u2726\u2605\u2606])/u; const t = document.getElementById('hearthTour'); return t ? re.test(t.textContent) : null; };
async function fresh(b, desk, prep) {
  const ctx = await b.newContext({ viewport: desk ? { width: 1920, height: 1080 } : { width: 412, height: 892 }, deviceScaleFactor: desk ? 1 : 2, serviceWorkers: 'block', hasTouch: !desk });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  // let the first load finish (it opens the tour and saves the seen flag ~80ms in) before wiping storage, so the
  // flag can't be written back after the clear
  await p.goto(URL); await p.waitForTimeout(600); await p.evaluate((prep) => { localStorage.clear(); if (prep) new Function(prep)(); }, prep || ''); await p.reload(); await p.waitForTimeout(1200);
  if (!prep) await p.waitForSelector('#hearthTour', { timeout: 6000 }).catch(() => {}); // a fresh install opens it by itself (slower on a busy box)
  return { ctx, p };
}
const tour = (p) => p.evaluate(() => { const t = document.getElementById('hearthTour'); if (!t) return null; return { label: (t.querySelector('.u-t-label') || {}).textContent, title: (t.querySelector('#hearthTourTitle') || {}).textContent, dots: t.querySelectorAll('.u-dots i').length, on: [...t.querySelectorAll('.u-dots i')].findIndex(i => i.classList.contains('u-on')), cards: t.querySelectorAll('.u-of .u-card, .u-pill3 .u-pill').length, txt: t.textContent, old: !!t.querySelector('.hearth-tour') }; });

// FIXES item 4: per-step geometry, widows, copy
const SWEEP = () => (async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)); const out = [];
  const widows = (root) => [...root.querySelectorAll('.u-obb, .u-of .u-t-meta, .u-pill3 .u-faded, .u-obt')].filter(el => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let last = null, n; while ((n = tw.nextNode())) if (n.textContent.trim()) last = n; if (!last) return false;
    const all = document.createRange(); all.selectNodeContents(el); const rs = [...all.getClientRects()].filter(r => r.width > 0); if (!rs.length) return false;
    const lastTop = Math.max(...rs.map(r => r.top)); const lineW = rs.filter(r => Math.abs(r.top - lastTop) < 3).reduce((a, r) => a + r.width, 0);
    const t = last.textContent.replace(/\s+$/, ''); const i = Math.max(t.lastIndexOf(' '), t.lastIndexOf('\u00a0')); const wr = document.createRange(); wr.setStart(last, i + 1); wr.setEnd(last, t.length);
    const lw = wr.getBoundingClientRect().width; const lines = new Set(rs.map(r => Math.round(r.top))).size; return lines > 1 && lineW <= lw + 2;
  }).map(el => el.textContent.trim().slice(-30));
  for (let n = 0; n < 3; n++) {
    HearthUI.onboarding.go(n); await W(200);
    const t = document.getElementById('hearthTour'); const q = s => { const e = t.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); };
    const crest = t.querySelector('.u-crest'); const sc = t.querySelector('.u-obp');
    out.push({ dlg: q('.u-obd') || q('.u-obsheet'), art: q('.u-obart'), icon: q('.u-crest') || q('.u-obic'), dots: q('.u-dots'), widows: widows(t), body: (t.querySelector('.u-obb') || {}).textContent,
      txt: t.textContent, joinBtn: !!t.querySelector('[data-tour="join"]'), btnTops: [...t.querySelectorAll('.u-of .u-obcb .u-btn')].map(b => Math.round(b.getBoundingClientRect().top)),
      crestShadow: crest ? getComputedStyle(crest).boxShadow : '', overflow: sc ? sc.scrollHeight > sc.clientHeight + 1 : false });
  }
  return out;
})();
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  let { ctx, p } = await fresh(b, true);
  let t = await tour(p);
  check('fresh install: the new onboarding opens by itself (not the old 5-step tour)', t && !t.old && t.dots === 3 && /step 1 of 3/i.test(t.label) && t.title === 'Welcome to Hearth', t);
  check("step 1 shows Jenny's three value cards", t && t.cards === 3 && /For players/.test(t.txt) && /For DMs/.test(t.txt) && /For the table/.test(t.txt), t);
  check('the seen flag is saved as soon as it opens', await p.evaluate(() => localStorage.getItem('hearth.welcomeSeen') === '1'));
  check('no emoji in the onboarding', (await p.evaluate(EMOJI)) === false);
  const geo = await p.evaluate(() => { const d = document.querySelector('#hearthTour .u-dialog').getBoundingClientRect(); return { w: Math.round(d.width), cx: Math.round(d.left + d.width / 2) }; });

  { const sw = await p.evaluate(SWEEP); const tag = 'desktop:';
    check(tag + ' dialog, icon and dots stay put on all 3 steps', new Set(sw.map(x => x.dlg)).size === 1 && new Set(sw.map(x => x.icon)).size === 1 && new Set(sw.map(x => x.dots)).size === 1, sw.map(x => [x.dlg, x.icon, x.dots]));
    check(tag + ' no one-word last lines', sw.every(x => x.widows.length === 0), sw.map(x => x.widows));
    check(tag + ' step 2: Join a friend\u2019s game has a matching Enter a game code button, buttons line up', sw[1].joinBtn && sw[1].btnTops.length === 3 && new Set(sw[1].btnTops).size === 1 && /Enter a game code/.test(sw[1].txt), sw[1].btnTops);
    check(tag + ' no quotes round Sample:, no Settings arrow', !/[\u201c"]Sample:[\u201d"]/.test(sw[1].txt) && /Sample:/.test(sw[1].body) && !/\u2192/.test(sw[2].txt) && /in Settings, under Back up & export/.test(sw[2].txt.replace(/\u00a0/g, ' ')), [sw[1].body, sw[2].txt.slice(0, 300)]);
    check(tag + ' step-1 crest has the dim bevel, not the bright gold ring', !/240, 208, 131/.test(sw[0].crestShadow) && sw[0].crestShadow !== 'none', sw[0].crestShadow);
    global.__deskBody2 = sw[1].body; await p.evaluate(() => HearthUI.onboarding.go(0)); }
  check('desktop: an 820px dialog centred on the screen', geo.w === 820 && Math.abs(geo.cx - 960) <= 2, geo);
  await p.click('[data-tour="next"]'); t = await tour(p);
  check('Next goes to step 2 of 3 with the sample buttons', t && /step 2 of 3/i.test(t.label) && t.on === 1 && !!(await p.$('[data-tour="try-character"]')) && !!(await p.$('[data-tour="try-encounter"]')), t);
  await p.keyboard.press('ArrowRight'); t = await tour(p);
  check('arrow keys move between steps; step 3 ends with Start using Hearth', t && /step 3 of 3/i.test(t.label) && !!(await p.$('[data-tour="done"]')) && !(await p.$('[data-tour="next"]')), t);
  await p.click('[data-tour="back"]'); t = await tour(p);
  check('Back returns to step 2', t && /step 2 of 3/i.test(t.label), t);
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  check('focus stays inside the onboarding', await p.evaluate(() => document.getElementById('hearthTour').contains(document.activeElement)));
  await p.click('[data-tour="try-character"]'); await p.waitForTimeout(400);
  check('Try a sample character closes it and loads the sample', !(await tour(p)) && await p.evaluate(() => loadCharacters().some(c => hearthIsSample(c))));
  await p.reload(); await p.waitForTimeout(1000);
  check('it does not come back on the next launch', !(await tour(p)));
  await p.evaluate(() => HearthUI.actions.tour()); await p.waitForTimeout(150); t = await tour(p);
  check('the replay entry (How Hearth works) opens the new 3-step version', t && t.dots === 3 && !t.old, t);
  await p.keyboard.press('Escape'); check('Escape closes it', !(await tour(p)));
  await p.evaluate(() => hearthOpenTour()); await p.evaluate(() => hearthCloseTour());
  check('hearthCloseTour (the old Skip function) still closes it', !(await tour(p)));
  await p.evaluate(() => hearthOpenTour()); await p.click('[data-tour="skip"]');
  check('Skip tour closes it', !(await tour(p)));
  await ctx.close();
  ({ ctx, p } = await fresh(b, true, "localStorage.setItem('hearth.welcomeSeen','1')"));
  check('someone who saw or finished the old tour never gets the new one', !(await tour(p)));
  await ctx.close();
  ({ ctx, p } = await fresh(b, true, "localStorage.setItem('hearth.characters.v2', JSON.stringify([{id:'c1',name:'Kara',klass:'fighter',level:2}]))"));
  check('an existing user with characters (no flag) does not get it, and is marked as seen', !(await tour(p)) && await p.evaluate(() => localStorage.getItem('hearth.welcomeSeen') === '1'));
  await ctx.close();
  ({ ctx, p } = await fresh(b, false)); t = await tour(p);
  const ph = await p.evaluate(() => { const s = document.querySelector('#hearthTour .u-obsheet'); const r = s && s.getBoundingClientRect(); const small = [...document.querySelectorAll('#hearthTour button')].filter(x => x.offsetParent && x.getBoundingClientRect().height < 44).map(x => x.textContent.trim() || x.getAttribute('aria-label')); return { full: !!r && r.width === 412 && r.height === 892, small }; });
  check('phone: full-screen step with Skip and a bottom Next', t && /Step 1 of 3/.test(t.label) && ph.full && !!(await p.$('.u-obfoot [data-tour="next"]')) && !!(await p.$('.u-obh [data-tour="skip"]')), { t, ph });

  { const sw = await p.evaluate(SWEEP); const tag = 'phone:';
    check(tag + ' icon and dots stay put on all 3 steps', new Set(sw.map(x => x.icon)).size === 1 && new Set(sw.map(x => x.dots)).size === 1, sw.map(x => [x.icon, x.dots]));
    check(tag + ' no one-word last lines', sw.every(x => x.widows.length === 0), sw.map(x => x.widows));
    check(tag + ' step 2 copy is the same as on the desktop', sw[1].body === global.__deskBody2, [sw[1].body, global.__deskBody2]);
    check(tag + ' step 2 has Enter a game code; nothing hidden under the footer', sw[1].joinBtn && sw.every(x => !x.overflow), sw.map(x => x.overflow));
    await p.evaluate(() => HearthUI.onboarding.go(0)); }
  check('phone: every onboarding button is at least 44px tall', ph.small.length === 0, ph.small);
  await p.click('[data-tour="next"]'); await p.click('[data-tour="try-encounter"]'); await p.waitForTimeout(500);
  check('phone: Try a sample encounter closes it and loads the sample game', !(await tour(p)) && await p.evaluate(() => JSON.stringify(localStorage).includes('sample_enc_road')));
  await p.evaluate(() => { hearthOpenTour(); HearthUI.onboarding.go(1); }); await p.waitForTimeout(200); await p.click('[data-tour="join"]'); await p.waitForTimeout(400);
  check('phone: Enter a game code closes it and opens the join box', !(await tour(p)) && await p.evaluate(() => !!(document.getElementById('linkJoinCode') && document.getElementById('linkJoinCode').offsetParent)));
  await ctx.close(); await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real.slice(0, 5));
  const pass = results.filter(x => x.ok).length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
