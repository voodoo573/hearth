// Hearth v1.7.0 — creatures the players can't see never reach the projector, in any mode:
// plain + templates, fog (soft mask, mid-reveal), and weather & light. Not the token, its label,
// its turn-order row, its turn highlight, the light it carries, nor anything in the message itself.
// Serve the repo root, then: node tests/projector-hidden.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, {}); await p.waitForTimeout(1500);
  // the DM hides the dragon (an ambush) on its own turn, and the Cultist is dead
  const ids = await p.evaluate(() => { const e = loadEncounter(), d = e.combatants.find(c => c.name === 'Adult Red Dragon'), cu = e.combatants.find(c => c.name === 'Cultist'), g = e.combatants.find(c => c.name === 'Goblin');
    d.hiddenFromPlayers = true; cu.dead = true; cu.hp = 0; saveEncounter(e); state.ui.c2Card = null; render(); return { d: d.id, cu: cu.id, g: g.id }; });
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  pop.on('pageerror', e => errs.push('projector: ' + e.message));
  await pop.setViewportSize({ width: 1280, height: 720 });
  await pop.evaluate(() => { window.__msgs = []; new BroadcastChannel('hearth-projector-map').onmessage = (ev) => { if (ev.data && ev.data.type === 'hearth-map') window.__msgs.push(JSON.stringify(ev.data)); }; });
  await p.waitForTimeout(400);
  const look = (hid) => pop.evaluate((hid) => {
    const g = document.getElementById('grid'), txt = document.body.innerText, html = document.documentElement.outerHTML;
    const rows = [...document.querySelectorAll('#initpanel .init-row')].map(r => r.querySelector('.init-name').textContent);
    const A = window.HearthAtmo && HearthAtmo._proj().atm;
    const msgs = window.__msgs.slice(-3);
    return { toks: [...g.querySelectorAll('.tok')].map(t => t.getAttribute('data-tok-id')), rows, turnRow: !!document.querySelector('#initpanel .init-turn'),
      name: hid.names.filter(n => txt.indexOf(n) >= 0 || html.indexOf('>' + n + '<') >= 0), img: hid.imgs.filter(i => html.indexOf(i) >= 0),
      lights: A ? A.lights().map(l => l.id) : [], inMsg: hid.ids.filter(id => msgs.some(m => m.indexOf(id) >= 0)), nMsg: msgs.length, lbl: [...g.querySelectorAll('.plbl')].map(l => l.textContent) };
  }, hid);
  const H = (extra) => ({ names: ['Adult Red Dragon', 'Cultist'].concat(extra.names || []), imgs: ['young-dragon-red', 'cultist.webp'].concat(extra.imgs || []), ids: [ids.d, ids.cu].concat(extra.ids || []) });
  const clean = (r, label, extra) => {
    const ok = r.toks.indexOf(ids.d) < 0 && r.toks.indexOf(ids.cu) < 0 && !r.rows.some(n => /Dragon|Cultist/.test(n)) && !r.turnRow && !r.name.length && !r.img.length && !r.inMsg.length && r.nMsg > 0 && r.toks.length >= (extra || 3);
    check(label, ok, r);
    return r;
  };
  const send = () => pop.evaluate(() => { window.__msgs = []; }).then(() => p.evaluate(() => { broadcastMap(loadEncounter()); })).then(() => pop.waitForTimeout(1500));

  // ---- 1. plain board + a pinned template aimed at the hidden dragon
  await p.evaluate(() => { const e = loadEncounter(); e.aoes.push({ id: 'aoe_cone', kind: 'cone', x: 5, y: 9, len: 6, angle: 0.3, color: '#e8552d', pinned: true }); saveEncounter(e); render(); });
  await send();
  let r = clean(await look(H({})), 'templates: hidden dragon and dead Cultist are nowhere on the projector (token, label, turn row, image, message)');
  check('templates: labels give size only (no creature counts that betray the hidden dragon)', r.lbl.length >= 1 && r.lbl.every(t => !/creature/i.test(t)), r.lbl);
  check('templates: it is the hidden dragon\u2019s turn, but no turn highlight shows', !r.turnRow && r.rows.length === 4, r.rows);

  // ---- 2. fog: the Goblin's corner is still fogged; then the DM reveals around the dragon (it stays hidden)
  await p.evaluate(() => { const e = loadEncounter(); e.fog = { on: true, revealed: [] }; for (let x = 0; x < 20; x++) for (let y = 0; y < 15; y++) if (!(x >= 9 && x <= 12 && y >= 3 && y <= 7)) e.fog.revealed.push(x + ',' + y); saveEncounter(e); render(); });
  await send();
  r = clean(await look(H({ names: ['Goblin\n'], ids: [ids.g] })), 'fog: hidden, dead and fogged creatures (the Goblin) all absent, message included', 2);
  check('fog: the fogged Goblin has no turn-order row either', !r.rows.some(n => n === 'Goblin'), r.rows);
  // the soft reveal mid-fade: reveal the Goblin; it fades in, the dragon never does
  await p.evaluate(() => { const e = loadEncounter(); for (let x = 9; x <= 12; x++) for (let y = 3; y <= 7; y++) e.fog.revealed.push(x + ',' + y); if (e.fog.mask) e.fog.mask = null; saveEncounter(e); render(); broadcastMap(loadEncounter()); });
  await pop.waitForTimeout(250);
  r = await look(H({}));
  check('fog reveal, mid-fade: the Goblin fades in, the hidden dragon does not', r.toks.indexOf(ids.g) >= 0 && r.toks.indexOf(ids.d) < 0 && !r.name.length && !r.inMsg.length, r);

  // ---- 3. weather & light: the hidden dragon carries a torch (no glow for players), night
  await p.evaluate((ids) => { const e = loadEncounter(); e.fog = null; e.atmo = { w: 'fog', i: 0.6, t: 'night', d: 0.3, wind: 0.3, mapLights: true, doors: {}, seed: 5, lights: { [ids.d]: 'torch' } }; saveEncounter(e); render(); broadcastMap(loadEncounter()); }, ids);
  await pop.waitForFunction(() => window.HearthAtmo && HearthAtmo._proj().atm, null, { timeout: 20000 }); await pop.waitForTimeout(1500);
  r = clean(await look(H({})), 'weather & light: hidden dragon absent from the projector');
  check('weather & light: its torch doesn\u2019t light the projector', r.lights.indexOf('tok-' + ids.d) < 0, r.lights);

  // ---- 4. the DM un-hides it: it appears (so the filter is the hiding, not the dragon)
  await p.evaluate(() => { const e = loadEncounter(); e.combatants.find(c => c.name === 'Adult Red Dragon').hiddenFromPlayers = false; saveEncounter(e); render(); broadcastMap(loadEncounter()); });
  await pop.waitForTimeout(1200);
  r = await look(H({}));
  check('revealed by the DM: the dragon, its turn row and its torch appear', r.toks.indexOf(ids.d) >= 0 && r.rows.indexOf('Adult Red Dragon') >= 0 && r.turnRow && r.lights.indexOf('tok-' + ids.d) >= 0, r);

  check('no page errors (DM screen and projector)', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = results.filter(r => r.ok).length; console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
