// Hearth v1.6.0 DM roll log over the live game link (real PeerJS broker).
// Serve the repo root (python3 -m http.server 8816), then: node tests/rolllog160.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const SHOTS = process.env.SHOTS || '/workspace/dice-160/shots/';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
async function waitFor(p, fn, arg, ms = 30000) { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 200 }); return true; } catch (e) { return false; } }

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  async function mk(label, w, h) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); p.setDefaultTimeout(15000);
    p.on('pageerror', e => errs.push(label + ' ' + e.message));
    await p.goto(URL); await p.waitForTimeout(600);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done'); localStorage.setItem('hearth.prefs.v1', JSON.stringify({ diceAnim: 'off' })); });
    await p.reload(); await p.waitForTimeout(600);
    p.ctx = ctx; return p;
  }
  const dm = await mk('DM', 1300, 860);
  const p1 = await mk('P1', 412, 860);
  const p2 = await mk('P2', 412, 860);
  const mkChar = (p, name) => p.evaluate((name) => { const d = generateRandomCharacter(); Object.assign(d, { name, race: 'human', subrace: null, klass: 'fighter', subclass: null, level: 3, classLevels: { fighter: 3 } }); saveCharacter(d); const ch = getCharacter(d.id); ch.currentHp = maxHp(ch); saveCharacter(ch); state.activeCharId = null; render(); return d.id; }, name);
  const id1 = await mkChar(p1, 'Mira <i>Vale</i>'); const id2 = await mkChar(p2, 'Doran');

  await dm.evaluate(() => { localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); setActiveTab('dm'); render(); });
  // DM's own local roll BEFORE any live game: works offline
  await dm.evaluate(() => hearthDiceRoll({ label: 'Goblin stealth', groups: [{ sides: 20, values: [9] }], total: 11 }));
  check('offline/local: DM roll logged with no live game', await dm.evaluate(() => rollFeedLoad()[0].who === 'DM' && rollFeedLoad()[0].label === 'Goblin stealth'));

  await dm.click('[data-dm-link-open]'); await dm.waitForSelector('[data-dm-link-start]'); await dm.click('[data-dm-link-start]');
  const live = await waitFor(dm, () => HearthLink.host && HearthLink.host.status === 'live');
  const code = await dm.evaluate(() => HearthLink.host.code);
  check('DM live game started', live, code);
  await dm.click('#dmLinkClose').catch(() => {});
  async function join(p, cid) {
    await p.goto(URL + '?join=' + encodeURIComponent(code)); await p.waitForSelector('#hearthLinkJoin');
    await p.check(`input[name="linkJoinChar"][value="${cid}"]`); await p.click('#linkJoinGo');
    await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 }); await dm.click('[data-link-accept="yes"]');
    return waitFor(p, () => HearthLink.join && HearthLink.join.status === 'linked');
  }
  check('P1 linked', await join(p1, id1));
  check('P2 linked', await join(p2, id2));

  // P1: a real roll through the roll dialog (initiative)
  await p1.evaluate(() => { const b = [...document.querySelectorAll('[data-stat-roll-flat]')].find(x => /init/i.test(x.textContent)); b.click(); });
  await p1.waitForSelector('[data-roll-line="0"]'); await p1.click('[data-roll-line="0"]');
  const p1Roll = await p1.evaluate(() => { const l = state.ui.rollDialog.lines[0]; return { detail: l.rollDetail, total: l.result }; });
  const got1 = await waitFor(dm, () => rollFeedLoad().some(e => e.label === 'Initiative' && e.linked), null, 15000);
  const e1 = await dm.evaluate(() => rollFeedLoad().find(e => e.label === 'Initiative' && e.linked));
  const d20 = /\[(\d+)\]/.exec(p1Roll.detail)[1];
  check('P1 initiative reaches the DM log: player, label, dice, total, time', got1 && e1.who === 'Mira <i>Vale</i>' && e1.dice === `1d20 [${d20}]` && e1.total === String(p1Roll.total) && Math.abs(Date.now() - e1.ts) < 60000, e1);

  // P2: nat 20 + nat 1 + manual death save, and a spoofed name
  await p2.evaluate(() => {
    hearthDiceRoll({ label: 'Longsword attack', groups: [{ sides: 20, values: [20] }], total: 25 });
    hearthDiceRoll({ label: 'Dex save', groups: [{ sides: 20, values: [1] }], total: 3 });
    hearthDiceRoll({ label: 'Death Save', groups: [{ sides: 20, values: [14] }], total: 14, deathSave: true, manual: true });
    HearthLink.join.conn.send({ t: 'roll', roll: { id: 'spoof1', who: 'DM', label: '<img src=x onerror=alert(1)>', dice: '1d20 [20]', total: 99, nat: 20 } });
  });
  const got2 = await waitFor(dm, () => rollFeedLoad().filter(e => e.who === 'Doran').length >= 4, null, 15000);
  const e2 = await dm.evaluate(() => rollFeedLoad().filter(e => e.who === 'Doran'));
  check('P2 rolls arrive: nat 20, nat 1, manual flag', got2 && e2.some(e => e.label === 'Longsword attack' && e.nat === 20) && e2.some(e => e.label === 'Dex save' && e.nat === 1) && e2.some(e => e.label === 'Death Save' && e.manual === true), e2.map(e => [e.label, e.nat, e.manual]));
  check('spoofed "who" ignored: DM shows the accepted player name', e2.some(e => /img/.test(e.label)) && !(await dm.evaluate(() => rollFeedLoad().some(e => e.linked && e.who === 'DM'))));

  // DM log UI
  await dm.evaluate(() => render());
  await dm.click('.dm-rolllog-btn'); await dm.waitForSelector('#hearthRollLog .rl-row');
  const ui = await dm.evaluate(() => ({ n20: document.querySelectorAll('#hearthRollLog .rl-row.nat20').length, n1: document.querySelectorAll('#hearthRollLog .rl-row.nat1').length, man: document.querySelectorAll('#hearthRollLog .rl-manual').length, img: !!document.querySelector('#hearthRollLog img'), names: [...document.querySelectorAll('#hearthRollLog [data-roll-log-filter] option')].map(o => o.value) }));
  check('DM log: highlights + manual flag + names escaped', ui.n20 >= 1 && ui.n1 >= 1 && ui.man >= 1 && !ui.img && ui.names.includes('Mira <i>Vale</i>') && ui.names.includes('Doran') && ui.names.includes('DM'), ui);
  await dm.screenshot({ path: SHOTS + '10-dm-roll-log-live-game.png' });
  // live update while open
  await p1.evaluate(() => hearthDiceRoll({ label: 'Athletics', groups: [{ sides: 20, values: [12] }], total: 17 }));
  check('open log updates live', await waitFor(dm, () => /Athletics/.test(document.getElementById('hearthRollLog').textContent), null, 15000));
  await dm.selectOption('[data-roll-log-filter]', 'Doran'); await dm.waitForTimeout(200);
  const f = await dm.evaluate(() => [...document.querySelectorAll('#hearthRollLog .rl-who')].map(e => e.textContent));
  check('filter by player', f.length >= 4 && f.every(w => w === 'Doran'), f);
  await dm.screenshot({ path: SHOTS + '11-dm-roll-log-filter-doran.png' });

  // big-screen relay: DM opt-in required
  await dm.evaluate(() => { window.__pj = []; const c = new BroadcastChannel('hearth-projector-map'); c.onmessage = e => { if (e.data && e.data.type === 'hearth-dice') window.__pj.push(e.data); }; });
  const [proj] = await Promise.all([dm.ctx.waitForEvent('page'), dm.evaluate(() => openProjectorWindow(loadEncounter()))]);
  await proj.waitForTimeout(500);
  const sendProj = () => p2.evaluate(() => { const e = hearthRecordRoll({ label: 'Smite', groups: [{ sides: 8, values: [8, 8] }], total: 16 }); setTimeout(() => HearthLink.join.conn.send({ t: 'rollproj', id: e.id }), 300); });
  await sendProj(); await dm.waitForTimeout(2500);
  check('player big-screen request ignored while DM big screen is OFF', await dm.evaluate(() => window.__pj.length === 0));
  await dm.evaluate(() => hearthDiceSetPref('diceProjector', 'ask'));
  await sendProj();
  check('player roll shown on the DM projector once DM opted in', await waitFor(dm, () => window.__pj.length === 1 && window.__pj[0].who === 'Doran' && window.__pj[0].label === 'Smite', null, 10000));
  await proj.waitForTimeout(300); await proj.screenshot({ path: SHOTS + '12-projector-player-roll.png' });

  // reconnect queue: rolls made while the link is down are delivered later
  await p1.evaluate(() => { HearthLink.join.conn.close(); });
  await p1.waitForTimeout(300);
  await p1.evaluate(() => hearthDiceRoll({ label: 'While away', groups: [{ sides: 6, values: [4] }], total: 4 }));
  check('roll made while reconnecting is delivered after rejoin', await waitFor(dm, () => rollFeedLoad().some(e => e.label === 'While away' && e.linked), null, 45000), await p1.evaluate(() => ({ st: HearthLink.join.status, q: hearthRollQueue.length })), await dm.evaluate(() => rollFeedLoad().slice(0, 4).map(e => e.label + '|' + e.who)));

  // clear
  await dm.selectOption('[data-roll-log-filter]', '');
  await dm.click('[data-roll-log-clear]'); await dm.waitForSelector('.confirm-backdrop');
  await dm.evaluate(() => { const b = [...document.querySelectorAll('.confirm-backdrop button')].find(x => /yes|clear|ok|confirm/i.test(x.textContent)) || document.querySelector('.confirm-backdrop .btn.primary, .confirm-backdrop .btn.danger'); b.click(); });
  check('DM can clear the log', await waitFor(dm, () => rollFeedLoad().length === 0, null, 3000));

  check('no page errors', errs.length === 0, errs.slice(0, 4));
  await b.close();
  const fl = results.filter(r => !r.ok); console.log(`\n${results.length - fl.length}/${results.length} passed`); process.exit(fl.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
