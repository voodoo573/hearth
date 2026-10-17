/* Hearth v1.7.0 — DM battle screen, layout C2 (design: Jenny, see PROPOSAL.md "C2").
   Map-first: portrait strip on top, the board in the middle, tools in a brass fan
   that opens from the map, and a full stat card for the selected combatant (pinned
   beside the map on desktop, a bottom sheet on phone).
   It reuses the classic battle map's ids and data attributes, so wireDMMap() and
   wireDMEncounter() drive every existing feature; this file adds the C2 extras
   (portraits, fan, flyouts, stat card rolls, use pips, recharge, Place template).
   Monster stat blocks come from dm/srd51-statblocks.js (SRD 5.1, CC-BY-4.0). */
(function () {
  'use strict';
  var W = window;
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function ui() { return state.ui; }
  function wide() { return W.innerWidth >= 900; }
  function sgn(n) { return (n >= 0 ? '+' : '\u2212') + Math.abs(n); }
  function mod(score) { return Math.floor(((+score || 10) - 10) / 2); }
  var ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var ABIL_FULL = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
  var DMG_SHORT = { piercing: 'pierc.', slashing: 'slash.', bludgeoning: 'bludg.', lightning: 'lightn.', necrotic: 'necr.', psychic: 'psych.', radiant: 'rad.', thunder: 'thund.' };

  function blockFor(c) {
    if (!c) return null;
    if (c.isBoss && c.bossStat) return { app: c.bossStat, srd: null };
    var m = c.monsterId && typeof findMonster === 'function' ? findMonster(c.monsterId) : null;
    if (!m) return null;
    var srd = (W.HEARTH_SRD51_BLOCKS || {})[m.id] || null;
    return { app: m, srd: srd };
  }
  function c2s(c) { if (!c.c2 || typeof c.c2 !== 'object') c.c2 = {}; var s = c.c2; s.used = s.used || {}; s.spent = s.spent || {}; s.la = s.la || 0; return s; }
  function hpOf(c) { return c.hp != null ? c.hp : (c.maxHp != null ? c.maxHp : null); }
  function svgShield(cls, ac) { return '<span class="c2-ac ' + (cls || '') + '" title="Armour Class ' + E(ac) + '"><b>' + (ac == null ? '\u2013' : E(ac)) + '</b></span>'; }
  function condIcons(c, size) {
    var list = (c.statuses || []).slice(0, 4).map(function (s) { return '<span class="c2-ci" title="' + E(s) + '">' + (typeof hearthCondBadgeHTML === 'function' ? hearthCondBadgeHTML(s, size) : '') + '</span>'; });
    if (c.concentrating) list.push('<span class="c2-ci" title="Concentrating">' + (typeof hearthCondBadgeHTML === 'function' ? hearthCondBadgeHTML('Concentrating', size) : '\u25C8') + '</span>');
    if ((c.statuses || []).length > 4) list.push('<span class="c2-ci c2-ci-more">+' + ((c.statuses || []).length - 4) + '</span>');
    return list.join('');
  }
  function face(c, px) {
    if (!W.HearthTokens) return '<span class="c2-face-ini">' + E(String(c.name || '?').slice(0, 2)) + '</span>';
    try {
      var kind = c.kind === 'player' ? 'player' : c.isBoss ? 'boss' : (c.disposition === 'ally' ? 'ally' : c.disposition === 'neutral' ? 'neutral' : 'enemy');
      var st = []; if (c.dead) st.push('dead');
      var el = HearthTokens.createToken({ img: c.tokenImage || null, kind: kind, size: 'medium', state: st, conditions: [], cell: px, label: c.name || '' });
      el.classList.add('ht-still');
      return el.outerHTML;
    } catch (e) { return ''; }
  }
  function hpBar(c) {
    var hp = hpOf(c), max = c.maxHp;
    if (!(max > 0) || hp == null) return '<span class="c2-hpb c2-hpb-none"><i style="width:0"></i></span>';
    var pct = Math.max(0, Math.min(1, hp / max)), low = hp <= max / 2;
    return '<span class="c2-hpb ' + (low ? 'low' : '') + '"><i style="width:' + (pct * 100).toFixed(1) + '%"></i></span>';
  }

  // ---------- portrait strip ----------
  function portrait(c, turnId) {
    var hp = hpOf(c), max = c.maxHp, low = max > 0 && hp != null && hp <= max / 2;
    var sel = ui().c2Card && ui().c2Card.id === c.id;
    return '<button class="c2-pc ' + c.kind + (c.id === turnId ? ' act' : '') + (sel ? ' sel' : '') + (c.dead ? ' dead' : '') + (c.hiddenFromPlayers ? ' hid' : '') + '" data-c2-pc="' + E(c.id) + '" title="' + E(c.name) + ' \u2014 open card">' +
      '<span class="c2-pimg">' + face(c, 46) + '<span class="c2-ini">' + (c.init != null ? E(c.init) : '\u2013') + '</span>' + svgShield('c2-ac-sm', c.ac) + '</span>' +
      '<span class="c2-pinfo"><span class="c2-pn">' + E(c.name) + '</span>' +
      '<span class="c2-php ' + (low ? 'low' : '') + '">' + (hp != null ? E(hp) : '\u2013') + (max != null ? '<small>/' + E(max) + '</small>' : '') + '</span>' +
      hpBar(c) + '<span class="c2-pic">' + condIcons(c, 16) + '</span></span></button>';
  }
  function stripHTML(ctx, mini) {
    var order = ctx.order, enc = ctx.enc;
    var next = order.length ? (enc.started ? '<button class="c2-next c2-brass" data-dm-turn="next">Next \u25B8</button>' : '<button class="c2-next c2-brass" data-dm-turn="start">\u2694 Start</button>') : '';
    return '<div class="c2-strip ' + (mini ? 'mini' : '') + '">' +
      (order.length ? order.map(function (c) { return portrait(c, ctx.turnId); }).join('') : '<div class="c2-strip-empty">No combatants yet. Add players and monsters on the encounter board (\u2039 Build), then come back to the map.</div>') +
      '<span class="c2-strip-end">' + next + '</span></div>';
  }

  // ---------- header + More menu ----------
  var PROJ_ICO = '<svg class="hi-ico" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><rect x="1.5" y="2.5" width="13" height="8.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function headHTML(ctx) {
    var enc = ctx.enc, tc = ctx.order.find(function (c) { return c.id === ctx.turnId; });
    var info = enc.started ? '<b>Round ' + E(enc.round || 1) + '</b>' + (tc ? '<span class="c2-wide-only"> \u00b7 ' + E(tc.name) + '\u2019s turn</span>' : '') : '<span>Not started</span>';
    var chip = typeof dmLinkStatusChip === 'function' ? dmLinkStatusChip().replace('class="btn dm-link-btn', 'class="c2-btn dm-link-btn c2-wide-only') : '';
    var next = ctx.order.length ? (enc.started ? '<button class="c2-btn c2-brass c2-narrow-only" data-dm-turn="next">Next \u25B8</button>' : '<button class="c2-btn c2-brass c2-narrow-only" data-dm-turn="start">\u2694 Start</button>') : '';
    return '<div class="dm-map-top c2-top"><button class="c2-back" id="dmMapExit">\u2039 <span class="c2-wide-only">Build</span></button>' +
      '<div class="dm-map-title c2-title">Battle Map</div><div class="c2-round">' + info + '</div><span class="c2-sp"></span>' +
      chip + next + '<button class="c2-btn c2-brass c2-proj" id="dmMapProject" title="Open the projector window">' + PROJ_ICO + '<span class="c2-wide-only"> Projector</span></button>' +
      '<button class="c2-btn c2-more-btn ' + (ui().c2More ? 'on' : '') + '" data-c2-more="1" aria-expanded="' + (ui().c2More ? 'true' : 'false') + '" title="More">\u22EF<span class="c2-wide-only"> More</span></button></div>';
  }
  function MI() { return W.HearthMI || null; }
  function projOn() { return typeof hearthDicePrefs === 'function' && hearthDicePrefs().projector !== 'off'; }
  function moreHTML(ctx) {
    var enc = ctx.enc, mapEncs = ctx.mapEncs || [];
    var hidden = Array.isArray(enc.hiddenPlayers) ? enc.hiddenPlayers : [];
    var chip = typeof dmLinkStatusChip === 'function' ? dmLinkStatusChip().replace('class="btn dm-link-btn', 'class="c2-mi dm-link-btn c2-narrow-only') : '';
    return '<div class="c2-more ' + (ui().c2More ? 'open' : '') + '" role="menu" aria-label="More">' +
      (mapEncs.length > 1 ? '<label class="c2-mi c2-mi-sel"><span>Encounter</span><select id="dmMapEncSelect" title="Switch encounter">' + mapEncs.map(function (e) { return '<option value="' + E(e.id) + '"' + (e.id === enc.id ? ' selected' : '') + '>' + E(e.name) + '</option>'; }).join('') + '</select></label>' : '') +
      chip + (typeof dmRollLogButton === 'function' ? dmRollLogButton('c2-mi') : '') +
      '<button class="c2-mi" data-dm-notes-open="1">\uD83D\uDCD3 Campaign notes</button>' +
      (ctx.needsRollMonsters ? '<button class="c2-mi" data-dm-roll-monsters="1">\uD83C\uDFB2 Roll monster initiative</button>' : '') +
      '<button class="c2-mi" data-dm-reset-enc="1">\u21BA Reset combat</button>' +
      '<button class="c2-mi c2-mi-tog ' + (projOn() ? 'on' : '') + '" data-c2-proj-dice="1" role="menuitemcheckbox" aria-checked="' + (projOn() ? 'true' : 'false') + '"><span>Show dice rolls on projector</span><i class="c2-switch"></i></button>' +
      (hidden.length ? '<div class="c2-mi c2-mi-hid"><span>Sitting out</span>' + hidden.map(function (h) { return '<button class="c2-chip" data-dm-unhide="' + E(h.id) + '">' + E(h.name || 'Player') + ' + back</button>'; }).join('') + '</div>' : '') +
      (MI() ? '<button class="c2-mi c2-mi-tog ' + (ui().miRH ? 'on' : '') + '" data-mi-rh="1" aria-expanded="' + (ui().miRH ? 'true' : 'false') + '">\uD83D\uDCDC Round history</button>' + (ui().miRH ? MI().historyHTML(enc) : '') : '') +
      '<button class="c2-mi" data-c2-layout="classic">\u25A4 Classic layout</button></div>';
  }

  // ---------- fan + flyouts ----------
  var ICO = {
    aoe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.2"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>',
    measure: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-35 12 12)"/><path d="M8.3 10.3l1.4 2M11.4 8.1l1.4 2M14.6 5.9l1.4 2" stroke="currentColor" stroke-width="1.6" transform="rotate(0)"/></svg>',
    point: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.3-6.5-11a6.5 6.5 0 0 1 13 0c0 4.7-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>',
    fog: '<svg viewBox="0 0 24 24"><path d="M4 9h12M7 13h13M3 17h11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    group: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 19c.8-3 3-4.5 5.5-4.5S13.2 16 14 19M11.5 15.2c1.2-.5 2.8-.7 4.5-.7 2.5 0 4.7 1.5 5.5 4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M9 4v16M15 4v16" stroke="currentColor" stroke-width="2"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14M15 6v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    view: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5.5 5.5M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  function fanItem(key, label, attrs, on) {
    return '<button class="c2-fan-i ' + (on ? 'on' : '') + '" data-c2-fan-i="' + key + '" ' + attrs + ' aria-label="' + E(label) + '">' + ICO[key] + '<small>' + E(label) + '</small></button>';
  }
  function fanHTML(enc) {
    var u = ui(), open = !!u.c2Fan, mi = MI();
    if (mi && mi.aoeOpen()) return mi.fanHTML();
    var inner = [
      fanItem('aoe', 'AoE', mi ? 'data-mi-aoe-open="1"' : 'data-c2-miwait="1" aria-disabled="true" title="Map tools are loading\u2026"', false), // no v1.6 fallback on C2
      fanItem('measure', 'Measure', 'data-ruler-tool="1"', !!u.dmRulerTool),
      fanItem('point', 'Point', 'data-pointer-tool="1"', !!u.dmPointerMode),
    ];
    var outer = [
      fanItem('fog', 'Fog', mi ? 'data-mi-fog-open="1"' : 'data-c2-miwait="1" aria-disabled="true" title="Map tools are loading\u2026"', !!mi && !!(enc.fog && enc.fog.on)),
      fanItem('group', 'Group', 'data-group-tool="1"', !!u.dmGroupMode),
      fanItem('grid', 'Grid', 'data-c2-fly="grid"', u.c2Fly === 'grid'),
      fanItem('map', 'Map', 'data-c2-fly="map"', u.c2Fly === 'map'),
      fanItem('view', 'View', 'data-c2-fly="view"', u.c2Fly === 'view'),
    ];
    function place(list, r, a0, a1) {
      return list.map(function (h, i) {
        var a = (a0 + (a1 - a0) * (list.length === 1 ? 0.5 : i / (list.length - 1))) * Math.PI / 180;
        return h.replace('class="c2-fan-i', 'style="--x:' + (Math.cos(a) * r).toFixed(3) + ';--y:' + (Math.sin(a) * r).toFixed(3) + '" class="c2-fan-i');
      }).join('');
    }
    return '<div class="c2-fan ' + (open ? 'open' : '') + '" aria-hidden="' + (open ? 'false' : 'true') + '"><span class="c2-fan-glow"></span>' +
      '<span class="c2-fan-ring c2-fan-r1">' + place(inner, 1, 180, 270) + '</span><span class="c2-fan-ring c2-fan-r2">' + place(outer, 1, 180, 270) + '</span></div>' +
      '<button class="c2-fab ' + (open ? 'open' : '') + '" data-c2-fab="1" aria-expanded="' + (open ? 'true' : 'false') + '" title="' + (open ? 'Close tools' : 'Map tools') + '">' + (open ? '\u2715' : '\u2726') + '</button>';
  }
  function b(attrs, label, on, extra) { return '<button class="c2-btn ' + (on ? 'on' : '') + ' ' + (extra || '') + '" ' + attrs + '>' + label + '</button>'; }
  function flyHTML(enc, cols, rows) {
    var u = ui(), f = u.c2Fly, fogOn = !!(enc.fog && enc.fog.on), hasMap = typeof encHasMap === 'function' && encHasMap(enc);
    function panel(key, title, body) {
      return '<div class="c2-fly ' + (f === key ? 'open' : '') + '" data-c2-panel="' + key + '"' + (f === key ? '' : ' hidden') + '><div class="c2-fly-h"><b>' + title + '</b><button class="c2-x" data-c2-fly-close="1" aria-label="Close">\u2715</button></div>' + body + '</div>';
    }
    var colours = (typeof AOE_SPELL_COLORS !== 'undefined' ? AOE_SPELL_COLORS : []).map(function (sc) { return '<button class="aoe-color-chip ' + (u.dmAoeColor === sc.color ? 'sel' : '') + '" data-aoe-color="' + sc.color + '" title="' + sc.label + '" aria-label="AoE colour: ' + sc.label + '" aria-pressed="' + (u.dmAoeColor === sc.color ? 'true' : 'false') + '" style="background:' + sc.color + ';"></button>'; }).join('');
    var aoe = '<div class="c2-row">' + b('data-aoe-tool="circle"', '\u25CF Circle', u.dmAoeTool === 'circle') + b('data-aoe-tool="cone"', '\u25D7 Cone', u.dmAoeTool === 'cone') + b('data-aoe-tool="line"', '\u25AC Line', u.dmAoeTool === 'line') + b('data-aoe-tool="square"', '\u25A0 Square', u.dmAoeTool === 'square') + '</div>' +
      '<div class="c2-lbl">Colour</div><div class="c2-row c2-colours">' + colours + '<label class="aoe-color-custom" title="Any colour"><span class="rs-sr">Custom AoE colour</span><input type="color" aria-label="Custom AoE colour" data-aoe-color-custom="1" value="' + ((u.dmAoeColor && /^#/.test(u.dmAoeColor)) ? u.dmAoeColor : '#d4673a') + '" /></label></div>' +
      '<div class="c2-row">' + b('data-aoe-free="1" title="When on, cones & lines drop where you drag instead of from the active token"', (u.dmAoeFree ? '\u2611' : '\u2610') + ' Free-place', u.dmAoeFree) + ((enc.aoes && enc.aoes.length) ? b('data-aoe-clear="1"', 'Clear all (' + enc.aoes.length + ')') : '') + '</div>';
    if (MI()) aoe = '<div class="c2-lbl">Colour for new templates' + (u.miAoe && u.miAoe.sel ? ' and the selected one' : '') + '</div><div class="c2-row c2-colours">' + colours + '<label class="aoe-color-custom" title="Any colour"><span class="rs-sr">Custom AoE colour</span><input type="color" aria-label="Custom AoE colour" data-aoe-color-custom="1" value="' + ((u.dmAoeColor && /^#/.test(u.dmAoeColor)) ? u.dmAoeColor : '#d4673a') + '" /></label></div>' +
      ((enc.aoes && enc.aoes.length) ? '<div class="c2-row">' + b('data-aoe-clear="1"', 'Clear all templates (' + enc.aoes.length + ')') + '</div>' : '');
    var fog = '<div class="c2-row">' + b('data-fog-toggle="1"', fogOn ? '\u2611 Fog on' : '\u2610 Fog off', fogOn) + '</div>' +
      (fogOn ? '<div class="c2-row">' + b('data-fog-tool="reveal"', 'Reveal', u.dmFogTool === 'reveal') + b('data-fog-tool="hide"', 'Hide', u.dmFogTool === 'hide') + b('data-fog-cover="1"', 'Cover all') + b('data-fog-clear="1"', 'Reveal all') + '</div>' +
        '<div class="c2-lbl">Brush</div><div class="c2-row">' + b('data-fog-brush="0"', 'Fine', (u.dmFogBrush || 0) === 0) + b('data-fog-brush="1"', 'Med', u.dmFogBrush === 1) + b('data-fog-brush="2"', 'Wide', u.dmFogBrush === 2) + '</div>' : '<div class="c2-note">Fog hides the board on the projector until you reveal it.</div>');
    var grid = '<div class="c2-row">' + b('data-map-grid="-c"', '\u2212 col') + b('data-map-grid="+c"', '+ col') + b('data-map-grid="-r"', '\u2212 row') + b('data-map-grid="+r"', '+ row') + '<span class="c2-dim">' + cols + ' \u00d7 ' + rows + '</span></div>' +
      '<div class="c2-row">' + (hasMap ? b('id="dmMapGridToggle"', (enc.mapGridOverlay ? '\u2611' : '\u2610') + ' Grid lines', enc.mapGridOverlay) : '') + b('data-map-reset="1"', 'Reset positions') + '</div>';
    var map = '<div class="c2-row">' + b('id="dmMapAdd"', hasMap ? '\uD83D\uDDFA Replace map' : '\uD83D\uDDFA Add map') + b('id="dmMapLibrary"', '\uD83D\uDCDA Map library') + (hasMap ? b('id="dmMapRemove"', 'Remove map') : '') + '</div>' +
      '<input type="file" id="dmMapFile" accept="image/*,video/mp4,video/webm,video/ogg" style="display:none;" />';
    var view = '<div class="c2-row">' + b('data-map-zoom="out"', '\u2212 Zoom') + b('data-map-zoom="in"', '+ Zoom') + b('data-map-zoom="fit"', '\u2922 Fit board') + '<span class="c2-dim" id="dmMapZoomPct">100%</span></div>';
    return panel('aoe', 'Area templates', aoe) + panel('fog', 'Fog of war', fog) + panel('grid', 'Grid', grid) + panel('map', 'Map', map) + panel('view', 'View', view);
  }
  function modeChip() {
    var u = ui(), t = null;
    if (u.dmRulerTool) t = ['\uD83D\uDCCF Measuring \u2014 drag on the map', 'data-ruler-tool="1"'];
    else if (u.dmPointerMode) t = ['\uD83D\uDC46 Pointing on the projector \u2014 drag on the map', 'data-pointer-tool="1"'];
    else if (u.dmGroupMode) t = ['\uD83D\uDC65 Group move \u2014 lasso tokens, drag one to move them all', 'data-group-tool="1"'];
    else if (u.dmFogTool) t = [(u.dmFogTool === 'reveal' ? 'Revealing fog' : 'Hiding with fog') + ' \u2014 brush on the map', 'data-fog-tool="' + u.dmFogTool + '"'];
    if (!t) return '';
    return '<div class="c2-mode"><span>' + t[0] + '</span><button class="c2-btn c2-brass" ' + t[1] + '>\u2713 Done</button></div>';
  }
  function helpHTML() {
    return '<button class="c2-help ' + (ui().c2Help ? 'on' : '') + '" data-c2-help="1" aria-expanded="' + (ui().c2Help ? 'true' : 'false') + '" title="How the map works">?</button>' +
      (ui().c2Help ? '<div class="c2-helpbox" role="note"><b>Map tools</b>' + (MI() ? '<p>Tap \u2726 for templates, measuring, fog, grid, map and view. <b>AoE</b>: pick a shape, tap the map to place it, then drag \u2725 to move, \u27F3 to aim and \u25C6 to resize. The label shows how many creatures are inside; \uD83D\uDCCD Show players puts it on the projector. <b>Fog</b>: brush, drag a rectangle or tap a room to reveal; every change can be undone.</p><p>Tap a token or a portrait to open its card. Drag a token to move it: the path counts feet against its speed. Right-click or Esc cancels; Ctrl+Z undoes a move.</p>' : '<p>Tap \u2726 for templates, measuring, fog, grid, map and view. A template drops on the board: drag \u271B to move it, \u21BB to aim a cone or line, \uD83D\uDCCD shows it to players, \u2715 deletes it. Cones and lines start from the active token unless Free-place is on.</p><p>Tap a token or a portrait to open its card. Drag tokens to move them.</p>') + '<p><b>Projector:</b> open it, set your second screen to <em>Extend</em>, drag the window to the TV and press <em>Fullscreen</em>.</p></div>' : '');
  }

  // ---------- stat card ----------
  function areaOf(text) {
    var m = /(\d+)[- ](?:foot|feet|ft\.?)[- ]?(cone|line|cube|sphere|radius|cylinder|square|emanation)/i.exec(text || '');
    if (!m) return null;
    var k = m[2].toLowerCase(), kind = k === 'cone' ? 'cone' : k === 'line' ? 'line' : (k === 'cube' || k === 'square') ? 'square' : 'circle';
    return { ft: +m[1], kind: kind, word: k === 'radius' || k === 'sphere' || k === 'cylinder' || k === 'emanation' ? 'radius' : k };
  }
  function dcOf(text) {
    var m = /DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Str|Dex|Con|Int|Wis|Cha)\b/i.exec(text || '');
    return m ? { dc: +m[1], ab: m[2].charAt(0).toUpperCase() + m[2].slice(1, 3).toLowerCase() } : null;
  }
  function hl(text) {
    return E(text).replace(/\bDC (\d+)( (?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([A-Za-z ]+\))?(?: saving throw| check)?)?/g, '<span class="c2-dc">DC $1$2</span>');
  }
  function dmgBtns(c, label, damages, crit) {
    return damages.map(function (d) {
      var t = d.type ? ' ' + (DMG_SHORT[d.type] || d.type) : '';
      var f = (d.count) + 'd' + d.sides + (d.bonus ? sgn(d.bonus) : '');
      return '<button class="c2-roll ' + (d.type === 'fire' ? 'fire ' : '') + (crit ? 'crit' : '') + '" data-c2-roll="dmg" data-c2-id="' + E(c.id) + '" data-c2-n="' + d.count + '" data-c2-s="' + d.sides + '" data-c2-b="' + d.bonus + '" data-c2-t="' + E(d.type || '') + '" data-c2-l="' + E(label) + '" title="Roll ' + E(label) + ' damage' + (crit ? ' (critical: dice doubled)' : '') + '">\uD83C\uDFB2 ' + f + E(t) + (crit ? ' \u00d72' : '') + '</button>';
    }).join('');
  }
  function hitBtn(c, label, bonus) {
    return '<button class="c2-roll" data-c2-roll="d20" data-c2-id="' + E(c.id) + '" data-c2-b="' + bonus + '" data-c2-l="' + E(label + ' attack') + '" data-c2-k="' + E(label) + '" title="Roll to hit">\uD83C\uDFB2 ' + sgn(bonus) + ' hit</button>';
  }
  function pips(c, kind, key, total, used, title) {
    var h = '<span class="c2-pips" title="' + E(title) + '">';
    for (var i = 0; i < total; i++) h += '<button class="c2-pip ' + (i < used ? 'u' : '') + '" data-c2-pip="' + kind + '" data-c2-id="' + E(c.id) + '" data-c2-key="' + E(key) + '" data-c2-i="' + i + '" aria-label="' + E(title) + ' ' + (i + 1) + (i < used ? ' (used)' : '') + '"></button>';
    return h + '</span>';
  }
  function entryHTML(c, e, opts) {
    opts = opts || {};
    var s = c2s(c), name = String(e.name || ''), desc = String(e.desc || '');
    var rech = /\(Recharge (\d)(?:\s*[\u2013\u2014-]\s*(\d))?\)/i.exec(name), rest = /\(Recharge(?:s)? after a (Short or Long|Long) Rest\)/i.exec(name);
    var perDay = /\((\d)\/Day(?:[^)]*)\)/i.exec(name), cost = /\(Costs (\d) Actions\)/i.exec(name);
    var clean = name.replace(/\s*\((Recharge[^)]*|\d\/Day[^)]*|Costs \d Actions)\)/ig, '').trim();
    var key = (opts.sec || 'x') + ':' + clean;
    var atk = typeof parseAttack === 'function' ? parseAttack(desc) : null;
    var area = areaOf(desc), dc = dcOf(desc);
    var isAttack = atk && atk.toHit != null;
    var crit = ui().c2Crit && ui().c2Crit.id === c.id && ui().c2Crit.k === clean;
    var meta = [];
    var reach = /reach (\d+) ft/i.exec(desc), range = /range (\d+(?:\/\d+)?) ft/i.exec(desc);
    if (isAttack && reach) meta.push('reach ' + reach[1] + ' ft');
    if (isAttack && range) meta.push('range ' + range[1] + ' ft');
    if (area) meta.push(area.ft + ' ft ' + area.word);
    var nameHTML = '<b>' + E(clean) + '</b>' + (cost ? ' <span class="c2-cost">' + cost[1] + ' ACTIONS</span>' : '') + (perDay ? ' <span class="c2-tag">' + perDay[1] + '/day</span>' : '');
    var pipH = perDay ? pips(c, 'day', key, +perDay[1], s.used[key] || 0, clean + ' uses') : '';
    var laUse = opts.legendary ? '<button class="c2-roll c2-use" data-c2-la-use="' + E(c.id) + '" data-c2-cost="' + (cost ? cost[1] : 1) + '" title="Spend ' + (cost ? cost[1] : 1) + ' legendary action' + (cost && cost[1] > 1 ? 's' : '') + '">\u25C6 Use</button>' : '';
    // A legendary "makes a tail attack" borrows that action's rolls.
    var borrowed = '';
    if (opts.legendary && !atk) {
      var mm = /makes? (?:one |an? )?([a-z ]+?) attack/i.exec(desc);
      var src = mm && opts.actions ? opts.actions.find(function (a) { return String(a.name).toLowerCase().replace(/\s*\(.*\)/, '') === mm[1].toLowerCase(); }) : null;
      var pa = src && parseAttack(src.desc);
      if (pa && pa.toHit != null) borrowed = hitBtn(c, src.name.replace(/\s*\(.*\)/, ''), pa.toHit) + dmgBtns(c, src.name.replace(/\s*\(.*\)/, ''), pa.damages, false);
      var ck = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \(([A-Za-z ]+)\) check/i.exec(desc);
      if (ck && opts.block) {
        var sk = (opts.block.skills || {})[ck[2].toLowerCase()];
        var bonus = sk != null ? +sk : mod((opts.abilities || {})[ABIL_FULL[ck[1].toLowerCase()]]);
        borrowed += '<button class="c2-roll" data-c2-roll="d20" data-c2-id="' + E(c.id) + '" data-c2-b="' + bonus + '" data-c2-l="' + E(ck[2] + ' check') + '">\uD83C\uDFB2 ' + sgn(bonus) + '</button>';
      }
    }
    if (isAttack || area || rech || rest || cost || opts.legendary) {
      var spent = !!s.spent[key];
      var cls = 'c2-atk' + (rech || rest ? ' rech' + (spent ? ' spent' : '') : '');
      var rider = '';
      if (isAttack) {
        var hitAt = desc.search(/\bHit:/i), after = hitAt >= 0 ? desc.slice(hitAt + 4) : '';
        var dot = after.search(/\.(\s|$)/); rider = dot >= 0 ? after.slice(dot + 1).trim() : '';
      }
      var text = isAttack ? rider : (area || opts.legendary ? desc : '');
      var buttons = (isAttack ? hitBtn(c, clean, atk.toHit) : '') + (atk && atk.damages.length ? dmgBtns(c, clean, atk.damages, crit) : '') + borrowed;
      var rc = '';
      if (rech || rest) {
        var lbl = rech ? 'Recharge ' + rech[1] + (rech[2] ? '\u2013' + rech[2] : '') : 'Recharges after a ' + rest[1].toLowerCase() + ' rest';
        rc = '<span class="c2-rc">' + lbl + ' \u00b7 <b>' + (spent ? 'SPENT' : 'READY') + '</b></span>';
        buttons += rech ? '<button class="c2-roll" data-c2-recharge="' + E(c.id) + '" data-c2-key="' + E(key) + '" data-c2-min="' + rech[1] + '" title="Roll a d6 to recharge">\uD83C\uDFB2 Recharge</button>' : '';
        buttons += '<button class="c2-roll c2-sm" data-c2-spend="' + E(c.id) + '" data-c2-key="' + E(key) + '">' + (spent ? '\u21BA Ready' : '\u2713 Used') + '</button>';
      }
      if (area) {
        var noun = area.kind === 'circle' ? 'circle' : area.kind === 'square' ? 'cube' : area.kind, placingNow = MI() && MI().placing(c.id, key);
        buttons += '<button class="c2-roll c2-place' + (placingNow ? ' placing' : '') + '" data-c2-place="' + E(c.id) + '" data-c2-kind="' + area.kind + '" data-c2-ft="' + area.ft + '" data-c2-t="' + E((atk && atk.damages[0] && atk.damages[0].type) || '') + '" data-c2-l="' + E(clean) + '" data-c2-dc="' + (dc ? E('DC ' + dc.dc + ' ' + dc.ab) : '') + '" data-c2-key="' + E(key) + '" title="Place the template on the map"' + (placingNow ? ' aria-pressed="true"' : '') + '>' + (placingNow ? '\u25FA Placing ' + noun + '\u2026' : '\u25F8 Place ' + noun) + '</button>';
      }
      return '<div class="' + cls + '">' + nameHTML + (meta.length ? ' <small>' + E(meta.join(' \u00b7 ')) + '</small>' : '') + (dc && !isAttack ? ' <span class="c2-dc">DC ' + dc.dc + ' ' + E(dc.ab) + '</span>' : '') + pipH + rc +
        (text && !(area && !opts.legendary && text.length > 220) ? '<p>' + hl(text) + '</p>' : (text ? '<p>' + hl(text) + '</p>' : '')) +
        (buttons ? '<span class="c2-rolls">' + buttons + laUse + '</span>' : (laUse ? '<span class="c2-rolls">' + laUse + '</span>' : '')) + '</div>';
    }
    return '<p class="c2-entry">' + nameHTML + (pipH ? ' ' + pipH : '') + '. ' + hl(desc) + '</p>';
  }
  function section(c, key, title, body, opts) {
    opts = opts || {};
    var openMap = ui().c2Sec || {}, open = openMap[key] != null ? openMap[key] : (opts.open !== false);
    var empty = opts.empty;
    return '<div class="c2-sec ' + (open && !empty ? '' : 'shut') + '"><button class="c2-sech" data-c2-sec="' + key + '" aria-expanded="' + (open && !empty ? 'true' : 'false') + '"' + (empty ? ' disabled' : '') + '><span class="c2-car">' + (empty ? '' : (open ? '\u25BE' : '\u25B8')) + '</span>' + title +
      (opts.right ? '<span class="c2-sech-r">' + opts.right + '</span>' : '') + (empty ? '<em>none</em>' : (!open && opts.summary ? '<em>' + opts.summary + '</em>' : '')) + '</button>' +
      (open && !empty ? '<div class="c2-secb">' + body + '</div>' : '') + '</div>';
  }
  function cardBody(c) {
    var bl = blockFor(c);
    if (!bl) {
      if (c.kind === 'player') return '<div class="c2-psum">' + (c.fromCharId ? '<p>Linked to a character sheet. HP, AC and initiative bonus sync with <b>\u21BB Sync</b>.</p>' : '<p>Player tile. Set HP with the stepper; rolls happen on the player\u2019s own sheet.</p>') + '</div>';
      return '<div class="c2-psum"><p>Custom monster' + (c.notes ? ': ' + E(c.notes) : '.') + '</p></div>';
    }
    var m = bl.app, srd = bl.srd, ab = m.abilities || {};
    var abil = '<div class="c2-abil">' + ABIL.map(function (k) { var md = mod(ab[k]); return '<div><small>' + k.toUpperCase() + '</small><b>' + (ab[k] != null ? E(ab[k]) : '\u2013') + '</b><button class="c2-roll c2-mini" data-c2-roll="d20" data-c2-id="' + E(c.id) + '" data-c2-b="' + md + '" data-c2-l="' + k.toUpperCase() + ' check" title="Roll a ' + k.toUpperCase() + ' check">' + sgn(md) + '</button></div>'; }).join('') + '</div>';
    // saves, skills & senses
    var saves = srd ? srd.saves || {} : {}, skills = srd ? srd.skills || {} : (m.skills || {});
    var saveList = Object.keys(saves).map(function (k) { return '<button class="c2-roll c2-sm" data-c2-roll="d20" data-c2-id="' + E(c.id) + '" data-c2-b="' + saves[k] + '" data-c2-l="' + k.toUpperCase() + ' save">' + k.charAt(0).toUpperCase() + k.slice(1) + ' ' + sgn(+saves[k]) + '</button>'; }).join('');
    var skillList = Object.keys(skills).map(function (k) { var v = +String(skills[k]).replace('+', ''); return '<button class="c2-roll c2-sm" data-c2-roll="d20" data-c2-id="' + E(c.id) + '" data-c2-b="' + v + '" data-c2-l="' + E(k.charAt(0).toUpperCase() + k.slice(1)) + ' check">' + E(k.charAt(0).toUpperCase() + k.slice(1)) + ' ' + sgn(v) + '</button>'; }).join('');
    var kv = function (k, v) { return v ? '<div class="c2-kv"><b>' + k + '</b> ' + E(v) + '</div>' : ''; };
    var imm = srd ? srd.imm : m.damageImmunities, res = srd ? srd.res : m.damageResistances, vul = srd ? srd.vuln : m.damageVulnerabilities, cim = srd ? srd.condImm : m.conditionImmunities;
    var summary = [].concat(Object.keys(saves).slice(0, 2).map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1) + ' ' + sgn(+saves[k]); }), Object.keys(skills).slice(0, 1).map(function (k) { return k.slice(0, 4).replace(/^./, function (x) { return x.toUpperCase(); }) + ' ' + sgn(+String(skills[k]).replace('+', '')); }), imm ? [String(imm).split(/[;,]/)[0] + ' immune'] : []).join(' \u00b7 ');
    var ssBody = (saveList ? '<div class="c2-kv"><b>Saving throws</b> <span class="c2-rolls">' + saveList + '</span></div>' : '') + (skillList ? '<div class="c2-kv"><b>Skills</b> <span class="c2-rolls">' + skillList + '</span></div>' : '') +
      kv('Damage vulnerabilities', vul) + kv('Damage resistances', res) + kv('Damage immunities', imm) + kv('Condition immunities', cim) + kv('Senses', srd ? srd.senses : m.senses) + kv('Languages', srd ? srd.languages : m.languages);
    var traits = (srd ? srd.traits : m.traits) || [], actions = (srd ? srd.actions : m.actions) || [], bonus = (srd ? srd.bonus : m.bonusActions) || [], reacts = (srd ? srd.reactions : m.reactions) || [], leg = (srd ? srd.legendary : m.legendaryActions) || [];
    var s = c2s(c);
    var legN = 3; var lm = srd && /can take (\d+) legendary actions/i.exec(srd.legDesc || ''); if (lm) legN = +lm[1];
    var ctx = { actions: actions, block: srd || m, abilities: ab };
    var html = abil +
      section(c, 'ss', 'Saves, skills &amp; senses', ssBody, { open: false, summary: E(summary) }) +
      section(c, 'traits', 'Traits', traits.map(function (e) { return entryHTML(c, e, { sec: 't' }); }).join(''), { empty: !traits.length }) +
      section(c, 'actions', 'Actions', actions.map(function (e) { return entryHTML(c, e, { sec: 'a' }); }).join(''), { empty: !actions.length }) +
      section(c, 'bonus', 'Bonus actions', bonus.map(function (e) { return entryHTML(c, e, { sec: 'b' }); }).join(''), { empty: !bonus.length }) +
      section(c, 'reactions', 'Reactions', reacts.map(function (e) { return entryHTML(c, e, { sec: 'r' }); }).join(''), { empty: !reacts.length });
    if (leg.length) {
      html += section(c, 'legendary', 'Legendary actions',
        '<div class="c2-lg"><span>Takes ' + legN + ' per round, at the end of another creature\u2019s turn.</span>' + pips(c, 'la', 'la', legN, Math.min(legN, s.la), 'Legendary actions') + '<button class="c2-roll c2-sm" data-c2-la-reset="' + E(c.id) + '">\u21BA Reset</button></div>' +
        leg.map(function (e) { return entryHTML(c, e, Object.assign({ sec: 'l', legendary: true }, ctx)); }).join(''),
        { right: pips(c, 'la', 'la', legN, Math.min(legN, s.la), 'Legendary actions') });
    }
    html += srd ? '<div class="c2-srd" title="Stat block text from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC-BY-4.0">SRD 5.1 \u00b7 CC-BY-4.0 \u00b7 <button class="c2-link" data-c2-legal="1">credits</button></div>'
      : '<div class="c2-srd">Hearth monster catalogue \u00b7 includes SRD material (CC-BY-4.0) \u00b7 <button class="c2-link" data-c2-legal="1">credits</button></div>';
    return html;
  }
  function cardHTML(ctx, c) {
    var u = ui(), card = u.c2Card, isTurn = c.id === ctx.turnId, bl = blockFor(c), m = bl && bl.app, srd = bl && bl.srd;
    var hp = hpOf(c), max = c.maxHp, low = max > 0 && hp != null && hp <= max / 2;
    var sub = c.kind === 'player' ? 'Player character' : m ? E(m.size) + ' ' + E(m.type) + (srd && srd.alignment ? ', ' + E(srd.alignment) : '') + ' \u00b7 CR ' + (typeof crLabel === 'function' ? crLabel(m.cr) : E(m.cr)) : (c.isBoss ? 'Boss' : 'Custom monster');
    var sp = m && m.speed ? m.speed : null;
    var speedMain = sp ? (sp.walk != null ? sp.walk : Object.values(sp)[0]) + ' ft' : (c.speed ? E(c.speed) : '\u2013');
    var speedSub = sp ? Object.keys(sp).filter(function (k) { return k !== 'walk'; }).map(function (k) { return k.toUpperCase() + ' ' + sp[k]; }).join(' \u00b7 ') : '';
    var acSub = srd && srd.acDesc ? srd.acDesc.replace(/ armor$/i, '').toUpperCase() : 'ARMOUR CLASS';
    var hpCell = u.dmHpSetFor === c.id ? '<input id="dmHpSetInput" class="c2-hpset" type="text" inputmode="numeric" value="' + (max != null ? (hp != null ? hp : max) + '/' + max : '') + '" placeholder="cur/max" />'
      : '<button class="c2-hpval" data-dm-hp-set="' + E(c.id) + '" title="Set HP">' + (hp != null ? E(hp) : 'set') + '</button>';
    var hasStep = c.kind === 'monster' || c.kind === 'player';
    var atZero = c.kind === 'monster' && max != null && hp != null && hp <= 0;
    var nameRow = u.dmRenameFor === c.id ? '<input id="dmRenameInput" class="c2-rename" type="text" value="' + E(c.name) + '" maxlength="40" />' : '<b class="c2-cname">' + E(c.name) + '</b>';
    var proj = projOn();
    var head = '<div class="c2-sbhead">' +
      '<div class="c2-chead"><span class="c2-cface">' + face(c, 44) + '</span><span class="c2-ctitle">' + nameRow + '<small>' + sub + '</small></span>' +
      (isTurn ? '<span class="c2-turn">Its turn</span>' : '') +
      '<button class="c2-pin ' + (card.pinned ? 'on' : '') + '" data-c2-pin="1" aria-pressed="' + (card.pinned ? 'true' : 'false') + '" title="' + (card.pinned ? 'Pinned: stays open when the turn moves on' : 'Pin: keep this card open when the turn moves on') + '"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M10.5 1.5l4 4-2 1-2.5 2.5.5 3-1.5 1.5-2.6-2.6L3 14.3 1.7 13l3.4-3.4L2.5 7 4 5.5l3 .5L9.5 3.5z" fill="currentColor"/></svg></button>' +
      '<button class="c2-x" data-c2-close="1" aria-label="Close card">\u2715</button></div>' +
      '<div class="c2-stats"><div class="c2-stat">' + svgShield('c2-ac-big', c.ac) + '<small>AC \u00b7 ' + E(acSub) + '</small></div>' +
      '<div class="c2-stat"><b class="' + (low ? 'low' : '') + '">' + (hp != null ? E(hp) : '\u2013') + (max != null ? '<small>/' + E(max) + '</small>' : '') + '</b><small>HP' + (m && m.hpFormula ? ' \u00b7 ' + E(String(m.hpFormula).toUpperCase().replace(/\s/g, '')) : '') + '</small></div>' +
      '<div class="c2-stat"><b>' + speedMain + '</b><small>' + (speedSub || 'SPEED') + '</small></div></div>' +
      (hasStep ? '<div class="c2-hpstep"><button class="dmg" data-dm-hp="dmg|' + E(c.id) + '|10">\u221210</button><button class="dmg" data-dm-hp="dmg|' + E(c.id) + '|1">\u22121</button>' + hpCell + '<button class="heal" data-dm-hp="heal|' + E(c.id) + '|1">+1</button><button class="heal" data-dm-hp="heal|' + E(c.id) + '|10">+10</button></div>' : '') +
      '<div class="c2-cbtns"><button class="c2-btn c2-sm" data-dm-status-open="' + E(c.id) + '">+ Condition</button>' +
      '<button class="c2-btn c2-sm ' + (c.concentrating ? 'on' : '') + '" data-dm-conc-toggle="' + E(c.id) + '" title="' + (c.concentrating ? 'Concentrating \u2014 tap to end' : 'Mark as concentrating') + '">\u25C8 Conc' + (c.concentrating ? ' \u2713' : '') + '</button>' +
      '<button class="c2-btn c2-sm" data-dm-save-open="' + E(c.id) + '" title="Roll a saving throw (aura bonuses added automatically)">\uD83C\uDFB2 Save</button>' +
      ((c.kind === 'monster' && !c.monsterId && !c.isBoss) ? '<button class="c2-btn c2-sm" data-dm-custom-edit="' + E(c.id) + '">\u270E Edit</button>' : '<button class="c2-btn c2-sm" data-dm-rename="' + E(c.id) + '">\u270E Rename</button>') +
      (u.dmInitFor === c.id ? '<input id="dmInitInput" class="c2-initset" type="number" inputmode="numeric" value="' + (c.init != null ? E(c.init) : '') + '" />' : '<button class="c2-btn c2-sm" data-dm-init="' + E(c.id) + '" title="Set initiative">Init ' + (c.init != null ? E(c.init) : '+') + '</button>') +
      ((c.kind === 'player' && c.link) ? '<button class="c2-btn c2-sm" data-dm-link-dmg="' + E(c.id) + '">\u2694 Hit</button>' : '') +
      ((c.kind === 'player' && c.fromCharId) ? '<button class="c2-btn c2-sm" data-dm-char-resync="' + E(c.id) + '">\u21BB Sync</button>' : '') +
      '<span class="c2-dicenote">\uD83C\uDFB2 Rolls stay on DM screen \u00b7 projector ' + (proj ? 'on request' : 'off') + '</span></div>' +
      ((c.statuses && c.statuses.length) ? '<div class="c2-conds">' + c.statuses.map(function (s) { return '<button class="c2-cond" data-dm-status-remove="' + E(c.id) + '|' + E(s) + '" title="Remove ' + E(s) + '">' + (typeof hearthCondBadgeHTML === 'function' ? hearthCondBadgeHTML(s, 16) : '') + E(s) + ' \u2715</button>'; }).join('') + '</div>' : '') +
      '</div>';
    var tokenRow = '<div class="c2-tokrow"><span class="c2-lbl">Token</span>' +
      (c.kind !== 'player' ? '<button class="c2-btn c2-ico ' + (c.hiddenFromPlayers ? 'on' : '') + '" data-dm-hide-enemy="' + E(c.id) + '" title="' + (c.hiddenFromPlayers ? 'Hidden from players \u2014 tap to reveal' : 'Hide from players') + '">' + (c.hiddenFromPlayers ? '\uD83D\uDE48 Hidden' : '\uD83D\uDC41 Shown') + '</button>' : '') +
      (c.kind !== 'player' ? '<button class="c2-btn c2-ico ' + (c.hideName ? 'on' : '') + '" data-dm-hide-name="' + E(c.id) + '" title="' + (c.hideName ? 'Name hidden on map \u2014 tap to show' : 'Hide name on map') + '">\uD83C\uDFF7 ' + (c.hideName ? 'No name' : 'Name') + '</button>' : '') +
      (c.kind === 'player' ? '<button class="c2-btn c2-ico ' + (c.vision ? 'on' : '') + '" data-dm-vision="' + E(c.id) + '" title="Darkvision radius (auto-reveals fog) \u2014 tap to change">\uD83D\uDC41 ' + (c.vision ? c.vision + ' ft' : 'Vision') + '</button>' : '') +
      (c.kind !== 'player' ? '<button class="c2-btn c2-ico" data-dm-disposition="' + E(c.id) + '" title="Team: ' + E(c.disposition || 'enemy') + ' \u2014 tap to change">' + (c.disposition === 'ally' ? '\uD83D\uDFE2 Ally' : (c.disposition === 'neutral' ? '\u26AA Neutral' : '\uD83D\uDD34 Enemy')) + '</button>' : '') +
      (c.kind === 'monster' ? '<button class="c2-btn c2-ico" data-dm-duplicate="' + E(c.id) + '" title="Duplicate this monster"><svg class="hi-ico" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 3.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg> Copy</button>' : '') +
      '<button class="c2-btn c2-ico" data-token-img-open="' + E(c.id) + '" title="Token image">\uD83D\uDDBC Image</button>' +
      (c.dead ? '<button class="c2-btn c2-ico" data-dm-revive="' + E(c.id) + '">Revive</button>' : (atZero ? '<button class="c2-btn c2-ico c2-danger" data-dm-kill="' + E(c.id) + '">Kill</button>' : '')) +
      '<button class="c2-btn c2-ico c2-danger" data-dm-remove-ask="' + E(c.id) + '" title="Remove from encounter">\u2715 Remove</button></div>';
    var phone = !wide();
    if (phone && MI() && MI().aoeOpen()) return peekHTML(c, hp, max, low);
    return '<aside class="c2-card ' + (phone ? 'sheet' : 'side') + (isTurn ? ' turn' : '') + '" data-c2-card="' + E(c.id) + '" aria-label="' + E(c.name) + ' card">' + (phone ? '<span class="c2-grab" aria-hidden="true"></span>' : '') +
      head + '<div class="c2-sbbody">' + cardBody(c) + tokenRow + '</div></aside>';
  }

  // Phone: while the template fan is open the sheet folds to a 99 px peek bar so the map stays visible.
  function peekHTML(c, hp, max, low) {
    var a = ui().miAoe, from = a && a.from && a.from.id === c.id ? a.from : null, s = c2s(c);
    var t = from ? (loadEncounter().aoes || []).find(function (q) { return q.id === from.aoe; }) : null;
    var act = from ? String(from.key || '').replace(/^.:/, '') : '';
    var noun = t ? (t.kind === 'circle' ? 'circle' : t.kind === 'square' ? 'cube' : t.kind) : '';
    var rech = from ? (s.spent[from.key] ? '<span class="mi-pkrc spent">SPENT</span>' : '<span class="mi-pkrc">READY</span>') : '';
    return '<aside class="c2-card mi-peek" data-c2-card="' + E(c.id) + '" aria-label="' + E(c.name) + ' card (folded)">' +
      '<div class="mi-pk1"><span class="c2-cface">' + face(c, 38) + '</span><span class="mi-pkn"><b>' + E(c.name) + '</b><small>' + (from ? E(act) + (t && t.dc ? ' \u00b7 ' + E(t.dc) : '') : 'Placing a template') + '</small></span>' +
      '<span class="mi-pkhp"><b class="' + (low ? 'low' : '') + '">' + (hp != null ? E(hp) : '\u2013') + (max != null ? '<small>/' + E(max) + '</small>' : '') + '</b>' + hpBar(c) + '</span>' +
      '<button class="mi-pkx" data-mi-done="1" aria-label="Done placing, open the card">\u2303</button></div>' +
      (from ? '<div class="mi-pk2"><button class="mi-pkact" data-mi-done="1">\u25FA Placing ' + noun + ' <small>' + E(act) + '</small></button>' + rech + '</div>' : '') + '</aside>';
  }

  // ---------- render ----------
  function html(ctx) {
    var u = ui(), enc = ctx.enc;
    // Whose turn changed? A monster's card opens by itself; a player's turn closes an unpinned card.
    var turnKey = enc.started && ctx.turnId ? enc.id + '|' + (enc.round || 1) + '|' + ctx.turnId : null;
    if (turnKey && turnKey !== u.c2LastTurn) {
      u.c2LastTurn = turnKey;
      var tc = (enc.combatants || []).find(function (c) { return c.id === ctx.turnId; });
      var pinned = u.c2Card && u.c2Card.pinned;
      if (tc && tc.kind === 'monster' && !tc.dead) {
        var s = c2s(tc);
        if (s.laTurn !== turnKey) { s.la = 0; s.laTurn = turnKey; saveEncounter(enc); } // legendary actions come back at the start of its turn
        if (!pinned) u.c2Card = { id: tc.id, pinned: false, auto: true };
      } else if (u.c2Card && !pinned) u.c2Card = null;
    }
    var card = u.c2Card ? (enc.combatants || []).find(function (c) { return c.id === u.c2Card.id; }) : null;
    if (u.c2Card && !card) u.c2Card = null;
    var phone = !wide();
    var tools = !!(MI() && (MI().aoeOpen() || MI().fogOpen()));
    var mini = phone && (!!card || tools); // phone: the one-row portrait strip whenever a card or a map tool needs the room (map-interactions renders)
    var lk = (phone ? 'p' : 'd') + (card ? 1 : 0) + (phone && card && MI() && MI().aoeOpen() ? 'k' : '') + (mini ? 'm' : ''); // the peek bar gives the map more height: refit
    if (u.c2LayoutKey !== lk) { if (u.c2LayoutKey != null && !u.c2ManualZoom) u.dmMapZoomInit = false; u.c2LayoutKey = lk; }
    var mi = MI(), miCls = mi ? (mi.aoeOpen() ? ' mi-aoe-on' : '') + (mi.fogOpen() ? ' mi-fog-on' : '') : '';
    return '<section class="dm-battle c2' + (card ? ' c2-open' : '') + (phone ? ' c2-phone' : ' c2-desk') + miCls + '">' + headHTML(ctx) + moreHTML(ctx) +
      stripHTML(ctx, mini) +
      '<div class="c2-body">' + (card ? cardHTML(ctx, card) : '') +
      '<div class="c2-stage dm-battle-map">' + dmMapBoardHTML(enc, ctx.cell, ctx.cols, ctx.rows, ctx.tokens, ctx.turnId) +
      '<div class="c2-bars">' + modeChip() + '</div>' + helpHTML() + flyHTML(enc, ctx.cols, ctx.rows) + fanHTML(enc) + (mi ? mi.stageHTML() : '<div class="c2-miwait" role="status">Loading map tools\u2026</div>') + '</div></div>' +
      dmMapDialogsHTML(enc) + '</section>';
  }

  // ---------- behaviour ----------
  function find(enc, id) { return (enc.combatants || []).find(function (c) { return c.id === id; }); }
  function mutate(id, fn) { var enc = loadEncounter(), c = find(enc, id); if (!c) return; fn(c, c2s(c), enc); saveEncounter(enc); render(); }
  function roll(c, label, groups, bonus, isD20) {
    var vals = groups.map(function (g) { return { sides: g.sides, values: typeof rollDice === 'function' ? rollDice(g.n, g.sides) : Array.from({ length: g.n }, function () { return 1 + Math.floor(Math.random() * g.sides); }) }; });
    var sum = vals.reduce(function (a, g) { return a + g.values.reduce(function (x, y) { return x + y; }, 0); }, 0) + (bonus || 0);
    var nat = isD20 ? vals[0].values[0] : null;
    var bd = vals.map(function (g) { return g.values.length + 'd' + g.sides + ' [' + g.values.join(', ') + ']'; }).join(' + ') + (bonus ? ' ' + (bonus > 0 ? '+ ' : '\u2212 ') + Math.abs(bonus) : '');
    var total = isD20 ? sum + ' to hit' : sum;
    if (isD20 && !/attack$/.test(label)) total = sum;
    hearthDiceRoll({ who: c.name || 'DM', label: label, groups: vals, total: total, crit: nat === 20 ? 'nat20' : nat === 1 ? 'nat1' : null, breakdown: bd, noAutoProject: true });
    if (typeof hearthDicePrefs === 'function' && hearthDicePrefs().anim === 'off' && typeof showToast === 'function') showToast(c.name + ' \u00b7 ' + label + ': ' + total + (nat === 20 ? ' (nat 20!)' : nat === 1 ? ' (nat 1)' : ''));
    return { sum: sum, nat: nat };
  }
  function openCard(id, fromTap) {
    var u = ui();
    if (u.c2Card && u.c2Card.id === id && fromTap === 'toggle') u.c2Card = null;
    else u.c2Card = { id: id, pinned: !!(u.c2Card && u.c2Card.pinned) };
    u.dmHighlightMon = id;
    render();
  }

  function onClick(ev) {
    var t = ev.target && ev.target.closest ? ev.target : null;
    if (!t) return;
    var u = ui();
    var lay = t.closest('[data-c2-layout]');
    if (lay) { ev.preventDefault(); u.c2More = false; dmSetLayout(lay.getAttribute('data-c2-layout')); render(); return; }
    if (!t.closest('.c2')) return;
    var el;
    if ((el = t.closest('[data-c2-fab]'))) { u.c2Fan = !u.c2Fan; if (u.c2Fan) { u.c2Fly = null; u.c2More = false; } render(); return; }
    if ((el = t.closest('[data-c2-fly]'))) { u.c2Fly = el.getAttribute('data-c2-fly'); u.c2Fan = false; render(); return; }
    if (t.closest('[data-c2-fly-close]')) { u.c2Fly = null; render(); return; }
    if (t.closest('[data-c2-size-close]')) { u.dmAoeLastDropped = null; render(); return; }
    if (t.closest('[data-c2-more]')) { u.c2More = !u.c2More; u.c2Fan = false; render(); return; }
    if (t.closest('[data-c2-help]')) { u.c2Help = !u.c2Help; render(); return; }
    if (t.closest('[data-c2-proj-dice]')) { hearthDiceSetPref('diceProjector', projOn() ? 'off' : 'ask'); render(); return; }
    if (t.closest('[data-c2-legal]')) { if (typeof hearthOpenLegal === 'function') hearthOpenLegal(); return; }
    if ((el = t.closest('[data-c2-pc]'))) { openCard(el.getAttribute('data-c2-pc'), 'toggle'); return; }
    if (t.closest('[data-c2-close]')) { u.c2Card = null; render(); return; }
    if (t.closest('[data-c2-pin]')) { if (u.c2Card) u.c2Card.pinned = !u.c2Card.pinned; render(); return; }
    if ((el = t.closest('[data-c2-sec]'))) { var k = el.getAttribute('data-c2-sec'); u.c2Sec = u.c2Sec || {}; var openNow = !el.closest('.c2-sec').classList.contains('shut'); u.c2Sec[k] = !openNow; render(); return; }
    if ((el = t.closest('[data-c2-roll]'))) {
      var enc = loadEncounter(), c = find(enc, el.getAttribute('data-c2-id')); if (!c) return;
      var label = el.getAttribute('data-c2-l') || 'Roll', bonus = +el.getAttribute('data-c2-b') || 0;
      if (el.getAttribute('data-c2-roll') === 'd20') {
        var r = roll(c, label, [{ n: 1, sides: 20 }], bonus, true);
        var key = el.getAttribute('data-c2-k');
        if (key) { var was = !!u.c2Crit; u.c2Crit = r.nat === 20 ? { id: c.id, k: key } : null; if (was || u.c2Crit) render(); }
      } else {
        var n = +el.getAttribute('data-c2-n'), sides = +el.getAttribute('data-c2-s'), ty = el.getAttribute('data-c2-t');
        var crit = el.classList.contains('crit');
        roll(c, label + (ty ? ' ' + ty : '') + ' damage' + (crit ? ' (crit)' : ''), [{ n: crit ? n * 2 : n, sides: sides }], bonus, false);
      }
      return;
    }
    if ((el = t.closest('[data-c2-recharge]'))) {
      var id = el.getAttribute('data-c2-recharge'), rk = el.getAttribute('data-c2-key'), min = +el.getAttribute('data-c2-min') || 6;
      var enc2 = loadEncounter(), c2 = find(enc2, id); if (!c2) return;
      var rr = roll(c2, rk.replace(/^.:/, '') + ' recharge', [{ n: 1, sides: 6 }], 0, false);
      c2s(c2).spent[rk] = rr.sum < min; saveEncounter(enc2); render();
      if (typeof showToast === 'function') showToast(rk.replace(/^.:/, '') + (rr.sum >= min ? ' recharged (' + rr.sum + ')' : ' not yet (' + rr.sum + ')'));
      return;
    }
    if ((el = t.closest('[data-c2-spend]'))) { var sk2 = el.getAttribute('data-c2-key'); mutate(el.getAttribute('data-c2-spend'), function (c, s) { s.spent[sk2] = !s.spent[sk2]; }); return; }
    if ((el = t.closest('[data-c2-pip]'))) {
      var kind = el.getAttribute('data-c2-pip'), pk = el.getAttribute('data-c2-key'), i = +el.getAttribute('data-c2-i');
      mutate(el.getAttribute('data-c2-id'), function (c, s) {
        var used = kind === 'la' ? s.la : (s.used[pk] || 0), nv = i < used ? i : i + 1; // tap a lit pip to spend up to it, a spent one to restore
        if (kind === 'la') s.la = nv; else s.used[pk] = nv;
      });
      return;
    }
    if ((el = t.closest('[data-c2-la-use]'))) { var cost = +el.getAttribute('data-c2-cost') || 1; mutate(el.getAttribute('data-c2-la-use'), function (c, s, e) { var max = 3; var bl = blockFor(c); var lm = bl && bl.srd && /can take (\d+)/i.exec(bl.srd.legDesc || ''); if (lm) max = +lm[1]; if (s.la + cost > max) { showToast('Not enough legendary actions left this round.'); return; } s.la += cost; }); return; }
    if ((el = t.closest('[data-c2-la-reset]'))) { mutate(el.getAttribute('data-c2-la-reset'), function (c, s) { s.la = 0; }); return; }
    if ((el = t.closest('[data-c2-place]')) && MI()) { if (el.classList.contains('placing')) { MI().closeAoe(false); return; } MI().placeFromCard(el.getAttribute('data-c2-place'), el.getAttribute('data-c2-kind'), +el.getAttribute('data-c2-ft'), el.getAttribute('data-c2-t'), el.getAttribute('data-c2-l'), el.getAttribute('data-c2-dc'), el.getAttribute('data-c2-key')); return; }
    if (t.closest('[data-c2-miwait]') || t.closest('[data-c2-place]')) { if (typeof W.dmMiEnsure === 'function') W.dmMiEnsure(); if (typeof showToast === 'function') showToast('Map tools are still loading\u2026', 2400); return; } // never the v1.6 templates on C2
    if (t.closest('[data-map-zoom="in"],[data-map-zoom="out"]')) u.c2ManualZoom = true;
    if (t.closest('[data-map-zoom="fit"]')) u.c2ManualZoom = false;
  }
  // Capture phase, before the tool's own handler re-renders: a choice in the fan
  // closes the fan, a choice in the More menu closes the menu, and picking a shape
  // or a fog brush closes its flyout so the map is clear to work on.
  function onPick(ev) {
    var t = ev.target; if (!t || !t.closest || !t.closest('.c2')) return;
    var u = ui();
    if (t.closest('.c2-fan [data-c2-fan-i]')) u.c2Fan = false;
    if (t.closest('.c2-more button:not([data-c2-proj-dice])') || t.closest('.c2-more select')) { if (!t.closest('select')) u.c2More = false; }
    if (t.closest('.c2-fly [data-aoe-tool], .c2-fly [data-fog-tool]')) u.c2Fly = null;
  }
  function onOutside(ev) {
    var u = ui(); if (!u || !document.querySelector('.c2')) return;
    var t = ev.target;
    if (u.c2Fan && !(t.closest && t.closest('.c2-fan, [data-c2-fab]'))) { u.c2Fan = false; ev.stopPropagation(); ev.preventDefault(); render(); return; }
    if (u.c2More && !(t.closest && t.closest('.c2-more, [data-c2-more]'))) { u.c2More = false; render(); }
  }
  var installed = false;
  function install() {
    if (installed) return; installed = true;
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', function (ev) { if (ui() && ui().c2Fan && document.querySelector('.c2')) { var t = ev.target; if (!(t.closest && t.closest('.c2-fan, [data-c2-fab]'))) { ui().c2Fan = false; var f = document.querySelector('.c2-fan'), fb = document.querySelector('.c2-fab'); if (f) f.classList.remove('open'); if (fb) { fb.classList.remove('open'); fb.textContent = '\u2726'; } } } }, true);
    document.addEventListener('click', onPick, true);
    document.addEventListener('click', onOutside, true);
    document.addEventListener('keydown', function (ev) { if (ev.key !== 'Escape' || !document.querySelector('.c2')) return; var u = ui(); if (u.c2Fan || u.c2More || u.c2Fly || u.c2Help) { u.c2Fan = u.c2More = u.c2Help = false; u.c2Fly = null; render(); } });
    var rt = 0;
    W.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () {
        if (!document.querySelector('.c2')) return;
        var u = ui(), lk = (wide() ? 'd' : 'p') + (u.c2Card ? 1 : 0) + (!wide() && u.c2Card && MI() && MI().aoeOpen() ? 'k' : '');
        if (lk !== u.c2LayoutKey) { render(); return; }
        if (!u.c2ManualZoom) { var f = document.querySelector('[data-map-zoom="fit"]'); if (f) f.click(); }
      }, 150);
    });
  }
  function wire() {
    install();
    // Close the fan on pick: the tool's own handler re-renders after ours ran.
    var sel = document.querySelector('.c2-card[data-c2-card]');
    if (sel && !wide()) { var sc = document.getElementById('dmMapScroll'); void sc; }
  }
  if (typeof document !== 'undefined') install();
  W.HearthC2 = { html: html, wire: wire, openCard: function (id) { openCard(id, false); }, active: function () { return !!document.querySelector('.c2'); }, _areaOf: areaOf, _dcOf: dcOf };
})();
