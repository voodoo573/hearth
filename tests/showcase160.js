// Hearth v1.6.0 — clean showcase screenshots (staged data, no test strings, no toasts).
// Serve the repo root on 8816, then: node tests/showcase160.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const PORT = process.argv[2] || '8816';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const OUT = process.env.SHOTS || '/workspace/dice-160/clean/';
const errs = []; let check_mid = true;
const SEED = () => { localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done'); localStorage.setItem('hearth.dmSettings.v1', JSON.stringify({ dmMode: true, projectorHelpDismissed: true })); };
const HERO = () => { const d = generateRandomCharacter(); Object.assign(d, { name: 'Brin Tallow', race: 'human', subrace: null, klass: 'fighter', subclass: null, level: 3, classLevels: { fighter: 3 } }); saveCharacter(d); const ch = getCharacter(d.id); ch.currentHp = maxHp(ch); saveCharacter(ch); state.activeCharId = d.id; return d.id; };
async function page(b, w, h) { const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(800); return { ctx, p }; }
const noToast = p => p.evaluate(() => document.querySelectorAll('.toast, #toast, .hearth-toast').forEach(t => t.remove()));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  { const { ctx, p } = await page(b, 412, 860);
    await p.evaluate(HERO); await p.evaluate(() => { setActiveTab('play'); render(); });
    await p.evaluate(async () => { const r = hearthDiceRoll({ label: 'warm-up', groups: [{ sides: 20, values: [3] }], total: 3 }); await new Promise(z => setTimeout(z, 400)); HearthDice.skip(); await r; localStorage.removeItem('hearth.rollFeed.v1'); });
    await p.waitForTimeout(500); await noToast(p);
    const rp = p.evaluate(() => hearthDiceRoll({ label: 'Longsword attack', groups: [{ sides: 20, values: [17] }], total: '22 to hit' }).then(() => 1)).catch(() => 0);
    await p.waitForSelector('.hd-ov canvas');
    // Grab frames until the dice have visibly moved off their spawn pose, before they settle.
    await p.waitForTimeout(110); await p.screenshot({ path: OUT + 'dice-1-tumbling-phone.png' }); // mid-throw (the result line is not shown yet)
    check_mid = !(await p.evaluate(() => !!document.querySelector('.hd-num.on')));
    await p.waitForFunction(() => document.querySelector('.hd-num.on'), null, { timeout: 15000 }); await p.waitForTimeout(350);
    await p.screenshot({ path: OUT + 'dice-2-landed-phone.png' });
    await p.evaluate(() => HearthDice.skip()); await rp;
    await ctx.close(); }

  { const { ctx, p } = await page(b, 1366, 900);
    await p.evaluate(() => { setActiveTab('dm'); render(); dmEncounterAddCustomMonster('Ogre', 59, 11, -1, ''); hearthDiceSetPref('diceProjector', 'important'); });
    const [proj] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
    await proj.setViewportSize({ width: 1280, height: 720 }); await proj.waitForTimeout(700);
    await p.evaluate(async () => { const r = hearthDiceRoll({ who: 'Mira Vale', label: 'Eldritch Blast', groups: [{ sides: 20, values: [20] }], total: '25 to hit', crit: 'nat20' }); await new Promise(z => setTimeout(z, 900)); HearthDice.skip(); await r; });
    await proj.waitForTimeout(600);
    await proj.screenshot({ path: OUT + 'projector-nat20.png' });
    await ctx.close(); }

  { const { ctx, p } = await page(b, 1366, 900);
    await p.evaluate(() => {
      setActiveTab('dm'); render();
      const now = Date.now(), m = 60000;
      const E = (min, who, label, dice, total, x = {}) => Object.assign({ id: 'r' + min, ts: now - min * m, who, label, dice, total: String(total), nat: null, manual: false, linked: who !== 'DM' }, x);
      localStorage.setItem('hearth.rollFeed.v1', JSON.stringify([
        E(0.2, 'Mira Vale', 'Eldritch Blast', '1d20 [20]', '25 to hit', { nat: 20 }),
        E(0.5, 'Doran', 'Smite', '2d8 [7, 5]', 12),
        E(0.8, 'Doran', 'Longsword attack', '1d20 [14]', '19 to hit'),
        E(1.4, 'DM', 'Ogre greatclub', '1d20 [11] + 2d8 [6, 3]', '17 to hit · 13 dmg'),
        E(2.1, 'Brin Tallow', 'Dex save', '1d20 [1]', 4, { nat: 1 }),
        E(2.6, 'Mira Vale', 'Perception', '1d20 [12]', 15),
        E(3.2, 'Doran', 'Death save', '1d20 [13]', 13, { manual: true }),
        E(4.0, 'Brin Tallow', 'Initiative', '1d20 [16]', 19),
        E(4.0, 'Mira Vale', 'Initiative', '1d20 [9]', 11),
        E(4.1, 'DM', 'Ogre initiative', '1d20 [8]', 7),
      ]));
      hearthOpenRollLog();
    });
    await p.waitForTimeout(400); await noToast(p);
    await p.screenshot({ path: OUT + 'dm-roll-log-desktop.png' });
    await ctx.close(); }

  { const { ctx, p } = await page(b, 412, 860);
    await p.evaluate(HERO); await p.evaluate(() => { setActiveTab('play'); render(); window.scrollTo(0, 0); }); await p.waitForTimeout(400); await noToast(p);
    await p.screenshot({ path: OUT + 'reskin-phone-sheet.png' });
    await ctx.close(); }
  { const { ctx, p } = await page(b, 1366, 900);
    await noToast(p); await p.screenshot({ path: OUT + 'reskin-desktop-home.png' });
    await p.evaluate(HERO); await p.evaluate(() => { setActiveTab('play'); render(); }); await p.waitForTimeout(400); await noToast(p);
    await p.screenshot({ path: OUT + 'reskin-desktop-sheet.png' });
    await ctx.close(); }

  for (const [tag, w, h] of [['desktop', 1366, 900], ['phone', 412, 860]]) {
    const { ctx, p } = await page(b, w, h);
    await p.evaluate(() => {
      setActiveTab('dm'); render();
      dmEncounterAddCustomMonster('Goblin', 7, 15, 2, ''); dmEncounterAddCustomMonster('Goblin', 7, 15, 2, ''); dmEncounterAddCustomMonster('Ogre', 59, 11, -1, ''); dmEncounterAddCustomMonster('Cultist', 9, 12, 1, '');
      const e = loadEncounter(); const [g1, g2, og, cu] = e.combatants;
      g1.mapX = 12; g1.mapY = 4; g1.statuses = ['Poisoned', 'Prone'];
      g2.mapX = 14; g2.mapY = 6; g2.statuses = ['Frightened'];
      og.mapX = 6; og.mapY = 9; og.statuses = ['Restrained', 'Exhaustion 2'];
      cu.mapX = 3; cu.mapY = 3; cu.concentrating = true; cu.statuses = ['Incapacitated'];
      saveEncounter(e); state.ui.dmMapMode = true; render();
      state.ui.dmAoeFree = true;
      state.ui.dmAoeColor = '#e8552d'; hearthDropAoe('circle', 20);
      state.ui.dmAoeColor = '#4aa3df'; hearthDropAoe('cone', 15);
      state.ui.dmAoeColor = '#f6d743'; hearthDropAoe('line', 40);
      const e2 = loadEncounter(); const [fb, cone, line] = e2.aoes;
      Object.assign(fb, { x: 13.5, y: 5.5, pinned: true });
      Object.assign(cone, { x: 7.5, y: 10.5, angle: Math.PI / 12, pinned: true });
      Object.assign(line, { x: 1.5, y: 12.5, angle: -Math.PI / 6, pinned: true });
      saveEncounter(e2); render();
    });
    await p.waitForTimeout(600);
    if (tag === 'phone') await p.evaluate(() => { const fit = [...document.querySelectorAll('button')].find(x => /fit board/i.test(x.textContent)); fit && fit.click(); });
    await p.waitForTimeout(400);
    await p.evaluate((tag) => { { const g = document.getElementById('dmMapGrid'); g && g.scrollIntoView({ block: 'center' }); } }, tag);
    await p.waitForTimeout(900); await noToast(p);
    await p.screenshot({ path: OUT + `map-badges-aoe-${tag}.png` });
    await p.evaluate(() => { state.ui.dmMapMode = false; render(); });
    await p.waitForTimeout(500); await noToast(p);
    // Clip from the round bar ("Not started") to the bottom of the last combatant tile.
    const clip = await p.evaluate(() => {
      const tileOf = (e) => { while (e.parentElement && e.getBoundingClientRect().height < 120) e = e.parentElement; return e; };
      const pills = [...document.querySelectorAll('.dm-status-pill')];
      const ns = [...document.querySelectorAll('div,span,strong,b')].find(e => e.children.length === 0 && /^Not started$/.test(e.textContent.trim()));
      const rollBtn = [...document.querySelectorAll('button')].find(b => /Roll monsters/.test(b.textContent));
      const tops = [ns, rollBtn].filter(Boolean).map(e => e.getBoundingClientRect().top);
      const top = (tops.length ? Math.min(...tops) : tileOf(pills[0]).getBoundingClientRect().top) + window.scrollY - 2;
      const bottom = tileOf(pills[pills.length - 1]).getBoundingClientRect().bottom + window.scrollY + 12;
      return { top, h: bottom - top };
    });
    await p.screenshot({ path: OUT + `initiative-badges-${tag}.png`, fullPage: true, clip: { x: 0, y: clip.top, width: w, height: Math.min(clip.h, 1600) } });
    await ctx.close();
  }
  // 9-10: framed tokens with Jenny's portrait library (desktop + phone)
  for (const [tag, w, h] of [['desktop', 1366, 900], ['phone', 412, 860]]) {
    const { ctx, p } = await page(b, w, h);
    await p.evaluate(() => {
      setActiveTab('dm'); render();
      const L = [['Goblin', 'goblin', 7], ['Goblin Archer', 'goblin-archer', 7], ['Ogre', 'ogre', 59], ['Cultist', 'cultist', 9], ['Ranger', 'ranger', 16], ['Wolf', 'wolf', 11], ['Rat', null, 1], ['Young Red Dragon', 'young-dragon-red', 178]];
      L.forEach(([n, , hp]) => dmEncounterAddCustomMonster(n, hp, 13, 1, ''));
      const e = loadEncounter();
      const pos = [[11, 4], [13, 3], [6, 8], [3, 3], [4, 10], [9, 10], [8, 5], [14, 8]];
      e.combatants.forEach((c, i) => { c.mapX = pos[i][0]; c.mapY = pos[i][1]; if (L[i][1]) c.tokenImage = 'tokens/lib/' + L[i][1] + '.webp'; });
      e.combatants[0].statuses = ['Poisoned', 'Prone']; e.combatants[0].hp = 3;
      e.combatants[2].statuses = ['Restrained'];
      e.combatants[3].concentrating = true;
      e.combatants[4].disposition = 'ally';
      e.combatants[5].dead = true; e.combatants[5].hp = 0;
      e.combatants[6].size = 'Tiny';
      e.combatants[7].isBoss = true; e.combatants[7].size = 'Large';
      saveEncounter(e); state.ui.dmMapMode = true; render();
    });
    await p.waitForTimeout(700);
    if (tag === 'phone') { await p.evaluate(() => { const fit = [...document.querySelectorAll('button')].find(x => /fit board/i.test(x.textContent)); fit && fit.click(); }); await p.waitForTimeout(400); await p.evaluate(() => { const g = document.getElementById('dmMapGrid'); g && g.scrollIntoView({ block: 'center' }); }); }
    else await p.evaluate(() => { const g = document.getElementById('dmMapGrid'); g && g.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(900); await noToast(p);
    await p.screenshot({ path: OUT + `map-tokens-${tag}.png` });
    if (tag === 'phone') { await p.evaluate(() => { state.ui.tokenImageFor = loadEncounter().combatants[1].id; render(); }); await p.waitForTimeout(800); await p.screenshot({ path: OUT + 'token-picker-library-phone.png' }); }
    await ctx.close();
  }
  if (!check_mid) errs.push('tumbling shot was taken after the dice landed');
  console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no page errors');
  await b.close();
})();
