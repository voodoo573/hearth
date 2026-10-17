// Hearth v1.6.0 animated dice + roll feed: headless Chromium (SwiftShader WebGL).
// Serve the repo root first:  python3 -m http.server 8816   then: node tests/dice160.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const ORIGIN = `http://127.0.0.1:${PORT}`;
const URL = `${ORIGIN}/app/index.html`;
const SHOTS = process.env.SHOTS || '/workspace/dice-160/shots/';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Wrap HearthDice.roll so every call's options and final result are recorded.
const SPY = () => hearthDiceLoad().then(HD => {
  if (HD.__spied) return true;
  const orig = HD.roll; window.__rolls = [];
  HD.roll = function (o) { const rec = { o: JSON.parse(JSON.stringify(o)), res: null }; window.__rolls.push(rec); const p = orig.call(HD, o); p.then(r => { rec.res = JSON.parse(JSON.stringify(r)); }); return p; };
  HD.__spied = true; HD.setSpeed(4); return true;
});
const flat = (landed) => [].concat(...(landed || []).map(x => Array.isArray(x) ? x : [x]));

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(20000);
  p.on('pageerror', e => errs.push('PAGE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); });
  await p.reload(); await p.waitForTimeout(800);

  // ---- versions + offline cache list ----
  const v = await p.evaluate(async () => ({ app: HEARTH_VERSION, sw: await (await fetch('/app/sw.js')).text(), root: await (await fetch('/sw.js')).text(), landing: await (await fetch('/')).text() }));
  check('version 1.7.1 (app, sw cache tags, landing labels)', v.app === '1.7.1' && v.sw.includes("'hearth-v1.7.1'") && v.root.includes("'hearth-site-v1.7.1'") && (v.landing.match(/v1\.7\.1/g) || []).length >= 2 && !/v1\.7\.0</.test(v.landing));
  check('app sw precaches dice files', ['three.min.js', 'cannon-es.js', 'hearth-dice.js', 'dice-worker.js'].every(f => v.sw.includes(`'./dice/${f}'`)));
  check('dice scripts not loaded at start (lazy)', await p.evaluate(() => !window.HearthDice && !window.THREE));

  // ---- character + initiative through the real roll dialog ----
  const cid = await p.evaluate(() => {
    const d = generateRandomCharacter(); Object.assign(d, { name: 'Brin Tallow', race: 'human', subrace: null, klass: 'fighter', subclass: null, level: 3, classLevels: { fighter: 3 } });
    saveCharacter(d); const ch = getCharacter(d.id); ch.currentHp = maxHp(ch); saveCharacter(ch);
    state.activeCharId = d.id; setActiveTab('play'); render(); return d.id;
  });
  await p.evaluate(SPY);
  check('HearthDice + three.js + cannon-es load from /app/dice/', await p.evaluate(() => !!(window.HearthDice && window.THREE && window.CANNON && HearthDice.version === '0.6.0-app' && /\/app\/dice\/dice-worker\.js$/.test(HearthDice.workerUrl))));
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-stat-roll-flat]')].find(x => /init/i.test(x.textContent)) || document.querySelector('[data-stat-roll-flat]'); b.click(); });
  await p.waitForSelector('[data-roll-line="0"]');
  await p.click('[data-roll-line="0"]');
  await p.waitForSelector('.hd-ov');
  await p.waitForTimeout(250);
  await p.screenshot({ path: SHOTS + '01-initiative-tumbling.png' });
  await p.waitForFunction(() => document.querySelector('.hd-num.on'), null, { timeout: 15000 });
  await p.screenshot({ path: SHOTS + '02-initiative-landed.png' });
  await p.waitForFunction(() => window.__rolls.length && window.__rolls[0].res, null, { timeout: 15000 });
  const sk = await p.evaluate(() => { const d = state.ui.rollDialog; const line = d.lines[0]; return { r: window.__rolls[0], detail: line.rollDetail, result: line.result, feed: rollFeedLoad()[0] }; });
  const d20 = parseInt(/\[(\d+)/.exec(sk.detail)[1], 10);
  check('initiative: shown die = rolled d20, shown total = app total', sk.r.o.results[0] === d20 && flat(sk.r.res.landed)[0] === String(d20) && sk.r.o.total === String(sk.result), { detail: sk.detail, landed: sk.r.res.landed, total: sk.r.o.total });
  check('initiative lands in roll feed (who, label, dice, total)', sk.feed && sk.feed.who === 'Brin Tallow' && sk.feed.dice === `1d20 [${d20}]` && sk.feed.total === String(sk.result) && !sk.feed.manual, sk.feed);

  await p.evaluate(() => { state.ui.rollDialog = null; state.ui.rollOutcome = null; render(); });
  // ---- advantage: both d20s shown, nat flag from the kept die ----
  const adv = await p.evaluate(async () => {
    window.__rolls.length = 0;
    const line = { label: 'Attack', kind: 'd20', mod: 5, advantage: 'adv', isAttack: true };
    const orig = rollDie; let k = 0; rollDie = (s) => (k++ === 0 ? 20 : 7); executeRollLine(line); rollDie = orig;
    hearthDiceFromLine(line); await new Promise(r => setTimeout(r, 50)); await hearthDiceLoad();
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 100));
    return { r: window.__rolls[0], line };
  });
  check('advantage attack: 2 d20s [20,7], nat 20 crit, total 25', JSON.stringify(adv.r.o.results) === '[20,7]' && adv.r.o.crit === 'nat20' && adv.r.o.big === true && adv.r.o.total === '25' && JSON.stringify(flat(adv.r.res.landed)) === '["20","7"]', adv.r.o);

  // ---- damage pool through executeRollLine (2d6 + 1d8 + crit doubling) ----
  const dmg = await p.evaluate(async () => {
    window.__rolls.length = 0;
    const line = { label: 'Damage', kind: 'damage', dice: [{ count: 2, sides: 6 }, { count: 1, sides: 8 }], mod: 3, crit: true };
    executeRollLine(line); hearthDiceFromLine(line);
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 100));
    return { r: window.__rolls[0], line, via: HearthDice._lastPlanVia };
  });
  const want = dmg.line.rolls.concat(dmg.line.critRolls);
  const shown = flat(dmg.r.res.landed).map(Number);
  const sortN = a => a.slice().sort((x, y) => x - y).join(',');
  check('crit damage: every rolled die shown (6 dice), values match, total = line total', shown.length === 6 && sortN(shown) === sortN(want) && dmg.r.o.total === String(dmg.line.result), { want, shown, total: dmg.r.o.total });
  check('6-die pool pre-simulated in the Web Worker', dmg.via === 'worker', dmg.via);

  // ---- big pool in the worker, main thread stays responsive ----
  const pool = await p.evaluate(async () => {
    window.__rolls.length = 0;
    const vals = Array.from({ length: 12 }, (_, i) => 1 + (i % 6));
    let ticks = 0; const iv = setInterval(() => ticks++, 16);
    const t0 = performance.now();
    hearthDiceRoll({ label: 'Fireball', groups: [{ sides: 6, values: vals }], total: 42 });
    while (!document.querySelector('.hd-ov canvas') || !window.__rolls[0]) await new Promise(r => setTimeout(r, 10));
    while (!window.__rolls[0].res) await new Promise(r => setTimeout(r, 50));
    clearInterval(iv);
    return { r: window.__rolls[0], vals, via: HearthDice._lastPlanVia, ticks, ms: performance.now() - t0 };
  });
  check('12d6 pool: worker, all faces match', pool.via === 'worker' && sortN(flat(pool.r.res.landed).map(Number)) === sortN(pool.vals), { via: pool.via, ms: Math.round(pool.ms), ticks: pool.ticks });
  const syncFallback = await p.evaluate(async () => {
    HearthDice.useWorker = false; window.__rolls.length = 0;
    hearthDiceRoll({ label: 'Pool', groups: [{ sides: 8, values: [1, 2, 3, 4] }], total: 10 });
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50));
    HearthDice.useWorker = true; return { via: HearthDice._lastPlanVia, landed: [].concat(...window.__rolls[0].res.landed) };
  });
  check('main-thread fallback still lands the right faces', syncFallback.via === 'sync' && syncFallback.landed.join(',') === '1,2,3,4', syncFallback);

  // ---- d100 + logRoll text parsing (Second Wind style) ----
  const misc = await p.evaluate(async () => {
    window.__rolls.length = 0;
    logRoll('Second Wind', 9, '1d10 [6] + 3 = 9 HP healed');
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50));
    const a = window.__rolls[0];
    window.__rolls.length = 0;
    hearthDiceRoll({ label: 'Chaos Flare', groups: [{ sides: 100, values: [100] }], total: 100 });
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50));
    const c = window.__rolls[0];
    window.__rolls.length = 0;
    logRoll('Backup exported', 'Saved', 'Brin');  // not a roll
    await new Promise(r => setTimeout(r, 300));
    return { a, c, none: window.__rolls.length };
  });
  check('logRoll "1d10 [6]" animates a d10 showing 6, total 9', misc.a.o.results[0] === 6 && misc.a.o.dice[0].type === 'd10' && misc.a.o.total === '9' && flat(misc.a.res.landed)[0] === '6');
  check('d100 = 100 shows 00 + 0', JSON.stringify(misc.c.res.landed) === '[["00","0"]]', misc.c.res.landed);
  check('non-roll log lines do not animate', misc.none === 0);

  // ---- death saves: rolled (big) vs entered by hand (manual, no animation) ----
  await p.evaluate(() => { const ch = getCharacter(state.activeCharId); ch.currentHp = 0; saveCharacter(ch); state.ui.deathSaves = { successes: 0, failures: 0 }; window.__rolls.length = 0; render(); });
  await p.waitForSelector('.death-save-roll-btn');
  await p.evaluate(() => document.querySelector('.death-save-roll-btn').click());
  await p.waitForFunction(() => window.__rolls[0] && window.__rolls[0].res, null, { timeout: 15000 });
  const ds = await p.evaluate(() => ({ r: window.__rolls[0], feed: rollFeedLoad()[0] }));
  check('death save: big roll, deathSave flag, value matches feed', ds.r.o.deathSave && ds.r.o.big && ds.feed.label === 'Death Save' && ds.feed.dice === `1d20 [${ds.r.o.results[0]}]`, ds.r.o);
  const manual = await p.evaluate(async () => {
    window.__rolls.length = 0; render(); await new Promise(r => setTimeout(r, 100));
    const b = document.querySelector('[data-ds-roll-value]'); if (!b) return { missing: true };
    const val = b.dataset.dsRollValue; b.click(); await new Promise(r => setTimeout(r, 300));
    return { val, calls: window.__rolls.length, feed: rollFeedLoad()[0] };
  });
  check('manual death-save entry: logged + flagged manual, not animated', !manual.missing && manual.calls === 0 && manual.feed.manual === true && manual.feed.dice === `1d20 [${manual.val}]`, manual);
  await p.evaluate(() => { try { dismissDeathOutcome(); } catch (e) {} const ch = getCharacter(state.activeCharId); ch.currentHp = maxHp(ch); saveCharacter(ch); state.ui.deathSaves = null; state.ui.deathOutcome = null; render(); });

  // ---- settings: off, colours following the theme, reduced motion ----
  const st = await p.evaluate(async () => {
    const out = {};
    out.defaults = hearthDicePrefs();
    hearthDiceSetPref('diceAnim', 'off'); window.__rolls.length = 0;
    hearthDiceRoll({ label: 'Off', groups: [{ sides: 20, values: [11] }], total: 11 });
    await new Promise(r => setTimeout(r, 400)); out.offCalls = window.__rolls.length; out.offOverlay = !!document.querySelector('.hd-ov');
    hearthDiceSetPref('diceAnim', 'on');
    hearthDiceSetPref('palette', 'infernal'); out.infernal = HearthDice.getState().theme;
    hearthDiceSetPref('palette', 'moonsilver'); out.moon = HearthDice.getState().theme;
    hearthDiceSetPref('diceColour', 'forest'); out.forced = HearthDice.getState().theme;
    hearthDiceSetPref('diceColour', 'auto'); hearthDiceSetPref('palette', ''); hearthDiceSetPref('theme', 'light');
    out.light = HearthDice.getState().theme;
    hearthDiceSetPref('diceSize', 'compact'); out.compact = HearthDice.getState().mode; hearthDiceSetPref('diceSize', 'full'); hearthDiceSetPref('theme', 'dark'); hearthDiceSetPref('palette', 'hearth'); out.hearth = HearthDice.getState().theme;
    return out;
  });
  check('defaults: animated, match theme, full screen, big screen OFF', st.defaults.anim === 'on' && st.defaults.colour === 'auto' && st.defaults.size === 'full' && st.defaults.projector === 'off', st.defaults);
  check('animations off: no 3D dice', st.offCalls === 0 && !st.offOverlay, st);
  check('dice colours follow the theme (infernal, moonsilver→frost, manual pick, light→oldmap)', st.infernal === 'infernal' && st.moon === 'frost' && st.forced === 'forest' && st.light === 'oldmap' && st.compact === 'compact' && st.hearth === 'tavern', st);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await p.evaluate(async () => { window.__rolls.length = 0; hearthDiceRoll({ label: 'RM', groups: [{ sides: 20, values: [5] }], total: 5 }); while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50)); return window.__rolls[0]; });
  check('reduced motion respected (OS setting)', rm.o.reducedMotion === true && flat(rm.res.landed)[0] === '5');
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  const rm2 = await p.evaluate(async () => { hearthDiceSetPref('motion', 'reduced'); applyPrefsToBody(); window.__rolls.length = 0; hearthDiceRoll({ label: 'RM', groups: [{ sides: 20, values: [5] }], total: 5 }); while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50)); const r = window.__rolls[0]; hearthDiceSetPref('motion', ''); applyPrefsToBody(); return r; });
  check('reduced motion respected (in-app setting)', rm2.o.reducedMotion === true);

  // Settings screenshot
  await p.evaluate(() => { setActiveTab('character'); state.ui.homePanel = 'settings'; render(); });
  await p.waitForTimeout(400);
  // UI polish: the new Settings shows one section at a time on desktop; open its Dice section (old layout: scroll to it)
  await p.evaluate(() => { const s = document.querySelector('[data-u-act="set-sec"][data-v="dice"]'); if (s) s.click(); const l = [...document.querySelectorAll('.forge-section-label')].find(x => x.textContent.trim() === 'Dice'); l && l.scrollIntoView(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: SHOTS + '03-settings-dice.png' });
  check('Settings shows Dice section with big-screen Off selected', await p.evaluate(() => !!document.querySelector('[data-dice-pref="diceProjector"][data-dice-val="off"].selected') && document.querySelectorAll('[data-dice-pref="diceColour"]').length === 10));
  await p.click('[data-dice-pref="diceProjector"][data-dice-val="ask"]');
  check('Settings click saves big-screen mode', await p.evaluate(() => loadPrefs().diceProjector === 'ask' && HearthDice.getState().projectorMode === 'ask'));
  await p.evaluate(() => hearthDiceSetPref('diceProjector', 'off'));

  // ---- big screen: opt-in only, wired to the projector window ----
  await p.evaluate(() => { localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); setActiveTab('dm'); state.ui.homePanel = null; render(); });
  const [proj] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
  await proj.setViewportSize({ width: 1280, height: 720 }); await proj.waitForTimeout(600);
  await p.evaluate(() => { window.__pj = []; const c = new BroadcastChannel('hearth-projector-map'); c.onmessage = (e) => { if (e.data && e.data.type === 'hearth-dice') window.__pj.push(e.data); }; });
  const rollAndWait = (spec) => p.evaluate(async (spec) => { window.__rolls.length = 0; const pr = hearthDiceRoll(spec); while (!window.__rolls[0]) await new Promise(r => setTimeout(r, 30)); let w = 0; while (!document.querySelector('.hd-proj') && w++ < 40) await new Promise(r => setTimeout(r, 50)); const btn = !!document.querySelector('.hd-proj'); HearthDice.skip(); await pr; await new Promise(r => setTimeout(r, 150)); return { btn, pj: window.__pj.length, o: window.__rolls[0].o }; }, spec);
  const off20 = await rollAndWait({ who: 'DM', label: 'Ogre attack', groups: [{ sides: 20, values: [20] }], total: '27 to hit' });
  check('big screen OFF (default): nat 20 not projected, no button', off20.pj === 0 && !off20.btn, off20);
  // UI polish — the old 'important' mode is gone: asking for it gives 'ask', so even a nat 20 waits for the button.
  await p.evaluate(() => hearthDiceSetPref('diceProjector', 'important'));
  const imp7 = await rollAndWait({ who: 'DM', label: 'Goblin save', groups: [{ sides: 20, values: [7] }], total: 9 });
  const imp20 = await p.evaluate(async () => { window.__rolls.length = 0; const pr = hearthDiceRoll({ who: 'DM', label: 'Ogre attack', groups: [{ sides: 20, values: [20] }], total: '27 to hit' }); let w = 0; while (!document.querySelector('.hd-proj.on') && w++ < 80) await new Promise(r => setTimeout(r, 50)); const auto = window.__pj.length; const btn = document.querySelector('.hd-proj'); if (btn) btn.click(); await new Promise(r => setTimeout(r, 300)); const pj = window.__pj.length; HearthDice.skip(); await pr; await new Promise(r => setTimeout(r, 150)); return { pref: hearthDicePrefs().projector, saved: loadPrefs().diceProjector, auto, btn: !!btn, pj }; });
  check("'important' is treated as 'ask': nat 20 not projected by itself, only after its Show button is tapped", imp20.pref === 'ask' && imp20.saved === 'ask' && imp20.auto === 0 && imp20.btn && imp20.pj === 1 && imp7.pj === 0 && imp7.btn, { imp20, imp7 });
  await proj.waitForTimeout(400);
  await proj.screenshot({ path: SHOTS + '04-projector-nat20.png' });
  check('projector window shows the roll', await proj.evaluate(() => { const e = document.getElementById('pjDice'); return !!e && /27 to hit/.test(e.textContent) && /Natural 20/.test(e.textContent); }));
  await p.evaluate(() => hearthDiceSetPref('diceProjector', 'ask'));
  const askRes = await p.evaluate(async () => { window.__rolls.length = 0; window.__pj.length = 0; const pr = hearthDiceRoll({ who: 'DM', label: 'Dragon breath', groups: [{ sides: 6, values: [6, 5, 4] }], total: 15, boss: true }); await new Promise(r => setTimeout(r, 200)); while (!document.querySelector('.hd-proj.on')) await new Promise(r => setTimeout(r, 50)); const before = window.__pj.length; document.querySelector('.hd-proj').click(); await new Promise(r => setTimeout(r, 300)); const txt = document.querySelector('.hd-proj').textContent; HearthDice.skip(); await pr; return { before, after: window.__pj.length, txt }; });
  check('ask-each-time: nothing sent until "Show on big screen" is tapped', askRes.before === 0 && askRes.after === 1 && /Sent to big screen/.test(askRes.txt), askRes);
  await p.evaluate(() => { HearthDice.setSpeed(0.5); window.__rolls.length = 0; hearthDiceRoll({ who: 'DM', label: 'Perception', groups: [{ sides: 20, values: [14] }], total: 17 }); });
  await p.waitForSelector('.hd-proj.on', { timeout: 15000 });
  await p.screenshot({ path: SHOTS + '05-show-on-big-screen-button.png' });
  await p.evaluate(() => { HearthDice.skip(); HearthDice.setSpeed(4); hearthDiceSetPref('diceProjector', 'off'); });
  const noProj = await p.evaluate(async () => { window._hearthProjWin.close(); await new Promise(r => setTimeout(r, 200)); hearthDiceSetPref('diceProjector', 'ask'); window.__rolls.length = 0; const pr = hearthDiceRoll({ label: 'x', groups: [{ sides: 20, values: [3] }], total: 3 }); while (!window.__rolls[0]) await new Promise(r => setTimeout(r, 30)); const o = window.__rolls[0].o; HearthDice.skip(); await pr; hearthDiceSetPref('diceProjector', 'off'); return o.projector; });
  check('no big screen open: no button offered', noProj === false, noProj);

  // ---- DM monster attack + initiative ----
  const atk = await p.evaluate(async () => {
    window.__rolls.length = 0;
    const btn = document.createElement('button'); btn.dataset.atkHit = '4'; btn.dataset.atkDmg = '1,6,2,slashing;2,4,0,fire'; btn.dataset.atkName = 'Scimitar';
    hearthRollAttack(btn);
    while (!window.__rolls[0] || !window.__rolls[0].res) await new Promise(r => setTimeout(r, 50));
    return { r: window.__rolls[0], log: state.ui.dmRollLog[0].html, feed: rollFeedLoad()[0] };
  });
  const toHit = parseInt(/to hit <b>(\d+)/.exec(atk.log)[1], 10), dmgSum = parseInt(/<b>(\d+)<\/b> dmg/.exec(atk.log)[1], 10);
  const nd = atk.r.o.dice.map(d => d.type + 'x' + d.count).join(',');
  check('DM monster attack: d20 + damage dice animated, totals match the DM log', (nd === 'd20x1,d6x1,d4x2' || nd === 'd20x1,d6x2,d4x4') && atk.r.o.total === `${toHit} to hit · ${dmgSum} dmg` && atk.feed.who === 'DM', { nd, total: atk.r.o.total, log: atk.log });

  // ---- DM roll log panel ----
  await p.evaluate(() => {
    const now = Date.now();
    [{ who: 'Zariel', label: 'Longsword attack', dice: '1d20 [20]', total: '26', nat: 20 }, { who: 'Sir Oswin', label: 'Wisdom save', dice: '1d20 [1]', total: '3', nat: 1 },
     { who: 'Zariel', label: 'Death Save', dice: '1d20 [12]', total: '12', manual: true }, { who: 'Sir Oswin', label: 'Damage', dice: '2d6 [3, 5]', total: '11' }]
      .forEach((e, i) => rollFeedAdd(Object.assign({ id: 'test' + i, ts: now - (4 - i) * 30000, nat: null, manual: false, linked: true }, e)));
    render();
  });
  await p.setViewportSize({ width: 1100, height: 800 });
  await p.click('.dm-rolllog-btn');
  await p.waitForSelector('#hearthRollLog .rl-row');
  await p.screenshot({ path: SHOTS + '06-dm-roll-log.png' });
  const rl = await p.evaluate(() => ({ rows: document.querySelectorAll('#hearthRollLog .rl-row').length, n20: document.querySelectorAll('#hearthRollLog .rl-row.nat20').length, n1: document.querySelectorAll('#hearthRollLog .rl-row.nat1').length, man: document.querySelectorAll('#hearthRollLog .rl-row.manual .rl-manual').length, time: (document.querySelector('#hearthRollLog .rl-time') || {}).textContent }));
  check('roll log: rows with time, nat 20 / nat 1 highlighted, manual flagged', rl.rows >= 4 && rl.n20 >= 1 && rl.n1 >= 1 && rl.man >= 1 && /\d{2}:\d{2}:\d{2}/.test(rl.time), rl);
  await p.selectOption('[data-roll-log-filter]', 'Zariel');
  await p.waitForTimeout(150);
  const fz = await p.evaluate(() => [...document.querySelectorAll('#hearthRollLog .rl-who')].map(e => e.textContent));
  check('roll log: filter by player', fz.length === 2 && fz.every(w => w === 'Zariel'), fz);
  await p.screenshot({ path: SHOTS + '07-dm-roll-log-filtered.png' });
  await p.click('[data-roll-log-clear]');
  await p.waitForSelector('.confirm-backdrop');
  await p.screenshot({ path: SHOTS + '08-dm-roll-log-clear-confirm.png' });
  await p.evaluate(() => { const b = [...document.querySelectorAll('.confirm-backdrop button')].find(x => /yes|clear|ok|confirm/i.test(x.textContent)) || document.querySelector('.confirm-backdrop .btn.primary, .confirm-backdrop .btn.danger'); b.click(); });
  await p.waitForTimeout(200);
  check('roll log: clear (with confirmDialog)', await p.evaluate(() => rollFeedLoad().length === 0 && /No rolls yet/.test(document.getElementById('hearthRollLog').textContent)));
  await p.click('[data-roll-log-close]');

  // ---- credits ----
  await p.evaluate(() => hearthOpenLegal());
  await p.waitForTimeout(300);
  const leg = await p.evaluate(() => document.querySelector('.hearth-legal').textContent);
  check('About & legal credits three.js r158 + cannon-es 0.20.0 (MIT)', /three\.js r158 — MIT/.test(leg) && /cannon-es 0\.20\.0 — MIT/.test(leg));
  await p.evaluate(() => { const l = [...document.querySelectorAll('.hearth-legal li')].find(x => /three\.js/.test(x.textContent)); l && l.scrollIntoView(); });
  await p.screenshot({ path: SHOTS + '09-credits.png' });
  const legalHtml = await p.evaluate(async () => (await fetch('/legal.html')).text());
  check('legal.html lists three.js + cannon-es', /three\.js<\/a> r158/.test(legalHtml) && /cannon-es<\/a> 0\.20\.0/.test(legalHtml));

  // ---- offline: dice load from the service-worker cache ----
  const ctx2 = await b.newContext({ viewport: { width: 412, height: 860 } });
  const o = await ctx2.newPage();
  await o.goto(URL); await o.evaluate(() => { localStorage.setItem('hearth.welcomeSeen', '1'); });
  const cached = await o.waitForFunction(async () => { const n = await caches.keys(); if (!n.includes('hearth-v1.7.1')) return false; const c = await caches.open('hearth-v1.7.1'); return !!(await c.match(new URL('dice/three.min.js', location.href).href)) && !!(await c.match(new URL('dice/dice-worker.js', location.href).href)); }, null, { timeout: 30000, polling: 500 }).then(() => true).catch(() => false);
  check('dice files precached by /app/sw.js', cached);
  const controlled = await o.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).then(() => true).catch(() => false);
  check('app page controlled by /app/sw.js', controlled);
  await ctx2.setOffline(true);
  await o.reload(); await o.waitForTimeout(800);
  const off = await o.evaluate(async () => { try { await hearthDiceLoad(); const r = await HearthDice.roll({ dice: [{ type: 'd6', count: 4 }], results: [6, 6, 1, 2], total: '15' }); return { ok: true, landed: r.landed, via: HearthDice._lastPlanVia }; } catch (e) { return { ok: false, e: String(e) }; } });
  check('offline: dice + worker load from cache and roll', off.ok && JSON.stringify(off.landed) === '[["6"],["6"],["1"],["2"]]' && off.via === 'worker', off);
  await ctx2.close();

  const realErrs = errs.filter(e => !/favicon|net::ERR|Failed to load resource|ERR_INTERNET_DISCONNECTED|gstatic|firebase/i.test(e));
  check('no page errors', realErrs.length === 0, realErrs.slice(0, 5));
  await b.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
