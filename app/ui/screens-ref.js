// Hearth UI polish — Reference: a browse rail, an A-to-Z list and the SRD text on parchment.
// Data comes straight from the app (SPELLS, MAGIC_ITEMS, MONSTERS, CONDITIONS); search uses state.ui.refSearch.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, tag = U.tag, esc = U.esc;
  var ORD = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function q() { return (state.ui.refSearch || '').trim().toLowerCase(); }
  function has(t) { var x = q(); return !x || String(t || '').toLowerCase().indexOf(x) >= 0; }
  function cat() { var c = state.ui.uRefCat || 'spells'; return /^(spells|items|monsters|conditions)$/.test(c) ? c : 'spells'; }
  function crL(cr) { try { return crLabel(cr); } catch (e) { return String(cr); } }
  var CATS = [['spells', 'Spells', 'wand'], ['items', 'Magic items', 'ring'], ['monsters', 'Monsters', 'skull'], ['conditions', 'Conditions', 'alert']];
  function items(c) {
    if (c === 'spells') { var lv = state.ui.uRefLvl; return SPELLS.filter(function (s) { return (lv == null || s.level === lv) && (has(s.name) || has((s.classes || []).join(' ')) || has(s.school) || has(s.desc)); }).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (s) { return { k: s.name, name: s.name, badge: s.level === 0 ? 'C' : String(s.level), bsub: s.level === 0 ? 'Cantrip' : 'Level', sub: cap(s.school) + ' · ' + (s.classes || []).map(cap).join(', '), conc: !!s.concentration || /concentration/i.test(s.duration || ''), o: s }; }); }
    if (c === 'items') { var RL = typeof MAGIC_ITEM_RARITIES !== 'undefined' ? MAGIC_ITEM_RARITIES : {}, TL = typeof MAGIC_ITEM_TYPES !== 'undefined' ? MAGIC_ITEM_TYPES : {}; return Object.keys(MAGIC_ITEMS).map(function (k) { return [k, MAGIC_ITEMS[k]]; }).filter(function (x) { return has(x[1].name) || has(x[1].desc); }).sort(function (a, b) { return a[1].name.localeCompare(b[1].name); }).map(function (x) { var it = x[1]; return { k: x[0], name: it.name, badge: ((RL[it.rarity] || {}).name || it.rarity || '?').charAt(0).toUpperCase(), bsub: 'Rarity', sub: [(TL[it.type] || {}).name || cap(it.type), (RL[it.rarity] || {}).name || it.rarity, it.attune ? 'attunement' : ''].filter(Boolean).join(' · '), o: it }; }); }
    if (c === 'monsters') return MONSTERS.filter(function (m) { return has(m.name) || has(m.type) || has('cr ' + crL(m.cr)); }).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (m) { return { k: m.id || m.name, name: m.name, badge: crL(m.cr), bsub: 'CR', sub: [m.size, m.type].filter(Boolean).map(cap).join(' '), o: m }; });
    return Object.keys(CONDITIONS).map(function (k) { return [k, CONDITIONS[k]]; }).filter(function (x) { return has(x[1].name) || has(x[1].desc); }).map(function (x) { return { k: x[0], name: x[1].name, badge: x[1].name.charAt(0), bsub: '', sub: x[1].desc, o: x[1] }; });
  }
  function count(c) { var keep = state.ui.uRefLvl; if (c !== 'spells') { } var n; if (c === 'spells') { state.ui.uRefLvl = null; n = items(c).length; state.ui.uRefLvl = keep; } else n = items(c).length; return n; }
  function selected(list) { var s = state.ui.uRefSel; return (s && list.find(function (x) { return x.k === s; })) || (U.isDesk() ? list[0] : null) || null; }
  function rail() {
    var c = cat();
    return '<div class="card rrail nav"><div class="t-label" style="padding:4px 12px 8px">Browse</div>' + CATS.map(function (x) { return '<button type="button" class="nav-a' + (x[0] === c ? ' on' : '') + '" data-u-act="ref-cat" data-v="' + x[0] + '">' + ic(x[2]) + '<span>' + x[1] + '</span><span class="faded" style="margin-left:auto">' + count(x[0]) + '</span></button>'; }).join('') +
      '<div class="t-label" style="padding:20px 12px 8px;border-top:1px solid var(--hair);margin-top:12px">More in Hearth</div>' +
      '<button type="button" class="nav-a" data-u-go="gear">' + ic('sword') + '<span>Weapons &amp; armour</span></button><button type="button" class="nav-a" data-u-go="forge">' + ic('anvil') + '<span>Homebrew</span></button></div>';
  }
  function chips() {
    if (cat() !== 'spells') return '';
    var lv = state.ui.uRefLvl, have = {}; SPELLS.forEach(function (s) { have[s.level] = 1; });
    return '<div class="chips rchips"><button type="button" class="chip' + (lv == null ? ' on' : '') + '" data-u-act="ref-lvl" data-v="">All levels</button>' + ORD.map(function (l, i) { return have[i] ? '<button type="button" class="chip' + (lv === i ? ' on' : '') + '" data-u-act="ref-lvl" data-v="' + i + '">' + (i === 0 ? 'Cantrips' : l) + '</button>' : ''; }).join('') + '</div>';
  }
  function listHTML(list, sel) {
    var c = cat();
    var head = c === 'spells' ? list.length + ' SRD spells · A–Z' : c === 'items' ? list.length + ' magic items · A–Z' : c === 'monsters' ? list.length + ' monsters · A–Z' : list.length + ' conditions';
    return '<div class="card rlist">' + chips() + '<div class="t-meta" style="padding:6px 16px 8px">' + head + (q() ? ' · matching “' + esc(q()) + '”' : '') + '</div><div class="list" data-u-scroll>' +
      (list.length ? list.map(function (x) { var on = sel && x.k === sel.k; return '<button type="button" class="row rrow' + (on ? ' on' : '') + '" data-u-act="ref-sel" data-v="' + esc(x.k) + '" aria-pressed="' + !!on + '"><span class="lvb"><b>' + esc(x.badge) + '</b>' + (x.bsub ? '<small>' + esc(x.bsub) + '</small>' : '') + '</span><div class="grow" style="min-width:0"><div class="t-h3 ell">' + esc(x.name) + '</div><div class="t-meta ell">' + esc(x.sub) + '</div></div>' + (x.conc ? '<span class="cbadge" title="Concentration">C</span>' : '') + '</button>'; }).join('') : '<div class="t-meta" style="padding:16px">Nothing matches your search.</div>') + '</div></div>';
  }
  function field(l, v) { return v ? '<div><div class="t-label">' + l + '</div><div class="fv">' + v + '</div></div>' : ''; }
  function detailHTML(x) {
    if (!x) return '<div class="card parch rdet"><div class="t-body">Pick something from the list to read it here.</div></div>';
    var c = cat(), o = x.o, top = '', grid = '', body = '', foot = '';
    if (c === 'spells') {
      top = (o.level === 0 ? cap(o.school) + ' cantrip' : ORD[o.level] + '-level ' + o.school);
      grid = field('Casting time', esc(cap(String(o.time || '').replace('_', ' ')))) + field('Range', esc(o.range)) + field('Components', esc(o.components)) + field('Duration', esc(o.duration));
      var dmg = ''; try { dmg = spellDamageText(o) || ''; } catch (e) {} var sc = ''; try { sc = spellScalingText(o) || ''; } catch (e) {}
      body = '<p>' + esc(o.desc) + '</p>' + (dmg ? '<p><b>' + esc(dmg) + '</b></p>' : '') + (sc ? '<p><i>At higher levels.</i> ' + esc(sc) + '</p>' : '');
      foot = '<div class="t-label" style="margin-top:18px">Classes</div><div class="chips" style="margin-top:8px">' + (o.classes || []).map(function (k) { return tag(esc(cap(k))); }).join('') + '</div>';
    } else if (c === 'items') {
      var RL = typeof MAGIC_ITEM_RARITIES !== 'undefined' ? MAGIC_ITEM_RARITIES : {}, TL = typeof MAGIC_ITEM_TYPES !== 'undefined' ? MAGIC_ITEM_TYPES : {};
      top = [(TL[o.type] || {}).name || o.type, (RL[o.rarity] || {}).name || o.rarity].filter(Boolean).join(' · ');
      grid = field('Attunement', o.attune ? 'Required' : 'No') + field('Base weapon', o.baseWeapon && typeof WEAPONS !== 'undefined' && WEAPONS[o.baseWeapon] ? esc(WEAPONS[o.baseWeapon].name) : '');
      body = '<p>' + esc(o.desc || '') + '</p>' + (o.note ? '<p><i>' + esc(o.note) + '</i></p>' : '');
    } else if (c === 'monsters') {
      top = [o.size, o.type].filter(Boolean).map(cap).join(' ') + ' · CR ' + esc(crL(o.cr));
      var sp = o.speed ? Object.keys(o.speed).map(function (k) { return (k === 'walk' ? '' : k + ' ') + o.speed[k] + ' ft'; }).join(', ') : '';
      grid = field('Armour class', esc(o.ac)) + field('Hit points', esc(o.hp + (o.hpFormula ? ' (' + o.hpFormula + ')' : ''))) + field('Speed', esc(sp)) + field('Senses', esc(o.senses || ''));
      var ab = o.abilities ? '<div class="abl">' + ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(function (k) { var v = o.abilities[k] || 10, m = Math.floor((v - 10) / 2); return '<div><span class="t-label">' + k.toUpperCase() + '</span><b>' + v + '</b><small>' + (m >= 0 ? '+' : '−') + Math.abs(m) + '</small></div>'; }).join('') + '</div>' : '';
      body = ab + (o.traits || []).map(function (t) { return '<p><b><i>' + esc(t.name) + '.</i></b> ' + esc(t.desc) + '</p>'; }).join('') + ((o.actions || []).length ? '<div class="t-label" style="margin-top:14px">Actions</div>' + o.actions.map(function (t) { return '<p><b><i>' + esc(t.name) + '.</i></b> ' + esc(t.desc) + '</p>'; }).join('') : '');
    } else { top = 'Condition'; body = '<p>' + esc(o.desc) + '</p>'; }
    return '<div class="card parch rdet" data-u-scroll><div class="t-label">' + esc(top) + '</div><div class="t-display rname">' + esc(x.name) + '</div>' + (grid ? '<div class="fgrid">' + grid + '</div>' : '') + '<div class="rbody">' + body + '</div>' + foot + '<div class="t-meta" style="margin-top:16px">SRD 5.1 · CC-BY-4.0</div></div>';
  }
  function sideCards(x) {
    if (!x || cat() !== 'spells') return '';
    var o = x.o, ch = U.current(), can = ch && (o.classes || []).some(function (k) { return U.classLine(ch).toLowerCase().indexOf(k) >= 0; });
    var slots = []; try { slots = ch ? (slotsRemaining(ch) || []) : []; } catch (e) {}
    var sl = slots.find(function (s) { return s.level === Math.max(1, o.level); });
    var cast = '<div class="card rcast"><div class="hstack gap3">' + (ch ? U.avatar(ch, 40) : '<span class="lead">' + ic('user') + '</span>') + '<div class="f1" style="min-width:0"><div class="t-h3 ell">' + (ch ? esc(ch.name) + (can ? ' can cast this' : ' can’t cast this') : 'No character yet') + '</div><div class="t-meta">' + (ch ? esc(U.classLine(ch)) : 'Make a hero to cast spells') + '</div></div></div>' +
      (can && o.level > 0 ? '<div class="kv"><span class="t-meta">' + ORD[o.level] + '-level slots</span>' + (sl ? U.pips(sl.total, sl.remaining) : '<span class="t-meta">None yet</span>') + '</div>' : can ? '<div class="kv"><span class="t-meta">Cantrip</span><span>At will</span></div>' : '') +
      '<div class="kv"><span class="t-meta">Range</span><span>' + esc(o.range) + '</span></div>' +
      (ch ? btn(can ? 'Cast from the sheet' : 'Open sheet', (can ? 'primary ' : '') + 'block', 'sparkle', 'data-play="' + esc(ch.id) + '" style="margin-top:auto"') : btn('Make a hero', 'block', 'userplus', 'data-home-act="create-char" data-u-go="characters" style="margin-top:auto"')) + '</div>';
    var rel = SPELLS.filter(function (s) { return s !== o && s.level === o.level && s.school === o.school; }).slice(0, 5);
    var conc = '<div class="card rconc">' + (x.conc ? '<div class="t-label">Concentration</div><div class="t-body" style="margin-top:8px;font-size:13px">Taking damage means a CON save: DC 10 or half the damage, whichever is higher.</div>' : '<div class="t-label">Duration</div><div class="t-body" style="margin-top:8px;font-size:13px">' + esc(o.duration) + '</div>') +
      (rel.length ? '<div class="t-label" style="margin-top:16px">Related</div><div class="chips" style="margin-top:8px">' + rel.map(function (s) { return '<button type="button" class="chip" data-u-act="ref-sel" data-v="' + esc(s.name) + '">' + esc(s.name) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    return '<div class="rside">' + cast + conc + '</div>';
  }
  function desk() { var list = items(cat()), sel = selected(list); return '<div class="g ref-g">' + rail() + listHTML(list, sel) + '<div class="rright">' + detailHTML(sel) + sideCards(sel) + '</div></div>'; }
  function phone() {
    var list = items(cat()), c = cat();
    var tabs = '<div class="chips rtabs">' + CATS.map(function (x) { return '<button type="button" class="chip' + (x[0] === c ? ' on' : '') + '" data-u-act="ref-cat" data-v="' + x[0] + '">' + ic(x[2], 'sm') + ' ' + x[1] + '</button>'; }).join('') + '</div>';
    return '<div class="stack gap3"><label class="field">' + ic('search', 'sm') + '<input type="search" data-u-refq placeholder="Search spells, items, monsters…" aria-label="Search the reference" value="' + esc(state.ui.refSearch || '') + '"></label>' + tabs + listHTML(list, null) + '</div>';
  }
  function openDetail(k) {
    var list = items(cat()), x = list.find(function (y) { return y.k === k; }); if (!x) return;
    U.modal({ id: 'ref', cls: 'refsheet', label: x.name, html: function () { return '<div class="dh" style="justify-content:flex-end;margin:-8px 0 4px">' + U.ibtn('x', 'data-u-close="close"', false, 'Close') + '</div>' + detailHTML(x) + sideCards(x); } });
  }
  U.screens.reference = {
    owns: true, nav: 'reference',
    html: function () { return U.isDesk() ? desk() : phone(); },
    meta: function () { return { title: 'Reference', meta: 'The rules at your fingertips: SRD 5.1 and 5.2', search: 'Search spells, items, monsters, conditions…', psub: 'SRD 5.1 and 5.2' }; },
    after: function () {
      var s = document.querySelector('.u-top [data-u-search]') || document.querySelector('[data-u-refq]');
      if (s) { s.value = state.ui.refSearch || ''; s.dataset.uLocal = '1'; s.oninput = function () { state.ui.refSearch = s.value; state.ui.uRefSel = null; var pos = s.selectionStart, isTop = !!s.closest('.u-top'); render(); var s2 = document.querySelector(isTop ? '.u-top [data-u-search]' : '[data-u-refq]'); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} } }; }
      var on = document.querySelector('.u-rrow.u-on'); if (on && U.isDesk() && state.ui._uRefScroll) { var L = on.closest('[data-u-scroll]'); if (L) { var top = on.offsetTop - L.offsetTop; if (top < L.scrollTop || top + on.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = Math.max(0, top - 80); } state.ui._uRefScroll = false; }
    },
    css: [
      '.ref-g{grid-template-columns:260px minmax(340px,0.9fr) minmax(0,1.5fr);height:calc(100vh - 88px - 64px);align-items:stretch}',
      '.rrail{padding:16px 10px;display:flex;flex-direction:column;gap:2px}',
      '.rlist{padding:12px 6px 6px;display:flex;flex-direction:column;min-height:0}.rlist .list{overflow:auto;flex:1;min-height:0}',
      '.rlist>.rchips{padding:0 10px;flex-wrap:wrap;gap:6px;flex:none;height:auto;overflow:visible}.rchips .chip{height:32px}',
      '.rrail{display:flex!important;flex-direction:column}.rrail .nav-a{flex:none}',
      '.parch .rname{color:var(--parch-ink)!important}',
      '.rrow{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 10px;border-left:2px solid transparent;border-radius:0}.rrow.on{background:color-mix(in srgb,var(--gold) 9%,transparent);border-left-color:var(--gold)}',
      '.lvb{width:40px;height:40px;flex:none;border-radius:8px;background:var(--well);border:1px solid var(--rim);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}.lvb b{font:700 15px var(--serif);color:var(--gold)}.lvb small{font:600 7.5px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faded);margin-top:2px}',
      '.cbadge{width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font:700 10px var(--sans);background:var(--well);border:1px solid var(--rim-strong);color:var(--ink)}',
      '.rright{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:20px;min-height:0}',
      '.rdet{padding:24px 28px;overflow:auto;min-height:0}.rname{margin:6px 0 14px}',
      '.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;padding:14px 0;border-top:1px solid var(--parch-hair, rgba(0,0,0,.15));border-bottom:1px solid var(--parch-hair, rgba(0,0,0,.15))}.fv{font-weight:600;margin-top:3px}',
      '.rbody{margin-top:14px;line-height:1.6}.rbody p{margin:0 0 10px}',
      '.abl{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:14px;text-align:center}.abl b{display:block;font:700 16px var(--serif)}.abl small{font-size:11px}',
      '.rside{display:grid;grid-template-columns:1fr 1fr;gap:20px}.rcast,.rconc{padding:18px;display:flex;flex-direction:column;gap:10px;min-height:200px}',
      '.kv{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--hair)}',
      '.u-phone .rlist{padding:6px 0}.rtabs{flex-wrap:nowrap;overflow-x:auto}.rtabs .chip{flex:none}',
      '.refsheet .rdet{max-height:none;padding:18px}.refsheet .rside{grid-template-columns:1fr;margin-top:12px}.refsheet .rcast,.refsheet .rconc{min-height:0}'
    ].join('\n')
  };
  var A = U.actions;
  A['ref-cat'] = function (t) { state.ui.uRefCat = t.dataset.v; state.ui.uRefSel = null; state.ui.uRefLvl = null; render(); };
  A['ref-lvl'] = function (t) { state.ui.uRefLvl = t.dataset.v === '' ? null : Number(t.dataset.v); state.ui.uRefSel = null; render(); };
  A['ref-sel'] = function (t) { if (!U.isDesk()) { openDetail(t.dataset.v); return; } var lst = items(cat()); if (!lst.some(function (x) { return x.k === t.dataset.v; })) { state.ui.uRefLvl = null; state.ui.refSearch = ''; } state.ui.uRefSel = t.dataset.v; state.ui._uRefScroll = true; render(); };
  // top-bar search (Enter) on any screen lands here with the query applied
  var oldSearch = A.search;
  A.search = function (t, e, qq) { state.ui.refSearch = qq || ''; state.ui.uRefSel = null; var hits = ['spells', 'items', 'monsters', 'conditions'].filter(function (c) { return items(c).length; }); if (hits.length && hits.indexOf(cat()) < 0) state.ui.uRefCat = hits[0]; U.go('reference'); };
  A.search._old = oldSearch;
})();
