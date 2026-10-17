// UI polish (release) — no emoji left on the DM map and encounter screens (C2 and classic), gold line icons
// instead, and the buttons that carried them still work. node tests/dm-emoji.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
const EMO = () => { const re = /(?:(?![\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u21AA\u2713\u2715\u2716\u2717])\p{Extended_Pictographic}|[\u2726\u2605\u2606])/u; const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (re.test(n.nodeValue) && n.parentElement && n.parentElement.getClientRects().length) out.push(n.nodeValue.trim().slice(0, 30)); } return out; };
const STEPS = [
  ['C2 map', () => {}],
  ['C2 More menu', () => { state.ui.c2More = true; render(); }],
  ['C2 tool fan', () => { state.ui.c2More = false; state.ui.c2Fan = true; render(); }],
  ['encounter (C2 layout)', () => { state.ui.c2Fan = false; state.ui.dmMapMode = false; render(); }],
  ['classic map with templates', () => { dmSetLayout('classic'); state.ui.dmMapMode = true; const e = loadEncounter(); const d = e.combatants.find(c => c.kind !== 'player'); e.aoes = [{ id: 'a1', kind: 'circle', x: 5, y: 5, len: 20, pinned: false }, { id: 'a2', kind: 'cone', x: 8, y: 8, len: 30, angle: 0, pinned: true }, { id: 'a3', kind: 'circle', x: 3, y: 3, len: 10, attachedTo: d && d.id, pinned: true }]; saveEncounter(e); render(); }],
  ['encounter (classic layout)', () => { state.ui.dmMapMode = false; render(); }],
];
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h, d, label] of [[1440, 900, 1, 'desktop'], [412, 880, 2, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
    await p.waitForFunction(() => window.HearthC2, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(S.STAGE, { turn: 'Ranger' }); await p.waitForTimeout(1500);
    for (const [name, fn] of STEPS) { await p.evaluate(fn); await p.waitForTimeout(450); const e = await p.evaluate(EMO); check(`${label} ${name}: no emoji`, e.length === 0, e); }
    if (label === 'desktop') {
      check('encounter buttons carry gold line icons', await p.evaluate(() => { const b = document.querySelector('.dm-map-btn, .dm-run-it-btn'); const i = b && b.querySelector('.u-emo-gold svg path'); return !!i && getComputedStyle(b.querySelector('.u-emo-gold')).color !== getComputedStyle(b).color; }));
      check('team button keeps its colour meaning (red / green / grey dot)', await p.evaluate(() => { const b = document.querySelector('.dm-tile-disp-btn'); return !!b && !!b.querySelector('.u-emo-dot.u-emo-hostile'); }));
      const disp = await p.evaluate(async () => { const b = document.querySelector('.dm-tile-disp-btn'); const id = b.dataset.dmDisposition; b.click(); await new Promise(r => setTimeout(r, 200)); const c = loadEncounter().combatants.find(x => x.id === id); return { d: c.disposition, dot: !!document.querySelector(`[data-dm-disposition="${id}"] .u-emo-ally, [data-dm-disposition="${id}"] .u-emo-neutral`) }; });
      check('tapping the team dot still changes the team, and the dot follows', disp.d && disp.d !== 'enemy' && disp.dot, disp);
      await p.evaluate(() => { state.ui.dmMapMode = true; render(); }); await p.waitForTimeout(500);
      check('template buttons draw SVG icons (pin, anchor), not emoji', await p.evaluate(() => document.querySelectorAll('#dmMapGrid .dm-aoe-svgico path').length >= 2 && ![...document.querySelectorAll('#dmMapGrid text')].some(t => /\p{Extended_Pictographic}/u.test(t.textContent))));
      const pin = await p.evaluate(async () => { const before = loadEncounter().aoes.find(a => a.id === 'a1').pinned; const c = document.querySelector('circle[data-aoe-pin="a1"]'); const r = c.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const el = document.elementFromPoint(x, y); el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); await new Promise(r => setTimeout(r, 250)); return { before, after: loadEncounter().aoes.find(a => a.id === 'a1').pinned, hit: el.tagName + '.' + el.getAttribute('class') }; });
      check('tapping the pin icon spot still pins the template (the circle takes the tap)', pin.before === false && pin.after === true, pin);
      check('an anchored template says "on token" in words', await p.evaluate(() => [...document.querySelectorAll('#dmMapGrid .dm-aoe-label')].some(t => /on token/.test(t.textContent))));
      const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
      pop.on('pageerror', e => errs.push('projector: ' + e.message)); await pop.waitForTimeout(1200);
      const pj = await pop.evaluate((src) => { const re = new RegExp(src, 'u'); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const out = []; while ((n = w.nextNode())) if (re.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0, 30)); const fs = document.getElementById('fsBtn'); return { out, svg: !!(fs && fs.querySelector('svg.fsico path')), label: fs && fs.textContent.trim() }; }, '(?:(?![\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2194-\\u21AA\\u2713\\u2715\\u2716\\u2717])\\p{Extended_Pictographic}|[\\u2726\\u2605\\u2606])');
      check('projector window: no emoji; Fullscreen carries the line icon', pj.out.length === 0 && pj.svg && pj.label === 'Fullscreen', pj);
      await pop.close();
    }
    await ctx.close();
  }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real.slice(0, 5));
  const pass = results.filter(x => x.ok).length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
