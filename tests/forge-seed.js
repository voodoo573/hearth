// Seeded homebrew for the Forge shots and test (Jenny's forge-desk list): two subclasses (one a draft with
// unwritten features), three magic items and two house rules. Runs in the page.
module.exports.FORGE = () => {
  const now = Date.now(), day = 864e5;
  const sub = (id, name, klass, desc, lf, at) => ({ type: 'subclass', title: name, savedAt: at, data: { id, name, klass, desc, role: 'support', delivery: 'martial', element: 'fire', skills: [], tool: '', complexity: 'focused', levelFeatures: lf, edition: '5e' } });
  const item = (id, name, rarity, type, attune, at) => ({ type: 'magic_item', title: name, savedAt: at, data: { id, name, rarity, type, attune, desc: '' } });
  const list = [
    sub('circle_of_embers', 'Circle of Embers', 'druid', 'Druids who keep the last coals of a dying world.', { 2: [{ name: 'Ember Shape', desc: 'Wild Shape into a creature wreathed in harmless flame.' }], 6: [{ name: 'Kindled Ward', desc: 'Resistance to fire while in Wild Shape.' }] }, now - 3 * 36e5),
    item('lantern_revealing', 'Lantern of Revealing', 'uncommon', 'wondrous', false, now - day),
    item('blade_last_ember', 'Blade of the Last Ember', 'rare', 'weapon', true, now - 20 * day),
    item('cloak_tavern_cat', 'Cloak of the Tavern Cat', 'uncommon', 'wondrous', false, now - 50 * day),
    sub('oath_hearthfire', 'Oath of the Hearthfire', 'paladin', 'Knights sworn to keep every hearth lit against the dark.', { 3: [{ name: 'Channel Divinity: Kindle', desc: 'Your weapon sheds bright light and deals an extra 1d6 fire.' }, { name: 'Hearthward', desc: 'Allies within 10 ft gain +1 AC while you are conscious.' }], 7: [{ name: 'Aura of Warmth', desc: '' }], 15: [{ name: 'Undying Flame', desc: '' }] }, now - 20 * 6e4),
  ];
  localStorage.setItem('hearth.ai.homebrew.v1', JSON.stringify(list));
  const s = loadDmSettings(); s.houseRules = [{ key: 'potion_bonus', title: 'Potions as a bonus action', enabled: true, at: now - 6 * day }, { key: 'crit_max', title: 'Critical hits: max die + roll', enabled: true, at: now - 30 * day }]; saveDmSettings(s);
};
