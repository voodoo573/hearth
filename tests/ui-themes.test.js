// UI polish — theme picker pop-up (SPEC §8) + saved themes still load after the regrouping.
// Serve the repo root (python3 -m http.server 8816), then: node tests/ui-themes.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
const look = (p) => p.evaluate(() => ({ theme: document.documentElement.getAttribute('data-theme'), palette: document.documentElement.getAttribute('data-palette'), saved: (() => { const x = JSON.parse(localStorage.getItem('hearth.prefs.v1') || '{}'); return { palette: x.palette, theme: x.theme }; })() }));
async function open(b, desk, seed) {
  const ctx = await b.newContext({ viewport: desk ? { width: 1920, height: 1080 } : { width: 412, height: 892 }, deviceScaleFactor: desk ? 1 : 2, serviceWorkers: 'block', hasTouch: !desk });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.evaluate(S.SEED, seed || {}); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(S.STAGE, {}); await p.waitForTimeout(300);
  await p.evaluate(() => { state.ui.homePanel = 'settings'; state.ui.uSetSec = null; render(); }); await p.waitForTimeout(200);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // ---------- desktop ----------
  let { ctx, p } = await open(b, true, { palette: 'hearth' });
  check('Settings has a Theme row with a Change button and no inline theme grid', await p.evaluate(() => !!document.querySelector('.u-thr [data-u-act="themes"]') && !document.querySelector('#settingsThemeGrid, [data-palette-pref]')));
  await p.click('[data-u-act="themes"]'); await p.waitForTimeout(250);
  const st = await p.evaluate(() => {
    const L = document.querySelector('.u-layer'), d = L && L.querySelector('.u-dialog'), r = d.getBoundingClientRect(), sc = getComputedStyle(L.querySelector('.u-scrim'));
    const groups = [...d.querySelectorAll('.u-gh')].map(g => ({ name: g.querySelector('.u-t-label').textContent, n: g.nextElementSibling.querySelectorAll('[data-tk]').length, ids: [...g.nextElementSibling.querySelectorAll('[data-tk]')].map(x => x.dataset.tk) }));
    return { w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), cx: Math.round(r.left + r.width / 2), scrim: sc.backgroundColor, blur: sc.backdropFilter, total: d.querySelectorAll('[data-tk]').length, groups, radio: !!d.querySelector('[role="radiogroup"] [role="radio"][aria-checked="true"]'), focus: document.activeElement && document.activeElement.dataset.tk, cols: getComputedStyle(d.querySelector('.u-cards')).gridTemplateColumns.split(' ').length, rail: [...d.querySelectorAll('[data-tp-jump]')].map(x => x.textContent) };
  });
  check('desktop: centred dialog 1240 wide, 64px from top and bottom, centred in the main column', st.w === 1240 && st.top === 64 && st.bottom === 64 && Math.abs(st.cx - (272 + (1920 - 272) / 2)) <= 1, st);
  check('desktop: lighter scrim rgba(0,0,0,.42) with no blur', /rgba\(0, 0, 0, 0\.42\)/.test(st.scrim) && (st.blur === 'none' || !st.blur), [st.scrim, st.blur]);
  check('27 themes in 5 groups: Hearth & classic 4, Places 8, Classes 11, Races 2, Scott\u2019s themes 2', st.total === 27 && st.groups.map(g => g.name + ':' + g.n).join('|') === 'Hearth & classic:4|Places:8|Classes:11|Races:2|Scott\u2019s themes:2', st.groups.map(g => g.name + ':' + g.n));
  check('Races holds Dragonscale and Honeyed Hollow; Scott\u2019s themes holds both Scott palettes; Classes has no race themes', st.groups[3].ids.join() === 'scales,hollow' && st.groups[4].ids.join() === 'scott-ultramarine,scott-marine' && !st.groups[2].ids.some(x => x === 'scales' || x === 'hollow'), st.groups.map(g => g.ids.join()));
  check('grid is a radio group, 4 columns, current theme checked and focused; rail lists the 5 groups', st.radio && st.cols === 4 && st.focus === 'hearth' && st.rail.length === 5, st);
  // tap previews live, nothing saved
  await p.click('[data-tk="arcane"]'); await p.waitForTimeout(150);
  let lk = await look(p);
  check('tapping a theme previews it on <html> without saving', lk.palette === 'arcane' && lk.saved.palette === 'hearth', lk);
  check('footer says Previewing Arcane Tower and Apply theme', await p.evaluate(() => /Previewing Arcane Tower/.test(document.querySelector('[data-tp-foot]').textContent) && /Apply theme/.test(document.querySelector('[data-tp-foot]').textContent)));
  check('the current theme card shows a Current tag while previewing another', await p.evaluate(() => /Current/.test(document.querySelector('[data-tk="hearth"]').textContent)));
  // cancel paths restore
  for (const how of ['cancel', 'close', 'escape', 'scrim']) {
    if (!(await p.$('.u-layer'))) { await p.click('[data-u-act="themes"]'); await p.waitForTimeout(150); await p.click('[data-tk="infernal"]'); await p.waitForTimeout(100); }
    if (how === 'cancel') await p.click('.u-layer [data-u-close="cancel"]');
    if (how === 'close') await p.click('.u-layer [data-u-close="close"]');
    if (how === 'escape') await p.keyboard.press('Escape');
    if (how === 'scrim') await p.mouse.click(140, 1060);
    await p.waitForTimeout(150);
    lk = await look(p);
    const gone = !(await p.$('.u-layer'));
    check(`${how} closes and restores the original theme`, gone && lk.palette === 'hearth' && lk.saved.palette === 'hearth', { gone, lk });
  }
  check('focus returns to the Change button on close', await p.evaluate(() => document.activeElement && document.activeElement.dataset.uAct === 'themes'));
  // keyboard: arrows preview, Enter applies
  await p.click('[data-u-act="themes"]'); await p.waitForTimeout(200);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80);
  lk = await look(p);
  check('ArrowRight moves the selection and previews (Light)', lk.palette === null && lk.theme === 'light' && (await p.evaluate(() => document.activeElement.dataset.tk)) === 'light', lk);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80);
  check('ArrowDown moves to the next row (Places: Elven Forest)', (await p.evaluate(() => document.activeElement.dataset.tk)) === 'forest');
  for (let i = 0; i < 5; i++) await p.keyboard.press('Tab');
  check('focus stays trapped inside the dialog', await p.evaluate(() => !!document.activeElement.closest('.u-layer')));
  await p.focus('[data-tk="forest"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  lk = await look(p);
  check('Enter applies: saves prefs.palette and prefs.theme like wireHearthLookSettings', !(await p.$('.u-layer')) && lk.saved.palette === 'forest' && lk.saved.theme === 'light' && lk.palette === 'forest', lk);
  check('Settings Theme row now shows Elven Forest', await p.evaluate(() => /Elven Forest/.test(document.querySelector('.u-thr').textContent)));
  // apply via button
  await p.click('[data-u-act="themes"]'); await p.waitForTimeout(150);
  await p.click('[data-tp-jump="classes"]'); await p.waitForTimeout(900);
  check('clicking a rail group scrolls the grid to it', await p.evaluate(() => { const g = document.querySelector('.u-layer [data-u-scroll]'), h = document.getElementById('u-tg-classes'); const d = h.getBoundingClientRect().top - g.getBoundingClientRect().top; return g.scrollTop > 200 && d >= 0 && d < 40; }));
  await p.click('[data-tp-jump="scott"]'); await p.waitForTimeout(900);
  await p.click('[data-tk="scott-ultramarine"]'); await p.waitForTimeout(100);
  check('rail highlights the group of the selected theme', await p.evaluate(() => document.querySelector('.u-layer [data-tp-jump="scott"]').classList.contains('u-on')));
  await p.click('[data-tp-apply]'); await p.waitForTimeout(200);
  lk = await look(p);
  check('Apply saves Scott\u2019s Ultramarine', lk.saved.palette === 'scott-ultramarine' && lk.saved.theme === 'dark' && lk.palette === 'scott-ultramarine', lk);
  check('texture/font/card/motion untouched by the picker', await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('hearth.prefs.v1')); return !x.texture && !x.font && !x.cards && !x.motion; }));
  await ctx.close();
  // ---------- saved themes still load after the regrouping ----------
  const ids = await (async () => { const c = await b.newContext({ serviceWorkers: 'block' }); const q = await c.newPage(); await q.goto(URL); const r = await q.evaluate(() => Object.keys(window.HEARTH_PALETTES)); await c.close(); return r; })();
  const bad = [];
  const cases = ids.map(id => ({ palette: id })).concat([{ palette: '', theme: 'light' }, { palette: '', theme: 'dark' }]);
  const c2 = await b.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' }); const q = await c2.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.goto(URL);
  for (const cs of cases) {
    await q.evaluate((cs) => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done'); const P = window.HEARTH_PALETTES; localStorage.setItem('hearth.prefs.v1', JSON.stringify({ palette: cs.palette, theme: cs.palette ? P[cs.palette].tone : cs.theme })); }, cs);
    await q.reload(); await q.waitForTimeout(350);
    const r = await q.evaluate((cs) => { try { hearthCloseTour(); } catch (e) {} state.ui.homePanel = 'settings'; state.ui.uSetSec = null; render(); document.querySelector('[data-u-act="themes"]').click(); const k = cs.palette || cs.theme; const card = document.querySelector('.u-layer [data-tk="' + k + '"]'); const grp = card && card.closest('.u-cards').previousElementSibling.querySelector('.u-t-label').textContent; const out = { attr: document.documentElement.getAttribute('data-palette'), theme: document.documentElement.getAttribute('data-theme'), checked: card && card.getAttribute('aria-checked'), grp }; document.querySelector('.u-layer [data-u-close="cancel"]').click(); return out; }, cs);
    const want = cs.palette || null;
    if (r.attr !== want || r.checked !== 'true' || (!cs.palette && r.theme !== cs.theme)) bad.push({ cs, r });
    if (cs.palette === 'scales' || cs.palette === 'hollow') { if (r.grp !== 'Races') bad.push({ cs, r, why: 'group' }); }
    if (/^scott/.test(cs.palette)) { if (r.grp !== 'Scott\u2019s themes') bad.push({ cs, r, why: 'group' }); }
  }
  check(`every saved theme (${cases.length}: all palettes + classic Light/Dark) still loads and shows as current in its group`, bad.length === 0 && cases.length === 27, bad.slice(0, 3));
  await c2.close();
  // ---------- phone ----------
  ({ ctx, p } = await open(b, false, { palette: 'hearth' }));
  await p.click('[data-u-act="themes"]'); await p.waitForTimeout(250);
  const ph = await p.evaluate(() => { const s = document.querySelector('.u-layer .u-sheet'), r = s.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), grab: !!s.querySelector('.u-grab'), chips: [...s.querySelectorAll('[data-tp-jump]')].map(x => x.textContent), cols: getComputedStyle(s.querySelector('.u-cards')).gridTemplateColumns.split(' ').length, btnH: [...s.querySelectorAll('[data-tp-foot] .u-btn')].map(x => Math.round(x.getBoundingClientRect().height)) }; });
  check('phone: bottom sheet starting 150px from the top, with a grab handle', ph.top === 150 && ph.bottom === 0 && ph.grab, ph);
  check('phone: group chips Hearth, Places, Classes, Races, Scott\u2019s; 2-column grid; 52px footer buttons', ph.chips.join('|') === 'Hearth|Places|Classes|Races|Scott\u2019s' && ph.cols === 2 && ph.btnH.every(h => h >= 52), ph);
  await p.tap('[data-tk="scott-marine"]'); await p.waitForTimeout(150);
  check('phone: tap previews live', (await look(p)).palette === 'scott-marine');
  check('phone footer: Previewing Scott\u2019s Royal Marine \u00b7 Cancel goes back to Hearth', await p.evaluate(() => /Previewing Scott.s Royal Marine/.test(document.querySelector('[data-tp-foot]').textContent) && /Cancel goes back to Hearth/.test(document.querySelector('[data-tp-foot]').textContent)));
  // swipe down on the header
  await p.evaluate(() => { const s = document.querySelector('.u-layer .u-sheet'), h = s.querySelector('.u-hd'); const mk = (y) => new Touch({ identifier: 1, target: h, clientX: 200, clientY: y }); h.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(200)], changedTouches: [mk(200)] })); h.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [mk(360)], changedTouches: [mk(360)] })); h.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(360)] })); });
  await p.waitForTimeout(200);
  lk = await look(p);
  check('phone: swiping down closes and restores the original', !(await p.$('.u-layer')) && lk.palette === 'hearth' && lk.saved.palette === 'hearth', lk);
  await p.click('[data-u-act="themes"]'); await p.waitForTimeout(200); await p.tap('[data-tk="dark"]'); await p.tap('[data-tp-apply]'); await p.waitForTimeout(200);
  lk = await look(p);
  check('phone: Apply theme saves classic Dark (palette cleared)', lk.saved.palette === '' && lk.saved.theme === 'dark' && lk.palette === null && lk.theme === 'dark', lk);
  check('phone: Settings Theme row reads Dark', await p.evaluate(() => /Theme\s*Dark/.test(document.querySelector('.u-grp').textContent)));
  await ctx.close();
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const f = results.filter(r => !r.ok); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
})();
