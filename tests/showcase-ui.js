// UI polish — screenshot sweep under Jenny's png names: desktop 1920x1080 @1, phone 412x892 @2.
// node tests/showcase-ui.js 8816 [outdir] [only-regex]
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js');
const FS = require('./forge-seed.js');
const PORT = process.argv[2] || '8816', OUT = process.argv[3] || '/workspace/ui-polish/shots', ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null;
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const W = (ms) => `await new Promise(r=>setTimeout(r,${ms}));`;
const ROLL = `HearthUI.go('sheet');${W(300)}document.querySelector('.u-cs-roll.u-hit').click();${W(300)}document.querySelector('.roll-dialog [data-roll-line="0"]').click();`;
const BUILD = `startNewCharacterFromMenu();${W(300)}const n=document.getElementById('nameInput');n.value='Aria';n.dispatchEvent(new Event('input',{bubbles:true}));for(let i=0;i<2;i++){const b=document.getElementById('nextBtn');b&&b.click();${W(200)}const r=document.querySelector('[data-race]');if(r&&!state.draft.race){r.click();${W(200)}}};const pc=document.querySelector('[data-class=paladin]');pc&&pc.click();`;
// a player linked to a live game (the DM's turn order reaches the phone as the shared player-visible list)
const PVIEW = `const ch=loadCharacters()[0];HearthLink.join={status:'linked',code:'hearth-7K2Q-9MXD',token:'t',charId:ch.id,game:'The Sunken Crypt',combat:{started:true,round:2,yourTurn:false,order:[{n:'Elowen',i:18,k:'p',turn:true},{n:'Goblin',i:16,k:'m'},{n:ch.name,i:14,k:'p',you:true},{n:'Wolf',i:13,k:'m'},{n:'Thessaly',i:12,k:'p'},{n:'Goblin Archer',i:11,k:'m'}]}};HearthUI.go('sheet');${W(300)}linkRefreshPlayer();`;
const THEMES = `state.ui.homePanel='settings';render();${W(200)}document.querySelector('[data-u-act=themes]').click();${W(300)}`;
const SHOTS = [
  ['home', `HearthUI.go('home')`],
  ['player', `HearthUI.go('characters')`],
  ['player-empty', `HearthUI.go('characters')`, { noChars: true, noGames: true }],
  ['dm', `HearthUI.go('dm')`],
  ['library', `HearthUI.go('library')`],
  ['library-content', `HearthUI.go('library');${W(100)}state.ui.uLibTab='content';try{clFetchIndex()}catch(e){};${W(2500)}render();`],
  ['error', `HearthUI.go('library');state.ui.uLibTab='content';state.ui.uLibSaved=false;${W(300)}render();`, null, 1],
  ['settings', `HearthUI.go('settings')`],
  ['themes-popup', THEMES],
  ['sheet', `HearthUI.go('sheet')`],
  ['gear', `HearthUI.go('gear')`],
  ['forge', `(${FS.FORGE.toString()})();HearthUI.go('forge');`],
  ['reference', `HearthUI.go('reference');${W(200)}HearthUI.isDesk()?document.querySelector('[data-v=Bless]').click():HearthUI.actions['ref-sel']({dataset:{v:'Bless'}});`],
  ['builder', BUILD],
  ['dice', ROLL, null, 0, 7000],
  ['switcher', `HearthUI.go('sheet');${W(300)}HearthUI.actions.switch();`],
  ['export', `HearthUI.go('home');${W(200)}HearthUI.actions.export({dataset:{}});`],
  ['confirm', `HearthUI.go('characters');${W(300)}HearthUI.openDeleteChar(loadCharacters()[4].id);`],
  ['onboarding', `HearthUI.go('characters');${W(200)}hearthOpenTour();`, { noChars: true, noGames: true }],
  ['player-view', PVIEW],
  ['store', `localStorage.setItem('hearth.flag.store','1');HearthUI.go('store');`],
  // palette proofs (Jenny's extra pngs)
  ['home-%-arcane', `HearthUI.go('home')`, { palette: 'arcane' }],
  ['home-%-scott-ultramarine', `HearthUI.go('home')`, { palette: 'scott-ultramarine' }],
  ['sheet-%-arcane', `HearthUI.go('sheet')`, { palette: 'arcane' }],
  ['sheet-%-scott-ultramarine', `HearthUI.go('sheet')`, { palette: 'scott-ultramarine' }],
  ['settings-%-scott-ultramarine', `HearthUI.go('settings')`, { palette: 'scott-ultramarine' }],
  ['themes-popup-%-scott-ultramarine', THEMES + `document.querySelector('[data-tk="scott-ultramarine"]').click();${W(200)}`],
];
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  require('fs').mkdirSync(OUT, { recursive: true });
  const done = [];
  for (const [name, js, seed, offline, wait] of SHOTS) for (const kind of ['desk', 'phone']) {
    const file = name.includes('%') ? name.replace('%', kind) : `${name}-${kind}`;
    if (ONLY && !ONLY.test(file)) continue;
    const desk = kind === 'desk';
    const ctx = await b.newContext({ viewport: desk ? { width: 1920, height: 1080 } : { width: 412, height: 892 }, deviceScaleFactor: desk ? 1 : 2, serviceWorkers: 'block', hasTouch: !desk });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.evaluate(S.SEED, seed || {}); await p.reload(); await p.waitForTimeout(900);
    await p.evaluate(S.STAGE, seed || {}); await p.waitForTimeout(400);
    if (offline) { await ctx.setOffline(true); await p.evaluate(() => { try { clFetchIndex(true); } catch (e) {} }); await p.waitForTimeout(800); }
    try { await p.evaluate('(async()=>{' + js + '})()'); } catch (e) { errs.push('script: ' + e.message); }
    await p.waitForTimeout(wait || 700);
    await p.evaluate(() => { document.querySelectorAll('.toast,#toast,.hearth-toast').forEach(t => t.remove()); const a = document.activeElement; if (a && a.blur && !/INPUT/.test(a.tagName)) a.blur(); });
    await p.screenshot({ path: `${OUT}/${file}.png` });
    done.push(file + (errs.length ? '  ERR ' + errs.join(' | ').slice(0, 200) : ''));
    await ctx.close();
  }
  // projector: desk = the projector window itself (1920x1080) on the staged C2 scene; phone = the phone DM's
  // Projector flow on the live Battle Map (the one-time setup sheet before the window opens)
  const C2 = require('./c2-stage.js');
  for (const kind of ['desk', 'phone']) {
    const file = `projector-${kind}`; if (ONLY && !ONLY.test(file)) continue;
    const desk = kind === 'desk', errs = [];
    const ctx = await b.newContext({ viewport: desk ? { width: 1920, height: 1080 } : { width: 412, height: 892 }, deviceScaleFactor: desk ? 1 : 2, serviceWorkers: 'block', hasTouch: !desk });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.evaluate(C2.SEED); await p.reload(); await p.waitForTimeout(900);
    await p.waitForFunction(() => window.HearthMI && window.HearthC2, null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(C2.STAGE, { turn: 'Ranger' }); await p.waitForTimeout(1500);
    await p.evaluate(() => { const e = loadEncounter(); e.aoes = []; saveEncounter(e); state.ui.c2Card = null; render(); }); await p.waitForTimeout(500);
    if (desk) {
      const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => openProjectorWindow(loadEncounter()))]);
      pop.on('pageerror', e => errs.push('projector: ' + e.message));
      await pop.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(500); await p.evaluate(() => broadcastMap(loadEncounter())); await pop.waitForTimeout(2500);
      await pop.screenshot({ path: `${OUT}/${file}.png` });
      await pop.close(); await p.bringToFront();
      // and the desk setup sheet (full steps) the DM sees before the window opens
      await p.evaluate(() => { const s = loadDmSettings(); s.projectorHelpDismissed = false; saveDmSettings(s); document.getElementById('dmMapProject').click(); }); await p.waitForTimeout(700);
      await p.evaluate(() => document.querySelectorAll('.toast,#toast,.hearth-toast').forEach(t => t.remove()));
      await p.screenshot({ path: `${OUT}/projector-setup-desk.png` });
    } else {
      await p.evaluate(() => { const s = loadDmSettings(); s.projectorHelpDismissed = false; saveDmSettings(s); document.getElementById('dmMapProject').click(); }); await p.waitForTimeout(700);
      await p.evaluate(() => document.querySelectorAll('.toast,#toast,.hearth-toast').forEach(t => t.remove()));
      await p.screenshot({ path: `${OUT}/${file}.png` });
    }
    done.push(file + (errs.length ? '  ERR ' + errs.join(' | ').slice(0, 200) : ''));
    await ctx.close();
  }
  await b.close();
  console.log(done.join('\n'));
})();
