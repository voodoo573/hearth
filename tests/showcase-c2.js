// Hearth v1.7.0 — clean C2 screenshots (staged scene, no toasts). node tests/showcase-c2.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const OUT = process.env.SHOTS || '/workspace/dm-c2/shots/';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const errs = [];
async function page(b, w, h, dpr, stage, touch) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, serviceWorkers: 'block', hasTouch: !!touch });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.waitForFunction(() => window.HearthMI && window.HearthFogLib && window.HearthC2, null, { timeout: 10000 }).catch(async () => { await p.reload(); await p.waitForTimeout(1500); });
  await p.evaluate(S.STAGE, stage || {}); await p.waitForTimeout(1600);
  return { ctx, p };
}
const clean = p => p.evaluate(() => document.querySelectorAll('.toast, #toast, .hearth-toast').forEach(t => t.remove()));
async function shot(p, name) { if (ONLY && !ONLY.test(name)) return; await clean(p); await p.waitForTimeout(250); await p.screenshot({ path: OUT + name }); console.log('shot', name); }
const scrollCard = (p, re) => p.evaluate((src) => { const re = new RegExp(src); const body = document.querySelector('.c2-sbbody'); const sec = [...body.querySelectorAll('.c2-sec')].find(s => re.test(s.querySelector('.c2-sech').textContent)); if (sec) body.scrollTop = sec.offsetTop - body.offsetTop - 4; }, re.source);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // desktop, dragon's turn with Fire Breath placed
  for (const pal of ['hearth', 'arcane', 'scott-ultramarine']) {
    const { ctx, p } = await page(b, 1440, 900);
    if (pal !== 'hearth') await p.evaluate((pal) => { document.documentElement.setAttribute('data-palette', pal); render(); }, pal);
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); });
    await p.waitForTimeout(900); await scrollCard(p, /Actions/);
    await shot(p, `c2-desk-dragon-turn${pal === 'hearth' ? '' : '-' + pal}.png`);
    await ctx.close();
  }
  { const { ctx, p } = await page(b, 1440, 900, 1, { turn: 'Ranger' });
    await shot(p, 'c2-desk-ranger-turn.png');
    await p.click('[data-c2-fab]'); await p.waitForTimeout(450); await shot(p, 'c2-desk-fan.png');
    await p.evaluate(() => { state.ui.c2Fan = false; state.ui.c2More = true; render(); }); await p.waitForTimeout(400);
    await shot(p, 'c2-desk-more.png');
    await ctx.close(); }
  // phone
  { const { ctx, p } = await page(b, 412, 880, 2, { turn: 'Ranger' });
    await shot(p, 'c2-phone.png');
    await p.click('[data-c2-fab]'); await p.waitForTimeout(450); await shot(p, 'c2-phone-fan.png');
    await ctx.close(); }
  { const { ctx, p } = await page(b, 412, 880, 2);
    await shot(p, 'c2-phone-sheet.png');
    await scrollCard(p, /Actions/); await p.waitForTimeout(200); await shot(p, 'c2-phone-sheet-actions.png');
    await ctx.close(); }
  // ---------- map interactions (Jenny's map-interactions spec) ----------
  const cellPt = (p, x, y) => p.evaluate(([x, y]) => { const g = document.getElementById('dmMapGrid').getBoundingClientRect(), z = state.ui.dmMapZoom || 1; return { x: g.left + x * 34 * z, y: g.top + y * 34 * z }; }, [x, y]);
  const tokPt = (p, n) => p.evaluate((n) => { const id = loadEncounter().combatants.find(c => c.name === n).id; const r = document.querySelector(`[data-map-token="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, n);
  const glide = async (p, a, c, n) => { for (let i = 1; i <= n; i++) { await p.mouse.move(a.x + (c.x - a.x) * i / n, a.y + (c.y - a.y) * i / n); await p.waitForTimeout(25); } };
  const touchOf = async (p) => { const c = await p.context().newCDPSession(p); return (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] }); };
  const tglide = async (p, T, a, c, n) => { await T('touchStart', a.x, a.y); for (let i = 1; i <= n; i++) { await T('touchMove', a.x + (c.x - a.x) * i / n, a.y + (c.y - a.y) * i / n); await p.waitForTimeout(30); } };
  const projOpen = async (p) => { const [pop] = await Promise.all([p.context().waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]); pop.on('pageerror', e => errs.push('projector: ' + e.message)); await pop.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(500); await p.evaluate(() => broadcastMap(loadEncounter())); await pop.waitForTimeout(2500); return pop; };
  const pshot = async (pop, name) => { if (ONLY && !ONLY.test(name)) return; await pop.screenshot({ path: OUT + name }); console.log('shot', name); };
  const placeCone = (p) => p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); });
  const bare = (p) => p.evaluate(() => { state.ui.c2Card = null; const e = loadEncounter(); e.aoes = []; saveEncounter(e); render(); });
  // templates: aiming the dragon's cone with the circle and a cube on the board
  for (const pal of ['hearth', 'arcane', 'scott-ultramarine']) {
    const { ctx, p } = await page(b, 1440, 900);
    if (pal !== 'hearth') await p.evaluate((pal) => { document.documentElement.setAttribute('data-palette', pal); render(); }, pal);
    await p.evaluate(() => { const e = loadEncounter(); e.aoes.push({ id: 'aoe_cube', kind: 'square', x: 16, y: 2, len: 3, angle: 0, color: '#c0392b', pinned: false }); saveEncounter(e); render(); });
    await placeCone(p); await p.waitForTimeout(300);
    await p.evaluate(() => { state.ui.c2Card = null; render(); }); await p.waitForTimeout(1100);
    await shot(p, `tmpl-desk${pal === 'hearth' ? '' : '-' + pal}.png`);
    await ctx.close();
  }
  { const { ctx, p } = await page(b, 412, 880, 2, undefined, true);
    await placeCone(p); await p.waitForTimeout(1200); await shot(p, 'tmpl-phone.png');
    await ctx.close(); }
  { const { ctx, p } = await page(b, 1440, 900);
    await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) if (!(x >= 13 && y >= 7)) e.fog.revealed.push(x + ',' + y); saveEncounter(e); render(); });
    await placeCone(p); await p.waitForTimeout(600);
    const pop = await projOpen(p); await pshot(pop, 'tmpl-projector.png');
    await ctx.close(); }
  // token movement: Ranger wading the river (difficult terrain), then the undo toast; phone drag with the cancel zone
  { const { ctx, p } = await page(b, 1440, 900);
    await p.evaluate(() => { const e = loadEncounter(); e.mapId = 'river'; e.aoes = []; saveEncounter(e); state.ui.c2Card = null; state.ui.dmMapZoomInit = false; render(); }); await p.waitForTimeout(2600);
    const r = await tokPt(p, 'Ranger'), t = await cellPt(p, 5.5, 6.5);
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await glide(p, r, t, 10); await p.waitForTimeout(150);
    await shot(p, 'move-desk.png');
    await p.mouse.up(); await p.waitForTimeout(450); await shot(p, 'move-desk-undo.png');
    await ctx.close(); }
  { const { ctx, p } = await page(b, 1440, 900);
    await bare(p); await p.waitForTimeout(500);
    const og = await tokPt(p, 'Ogre'), t = await cellPt(p, 9.5, 9.5), t2 = await cellPt(p, 12.5, 8.5);
    await p.mouse.move(og.x, og.y); await p.mouse.down(); await glide(p, og, t, 10); await p.waitForTimeout(500); await glide(p, t, t2, 8); await p.waitForTimeout(200);
    await shot(p, 'move-desk-waypoint.png'); await p.mouse.up(); await p.waitForTimeout(300);
    await ctx.close(); }
  { const { ctx, p } = await page(b, 412, 880, 2, undefined, true);
    await bare(p); await p.waitForTimeout(700);
    const T = await touchOf(p), g = await tokPt(p, 'Goblin');
    await tglide(p, T, g, { x: g.x + 84, y: g.y + 126 }, 14); await p.waitForTimeout(250);
    await shot(p, 'move-phone.png'); await T('touchEnd'); await p.waitForTimeout(300);
    await ctx.close(); }
  // fog: brush mid-stroke (history + player preview), area drag, phone, projector mid-clear
  const area = async (p, x0, y0, x1, y1, hold) => { const a = await cellPt(p, x0, y0), c = await cellPt(p, x1, y1); await p.mouse.move(a.x, a.y); await p.mouse.down(); await glide(p, a, c, 7); if (!hold) { await p.mouse.up(); await p.waitForTimeout(700); } };
  { const { ctx, p } = await page(b, 1440, 900);
    await bare(p); await p.waitForTimeout(400);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(800);
    await p.click('[data-mi-ftool="rect"]'); await area(p, 2, 6, 10, 13); await area(p, 1, 2, 8, 6);
    await p.click('[data-mi-ftool="brush"]');
    const a = await cellPt(p, 10, 9.5), c = await cellPt(p, 14.5, 7.5);
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await glide(p, a, c, 12); await p.waitForTimeout(400);
    await shot(p, 'fog-desk-brush.png'); await p.mouse.up(); await p.waitForTimeout(800);
    await p.click('[data-mi-ftool="rect"]'); await area(p, 12, 2, 17, 6, true); await p.waitForTimeout(300);
    await shot(p, 'fog-desk-area.png'); await p.mouse.up(); await p.waitForTimeout(800);
    await ctx.close(); }
  { const { ctx, p } = await page(b, 412, 880, 2, undefined, true);
    await bare(p); await p.waitForTimeout(600);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(800);
    const T = await touchOf(p);
    await tglide(p, T, await cellPt(p, 11.5, 9.8), await cellPt(p, 16.3, 7), 14); await p.waitForTimeout(300);
    await shot(p, 'fog-phone.png'); await T('touchEnd'); await p.waitForTimeout(400);
    await ctx.close(); }
  { const { ctx, p } = await page(b, 1440, 900);
    await bare(p); await p.waitForTimeout(400);
    await p.evaluate(() => HearthMI.openFog()); await p.waitForTimeout(600);
    await p.click('[data-mi-ftool="rect"]'); await area(p, 2, 5, 10, 13); await area(p, 1, 2, 8, 5);
    const pop = await projOpen(p);
    await pop.bringToFront();
    // slow-motion camera: the projector runs at 0.3× (CSS animations and the fog canvas clock) so the frame ~300 ms
    // into the reveal can be caught; headless popups only paint every ~200 ms here
    const pcdp = await pop.context().newCDPSession(pop); await pcdp.send('Animation.enable'); await pcdp.send('Animation.setPlaybackRate', { playbackRate: 0.3 });
    await pop.evaluate(() => { const r = performance.now.bind(performance), t0 = r(); performance.now = () => t0 + (r() - t0) * 0.3; });
    const a = await cellPt(p, 10, 2), c = await cellPt(p, 14.5, 8.5); await p.mouse.move(a.x, a.y); await p.mouse.down(); await glide(p, a, c, 6); await p.mouse.up(); // the dragon's corner stays fogged
    const at = await pop.waitForFunction(() => { const t = document.getAnimations().filter(a => a.animationName === 'ptokRev' && a.currentTime < 600).map(a => a.currentTime); return t.length && Math.min.apply(null, t) >= 280 ? Math.round(Math.min.apply(null, t)) : 0; }, null, { timeout: 5000, polling: 'raf' }).then(h => h.jsonValue()).catch(() => 'not seen');
    await pshot(pop, 'fog-projector.png'); // mid-fade: the area reveal dissolves over 500 ms, tokens over 600 ms
    console.log('  fog-projector captured', at, 'ms into the token fade');
    await ctx.close(); }
  console.log(errs.length ? 'PAGE ERRORS ' + errs.slice(0, 3).join(' | ') : 'no page errors');
  await b.close();
})();
