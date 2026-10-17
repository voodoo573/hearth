// v1.7.1 — Galaxy Fold / tablet / phone battle map (Tom): the AoE templates control is in the header and the
// More menu on every layout, Settings is in the More menu, and with edge-to-edge insets (status bar, nav bar /
// Fold taskbar) nothing sits under the system bars, on the battle map or in the phone shell.
// node tests/c2-fold.test.js 8816 [shotDir]
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const C2 = require('./c2-stage.js'); const S = require('./ui-seed.js');
const PORT = process.argv[2] || '8816', SHOTS = process.argv[3] || '';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 600) : '')); }
const INS = { top: 24, bottom: 48 };
const setIns = (o) => { const r = document.documentElement.style; r.setProperty('--hearth-native-top', o.top + 'px'); r.setProperty('--hearth-native-bottom', o.bottom + 'px'); };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[773, 1024], [1024, 773], [412, 915], [360, 800]]) {
    const tag = `${w}x${h}:`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(C2.SEED); await p.reload(); await p.waitForTimeout(700);
    await p.waitForFunction(() => window.HearthMI && window.HearthC2, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(C2.STAGE, { turn: 'Ranger' }); await p.waitForTimeout(900);
    await p.evaluate(() => { state.ui.c2Card = null; render(); }); await p.waitForTimeout(400);
    const lay = await p.evaluate(() => document.querySelector('.c2').classList.contains('c2-desk') ? 'desk' : 'phone');
    check(tag + ' layout follows width (' + (w >= 900 ? 'desk' : 'phone') + ')', lay === (w >= 900 ? 'desk' : 'phone'), lay);
    const M = () => { const q = s => document.querySelector(s), R = n => n && n.getBoundingClientRect();
      const a = q('.c2-top .c2-aoe-btn'), ar = R(a), top = R(q('.c2-top')), fab = R(q('.c2-fab'));
      const hit = a && document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2);
      const btns = [...document.querySelectorAll('.c2-top > button, .c2-top > a')].filter(n => n.getBoundingClientRect().width).map(n => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
      return { aoe: ar && { w: ar.width, h: ar.height, l: ar.left, r: ar.right, t: ar.top, onTop: !!(hit && a.contains(hit)), txt: a.textContent.trim() }, top: top && { t: top.top, b: top.bottom }, fab: fab && { t: fab.top, b: fab.bottom, r: fab.right },
        fits: btns.every(x => x.l >= 0 && x.r <= innerWidth + .5 && top && x.t >= top.top - .5 && x.b <= top.bottom + .5), ih: innerHeight, iw: innerWidth }; };
    let m = await p.evaluate(M);
    check(tag + ' AoE button in the header, 44px, on top', m.aoe && m.aoe.h >= 44 && m.aoe.w >= 44 && m.aoe.onTop && m.aoe.r <= m.iw, m.aoe);
    check(tag + ' header buttons fit on one line', m.fits, m);
    // edge-to-edge: status bar 24px, nav bar / taskbar 48px
    await p.evaluate(setIns, INS); await p.waitForTimeout(200);
    m = await p.evaluate(M);
    check(tag + ' insets: header below the status bar', m.top.t >= INS.top - .5, m.top);
    check(tag + ' insets: tools button above the nav bar / taskbar', m.fab && m.fab.b <= m.ih - INS.bottom + .5, m.fab);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/c2-${w}x${h}.png` });
    await p.click('.c2-top .c2-aoe-btn'); await p.waitForTimeout(400);
    const open = await p.evaluate(() => !!(HearthMI.aoeOpen() && document.querySelector('.mi-afan')));
    check(tag + ' AoE button opens the templates', open);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/c2-${w}x${h}-templates.png` });
    const pressed = await p.evaluate(() => document.querySelector('.c2-top .c2-aoe-btn').getAttribute('aria-pressed'));
    check(tag + ' AoE button shows it is on', pressed === 'true', pressed);
    await p.evaluate(() => { state.ui.miAoe = null; render(); }); await p.waitForTimeout(300);
    await p.click('[data-c2-more]'); await p.waitForTimeout(300);
    const menu = await p.evaluate(() => { const items = [...document.querySelectorAll('.c2-more.open .c2-mi')].filter(n => n.getBoundingClientRect().height); return items.map(n => n.textContent.trim()); });
    check(tag + ' More menu has Area templates (AoE) and Settings', menu.some(t => /Area templates/.test(t)) && menu.includes('Settings'), menu);
    await p.evaluate(() => { const s = document.querySelector('.c2-more [data-c2-settings]'); s.scrollIntoView({ block: 'nearest' }); }); await p.waitForTimeout(100);
    await p.click('.c2-more [data-c2-settings]'); await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ r: HearthUI.route(), c2: !!document.querySelector('.c2') }));
    check(tag + ' More > Settings opens Settings', st.r === 'settings' && !st.c2, st);
    await ctx.close();
  }
  // phone shell with insets: app bar and tab bar clear of the system bars
  for (const [w, h] of [[773, 1024], [412, 915], [360, 800]]) {
    const tag = `shell ${w}x${h}:`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(() => HearthUI.go('home')); await p.waitForTimeout(300);
    await p.evaluate(setIns, INS); await p.waitForTimeout(200);
    const m = await p.evaluate(() => { const ab = document.querySelector('.u-abar'), kids = [...ab.children].map(n => n.getBoundingClientRect()).filter(r => r.height);
      const labels = [...document.querySelectorAll('.u-tabbar button span')].map(n => n.getBoundingClientRect());
      return { abTop: Math.min(...kids.map(r => r.top)), lblBottom: Math.max(...labels.map(r => r.bottom)), ih: innerHeight, n: labels.length }; });
    check(tag + ' app bar content below the status bar', m.abTop >= 24, m);
    check(tag + ' tab bar labels above the nav bar', m.n === 5 && m.lblBottom <= m.ih - 48, m);
    if (SHOTS && w === 773) await p.screenshot({ path: `${SHOTS}/home-${w}x${h}-insets.png` });
    // builder has no tab bar: Settings is a gear in the app bar
    
    await ctx.close();
  }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
