// Hearth v1.7.0 — Jenny's C2 DM layout. Serve the repo root, then: node tests/c2.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
async function open(b, w, h, opts) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(S.STAGE, opts || {}); await p.waitForTimeout(700);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  let { ctx, p } = await open(b, 1366, 860);
  // layout + strip
  const strip = await p.evaluate(() => [...document.querySelectorAll('.c2-strip .c2-pc')].map(x => ({ n: x.querySelector('.c2-pn').textContent, ac: x.querySelector('.c2-ac').textContent, hp: x.querySelector('.c2-php').textContent, bar: !!x.querySelector('.c2-hpb i'), conds: x.querySelectorAll('.c2-pic .c2-ci').length, low: x.querySelector('.c2-php').classList.contains('low') })));
  check('C2 is the default layout: header, portrait strip, stage', await p.evaluate(() => !!document.querySelector('.c2 .c2-top') && !!document.querySelector('.c2 .c2-stage #dmMapGrid') && !document.querySelector('.dm-battle-track')));
  check('six portraits in initiative order, each with a brass AC badge, HP and HP bar', strip.length === 6 && strip[0].n === 'Goblin' && strip[5].n === 'Adult Red Dragon' && strip.every(s => /^\d+$/.test(s.ac) && s.bar && /\d/.test(s.hp)), strip.map(s => s.n + ':' + s.ac));
  check('portrait condition icons + bloodied HP in red', strip[4].conds === 2 && strip[3].conds === 1 && strip[3].low && !strip[0].low, strip.map(s => s.conds));
  // monster's turn: card pinned beside the map
  const desk = await p.evaluate(() => { const c = document.querySelector('.c2-card'), s = document.querySelector('.c2-stage'), g = document.getElementById('dmMapGrid').getBoundingClientRect(), sr = s.getBoundingClientRect(); return { card: c && c.className, id: c && c.dataset.c2Card, name: c && c.querySelector('.c2-cname').textContent, cr: c && c.getBoundingClientRect().right, sl: sr.left, inside: g.left >= sr.left - 1 && g.right <= sr.right + 1 && g.top >= sr.top - 1 && g.bottom <= sr.bottom + 1, turn: !!(c && c.querySelector('.c2-turn')) }; });
  check('dragon\u2019s turn opens its card automatically, pinned beside the map (desktop)', desk.name === 'Adult Red Dragon' && /side/.test(desk.card) && desk.cr <= desk.sl + 1 && desk.turn, desk);
  check('desktop: the fitted board sits wholly inside the map stage', desk.inside, desk);
  const sb = await p.evaluate(() => { const t = document.querySelector('.c2-card').innerText; return { srd: /SRD 5\.1 \u00b7 CC-BY-4\.0/.test(t), abil: document.querySelectorAll('.c2-abil > div').length, secs: [...document.querySelectorAll('.c2-sech')].map(x => x.textContent.replace(/[\u25B8\u25BE]/g, '').trim().slice(0, 22)), tail: /Tail/.test(t), fp: /Frightful Presence/.test(t), none: [...document.querySelectorAll('.c2-sec.shut .c2-sech em')].map(e => e.textContent) }; });
  check('full SRD stat block: 6 abilities, all sections, Tail + Frightful Presence, "none" for empty sections', sb.abil === 6 && sb.tail && sb.fp && sb.secs.length === 6 && sb.none.filter(x => x === 'none').length === 2, sb);
  check('SRD 5.1 CC-BY-4.0 attribution on the card', sb.srd, sb);
  // rolls: every attack and damage is a tap, never auto-projected
  const rolls = await p.evaluate(() => {
    const got = []; const real = window.hearthDiceRoll; window.hearthDiceRoll = (s) => { got.push(s); return Promise.resolve(null); };
    const bite = [...document.querySelectorAll('.c2-atk')].find(x => /^Bite/.test(x.textContent));
    bite.querySelector('[data-c2-roll="d20"]').click();
    bite.querySelectorAll('[data-c2-roll="dmg"]').forEach(x => x.click());
    document.querySelector('.c2-abil [data-c2-roll]').click();
    window.hearthDiceRoll = real;
    return got.map(s => ({ l: s.label, g: s.groups.map(g => g.values.length + 'd' + g.sides).join('+'), n: s.noAutoProject, t: s.total, who: s.who }));
  });
  check('Bite: to-hit, piercing and fire damage are separate taps (d20, 2d10, 2d6) with noAutoProject', rolls.length === 4 && rolls[0].g === '1d20' && /to hit/.test(rolls[0].t) && rolls[1].g === '2d10' && rolls[2].g === '2d6' && rolls.every(r => r.n === true && r.who === 'Adult Red Dragon'), rolls);
  const crit = await p.evaluate(() => { state.ui.c2Crit = { id: document.querySelector('.c2-card').dataset.c2Card, k: 'Bite' }; render(); const got = []; const real = window.hearthDiceRoll; window.hearthDiceRoll = (s) => { got.push(s); return Promise.resolve(null); }; const bite = [...document.querySelectorAll('.c2-atk')].find(x => /^Bite/.test(x.textContent)); const btn = bite.querySelector('[data-c2-roll="dmg"]'); const txt = btn.textContent; btn.click(); window.hearthDiceRoll = real; state.ui.c2Crit = null; render(); return { txt, n: got[0].groups[0].values.length }; });
  check('after a natural 20 the damage buttons double their dice', /\u00d72/.test(crit.txt) && crit.n === 4, crit);
  const proj = await p.evaluate(async () => {
    const pr = loadPrefs(); pr.diceProjector = 'important'; pr.diceAnim = 'off'; state.prefs = pr; savePrefs(pr);
    const realT = window.hearthDiceProjectorTarget, realO = window.hearthDiceOnProjector; let sent = 0;
    window.hearthDiceProjectorTarget = () => ({}); window.hearthDiceOnProjector = () => { sent++; };
    const orig = Math.random; Math.random = () => 0.999; // natural 20
    [...document.querySelectorAll('.c2-atk')].find(x => /^Claw/.test(x.textContent)).querySelector('[data-c2-roll="d20"]').click();
    const c2 = sent; Math.random = orig;
    hearthDiceRoll({ who: 'DM', label: 'control', groups: [{ sides: 20, values: [20] }], total: 20, noAutoProject: false }); // still on the C2 screen: held too
    const held = sent;
    state.tab = 'play'; hearthDiceRoll({ label: 'player crit', groups: [{ sides: 20, values: [20] }], total: 20 }); state.tab = 'dm';
    const other = sent;
    window.hearthDiceProjectorTarget = realT; window.hearthDiceOnProjector = realO;
    pr.diceProjector = 'off'; pr.diceAnim = 'on'; savePrefs(pr); render();
    return { c2, held, other, crit: !!state.ui.c2Crit };
  });
  check('a nat 20 from the card never auto-projects, even with "important" on (other screens keep the setting)', proj.c2 === 0 && proj.held === 0 && proj.other === 1, proj);
  check('More menu: dice-on-projector toggle, off by default', await p.evaluate(() => { const t = document.querySelector('[data-c2-proj-dice]'); const off = t.getAttribute('aria-checked') === 'false'; t.click(); const on = hearthDicePrefs().projector === 'ask'; document.querySelector('[data-c2-proj-dice]').click(); return off && on && hearthDicePrefs().projector === 'off' && /projector off/.test(document.querySelector('.c2-dicenote').textContent); }));
  // recharge, LR pips, legendary pips
  const rech = await p.evaluate(() => {
    const fb = () => [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent));
    const a = fb().querySelector('.c2-rc').textContent; fb().querySelector('[data-c2-spend]').click(); const b2 = fb().querySelector('.c2-rc').textContent;
    const real = window.hearthDiceRoll; window.hearthDiceRoll = () => Promise.resolve(null);
    const orig = Math.random; Math.random = () => 0.1; fb().querySelector('[data-c2-recharge]').click(); const c = fb().querySelector('.c2-rc').textContent;
    Math.random = () => 0.99; fb().querySelector('[data-c2-recharge]').click(); const d = fb().querySelector('.c2-rc').textContent; Math.random = orig; window.hearthDiceRoll = real;
    return { a, b2, c, d };
  });
  check('Fire Breath shows Recharge 5\u20136 READY \u2192 SPENT; a d6 of 1 keeps it spent, a 6 makes it READY', /Recharge 5\u20136/.test(rech.a) && /READY/.test(rech.a) && /SPENT/.test(rech.b2) && /SPENT/.test(rech.c) && /READY/.test(rech.d), rech);
  const pipr = await p.evaluate(() => {
    const lr = () => [...document.querySelectorAll('.c2-sec')].find(s => /Traits/.test(s.textContent)).querySelectorAll('.c2-pip');
    const n0 = lr().length; lr()[0].click(); const used1 = [...lr()].filter(x => x.classList.contains('u')).length;
    const legSec = () => [...document.querySelectorAll('.c2-sec')].find(s => /Legendary actions/.test(s.querySelector('.c2-sech').textContent));
    const la = () => [...legSec().querySelectorAll('.c2-lg .c2-pip')].filter(x => x.classList.contains('u')).length;
    const wing = [...legSec().querySelectorAll('.c2-atk')].find(x => /Wing Attack/.test(x.textContent));
    const cost = wing.querySelector('.c2-cost').textContent; wing.querySelector('[data-c2-la-use]').click(); const after = la();
    const tailBtns = [...legSec().querySelectorAll('.c2-atk')].find(x => /^Tail Attack/.test(x.textContent)).querySelectorAll('[data-c2-roll]').length;
    legSec().querySelector('[data-c2-la-reset]').click();
    return { n0, used1, cost, after, reset: la(), tailBtns, pipTotal: legSec().querySelectorAll('.c2-lg .c2-pip').length };
  });
  check('Legendary Resistance has 3 use pips; tapping one spends it', pipr.n0 === 3 && pipr.used1 === 1, pipr);
  check('legendary actions: 3 pips, Wing Attack costs 2, Tail Attack borrows the Tail rolls, Reset restores', pipr.pipTotal === 3 && /2 ACTIONS/.test(pipr.cost) && pipr.after === 2 && pipr.reset === 0 && pipr.tailBtns === 2, pipr);
  const laTurn = await p.evaluate(() => { const e = loadEncounter(); const d = e.combatants.find(c => c.name === 'Adult Red Dragon'); d.c2.la = 3; saveEncounter(e); render(); document.querySelector('.c2-next[data-dm-turn]').click(); const e2 = loadEncounter(); const ord = sortedCombatants(e2); for (let i = 0; i < 5; i++) document.querySelector('.c2-next[data-dm-turn]').click(); return { la: loadEncounter().combatants.find(c => c.name === 'Adult Red Dragon').c2.la, card: document.querySelector('.c2-card') && document.querySelector('.c2-card .c2-cname').textContent }; });
  check('legendary actions come back at the start of the dragon\u2019s turn', laTurn.la === 0 && laTurn.card === 'Adult Red Dragon', laTurn);
  // place cone
  const cone = await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); const e = loadEncounter(); const a = e.aoes[e.aoes.length - 1]; const d = e.combatants.find(c => c.name === 'Adult Red Dragon'); const r = e.combatants.find(c => c.name === 'Ranger'); return { kind: a.kind, len: a.len, color: a.color, label: a.label, x: a.x, y: a.y, dx: d.mapX, dy: d.mapY, ang: a.angle, fp: tokenFootprint(tokenSize({ monsterId: d.monsterId })), want: Math.atan2(r.mapY + .5 - (d.mapY + tokenFootprint(tokenSize({ monsterId: d.monsterId })) / 2), r.mapX + .5 - (d.mapX + tokenFootprint(tokenSize({ monsterId: d.monsterId })) / 2)), txt: [...document.querySelectorAll('.dm-aoe-label')].map(l => l.textContent).join('|') }; });
  check('Place cone: 60 ft fire-orange cone from the dragon, aimed at the nearest player, labelled', cone.kind === 'cone' && cone.len === 12 && cone.color === '#e8552d' && cone.x === cone.dx + cone.fp / 2 && cone.y === cone.dy + cone.fp / 2 && Math.abs(cone.ang - cone.want) < 1e-6 && /Fire Breath/.test(cone.txt), cone);
  // HP stepper works through the shared wiring
  const hp = await p.evaluate(() => { document.querySelector('.c2-hpstep [data-dm-hp^="dmg"][data-dm-hp$="|10"]').click(); return loadEncounter().combatants.find(c => c.name === 'Adult Red Dragon').hp; });
  check('card HP stepper (\u221210) applies to the dragon', hp === 202, hp);
  // fan
  const fan = await p.evaluate(() => { document.querySelector('[data-c2-fab]').click(); const open = document.querySelector('.c2-fan.open') != null; const items = [...document.querySelectorAll('.c2-fan-i small')].map(x => x.textContent); document.querySelector('.c2-fan [data-ruler-tool]').click(); return { open, items, ruler: !!state.ui.dmRulerTool, closed: !document.querySelector('.c2-fan.open'), chip: !!document.querySelector('.c2-mode') }; });
  check('brass \u2726 fan opens from the map with AoE, Measure, Point, Fog, Group, Grid, Map, View', fan.open && fan.items.join() === 'AoE,Measure,Point,Fog,Group,Grid,Map,View', fan);
  check('picking Measure closes the fan, arms the ruler and shows a Done chip', fan.ruler && fan.closed && fan.chip, fan);
  await p.evaluate(() => { document.querySelector('.c2-mode button').click(); });
  check('Done chip disarms the ruler', await p.evaluate(() => !state.ui.dmRulerTool && !document.querySelector('.c2-mode')));
  // every classic feature reachable
  const reach = await p.evaluate(() => {
    const e = loadEncounter(); e.fog = { on: true, revealed: [] }; saveEncounter(e); const g = loadGames(); const ga = activeGame(g); ga.encounters.push(blankEncounterObj('Second room')); saveGames(g);
    const d = e.combatants.find(c => c.name === 'Adult Red Dragon'); d.hp = 0; saveEncounter(e); render();
    const sel = ['[data-aoe-tool="circle"]', '[data-aoe-tool="cone"]', '[data-aoe-tool="line"]', '[data-aoe-tool="square"]', '[data-aoe-color]', '[data-aoe-color-custom]', '[data-aoe-free]', '[data-aoe-clear]', '[data-ruler-tool]', '[data-pointer-tool]', '[data-group-tool]',
      '[data-fog-toggle]', '[data-fog-tool="reveal"]', '[data-fog-tool="hide"]', '[data-fog-cover]', '[data-fog-clear]', '[data-fog-brush="0"]', '[data-fog-brush="2"]', '[data-map-zoom="in"]', '[data-map-zoom="out"]', '[data-map-zoom="fit"]', '#dmMapZoomPct',
      '[data-map-grid="+c"]', '[data-map-grid="-c"]', '[data-map-grid="+r"]', '[data-map-grid="-r"]', '[data-map-reset]', '#dmMapAdd', '#dmMapLibrary', '#dmMapFile', '#dmMapRemove', '#dmMapGridToggle', '#dmMapExit', '#dmMapProject', '#dmMapEncSelect',
      '[data-roll-log-open]', '[data-dm-notes-open]', '[data-dm-link-open]', '[data-dm-reset-enc]', '[data-dm-turn]', '[data-c2-layout="classic"]',
      '[data-dm-hp^="dmg"]', '[data-dm-hp^="heal"]', '[data-dm-hp-set]', '[data-dm-status-open]', '[data-dm-conc-toggle]', '[data-dm-save-open]', '[data-dm-rename]', '[data-dm-init]', '[data-dm-hide-enemy]', '[data-dm-hide-name]', '[data-dm-disposition]', '[data-dm-duplicate]', '[data-token-img-open]', '[data-dm-remove-ask]', '[data-dm-kill]'];
    const missing = sel.filter(s => !document.querySelector('.c2 ' + s));
    // a player's card: vision
    state.ui.c2Card = { id: e.combatants.find(c => c.name === 'Ranger').id }; render();
    if (!document.querySelector('.c2 [data-dm-vision]')) missing.push('[data-dm-vision]');
    // roll-monsters appears when a monster has no initiative
    const e2 = loadEncounter(); e2.combatants.find(c => c.kind === 'monster').init = null; saveEncounter(e2); render();
    if (!document.querySelector('.c2 [data-dm-roll-monsters]')) missing.push('[data-dm-roll-monsters]');
    return missing;
  });
  check('every classic DM control is reachable in C2 (fan flyouts, More menu, card)', reach.length === 0, reach);
  const flows = await p.evaluate(() => { document.querySelector('[data-c2-fab]').click(); document.querySelector('[data-c2-fly="grid"]').click(); const vis = document.querySelector('[data-c2-panel="grid"]:not([hidden])') != null; const c0 = loadEncounter().mapCols; document.querySelector('[data-c2-panel="grid"] [data-map-grid="+c"]').click(); return { vis, cols: loadEncounter().mapCols - c0, still: document.querySelector('[data-c2-panel="grid"]:not([hidden])') != null }; });
  check('Grid flyout opens from the fan and its buttons work (+ col)', flows.vis && flows.cols === 1 && flows.still, flows);
  // token tap opens its card
  await p.evaluate(() => { state.ui.c2Card = null; state.ui.c2Fly = null; render(); });
  const og = await p.evaluate(() => { const id = loadEncounter().combatants.find(c => c.name === 'Ogre').id; const r = document.querySelector(`[data-map-token="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.click(og.x, og.y); await p.waitForTimeout(250);
  check('tapping a token on the map opens its card', await p.evaluate(() => { const c = document.querySelector('.c2-card .c2-cname'); return c && c.textContent === 'Ogre'; }));
  // themes: brass comes from the palette
  const th = await p.evaluate(() => { const out = {}; for (const pal of ['hearth', 'arcane', 'scott-ultramarine']) { document.documentElement.setAttribute('data-palette', pal); const g = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(); out[pal] = { gold: g, fab: getComputedStyle(document.querySelector('.c2-fab')).backgroundImage.slice(0, 120), ac: getComputedStyle(document.querySelector('.c2-ac')).backgroundImage.slice(0, 60) }; } document.documentElement.setAttribute('data-palette', 'hearth'); return out; });
  check('brass accents follow the palette (fab + AC badge differ per theme)', th.hearth.fab !== th.arcane.fab && th.arcane.fab !== th['scott-ultramarine'].fab && th.hearth.ac !== th.arcane.ac, th);
  const css = await p.evaluate(async () => (await (await fetch('dm/c2.css')).text()));
  const hex = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => !['#000', '#fff', '#c0392b', '#f08a6e', '#ff8a3d', '#ffb347', '#7fae55', '#a9c47e', '#6a9a3a'].includes(h.toLowerCase()));
  check('c2.css has no fixed gold/brass colours (only reds, fire orange, HP greens, black/white)', hex.length === 0, hex);
  // classic toggle
  const tog = await p.evaluate(() => { document.querySelector('[data-c2-more]').click(); document.querySelector('[data-c2-layout="classic"]').click(); const classic = !document.querySelector('.c2') && !!document.querySelector('.dm-battle-track'); const saved = loadDmSettings().dmLayout; document.querySelector('[data-c2-layout="c2"]').click(); return { classic, saved, back: !!document.querySelector('.c2'), now: loadDmSettings().dmLayout }; });
  check('More \u2192 Classic layout switches (and is remembered); classic has a way back', tog.classic && tog.saved === 'classic' && tog.back && tog.now === 'c2', tog);
  const sw = await p.evaluate(async () => (await (await fetch('sw.js')).text()));
  check('service worker precaches the C2 files', ["'./dm/c2.js'", "'./dm/c2.css'", "'./dm/srd51-statblocks.js'"].every(s => sw.includes(s)));
  check('credits name the C2 screen and the SRD 5.1 stat blocks', await p.evaluate(() => { hearthOpenLegal(); const t = document.body.innerText; return /DM battle screen \(C2 layout/.test(t) && /SRD 5\.1 \(CC-BY-4\.0/.test(t); }));
  await ctx.close();

  // phone
  ({ ctx, p } = await open(b, 412, 880));
  const ph = await p.evaluate(() => { const c = document.querySelector('.c2-card'), r = c.getBoundingClientRect(); const s = document.querySelector('.c2-strip'); return { sheet: c.classList.contains('sheet'), bottom: Math.round(r.bottom), w: Math.round(r.width), mini: s.classList.contains('mini'), stripH: s.getBoundingClientRect().height, fab: getComputedStyle(document.querySelector('.c2-fab')).display }; });
  check('phone: the dragon\u2019s card is a bottom sheet; the strip shrinks to one row', ph.sheet && ph.bottom === 880 && ph.w === 412 && ph.mini && ph.stripH < 90 && ph.fab === 'none', ph);
  const ph2 = await p.evaluate(async () => { document.querySelector('[data-c2-close]').click(); await new Promise(r => setTimeout(r, 300)); const s = document.querySelector('.c2-strip'), sc = document.getElementById('dmMapScroll').getBoundingClientRect(), g = document.getElementById('dmMapGrid').getBoundingClientRect(); const cols = getComputedStyle(s).gridTemplateColumns.split(' ').length; return { mini: s.classList.contains('mini'), cols, gH: Math.round(g.height), sH: Math.round(sc.height), fab: getComputedStyle(document.querySelector('.c2-fab')).display }; });
  check('phone, sheet closed: 3-column portrait grid, the board fills the map height (no empty band), fan button back', !ph2.mini && ph2.cols === 3 && ph2.sH - ph2.gH <= 20 && ph2.fab !== 'none', ph2);
  check('phone header: Next turn reachable', await p.evaluate(() => { const n = document.querySelector('.c2-top [data-dm-turn]'); return !!n && getComputedStyle(n).display !== 'none'; }));
  await ctx.close();
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const f = results.filter(x => !x.ok).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
})();
