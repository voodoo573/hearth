// Hearth UI polish — character sheet. The sheet is still drawn by the app's renderPlay (all of its wiring,
// dialogs and edge cases stay exactly as they are); on desktop this module arranges the app's own blocks
// into Jenny's three columns and moves the header into the 88px top bar. Nodes are moved, not copied, so
// every listener the app bound keeps working.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, esc = U.esc, D = document;
  var COLS = [
    ['.vitals', '.stats-bar', '.stats-bar-hint', '.cond-strip', '.boosts-strip'],
    ['.action-tabs-primary', '.action-tabs-secondary', '.action-content', '.companions-section'],
    ['.resources-strip', '.slots-bar', '.gear-summary-card', '.coin-strip', '.rest-row', '.xp-strip']
  ];
  var STAY = '.dialog-backdrop,input[type=file],script,style,.play-top,.u-cols,[class*="popup"],[class*="overlay"],[id$="Backdrop"],[id$="Overlay"]';
  function arrange(c, cols, fallback) {
    var wrap = D.createElement('div'); wrap.className = 'u-cols u-cols' + cols.length;
    var els = cols.map(function () { var d = D.createElement('div'); d.className = 'u-col'; wrap.appendChild(d); return d; });
    var kids = [].slice.call(c.children), placed = new Set();
    cols.forEach(function (sels, i) { sels.forEach(function (s) { kids.forEach(function (k) { if (!placed.has(k) && k.matches(s)) { els[i].appendChild(k); placed.add(k); } }); }); });
    kids.forEach(function (k) { if (!placed.has(k) && !k.matches(STAY) && getComputedStyle(k).position !== 'fixed') { els[fallback].appendChild(k); placed.add(k); } });
    c.insertBefore(wrap, c.firstChild);
    return wrap;
  }
  U.arrange = arrange;
  function clickApp(sel) { var b = D.querySelector('#content ' + sel); if (b) b.click(); }
  U.actions['sheet-rest'] = function (t) { clickApp('[data-rest="' + t.dataset.v + '"]'); };
  U.actions['sheet-levelup'] = function () { clickApp('#xpLevelUpBtn'); };
  function ch() { try { return state.activeCharId ? getCharacter(state.activeCharId) : null; } catch (e) { return null; } }
  U.screens.sheet = {
    nav: 'play',
    meta: function () {
      var c = ch(); if (!c) return { title: 'Play', meta: 'No character selected' };
      var up = !!D.querySelector('#xpLevelUpBtn') || (function () { try { return (c.xp || 0) > 0 && levelForXp(c.xp) > (c.level || 1); } catch (e) { return false; } })();
      var line = [U.classLine(c), U.subLine(c), U.raceName(c), c.background && typeof BACKGROUNDS !== 'undefined' && BACKGROUNDS[c.background] ? BACKGROUNDS[c.background].name : ''].filter(Boolean).map(esc).join(' · ');
      return { title: esc(c.name || 'Unnamed'), meta: line, lead: true,
        actions: btn('Short rest', '', 'clock', 'data-u-act="sheet-rest" data-v="short"') + btn('Long rest', '', 'moon', 'data-u-act="sheet-rest" data-v="long"') + (up ? btn('Level up', 'primary', 'levelup', 'data-u-act="sheet-levelup"') : '') + '<span class="sheet-tools"></span>',
        ptitle: esc(c.name || 'Unnamed'), psub: esc(U.classLine(c)), pright: '<button type="button" class="ibtn plain" data-u-act="switch" aria-label="Switch character">' + U.avatar(c, 32, 'thin') + '</button>' };
    },
    after: function (c) {
      if (!U.isDesk() || !c.querySelector('.vitals')) { c.classList.remove('u-arr'); return; }
      c.classList.add('u-arr');
      arrange(c, COLS, 2);
      // header: the app's portrait button and its tools (notes, features, the sheet menu) move into the top bar
      var top = D.querySelector('.u-top'), ttl = top && top.querySelector('.u-ttl'), tools = top && top.querySelector('.u-sheet-tools');
      var photo = c.querySelector('#playPhotoBtn'), acts = c.querySelector('.play-top-actions');
      if (ttl && photo) { photo.classList.add('u-top-photo'); top.insertBefore(photo, ttl); }
      if (tools && acts) tools.appendChild(acts);
    },
    css: [
      '#content.arr{max-width:none!important;padding:24px 32px 32px!important}',
      '#content.arr>.!play-top{display:none}',
      '#content.arr .cols{display:grid;grid-template-columns:minmax(380px,0.95fr) minmax(0,1.5fr) minmax(360px,0.9fr);gap:24px;align-items:start}',
      '#content.arr .col{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '#content.arr .col>*{margin:0!important;max-width:none!important;width:auto!important}',
      '#content.arr .!stats-bar-scores{display:grid!important;grid-template-columns:repeat(3,1fr)!important}',
      '#content.arr .!stats-bar-scores>.!stat-cell{width:auto!important;min-width:0}',
      '#content.arr .!vital-stats{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px}',
      '#content.arr .!vital-stats>.!vital-stat{width:auto!important;min-width:0}',
      '#content.arr .!action-tabs-primary{display:grid!important;grid-template-columns:repeat(3,1fr)}',
      '#content.arr .!rest-row{display:grid!important;grid-template-columns:repeat(3,1fr);gap:8px}',
      '#content.arr .!hp-controls{display:grid!important;grid-template-columns:1fr 84px 1fr 44px;gap:8px}',
      '#content.arr .!coin-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}',
      '.top-photo{flex:none;width:56px!important;height:56px!important;margin-right:14px}',
      '.sheet-tools{display:flex;align-items:center}.sheet-tools .!play-top-actions{display:flex;gap:8px;margin:0;padding:0;border:0}'
    ].join('\n')
  };
})();
