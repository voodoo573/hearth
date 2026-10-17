// UI polish — character sheet built to Jenny's sheet-desk / sheet-phone mockups (release-review FIXES.md item 1).
// Layout, the listed bugs, every theme, and that the new controls still drive the app's own code.
// node tests/sheet-ui.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 600) : '')); }
const LAYOUT = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return 0; const [r, g, b] = m.slice(0, 3).map(v => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = (el) => { for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.backgroundImage !== 'none' && !/gradient\(.*transparent/.test(cs.backgroundImage)) return null; const c = cs.backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(0,0,0)'; };
  const contrast = (el) => { const bg = bgOf(el); if (!bg) return 99; const a = lum(getComputedStyle(el).color), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  const root = document.querySelector('#content .u-cs'); if (!root) return { none: true };
  const phone = document.body.classList.contains('u-phone');
  const tabs = [...root.querySelectorAll('.u-cs-tabs > button')].map(b => b.textContent.trim());
  const econ = [...root.querySelectorAll('.u-cs-econ > button')].map(b => b.textContent.trim());
  const abx = [...root.querySelectorAll('.u-cs-abx')].filter(vis);
  const abCard = root.querySelector('.u-cs-abil');
  let touch = []; if (abCard) { const c = abCard.getBoundingClientRect(); abx.forEach(x => { const r = x.getBoundingClientRect(); if (r.left - c.left < 8 || c.right - r.right < 8) touch.push(Math.round(r.left - c.left)); }); }
  const abCols = new Set(abx.map(x => Math.round(x.getBoundingClientRect().left))).size;
  const abBg = abx.map(x => lum(getComputedStyle(x).backgroundColor));
  const svC = [...root.querySelectorAll('.u-cs-sv')].map(contrast);
  const res = [...root.querySelectorAll('.u-cs-resi .resource-name')].map(e => e.textContent.trim());
  const visibleApp = ['.play-top', '.hp-quickstep', '.vitals', '.skills-under-stats-btn', '.play-name'].filter(s => [...document.querySelectorAll('#content ' + s)].some(vis));
  const names = [...document.querySelectorAll('.u-abar *, #content *')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && /Sir Oswin/.test(n.nodeValue))).length;
  const heal = [...root.querySelectorAll('[data-u-act="cs-hp"]')].map(b => ({ h: Math.round(b.getBoundingClientRect().height), wrap: b.scrollWidth > b.clientWidth + 1 || b.querySelector('span').getClientRects().length > 1 }));
  const small = phone ? [...root.querySelectorAll('button, [role=button]')].filter(vis).filter(b => b.getBoundingClientRect().height < 43.5 && !b.closest('.u-cs-skl') || (b.closest('.u-cs-skl') && b.getBoundingClientRect().height < 43.5)).map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24) + ':' + Math.round(b.getBoundingClientRect().height)) : [];
  const stars = /[\u2605\u2606]/.test(root.innerText);
  const skillsLink = [...root.querySelectorAll('.u-sec-link')].filter(e => /Edit/.test(e.textContent)).map(contrast)[0];
  const over = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  const cols = [...root.querySelectorAll('.u-cs-g > *')].map(e => Math.round(e.getBoundingClientRect().left));
  return { tabs, econ, abN: abx.length, abCols, touch, abBg, svC, res, visibleApp, names, heal, small, stars, skillsLink, over, smite: !!root.querySelector('.u-cs-smite'), hp: !!root.querySelector('.u-cs-hp'), cols, phone };
};
async function open(b, w, h, pal) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, pal ? { palette: pal } : {}); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(S.STAGE, {}); await p.evaluate(() => HearthUI.go('sheet')); await p.waitForTimeout(400);
  return { p, ctx };
}
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const pal of ['', 'scott-ultramarine', 'arcane']) {
    for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [412, 892], [360, 780]]) {
      const { p, ctx } = await open(b, w, h, pal);
      const m = await p.evaluate(LAYOUT); const tag = `${pal || 'hearth'} ${w}px:`;
      if (m.none) { check(tag + ' new sheet renders', false, m); await ctx.close(); continue; }
      check(tag + ' HP card with Damage / amount / Heal, no duplicate -/+ quick-step', m.hp && m.heal.length === 2 && m.visibleApp.length === 0, m.visibleApp);
      check(tag + ' tabs ' + (m.phone ? 'Actions/Spells/Stats/Gear' : 'Actions/Spells/Features/Inventory/Notes'), JSON.stringify(m.tabs) === JSON.stringify(m.phone ? ['Actions', 'Spells', 'Stats', 'Gear'] : ['Actions', 'Spells', 'Features', 'Inventory', 'Notes']), m.tabs);
      check(tag + ' Action / Bonus / Reaction filter pills', m.econ.length === 3 && /^Action$/.test(m.econ[0]) && /^Reaction$/.test(m.econ[2]), m.econ);
      check(tag + ' Divine Smite strip', m.smite);
      if (!m.phone) {
        check(tag + ' resources: Lay on Hands, Channel Divinity, Divine Sense', ['Lay on Hands', 'Channel Divinity', 'Divine Sense'].every(n => m.res.some(r => r.indexOf(n) === 0)), m.res);
        check(tag + ' abilities & saves in a 3x2 grid', m.abN === 6 && m.abCols === 3, { n: m.abN, c: m.abCols });
        check(tag + ' ability cells keep clear of the card frame', m.touch.length === 0, m.touch);
        check(tag + ' columns side by side (no stacking at desktop)', new Set(m.cols).size >= 2, m.cols);
      } else {
        check(tag + ' character name shows once (app bar only)', m.names === 1, m.names);
        check(tag + ' Damage / Heal stay on one line', m.heal.every(x => !x.wrap && x.h <= 48), m.heal);
        check(tag + ' every visible sheet control is a 44px target', m.small.length === 0, m.small);
      }
      check(tag + ' ability cells are dark wells, not light slabs', m.abN === 0 || m.abBg.every(l => l < 0.35), m.abBg);
      check(tag + ' save pills readable (contrast >= 3)', m.svC.every(c => c >= 3), m.svC);
      check(tag + ' Skills "Edit" link readable', m.skillsLink === undefined || m.skillsLink >= 3, m.skillsLink);
      check(tag + ' no star glyphs, no sideways scroll', !m.stars && !m.over, { stars: m.stars, over: m.over });
      await ctx.close();
    }
  }
  // ---- behaviour (desk + phone) ----
  for (const [w, h] of [[1440, 900], [412, 892]]) {
    const { p, ctx } = await open(b, w, h); const tag = `${w}px:`;
    const hp = () => p.evaluate(() => getCharacter(state.activeCharId).currentHp);
    const h0 = await hp();
    await p.fill('[data-cs-amt]', '5'); await p.click('[data-u-act="cs-hp"][data-v="damage"]'); await p.waitForTimeout(200);
    const h1 = await hp();
    await p.fill('[data-cs-amt]', '3'); await p.click('[data-u-act="cs-hp"][data-v="heal"]'); await p.waitForTimeout(200);
    const h2 = await hp();
    check(tag + ' Damage 5 then Heal 3 go through the app', h1 === h0 - 5 && h2 === h1 + 3, [h0, h1, h2]);
    check(tag + ' HP card shows the new value', (await p.textContent('.u-cs-hpbig b')).trim() === String(h2));
    await p.click('.u-cs-econ > button:nth-child(2)'); await p.waitForTimeout(200);
    check(tag + ' Bonus pill switches the app to its bonus tab', await p.evaluate(() => state.ui.actionTab) === 'bonus');
    await p.click('.u-cs-tabs > button:nth-child(2)'); await p.waitForTimeout(200);
    check(tag + ' Spells tab', await p.evaluate(() => state.ui.actionTab === 'spells' && !!document.querySelector('.u-cs [data-cast]')));
    await p.click('.u-cs-tabs > button:nth-child(1)'); await p.waitForTimeout(200);
    check(tag + ' Actions tab', await p.evaluate(() => state.ui.actionTab === 'actions' && !!document.querySelector('.u-cs .u-cs-roll')));
    await p.click('.u-cs-roll.u-hit'); await p.waitForTimeout(500);
    check(tag + ' to-hit chip starts the app attack roll', await p.evaluate(() => !!document.querySelector('.roll-dialog, .roll-outcome-dialog')));
    await p.keyboard.press('Escape'); await p.evaluate(() => { document.querySelectorAll('.dialog-backdrop').forEach(d => d.remove()); state.ui.rollOutcome = null; render(); }); await p.waitForTimeout(300);
    if (w < 1000) { await p.click('.u-cs-tabs > button:nth-child(3)'); await p.waitForTimeout(250); }
    await p.click('[data-u-act="cs-cond"]'); await p.waitForTimeout(200);
    const condOk = await p.evaluate(() => !!document.querySelector('[data-u-modal="cs-cond"] [data-v*="poisoned"]'));
    await p.click('[data-u-modal="cs-cond"] [data-v*="poisoned"]'); await p.waitForTimeout(300);
    const dlg = await p.$('#condToggleBtn'); if (dlg) { await dlg.click(); await p.waitForTimeout(300); }
    check(tag + ' Add condition → app condition dialog → Poisoned applied and shown', condOk && !!dlg && await p.evaluate(() => getCharacter(state.activeCharId).conditions.includes('poisoned') && [...document.querySelectorAll('.u-cs-cond .u-chip.u-on')].some(c => /Poisoned/.test(c.textContent))));
    const menuSel = w > 1000 ? '.u-top [data-u-act="cs-menu"]' : '.u-abar [data-u-act="cs-menu"]';
    await p.click(menuSel); await p.waitForTimeout(200);
    const items = await p.$$eval('[data-u-modal="cs-menu"] .u-cs-mrow', r => r.map(x => x.textContent.trim()));
    check(tag + ' sheet menu keeps every old header/menu action reachable', ['Notes', 'Roll log', 'Switch character', 'New character', 'Export this character', 'Import a character', 'Back up everything', 'Restore everything', 'How Hearth works', 'Delete character', 'Change portrait'].every(n => items.includes(n)), items);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    if (w < 1000) {
      check(tag + ' Stats tab: abilities, skills, conditions, rests', await p.evaluate(() => document.querySelectorAll('.u-cs-abx').length === 6 && !!document.querySelector('.u-cs-skl') && !!document.querySelector('.u-cs-cond') && !!document.querySelector('[data-u-act="sheet-rest"]')));
      await p.click('.u-cs-tabs > button:nth-child(4)'); await p.waitForTimeout(300);
      check(tag + ' Gear tab opens the Gear screen', await p.evaluate(() => HearthUI.route() === 'gear'));
    } else {
      await p.click('.u-cs-tabs > button:nth-child(4)'); await p.waitForTimeout(300);
      check(tag + ' Inventory tab opens the Gear screen', await p.evaluate(() => HearthUI.route() === 'gear'));
    }
    await ctx.close();
  }
  check('no page errors', errs.length === 0, errs);
  await b.close();
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
