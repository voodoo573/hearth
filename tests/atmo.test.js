// Hearth v1.7.0 — Atmosphere v2 (Jenny's weather & light) on the C2 DM screen and the projector.
// Serve the repo root, then: node tests/atmo.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
const setMap = (p, how) => p.evaluate(async (how) => {
  const e = loadEncounter();
  if (how.painted) { e.mapKind = 'painted'; e.mapId = how.painted; e.mapImage = null; }
  else { // an "uploaded" map: the same kind of picture, but as a plain image the app knows nothing about
    const v = await paintedEnsure('forest', e.mapCols || 20, e.mapRows || 15);
    const blob = await (await fetch(v.url)).blob();
    e.mapImage = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    e.mapKind = null; e.mapId = null;
  }
  saveEncounter(e); render();
}, how);
const waitPainted = (p, id) => p.waitForFunction((id) => { const b = document.getElementById('dmPaintedBase'); return b && /blob:/.test(b.style.backgroundImage) && (b.dataset.key || '').indexOf(id) >= 0; }, id, { timeout: 60000 });
(async () => {
  // projector windows must ask for a tap before sound, as on a real second screen
  const b = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, {}); await p.waitForTimeout(1500);
  await p.evaluate(() => { state.ui.c2Card = null; render(); });

  // ---- 1. off by default, lazy
  const d0 = await p.evaluate(() => ({ atmo: loadEncounter().atmo, layers: document.querySelectorAll('#dmMapGrid .hatm').length, lib: !!window.HearthAtmosphere, glue: !!window.HearthAtmo }));
  check('off by default: no settings, no layers, and Jenny\u2019s 67 KB engine isn\u2019t even loaded yet', !d0.atmo && d0.layers === 0 && !d0.lib && d0.glue, d0);
  await p.evaluate(() => { state.ui.c2Fan = true; render(); });
  check('the \u2726 fan has a Weather tool (C2\u2019s missing Weather)', await p.evaluate(() => !!document.querySelector('.c2-fan [data-c2-fly="weather"]')));
  await p.click('.c2-fan [data-c2-fly="weather"]');
  await p.waitForFunction(() => window.HearthAtmosphere && HearthAtmosphere.wallsFor && document.querySelector('[data-c2-panel="weather"] [data-atmo-door]'), null, { timeout: 15000 });
  const pan = await p.evaluate(() => { const q = (s) => document.querySelector('[data-c2-panel="weather"] ' + s); return { clear: q('[data-atmo-w="none"]').classList.contains('on'), day: q('[data-atmo-t="day"]').classList.contains('on'), snd: q('[data-atmo-snd="off"]').classList.contains('on'), vol: q('[data-atmo-vol]').disabled, n: document.querySelectorAll('[data-atmo-w]').length }; });
  check('Weather & light flyout: Clear, Day, Sound off (volume disabled), nine weathers', pan.clear && pan.day && pan.snd && pan.vol && pan.n === 9, pan);

  // ---- 2. rain on the Hearth dungeon: layering, DM view, walls
  await p.click('[data-atmo-w="rain"]'); await p.waitForTimeout(800);
  const d1 = await p.evaluate(() => {
    const g = document.getElementById('dmMapGrid'), kids = [...g.children], ix = (el) => kids.indexOf(el), A = HearthAtmo.atm;
    const w = g.querySelector('.hatm-weather'), l = g.querySelector('.hatm-light'), toks = [...g.querySelectorAll('.map-token')];
    return { saved: loadEncounter().atmo.w, st: A.state().weather, dmView: A.state().dmView,
      order: ix(w) > ix(document.getElementById('dmPaintedOv')) && ix(w) < ix(document.getElementById('dmAoeLayer')) && ix(l) > Math.max.apply(null, toks.map(ix)) && ix(l) < ix(document.getElementById('miOv')),
      zLight: getComputedStyle(l.querySelector('canvas')).zIndex, zOv: getComputedStyle(document.getElementById('miOv')).zIndex, wrapZ: getComputedStyle(l).zIndex, walls: !!A.walls(), indoor: A.state().indoor };
  });
  check('Rain saves with the encounter and runs on the DM screen in DM view', d1.saved === 'rain' && d1.st === 'rain' && d1.dmView === true, d1);
  check('layering: map \u2192 overlay \u2192 weather \u2192 templates \u2192 tokens \u2192 light \u2192 handles/labels', d1.order && d1.zLight === '6' && d1.zOv === '7' && d1.wrapZ === 'auto', d1);
  check('Hearth map (dungeon): wall data loaded, indoor', d1.walls && d1.indoor, d1);

  // ---- 3. night: map light sources, doors, carried light
  await p.click('[data-atmo-t="night"]'); await p.waitForTimeout(500);
  const ranger = await p.evaluate(() => loadEncounter().combatants.find(c => c.name === 'Ranger'));
  await p.selectOption(`[data-atmo-light="${ranger.id}"]`, 'torch'); await p.waitForTimeout(600);
  const d2 = await p.evaluate((rid) => { const A = HearthAtmo.atm, L = A.lights(), t = L.find(l => l.id === 'tok-' + rid); return { map: L.filter(l => /^map-/.test(l.id)).length, tok: t && t.type, pos: t && t.follow(), door: A.walls().doors['north-door'] || A.walls().doors[0] }; }, ranger.id);
  check('night on a Hearth map lights its own torches and fires', d2.map >= 4, d2);
  check('a torch given to the Ranger follows the Ranger token', d2.tok === 'torch' && Math.abs(d2.pos.x - (ranger.mapX + 0.5)) < 0.05 && Math.abs(d2.pos.y - (ranger.mapY + 0.5)) < 0.05, d2);
  await p.click('[data-atmo-door="north-door"]'); await p.waitForTimeout(400);
  const d3 = await p.evaluate(() => { const A = HearthAtmo.atm, ds = A.walls().doors; return { open: (ds['north-door'] || ds[0] || {}).open, saved: loadEncounter().atmo.doors, btn: document.querySelector('[data-atmo-door]').textContent }; });
  check('North door opens (light passes) and the choice is saved', d3.open === true && d3.saved['north-door'] === true && /open/.test(d3.btn), d3);
  await p.click('[data-atmo-maplights]'); await p.waitForTimeout(400);
  check('\u201cTorches & fires on the map\u201d can be switched off', await p.evaluate(() => HearthAtmo.atm.lights().every(l => !/^map-/.test(l.id))));
  await p.click('[data-atmo-maplights]'); await p.waitForTimeout(300);

  // ---- 4. projector: same scene, synced simulation, hidden creatures keep their secrets
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  pop.on('pageerror', e => errs.push('projector: ' + e.message));
  await pop.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(500);
  await p.evaluate(() => broadcastMap(loadEncounter()));
  await pop.waitForFunction(() => window.HearthAtmo && HearthAtmo._proj().atm, null, { timeout: 20000 }); await pop.waitForTimeout(1200);
  const pj = await pop.evaluate(() => { const A = HearthAtmo._proj().atm, g = document.getElementById('grid'), kids = [...g.children], ix = (e) => kids.indexOf(e);
    const l = g.querySelector('.hatm-light'), w = g.querySelector('.hatm-weather'), lbl = g.querySelector('.plbl'), pm = g.querySelector('.pm-ov'), toks = [...g.querySelectorAll('.tok')];
    return { st: A.state(), walls: !!A.walls(), lights: A.lights().map(x => x.id), order: (!pm || ix(w) === ix(pm) + 1) && ix(l) < ix(lbl) && getComputedStyle(l.querySelector('canvas')).zIndex === '6' && getComputedStyle(lbl).zIndex === '6' && toks.every(t => getComputedStyle(t).zIndex !== '6') };
  });
  check('projector: rain at night, full darkness (no DM cap), same walls', pj.st.weather === 'rain' && pj.st.time === 'night' && pj.st.dmView === false && pj.walls, pj.st);
  check('projector layering: weather on the map overlay, light over the tokens, labels readable over the light', pj.order, pj);
  check('projector has the map\u2019s torches and the Ranger\u2019s torch', pj.lights.indexOf('tok-' + ranger.id) >= 0 && pj.lights.filter(x => /^map-/.test(x)).length >= 4, pj.lights);
  await p.evaluate(() => { const e = loadEncounter(); e.atmo.w = 'snow'; e.atmo.i = 0.8; saveEncounter(e); broadcastMap(e); render(); });
  await p.waitForTimeout(1500);
  // record a checksum per simulation tick on both screens for 2 s, then compare the ticks both saw
  const REC = () => { const A = window.HearthAtmo && (HearthAtmo.atm || HearthAtmo._proj().atm); window.__ck = {}; A.on('frame', () => { const c = A.checksum(); window.__ck[c.tick] = c.parts; }); };
  await p.evaluate(REC); await pop.evaluate(REC); await p.waitForTimeout(2000);
  const ckA = await p.evaluate(() => window.__ck), ckB = await pop.evaluate(() => window.__ck);
  const both = Object.keys(ckA).filter(t => t in ckB), bad = both.filter(t => ckA[t] !== ckB[t]);
  check('DM and projector simulate the same snowflakes, tick for tick (sync over the projector channel)', both.length >= 5 && bad.length === 0 && ckA[both[0]] !== 0, { compared: both.length, mismatches: bad.length });
  const cult = await p.evaluate(() => loadEncounter().combatants.find(c => c.name === 'Cultist'));
  await p.evaluate((id) => { const e = loadEncounter(); e.atmo.lights[id] = 'lantern'; const c = e.combatants.find(x => x.id === id); c.hiddenFromPlayers = true; saveEncounter(e); broadcastMap(e); render(); }, cult.id);
  await p.waitForTimeout(800);
  const hid = { dm: await p.evaluate((id) => HearthAtmo.atm.lights().some(l => l.id === 'tok-' + id), cult.id), pj: await pop.evaluate((id) => HearthAtmo._proj().atm.lights().some(l => l.id === 'tok-' + id), cult.id) };
  check('a hidden creature\u2019s lantern shows on the DM screen only', hid.dm && !hid.pj, hid);
  await p.evaluate((id) => { const e = loadEncounter(); e.combatants.find(x => x.id === id).hiddenFromPlayers = false; saveEncounter(e); broadcastMap(e); render(); }, cult.id);

  // ---- 5. sound: off by default, one screen only, tap-to-enable on the projector
  // emulate a projector browser's autoplay rule: audio stays suspended until the window itself gets a tap
  // (Playwright marks the popup as already activated, so the rule is emulated with a real pointer tap)
  await pop.evaluate(() => { let tapped = false; document.addEventListener('pointerdown', () => { tapped = true; }, true);
    const AC = window.AudioContext; window.AudioContext = function (o) { const c = new AC(o); c.suspend(); const r = c.resume.bind(c); c.resume = () => tapped ? r() : new Promise(() => {}); return c; }; });
  const snd = async () => ({ dm: await p.evaluate(() => HearthAtmo.sound.state()), pj: await pop.evaluate(() => HearthAtmo._proj().snd.state()), btn: await pop.evaluate(() => { const b = document.getElementById('pjSnd'); return !!b && !b.hidden; }) });
  let s0 = await snd();
  check('sound is off on both screens by default', !s0.dm.enabled && !s0.dm.playing && !s0.pj.playing && !s0.btn, s0);
  await p.click('[data-atmo-snd="dm"]'); await p.waitForTimeout(700);
  let s1 = await snd();
  check('Sound \u2192 This screen: the DM screen plays, the projector stays silent', s1.dm.playing && !s1.pj.playing, s1);
  await p.click('[data-atmo-snd="projector"]'); await p.waitForTimeout(1200);
  let s2 = await snd();
  check('Sound \u2192 Projector: the DM stops; the projector asks for one tap (autoplay rules)', !s2.dm.playing && s2.pj.output === 'projector' && s2.btn, s2);
  await pop.bringToFront(); await pop.click('#pjSnd'); await pop.waitForTimeout(900);
  let s3 = await snd();
  check('one tap on the projector starts its sound and hides the button; still only one screen playing', s3.pj.playing && s3.pj.context === 'running' && !s3.btn && !s3.dm.playing, s3);
  await p.bringToFront();
  await p.evaluate(() => { const v = document.querySelector('[data-atmo-vol]'); v.value = '0.3'; v.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(400);
  const vol = await pop.evaluate(() => HearthAtmo._proj().snd.state().volume);
  check('volume set on the DM screen reaches the projector', Math.abs(vol - 0.3) < 0.01, vol);
  await p.click('[data-atmo-snd="off"]'); await p.waitForTimeout(700);
  let s4 = await snd();
  check('Sound off: silent everywhere', !s4.dm.playing && !s4.pj.playing, s4);

  // ---- 6. other Hearth maps and uploaded maps (product rule)
  await setMap(p, { painted: 'volcanic' }); await waitPainted(p, 'volcanic'); await p.waitForTimeout(800);
  await p.evaluate(() => { const e = loadEncounter(); e.atmo.w = 'embers'; saveEncounter(e); broadcastMap(e); render(); }); await p.waitForTimeout(900);
  const v = await p.evaluate(() => { const A = HearthAtmo.atm, sn = A.snapshot(); return { emit: sn.emitters.length, walls: !!A.walls(), lava: A.lights().filter(l => /^map-/.test(l.id)).length, note: document.querySelector('[data-c2-panel="weather"] .atmo').textContent }; });
  check('Hearth volcanic map: embers rise from its lava (emitters from the painted map), lava keeps glowing at night', v.emit > 10 && v.lava > 0 && !v.walls && /Lava and fires/.test(v.note), v);
  await setMap(p, {}); await p.waitForTimeout(1500);
  await p.evaluate(() => { const e = loadEncounter(); e.atmo.w = 'rain'; saveEncounter(e); broadcastMap(e); render(); }); await p.waitForTimeout(900);
  const u = await p.evaluate(() => { const A = HearthAtmo.atm, sn = A.snapshot(), pan = document.querySelector('[data-c2-panel="weather"] .atmo'); return { emit: sn.emitters.length, walls: A.walls(), indoor: A.state().indoor, mapL: A.lights().filter(l => /^map-/.test(l.id)).length, tok: A.lights().filter(l => /^tok-/.test(l.id)).length, ground: !!A.groundMask(), w: A.state().weather, doorBtn: !!pan.querySelector('[data-atmo-door]'), mlBtn: !!pan.querySelector('[data-atmo-maplights]'), note: /Uploaded map/.test(pan.textContent), layers: document.querySelectorAll('#dmMapGrid .hatm').length }; });
  check('uploaded map: rain and carried light, but no walls, no map lights, no embers, no ground mask', u.w === 'rain' && u.walls === null && !u.indoor && u.mapL === 0 && u.emit === 0 && !u.ground && u.tok >= 1 && u.layers === 2, u);
  check('uploaded map: no wall, door or fire tools in the panel, just a note', !u.doorBtn && !u.mlBtn && u.note, u);
  await pop.waitForTimeout(800);
  const pu = await pop.evaluate(() => { const A = HearthAtmo._proj().atm; return { walls: A.walls(), emit: A.snapshot().emitters.length, mapL: A.lights().filter(l => /^map-/.test(l.id)).length }; });
  check('projector follows: uploaded map has no walls, map lights or emitters there either', pu.walls === null && pu.emit === 0 && pu.mapL === 0, pu);

  // ---- 7. classic layout keeps working; clearing tears everything down
  await p.evaluate(() => { dmSetLayout('classic'); render(); }); await p.waitForTimeout(800);
  const cl = await p.evaluate(() => ({ c2: !!document.querySelector('.c2'), layers: document.querySelectorAll('.hatm').length, saved: loadEncounter().atmo.w, grid: !!document.getElementById('dmMapGrid') }));
  check('classic layout: no atmosphere layers on the DM board (settings kept for the projector)', !cl.c2 && cl.grid && cl.layers === 0 && cl.saved === 'rain', cl);
  await p.evaluate(() => { dmSetLayout('c2'); render(); }); await p.waitForTimeout(800);
  check('back to C2: the scene comes straight back', await p.evaluate(() => document.querySelectorAll('#dmMapGrid .hatm').length === 2 && HearthAtmo.atm.state().weather === 'rain'));
  await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForTimeout(400);
  await p.click('[data-atmo-reset]'); await p.waitForTimeout(1200);
  const off = { dm: await p.evaluate(() => ({ layers: document.querySelectorAll('#dmMapGrid .hatm').length, atm: !!HearthAtmo.atm, w: loadEncounter().atmo.w })), pj: await pop.evaluate(() => ({ layers: document.querySelectorAll('#grid .hatm').length, atm: !!HearthAtmo._proj().atm })) };
  check('Clear weather & light removes it from both screens', off.dm.layers === 0 && !off.dm.atm && off.dm.w === 'none' && off.pj.layers === 0 && !off.pj.atm, off);

  check('no page errors (DM screen and projector)', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = results.filter(r => r.ok).length; console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
