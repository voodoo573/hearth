// Hearth UI polish — dialogs: Export / Import, Switch character, Delete confirm. Desktop: centred dialog;
// phone: bottom sheet (HearthUI.modal). Every action calls the app's own functions.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, tag = U.tag, esc = U.esc;
  function hd(title, sub) { return '<div class="dh"><div class="f1"><div class="t-h1 dh-t">' + title + '</div>' + (sub ? '<div class="t-meta">' + sub + '</div>' : '') + '</div>' + ibtn('x', 'data-u-close="close"', false, 'Close') + '</div>'; }
  function toast(m) { try { showToast(m); } catch (e) {} }
  function charSub(c) { return esc([U.classLine(c), U.subLine(c)].filter(Boolean).join(' · ') || 'No class yet'); }

  // ---------------- Export / Import ----------------
  function openExport(cat) {
    var st = { cat: cat || 'character', sel: null };
    function items() {
      if (st.cat === 'character') return U.chars().map(function (c) { return { id: c.id, name: c.name || 'Unnamed', sub: charSub(c), av: U.avatar(c, 36) }; });
      var gc = U.games();
      if (st.cat === 'game') return (gc.games || []).map(function (g) { var s = U.gameStats(g); return { id: g.id, name: g.name || 'Game', sub: s.players + (s.players === 1 ? ' player' : ' players') + ' · ' + s.encs + (s.encs === 1 ? ' encounter' : ' encounters'), av: '<span class="lead">' + ic('crown') + '</span>' }; });
      var g = null; try { g = activeGame(gc); } catch (e) {}
      return ((g && g.encounters) || []).map(function (e) { var n = (e.monsters || []).length; return { id: e.id, name: e.name || 'Encounter', sub: esc(g.name || '') + ' · ' + n + (n === 1 ? ' creature' : ' creatures'), av: '<span class="lead">' + ic('sword') + '</span>' }; });
    }
    function html() {
      var l = items(); if (!l.some(function (x) { return x.id === st.sel; })) st.sel = l[0] ? l[0].id : null;
      var cur = l.find(function (x) { return x.id === st.sel; });
      var segs = [['character', 'Character', 'user'], ['game', 'Game', 'crown'], ['encounter', 'Encounter', 'sword']].map(function (s) { var on = s[0] === st.cat; return '<button type="button" role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-x-cat="' + s[0] + '">' + ic(s[2], 'sm') + s[1] + '</button>'; }).join('');
      var rows = l.length ? l.map(function (x) { var on = x.id === st.sel; return '<button type="button" class="xr' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-x-id="' + esc(x.id) + '">' + x.av + '<div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(x.name) + '</div><div class="t-meta ell">' + x.sub + '</div></div><span class="radio' + (on ? ' on' : '') + '" aria-hidden="true"></span></button>'; }).join('')
        : '<div class="t-meta" style="padding:16px">Nothing to export here yet.' + (st.cat === 'encounter' ? ' Encounters come from your active game.' : '') + '</div>';
      return hd('Export or import', 'Save any part of Hearth to a file, or bring one in.') +
        '<div class="seg x-seg" role="tablist">' + segs + '</div>' +
        '<div class="xlist" role="radiogroup" aria-label="Choose what to export" data-u-scroll>' + rows + '</div>' +
        (cur ? btn('Export ' + esc(cur.name), 'primary lg block', 'download', 'data-x-export="1"') : '') +
        '<div class="card xc"><span class="lead">' + ic('shield') + '</span><div class="f1"><div class="t-h3">Back up everything</div><div class="t-meta">Characters, games, encounters, homebrew and settings in one file.</div></div>' + btn('Back up', 'sm', null, 'data-x-all="1"') + '</div>' +
        '<div class="card xc drop" data-x-drop><span class="lead">' + ic('upload') + '</span><div class="f1"><div class="t-h3">Import from file</div><div class="t-meta">A character, game, encounter or full backup. Hearth works out which it is.</div></div>' + btn('Choose file', 'sm', null, 'data-x-import="1"') + '<input type="file" accept="application/json,.json" data-x-file hidden></div>';
    }
    var m = U.modal({ id: 'export', cls: 'xdlg', label: 'Export or import', width: 600, html: html });
    async function imp(f) { if (!f) return; try { await transferImport(f); m.close('import'); render(); } catch (err) { toast(err.message || 'Import failed'); } }
    m.layer.addEventListener('click', function (e) {
      var t = e.target.closest('[data-x-cat],[data-x-id],[data-x-export],[data-x-all],[data-x-import]'); if (!t) return;
      if (t.dataset.xCat) { st.cat = t.dataset.xCat; st.sel = null; m.refresh(); var f = m.panel.querySelector('[data-x-cat="' + st.cat + '"]'); if (f) f.focus(); return; }
      if (t.dataset.xId) { st.sel = t.dataset.xId; m.refresh(); var r = m.panel.querySelector('[data-x-id="' + CSS.escape(st.sel) + '"]'); if (r) r.focus(); return; }
      if (t.dataset.xExport) {
        if (st.cat === 'character') { var ch = U.chars().find(function (c) { return c.id === st.sel; }); if (ch) exportCharacterBackup(ch); }
        else if (st.cat === 'game') exportGameBackup(st.sel); else exportEncounterBackup(st.sel);
        return;
      }
      if (t.dataset.xAll) { exportAllBackup(); return; }
      if (t.dataset.xImport) m.panel.querySelector('[data-x-file]').click();
    });
    m.layer.addEventListener('change', function (e) { if (e.target.matches('[data-x-file]')) imp(e.target.files && e.target.files[0]); });
    m.layer.addEventListener('dragover', function (e) { if (e.target.closest('[data-x-drop]')) { e.preventDefault(); e.target.closest('[data-x-drop]').classList.add('u-over'); } });
    m.layer.addEventListener('drop', function (e) { var d = e.target.closest('[data-x-drop]'); if (!d) return; e.preventDefault(); imp(e.dataTransfer.files && e.dataTransfer.files[0]); });
    return m;
  }

  // ---------------- Switch character ----------------
  function openSwitcher() {
    var q = '';
    function list() { return U.chars().filter(function (c) { return !q || (c.name + ' ' + U.classLine(c)).toLowerCase().indexOf(q) >= 0; }); }
    function rowsHTML() {
      var cur = state.activeCharId, l = list();
      return l.length ? l.map(function (c) { var h = U.hpOf(c), on = c.id === cur; return '<button type="button" class="sw' + (on ? ' on' : '') + '" data-sw="' + esc(c.id) + '">' + U.avatar(c, 40) + '<div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(c.name || 'Unnamed') + '</div><div class="t-meta ell">' + charSub(c) + '</div></div><div class="swhp"><div class="t-meta">HP ' + h.cur + '/' + h.max + ' · AC ' + esc(U.acOf(c)) + '</div>' + U.hpbar(h.cur, h.max) + '</div><span class="swr">' + (on ? tag(ic('check', 'sm') + ' Current', 'gold') : '<span class="t-meta">' + esc(U.rel(c.updatedAt) || '') + '</span>') + '</span></button>'; }).join('')
        : '<div class="t-meta" style="padding:16px">' + (U.chars().length ? 'No characters match.' : 'No saved characters yet.') + '</div>';
    }
    function html() {
      var n = U.chars().length;
      return hd('Switch character', n + (n === 1 ? ' character' : ' characters') + ' on this device') +
        '<label class="field" style="margin:4px 0 12px">' + ic('search', 'sm') + '<input type="search" data-sw-q placeholder="Search characters" aria-label="Search characters" value="' + esc(q) + '"></label>' +
        '<div class="swl" data-u-scroll>' + rowsHTML() + '</div>' +
        '<div class="swa">' + btn('New character', '', 'plus', 'data-sw-new="1"') + btn('Import', '', 'upload', 'data-sw-imp="1"') + '</div>' +
        '<div class="t-meta swn">' + ic('check', 'sm') + ' Your current character is saved before you switch.</div>';
    }
    var m = U.modal({ id: 'switcher', cls: 'swdlg', label: 'Switch character', width: 680, html: html, focus: '[data-sw-q]' });
    m.layer.addEventListener('input', function (e) { if (!e.target.matches('[data-sw-q]')) return; q = e.target.value.trim().toLowerCase(); m.panel.querySelector('.u-swl').innerHTML = U.px(rowsHTML()); });
    m.layer.addEventListener('click', function (e) {
      var t = e.target.closest('[data-sw],[data-sw-new],[data-sw-imp]'); if (!t) return;
      if (t.dataset.swNew) { m.close('new'); startNewCharacterFromMenu(); return; }
      if (t.dataset.swImp) { m.close('import'); openExport('character'); return; }
      var id = t.dataset.sw; m.close('pick');
      if (id === state.activeCharId && state.tab === 'play') return;
      var active = getCharacter(state.activeCharId); if (active) saveCharacter(active);
      state.activeCharId = id; state.ui.rollLog = []; state.ui.homeMenu = null; state.ui.homePanel = null;
      setActiveTab('play'); render();
    });
    return m;
  }

  // ---------------- Delete confirm ----------------
  function openDeleteChar(id) {
    var ch = U.chars().find(function (c) { return c.id === id; }); if (!ch) return null;
    var keep = true, desk = U.isDesk();
    function html() {
      var w = U.rel(ch.updatedAt), danger = btn(keep ? 'Back up and delete' : 'Delete', 'danger lg' + (desk ? '' : ' block'), 'trash', 'data-del-go="1"'), no = btn('Keep character', 'lg' + (desk ? '' : ' block'), null, 'data-u-close="cancel"');
      return (desk ? '<div class="dh" style="justify-content:flex-end;margin-bottom:-8px">' + ibtn('x', 'data-u-close="close"', false, 'Close') + '</div>' : '') +
        '<span class="emblem crim">' + ic('trash') + '</span><div class="t-h1" style="margin-top:14px">Delete ' + esc(ch.name || 'this character') + '?</div>' +
        '<div class="t-body" style="margin-top:8px">This removes the character and their sheet from this device. It can’t be undone.</div>' +
        '<div class="card sunk delwho">' + U.avatar(ch, 52) + '<div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(ch.name || 'Unnamed') + '</div><div class="t-meta ell">' + charSub(ch) + (w ? ' · last played ' + esc(w.toLowerCase()) : '') + '</div></div></div>' +
        '<label class="card delbk"><input type="checkbox" data-del-bk ' + (keep ? 'checked' : '') + '><span class="cbx" aria-hidden="true">' + ic('check', 'sm') + '</span><div class="f1"><div class="t-h3">Download a backup first</div><div class="t-meta">Saves a Hearth file you can import later.</div></div></label>' +
        '<div class="dela">' + (desk ? no + danger : danger + no) + '</div>';
    }
    var m = U.modal({ id: 'confirm', cls: 'deldlg', role: 'alertdialog', label: 'Delete ' + (ch.name || 'character'), width: 520, html: html, focus: '[data-u-close="cancel"]' });
    m.layer.addEventListener('change', function (e) { if (e.target.matches('[data-del-bk]')) { keep = e.target.checked; m.refresh(); var c = m.panel.querySelector('[data-del-bk]'); if (c) c.focus(); } });
    m.layer.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del-go]')) return;
      if (keep) { try { exportCharacterBackup(ch); } catch (er) { toast('Backup failed, so nothing was deleted'); return; } }
      var remaining = loadCharacters().filter(function (c) { return c.id !== ch.id; });
      saveCharacters(remaining);
      if (state.activeCharId === ch.id) { state.activeCharId = (remaining[0] && remaining[0].id) || null; state.ui.rollLog = []; }
      state.ui.charMenuOpen = null;
      m.close('deleted'); toast((ch.name || 'Character') + ' deleted' + (keep ? ' · backup downloaded' : ''));
      render();
    });
    return m;
  }

  var A = U.actions;
  A['export'] = function (t) { openExport(t && t.dataset.cat); };
  A['switch'] = function () { openSwitcher(); };
  A['delete-char'] = function (t) { state.ui.charMenuOpen = null; openDeleteChar(t.dataset.id); };
  U.openExport = openExport; U.openSwitcher = openSwitcher; U.openDeleteChar = openDeleteChar;
  // every app entry point to the switcher (sheet header, menus) gets the new dialog; the old one stays as _uOrig
  if (typeof window.openCharacterSwitcher === 'function' && !window.openCharacterSwitcher._u) { var o = window.openCharacterSwitcher; window.openCharacterSwitcher = function () { return openSwitcher(); }; window.openCharacterSwitcher._u = true; window.openCharacterSwitcher._uOrig = o; }
  // the sheet menu's "Delete character" uses the new confirm too
  if (typeof window.deleteActiveCharacterFromMenu === 'function' && !window.deleteActiveCharacterFromMenu._u) { var d = window.deleteActiveCharacterFromMenu; window.deleteActiveCharacterFromMenu = function () { if (state.activeCharId) openDeleteChar(state.activeCharId); }; window.deleteActiveCharacterFromMenu._u = true; window.deleteActiveCharacterFromMenu._uOrig = d; }

  U.addCss('u2-css-dialogs', [
    '.dh{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px}.dh .u-ibtn{flex:none}',
    '.x-seg{display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:12px}.x-seg button{gap:6px}',
    '.xlist{display:flex;flex-direction:column;gap:8px;max-height:44vh;overflow:auto;margin-bottom:12px}',
    '.xr,.sw{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 14px;border-radius:10px;background:var(--well);border:1px solid var(--hair);color:var(--ink);font:inherit;text-align:left;cursor:pointer}',
    '.xr.on,.sw.on{border-color:var(--gold-deep);background:color-mix(in srgb,var(--gold) 8%,var(--well))}',
    '.radio{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--rim-strong);flex:none}.radio.on{border-color:var(--gold);box-shadow:inset 0 0 0 4px var(--well),inset 0 0 0 9px var(--gold)}',
    '.xc{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-top:12px}.xc.drop{border-style:dashed;background:transparent}.xc.drop.over{border-color:var(--gold)}',
    '.swl{display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto}',
    '.swhp{width:160px;flex:none}.swhp .t-meta{margin-bottom:5px}.swr{width:100px;flex:none;text-align:right}',
    '.swa{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.swn{display:flex;gap:6px;align-items:center;justify-content:center;margin-top:12px}',
    '.u-phone .swhp{width:96px}.u-phone .swr{display:none}',
    '.emblem.crim{width:64px;height:64px;color:var(--crimson-ink);border-color:color-mix(in srgb,var(--oxblood) 50%,var(--rim))}',
    '.delwho{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-top:18px}',
    '.delbk{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-top:12px;cursor:pointer}.delbk input{position:absolute;opacity:0;width:1px;height:1px}',
    '.cbx{width:26px;height:26px;border-radius:7px;border:1.5px solid var(--rim-strong);display:flex;align-items:center;justify-content:center;color:transparent;flex:none}',
    '.delbk input:checked+.cbx{background:var(--gold);border-color:var(--gold);color:var(--page-deep)}.delbk input:focus-visible+.cbx{outline:2px solid var(--gold);outline-offset:2px}',
    '.dela{display:flex;gap:12px;justify-content:flex-end;margin-top:20px}.u-phone .dela{flex-direction:column}'
  ].join('\n'));
})();
