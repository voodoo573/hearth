// Hearth v1.7.0 — Atmosphere v2 screenshots (weather & light on the C2 DM screen and the projector).
// node tests/showcase-atmo.js 8816   (SHOTS=dir, ONLY=regex)
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const OUT = process.env.SHOTS || '/workspace/dm-c2/shots/';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const errs = [];
const want = (n) => !ONLY || ONLY.test(n);
async function page(b, w, h, dpr, touch) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || 1, serviceWorkers: 'block', hasTouch: !!touch });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.waitForFunction(() => window.HearthMI && window.HearthFogLib && window.HearthC2 && window.HearthAtmo, null, { timeout: 10000 });
  await p.evaluate(S.STAGE, {}); await p.waitForTimeout(1600);
  await p.evaluate(() => { state.ui.c2Card = null; state.ui.c2Fan = false; const e = loadEncounter(); e.aoes = []; saveEncounter(e); render(); });
  return { ctx, p };
}
// scene: { map: painted id | {uploaded: painted id}, atmo: {...}, lights: {Name: type}, build }
async function scene(p, sc) {
  await p.evaluate(async (sc) => {
    const e = loadEncounter();
    if (sc.map.uploaded) {
      const v = await paintedEnsure(sc.map.uploaded, e.mapCols || 20, e.mapRows || 15);
      const blob = await (await fetch(v.url)).blob();
      e.mapImage = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      e.mapKind = null; e.mapId = null;
    } else { e.mapKind = 'painted'; e.mapId = sc.map; e.mapImage = null; }
    const lights = {}; Object.keys(sc.lights || {}).forEach(n => { const c = e.combatants.find(x => x.name === n); if (c) lights[c.id] = sc.lights[n]; });
    if (sc.moves) Object.keys(sc.moves).forEach(n => { const c = e.combatants.find(x => x.name === n); if (c) { c.mapX = sc.moves[n][0]; c.mapY = sc.moves[n][1]; } });
    e.atmo = Object.assign({ w: 'none', i: 0.6, t: 'day', d: 0, wind: 0.35, mapLights: true, doors: {}, seed: 20261017 }, sc.atmo, { lights });
    saveEncounter(e); broadcastMap(e); render();
  }, sc);
  if (!sc.map.uploaded) await p.waitForFunction((id) => { const b = document.getElementById('dmPaintedBase'); return b && /blob:/.test(b.style.backgroundImage) && (b.dataset.key || '').indexOf(id) >= 0; }, sc.map, { timeout: 90000 });
  await p.waitForFunction(() => window.HearthAtmo.atm && document.querySelectorAll('#dmMapGrid .hatm').length === 2, null, { timeout: 20000 });
  if (sc.build) await p.evaluate((b) => HearthAtmo.atm.setBuildUp(b), sc.build); // the look after a minute or two of snow
  await p.waitForTimeout(sc.wait || 2200);
}
const clean = p => p.evaluate(() => document.querySelectorAll('.toast, #toast, .hearth-toast').forEach(t => t.remove()));
async function shot(p, name) { if (!want(name)) return; await clean(p); await p.waitForTimeout(200); await p.screenshot({ path: OUT + name }); console.log('shot', name); }
async function projector(p, w, h, prep) {
  const [pop] = await Promise.all([p.context().waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  pop.on('pageerror', e => errs.push('projector: ' + e.message));
  await pop.setViewportSize({ width: w, height: h });
  if (prep) await pop.evaluate(prep);
  await p.waitForTimeout(400); await p.evaluate(() => broadcastMap(loadEncounter()));
  await pop.waitForFunction(() => window.HearthAtmo && HearthAtmo._proj().atm && document.querySelector('#grid .pm-ov, #grid .hatm'), null, { timeout: 60000 });
  await pop.bringToFront(); await pop.waitForTimeout(3500);
  return pop;
}
const DUNGEON = { map: 'dungeon', atmo: { t: 'night', d: 0.75 }, lights: { Ranger: 'torch', Cultist: 'lantern' } };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // 1. night in the dungeon: map sconces + carried light, pillar shadows (DM view keeps it readable)
  if (want('atmo-desk-dungeon|atmo-desk-panel|atmo-projector-dungeon')) {
    const { ctx, p } = await page(b, 1440, 900);
    await scene(p, DUNGEON);
    await shot(p, 'atmo-desk-dungeon-night.png');
    await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForTimeout(900);
    await shot(p, 'atmo-desk-panel.png');
    await p.evaluate(() => { state.ui.c2Fly = null; render(); });
    if (want('atmo-projector-dungeon')) { const pop = await projector(p, 1920, 1080); await pop.screenshot({ path: OUT + 'atmo-projector-dungeon.png' }); console.log('shot', 'atmo-projector-dungeon.png'); }
    await ctx.close();
  }
  // 2. storm at dusk in the forest
  if (want('atmo-desk-storm')) {
    const { ctx, p } = await page(b, 1440, 900);
    await scene(p, { map: 'forest', atmo: { w: 'storm', i: 0.85, t: 'dusk', wind: 0.5 }, lights: { Ranger: 'lantern' } });
    await shot(p, 'atmo-desk-storm.png');
    await ctx.close();
  }
  // 3. embers off the volcanic map's lava
  if (want('atmo-desk-volcanic')) {
    const { ctx, p } = await page(b, 1440, 900);
    await scene(p, { map: 'volcanic', atmo: { w: 'embers', i: 0.8, t: 'dusk', wind: -0.6 }, wait: 3500 });
    await shot(p, 'atmo-desk-volcanic.png');
    await ctx.close();
  }
  // 4. an uploaded map: rain and carried light only (no walls, map lights or embers); the panel says why
  if (want('atmo-desk-uploaded')) {
    const { ctx, p } = await page(b, 1440, 900);
    await scene(p, { map: { uploaded: 'village' }, atmo: { w: 'heavyrain', i: 0.7, t: 'dusk', wind: 0.3 }, lights: { Ranger: 'torch' } });
    await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForTimeout(700);
    await p.evaluate(() => { const b = document.querySelector('[data-c2-panel="weather"]'); const u = [...b.querySelectorAll('.atmo-note')].find(x => /Uploaded/.test(x.textContent)); if (u) b.scrollTop = Math.max(0, u.offsetTop - 300); });
    await p.waitForTimeout(300);
    await shot(p, 'atmo-desk-uploaded-rain.png');
    await ctx.close();
  }
  // 5. phone: snow, then the flyout
  if (want('atmo-phone')) {
    const { ctx, p } = await page(b, 412, 880, 2, true);
    await scene(p, { map: 'ruins', atmo: { w: 'snow', i: 0.7, t: 'day', wind: 0.6 }, build: { snow: 0.55 } });
    await shot(p, 'atmo-phone-snow.png');
    await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForTimeout(800);
    await shot(p, 'atmo-phone-panel.png');
    await ctx.close();
  }
  // 6. projector: foggy night at the camp, sound sent to the projector, which asks for its one tap
  if (want('atmo-projector-camp')) {
    const { ctx, p } = await page(b, 1440, 900);
    await scene(p, { map: 'camp', atmo: { w: 'fog', i: 0.7, t: 'night', d: 0.25, wind: 0.2 }, lights: { Ranger: 'torch' } });
    const pop = await projector(p, 1920, 1080, () => { // a real projector browser keeps audio suspended until it is tapped
      let tapped = false; document.addEventListener('pointerdown', () => { tapped = true; }, true);
      const AC = window.AudioContext; window.AudioContext = function (o) { const c = new AC(o); c.suspend(); const r = c.resume.bind(c); c.resume = () => tapped ? r() : new Promise(() => {}); return c; };
    });
    await p.bringToFront(); await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForTimeout(500);
    await p.click('[data-atmo-snd="projector"]'); await p.waitForTimeout(1500);
    await pop.bringToFront(); await pop.waitForTimeout(1500);
    await pop.screenshot({ path: OUT + 'atmo-projector-camp.png' }); console.log('shot', 'atmo-projector-camp.png');
    await ctx.close();
  }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
