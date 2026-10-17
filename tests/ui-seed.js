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
    let n = 0;
    const mon = (monsterId, name, tok) => { const m = findMonster(monsterId); const hp = m ? (m.hp || m.hit_points || 10) : 10; n++; return { id: 'seed_m' + n, kind: 'monster', monsterId: m ? monsterId : undefined, name: name || (m ? m.name : monsterId), init: 10 + (n % 7), hp, maxHp: hp, statuses: [], order: n, mapX: 6 + (n % 6), mapY: 4 + (n % 4), tokenImage: tok ? T(tok) : undefined }; };
    const enc = (id, name, mapId, ms, ps) => ({ id, name, monsters: ms, playerState: ps || {}, turnIdx: 0, round: 1, tieBreaks: {}, mapCols: 16, mapRows: 12, mapKind: 'painted', mapId });
    const pl = (cid, name) => { const c = getCharacter(cid); return { id: 'seed_pl_' + cid, name, charId: c ? c.id : undefined, maxHp: c ? maxHp(c) : 20, ac: c ? ac(c) : 12 }; };
    const oswinId = (loadCharacters().find(c => c.name === 'Sir Oswin') || {}).id;
    const g = { id: 'seed_crypt', name: 'The Sunken Crypt', level: 3, players: [pl(oswinId, 'Sir Oswin'), pl('seed_elowen_vale', 'Elowen Vale'), pl('seed_thessaly_marr', 'Thessaly Marr'), pl('seed_brother_aldric', 'Brother Aldric')],
      encounters: [
        enc('seed_enc_goblin', 'Goblin ambush', 'crypt', [mon('m_goblin', 'Goblin 1', 'goblin'), mon('m_goblin', 'Goblin 2', 'goblin'), mon('m_goblin', 'Goblin Archer', 'goblin-archer'), mon('m_wolf', 'Wolf', 'wolf')], { ['seed_pl_seed_elowen_vale']: { hp: 14, statuses: [] } }),
        enc('seed_enc_ogre', 'The ogre\u2019s larder', 'cavern', [mon('m_ogre', 'Ogre', 'ogre'), mon('m_goblin', 'Goblin 1', 'goblin'), mon('m_goblin', 'Goblin 2', 'goblin')]),
        enc('seed_enc_cult', 'Cult of the Ember Eye', 'temple', [mon('m_cultist', 'Cultist 1', 'cultist'), mon('m_cultist', 'Cultist 2', 'cultist'), mon('m_priest', 'Priest', 'priest'), mon('m_skeleton', 'Skeleton', 'skeleton')]),
        enc('seed_enc_dragon', 'Lair of Vermithrax', 'crypt', [mon('m_young_red_dragon', 'Vermithrax', 'young-dragon-red'), mon('m_cultist', 'Cultist 1', 'cultist'), mon('m_cultist', 'Cultist 2', 'cultist')])],
      activeEncounterId: 'seed_enc_goblin',
      notes: [{ id: 'seed_note1', title: '', body: 'Vermithrax is awake. If the party rings the bell in the shrine, the dragon arrives in 3 rounds.', pinned: true, created: Date.now(), updated: Date.now() },
        { id: 'seed_note2', title: '', body: 'Elowen owes the innkeeper 5 gp.', pinned: false, created: Date.now() - 1000, updated: Date.now() - 1000 }] };
    const g2 = { id: 'seed_frost', name: 'Frostfell Pass', level: 2, players: [pl('seed_brin_tallow', 'Brin Tallow'), pl('seed_mira_quickfingers', 'Mira Quickfingers'), pl('seed_elowen_vale', 'Elowen Vale')],
      encounters: [enc('seed_enc_toll', 'Road toll', 'snow', [mon('m_bandit', 'Bandit 1', 'bandit'), mon('m_bandit', 'Bandit 2', 'bandit'), mon('m_guard', 'Guard', 'guard')]),
        enc('seed_enc_wolves', 'Wolves at the treeline', 'snow', [mon('m_dire_wolf', 'Dire Wolf', 'dire-wolf'), mon('m_wolf', 'Wolf 1', 'wolf'), mon('m_wolf', 'Wolf 2', 'wolf'), mon('m_wolf', 'Wolf 3', 'wolf')])],
      activeEncounterId: 'seed_enc_toll', notes: [] };
    coll.games = [g, g2]; coll.activeGameId = g.id; saveGames(coll);
  }
  if (!opts.nudge) try { hearthNudgeDismiss(); } catch (e) {}
  state.tab = 'character'; setActiveTab('character'); state.ui.homeMenu = null; state.ui.homePanel = null;
  render();
};
