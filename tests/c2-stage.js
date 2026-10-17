// Hearth v1.7.0 — shared staging for the C2 tests and showcase: Jenny's C2 scene
// (six combatants on a painted dungeon, the dragon's turn). Runs in the page.
module.exports.SEED = (layout) => {
  localStorage.clear(); localStorage.setItem('hearth.welcomeSeen', '1'); localStorage.setItem('hearth.ruleset', '5e'); localStorage.setItem('hearth.reskin160', 'done');
  localStorage.setItem('hearth.dmSettings.v1', JSON.stringify(Object.assign({ dmMode: true, projectorHelpSeen: true }, layout ? { dmLayout: layout } : {})));
};
module.exports.STAGE = (opts) => {
  opts = opts || {};
  setActiveTab('dm'); render();
  const mk = (kind, name, extra) => { const before = new Set(loadEncounter().combatants.map(c => c.id)); dmEncounterAdd(kind, name); const e = loadEncounter(); const c = e.combatants.find(x => !before.has(x.id)); Object.assign(c, extra); saveEncounter(e); };
  const L = (k) => 'tokens/lib/' + k + '.webp';
  mk('monster', 'Goblin', { monsterId: 'm_goblin', hp: 7, maxHp: 7, ac: 15, init: 18, tokenImage: L('goblin'), mapX: 11, mapY: 5 });
  mk('player', 'Ranger', { hp: 31, maxHp: 38, ac: 15, init: 16, tokenImage: L('ranger'), mapX: 5, mapY: 9 });
  mk('monster', 'Ogre', { monsterId: 'm_ogre', hp: 59, maxHp: 59, ac: 11, init: 14, tokenImage: L('ogre'), mapX: 7, mapY: 6, statuses: [] });
  mk('monster', 'Goblin Archer', { monsterId: 'm_goblin', hp: 3, maxHp: 7, ac: 13, init: 12, tokenImage: L('goblin-archer'), mapX: 13, mapY: 3, statuses: ['Frightened'] });
  mk('monster', 'Cultist', { monsterId: 'm_cultist', hp: 9, maxHp: 9, ac: 12, init: 9, tokenImage: L('cultist'), mapX: 4, mapY: 3, statuses: ['Restrained', 'Poisoned'] });
  mk('monster', 'Adult Red Dragon', { monsterId: 'm_adult_red_dragon', hp: 212, maxHp: 256, ac: 19, init: 7, tokenImage: L('young-dragon-red'), mapX: 15, mapY: 9, isBoss: false });
  const e = loadEncounter();
  e.mapCols = 20; e.mapRows = 15; e.mapKind = 'painted'; e.mapId = (BATTLE_MAPS.find(m => /dungeon|crypt|hall/i.test(m.id + ' ' + (m.name || ''))) || BATTLE_MAPS[0]).id;
  e.started = true; e.round = 2;
  const order = sortedCombatants(e);
  e.turnIdx = Math.max(0, order.findIndex(c => c.name === (opts.turn || 'Adult Red Dragon')));
  e.aoes = [{ id: 'aoe_fb', kind: 'circle', x: 12, y: 5, len: 3, angle: 0, color: '#e8552d', element: 'fire', pinned: true }];
  saveEncounter(e);
  state.ui.dmMapMode = true; state.ui.dmMapZoomInit = false; render();
};
