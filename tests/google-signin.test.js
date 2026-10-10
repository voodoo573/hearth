// Hearth v1.1.0 optional Google sign-in, against the Firebase Auth + Firestore emulators.
// Needs: site on PORT (default 8811), emulators on 9099 (auth) / 8085 (firestore), PeerJS broker reachable.
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8811';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const SHOTS = '/workspace/game-link-shots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }
async function waitFor(p, fn, arg, ms = 20000) { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }); return true; } catch (e) { return false; } }

(async () => {
  // clear emulator data
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/hearth-ae2e0/accounts', { method: 'DELETE' });
  await fetch('http://127.0.0.1:8085/emulator/v1/projects/hearth-ae2e0/databases/(default)/documents', { method: 'DELETE' });
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  async function mk(label, emu = true, w = 412, h = 860) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.label = label; p.ctx = ctx;
    p.netlog = [];
    p.on('request', r => p.netlog.push(r.url()));
    p.on('pageerror', e => errs.push(label + ' PAGE ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(label + ' console ' + m.text().slice(0, 200)); });
    await p.goto(URL); await p.waitForTimeout(800);
    await p.evaluate((emu) => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); if (emu) localStorage.setItem('hearth.fb.emulator', '9099:8085'); }, emu);
    await p.reload(); await p.waitForTimeout(800);
    return p;
  }
  async function signIn(p, email, name) {
    await p.evaluate(() => { state.ui.homeMenu = 'player'; render(); });
    await p.click('[data-home-act="account"]');
    await p.waitForSelector('#hearthAccountDlg [data-acct="signin"]');
    if (p.label === 'P1a') await p.screenshot({ path: SHOTS + '11-google-optional-signin.png' });
    const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 20000 }), p.click('[data-acct="signin"]')]);
    await pop.waitForLoadState(); await pop.waitForTimeout(800);
    const existing = await pop.$(`#accounts-list li:has-text("${email}")`);
    if (existing) await existing.click();
    else {
      await pop.click('#add-account-button');
      await pop.fill('#email-input', email);
      await pop.fill('#display-name-input', name);
      await pop.click('#sign-in');
    }
    return waitFor(p, (email) => HearthGoogle.user && HearthGoogle.user.email === email, email, 20000);
  }
  const mkChar = (p, name) => p.evaluate((name) => { const d = generateRandomCharacter(); d.name = name; saveCharacter(d); return d.id; }, name);

  // ---- 0. No account: nothing Firebase loads ----
  const plain = await mk('Plain', false);
  await mkChar(plain, 'Offline Hero');
  await plain.evaluate(() => { state.ui.homeMenu = 'player'; render(); });
  await plain.waitForTimeout(1500);
  check('No account: no Firebase/gstatic requests', !plain.netlog.some(u => /gstatic|firebase|googleapis/.test(u)), plain.netlog.filter(u => !/127\.0\.0\.1/.test(u)));
  check('No account: Google slot idle', await plain.evaluate(() => HearthGoogle.fb === null && HearthAccount.identity() === null));

  // ---- 1. Player signs in on device A ----
  const a = await mk('P1a');
  const ariaId = await mkChar(a, 'Aria Vale');
  const signedA = await signIn(a, 'player@example.com', 'Pat Player');
  check('Sign in with Google (popup, emulator)', signedA);
  await a.waitForTimeout(500);
  await a.screenshot({ path: SHOTS + '12-google-signed-in-sync.png' });
  const synced = await waitFor(a, () => HearthGoogle.sync.state === 'ok', null, 15000);
  check('Device A pushes its character to the cloud', synced);
  await a.click('[data-acct="close"]').catch(() => {});

  // ---- 2. Same player on device B: character arrives ----
  const bdev = await mk('P1b');
  const localB = await mkChar(bdev, 'Bram Only-On-B');
  check('Device B signs in', await signIn(bdev, 'player@example.com', 'Pat Player'));
  await bdev.click('[data-acct="close"]').catch(() => {});
  const gotAria = await waitFor(bdev, (id) => loadCharacters().some(c => c.id === id && c.name === 'Aria Vale'), ariaId, 15000);
  const gotBram = await waitFor(a, (id) => loadCharacters().some(c => c.id === id), localB, 15000);
  check('Characters merge both ways (A→B and B→A)', gotAria && gotBram, { gotAria, gotBram });
  // edit on B -> A (last write wins)
  await bdev.evaluate((id) => { const ch = getCharacter(id); ch.name = 'Aria the Bold'; ch.currentHp = 3; saveCharacter(ch); }, ariaId);
  const editArrived = await waitFor(a, (id) => { const c = loadCharacters().find(x => x.id === id); return c && c.name === 'Aria the Bold' && c.currentHp === 3; }, ariaId, 15000);
  check('Edit on device B lands on device A', editArrived);
  // offline edit on A then back online
  await a.ctx.setOffline(true);
  await a.evaluate((id) => { const ch = getCharacter(id); ch.name = 'Aria (edited offline)'; saveCharacter(ch); }, ariaId);
  await sleep(2500);
  const stillLocal = await a.evaluate((id) => getCharacter(id).name, ariaId);
  await a.ctx.setOffline(false);
  const offArrived = await waitFor(bdev, (id) => { const c = loadCharacters().find(x => x.id === id); return c && c.name === 'Aria (edited offline)'; }, ariaId, 30000);
  check('Offline edit kept locally, syncs when back online', stillLocal === 'Aria (edited offline)' && offArrived, { stillLocal, offArrived });
  // delete on B -> gone on A
  await bdev.evaluate((id) => saveCharacters(loadCharacters().filter(c => c.id !== id)), localB);
  const delArrived = await waitFor(a, (id) => !loadCharacters().some(c => c.id === id), localB, 15000);
  check('Delete on device B removes it on device A', delArrived);

  // ---- 3. DM signs in, invites the player's email ----
  const dm = await mk('DM', true, 1300, 880);
  await dm.evaluate(() => { localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); setActiveTab('dm'); render(); dmEncounterAddCustomMonster('Goblin', 7, 15, 2, ''); render(); });
  await dm.evaluate(() => hearthAccountOpen());
  const [dpop] = await Promise.all([dm.waitForEvent('popup'), dm.click('[data-acct="signin"]')]);
  await dpop.waitForLoadState(); await dpop.waitForTimeout(600);
  await dpop.click('#add-account-button'); await dpop.fill('#email-input', 'dm@example.com'); await dpop.fill('#display-name-input', 'Thomas DM'); await dpop.click('#sign-in');
  check('DM signs in', await waitFor(dm, () => HearthGoogle.user && HearthGoogle.user.email === 'dm@example.com'));
  await dm.click('[data-acct="close"]').catch(() => {});
  await dm.click('[data-dm-link-open]'); await dm.click('[data-dm-link-start]');
  check('DM live game starts', await waitFor(dm, () => HearthLink.host && HearthLink.host.status === 'live', null, 30000));
  await dm.waitForSelector('#dmInviteEmail');
  await dm.fill('#dmInviteEmail', 'Player@Example.com');
  await dm.click('[data-dm-invite]');
  const invited = await waitFor(dm, () => { const m = HearthGoogle.games.mine; return m && m.data && (m.data.invited || []).includes('player@example.com') && m.data.live === true && m.data.code === HearthLink.host.code; }, null, 15000);
  check('DM invites by email; game doc carries live code', invited);
  await dm.waitForTimeout(400);
  await dm.screenshot({ path: SHOTS + '13-dm-invite-by-email.png' });

  // ---- 4. Player joins from "My games"; DM sees verified account; still accepts ----
  await a.evaluate(() => linkOpenJoinOverlay());
  const listed = await waitFor(a, () => !!document.querySelector('[data-link-mygame]'), null, 15000);
  check('Invited game shows under "My games" on the player', listed);
  await a.screenshot({ path: SHOTS + '14-player-my-games.png' });
  await a.check(`input[name="linkJoinChar"][value="${ariaId}"]`);
  await a.click('[data-link-mygame]');
  const prompt = await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 }).then(() => true).catch(() => false);
  const verified = await waitFor(dm, () => /✓ Google: player@example\.com \(invited\)/.test((document.getElementById('hearthLinkAcceptAcct') || {}).textContent || ''), null, 10000);
  if (!verified) console.log('DEBUG verify', JSON.stringify(await dm.evaluate(async () => {
    const dev = Object.values(HearthLink.host.devices).find(d => d.account); const a = dev && dev.account; const fb = HearthGoogle.fb;
    let note = null, err = null; try { const s = await fb.F.getDoc(fb.F.doc(fb.db, 'games', a.gameId, 'joins', a.uid)); note = s.exists() ? s.data() : 'missing'; } catch (e) { err = e.code || String(e); }
    return { acc: a, devId: dev && dev.deviceId, mine: HearthGoogle.games.mine && { id: HearthGoogle.games.mine.id, inv: HearthGoogle.games.mine.data && HearthGoogle.games.mine.data.invited }, note, err };
  })));
  check('DM still gets "Accept?" and sees the verified Google account', prompt && verified, await dm.evaluate(() => (document.getElementById('hearthLinkAcceptAcct') || {}).textContent));
  await dm.screenshot({ path: SHOTS + '15-dm-accept-verified-google.png' });
  await dm.click('[data-link-accept="yes"]');
  check('Player linked via invite', await waitFor(a, () => HearthLink.join && HearthLink.join.status === 'linked', null, 20000));
  // A forged account claim (no note in Firestore) is shown as unverified
  const eve = await mk('Eve', false);
  await mkChar(eve, 'Eve');
  const code = await dm.evaluate(() => HearthLink.host.code);
  await eve.evaluate((code) => { HearthAccount.register({ id: 'fake', signedIn: () => true, identity: () => ({ provider: 'google', uid: 'plUidFake', email: 'player@example.com', displayName: 'Pat' }) }); HearthAccount.use('fake'); HearthLink.ui.joinVia = { gameId: 'x_y', code, nonce: 'abcdefghijklmnop1234' }; linkJoinStart(code, loadCharacters()[0].id, {}); }, code);
  await dm.waitForSelector('#hearthLinkAccept', { timeout: 30000 });
  const unv = await waitFor(dm, () => /couldn't be verified/.test((document.getElementById('hearthLinkAcceptAcct') || {}).textContent || ''), null, 10000);
  check('Forged Google claim shown as unverified', unv);
  await dm.click('[data-link-accept="no"]');

  // ---- 5. Sign out keeps local characters; uninvite ----
  await bdev.evaluate(() => hearthAccountOpen());
  await bdev.click('[data-acct="signout"]'); await bdev.click('[data-confirm-yes]');
  const out = await waitFor(bdev, () => !HearthGoogle.user && loadCharacters().length > 0 && !localStorage.getItem('hearth.account.v1'), null, 10000);
  check('Sign out: characters stay on the device', out);
  await dm.evaluate(() => { state.ui.dmLinkPanel = true; render(); });
  await dm.waitForTimeout(600);
  if (!(await dm.$('[data-dm-uninvite="player@example.com"]'))) console.log('DEBUG panel', await dm.evaluate(() => ({ tab: state.tab, panel: state.ui.dmLinkPanel, html: (document.querySelector('.dm-link-dialog') || {}).innerText, mine: JSON.stringify(HearthGoogle.games.mine), user: !!HearthGoogle.user, dlg: [...document.querySelectorAll('.dialog-backdrop')].map(d => d.id) })));
  await dm.click('[data-dm-uninvite="player@example.com"]');
  const gone = await waitFor(a, () => !document.querySelector('[data-link-mygame]') && HearthGoogle.games.invited.length === 0, null, 15000);
  check('Uninvite removes the game from the player\'s list', gone);

  // ---- 6. Reload keeps sign-in (opt-in remembered), without a new popup ----
  await a.reload();
  check('Signed-in device stays signed in after reload', await waitFor(a, () => HearthGoogle.user && HearthGoogle.user.email === 'player@example.com', null, 20000));

  const realErrs = errs.filter(e => !/peerjs|Could not connect to peer|peer-unavailable|ERR_INTERNET_DISCONNECTED|PERMISSION_DENIED|WebChannelConnection|Firestore \(|offline|net::ERR/i.test(e));
  check('No unexpected console/page errors', realErrs.length === 0, realErrs);
  const fails = results.filter(r => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  await b.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
