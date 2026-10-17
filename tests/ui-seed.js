// Hearth UI polish — screenshot/test fixtures. The names below are Jenny's placeholder samples (SPEC §6),
// used only to stage screenshots; the app itself shows whatever the user has.
module.exports.SEED = (opts) => {
  opts = opts || {};
  localStorage.clear();
  localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done');
  if (opts.palette) { const pr = JSON.parse(localStorage.getItem('hearth.prefs.v1') || '{}'); pr.palette = opts.palette; pr.theme = 'dark'; localStorage.setItem('hearth.prefs.v1', JSON.stringify(pr)); }
};
// run after the reload; builds characters + games through the app's own functions
module.exports.STAGE = (opts) => {
  opts = opts || {};
  try { hearthCloseTour(); } catch (e) {}
  const T = (n) => 'tokens/lib/' + n + '.webp';
  if (!opts.noChars) {
    const os = JSON.parse(JSON.stringify(HEARTH_SAMPLE_CHARACTER));
    os.name = 'Sir Oswin'; os.photo = T('knight'); os.xp = 2700; os.updatedAt = new Date().toISOString();
    saveCharacter(os);
    const mk = (name, race, klass, sub, level, photo, hp, days) => {
      const d = generateRandomCharacter();
      Object.assign(d, { name, race, subrace: null, klass, level, classLevels: { [klass]: level }, photo: T(photo) });
      if (sub) { d.subclass = sub; d.subclasses = { [klass]: sub }; }
      d.id = 'seed_' + name.toLowerCase().replace(/\W+/g, '_');
      d.currentHp = null; saveCharacter(d);
      const c = getCharacter(d.id); if (c) { c.currentHp = hp == null ? maxHp(c) : Math.min(hp, maxHp(c)); c.updatedAt = new Date(Date.now() - days * 864e5).toISOString(); const all = loadCharacters().map(x => x.id === c.id ? c : x); saveCharacters(all); }
      return d.id;
    };
    mk('Brin Tallow', 'human', 'fighter', 'champion', 3, 'guard', null, 2);
    mk('Elowen Vale', 'elf', 'ranger', 'gloom_stalker', 4, 'ranger', 14, 8);
    mk('Thessaly Marr', 'human', 'wizard', 'evocation', 5, 'mage', null, 9);
    mk('Brother Aldric', 'dwarf', 'cleric', 'life', 3, 'priest', null, 21);
    mk('Mira Quickfingers', 'halfling', 'rogue', null, 2, 'bandit', 9, 30);
    state.activeCharId = os.id;
  }
  if (!opts.noGames) {
    const coll = loadGames();
    const g = hearthBuildSampleGame();
    g.id = 'seed_crypt'; g.name = 'The Sunken Crypt'; delete g.sample;
    g.players.push({ id: 'sample_pl_oswin', name: 'Sir Oswin', maxHp: 28, ac: 19 });
    const e = g.encounters[0]; e.id = 'seed_enc_goblin'; e.name = 'Goblin ambush'; delete e.sample; g.activeEncounterId = e.id;
    e.monsters.push({ id: 'seed_m_gob3', kind: 'monster', monsterId: 'm_goblin', name: 'Goblin 3', init: 11, hp: 7, maxHp: 7, statuses: [], order: 8, mapX: 13, mapY: 6 });
    e.monsters.push({ id: 'seed_m_arch', kind: 'monster', monsterId: 'm_goblin', name: 'Goblin Archer', init: 14, hp: 7, maxHp: 7, statuses: [], order: 9, mapX: 14, mapY: 5 });
    const e2 = JSON.parse(JSON.stringify(e)); e2.id = 'seed_enc_crypt'; e2.name = 'The drowned crypt'; e2.monsters = e2.monsters.slice(0, 2);
    g.encounters.push(e2);
    const g2 = hearthBuildSampleGame(); g2.id = 'seed_frost'; g2.name = 'Frostfell Pass'; delete g2.sample; g2.encounters[0].id = 'seed_enc_f1'; g2.encounters[0].name = 'Wolves on the ridge'; delete g2.encounters[0].sample; g2.activeEncounterId = 'seed_enc_f1';
    coll.games = [g, g2]; coll.activeGameId = g.id; saveGames(coll);
  }
  if (!opts.nudge) try { hearthNudgeDismiss(); } catch (e) {}
  state.tab = 'character'; setActiveTab('character'); state.ui.homeMenu = null; state.ui.homePanel = null;
  render();
};
