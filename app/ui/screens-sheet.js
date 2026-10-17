// Hearth UI polish — character sheet (Jenny's sheet-desk / sheet-phone mockups).
// The app's renderPlay still draws the sheet and binds all of its wiring. This module lays out Jenny's design
// on top of it: values are read from the app's own markup and data helpers, the app's interactive nodes are
// either moved into the new layout (listeners survive a move) or kept in a hidden holder and driven by
// proxy clicks. Blocks we don't know about (death saves, Wild Shape banner, subclass nag, concentration…)
// stay visible above the tabs, so every feature stays reachable.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, esc = U.esc, D = document;
  var HIDE = '.play-top,.vitals,.boosts-strip,.slots-bar,.resources-strip,.stats-bar,.stats-bar-hint,.action-tabs-primary,.action-tabs-secondary,.gear-summary-card,.cond-strip,.coin-strip,.rest-row,.xp-strip';
  var STAY = '.dialog-backdrop,input[type=file],script,style,.u-cs,.u-cs-hold,[class*="popup"],[class*="overlay"],[id$="Backdrop"],[id$="Overlay"]';
  var ANY = [['Dash', 'Double your movement for this turn.'], ['Disengage', 'Your movement doesn\u2019t provoke opportunity attacks for the rest of the turn.'],
    ['Dodge', 'Attacks against you have disadvantage and you make DEX saves with advantage until your next turn, if you can see the attacker.'],
    ['Help', 'Give an ally advantage on their next ability check, or on their next attack against a creature within 5 ft of you.'],
    ['Hide', 'Make a DEX (Stealth) check to hide when you\u2019re out of sight.'], ['Ready', 'Choose a trigger and an action; take it as your reaction when the trigger happens.'],
    ['Search', 'Make a WIS (Perception) or INT (Investigation) check to find something.'],
    ['Grapple', 'Replace one attack: STR (Athletics) against the target\u2019s STR (Athletics) or DEX (Acrobatics). On a win, its speed is 0.'],
    ['Shove', 'Replace one attack: STR (Athletics) contest to knock the target prone or push it 5 ft away.']];
  var ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  var phoneTab = null; // 'stats' on phone; otherwise the app's own actionTab drives the tabs

  function ch() { try { return state.activeCharId ? getCharacter(state.activeCharId) : null; } catch (e) { return null; } }
  function hold() { return D.querySelector('#content .u-cs-hold'); }
  function app(sel) { var h = hold(); return (h && h.querySelector(sel)) || D.querySelector('#content ' + sel) || D.querySelector(sel); }
  function proxy(sel) { var b = app(sel); if (b) { b.click(); return true; } return false; }
  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function sgn(s) { return String(s).replace(/^-/, '\u2212'); }
  function attr(v) { return esc(String(v)).replace(/"/g, '&quot;'); }
  function px(sel, label, cls, extra) { return '<button type="button" class="' + (cls || '') + '" data-u-act="cs-px" data-v="' + attr(sel) + '" ' + (extra || '') + '>' + label + '</button>'; }

  var openM = null;
  function closeM() { if (openM) { try { openM.close('act'); } catch (e) {} openM = null; } }
  U.actions['cs-px'] = function (t) { var inLayer = t.closest && t.closest('.u-layer'); if (inLayer) closeM(); proxy(t.dataset.v); };
  U.actions['cs-hp'] = function (t) {
    var mine = D.querySelector('[data-cs-amt]'), inp = app('#hpAdjustInput') || app('#hpAdjustInputSheet');
    var v = parseInt(mine && mine.value, 10) || 0; if (v <= 0) { if (mine) mine.focus(); return; }
    if (inp) inp.value = String(v);
    proxy('[data-hp-inline="' + t.dataset.v + '"]');
  };
  U.actions['cs-tab'] = function (t) {
    var v = t.dataset.v;
    if (v === 'inventory' || v === 'gear') { U.go('gear'); return; }
    if (v === 'notes') { proxy('#notesBtn'); return; }
    if (v === 'stats') { phoneTab = 'stats'; render(); return; }
    phoneTab = null;
    var cur = state.ui.actionTab;
    if (v === 'actions') { if (/^(actions|bonus|reaction)$/.test(cur)) render(); else proxy('[data-action-tab="actions"]'); return; }
    proxy('[data-action-tab="' + v + '"]');
  };
  U.actions['cs-any'] = function (t) {
    var a = ANY.filter(function (x) { return x[0] === t.dataset.v; })[0]; if (!a) return;
    openM = U.modal({ id: 'cs-any', cls: 'csdlg', label: a[0], width: 440, html: function () { return '<div class="t-h2">' + esc(a[0]) + '</div><p class="t-body" style="margin:10px 0 18px">' + esc(a[1]) + '</p><div class="hstack"><span class="t-meta">Any character can take this action.</span>' + btn('Done', 'primary mla', '', 'data-u-close="done"') + '</div>'; } });
  };
  U.actions['cs-cond'] = function () {
    var c = ch() || {}; var on = c.conditions || [];
    openM = U.modal({ id: 'cs-cond', cls: 'csdlg', label: 'Add condition', width: 520, html: function () {
      var list = (typeof CONDITIONS !== 'undefined') ? Object.keys(CONDITIONS).filter(function (k) { return k !== 'death_saves'; }) : [];
      return '<div class="t-h2">Conditions</div><p class="t-meta" style="margin:6px 0 14px">Tap one to read it and apply or remove it.</p><div class="chips cs-wrap">' +
        list.map(function (k) { return px('[data-cond-toggle="' + k + '"]', esc(CONDITIONS[k].name), 'chip' + (on.indexOf(k) >= 0 ? ' on' : '')); }).join('') + '</div>' +
        '<div class="hstack" style="margin-top:18px">' + btn('Close', 'mla', '', 'data-u-close="close"') + '</div>';
    } });
  };
  U.actions['cs-coins'] = function () {
    openM = U.modal({ id: 'cs-coins', cls: 'csdlg', label: 'Coins', width: 480, html: function () {
      var cells = [].slice.call(D.querySelectorAll('#content .u-cs-hold .coin-cell'));
      return '<div class="t-h2">Coins</div><div class="cs-coins">' + cells.map(function (cl) {
        var n = txt(cl.querySelector('.coin-name')), v = txt(cl.querySelector('.coin-val')), k = n.toLowerCase();
        return '<div class="cs-coin"><span class="t-label">' + esc(n) + '</span><b>' + esc(v) + '</b><span class="cs-step">' +
          '<button type="button" data-u-act="cs-coin" data-v="' + k + '|-1" aria-label="Remove 1 ' + esc(n) + '">' + ic('minus', 'sm') + '</button>' +
          '<button type="button" data-u-act="cs-coin" data-v="' + k + '|1" aria-label="Add 1 ' + esc(n) + '">' + ic('plus', 'sm') + '</button></span></div>';
      }).join('') + '</div><div class="hstack" style="margin-top:18px">' + btn('Done', 'primary mla', '', 'data-u-close="done"') + '</div>';
    } });
  };
  U.actions['cs-coin'] = function (t) { proxy('[data-coin-delta="' + t.dataset.v + '"]'); if (openM) openM.refresh(); };
  U.actions['cs-menu'] = function () {
    var c = ch() || {};
    var items = [['#notesBtn', 'Notes', 'pencil'], ['#hfRollLogBtn', 'Roll log', 'd20'], ['#quickFeaturesBtn', 'Features and proficiencies', 'scroll'],
      ['#playPhotoBtn', 'Change portrait', 'camera'], ['[data-open-skills-safe]', 'Edit skills', 'list'], ['#inspToggle', c.inspiration ? 'Remove inspiration' : 'Give inspiration', 'sparkle'],
      ['[data-hp-inline="custom"]', 'More HP options', 'heart'], ['#levelModeToggleBtn', 'Levelling: ' + txt(app('#levelModeToggleBtn')), 'levelup'],
      ['[data-rest="short"]', 'Short rest', 'clock'], ['[data-rest="long"]', 'Long rest', 'moon'],
      ['#switchCharacterBtn', 'Switch character', 'swap'], ['#newCharacterMenuBtn', 'New character', 'userplus'], ['#exportCharacterBtn', 'Export this character', 'upload'],
      ['#importCharacterBtn', 'Import a character', 'download'], ['#backupAllBtn', 'Back up everything', 'download'], ['#restoreAllBtn', 'Restore everything', 'refresh'],
      ['#helpMenuBtn', 'How Hearth works', 'help'], ['#deleteCharacterMenuBtn', 'Delete character', 'trash']];
    openM = U.modal({ id: 'cs-menu', cls: 'csdlg csmenu', label: 'Sheet menu', width: 420, html: function () {
      return '<div class="t-label" style="margin:0 0 8px">' + esc(c.name || 'Character') + '</div><div class="list">' + items.filter(function (x) { return app(x[0]); }).map(function (x) {
        return px(x[0], ic(x[2]) + '<span class="grow">' + esc(x[1]) + '</span>', 'row cs-mrow' + (x[0] === '#deleteCharacterMenuBtn' ? ' cs-danger' : ''));
      }).join('') + '</div>';
    } });
  };
  U.actions['sheet-rest'] = function (t) { proxy('[data-rest="' + t.dataset.v + '"]'); };
  U.actions['sheet-levelup'] = function () { proxy('#xpLevelUpBtn'); };

  // ---------- blocks ----------
  function hpCard(c, desk) {
    var cur = txt(app('.hp-current')), max = txt(app('.hp-max')), n = parseInt(cur, 10) || 0, m = parseInt(max, 10) || 0, t = c.tempHp || 0;
    var st = m && n <= 0 ? ['Down', 'crim'] : m && n / m < 0.5 ? ['Bloodied', 'crim'] : ['Healthy', 'moss'];
    var stats = [].slice.call((hold() || D).querySelectorAll('.vital-stats > .vital-stat')).map(function (s) {
      var l = txt(s.querySelector('.vital-stat-l')), v = s.querySelector('.vital-stat-v'), val = v ? v.innerHTML.replace(/<span class="vital-stat-suffix">ft<\/span>/, '<sup>ft</sup>') : '';
      return { l: l, v: val, sel: s.hasAttribute('data-ac-tile') ? '[data-ac-tile]' : s.hasAttribute('data-stat-roll-flat') ? '[data-stat-roll-flat]' : null };
    }).filter(function (s) { return desk || s.l !== 'Passive'; });
    var tiles = stats.map(function (s) {
      var inner = '<span class="t-label">' + esc(s.l) + '</span><b>' + s.v + '</b>';
      return s.sel ? px(s.sel, inner, 'cs-st' + (s.l === 'AC' ? ' ac' : ''), 'aria-label="' + esc(s.l) + '"') : '<div class="cs-st">' + inner + '</div>';
    }).join('');
    var other = app('.vitals .other-speeds-line, .vitals [class*="speeds"]');
    return '<div class="card raised cs-hp' + (desk ? ' pad-l' : '') + '"><div class="hstack"><div><div class="t-label">Hit points</div><div class="cs-hpbig"><b>' + esc(cur) + '</b><span>/ ' + esc(max) + '</span></div></div>' +
      '<div class="mla cs-hptags">' + px('[data-hp-inline="custom"]', '<span class="tag">' + ic('shield', 'sm') + ' Temp HP ' + t + '</span>', 'cs-tagbtn', 'aria-label="Temporary hit points and more HP options"') + '<span class="tag ' + st[1] + '">' + st[0] + '</span></div></div>' +
      '<div style="margin-top:12px">' + U.hpbar(n, m) + '</div>' +
      '<div class="cs-dmg">' + btn('Damage', 'danger', 'minus', 'data-u-act="cs-hp" data-v="damage"') +
      '<input class="field cs-amt" data-cs-amt type="number" min="0" inputmode="numeric" placeholder="0" aria-label="HP amount">' +
      btn('Heal', 'heal', 'plus', 'data-u-act="cs-hp" data-v="heal"') + '</div>' +
      '<div class="cs-st5' + (desk ? '' : ' cph') + '">' + tiles + '</div>' + (other && txt(other) ? '<div class="t-meta" style="margin-top:8px">' + esc(txt(other)) + '</div>' : '') + '</div>';
  }
  function abilities() {
    var cells = [].slice.call((hold() || D).querySelectorAll('.stats-bar-scores > .stat-cell'));
    return '<div class="card pad-l cs-abil"><div class="sec-h"><span class="t-label">Abilities &amp; saves</span></div><div class="cs-ab">' + cells.map(function (s) {
      var a = s.getAttribute('data-stat-edit'), sv = s.querySelector('.stat-cell-save'), p = sv && sv.classList.contains('proficient');
      return px('[data-stat-edit="' + a + '"]', '<span class="t-label">' + esc(txt(s.querySelector('.stat-cell-label'))) + '</span><span class="cs-mod">' + esc(sgn(txt(s.querySelector('.stat-cell-mod')))) + '</span><span class="cs-sc">' + esc(txt(s.querySelector('.stat-cell-score'))) + '</span><span class="cs-sv' + (p ? ' p' : '') + '">Save ' + esc(sgn(txt(sv && sv.querySelector('span')))) + '</span>', 'cs-abx', 'aria-label="' + esc(txt(s.querySelector('.stat-cell-label'))) + ' score, roll or edit"');
    }).join('') + '</div></div>';
  }
  function conditions(c) {
    var on = c.conditions || [], names = typeof CONDITIONS !== 'undefined' ? CONDITIONS : {};
    var act = on.filter(function (k) { return k !== 'exhaustion' && names[k]; });
    var exh = on.indexOf('exhaustion') >= 0;
    var p = {}; try { p = collectCharacterProficiencies(c); } catch (e) {}
    var langs = []; try { langs = characterLanguages(c) || []; } catch (e) {}
    function line(l, v) { return v && v.length ? '<div><span class="faded">' + l + '</span>&nbsp; ' + esc(v.join(', ')) + '</div>' : ''; }
    return '<div class="card pad-l cs-cond"><div class="sec-h"><span class="t-label">Conditions</span></div><div class="cs-wrap">' +
      btn('Add condition', 'quiet sm', 'plus', 'data-u-act="cs-cond"') + px('[data-cond-toggle="death_saves"]', ic('skull', 'sm') + '<span>Death saves</span>', 'btn quiet sm') +
      px('[data-cond-toggle="exhaustion"]', ic('battery', 'sm') + '<span>Exhaustion' + (exh ? '' : ' 0') + '</span>', 'btn sm ' + (exh ? 'primary' : 'quiet')) + '</div>' +
      (act.length ? '<div class="cs-wrap" style="margin-top:10px">' + act.map(function (k) { return px('[data-cond-toggle="' + k + '"]', esc(names[k].name), 'chip on'); }).join('') + '</div>' : '<div class="t-meta" style="margin-top:10px">None active. Icons match the DM\u2019s map badges.</div>') +
      '<div style="height:20px"></div><div class="sec-h"><span class="t-label">Proficiencies</span>' + px('#quickFeaturesBtn', 'All', 'sec-link') + '</div><div class="stack gap2 cs-prof">' +
      line('Armour', p.armour) + line('Weapons', p.weapons) + line('Tools', p.tools) + line('Languages', langs) + '</div></div>';
  }
  function resources() {
    var items = (hold() || D).querySelectorAll('.resources-strip .resource-item');
    if (!items.length) return '';
    return '<div class="card parch pad-l cs-res"><div class="hstack"><span class="t-label">Resources</span><span class="mla t-meta">Rests restore them</span></div><div data-cs-slot="res"></div></div>';
  }
  function slots() {
    var cl = [].slice.call((hold() || D).querySelectorAll('.slots-bar .slot-cluster')); if (!cl.length) return '';
    var meta = [].slice.call((hold() || D).querySelectorAll('.slots-bar .slots-meta-row')).map(function (r) { var s = r.querySelectorAll('span'); return s.length > 1 ? esc(txt(s[0])) + ' <b class="gold">' + esc(sgn(txt(s[1]))) + '</b>' : ''; }).filter(Boolean).join(' · ');
    return '<div class="card pad-l cs-slots"><div class="hstack"><span class="t-label">Spell slots</span><span class="mla t-meta">' + meta + '</span></div>' + cl.map(function (k, i) {
      var lab = txt(k.querySelector('.slot-cluster-label')), lv = parseInt(lab.replace(/\D/g, ''), 10) || 0, pips = k.querySelectorAll('.slot-pip'), sp = k.querySelectorAll('.slot-pip.spent').length;
      return '<div class="hstack gap3 cs-slot"><span class="t-h3">' + (/^P/.test(lab) ? 'Pact ' : '') + (ORD[lv] || lab) + '</span><span class="cs-pips" data-cs-slot="pips' + i + '"></span><span class="mla t-meta">' + (pips.length - sp) + ' of ' + pips.length + '</span></div>';
    }).join('') + '</div>';
  }
  function skills(c) {
    var out = []; try { Object.keys(SKILLS).forEach(function (k) { out.push({ n: SKILLS[k].name, v: skillBonus(c, k), t: skillTag(c, k) }); }); } catch (e) {}
    out.sort(function (a, b) { return a.n.localeCompare(b.n); });
    return '<div class="sec-h"><span class="t-label">Skills</span>' + px('[data-open-skills-safe]', 'Edit', 'sec-link') + '</div><div class="cs-skl">' + out.map(function (s) {
      return px('[data-open-skills-safe]', '<span>' + esc(s.n) + (s.t === 'expertise' ? ' <i class="faded">E</i>' : '') + '</span><b>' + esc(sgn(fmtMod(s.v))) + '</b>', s.t ? 'p' : '', 'aria-label="' + esc(s.n) + ' ' + esc(fmtMod(s.v)) + '"');
    }).join('') + '</div>';
  }
  function features(c) {
    var f = []; try { f = classFeaturesForCharacter(c) || []; } catch (e) {}
    var seen = {}; f = f.filter(function (x) { if (!x || !x.name || seen[x.name]) return false; seen[x.name] = 1; return true; });
    return '<div class="sec-h"><span class="t-label">Features</span>' + px('[data-action-tab="features"]', 'All', 'sec-link') + '</div><div class="list cs-feat">' + f.slice(0, 6).map(function (x) {
      return px('[data-action-tab="features"]', '<span class="gold">' + ic('sparkle', 'sm') + '</span><span class="grow">' + esc(x.name) + '</span><span class="t-meta">' + esc((x.klassName || '') + ' ' + (x.classLevel || '')) + '</span>', 'row');
    }).join('') + '</div>';
  }
  function chipsRow(c) {
    var gp = txt(app('.coin-cell:nth-child(2) .coin-val')) || '0';
    var boosts = [].slice.call((hold() || D).querySelectorAll('.boosts-strip .boost-row')).map(function (b) { return txt(b.querySelector('.boost-name')).replace(/\s*\(.*\)$/, '') + ' ' + txt(b.querySelector('.boost-meta')).replace(/ while .*$/, ''); });
    return '<div class="cs-wrap" style="margin-top:14px">' + btn(esc(gp) + ' gp', 'quiet sm', 'coins', 'data-u-act="cs-coins" aria-label="Coins"') +
      px('#inspToggle', '<span>' + (c.inspiration ? 'Inspired' : 'Inspiration') + '</span>', 'btn sm ' + (c.inspiration ? 'primary' : 'quiet'), 'aria-pressed="' + !!c.inspiration + '"') +
      boosts.map(function (b) { return '<span class="tag gold cs-boost">Boost: ' + esc(b) + '</span>'; }).join('') + '</div>';
  }
  function tabs(desk) {
    var t = state.ui.actionTab, k = phoneTab && !desk ? 'stats' : (t === 'spells' ? 'spells' : t === 'features' ? 'features' : 'actions');
    var list = desk ? [['actions', 'Actions'], ['spells', 'Spells'], ['features', 'Features'], ['inventory', 'Inventory'], ['notes', 'Notes']] : [['actions', 'Actions'], ['spells', 'Spells'], ['stats', 'Stats'], ['gear', 'Gear']];
    return '<div class="' + (desk ? 'tabs' : 'seg') + ' cs-tabs" role="tablist">' + list.map(function (x) { return '<button type="button" role="tab" aria-selected="' + (x[0] === k) + '" class="' + (x[0] === k ? 'on' : '') + '" data-u-act="cs-tab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function econ(desk) {
    var t = state.ui.actionTab; if (!/^(actions|bonus|reaction)$/.test(t)) return '';
    var L = [['actions', 'Action'], ['bonus', desk ? 'Bonus action' : 'Bonus'], ['reaction', 'Reaction']];
    return '<div class="hstack cs-econrow"><div class="cs-econ" role="group" aria-label="Action type">' + L.map(function (x) { return px('[data-action-tab="' + x[0] + '"]', '<i></i>' + x[1], x[0] === t ? 'on' : '', 'aria-pressed="' + (x[0] === t) + '"'); }).join('') + '</div>' + (desk ? '<span class="mla t-meta">Resets on your turn</span>' : '') + '</div>';
  }
  function smiteStrip(c, desk) {
    var h = (hold() || D).querySelector('.action-content .weapon-card-hint'); if (!h || !/Divine Smite/.test(txt(h)) || state.ui.actionTab !== 'actions') return '';
    var lvl = 1; try { var r = slotsRemaining(c).filter(function (s) { return s.remaining > 0; })[0]; if (r) lvl = r.level; } catch (e) {}
    var w = h.closest('.weapon-card'), atk = w && w.querySelector('[data-attack]'), d = Math.min(5, 1 + lvl);
    return '<div class="card parch hstack gap3 cs-smite"><span class="cs-smic">' + ic('bolt') + '</span><div class="f1"><b>Divine Smite</b> <span class="t-meta">' + (desk ? 'after a melee hit, spend a slot: +' + d + 'd8 radiant (+1d8 vs undead or fiends)' : '<br>After a hit \u00b7 +' + d + 'd8 radiant') + '</span></div>' +
      (atk ? px('[data-attack="' + atk.getAttribute('data-attack') + '"]', 'Smite', 'cs-use', 'aria-label="Attack, then add Divine Smite on a hit"') : '') + '</div>';
  }
  function anyChars() {
    if (state.ui.actionTab !== 'actions') return '';
    return '<div class="sec-h" style="margin-top:22px"><span class="t-label">Any character</span></div><div class="cs-wrap">' + ANY.map(function (a) { return '<button type="button" class="chip" data-u-act="cs-any" data-v="' + a[0] + '">' + a[0] + '</button>'; }).join('') + '</div>';
  }

  // Convert the app's tab content: action cards become Jenny's rows; the app's own main block and buttons are
  // moved in so their listeners keep working. Anything else is moved as is.
  function convert(ac, host, desk) {
    var group = null;
    function flush() { group = null; }
    function ensure() { if (!group) { group = D.createElement('div'); group.className = 'u-card u-sunk u-cs-grp'; host.appendChild(group); } return group; }
    [].slice.call(ac.children).forEach(function (k) {
      if (k.matches('.play-defense-strip')) { var g = D.createElement('div'); g.className = 'u-cs-def'; g.appendChild(k); host.appendChild(g); flush(); return; }
      if (k.matches('.tab-header-bar')) {
        var h = D.createElement('div'); h.className = 'u-sec-h u-cs-sech';
        h.innerHTML = '<span class="u-t-label">' + esc(txt(k.querySelector('.tab-header-title'))) + '</span>';
        var add = k.querySelector('button'); if (add) { add.className = 'u-sec-link'; add.textContent = txt(add).replace(/^\+\s*/, ''); h.appendChild(add); }
        host.appendChild(h); flush(); return;
      }
      if (k.matches('.section-mini,.spell-level-divider')) { var s = D.createElement('div'); s.className = 'u-t-label u-cs-sub'; s.textContent = txt(k); if (s.textContent) host.appendChild(s); flush(); return; }
      if (k.matches('.spell-group')) { [].slice.call(k.querySelectorAll(':scope > .action-card')).forEach(function (a) { ensure().appendChild(row(a, desk)); }); return; }
      if (k.matches('.action-card')) { ensure().appendChild(row(k, desk)); return; }
      if (k.matches('.action-empty')) { k.className = 'u-t-meta u-cs-empty'; host.appendChild(k); flush(); return; }
      if (k.matches('.feature')) { k.classList.add('u-cs-featcard'); ensure().appendChild(k); return; }
      k.classList.add('u-cs-raw'); host.appendChild(k); flush();
    });
  }
  function row(card, desk) {
    var r = D.createElement('div'); r.className = 'u-cs-atk';
    var weapon = card.classList.contains('weapon-card'), spell = card.classList.contains('spell-action-card');
    var lead = D.createElement('span'); lead.className = 'u-lead'; lead.innerHTML = U.px(ic(weapon ? 'sword' : spell ? 'wand' : 'bolt')); r.appendChild(lead);
    var main = card.querySelector('.action-card-main') || card; main.classList.add('u-cs-main'); r.appendChild(main);
    if (main.hasAttribute('data-weapon-detail') || main.hasAttribute('data-spell-detail')) { main.setAttribute('role', 'button'); main.setAttribute('tabindex', '0'); }
    var btns = [].slice.call(card.querySelectorAll(':scope > button, :scope > .action-card-actions button, :scope > div:not(.action-card-main) > button'));
    if (weapon) {
      var meta = main.querySelector('.action-card-meta'), parts = txt(meta).split(' \u00b7 '), hit = '', dmg = '', rest = [];
      parts.forEach(function (p) { if (/^atk /.test(p)) hit = p.replace(/^atk\s*/, '').replace(/\s*\(.*$/, ''); else if (!dmg && /\d+d\d+/.test(p)) dmg = p.replace(/\s*\((one|two)-handed\)/, ''); else rest.push(p); });
      var grip = /\((one|two)-handed\)/.exec(txt(meta));
      if (meta) meta.textContent = desk ? [parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : ''].concat(grip ? [grip[1] + '-handed'] : []).concat(rest.slice(1)).join(' \u00b7 ') : dmg;
      [].slice.call(main.querySelectorAll('.weapon-card-hint')).forEach(function (h) { if (!h.querySelector('button')) h.remove(); else h.classList.add('u-t-meta'); });
      var atk = btns.filter(function (b) { return b.hasAttribute('data-attack'); })[0];
      if (atk) {
        atk.className = 'u-cs-roll u-hit'; atk.innerHTML = U.px(ic('d20', 'sm') + '<span>' + esc(sgn(hit || '')) + (desk ? ' to hit' : '') + '</span>'); atk.setAttribute('aria-label', 'Attack with ' + txt(main.querySelector('.action-card-name')) + ', ' + hit + ' to hit');
        r.appendChild(atk);
        if (desk && dmg) { var dm = D.createElement('button'); dm.type = 'button'; dm.className = 'u-cs-roll'; dm.setAttribute('data-u-act', 'cs-px'); dm.setAttribute('data-v', '[data-attack="' + atk.getAttribute('data-attack') + '"]'); dm.setAttribute('aria-label', 'Attack, then roll ' + dmg); dm.innerHTML = U.px(ic('d20', 'sm') + '<span>' + esc(dmg) + '</span>'); r.appendChild(dm); }
        btns = btns.filter(function (b) { return b !== atk; });
      }
    } else if (spell && state.ui.actionTab !== 'spells') { var sd = main.querySelector('.spell-desc'); if (sd) sd.remove(); }
    btns.forEach(function (b) { b.classList.add('u-btn', 'u-sm'); r.appendChild(b); });
    return r;
  }
  function moveResources(root) {
    var slot = root.querySelector('[data-cs-slot="res"]'); if (!slot) return;
    [].slice.call((hold() || D).querySelectorAll('.resources-strip .resource-item')).forEach(function (it) { it.classList.add('u-cs-resi'); slot.appendChild(it); });
  }
  function moveSlots(root) {
    [].slice.call((hold() || D).querySelectorAll('.slots-bar .slot-cluster')).forEach(function (k, i) {
      var t = root.querySelector('[data-cs-slot="pips' + i + '"]'), p = k.querySelector('.slot-cluster-pips');
      if (t && p) { [].slice.call(p.children).forEach(function (x) { x.setAttribute('role', 'button'); x.setAttribute('aria-label', x.classList.contains('spent') ? 'Restore slot' : 'Spend slot'); }); t.appendChild(p); }
    });
  }

  function build(c, root, desk) {
    var tab = state.ui.actionTab, stats = !desk && phoneTab === 'stats';
    var left = hpCard(c, desk) + (desk ? abilities() + conditions(c) : '');
    var right = resources() + slots() + '<div class="card pad-l cs-sk">' + skills(c) + '<div style="height:20px"></div>' + features(c) + chipsRow(c) + '</div>';
    var center = '<div class="card raised cs-center">' + (desk ? '<div class="cs-mh">' + tabs(true) + econ(true) + '</div>' : '') +
      '<div class="cs-body"><div data-cs-slot="extras"></div>' + smiteStrip(c, desk) + '<div data-cs-slot="content"></div>' + anyChars() + '<div data-cs-slot="comp"></div></div></div>';
    var html;
    if (desk) html = '<div class="cs-g"><div class="cs-l">' + left + '</div><div class="cs-c">' + center + '</div><div class="cs-r">' + right + '</div></div>';
    else if (stats) html = '<div class="cs-p">' + hpCard(c, false) + tabs(false) + '<div data-cs-slot="extras"></div>' + abilities() + '<div class="card pad-l cs-sk">' + skills(c) + '</div>' + conditions(c) + '<div class="card pad-l cs-sk">' + features(c) + chipsRow(c) + restRow() + '</div></div>';
    else html = '<div class="cs-p">' + hpCard(c, false) + tabs(false) + econ(false) + '<div data-cs-slot="extras"></div>' + (tab === 'spells' ? slots() : '') + smiteStrip(c, false) +
      '<div data-cs-slot="content"></div>' + (/^(actions|bonus|reaction)$/.test(tab) ? resources() : '') + anyChars() + '<div data-cs-slot="comp"></div></div>';
    root.innerHTML = U.px(html);
  }
  function restRow() {
    return '<div class="cs-wrap" style="margin-top:14px">' + btn('Short rest', 'quiet sm', 'clock', 'data-u-act="sheet-rest" data-v="short"') + btn('Long rest', 'quiet sm', 'moon', 'data-u-act="sheet-rest" data-v="long"') +
      (app('#xpLevelUpBtn') ? btn('Level up', 'primary sm', 'levelup', 'data-u-act="sheet-levelup"') : '') + '</div>';
  }

  U.screens.sheet = {
    nav: 'play',
    meta: function () {
      var c = ch(); if (!c) return { title: 'Play', meta: 'No character selected' };
      var up = (function () { try { return (c.xp || 0) > 0 && levelForXp(c.xp) > (c.level || 1); } catch (e) { return false; } })() || !!D.querySelector('#content #xpLevelUpBtn');
      var line = [U.classLine(c), U.subLine(c), U.raceName(c), c.background && typeof BACKGROUNDS !== 'undefined' && BACKGROUNDS[c.background] ? BACKGROUNDS[c.background].name : ''].filter(Boolean).map(esc).join(' \u00b7 ');
      return { title: esc(c.name || 'Unnamed'), meta: line, lead: true,
        actions: btn('Short rest', '', 'clock', 'data-u-act="sheet-rest" data-v="short"') + btn('Long rest', '', 'moon', 'data-u-act="sheet-rest" data-v="long"') + (up ? btn('Level up', 'primary', 'levelup', 'data-u-act="sheet-levelup"') : '') + ibtn('more', 'data-u-act="cs-menu"', false, 'Sheet menu'),
        pleft: '<button type="button" class="cs-pav" data-u-act="switch" aria-label="Switch character">' + U.avatar(c, 40, 'thin') + '</button>',
        ptitle: esc(c.name || 'Unnamed'), psub: esc([U.classLine(c), U.subLine(c)].filter(Boolean).join(' \u00b7 ')),
        pright: ibtn('d20', 'data-u-act="cs-px" data-v="#hfRollLogBtn"', true, 'Roll log') + ibtn('morev', 'data-u-act="cs-menu"', true, 'Sheet menu') };
    },
    after: function (cEl) {
      var c = ch(); if (!c || !cEl.querySelector('.vitals')) { cEl.classList.remove('u-csm'); return; }
      var desk = U.isDesk(); cEl.classList.add('u-csm');
      var h = D.createElement('div'); h.className = 'u-cs-hold'; h.hidden = true; h.setAttribute('aria-hidden', 'true');
      var ac = null, comp = null, extras = [];
      [].slice.call(cEl.children).forEach(function (k) {
        if (k.matches(HIDE)) h.appendChild(k);
        else if (k.matches('.action-content')) ac = k;
        else if (k.matches('.companions-section')) comp = k;
        else if (!k.matches(STAY) && getComputedStyle(k).position !== 'fixed') extras.push(k);
      });
      cEl.appendChild(h);
      if (ac) h.appendChild(ac);
      var root = D.createElement('div'); root.className = 'u-cs';
      cEl.insertBefore(root, cEl.firstChild);
      build(c, root, desk);
      var ex = root.querySelector('[data-cs-slot="extras"]'); extras.forEach(function (k) { k.classList.add('u-cs-raw'); ex.appendChild(k); });
      var host = root.querySelector('[data-cs-slot="content"]'); if (host && ac) convert(ac, host, desk);
      var cs = root.querySelector('[data-cs-slot="comp"]'); if (cs && comp) { comp.classList.add('u-cs-raw'); cs.appendChild(comp); }
      moveResources(root); moveSlots(root);
      // Between 1280 and 1600 there's room for two columns. The right column goes under the centre card, or under
      // the left column when the centre card is the long one (the Spells and Features tabs).
      var g = root.querySelector('.u-cs-g'), gl = root.querySelector('.u-cs-l'), gc = root.querySelector('.u-cs-c');
      if (g && gl && gc && gc.offsetHeight > gl.offsetHeight + 200) g.classList.add('u-cs-rl');
      if (desk) { // the app's portrait button (change photo) leads the top bar
        var top = D.querySelector('.u-top'), ttl = top && top.querySelector('.u-ttl'), photo = h.querySelector('#playPhotoBtn');
        if (ttl && photo) { photo.classList.add('u-top-photo'); top.insertBefore(photo, ttl); }
      }
      // Enter in the amount field = Damage (the common case at the table)
      var amt = root.querySelector('[data-cs-amt]'); if (amt) amt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); U.actions['cs-hp']({ dataset: { v: 'damage' } }); } });
      [].slice.call(root.querySelectorAll('.u-cs-main[tabindex]')).forEach(function (m) { m.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.click(); } }); });
    },
    css: [
      '#content.csm{max-width:none!important;padding:24px 32px 40px!important}',
      '.u-phone #content.csm{padding:12px 12px 24px!important}',
      '.cs-hold{display:none!important}',
      '.cs-g{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr) minmax(300px,400px);gap:24px;align-items:start}',
      '.cs-l,.cs-r,.cs-p{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '@media (max-width:1599px){.cs-g{grid-template-columns:minmax(320px,380px) minmax(0,1fr);grid-template-areas:"l c" "l r"}.cs-l{grid-area:l}.cs-c{grid-area:c}.cs-r{grid-area:r;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}.cs-r{gap:16px}.cs-r>.cs-sk{grid-column:2;grid-row:1 / span 3}.cs-r>:not(.cs-sk){grid-column:1}.cs-g.cs-rl{grid-template-areas:"l c" "r c";grid-template-rows:auto 1fr}.cs-g.cs-rl>.cs-r{display:flex;flex-direction:column;align-items:stretch}}',
      '.cs-p{gap:12px}',
      '.cs-hpbig{display:flex;align-items:baseline;gap:6px;margin-top:8px}.cs-hpbig b{font:700 46px/1 var(--serif);color:var(--ink)}.cs-hpbig span{font:500 18px var(--sans);color:var(--ink-faded)}',
      '.u-phone .cs-hpbig b{font-size:40px}',
      '.cs-hp:not(.pad-l){padding:14px}',
      '.cs-hptags{display:flex;flex-direction:column;align-items:flex-end;gap:8px}',
      '.cs-tagbtn{cursor:pointer;background:none;border:0;padding:0;display:flex;align-items:center;justify-content:flex-end}','.u-phone .cs-tagbtn{min-height:44px;margin:-11px 0}','.u-phone .cs-hptags{gap:0}',
      '.cs-dmg{display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);gap:8px;margin-top:14px}',
      '.cs-dmg .btn{height:44px;min-width:0;padding:0 10px}',
      '.cs-amt{height:44px;width:100%;min-width:0;text-align:center;font:700 18px var(--sans);color:var(--ink);padding:0 6px;-moz-appearance:textfield}',
      '.cs-amt::-webkit-outer-spin-button,.cs-amt::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
      '.cs-st5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}',
      '.cs-st5.cph{grid-template-columns:1.25fr 1fr 1fr 1fr;gap:6px;margin-top:12px}',
      '.cs-st{display:block;padding:10px 4px;border-radius:10px;background:var(--well);border:1px solid var(--hair);text-align:center;color:var(--ink);font:inherit;min-width:0;min-height:44px}',
      'button.cs-st{cursor:pointer}',
      '.cs-st b{display:block;font:700 22px/1.1 var(--serif);margin-top:6px;color:var(--ink)}.cs-st b sup{font-size:11px;color:var(--ink-faded)}',
      '.cs-st5.cph .cs-st{padding:8px 2px}.cs-st5.cph .cs-st b{font-size:19px;margin-top:4px}',
      '.cs-st.ac{background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--gold) 16%,transparent),transparent 70%),var(--well);border-color:var(--rim-strong)}',
      '.cs-ab{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.cs-abx{display:flex;flex-direction:column;align-items:center;padding:12px 8px 10px;border-radius:12px;background:var(--well);border:1px solid var(--hair);text-align:center;color:var(--ink);font:inherit;cursor:pointer;min-width:0}',
      '.cs-abx:hover,.cs-st:hover{border-color:var(--rim-strong)}',
      '.cs-mod{font:700 28px/1 var(--serif);margin:6px 0 4px;color:var(--ink)}.cs-sc{font-size:12px;color:var(--ink-faded)}',
      '.cs-sv{display:block;margin:8px auto 0;width:max-content;max-width:100%;font:700 11px var(--sans);color:var(--ink-soft);padding:3px 8px;border-radius:999px;border:1px solid var(--rim);white-space:nowrap}',
      '.cs-sv.p{color:var(--on-gold);background:var(--brass-grad);border-color:var(--gold-deep)}',
      '.cs-wrap{display:flex;flex-wrap:wrap;gap:8px}',
      '.cs-prof{font-size:13.5px;color:var(--ink-soft)}.cs-prof .faded{color:var(--ink-faded)}',
      '.sec-link{order:3;font:600 13px var(--sans);color:var(--gold);background:none;border:0;padding:4px 2px;cursor:pointer;white-space:nowrap}',
      '.u-phone .sec-link{min-height:44px;padding:0 6px}',
      '.cs-center{padding:22px 0 0;min-width:0}',
      '.cs-mh{padding:0 24px}',
      '.cs-mh .tabs>button{background:none;border:0;cursor:pointer;font:600 14px var(--sans)}',
      '.cs-body{padding:12px 14px 20px}',
      '.u-phone .cs-body{padding:0}',
      '.seg.cs-tabs>button{border:0;background:none;cursor:pointer;height:40px}','.u-phone .seg.cs-tabs>button{height:44px!important}','.u-phone .cs-atk>.cs-main{min-height:44px;display:flex;flex-direction:column;justify-content:center}','.u-phone .cs-wrap>.chip{height:44px;padding:0 16px}','.u-phone .cs-raw button{min-height:44px}',
      '.cs-econrow{margin:18px 0 6px}',
      '.u-phone .cs-econrow{margin:0}',
      '.cs-econ{display:flex;gap:8px;flex-wrap:wrap}',
      '.u-phone .cs-econ{width:100%;justify-content:space-between}',
      '.cs-econ>button{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--hair);background:var(--well);font:600 12.5px var(--sans);color:var(--ink-soft);cursor:pointer}',
      '.u-phone .cs-econ>button{height:44px;padding:0 14px;flex:1;justify-content:center}',
      '.cs-econ>button i{width:8px;height:8px;border-radius:50%;background:var(--moss)}',
      '.cs-econ>button.on{color:var(--gold);background:color-mix(in srgb,var(--gold) 14%,var(--well));border-color:var(--gold)}',
      '.cs-econ>button.on i{background:var(--gold);box-shadow:0 0 6px var(--gold)}',
      '.cs-sech{margin:18px 4px 10px}',
      '.cs-body>[data-cs-slot="content"]>.cs-sech:first-child,.cs-p [data-cs-slot="content"]>.cs-sech:first-child{margin-top:6px}',
      '.cs-sub{margin:14px 6px 8px}',
      '.cs-grp{overflow:hidden}',
      '.cs-atk{display:grid;grid-template-columns:44px minmax(0,1fr) auto auto auto;align-items:center;gap:12px;padding:12px 14px}',
      '.u-phone .cs-atk{grid-template-columns:40px minmax(0,1fr) auto auto;gap:10px;padding:10px 12px}',
      '.cs-grp>*+*{border-top:1px solid var(--hair)}',
      '.cs-atk>.cs-main{min-width:0;cursor:pointer;background:none!important;border:0!important;padding:0!important;margin:0!important}',
      '.cs-atk .!action-card-name{font:600 16px/1.25 var(--serif);color:var(--ink)!important;margin:0!important}',
      '.cs-atk .!action-card-meta{font:500 12.5px/1.35 var(--sans);color:var(--ink-faded)!important;margin-top:2px!important}',
      '.cs-atk .!spell-desc{font:400 12.5px/1.4 var(--sans);color:var(--ink-soft)!important;margin-top:4px}',
      '.cs-atk .!grip-row{margin-top:6px}',
      '.cs-atk .!weapon-card-hint{margin-top:6px;color:var(--gold)!important}',
      '.cs-roll{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:9px;background:var(--well);border:1px solid var(--rim);font:700 14px var(--sans);color:var(--ink);white-space:nowrap;cursor:pointer}',
      '.u-phone .cs-roll{height:44px}',
      '.cs-roll .i{color:var(--gold)}.cs-roll.hit{border-color:var(--rim-strong)}',
      '.cs-atk>.btn{white-space:nowrap;background:var(--tex),var(--u-surface)!important;color:var(--ink)!important;border:1px solid var(--rim-strong)!important;border-radius:var(--r-sm)!important;font:600 13px/1 var(--sans)!important;min-width:0!important;width:auto!important;margin:0!important}',
      '.cs-smite{padding:12px 16px;margin:12px 0}',
      '.u-phone .cs-smite{margin:0;padding:12px 14px}',
      '.cs-smite .f1{min-width:0}',
      '.cs-smic{color:var(--parch-ink);display:flex}',
      '.cs-use{height:30px;padding:0 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--parch-ink) 35%,transparent);font:600 12.5px var(--sans);display:inline-flex;align-items:center;background:none;color:var(--parch-ink);cursor:pointer;flex:none}',
      '.u-phone .cs-use{height:44px;padding:0 16px}',
      '.cs-def .!play-defense-strip{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 4px!important}',
      '.cs-def .!defense-item{background:var(--well)!important;border:1px solid var(--hair)!important;border-radius:10px!important;color:var(--ink)!important;min-height:44px}',
      '.cs-def .!defense-name{color:var(--ink)!important}.cs-def .!defense-meta{color:var(--ink-faded)!important}.cs-def .!defense-icon{color:var(--gold)!important}',
      '.cs-empty{display:block;padding:8px 6px}',
      '#content .cs-featcard{padding:12px 14px!important;background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;margin:0!important;color:var(--ink)}',
      '#content .cs-featcard .!feature-name{color:var(--ink)!important;font:600 15px var(--serif);background:none!important}#content .cs-featcard .!feature-desc{box-shadow:none!important;color:var(--ink-soft)!important;background:none!important;padding:0!important;font:400 13px/1.45 var(--sans)}',
      '.cs-raw{margin:0 0 12px!important;max-width:none!important}',
      // resources (app nodes moved onto the parchment card)
      '.cs-resi{display:flex!important;align-items:center;gap:10px;padding:12px 0!important;margin:0!important;background:none!important;border:0!important;box-shadow:none!important;color:var(--parch-ink)!important;flex-wrap:wrap}',
      '.cs-resi+.cs-resi{border-top:1px dashed color-mix(in srgb,var(--parch-ink) 25%,transparent)!important}',
      '.cs-resi .!resource-info{flex:1;min-width:0}',
      '.cs-resi .!resource-name{font:600 15px/1.25 var(--serif);color:var(--parch-ink)!important;cursor:pointer}',
      '.cs-resi .!resource-meta{font:500 12.5px var(--sans);color:color-mix(in srgb,var(--parch-ink) 68%,transparent)!important}',
      '.cs-resi .!resource-counter{display:flex;align-items:center;border:1px solid color-mix(in srgb,var(--parch-ink) 30%,transparent);border-radius:8px;overflow:hidden;background:none!important}',
      '.cs-resi .!res-btn{width:32px;height:32px;background:none!important;border:0!important;color:var(--parch-ink)!important;font:700 16px var(--sans);box-shadow:none!important}',
      '.cs-resi .!resource-count{padding:0 8px;font:700 15px var(--serif);color:var(--parch-ink)!important;background:none!important}',
      '.cs-resi .!resource-action-row{display:flex;align-items:center;gap:10px}',
      '.cs-resi .!resource-pips{display:flex;gap:4px}',
      '.cs-resi .!resource-pips>*{width:10px!important;height:10px!important;border-radius:50%!important;background:var(--gold-deep)!important;border:1px solid var(--gold-deep)!important}',
      '.cs-resi .!resource-pips>[class*="spent"],.cs-resi .!resource-pips>[class*="empty"],.cs-resi .!resource-pips>[class*="used"]{background:none!important}',
      '.cs-resi .!resource-use-btn,.cs-resi button:not(.!res-btn){height:30px;padding:0 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--parch-ink) 35%,transparent)!important;font:600 12.5px var(--sans);background:none!important;color:var(--parch-ink)!important;box-shadow:none!important}',
      '.u-phone .cs-resi .!res-btn{width:44px;height:44px}.u-phone .cs-resi .!resource-use-btn,.u-phone .cs-resi button:not(.!res-btn){height:44px;padding:0 16px}',
      // slots
      '.cs-slot{margin-top:14px}',
      '.cs-pips .!slot-cluster-pips{display:flex;gap:6px}',
      '.cs-pips .!slot-pip{width:14px!important;height:14px!important;border-radius:4px!important;transform:rotate(45deg);background:var(--brass-grad)!important;border:1px solid var(--gold-deep)!important;cursor:pointer;margin:3px}',
      '.cs-pips .!slot-pip.!spent{background:var(--well)!important;border-color:var(--rim)!important}',
      '.u-phone .cs-pips .!slot-cluster-pips{gap:2px}.u-phone .cs-pips .!slot-pip{margin:14px}',
      // skills + features
      '.cs-sk{container-type:inline-size}',
      '.cs-skl{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}',
      '@container (max-width:320px){.cs-skl{grid-template-columns:1fr}}',
      '.cs-skl>button{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border:0;border-bottom:1px solid var(--hair);background:none;font:500 13.5px var(--sans);color:var(--ink-soft);cursor:pointer;text-align:left;min-width:0}',
      '.u-phone .cs-skl>button{min-height:44px}',
      '.cs-skl>button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cs-skl b{font-weight:700;color:var(--ink)}',
      '.cs-skl .p span:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);margin-right:7px;vertical-align:1px}',
      '.cs-feat{margin:0 -6px}.cs-feat>.row{min-height:40px;padding:6px;border:0;background:none;width:100%;text-align:left;font:500 13.5px var(--sans);color:var(--ink);cursor:pointer}',
      '.u-phone .cs-feat>.row{min-height:44px}',
      '.cs-boost{height:30px}',
      '.cs-pav{border:0;background:none;padding:0;margin-right:4px;display:flex}',
      '.csmenu .cs-mrow{width:100%;border:0;background:none;text-align:left;font:500 15px var(--sans);color:var(--ink);cursor:pointer;min-height:48px}',
      '.csmenu .cs-mrow .i{color:var(--gold)}.csmenu .cs-danger,.csmenu .cs-danger .i{color:var(--crimson-ink)}',
      '.cs-coins{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}',
      '.cs-coin{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:10px;background:var(--well);border:1px solid var(--hair)}',
      '.cs-coin b{font:700 20px var(--serif);color:var(--ink)}',
      '.cs-step{display:flex;gap:4px}.cs-step button{width:44px;height:44px;border-radius:8px;border:1px solid var(--rim);background:var(--u-surface);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '.u-phone .cs-coins{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '.top-photo{flex:none;width:56px!important;height:56px!important;margin-right:14px}'
    ].join('\n')
  };
})();
