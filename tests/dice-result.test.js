// UI polish — the roll result card (Jenny's dice-desk / dice-phone, release-review FIXES.md item 2).
// node tests/dice-result.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 600) : '')); }
async function open(b, w, h, seq) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(S.STAGE, {});
  await p.evaluate((seq) => {
    window.__posted = []; const g = window.getMapChannel; window.getMapChannel = function () { const c = g ? g() : null; return c ? { postMessage: (m) => { window.__posted.push(m); try { c.postMessage(m); } catch (e) {} } } : { postMessage: (m) => window.__posted.push(m) }; };
    window.__seq = seq.slice(); const R = Math.random; Math.random = () => window.__seq.length ? window.__seq.shift() : R();
    try { hearthDiceSetPref && hearthDiceSetPref('animate', false); } catch (e) {}
    HearthUI.go('sheet');
  }, seq || []);
  await p.waitForTimeout(400);
  return { p, ctx };
}
async function rollAttack(p) {
  await p.click('.u-cs-roll.u-hit'); await p.waitForTimeout(250);
  await p.click('.roll-dialog [data-roll-line="0"]');
  await p.waitForFunction(() => { const d = document.querySelector('.roll-outcome-dialog .u-dc'); return d && getComputedStyle(document.getElementById('rollOutcomeBackdrop')).opacity === '1'; }, null, { timeout: 15000 });
  await p.waitForTimeout(200);
}
const READ = () => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const dlg = document.querySelector('.roll-outcome-dialog'), c = dlg && dlg.querySelector('.u-dc');
  const btns = c ? [...c.querySelectorAll('button')].filter(vis).map(b => b.textContent.trim()) : [];
  const primary = c ? [...c.querySelectorAll('.u-btn.u-primary')].filter(vis).map(b => b.textContent.trim()) : [];
  const appBtns = dlg ? [...dlg.querySelectorAll('#rollOutcomeClose,#rollOutcomeBack,#rollOutcomeNext,#rollOutcomeCommit')].filter(vis).length : -1;
  const bd = document.getElementById('rollOutcomeBackdrop');
  const log = document.querySelector('.u-dclog'), plog = c && c.querySelector('.u-dc-plog');
  const lr = log && log.getBoundingClientRect(), dr = dlg && dlg.getBoundingClientRect();
  return { total: c && c.querySelector('.u-dc-total').textContent.trim(), die: c && (c.querySelector('.u-dc-die text') || {}).textContent, nat: c && (c.querySelector('.u-verdict') || {}).textContent || null,
    adv: c ? [...c.querySelectorAll('.u-dc-adv .u-chip')].map(x => x.textContent.trim() + (x.classList.contains('u-on') ? '*' : '') + (x.disabled ? '!' : '')) : [], btns, primary, appBtns,
    blur: bd ? getComputedStyle(bd).backdropFilter : '', note: c && /Nothing goes there automatically/.test(c.textContent), chip: c && c.querySelector('.u-dc-head .u-tag') && c.querySelector('.u-dc-head .u-tag').textContent.trim(),
    log: !!log && vis(log), logRows: log ? log.querySelectorAll('.u-row').length : 0, logRight: lr && dr ? lr.left >= dr.right : null, plog: !!plog && vis(plog), plogRows: plog ? plog.querySelectorAll('.u-row').length : 0,
    inView: dr ? dr.top >= 0 && dr.bottom <= innerHeight + 1 && dr.left >= 0 && dr.right <= innerWidth + 1 : false, posted: window.__posted.length, emoji: /[\u{1F300}-\u{1FAFF}\u2605\u2606]/u.test(c ? c.textContent : '') };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // 0.75 -> d20 16 (normal roll)
  for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [412, 892]]) {
    const { p, ctx } = await open(b, w, h, [0.75]); const tag = `${w}px:`;
    await rollAttack(p); const m = await p.evaluate(READ);
    check(tag + ' d20 art shows the natural roll, total beside it', m.die === '16' && m.total === '21', m);
    check(tag + ' no "Natural" pill on a 16', m.nat === null, m.nat);
    check(tag + ' Advantage / Normal / Disadvantage with Normal on', JSON.stringify(m.adv) === JSON.stringify(['Advantage', 'Normal*', 'Disadvantage']), m.adv);
    check(tag + ' one primary: Roll damage 1d8+3, plus Smite +2d8', m.primary.length === 1 && m.primary[0] === 'Roll damage 1d8+3' && m.btns.includes('Smite +2d8'), m);
    check(tag + ' no Done/Close duplicate (app buttons hidden, one Back)', m.appBtns === 0 && m.btns.filter(x => /^(Close|Back)/.test(x)).length === 1 && !m.btns.includes('Close'), m.btns);
    check(tag + ' projector note, roll-log chip, no emoji', m.note && /roll log|Shared with your DM/.test(m.chip) && !m.emoji, m);
    check(tag + ' result card fully on screen', m.inView, m);
    if (w > 1000) {
      check(tag + ' roll log beside the card on the right', m.log && m.logRows >= 1 && m.logRight === true, m);
      check(tag + ' no full-screen blur', m.blur === 'none' || m.blur === '', m.blur);
    } else check(tag + ' roll log below the result in the sheet', m.plog && m.plogRows >= 1, m);
    check(tag + ' nothing sent to the projector', m.posted === 0, m.posted);
    // Advantage after a straight roll: second d20 (0.3 -> 7), keep the higher (16)
    await p.evaluate(() => { window.__seq = [0.3]; });
    await p.click('.u-dc-adv .u-chip:nth-child(1)'); await p.waitForTimeout(400);
    const a = await p.evaluate(READ);
    const ln = await p.evaluate(() => { const d = state.ui.rollDialog; return d.lines[0].rollDetail; });
    const mm = /\[16, (\d+)\] \+5 = (\d+)/.exec(ln || '');
    check(tag + ' Advantage rolls one more d20 and keeps the higher, then locks', mm && +mm[2] === Math.max(16, +mm[1]) + 5 && a.total === mm[2] && a.die === String(Math.max(16, +mm[1])) && JSON.stringify(a.adv) === JSON.stringify(['Advantage*', 'Normal!', 'Disadvantage!']), { ln, adv: a.adv, t: a.total });
    // Roll damage → app's next line
    await p.click('.u-dc .u-btn.u-primary'); await p.waitForTimeout(600);
    const dm = await p.evaluate(() => ({ t: state.ui.rollOutcome && state.ui.rollOutcome.title, r: state.ui.rollDialog.lines[1].result }));
    check(tag + ' Roll damage runs the app damage line', dm.r != null, dm);
    await ctx.close();
  }
  // nat 20 pill + Smite path
  { const { p, ctx } = await open(b, 1440, 900, [0.99]);
    await rollAttack(p); const m = await p.evaluate(READ);
    check('nat 20: "Natural 20" pill shows', m.nat && /^Natural 20/.test(m.nat), m.nat);
    await p.click('.u-dc [data-u-act="dc-smite"]'); await p.waitForTimeout(700);
    const s = await p.evaluate(() => { const d = state.ui.rollDialog; return { applied: d.layeredApplied || [], lines: d.lines.map(l => l.label + ':' + (l.result != null)) }; });
    check('Smite adds the app Divine Smite layer and rolls damage', s.applied.some(x => /^smite_1$/.test(x)) && s.lines.some(l => /:true$/.test(l) && !/Attack/.test(l)), s);
    check('nat 20 / smite: still nothing on the projector', await p.evaluate(() => window.__posted.length === 0));
    await ctx.close(); }
  { const { p, ctx } = await open(b, 412, 892, [0.0]);
    await rollAttack(p); const m = await p.evaluate(READ);
    check('nat 1: "Natural 1" pill shows', m.nat && /^Natural 1$/.test(m.nat), m.nat);
    await p.click('.u-dc [data-u-act="dc-back"]'); await p.waitForTimeout(300);
    check('Back returns to the app roll dialog', await p.evaluate(() => !state.ui.rollOutcome && !!document.querySelector('.roll-dialog')));
    await ctx.close(); }
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
