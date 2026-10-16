// Hearth v1.5.1 "Hearth Originals" checks. Run: node tests/originals151.test.js [port]
// Needs the repo served at http://127.0.0.1:<port>/ (e.g. python3 -m http.server 8991).
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const fs = require('fs'); const path = require('path');
const PORT = process.argv[2] || '8991';
const URL = `http://127.0.0.1:${PORT}/app/index.html`;
const results = []; const errs = [];
function check(name, ok, info) { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 400) : '')); }

// 1. Static scan: WotC product-identity / book-only names must not ship.
// The alias map and the guard list must name the old titles so old saves can be
// migrated / re-added entries stripped; they are excluded from the scan.
const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8')
  .replace(/if \(!hearthNameAliases\._m\) hearthNameAliases\._m = .*\n/, '')
  .replace(/const NON_SRD_OR_HOMEBREW_SPELLS = new Set\(.*\n/, '');
const BANNED = ['Beholder', 'Vecna', 'Orcus', 'Kwalish', 'Tabaxi', 'Firbolg', 'Tortle', 'Genasi', 'Aasimar', 'Kenku', 'Duergar', 'Hexblade',
  'Mordenkainen', 'Leomund', 'Bigby', 'Tasha', 'Otiluke', 'Tenser', 'Evard', 'Rary', 'Melf', 'Hadar', 'Agathys', 'Mephistoph', 'Zariel', 'Baalzebul',
  'Dispater', 'Fierna', 'Levistus', 'Glasya', 'Mammon', 'Yggdrasil', 'Mechanus', 'Shadowfell', 'Feywild', 'Xanathar', 'Echo Knight', 'Soulknife', 'Battle Master',
  'Demilich', 'Death Knight', 'Leonin', 'Daunting Roar', "Pride's Bellow", 'Mask of the Wild', 'Drow Magic', 'Mountain Born', 'Asmodean', 'modron', 'flumph', 'Lance of Lethargy', 'Superiority', 'superiority die', "Commander's Strike", 'Totem Spirit', 'Spirit of the Bear', 'Flameskull', 'Efreeti Chain', 'Dwarvish Lords', 'Vile Darkness', 'Exalted Deeds', 'Orb of Dragonkind'];
// Ids/identifiers are lowercase or camelCase (e.g. 'hexblade', isHexbladeChar); only user-visible capitalised words count.
const found = BANNED.filter(w => new RegExp('(?<![A-Za-z_.])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z_(])').test(html));
check('no WotC-only names in app/index.html', found.length === 0, found);

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  await p.goto(URL); await p.waitForTimeout(800);
  // 2. Saved data using old names is migrated on load.
  await p.evaluate(() => {
    localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e');
    const d = generateRandomCharacter();
    Object.assign(d, { id: 'oldnames', name: 'Old Names', race: 'tabaxi', subrace: null, klass: 'warlock', subclass: 'hexblade', subclasses: { warlock: 'hexblade' }, level: 5, classLevels: { warlock: 5 } });
    d.spells = ["Leomund's Tiny Hut", 'Witch Bolt', "Bigby's Hand", 'Eldritch Blast'];
    localStorage.setItem(charactersKey(), JSON.stringify([d]));
  });
  await p.reload(); await p.waitForTimeout(800);
  const mig = await p.evaluate(() => getCharacter('oldnames').spells);
  check('old spell names migrate to new names', JSON.stringify(mig) === JSON.stringify(['Tiny Hut', 'Crackling Tether', 'Arcane Hand', 'Eldritch Blast']), mig);
  const cat = await p.evaluate(() => {
    const names = new Set(SPELLS.map(s => s.name));
    return { tinyHut: names.has('Tiny Hut'), guardHits: SPELLS.filter(s => NON_SRD_OR_HOMEBREW_SPELLS.has(s.name)).map(s => s.name),
      originals: SPELLS.filter(s => s.source === 'hearth-original').length, dupes: SPELLS.length - names.size };
  });
  check('Tiny Hut exists (community Oath of the Hearth grant resolves)', cat.tinyHut);
  check('no old non-SRD spell names in SPELLS', cat.guardHits.length === 0, cat.guardHits);
  check('27 spells tagged hearth-original', cat.originals === 27, cat.originals);
  check('no duplicate spell names', cat.dupes === 0, cat.dupes);
  const opt = await p.evaluate(() => ({
    m5: MANEUVERS.map(m => m.name), m55: Object.values(MANEUVERS_55).map(m => m.name),
    inv: WARLOCK_INVOCATIONS.filter(i => ['grasp_of_hadar','lance_of_lethargy','improved_pact_weapon'].includes(i.id)).map(i => i.name),
    surges: WILD_MAGIC_SURGES.length, totem: TOTEM_SPIRIT_OPTIONS.map(o => o.name),
    lion: [RACES.lion.name, RACES.pridefolk.name, SPECIES_55.lion.name, SPECIES_55.pridefolk.name] }));
  check('option tables kept and renamed (16 + 20 manoeuvres, 3 invocations, 100 surges, spirit options)',
    opt.m5.length === 16 && opt.m55.length === 20 && opt.inv.join() === 'Grasp of the Void,Leaden Bolt,Honed Pact Weapon' && opt.surges === 100 && opt.totem[0] === 'Bear Guardian', opt);
  check('Lion/Pridefolk rebuilt as Sunmane/Grassrunner', opt.lion.join() === 'Sunmane,Grassrunner,Sunmane,Grassrunner', opt.lion);
  // 3. Every subclass and race renders on the sheet without errors, in both rulesets.
  const before = errs.length;
  const r = await p.evaluate(async () => {
    const out = { rendered: 0, bad: [] };
    for (const rs of ['5e', '5.5e']) {
      localStorage.setItem('hearth.ruleset', rs);
      const table = rs === '5e' ? SUBCLASSES : SUBCLASSES_55;
      for (const k of Object.keys(table)) for (const s of Object.keys(table[k])) {
        try {
          const d = generateRandomCharacter();
          Object.assign(d, { klass: k, subclass: s, subclasses: { [k]: s }, level: 20, classLevels: { [k]: 20 } });
          saveCharacter(d); state.activeCharId = d.id; render(); out.rendered++;
        } catch (e) { out.bad.push(rs + ':' + k + '/' + s + ' ' + e.message); }
      }
    }
    localStorage.setItem('hearth.ruleset', '5e');
    for (const race of Object.keys(RACES)) {
      const subs = Object.keys(RACES[race].subraces || {}); for (const sr of (subs.length ? subs : [null])) {
        try { const d = generateRandomCharacter(); Object.assign(d, { race, subrace: sr, level: 5 }); saveCharacter(d); state.activeCharId = d.id; render(); out.rendered++; }
        catch (e) { out.bad.push('race ' + race + '/' + sr + ' ' + e.message); }
      }
    }
    return out;
  });
  check('all subclasses and races render', r.bad.length === 0 && errs.length === before, { rendered: r.rendered, bad: r.bad, errs: errs.slice(before, before + 5) });
  await b.close();
  const failed = results.filter(x => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
