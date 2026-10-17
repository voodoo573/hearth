// Hearth v1.7.0 — Atmosphere sound never outlives the board: it fades out (well under a second)
// when the DM leaves the map, switches layout, or the scene goes; and classic shows the same scene.
// Serve the repo root, then: node tests/atmo-sound.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
// a level meter on whatever the page sends to its speakers
const METER = () => {
  window.__an = []; const oc = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d) { const r = oc.apply(this, arguments);
    if (d instanceof AudioDestinationNode && !this.__m) { this.__m = 1; const an = this.context.createAnalyser(); an.fftSize = 2048; oc.call(this, an); window.__an.push(an); } return r; };
  window.__level = () => { let m = 0; for (const an of window.__an) { if (an.context.state !== 'running') continue; const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; m = Math.max(m, Math.sqrt(s / b.length)); } return m; };
  window.__trace = (ms) => new Promise((r) => { const out = [], t0 = performance.now(); const id = setInterval(() => { const t = performance.now() - t0; out.push([Math.round(t), window.__level()]); if (t > ms) { clearInterval(id); r(out); } }, 20); });
};
// before: level just before; end: loudest from 1 s on; mid: a sample part-way down (a fade, not a cut)
const judge = (before, tr) => { const after = tr.filter(x => x[0] >= 1000).map(x => x[1]), mid = tr.filter(x => x[1] > before * 0.08 && x[1] < before * 0.85 && x[0] > 0);
  const quiet = tr.find(x => x[1] < before * 0.05); return { before: +before.toFixed(4), end: +Math.max(0, ...after).toFixed(5), quietAt: quiet ? quiet[0] : null, fading: mid.length, ok: before > 0.002 && Math.max(0, ...after) < before * 0.05 && quiet && quiet[0] <= 1000 && mid.length > 0 }; };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(METER);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, {}); await p.waitForTimeout(1500);
  await p.evaluate(() => { state.ui.c2Card = null; state.ui.c2Fly = 'weather'; render(); });
  await p.waitForSelector('[data-c2-panel="weather"] [data-atmo-w="storm"]', { timeout: 15000 });
  await p.click('[data-atmo-w="storm"]'); await p.waitForTimeout(500);
  const openPanel = async () => { await p.evaluate(() => { state.ui.c2Fly = 'weather'; render(); }); await p.waitForSelector('[data-atmo-snd="dm"]'); };
  const playDM = async () => { await openPanel(); await p.click('[data-atmo-snd="dm"]'); await p.waitForFunction(() => HearthAtmo.sound && HearthAtmo.sound.state().playing && window.__level() > 0.002, null, { timeout: 8000 }); await p.waitForTimeout(600); return p.evaluate(() => window.__level()); };

  // ---- 1. closing the Weather panel is not leaving: the storm keeps sounding while you play
  let L = await playDM();
  await p.click('[data-c2-panel="weather"] [data-c2-fly-close]'); await p.waitForTimeout(1300);
  const kept = await p.evaluate(() => ({ playing: HearthAtmo.sound.state().playing, lv: window.__level(), panel: !!document.querySelector('[data-c2-panel="weather"]:not([hidden])') }));
  check('closing the Weather panel keeps the ambience playing (it is the DM\u2019s background sound)', kept.playing && !kept.panel && kept.lv > L * 0.3, kept);

  // ---- 2. leaving the map with \u2039 Build: a quick fade, then silence
  L = await p.evaluate(() => window.__level());
  let tr = await p.evaluate(async () => { const t = window.__trace(1400); document.getElementById('dmMapExit').click(); return t; });
  let j = judge(L, tr);
  check('\u2039 Build (leaving the map): sound fades out and is silent within a second', j.ok, j);
  let st = await p.evaluate(() => ({ snd: HearthAtmo.sound ? HearthAtmo.sound.state() : null, saved: state.ui.atmoSnd, layers: document.querySelectorAll('.hatm').length }));
  check('...and it stays off: the controller is gone, the sound choice now reads Off', !st.snd && st.saved && !st.saved.enabled && st.layers === 0, st);
  await p.evaluate(() => { state.ui.dmMapMode = true; render(); }); await p.waitForTimeout(1200);
  st = await p.evaluate(() => ({ playing: !!(HearthAtmo.sound && HearthAtmo.sound.state().playing), w: HearthAtmo.atm && HearthAtmo.atm.state().weather, lv: window.__level() }));
  check('back on the map: the storm is still there, but silent until the DM turns sound on again', st.w === 'storm' && !st.playing && st.lv < 0.001, st);

  // ---- 3. leaving the DM tab altogether (Play tab)
  L = await playDM();
  tr = await p.evaluate(async () => { const t = window.__trace(1400); setActiveTab('play'); render(); return t; });
  j = judge(L, tr);
  check('switching to another tab: sound fades out within a second (no 60 s tail)', j.ok, j);
  await p.evaluate(() => { setActiveTab('dm'); state.ui.dmMapMode = true; render(); }); await p.waitForTimeout(1200);

  // ---- 4. switching layout: sound fades; classic shows the same weather and light as the projector
  L = await playDM();
  tr = await p.evaluate(async () => { const t = window.__trace(1400); dmSetLayout('classic'); render(); return t; });
  j = judge(L, tr);
  check('switching to the classic layout: sound fades out within a second', j.ok, j);
  const cl = await p.evaluate(() => { const g = document.getElementById('dmMapGrid'), kids = [...g.children], A = HearthAtmo.atm;
    const w = g.querySelector('.hatm-weather'), l = g.querySelector('.hatm-light'), toks = [...g.querySelectorAll('.map-token')];
    return { c2: !!document.querySelector('.c2'), layers: g.querySelectorAll('.hatm').length, w: A && A.state().weather, t: A && A.state().time, dmView: A && A.state().dmView,
      order: !!w && !!l && toks.length > 0 && kids.indexOf(w) < kids.indexOf(toks[0]) && kids.indexOf(l) > kids.indexOf(toks[toks.length - 1]), playing: !!(HearthAtmo.sound && HearthAtmo.sound.state().playing), lights: A ? A.lights().length : 0 }; });
  check('classic layout: the DM board shows the same storm and light (DM view), weather under the tokens, light over them', !cl.c2 && cl.layers === 2 && cl.w === 'storm' && cl.dmView && cl.order && !cl.playing, cl);
  const pjS = await p.evaluate(() => buildMapState(loadEncounter()).atmo);
  check('classic: what the DM sees is the scene the projector is sent', pjS && pjS.w === cl.w && pjS.t === cl.t, pjS && { w: pjS.w, t: pjS.t });
  await p.evaluate(() => { dmSetLayout('c2'); render(); }); await p.waitForTimeout(1000);

  // ---- 5. projector playing: leaving the map fades the projector too
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  pop.on('pageerror', e => errs.push('projector: ' + e.message));
  await pop.waitForFunction(() => window.HearthAtmo && HearthAtmo._proj().atm, null, { timeout: 20000 });
  await openPanel(); await p.click('[data-atmo-snd="projector"]');
  await pop.waitForFunction(() => HearthAtmo._proj().snd && HearthAtmo._proj().snd.state().playing && window.__level() > 0.002, null, { timeout: 8000 }); await pop.waitForTimeout(600);
  L = await pop.evaluate(() => window.__level());
  const dmQuiet = await p.evaluate(() => window.__level());
  const ptr = pop.evaluate(() => window.__trace(1400));
  await p.evaluate(() => document.getElementById('dmMapExit').click());
  j = judge(L, await ptr);
  check('sound on the projector: the DM leaving the map fades the projector out within a second', j.ok && dmQuiet < 0.001, Object.assign(j, { dmQuiet }));
  const ps = await pop.evaluate(() => { const s = HearthAtmo._proj().snd; return s ? s.state() : null; });
  check('...and the projector\u2019s sound is off, not just paused', !ps || (!ps.enabled && !ps.playing), ps);

  // ---- 6. a rebuild (map resized) keeps the DM's choice and doesn't double up
  await p.evaluate(() => { state.ui.dmMapMode = true; render(); }); await p.waitForTimeout(800);
  L = await playDM();
  await p.evaluate(() => { const e = loadEncounter(); e.mapCols = 22; saveEncounter(e); broadcastMap(e); render(); }); await p.waitForTimeout(1500);
  st = await p.evaluate(() => ({ playing: !!(HearthAtmo.sound && HearthAtmo.sound.state().playing), ctxs: window.__an.filter(a => a.context.state === 'running').length }));
  check('resizing the map rebuilds the scene: sound carries on, one audio context playing', st.playing && st.ctxs === 1, st);
  await p.evaluate(() => { const e = loadEncounter(); e.mapCols = 20; saveEncounter(e); render(); });

  check('no page errors (DM screen and projector)', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = results.filter(r => r.ok).length; console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
