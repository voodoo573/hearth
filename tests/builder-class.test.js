// UI polish — builder class step (Jenny's builder-desk / builder-phone, release-review FIXES.md item 3).
// node tests/builder-class.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 600) : '')); }
const TO_CLASS = async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  startNewCharacterFromMenu(); await W(300);
  const n = document.getElementById('nameInput'); n.value = 'Aria'; n.dispatchEvent(new Event('input', { bubbles: true }));
  for (let i = 0; i < 2; i++) { document.getElementById('nextBtn').click(); await W(200); const r = document.querySelector('[data-race]'); if (r && !state.draft.race) { r.click(); await W(200); } }
  document.querySelector('[data-class=paladin]').click(); await W(400);
};
const READ = () => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'; };
  const cards = [...document.querySelectorAll('#content [data-class]')];
  const shown = cards.filter(vis);
  const pal = document.querySelector('#content [data-class=paladin]');
  const next = document.getElementById('nextBtn'), back = document.getElementById('backBtn'), cancel = document.getElementById('cancelBtn');
  const small = [...document.querySelectorAll('#content button, .u-abar button, .u-top button')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(b => (b.textContent.trim() || b.getAttribute('aria-label') || b.className).slice(0, 30));
  const overflowX = document.documentElement.scrollWidth > innerWidth + 1;
  const clip = shown.filter(c => { const h = c.querySelector('.u-t-h3'); return h && h.scrollWidth > h.clientWidth + 1; }).map(c => c.dataset.class);
  return {
    cards: cards.length, shown: shown.length, icons: shown.filter(c => c.querySelector('.u-lead svg')).length,
    roles: cards.filter(c => (c.querySelector('.u-brole') || {}).textContent).length,
    dots: cards.filter(c => c.querySelectorAll('.u-pips i, .u-bcx i').length >= 3).length,
    palRole: pal && (pal.querySelector('.u-brole') || {}).textContent, palSel: pal && pal.classList.contains('selected'),
    chips: [...document.querySelectorAll('#content .u-bchips [data-u-act="build-filter"]')].map(x => x.textContent.trim()),
    next: next && vis(next) ? next.textContent.trim() : null, back: !!back && vis(back), cancelVisible: vis(cancel),
    stepTip: [...document.querySelectorAll('#content .step-tip, #content .builder-hint')].filter(vis).length,
    title: (document.querySelector('#content .u-bct') || {}).textContent, small, overflowX, clip,
    menuBtn: [...document.querySelectorAll('[data-u-act="build-menu"]')].filter(vis).length,
    tabs: vis(document.querySelector('.u-tabbar')), emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.getElementById('content').textContent),
    detail: (document.querySelector('#content .u-bdet') || {}).textContent || '',
  };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [412, 892], [360, 780]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {}); await p.evaluate(TO_CLASS);
    const tag = `${w}px:`, desk = w >= 1280;
    const m = await p.evaluate(READ);
    check(tag + ' 12 class cards, each with an icon', m.cards === 12 && m.icons === 12, m);
    check(tag + ' role line and complexity dots on every card', m.roles === 12 && m.dots === 12, m);
    check(tag + ' paladin selected with its role line', m.palSel && /Holy warrior/.test(m.palRole || ''), m);
    check(tag + ' filter chips All 12 / Martial / Spellcasters / Half-casters', ['All 12', 'Martial', 'Spellcasters', 'Half-casters'].every(x => m.chips.includes(x)), m.chips);
    check(tag + ' footer: Back + "Next: Background"', m.back && m.next === 'Next: Background', m);
    check(tag + ' no full-width discard bar', !m.cancelVisible, m);
    check(tag + ' no duplicate intro banner above the step', m.stepTip === 0, m.stepTip);
    check(tag + ' "Choose a class" heading', m.title === 'Choose a class', m.title);
    check(tag + ' builder menu button present', m.menuBtn >= 1, m.menuBtn);
    check(tag + ' no horizontal page overflow, no clipped class names', !m.overflowX && m.clip.length === 0, m);
    check(tag + ' no emoji', !m.emoji);
    if (!desk) {
      check(tag + ' 44px touch targets', m.small.length === 0, m.small);
      check(tag + ' tab bar hidden while building', !m.tabs);
    } else check(tag + ' detail panel shows subclass list and tip', /Sacred Oath/.test(m.detail) && /Good first pick/.test(m.detail), m.detail.slice(0, 300));
    // filters
    await p.click('#content [data-u-act="build-filter"][data-v="martial"]'); await p.waitForTimeout(200);
    let f = await p.evaluate(READ);
    check(tag + ' Martial filter shows barbarian/fighter/monk/rogue', f.shown === 4, f.shown);
    await p.click('#content [data-u-act="build-filter"][data-v="casters"]'); await p.waitForTimeout(200);
    f = await p.evaluate(READ);
    check(tag + ' Spellcasters filter narrows the list', f.shown > 0 && f.shown < 12 && f.palSel !== undefined, f.shown);
    await p.click('#content [data-u-act="build-filter"][data-v="all"]'); await p.waitForTimeout(200);
    f = await p.evaluate(READ);
    check(tag + ' All restores 12', f.shown === 12, f.shown);
    // discard via menu
    await p.evaluate(() => { window.__cancel = 0; document.getElementById('cancelBtn').addEventListener('click', () => window.__cancel++, true); });
    await p.click('[data-u-act="build-menu"] >> visible=true'); await p.waitForTimeout(250);
    const menu = await p.evaluate(() => [...document.querySelectorAll('.u-csdlg button, [data-u-act="build-discard"]')].map(x => x.textContent.trim()));
    check(tag + ' menu offers Discard character', menu.some(x => /Discard character/i.test(x)), menu);
    await p.evaluate(() => { const o = window.confirm; window.confirm = () => false; window.__oc = o; });
    await p.click('[data-u-act="build-discard"]'); await p.waitForTimeout(300);
    const disc = await p.evaluate(() => window.__cancel);
    check(tag + ' Discard in the menu runs the app cancel action', disc === 1, disc);
    await p.evaluate(() => { document.querySelectorAll('.u-hc-confirm .u-btn, .hearth-confirm button').forEach(() => {}); });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // next/back still work
    const st = await p.evaluate(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); if (state.tab !== 'build') return 'left'; const a = state.wizardStep; document.getElementById('nextBtn').click(); await W(300); const b = state.wizardStep; document.getElementById('backBtn').click(); await W(300); return [a, b, state.wizardStep]; });
    check(tag + ' Next advances, Back returns', Array.isArray(st) && st[1] > st[0] && st[2] === st[0], st);
    await ctx.close();
  }
  await b.close();
  check('no page errors', errs.length === 0, errs);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
