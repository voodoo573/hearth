// Hearth UI polish — Gear: inventory (armour class, coins, what the hero carries) beside the catalogue.
// The catalogue keeps the app's hooks (#gearCatSearch, data-gearcat) so wireGearCatalogue still drives it.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, tag = U.tag, esc = U.esc;
  function ch() { try { return state.activeCharId ? getCharacter(state.activeCharId) : U.current(); } catch (e) { return null; } }
  function inv(c) { return c.inventory || { weapons: [], items: [], currency: {} }; }
  function dmg(d) { return d && d.count ? d.count + 'd' + d.sides : ''; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function invRows(c) {
    var I = inv(c), out = [];
    if (I.armor) out.push(['shield', I.armor.name, cap(I.armor.cat) + ' armour · AC ' + I.armor.baseAc + (I.armor.str ? ' · Str ' + I.armor.str : ''), 'Equipped']);
    if (I.shield) out.push(['shield', 'Shield', '+2 AC', 'Equipped']);
    (I.weapons || []).forEach(function (w) { out.push(['sword', w.name + (w.magicBonus ? '' : ''), [dmg(w.damage) + ' ' + (w.type || ''), (w.props || []).join(', ')].filter(function (x) { return x.trim(); }).join(' · '), w.equipped ? 'Equipped' : 'Carried']); });
    (I.items || []).forEach(function (it) { out.push([/potion|elixir/i.test(it.name) ? 'potion' : /ration|food/i.test(it.name) ? 'pack' : /symbol|amulet|holy/i.test(it.name) ? 'sun' : 'pack', it.name + (it.qty > 1 ? ' ×' + it.qty : ''), it.notes || (it.source === 'pack' ? 'From your pack' : it.source === 'background' ? 'Background' : ''), 'Carried']); });
    return out;
  }
  function invCard(c, desk) {
    var rows = invRows(c);
    return '<div class="card listcard invc"><div class="lc-h">' + U.sec('Inventory · ' + rows.length + (rows.length === 1 ? ' item' : ' items'), 'Manage', 'data-u-act="gear-manage"') + '</div><div class="list" data-u-scroll>' +
      (rows.length ? rows.map(function (r) { return '<div class="row"><span class="lead">' + ic(r[0]) + '</span><div class="grow" style="min-width:0"><div class="t-h3 ell">' + esc(r[1]) + '</div>' + (r[2] ? '<div class="t-meta ell">' + esc(r[2]) + '</div>' : '') + '</div>' + tag(r[3], r[3] === 'Equipped' ? 'moss' : '') + '</div>'; }).join('') : '<div class="t-meta" style="padding:12px 16px">Nothing carried yet.</div>') + '</div></div>';
  }
  function acCard(c) {
    var cur = inv(c).currency || {};
    var coins = ['pp', 'gp', 'ep', 'sp', 'cp'].map(function (k) { return '<div class="coin"><span class="t-label">' + k.toUpperCase() + '</span><b>' + (cur[k] || 0) + '</b></div>'; }).join('');
    var eq = (inv(c).weapons || []).filter(function (w) { return w.equipped; }).length;
    return '<div class="card acc"><div class="hstack gap4"><div><div class="t-label">Armour class</div><div class="t-num big">' + esc(U.acOf(c)) + '</div></div><div class="f1"><div class="t-label">Equipped</div><div class="t-body" style="margin-top:6px">' + esc([inv(c).armor && inv(c).armor.name, inv(c).shield && 'Shield', eq + (eq === 1 ? ' weapon' : ' weapons')].filter(Boolean).join(' · ')) + '</div></div></div><div class="coins">' + coins + '</div></div>';
  }
  var CATS = [['weapons', 'Weapons'], ['armour', 'Armour'], ['magic', 'Magic items'], ['spells', 'Spells']];
  function catRows() {
    var cat = state.ui.gearCatCat || 'weapons', q = (state.ui.gearCatSearch || '').trim().toLowerCase(), sub = state.ui.uGearSub || 'all';
    var m = function (t) { return !q || String(t || '').toLowerCase().indexOf(q) >= 0; }, rows = [];
    if (cat === 'weapons') {
      Object.keys(WEAPONS).map(function (k) { return [k, WEAPONS[k]]; }).filter(function (x) { var w = x[1]; return w.name && (m(w.name) || m(w.type) || m(w.cat) || m((w.props || []).join(' '))) && (sub === 'all' || (sub === 'ranged' ? w.kind === 'ranged' : (w.cat === sub && w.kind !== 'ranged'))); })
        .sort(function (a, b) { return a[1].name.localeCompare(b[1].name); })
        .forEach(function (x) { var w = x[1]; rows.push(['sword', w.name, cap(w.cat) + ' ' + (w.kind || ''), (dmg(w.damage) + ' ' + (w.type || '')).trim(), (w.props || []).join(', '), 'data-u-act="gear-add-weapon" data-id="' + esc(x[0]) + '"']); });
    } else if (cat === 'armour') {
      Object.keys(ARMOR).map(function (k) { return ARMOR[k]; }).filter(function (a) { return a.name && (m(a.name) || m(a.cat)); }).sort(function (a, b) { return (a.baseAc || 0) - (b.baseAc || 0); })
        .forEach(function (a) { rows.push(['shield', a.name, cap(a.cat) + ' armour', 'AC ' + a.baseAc + (a.dexCap == null ? ' + Dex' : a.dexCap === 0 ? '' : ' + Dex (max ' + a.dexCap + ')'), [a.stealthDisadv ? 'Stealth disadvantage' : '', a.str ? 'Str ' + a.str : ''].filter(Boolean).join(' · '), 'data-u-act="gear-manage" data-d="add_armor"']); });
    } else if (cat === 'magic') {
      var RL = typeof MAGIC_ITEM_RARITIES !== 'undefined' ? MAGIC_ITEM_RARITIES : {}, TL = typeof MAGIC_ITEM_TYPES !== 'undefined' ? MAGIC_ITEM_TYPES : {};
      Object.keys(MAGIC_ITEMS).map(function (k) { return [k, MAGIC_ITEMS[k]]; }).filter(function (x) { var it = x[1]; return m(it.name) || m(it.desc) || m((TL[it.type] || {}).name) || m((RL[it.rarity] || {}).name); })
        .sort(function (a, b) { return a[1].name.localeCompare(b[1].name); })
        .forEach(function (x) { var it = x[1]; rows.push(['ring', it.name, (TL[it.type] || {}).name || it.type || '', (RL[it.rarity] || {}).name || it.rarity || '', it.attune ? 'Attunement' : '', it.baseWeapon ? 'data-u-act="gear-add-magic" data-id="' + esc(x[0]) + '"' : 'data-u-act="gear-manage"']); });
    } else {
      (typeof SPELLS !== 'undefined' ? SPELLS : []).filter(function (sp) { return m(sp.name) || m((sp.classes || []).join(' ')) || m(sp.school) || m(sp.range); })
        .sort(function (a, b) { return a.level - b.level || a.name.localeCompare(b.name); })
        .forEach(function (sp) { rows.push(['wand', sp.name, sp.level === 0 ? 'Cantrip' : 'Level ' + sp.level + ' · ' + (sp.school || ''), sp.range || '', (sp.classes || []).join(', '), null]); });
    }
    return rows;
  }
  function catCard(desk) {
    var cat = state.ui.gearCatCat || 'weapons', rows = catRows(), sub = state.ui.uGearSub || 'all';
    var chips = CATS.map(function (c) { return '<button type="button" class="chip' + (c[0] === cat ? ' on' : '') + '" data-gearcat="' + c[0] + '" aria-pressed="' + (c[0] === cat) + '">' + c[1] + (c[0] === cat ? ' <span class="faded">' + rows.length + '</span>' : '') + '</button>'; }).join('');
    var segs = cat === 'weapons' ? '<div class="seg gseg" role="tablist">' + [['all', 'All'], ['simple', 'Simple'], ['martial', 'Martial'], ['ranged', 'Ranged']].map(function (s) { return '<button type="button" role="tab" aria-selected="' + (s[0] === sub) + '" class="' + (s[0] === sub ? 'on' : '') + '" data-u-act="gear-sub" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' : '';
    var head = cat === 'weapons' ? ['Item', 'Type', 'Damage', 'Properties'] : cat === 'armour' ? ['Item', 'Type', 'Armour class', 'Notes'] : cat === 'magic' ? ['Item', 'Type', 'Rarity', ''] : ['Spell', 'Level', 'Range', 'Classes'];
    var body = rows.length ? rows.map(function (r) { return '<div class="tr"><span class="lead sm">' + ic(r[0], 'sm') + '</span><div class="td1 ell"><span class="t-h3">' + esc(r[1]) + '</span>' + (desk ? '' : '<div class="t-meta ell">' + esc([r[2], r[3]].filter(Boolean).join(' · ')) + '</div>') + '</div>' + (desk ? '<div class="td t-meta ell">' + esc(r[2]) + '</div><div class="td ell">' + esc(r[3]) + '</div><div class="td t-meta ell">' + esc(r[4]) + '</div>' : '') + (r[5] ? btn(desk ? 'Add' : '', 'sm' + (desk ? '' : ' sq'), 'plus', r[5] + ' aria-label="Add ' + esc(r[1]) + '"') : '<span class="addsp"></span>') + '</div>'; }).join('')
      : '<div class="t-meta" style="padding:20px">Nothing matches your search.</div>';
    return '<div class="card catc"><div class="hstack gap3"><div class="t-h2">Catalogue</div><span class="t-meta">Everything a character can get · SRD</span></div>' +
      '<label class="field" style="margin-top:14px">' + ic('search', 'sm') + '<input id="gearCatSearch" type="search" placeholder="Search ' + esc(cat === 'magic' ? 'magic items' : cat) + '…" value="' + esc(state.ui.gearCatSearch || '') + '" autocomplete="off" aria-label="Search the catalogue"></label>' +
      '<div class="chips" style="margin-top:12px">' + chips + '</div>' + segs +
      (desk ? '<div class="th"><span></span><span>' + head[0] + '</span><span>' + head[1] + '</span><span>' + head[2] + '</span><span>' + head[3] + '</span><span></span></div>' : '') +
      '<div class="tb" data-u-scroll>' + body + '</div></div>';
  }
  U.screens.gear = {
    owns: true, nav: 'gear',
    html: function () {
      var c = ch(), desk = U.isDesk();
      if (!c) return '<div class="empty" style="padding:60px 0"><span class="emblem">' + ic('pack', 'xl') + '</span><div class="t-h1">No character yet</div><div class="t-body">The catalogue is still here to browse.</div></div>' + catCard(desk);
      return desk ? '<div class="g gear-g"><div class="stack gap4" style="min-height:0">' + acCard(c) + invCard(c, desk) + '</div>' + catCard(desk) + '</div>' : (function () {
        // phone: Inventory / Catalogue segmented control (Jenny's gear-phone); one pane at a time
        var pane = state.ui.uGearPane === 'cat' ? 'cat' : 'inv';
        var seg = '<div class="seg gpseg" role="tablist" aria-label="Gear">' + [['inv', 'Inventory'], ['cat', 'Catalogue']].map(function (x) { return '<button type="button" role="tab" class="' + (x[0] === pane ? 'on' : '') + '" aria-selected="' + (x[0] === pane) + '" data-u-act="gear-pane" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
        return '<div class="stack gap4">' + seg + (pane === 'cat' ? catCard(desk) : acCard(c) + invCard(c, desk)) + '</div>';
      })();
    },
    meta: function () {
      var c = ch(), n = c ? invRows(c).length : 0;
      return { title: 'Gear', meta: c ? esc(c.name) + ' · AC ' + esc(U.acOf(c)) + ' · ' + n + (n === 1 ? ' item' : ' items') : 'The SRD catalogue',
        actions: c ? btn('Custom weapon', '', 'pencil', 'data-u-act="gear-manage" data-d="custom_weapon"') + btn('Add item', 'primary', 'plus', 'data-u-act="gear-manage" data-d="add_item"') : '',
        psub: c ? esc(c.name) : '', pright: c ? U.ibtn('plus', 'data-u-act="gear-manage" data-d="add_item"', true, 'Add item') : '' };
    },
    after: function () { var s = document.getElementById('gearCatSearch'); if (s && s.dataset.uFocus) s.focus(); },
    css: [
      '.gear-g{grid-template-columns:minmax(380px,0.8fr) minmax(0,1.4fr);align-items:stretch;height:calc(100vh - 88px - 64px)}',
      '.gear-g>.stack{display:flex;flex-direction:column}.gear-g .invc{flex:1;min-height:0}.invc .list{overflow:auto;min-height:0;flex:1}',
      '.acc{padding:20px}.t-num.big{font-size:36px;margin-top:6px}',
      '.coins{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:16px}.coin{padding:8px;border-radius:9px;background:var(--well);border:1px solid var(--hair);text-align:center}.coin b{display:block;font:700 18px var(--serif);margin-top:4px}',
      '.catc{padding:20px;display:flex;flex-direction:column;min-height:0}',
      '.gseg{display:inline-grid;grid-template-columns:repeat(4,auto);margin-top:12px;align-self:flex-start}',
      '.th,.tr{display:grid;grid-template-columns:36px minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,1fr) 84px;gap:12px;align-items:center}',
      '.th{padding:14px 12px 8px;font:600 11px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faded)}',
      '.tb{overflow:auto;min-height:0;flex:1;border-radius:10px;border:1px solid var(--hair);background:var(--well)}',
      '.tr{padding:8px 12px;min-height:52px}.tr+.tr{border-top:1px solid var(--hair)}.tr .u-btn{justify-self:end}',
      '.lead.sm{width:32px;height:32px}',
      '.u-phone .tr{grid-template-columns:36px minmax(0,1fr) 44px}.u-phone .tb{max-height:none}.u-phone .catc{padding:16px}',
      '.u-phone .gpseg>button{height:44px!important;font-size:14px!important}.u-phone .gpseg{padding:4px}',
      '.btn.sq{width:44px;padding:0}.addsp{width:44px}'
    ].join('\n')
  };
  var A = U.actions;
  A['gear-pane'] = function (t) { state.ui.uGearPane = t.dataset.v === 'cat' ? 'cat' : null; render(); try { window.scrollTo(0, 0); } catch (e) {} };
  A['gear-sub'] = function (t) { state.ui.uGearSub = t.dataset.v === 'all' ? null : t.dataset.v; render(); };
  A['gear-manage'] = function (t) { var c = ch(); if (!c) { U.go('characters'); return; } state.activeCharId = c.id; state.ui.gearPopup = true; state.ui._gearScroll = 0; if (t && t.dataset.d) state.ui.gearDialog = t.dataset.d; U.go('sheet'); };
  A['gear-add-weapon'] = function (t) { var c = ch(); if (!c) { U.go('characters'); return; } state.activeCharId = c.id; state.ui.gearPopup = true; state.ui.gearDialog = 'add_weapon'; state.ui.weaponDetail = { base: t.dataset.id }; U.go('sheet'); };
  A['gear-add-magic'] = function (t) { var c = ch(); if (!c) { U.go('characters'); return; } state.activeCharId = c.id; state.ui.gearPopup = true; state.ui.gearDialog = 'add_weapon'; state.ui.weaponDetail = { magic: t.dataset.id }; U.go('sheet'); };
})();
