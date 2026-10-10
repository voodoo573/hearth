// Hearth v1.1.0 live game link: DM + players in separate browser contexts,
// over the real PeerJS public broker. Run: node link.test.js [port]
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8811';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const SHOTS = '/workspace/game-link-shots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); }
async function waitFor(p, fn, arg, ms = 30000) { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 200 }); return true; } catch (e) { return false; } }

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  async function mk(label, w, h) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.label = label;
    p.on('pageerror', e => errs.push(label + ' PAGE ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(label + ' console ' + m.text().slice(0, 200)); });
    await p.goto(URL); await p.waitForTimeout(800);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); });
    await p.reload(); await p.waitForTimeout(700);
    return p;
  }
  const dm = await mk('DM', 1400, 900);
  const p1 = await mk('P1', 412, 860);
  const p2 = await mk('P2', 412, 860);
  const p3 = await mk('P3', 412, 860);

  const makeChar = (p, spec) => p.evaluate((spec) => {
    const d = generateRandomCharacter();
    Object.assign(d, spec.fields);
    if (spec.base) Object.assign(d.base, spec.base);
    d.conditions = []; d.tempHp = spec.temp || 0;
    saveCharacter(d);
    const ch = getCharacter(d.id); ch.currentHp = maxHp(ch); saveCharacter(ch);
    state.activeCharId = null; render();
    return { id: d.id, hp: ch.currentHp, max: maxHp(ch), ac: ac(ch), auras: linkCharAuras(ch), resist: characterDamageResistances(ch).map(r => r.type) };
  }, spec);
  const c1 = await makeChar(p1, { fields: { name: 'Zariel <b>Ash</b>', race: 'tiefling', subrace: null, klass: 'fighter', subclass: null, level: 3, classLevels: { fighter: 3 } }, temp: 3 });
  const c2 = await makeChar(p2, { fields: { name: 'Sir Oswin', race: 'human', subrace: null, klass: 'paladin', subclass: 'devotion', subclasses: { paladin: 'devotion' }, level: 6, classLevels: { paladin: 6 } }, base: { cha: 16 } });
  const c3 = await makeChar(p3, { fields: { name: 'Gate Crasher', race: 'human', subrace: null, klass: 'rogue', level: 2, classLevels: { rogue: 2 } } });
  check('characters created', c1.resist.includes('fire') && c2.auras.some(a => a.id === 'protection'), { c1, c2: { auras: c2.auras } });

  // ---- DM: encounter with a goblin, start a live game ----
  await dm.evaluate(() => {
    localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true }));
    setActiveTab('dm'); render();
    dmEncounterAddCustomMonster('Goblin', 7, 15, 2, '');
    render();
  });
  await dm.waitForTimeout(300);
  await dm.click('[data-dm-link-open]');
  await dm.waitForSelector('[data-dm-link-start]');
  await dm.click('[data-dm-link-start]');
  const live = await waitFor(dm, () => HearthLink.host && HearthLink.host.status === 'live', null, 30000);
  const code = await dm.evaluate(() => HearthLink.host && HearthLink.host.code);
  check('DM starts game (broker reached, code issued)', live && /^HEARTH-[2-9A-HJ-NP-Z]{4}$/.test(code), code);
  await dm.waitForTimeout(500);
  const qr = await dm.evaluate(() => { const s = document.querySelector('.dm-link-qr svg'); return !!s; });
  check('DM panel shows QR + code', qr && (await dm.textContent('#dmLinkCode')) === code);
  await dm.screenshot({ path: SHOTS + '01-dm-live-game-panel.png' });

  // QR content decodes back to the code (jsQR on the rendered QR)
  const qrText = await dm.evaluate(async () => {
    const svg = document.querySelector('.dm-link-qr svg'); const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(xml); await img.decode();
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.drawImage(img, 0, 0, 400, 400);
    const jsQR = await linkLoadVendor('jsqr'); const r = jsQR(x.getImageData(0, 0, 400, 400).data, 400, 400); return r ? r.data : null;
  });
  check('QR decodes to join URL with the code', qrText && qrText.includes('?join=' + code) && linkNormCodeSafe(qrText) === code, qrText);
  await dm.click('#dmLinkClose');

  // ---- P1 joins by typing the code (via the Player menu tile) ----
  await p1.evaluate(() => { state.ui.homeMenu = 'player'; render(); });
  await p1.waitForTimeout(200);
  const tile = await p1.$('[data-home-act="join-game"]');
  if (tile) await tile.click(); else await p1.evaluate(() => linkOpenJoinOverlay());
  check('Player menu has "Join a game" tile', !!tile);
  await p1.waitForSelector('#hearthLinkJoin');
  await p1.fill('#linkJoinCode', code.toLowerCase().replace('-', ' '));
  await p1.check(`input[name="linkJoinChar"][value="${c1.id}"]`);
  await p1.screenshot({ path: SHOTS + '02-player-join-overlay.png' });
  await p1.click('#linkJoinGo');
  const prompt = await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 }).catch(() => null);
  const pTitle = prompt ? await dm.textContent('#hearthLinkAcceptTitle') : null;
  check('DM gets "Accept <name>?" (name escaped)', pTitle === 'Accept Zariel <b>Ash</b>?' && !(await dm.$('#hearthLinkAccept b')), pTitle);
  const waiting = await waitFor(p1, () => HearthLink.join && HearthLink.join.status === 'waiting', null, 5000);
  check('Player sees "waiting for DM" before accept', waiting);
  const notOnBoardYet = await dm.evaluate(() => !loadEncounter().combatants.some(c => c.link));
  check('Nothing linked before accept', notOnBoardYet);
  await dm.screenshot({ path: SHOTS + '03-dm-accept-prompt.png' });
  await dm.click('[data-link-accept="yes"]');
  const linked1 = await waitFor(p1, () => HearthLink.join && HearthLink.join.status === 'linked');
  check('P1 linked after accept', linked1);
  await dm.waitForTimeout(800);
  const dmC1 = await dm.evaluate((id) => { const c = loadEncounter().combatants.find(x => x.link && x.link.charId === id); return c ? { id: c.id, name: c.name, hp: c.hp, maxHp: c.maxHp, ac: c.ac, temp: c.link.snap.temp, resist: c.link.snap.resist } : null; }, c1.id);
  check('P1 auto-added to DM board with HP/AC', dmC1 && dmC1.hp === c1.hp && dmC1.maxHp === c1.max && dmC1.ac === c1.ac, dmC1);

  // ---- P1 changes HP, AC-affecting nothing, conditions -> DM sees it ----
  await p1.evaluate(() => { const j = HearthLink.join; const ch = getCharacter(j.charId); ch.currentHp = ch.currentHp - 4; ch.conditions = ['poisoned']; saveCharacter(ch); });
  const synced = await waitFor(dm, ([id, hp]) => { const c = loadEncounter().combatants.find(x => x.link && x.link.charId === id); return c && c.hp === hp && (c.statuses || []).includes('Poisoned'); }, [c1.id, c1.hp - 4], 8000);
  check('Player HP + condition sync to DM', synced);
  // AC change (shield equipped etc.) -> simulate via a ring of protection style bonus: just force snapshot change
  await p1.evaluate(() => { window.__origAc = ac; ac = (d) => window.__origAc(d) + 2; });
  const acSynced = await waitFor(dm, ([id, a]) => { const c = loadEncounter().combatants.find(x => x.link && x.link.charId === id); return c && c.ac === a; }, [c1.id, c1.ac + 2], 8000);
  check('Player AC change syncs to DM', acSynced);
  await p1.evaluate(() => { ac = window.__origAc; });

  // ---- DM conditions -> player ----
  await dm.evaluate((id) => { const enc = loadEncounter(); const c = enc.combatants.find(x => x.link && x.link.charId === id); c.statuses = ['Poisoned', 'Prone']; saveEncounter(enc); }, c1.id);
  const condLanded = await waitFor(p1, () => { const ch = getCharacter(HearthLink.join.charId); return (ch.conditions || []).includes('prone'); }, null, 8000);
  check('DM-applied condition lands on player sheet', condLanded);

  // ---- DM damage through the UI: 10 fire vs tiefling (resist) with 3 temp HP ----
  await dm.evaluate(() => render());
  await dm.waitForTimeout(300);
  await dm.click(`[data-dm-link-dmg="${dmC1.id}"]`);
  await dm.waitForSelector('#dmLinkDmgAmt');
  await dm.fill('#dmLinkDmgAmt', '10');
  await dm.click('[data-dm-link-dtype="fire"]');
  await dm.waitForTimeout(150);
  const preview = await dm.textContent('#dmLinkDmgPreview');
  check('DM damage preview shows resistance', /10 fire → 5 \(resistant, halved\)/.test(preview), preview);
  await dm.screenshot({ path: SHOTS + '04-dm-damage-dialog.png' });
  const hpBefore = await p1.evaluate(() => getCharacter(HearthLink.join.charId).currentHp);
  await dm.click('[data-dm-link-apply="damage"]');
  const dmToast = await dm.waitForSelector('text=/−5 fire/', { timeout: 4000 }).then(() => true).catch(() => false);
  const landed = await waitFor(p1, (hp) => { const ch = getCharacter(HearthLink.join.charId); return ch.currentHp === hp - 2 && (ch.tempHp || 0) === 0; }, hpBefore, 8000);
  const p1Toast = await p1.waitForSelector('text=/DM: −5 fire/', { timeout: 4000 }).then(() => true).catch(() => false);
  check('Damage: 10 fire → 5 (resist), 3 absorbed by temp HP, −2 HP on player sheet', landed, { hpBefore, after: await p1.evaluate(() => { const ch = getCharacter(HearthLink.join.charId); return [ch.currentHp, ch.tempHp]; }) });
  check('Player sees toast "DM: −5 fire"; DM sees result', p1Toast && dmToast, { p1Toast, dmToast });
  await p1.screenshot({ path: SHOTS + '05-player-damage-toast.png' });
  const dmAfter = await dm.evaluate((id) => { const c = loadEncounter().combatants.find(x => x.id === id); return { hp: c.hp, seq: c.link.dmSeq, ack: c.link.ack }; }, dmC1.id);
  await dm.waitForTimeout(1600);
  const dmAfter2 = await dm.evaluate((id) => { const c = loadEncounter().combatants.find(x => x.id === id); return { hp: c.hp, seq: c.link.dmSeq, ack: c.link.ack }; }, dmC1.id);
  check('DM HP matches player after ack', dmAfter2.hp === hpBefore - 2 && dmAfter2.ack === dmAfter2.seq, { dmAfter, dmAfter2 });

  // ---- P2 (paladin) joins by ?join= link ----
  await p2.goto(URL + '?join=' + encodeURIComponent(code));
  await p2.waitForSelector('#hearthLinkJoin');
  const pre = await p2.inputValue('#linkJoinCode');
  check('?join= link opens the join overlay prefilled', pre === code, pre);
  await p2.check(`input[name="linkJoinChar"][value="${c2.id}"]`);
  await p2.click('#linkJoinGo');
  await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 });
  await dm.click('[data-link-accept="yes"]');
  check('P2 linked', await waitFor(p2, () => HearthLink.join && HearthLink.join.status === 'linked'));
  await dm.waitForTimeout(800);

  // ---- Auras: place tokens, check ring + save bonus inside vs outside ----
  const auraRes = await dm.evaluate(([id1, id2]) => {
    const enc = loadEncounter();
    const a = enc.combatants.find(x => x.link && x.link.charId === id1), p = enc.combatants.find(x => x.link && x.link.charId === id2), g = enc.combatants.find(x => x.name === 'Goblin');
    p.mapX = 5; p.mapY = 5; a.mapX = 7; a.mapY = 6; g.mapX = 6; g.mapY = 5; g.disposition = 'hostile';
    saveEncounter(enc);
    const e2 = loadEncounter();
    const A = e2.combatants.find(x => x.id === a.id), G = e2.combatants.find(x => x.id === g.id);
    const inside = dmSaveParts(A, 'dex', e2);
    const gob = dmSaveParts(G, 'dex', e2);
    return { inside, gob, dist: dmCellDistanceFt(e2.combatants.find(x => x.id === p.id), A) };
  }, [c1.id, c2.id]);
  check('Save bonus inside Aura of Protection (10 ft)', auraRes.inside && auraRes.inside.aura && auraRes.inside.aura.bonus === 3, auraRes);
  check('Hostile goblin inside the aura gets no bonus', !auraRes.gob || !auraRes.gob.aura, auraRes.gob);
  await dm.evaluate(() => { state.ui.dmMapMode = true; render(); });
  await dm.waitForTimeout(600);
  const ring = await dm.evaluate((id2) => { const enc = loadEncounter(); const p = enc.combatants.find(x => x.link && x.link.charId === id2); const t = document.querySelector(`.map-token[data-map-token="${p.id}"] .map-token-aura, [data-map-token="${p.id}"] .map-token-aura`) || document.querySelector('.map-token-aura'); return t ? { w: t.getBoundingClientRect().width, cls: t.className, n: document.querySelectorAll('.map-token-aura').length } : null; }, c2.id);
  check('Aura ring drawn on DM map', ring && ring.n === 1 && ring.w > 40, ring);
  const ms = await dm.evaluate(() => { const s = buildMapState(loadEncounter()); return (s.tokens || []).filter(t => t.aura).map(t => ({ n: t.name, a: t.aura })); });
  check('Projector map state carries the aura', ms.length === 1 && ms[0].a.r === 10, ms);
  // Save roll via the UI (map view), inside the aura
  await dm.click(`[data-dm-save-open="${dmC1.id}"]`).catch(async () => { await dm.evaluate((id) => { state.ui.dmSaveFor = id; render(); }, dmC1.id); });
  await dm.waitForSelector('[data-dm-save-roll="dex"]');
  await dm.click('[data-dm-save-roll="dex"]');
  const rollTxt = await dm.textContent('#dmSaveResult');
  check('DM save roll text shows +3 Aura of Protection (Sir Oswin)', /\+3 Aura of Protection \(Sir Oswin\)/.test(rollTxt), rollTxt);
  await dm.screenshot({ path: SHOTS + '06-dm-map-aura-ring-and-save.png' });
  await dm.click('[data-dm-save-close]');
  // Move outside: 4 squares away = 20 ft
  const outside = await dm.evaluate((id1) => { const enc = loadEncounter(); const a = enc.combatants.find(x => x.link && x.link.charId === id1); a.mapX = 9; a.mapY = 5; saveEncounter(enc); const e2 = loadEncounter(); return dmSaveParts(e2.combatants.find(x => x.id === a.id), 'dex', e2); }, c1.id);
  check('No aura bonus outside 10 ft', outside && !outside.aura, outside);
  await dm.evaluate(() => render()); await dm.waitForTimeout(300);
  // Ring follows the token: move the paladin and compare ring centre with token centre
  const follow = await dm.evaluate((id2) => {
    const enc = loadEncounter(); const p = enc.combatants.find(x => x.link && x.link.charId === id2); p.mapX = 3; p.mapY = 3; saveEncounter(enc); render();
    const r = document.querySelector('.map-token-aura').getBoundingClientRect(); const au = document.querySelector('.map-token-aura'); const tk = document.querySelector(`.map-token[data-map-token="${au.dataset.auraFor}"]`); const t = tk.getBoundingClientRect();
    return { dx: Math.abs((r.left + r.width / 2) - (t.left + t.width / 2)), dy: Math.abs((r.top + r.height / 2) - (t.top + t.height / 2)) };
  }, c2.id);
  check('Aura ring follows the token', follow.dx < 3 && follow.dy < 3, follow);
  // Layering: ring sits on its own layer above the map/painted overlay, under the fog/AoE layer and the tokens
  const layer = await dm.evaluate(() => {
    const L = document.querySelector('.dm-aura-layer'), grid = document.getElementById('dmMapGrid');
    if (!L || !grid) return null;
    const kids = [...grid.children], iL = kids.indexOf(L), iSvg = kids.indexOf(document.getElementById('dmAoeLayer'));
    const iTok = kids.findIndex(k => k.classList.contains('map-token'));
    const ov = document.getElementById('dmPaintedOv'), iOv = ov ? kids.indexOf(ov) : -1;
    const tk = document.querySelector(`.map-token[data-map-token="${L.firstElementChild.dataset.auraFor}"]`).getBoundingClientRect();
    const hit = document.elementFromPoint(tk.left + tk.width / 2, tk.top + tk.height / 2);
    return { z: getComputedStyle(L).zIndex, svgZ: getComputedStyle(document.getElementById('dmAoeLayer')).zIndex, iL, iSvg, iTok, iOv, tokenOnTop: !!(hit && hit.closest('.map-token')) };
  });
  check('Aura layer under fog/AoE and tokens', layer && layer.z === '0' && layer.iL < layer.iSvg && layer.iL < layer.iTok && layer.iOv < layer.iL && layer.tokenOnTop, layer);
  // Concentration save on DM side includes the aura once (paladin itself)
  const concB = await dm.evaluate((id2) => { const enc = loadEncounter(); const p = enc.combatants.find(x => x.link && x.link.charId === id2); return { conc: dmConcSaveBonus(p), base: p.link.snap.saves.con }; }, c2.id);
  check('Paladin own CON save = base + aura once', concB.conc === concB.base + 3, concB);

  // ---- Initiative / turn reaches the player ----
  await dm.evaluate(([id1]) => { const enc = loadEncounter(); enc.combatants.forEach((c, i) => { c.init = c.link && c.link.charId === id1 ? 20 : 10 - i; }); enc.started = true; enc.round = 1; enc.turnIdx = 0; saveEncounter(enc); render(); }, [c1.id]);
  const turn = await waitFor(p1, () => HearthLink.join.combat && HearthLink.join.combat.yourTurn === true, null, 8000);
  const p2sees = await waitFor(p2, () => HearthLink.join.combat && HearthLink.join.combat.started && HearthLink.join.combat.order.some(o => o.turn && /Zariel/.test(o.n)), null, 8000);
  check('Initiative + "your turn" shown on players', turn && p2sees);
  await p1.evaluate(() => { HearthLink.ui.barOpen = true; linkRefreshPlayer(); });
  await p1.screenshot({ path: SHOTS + '07-player-your-turn-bar.png' });
  const barEsc = await p1.evaluate(() => !document.querySelector('#hearthLinkBar b'));
  check('Player bar escapes names', barEsc);

  // ---- DM edit wins during combat: DM sets HP while player is offline; replayed on reconnect ----
  // Reconnect after reload (no re-accept)
  const hpPre = await p1.evaluate(() => getCharacter(HearthLink.join.charId).currentHp);
  await p1.reload();
  const reAccept = await dm.waitForSelector('#hearthLinkAccept', { timeout: 6000 }).then(() => true).catch(() => false);
  const relinked = await waitFor(p1, () => HearthLink.join && HearthLink.join.status === 'linked', null, 40000);
  check('Reconnect after reload, no re-accept prompt', relinked && !reAccept, { relinked, reAccept });
  // Queue while away: close P1 connection from the player side abruptly
  await p1.evaluate(() => { const j = HearthLink.join; j._noRetry = true; const c = j.conn; j.conn = null; j.status = 'reconnecting'; if (c) c.close(); });
  await waitFor(dm, (id) => { const d = Object.values(HearthLink.host.devices).find(x => x.charId === id); return d && !d.online; }, c1.id, 10000);
  await dm.evaluate((id) => dmLinkApply(id, 'heal', 2), dmC1.id);
  const dmHpWhileAway = await dm.evaluate((id) => loadEncounter().combatants.find(x => x.id === id).hp, dmC1.id);
  await sleep(1500);
  const dmHpStill = await dm.evaluate((id) => loadEncounter().combatants.find(x => x.id === id).hp, dmC1.id);
  await p1.evaluate(() => { const j = HearthLink.join; linkJoinStart(j.code, j.charId, { resume: true }); });
  const healed = await waitFor(p1, (hp) => HearthLink.join && HearthLink.join.status === 'linked' && getCharacter(HearthLink.join.charId).currentHp === hp + 2, hpPre, 40000);
  await sleep(1600);
  const dmHpEnd = await dm.evaluate((id) => loadEncounter().combatants.find(x => x.id === id).hp, dmC1.id);
  check('DM heal while player away is kept, then replayed once on reconnect', healed && dmHpWhileAway === hpPre + 2 && dmHpStill === hpPre + 2 && dmHpEnd === hpPre + 2, { hpPre, dmHpWhileAway, dmHpStill, dmHpEnd, p1hp: await p1.evaluate(() => getCharacter(HearthLink.join.charId).currentHp) });

  // ---- Rejected join (P3) ----
  await p3.evaluate(() => linkOpenJoinOverlay());
  await p3.fill('#linkJoinCode', code);
  await p3.click('#linkJoinGo');
  await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 });
  const t3 = await dm.textContent('#hearthLinkAcceptTitle');
  await dm.click('[data-link-accept="no"]');
  const rej = await waitFor(p3, () => HearthLink.join && HearthLink.join.status === 'rejected', null, 10000);
  const rejMsg = await p3.textContent('#linkJoinStatus').catch(() => '');
  check('Rejected join: player told, not on DM board', rej && t3 === 'Accept Gate Crasher?' && !(await dm.evaluate(() => loadEncounter().combatants.some(c => c.name === 'Gate Crasher'))), rejMsg);
  await p3.screenshot({ path: SHOTS + '08-player-rejected.png' });

  // ---- Unaccepted peer messages are ignored (raw PeerJS client sends 'state' without hello acceptance) ----
  const spoof = await p3.evaluate(async (code) => {
    const Peer = await linkLoadVendor('peerjs');
    return await new Promise((res) => {
      const peer = new Peer({ config: { iceServers: LINK_STUN } });
      peer.on('open', () => { const dc = peer.connect(LINK_PEER_PREFIX + code.toLowerCase(), { reliable: true, serialization: 'json' }); dc.on('open', () => { dc.send({ t: 'state', ack: 99, char: { id: 'evil', name: 'Evil', hp: 1, maxHp: 1 } }); dc.send({ t: 'hello', v: 1, deviceId: 'bad id!', char: {} }); dc.send('{"t":"x"'); setTimeout(() => { peer.destroy(); res(true); }, 1500); }); });
      peer.on('error', () => res(false));
    });
  }, code);
  await sleep(500);
  const noEvil = await dm.evaluate(() => !loadEncounter().combatants.some(c => c.name === 'Evil') && !document.getElementById('hearthLinkAccept'));
  check('Messages from unaccepted / malformed peers ignored', spoof && noEvil);

  // ---- Kick P2 via the panel + confirmDialog ----
  await dm.click('[data-dm-link-open]');
  await dm.waitForSelector('.dm-link-list');
  await dm.screenshot({ path: SHOTS + '09-dm-players-list.png' });
  const dev2 = await dm.evaluate((id) => Object.values(HearthLink.host.devices).find(d => d.charId === id).deviceId, c2.id);
  await dm.click(`[data-dm-link-kick="${dev2}"]`);
  await dm.click('[data-confirm-yes]');
  const kicked = await waitFor(p2, () => HearthLink.join === null, null, 10000);
  check('Kick: player disconnected', kicked);
  // Kicked device tries again -> rejected as removed, no prompt
  await p2.evaluate((code) => { linkOpenJoinOverlay(code); }, code);
  await p2.click('#linkJoinGo');
  const rej2 = await waitFor(p2, () => HearthLink.join && HearthLink.join.status === 'rejected', null, 30000);
  const noPrompt = !(await dm.$('#hearthLinkAccept'));
  check('Kicked device cannot rejoin without the DM', rej2 && noPrompt, await p2.evaluate(() => HearthLink.join && HearthLink.join.error));
  await dm.click('#dmLinkClose').catch(() => {});

  // ---- Router-isolation message for a bad connection ----
  const isoTxt = await p3.evaluate(() => linkErrorText({ type: 'ice-timeout' }, 'join'));
  check('Connection failure explains router/AP isolation', /AP isolation/.test(isoTxt));
  const noGame = await p3.evaluate(async () => { const r = await linkJoinStart('HEARTH-ZZZZ', loadCharacters()[0].id, {}); return r.error || ''; });
  check('Unknown code gives a clear error', /No game found/.test(noGame), noGame);

  // ---- DM reload resumes the game with the same code; P1 rejoins automatically ----
  await dm.reload();
  const resumed = await waitFor(dm, (code) => HearthLink.host && HearthLink.host.status === 'live' && HearthLink.host.code === code, code, 60000);
  const backOn = await waitFor(dm, (id) => { const d = Object.values(HearthLink.host.devices).find(x => x.charId === id); return d && d.online && d.accepted; }, c1.id, 90000);
  check('DM reload: same code resumes, P1 auto-rejoins without prompt', resumed && backOn && !(await dm.$('#hearthLinkAccept')), { resumed, backOn });

  // ---- End game ----
  await dm.evaluate(() => { setActiveTab('dm'); state.ui.dmLinkPanel = true; render(); });
  await dm.click('[data-dm-link-end]');
  await dm.click('[data-confirm-yes]');
  const ended = await waitFor(p1, () => HearthLink.join === null, null, 10000);
  check('End game disconnects players; tokens stay', ended && await dm.evaluate((id) => loadEncounter().combatants.some(c => c.id === id), dmC1.id));

  const realErrs = errs.filter(e => !/peerjs|PeerJS|Could not connect to peer|peer-unavailable|Lost connection to server|ERR_|WebSocket/i.test(e));
  check('No console/page errors', realErrs.length === 0, errs);
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  require('fs').writeFileSync('/workspace/game-link-work/test/result.json', JSON.stringify({ results, errs }, null, 1));
  await b.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
function linkNormCodeSafe(s) { const m = String(s || '').toUpperCase().match(/HEARTH-?([2-9A-HJ-NP-Z]{4,6})/); return m ? 'HEARTH-' + m[1] : null; }
