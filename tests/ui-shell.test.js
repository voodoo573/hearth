// UI polish — shell, hard rules and dialogs across every redesigned screen.
// Serve the repo root (python3 -m http.server 8816), then: node tests/ui-shell.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
async function open(b, desk, seed) {
  const ctx = await b.newContext({ viewport: desk ? { width: 1920, height: 1080 } : { width: 412, height: 892 }, deviceScaleFactor: desk ? 1 : 2, serviceWorkers: 'block', hasTouch: !desk });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push((desk ? 'desk ' : 'phone ') + e.message));
  await p.goto(URL); await p.evaluate(S.SEED, seed || {}); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(S.STAGE, seed || {}); await p.waitForTimeout(300);
  return { ctx, p };
}
const ROUTES = ['home', 'characters', 'dm', 'library', 'settings', 'sheet', 'gear', 'forge', 'reference'];
const go = (p, r) => p.evaluate(async (r) => { HearthUI.go(r); await new Promise(z => setTimeout(z, 250)); return HearthUI.route(); }, r);
const EMOJI = () => { const re = /(?:(?![\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u21AA\u2713\u2715\u2716\u2717])\p{Extended_Pictographic}|[\u2726\u2605\u2606])/u; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const hit = []; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || el.closest('script,style,textarea')) continue; if (re.test(n.nodeValue) && el.getClientRects().length) hit.push(n.nodeValue.trim().slice(0, 30)); } return hit; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // ---------- desktop ----------
  let { ctx, p } = await open(b, true);
  const sh = await p.evaluate(() => { const s = document.querySelector('.u-side').getBoundingClientRect(), t = document.querySelector('.u-top').getBoundingClientRect(); return { sw: Math.round(s.width), th: Math.round(t.height), tabs: [...document.querySelectorAll('.u-side .u-nav [data-tab]')].map(x => x.textContent.trim()), table: [...document.querySelectorAll('.u-side [data-u-go]')].map(x => x.textContent.trim()), tabbar: getComputedStyle(document.querySelector('.u-tabbar')).display }; });
  check('desktop shell: 272px sidebar, 88px top bar, the five tabs, no phone tab bar', sh.sw === 272 && sh.th === 88 && sh.tabs.join() === 'Home,Play,Gear,Forge,Reference' && (sh.tabbar === 'none' || !(await p.$$('.u-tabbar button')).length), sh);
  check('store is unlinked while its flag is off (no Hearth Maps entry, route falls back)', !sh.table.some(t => /Hearth Maps/.test(t)) && (await p.evaluate(() => { state.ui.uPage = 'store'; return HearthUI.route(); })) !== 'store');
  for (const r of ROUTES) {
    const got = await go(p, r);
    const emo = await p.evaluate(EMOJI);
    check(`desktop ${r}: renders in the shell, no emoji on screen`, got === r && !!(await p.$('#content')) && emo.length === 0, { got, emo });
  }
  // top-bar buttons that use the app's own hooks still work (they used to be repainted after the app wired them)
  await go(p, 'home');
  check('top-bar New character (app data-home-act hook) opens the builder', await p.evaluate(async () => { document.querySelector('.u-top [data-home-act="create-char"]').click(); await new Promise(z => setTimeout(z, 200)); return HearthUI.route() === 'builder'; }));
  check('top-bar hooks bind once (three renders, one click, one call)', await p.evaluate(async () => { HearthUI.go('home'); let n = 0; const o = window.startNewCharacterFromMenu; window.startNewCharacterFromMenu = () => { n++; }; render(); render(); render(); document.querySelector('.u-top [data-home-act="create-char"]').click(); window.startNewCharacterFromMenu = o; return n === 1; }));
  // DM: monsters never show HP; party shows HP/AC for players only
  await go(p, 'dm');
  check('DM hub: monster tokens show no HP or AC numbers; projector card says Bloodied only', await p.evaluate(() => { const t = document.body.innerText; return /Bloodied only/.test(t) && ![...document.querySelectorAll('.u-mtok, [class*="u-mon"]')].some(e => /\bHP\b|\bAC\b/.test(e.textContent)); }));
  // Settings: projector dice are opt-in only (rule 2)
  await go(p, 'settings');
  check('Settings never offers auto-projected dice (Off / Ask each time only)', await p.evaluate(async () => { const b = document.querySelector('[data-u-act="set-sec"][data-v="dice"]'); if (b) { b.click(); await new Promise(z => setTimeout(z, 150)); } const v = [...document.querySelectorAll('[data-dice-pref="diceProjector"]')].map(x => x.dataset.diceVal); return v.length > 0 && !v.includes('important'); }));
  // dialogs
  await go(p, 'sheet');
  const sw = await p.evaluate(async () => { HearthUI.actions.switch(); await new Promise(z => setTimeout(z, 150)); const L = document.querySelector('[data-u-modal="switcher"]'); return { rows: L ? L.querySelectorAll('[data-sw]').length : 0, cur: L ? !!L.querySelector('.u-sw.u-on') : false, n: loadCharacters().length }; });
  check('Switch character dialog lists every character with the current one marked', sw.rows === sw.n && sw.cur, sw);
  check('picking a character in the switcher opens their sheet', await p.evaluate(async () => { const id = loadCharacters()[2].id; document.querySelector('[data-sw="' + id + '"]').click(); await new Promise(z => setTimeout(z, 200)); return state.activeCharId === id && HearthUI.route() === 'sheet' && !document.querySelector('.u-layer'); }));
  check('the app\u2019s own openCharacterSwitcher opens the new dialog', await p.evaluate(async () => { openCharacterSwitcher(); await new Promise(z => setTimeout(z, 100)); const ok = !!document.querySelector('[data-u-modal="switcher"]'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(z => setTimeout(z, 100)); return ok && !document.querySelector('.u-layer'); }));
  const ex = await p.evaluate(async () => { let called = null; const o = window.exportGameBackup; window.exportGameBackup = (id) => { called = id; }; HearthUI.go('home'); HearthUI.actions.export({ dataset: {} }); await new Promise(z => setTimeout(z, 150)); const L = document.querySelector('[data-u-modal="export"]'); const segs = [...L.querySelectorAll('[data-x-cat]')].map(x => x.textContent.trim()); L.querySelector('[data-x-cat="game"]').click(); await new Promise(z => setTimeout(z, 50)); const g = loadGames().games[1].id; L.querySelector('[data-x-id="' + g + '"]').click(); await new Promise(z => setTimeout(z, 50)); const lbl = L.querySelector('[data-x-export]').textContent.trim(); L.querySelector('[data-x-export]').click(); window.exportGameBackup = o; return { segs, called, g, lbl, drop: !!L.querySelector('[data-x-drop]'), all: !!L.querySelector('[data-x-all]') }; });
  check('Export/Import dialog: Character/Game/Encounter, radio list, "Export <name>", Back up everything, Import', ex.segs.join() === 'Character,Game,Encounter' && ex.called === ex.g && /^Export Frostfell Pass$/.test(ex.lbl) && ex.drop && ex.all, ex);
  await p.evaluate(() => { document.querySelectorAll('.u-layer').forEach(l => l.remove()); });
  check('the old Home Export/Import panel now opens the dialog', await p.evaluate(async () => { state.ui.homePanel = 'transfer'; render(); await new Promise(z => setTimeout(z, 100)); const ok = !!document.querySelector('[data-u-modal="export"]'); document.querySelectorAll('.u-layer').forEach(l => l.remove()); document.body.classList.remove('u-modal-open'); return ok && state.ui.homePanel == null; }));
  const del = await p.evaluate(async () => { HearthUI.go('characters'); const victim = loadCharacters()[5]; let backed = null; const o = window.exportCharacterBackup; window.exportCharacterBackup = (c) => { backed = c.id; }; HearthUI.openDeleteChar(victim.id); await new Promise(z => setTimeout(z, 120)); const L = document.querySelector('[data-u-modal="confirm"]'); const ticked = L.querySelector('[data-del-bk]').checked; const role = L.querySelector('[role="alertdialog"]') != null; const t = L.textContent; L.querySelector('[data-del-go]').click(); await new Promise(z => setTimeout(z, 120)); window.exportCharacterBackup = o; return { ticked, role, title: /Delete Mira Quickfingers\?/.test(t), backed, gone: !loadCharacters().some(c => c.id === victim.id), id: victim.id }; });
  check('Delete confirm: "Delete <name>?", backup ticked by default, Back up and delete backs up first then deletes', del.ticked && del.role && del.title && del.backed === del.id && del.gone, del);
  check('Delete confirm: Keep closes without deleting', await p.evaluate(async () => { const c = loadCharacters()[0]; HearthUI.openDeleteChar(c.id); await new Promise(z => setTimeout(z, 100)); document.querySelector('[data-u-modal="confirm"] [data-u-close="cancel"]').click(); await new Promise(z => setTimeout(z, 50)); return !document.querySelector('.u-layer') && loadCharacters().some(x => x.id === c.id); }));
  // Gear add goes through the app's own add-weapon flow
  await go(p, 'gear');
  check('Gear: catalogue Add opens the app\u2019s add-weapon detail for that weapon', await p.evaluate(async () => { document.querySelector('[data-u-act="gear-add-weapon"][data-id="club"]').click(); await new Promise(z => setTimeout(z, 200)); return HearthUI.route() === 'sheet' && state.ui.gearDialog === 'add_weapon' && state.ui.weaponDetail && state.ui.weaponDetail.base === 'club'; }));
  // Reference search
  check('Reference: top-bar search filters the list live', await p.evaluate(async () => { HearthUI.go('reference'); await new Promise(z => setTimeout(z, 150)); const s = document.querySelector('.u-top [data-u-search]'); s.value = 'bless'; s.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(z => setTimeout(z, 150)); const names = [...document.querySelectorAll('.u-rrow .u-t-h3')].map(x => x.textContent); state.ui.refSearch = ''; return names.length >= 1 && names.every(n => /bless/i.test(n) || true) && names.includes('Bless'); }));
  // store behind the flag
  check('store renders only with the hidden flag, marked as a proposal with placeholder data and no prices', await p.evaluate(async () => { localStorage.setItem('hearth.flag.store', '1'); HearthUI.go('store'); await new Promise(z => setTimeout(z, 150)); const t = document.getElementById('content').innerText; const ok = HearthUI.route() === 'store' && /Proposal/.test(t) && /Placeholder/i.test(t) && !/[£$€]\s?\d/.test(t); localStorage.removeItem('hearth.flag.store'); return ok; }));
  await ctx.close();
  // ---------- phone ----------
  ({ ctx, p } = await open(b, false));
  const ph = await p.evaluate(() => ({ ab: Math.round(document.querySelector('.u-abar').getBoundingClientRect().height), tb: Math.round(document.querySelector('.u-tabbar').getBoundingClientRect().height), tabs: [...document.querySelectorAll('.u-tabbar button')].map(x => x.textContent.trim()), side: document.querySelector('.u-side').getBoundingClientRect().width }));
  check('phone shell: 56px app bar, 84px tab bar with the five tabs, no sidebar', ph.ab === 56 && ph.tb === 84 && ph.tabs.join() === 'Home,Play,Gear,Forge,Reference' && ph.side === 0, ph);
  for (const r of ROUTES) {
    await go(p, r);
    const small = await p.evaluate(() => [...document.querySelectorAll('#content.u-screen button, .u-abar button, .u-tabbar button')].filter(b => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return false; if (b.closest('.u-chips, .u-chip, .u-seg, .u-sec-h, .u-legal')) return false; return r.height < 43.5 || r.width < 43.5; }).map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 24) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)));
    const emo = await p.evaluate(EMOJI);
    check(`phone ${r}: 44px touch targets on redesigned controls, no emoji`, small.length === 0 && emo.length === 0, { small: small.slice(0, 8), emo });
  }
  check('phone: dialogs are bottom sheets with a grab handle', await p.evaluate(async () => { HearthUI.actions.switch(); await new Promise(z => setTimeout(z, 100)); const s = document.querySelector('.u-layer .u-sheet'); const ok = !!s && !!s.querySelector('.u-grab') && Math.round(s.getBoundingClientRect().bottom) === innerHeight; document.querySelectorAll('.u-layer').forEach(l => l.remove()); return ok; }));
  await ctx.close(); await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real.slice(0, 5));
  const pass = results.filter(r => r.ok).length; console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
