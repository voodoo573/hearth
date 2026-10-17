// Hearth UI polish — Library: Maps (Hearth's painted maps + your uploads), Community content (the app's
// GitHub-curated content library, same data-cl-* hooks), and the offline/error state.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, tag = U.tag, sec = U.sec, esc = U.esc;
  function u() { return state.ui; }
  function tab() { return u().uLibTab === 'content' ? 'content' : 'maps'; }
  function cl() { try { return clUi(); } catch (e) { return {}; } }
  // ---------- maps ----------
  var EMBERS = { volcanic: 1 };
  function fx(m) { return { light: true, weather: true, embers: !!EMBERS[m.id] }; }
  function fxLine(m) { var f = fx(m); return esc(m.cat) + ' · ' + (f.embers ? 'lava embers & lighting' : 'lighting & weather'); }
  window.HearthUILib = { fxLine: fxLine };
  function thumb(m) { try { return paintedThumbStyle(m.id) || (m.url ? "background-image:url('" + m.url + "')" : ''); } catch (e) { return ''; } }
  function userMaps() { try { return loadMapLibrary() || []; } catch (e) { return []; } }
  function mapCards() {
    var f = u().uMapFilter || 'all', q = String(u().uMapQ || '').toLowerCase(), out = [];
    var hm = (typeof BATTLE_MAPS !== 'undefined' ? BATTLE_MAPS : []), um = userMaps();
    if (f === 'all' || f === 'hearth' || (f !== 'mine')) hm.forEach(function (m) {
      if (f !== 'all' && f !== 'hearth' && m.cat !== f) return;
      if (q && (m.name + ' ' + m.cat).toLowerCase().indexOf(q) < 0) return;
      var e = fx(m);
      out.push('<div class="card mc"><button type="button" class="mimg" style="' + thumb(m) + '" data-u-act="map-use" data-id="' + esc(m.id) + '" aria-label="Use ' + esc(m.name) + ' in the current encounter"></button><span class="mtag">' + tag(ic('flame', 'sm') + ' Hearth map') + '</span><span class="mfx">' + (e.light ? '<span title="Lighting stops at walls">' + ic('torch', 'sm') + '</span>' : '') + (e.weather ? '<span title="Weather">' + ic('weather', 'sm') + '</span>' : '') + (e.embers ? '<span title="Embers">' + ic('flame', 'sm') + '</span>' : '') + '</span>' +
        '<div class="mbd"><div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(m.name) + '</div><div class="t-meta ell">' + (U.isDesk() ? fxLine(m) : esc(m.cat)) + '</div></div>' + btn('Use', 'sm', null, 'data-u-act="map-use" data-id="' + esc(m.id) + '" aria-label="Use ' + esc(m.name) + ' in the current encounter"') + '</div></div>');
    });
    if (f === 'all' || f === 'mine') um.forEach(function (m) {
      if (q && String(m.name || '').toLowerCase().indexOf(q) < 0) return;
      out.push('<div class="card mc"><button type="button" class="mimg" style="background-image:url(\'' + esc(m.thumb) + '\');background-size:cover;background-position:center" data-u-act="map-use-mine" data-id="' + esc(m.id) + '" aria-label="Use ' + esc(m.name || 'map') + '"></button><span class="mtag">' + tag(ic('upload', 'sm') + ' My upload') + '</span>' +
        '<div class="mbd"><div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(m.name || 'Map') + '</div><div class="t-meta ell">Uploaded · weather & time of day</div></div>' + ibtn('trash', 'data-u-act="map-del" data-id="' + esc(m.id) + '"', true, 'Delete ' + (m.name || 'map')) + btn('Use', 'sm', null, 'data-u-act="map-use-mine" data-id="' + esc(m.id) + '"') + '</div></div>');
    });
    return out;
  }
  function mapChips() {
    var f = u().uMapFilter || 'all', hm = (typeof BATTLE_MAPS !== 'undefined' ? BATTLE_MAPS : []), cats = [];
    hm.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat); });
    var c = [['all', 'All maps', hm.length + userMaps().length], ['hearth', ic('flame', 'sm') + ' Hearth maps', ''], ['mine', ic('upload', 'sm') + ' My uploads', userMaps().length]].concat(cats.map(function (k) { return [k, esc(k), '']; }));
    return '<div class="chips" role="tablist">' + c.map(function (x) { return '<button type="button" class="chip' + (f === x[0] ? ' on' : '') + '" data-u-act="map-filter" data-v="' + esc(x[0]) + '" role="tab" aria-selected="' + (f === x[0]) + '">' + x[1] + (x[2] !== '' ? ' <b>' + x[2] + '</b>' : '') + '</button>'; }).join('') + '</div>';
  }
  var UPIN = '<input type="file" id="uMapUpload" accept="image/*" style="display:none">';
  function uploadCard() { return '<div class="card mc mup"><span class="emblem">' + ic('upload') + '</span><div class="t-h3">Upload a map</div><div class="t-meta" style="max-width:240px">JPG, PNG or WebP. Set the grid, then it works like any map. Weather and time of day work on every map; light that stops at walls and embers are for Hearth maps.</div>' + btn('Choose image', 'sm', null, 'data-u-act="map-upload"') + '</div>'; }
  function legend() { return '<div class="legend t-meta"><span>' + ic('torch', 'sm') + ' Lighting</span><span>' + ic('weather', 'sm') + ' Weather</span><span>' + ic('flame', 'sm') + ' Embers</span><span>Lighting and embers: Hearth maps only</span></div>'; }
  function mapsView() {
    var cards = mapCards();
    return '<div class="stack gap4 libm"><div class="hstack gap3 mchips">' + mapChips() + (U.isDesk() ? legend() : '') + '</div><div class="g mgrid">' + cards.join('') + uploadCard() + '</div>' + (cards.length ? '' : '<div class="t-meta">No maps match.</div>') + '</div>' + UPIN;
  }
  // ---------- community content ----------
  var TI = { race: 'user', subclass: 'sparkle', spell: 'scroll', feat: 'feather', background: 'book', weapon: 'sword', 'magic-item': 'ring', monster: 'skull', map: 'map' };
  function cats() { try { return CL_CATS; } catch (e) { return []; } }
  function vis(k) { try { return clVisibleItems(k); } catch (e) { return []; } }
  function inst() { try { return loadCommunityInstalled(); } catch (e) { return {}; } }
  function label(t) { try { return CL_TYPE_LABEL[t] || t; } catch (e) { return t; } }
  function allItems() { var a = []; cats().forEach(function (c) { a = a.concat(vis(c.key)); }); return a; }
  function listItems() {
    var ui = cl(), q = (ui.q || '').trim(), type = ui.type || 'all', out = [];
    cats().forEach(function (c) { if (type !== 'all' && type !== c.key) return; var it = vis(c.key).filter(function (x) { try { return clItemMatches(x, q); } catch (e) { return true; } }); out = out.concat(it); });
    try { out = clSortItems(out, ui.sort || 'name'); } catch (e) {}
    return out;
  }
  function addBtn(it, phone) {
    var ui = cl(), rec = inst()[it.id], outd = rec && rec.version !== it.version;
    if (rec && !outd) return '<button type="button" class="tag moss addedt" data-cl-open="' + esc(it.id) + '">' + ic('check', 'sm') + ' Added</button>';
    return btn(ui.busy === it.id ? 'Adding…' : (outd ? 'Update' : 'Add'), 'sm', 'plus', 'data-cl-add="' + esc(it.id) + '"' + (ui.busy ? ' disabled' : ''));
  }
  function rowsHTML() {
    var ui = cl(), items = listItems(), sel = ui.preview || (U.isDesk() && items[0] && items[0].id);
    if (!items.length) return '<div class="empty" style="padding:40px 12px"><div class="t-h3">' + (ui.status === 'loading' ? 'Loading the community library…' : (ui.q ? 'Nothing matches “' + esc(ui.q) + '”' : 'Nothing here yet')) + '</div>' + (ui.q || (ui.type && ui.type !== 'all') ? btn('Clear the search', 'ghost', null, 'data-cl-clear="1"') : '') + '</div>';
    return items.map(function (it) {
      var tags = (it.tags || []).slice(0, 3).map(function (t) { return '<span class="htag">#' + esc(t) + '</span>'; }).join('');
      return '<div class="!cl-card crow' + (sel === it.id ? ' on' : '') + '" data-cl-item="' + esc(it.id) + '"><span class="lead">' + ic(TI[it.type] || 'scroll') + '</span><button type="button" class="crow-i" data-cl-open="' + esc(it.id) + '"><span class="hstack gap2" style="flex-wrap:wrap"><span class="t-h3">' + esc(it.name) + '</span>' + (U.isDesk() ? '<span class="t-meta">' + esc(label(it.type)) + (it.author ? ' · by ' + esc(it.author) : '') + '</span>' : '') + '</span><span class="t-body csum">' + esc(it.summary) + '</span>' + (U.isDesk() && tags ? '<span class="hstack gap1" style="margin-top:6px">' + tags + '</span>' : '') + '</button>' + addBtn(it) + '</div>';
    }).join('');
  }
  // the app re-renders just the list while you type or filter; keep it in the new markup on this screen
  if (typeof window.clListHTML === 'function' && !window.clListHTML._u) {
    var origList = window.clListHTML;
    window.clListHTML = function () { if (U.route() === 'library' && tab() === 'content') return U.px(rowsHTML()); return origList.apply(this, arguments); };
    window.clListHTML._u = true;
  }
  function bst(t) { try { return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) + ' BST'; } catch (e) { return ''; } }
  function hm(t) { try { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }); } catch (e) { return ''; } }
  function statusLine() {
    var ui = cl(), off = typeof navigator !== 'undefined' && navigator.onLine === false;
    var t = ui.status === 'loading' ? 'Checking GitHub for new content…' : off ? 'Offline · showing the saved list' + (ui.fetchedAt ? ' from ' + hm(ui.fetchedAt) : '') : ui.status === 'error' ? 'Couldn’t reach GitHub · showing the saved list' + (ui.fetchedAt ? ' from ' + hm(ui.fetchedAt) : '') : ui.fetchedAt ? 'Up to date as of ' + hm(ui.fetchedAt) : '';
    return '<div class="t-meta cstat">' + ic(ui.status === 'error' || off ? 'cloudoff' : 'refresh', 'sm') + esc(t) + (U.isDesk() ? (t ? ' · ' : '') + 'curated on GitHub · shared under CC BY 4.0' : '') + '</div>';
  }
  function contentChips() {
    var ui = cl(), type = ui.type || 'all', all = allItems().length;
    var c = [['all', 'All', all]].concat(cats().map(function (x) { return [x.key, x.label, vis(x.key).length]; }).filter(function (x) { return x[2] > 0; }));
    return '<div class="chips" role="tablist">' + c.map(function (x) { return '<button type="button" class="chip' + (type === x[0] ? ' on' : '') + '" data-u-act="cl-type" data-v="' + esc(x[0]) + '" role="tab" aria-selected="' + (type === x[0]) + '">' + esc(x[1]) + ' <b>' + x[2] + '</b></button>'; }).join('') + '</div>';
  }
  function preview() {
    var ui = cl(), items = listItems(), id = ui.preview || (items[0] && items[0].id), e = null;
    try { e = id && clFindEntry(id); } catch (er) {}
    if (!e) return '<div class="card pv"><div class="empty"><div class="t-h3">Pick something to preview</div></div></div>';
    var file = null; try { file = clFileCache[e.id + '@' + e.version + '@' + (ui.bustToken || 0)]; } catch (er) {}
    var rec = inst()[e.id], outd = rec && rec.version !== e.version, lines = [];
    try { if (file) lines = clDetailLines(e.type, file.data); } catch (er) {}
    var rows = lines.map(function (l) { return '<div class="row kv"><span class="grow t-meta">' + esc(l[0]) + '</span><b>' + esc(l[1]) + '</b></div>'; }).join('') +
      '<div class="row kv"><span class="grow t-meta">Author</span><b>' + esc(e.author || 'unknown') + '</b></div><div class="row kv"><span class="grow t-meta">Licence</span><b>' + esc((function () { try { return clLicenceLabel((file && file.license) || 'CC-BY-4.0'); } catch (er) { return 'CC BY 4.0'; } })()) + '</b></div><div class="row kv"><span class="grow t-meta">Version</span><b>' + esc(e.version) + '</b></div>';
    var more = allItems().filter(function (x) { return x.author === e.author && x.id !== e.id; }).slice(0, 4).map(function (x) { return '<button type="button" class="row mrow" data-u-act="cl-open" data-id="' + esc(x.id) + '"><span class="gold">' + ic(TI[x.type] || 'scroll', 'sm') + '</span><span class="grow">' + esc(x.name) + '</span><span class="t-meta">' + esc(label(x.type)) + '</span></button>'; }).join('');
    var where = ''; try { where = clWhereItGoes(e.type); } catch (er) {}
    var acts = (rec && !outd) ? btn('In your Hearth', 'lg', 'check', 'disabled style="flex:1"') + btn('Remove', 'lg danger', null, 'data-cl-remove="' + esc(e.id) + '"') : btn(ui.busy === e.id ? 'Adding…' : (outd ? 'Update to v' + esc(e.version) : 'Add to my Hearth'), 'primary lg', 'plus', 'data-cl-add="' + esc(e.id) + '" style="flex:1"' + (ui.busy ? ' disabled' : ''));
    return '<div class="card pv stack">' + (U.isDesk() ? '' : btn('Back to the list', 'ghost', 'left', 'data-u-act="cl-back" style="align-self:flex-start;margin:-6px 0 8px -8px"')) +
      '<div class="hstack gap3"><span class="emblem" style="width:52px;height:52px">' + ic(TI[e.type] || 'scroll') + '</span><div class="f1" style="min-width:0"><div class="t-label">' + esc(label(e.type)) + (e.tags && e.tags[0] ? ' · ' + esc(e.tags[0].replace(/-/g, ' ')) : '') + '</div><div class="t-h1 ell">' + esc(file ? file.name : e.name) + '</div></div></div>' +
      '<div class="t-body" style="margin:12px 0 8px">' + esc((file && file.description) || e.summary) + '</div>' + (ui.previewStatus === 'loading' && ui.preview === e.id ? '<div class="t-meta">Loading details…</div>' : '') + (ui.previewStatus === 'error' && ui.preview === e.id ? '<div class="t-meta" style="color:var(--crimson-ink)">Couldn’t load the details: ' + esc(ui.previewError) + '</div>' : '') +
      '<div class="list">' + rows + '</div>' + (where ? '<div class="card parch pad" style="margin-top:16px"><div class="t-label">Where it shows up</div><div style="margin-top:6px;font-size:13.5px">' + esc(where) + (outd ? ' You have v' + esc(rec.version) + '.' : '') + '</div></div>' : '') +
      (more ? '<div class="t-label" style="margin:20px 0 6px">More from ' + esc(e.author) + '</div><div class="list">' + more + '</div>' : '') +
      '<div class="hstack gap2 pvact">' + acts + '<button type="button" class="btn lg sq" data-u-act="cl-link" data-id="' + esc(e.id) + '" aria-label="Open on GitHub">' + ic('link') + '</button></div></div>';
  }
  function contentView() {
    var ui = cl(), desk = U.isDesk();
    if (!desk && ui.preview) return preview();
    var sort = '<label class="select sortsel"><select id="clSort" aria-label="Sort"><option value="name"' + (ui.sort !== 'newest' ? ' selected' : '') + '>Name A–Z</option><option value="newest"' + (ui.sort === 'newest' ? ' selected' : '') + '>Newest</option></select>' + ic('down', 'sm') + '</label>';
    var list = '<div class="card clist stack"><div class="hstack gap3" style="padding:16px 16px 0">' + contentChips() + (desk ? sort : '') + '</div><div style="padding:8px 16px 4px">' + statusLine() + '</div><div class="list" id="clList">' + rowsHTML() + '</div></div>';
    if (!desk) return '<div class="stack gap3"><label class="field search">' + ic('search', 'sm') + '<input type="search" data-u-clq placeholder="Search name, tag or author…" aria-label="Search the community library" value="' + esc(ui.q || '') + '"></label>' + contentChips() + statusLine() + '<div class="card sunk list" id="clList">' + rowsHTML() + '</div></div>';
    return '<div class="g libc">' + list + preview() + '</div>';
  }
  // ---------- offline / error ----------
  function isDown() { var ui = cl(); return !u().uLibSaved && (ui.status === 'error' || (typeof navigator !== 'undefined' && navigator.onLine === false && !allItems().length)); }
  function errorView() {
    var ui = cl(), nm = (typeof BATTLE_MAPS !== 'undefined' ? BATTLE_MAPS.length : 0) + userMaps().length, ns = 0, cc = allItems().length;
    try { ns = (typeof SPELLS !== 'undefined' ? SPELLS.length : 0); } catch (e) {}
    var rows = [['map', 'Maps', nm + ' on this device'], ['scroll', 'Spells and rules', (ns ? ns + ' SRD spells, ' : '') + 'always offline'], ['users', 'Community content', cc ? cc + ' saved · last updated ' + (ui.fetchedAt ? bst(ui.fetchedAt) : 'earlier') : 'Nothing saved yet']];
    return '<div class="errw"><div class="empty"><span class="emblem err">' + ic('cloudoff', 'lg') + '</span><div class="t-h1" style="margin-top:8px">Can’t reach the community library</div><div class="t-body" style="max-width:500px">You’re offline, or the library didn’t answer. Everything already on this device still works, including your characters, games and maps.</div>' +
      '<div class="hstack gap3" style="margin-top:12px;justify-content:center">' + btn('Try again', 'primary', 'refresh', 'data-u-act="cl-refresh"') + btn('Use what’s saved', 'ghost', null, 'data-u-act="cl-saved"') + '</div></div>' +
      '<div class="card list errl">' + rows.map(function (r) { return '<div class="row"><span class="lead">' + ic(r[0]) + '</span><div class="grow"><div class="t-h3">' + r[1] + '</div><div class="t-meta">' + esc(r[2]) + '</div></div>' + (r[0] !== 'users' || cc ? tag(ic('check', 'sm') + ' Available', 'moss') : tag('Not saved')) + '</div>'; }).join('') + '</div></div>';
  }
  var retry = null;
  function tabsHTML() { var t = tab(); return '<div class="utabs" role="tablist">' + [['maps', 'Maps'], ['content', U.isDesk() ? 'Community content' : 'Community'], ['monsters', 'Monsters']].map(function (x) { return '<button type="button" role="tab" class="' + (t === x[0] ? 'on' : '') + '" aria-selected="' + (t === x[0]) + '" data-u-act="lib-tab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
  U.screens.library = {
    owns: true, nav: 'character',
    html: function () {
      var body = tab() === 'content' ? (isDown() ? errorView() : contentView()) : mapsView();
      return (U.isDesk() ? '' : '<div class="seg ptabs">' + [['maps', 'Maps'], ['content', 'Community'], ['monsters', 'Monsters']].map(function (x) { return '<button type="button" class="' + (tab() === x[0] ? 'on' : '') + '" data-u-act="lib-tab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>') + body;
    },
    meta: function () {
      var c = tab() === 'content', down = c && isDown();
      return { title: 'Library', meta: down ? 'Community content' : 'Maps, homebrew and community content', extra: down ? '' : tabsHTML(), search: down ? '' : (c ? 'Search name, tag or author…' : 'Search maps…'),
        actions: down ? '' : c ? btn('Refresh', '', 'refresh', 'data-u-act="cl-refresh"') : btn('Upload map', 'primary', 'upload', 'data-u-act="map-upload"'),
        back: 'home', pright: c ? ibtn('refresh', 'data-u-act="cl-refresh"', true, 'Refresh') : ibtn('search', 'data-u-act="map-search"', true, 'Search maps') + ibtn('upload', 'data-u-act="map-upload"', true, 'Upload map') };
    },
    after: function () {
      var c = tab() === 'content', ui = cl();
      var s = document.querySelector('.u-top [data-u-search]');
      if (s) { s.value = c ? (ui.q || '') : (u().uMapQ || ''); s.dataset.uLocal = '1'; s.oninput = function () { if (c) { ui.q = s.value; try { clRefreshList(); } catch (e) {} } else { u().uMapQ = s.value; var g = document.querySelector('.u-mgrid'); if (g) { g.innerHTML = U.px(mapCards().join('') + uploadCard()); } } }; }
      var pq = document.querySelector('[data-u-clq]');
      if (pq) pq.oninput = function () { ui.q = pq.value; try { clRefreshList(); } catch (e) {} };
      var so = document.getElementById('clSort'); if (so) so.onchange = function () { ui.sort = so.value === 'newest' ? 'newest' : 'name'; render(); };
      var up = document.getElementById('uMapUpload');
      if (up) up.onchange = function () { var f = up.files && up.files[0]; if (!f) return; addMapToLibrary(f).then(function () { u().uMapFilter = 'mine'; render(); showToast('Map added to your uploads'); }).catch(function () { showToast('Could not import that image.'); }); };
      if (c && U.isDesk() && !ui.preview && ui.status === 'ok' && !ui._uAuto) { var f1 = listItems()[0]; if (f1) { ui._uAuto = 1; setTimeout(function () { try { clOpenPreview(f1.id); } catch (e) {} }, 0); } }
      clearTimeout(retry);
      if (c && isDown()) { retry = setTimeout(function () { if (U.route() === 'library' && isDown()) try { clFetchIndex(false); } catch (e) {} }, 60000); setTimeout(function () { try { if (U.route() === 'library' && isDown() && !document.querySelector('.hearth-toast')) showToast('Back online? We’ll check again in a minute.', 6000); } catch (e) {} }, 400); }
    },
    css: [
      '.utabs{display:flex;gap:4px;align-self:flex-end;margin:0 auto 0 0;padding-left:32px}.utabs button{height:44px;padding:0 10px;background:none!important;border:0!important;border-bottom:2px solid transparent!important;color:var(--ink-faded)!important;font:600 13px var(--sans)!important;cursor:pointer;border-radius:0!important;box-shadow:none!important}.utabs button.on{color:var(--gold)!important;border-bottom-color:var(--gold)!important}',
      '.ptabs{margin-bottom:16px}',
      '.mchips{align-items:center}.mchips .chips{flex:1;min-width:0;overflow:auto;scrollbar-width:none}',
      '.chip{cursor:pointer;font-family:var(--sans)}',
      '.legend{display:flex;gap:14px;white-space:nowrap;align-items:center}.legend span{display:inline-flex;gap:5px;align-items:center}.legend svg{color:var(--gold)}',
      '.mgrid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}',
      '.mc{padding:0;overflow:hidden;display:flex;flex-direction:column;position:relative;min-width:0}',
      '.mimg{display:block;width:100%;padding:0;border:0;cursor:pointer;border-radius:0;aspect-ratio:4/3;background-color:var(--page-deep);background-size:600% 600%;border-bottom:1px solid var(--rim)}',
      '.mtag{position:absolute;left:10px;top:10px}.mtag .tag{background:rgba(0,0,0,.6);color:var(--map-ink);border-color:transparent}',
      '.mfx{position:absolute;right:10px;top:calc((100% - 64px) - 40px);display:flex;gap:6px}.mfx span{width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.62);border:1px solid var(--gold-deep);display:flex;align-items:center;justify-content:center;color:var(--gold)}',
      '.mbd{display:flex;align-items:center;gap:8px;padding:12px 14px;min-height:64px}',
      '.mup{border-style:dashed;background:transparent;box-shadow:none;align-items:center;justify-content:center;text-align:center;gap:10px;padding:24px;min-height:260px}',
      '.u-phone .mgrid{grid-template-columns:1fr 1fr;gap:12px}.u-phone .mbd .btn,.u-phone .mbd .ibtn{display:none}.u-phone .mbd{padding:10px 12px}.u-phone .mtag{display:none}',
      '.libc{grid-template-columns:minmax(0,1fr) 440px;align-items:start}',
      '.clist{padding:0 0 8px;min-height:calc(100vh - 88px - 64px)}',
      '.sortsel{margin-left:auto;position:relative;display:flex;align-items:center}.sortsel select{appearance:none;height:36px;padding:0 34px 0 12px;border-radius:var(--r-sm);background:var(--well);border:1px solid var(--rim);color:var(--ink);font:600 13px var(--sans)}.sortsel svg{position:absolute;right:10px;pointer-events:none;color:var(--ink-faded)}',
      '.cstat{display:flex;gap:6px;align-items:center}',
      '.crow{display:flex;align-items:center;gap:14px;padding:12px 16px;min-height:64px;border-top:1px solid var(--hair)}.crow.on{background:color-mix(in srgb,var(--gold) 7%,transparent);box-shadow:inset 3px 0 0 var(--gold)}',
      '.crow-i{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:none;border:0;padding:0;text-align:left;color:var(--ink);font:inherit;cursor:pointer}',
      '.csum{font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.htag{font:600 11px var(--sans);color:var(--ink-faded);padding:2px 7px;border-radius:var(--r-pill);background:var(--well);border:1px solid var(--hair)}',
      '.addedt{cursor:pointer;gap:4px}',
      '.pv{padding:24px;position:sticky;top:112px;min-height:calc(100vh - 88px - 64px)}.u-phone .pv{position:static;min-height:0;padding:18px}',
      '.kv{min-height:44px}.kv b{font:600 13px var(--sans)}',
      '.mrow{width:100%;background:none;border:0;color:var(--ink);font:inherit;text-align:left;cursor:pointer;gap:10px;min-height:44px}',
      '.pvact{margin-top:auto;padding-top:20px}.btn.sq{width:52px;padding:0;flex:none}',
      '.u-phone #clList .crow{padding:12px 14px}.u-phone #clList .crow:first-child{border-top:0}',
      '.errw{min-height:calc(100vh - 88px - 64px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px}.errl{width:min(560px,100%);padding:4px 12px}',
      '.u-phone .errw{min-height:calc(100vh - 56px - 160px)}'
    ].join('\n')
  };
  var A = U.actions;
  A['lib-tab'] = function (t) { if (t.dataset.v === 'monsters') { A.monsters(); return; } u().uLibTab = t.dataset.v; render(); };
  A['map-filter'] = function (t) { u().uMapFilter = t.dataset.v; render(); };
  A['map-search'] = function () { var q = window.prompt('Search maps', u().uMapQ || ''); if (q != null) { u().uMapQ = q; render(); } };
  A['map-upload'] = function () { u().uLibTab = 'maps'; var f = document.getElementById('uMapUpload'); if (!f) { render(); f = document.getElementById('uMapUpload'); } if (f) f.click(); };
  function useMap(fn, name) {
    var enc = null; try { enc = loadEncounter(); } catch (e) {}
    var g = U.games(), gm = g.games.find(function (x) { return x.id === g.activeGameId; });
    var go = function () { Promise.resolve(fn()).then(function () { state.ui.homePanel = null; setActiveTab('dm'); state.ui.dmMapMode = true; render(); showToast(name + ' is on ' + ((enc && enc.name) || 'the encounter') + '’s map'); }); };
    if (enc && (enc.mapId || enc.mapImage || enc.mapVideo)) confirmDialog('This replaces the map on ' + (enc.name || 'the current encounter') + (gm ? ' in ' + gm.name : '') + '.', go, { title: 'Use ' + name + '?', yes: 'Use map' });
    else go();
  }
  A['map-use'] = function (t) { var m = BATTLE_MAPS.find(function (x) { return x.id === t.dataset.id; }); if (!m) return; useMap(function () { var e = loadEncounter(); try { clearMapVideo(e); } catch (er) {} e.mapImage = null; e.mapId = m.id; e.mapKind = 'painted'; saveEncounter(e); try { broadcastMap(e); } catch (er) {} }, m.name); };
  A['map-use-mine'] = function (t) { var m = userMaps().find(function (x) { return x.id === t.dataset.id; }); useMap(function () { return applyLibraryMap(t.dataset.id); }, (m && m.name) || 'Your map'); };
  A['map-del'] = function (t) { var m = userMaps().find(function (x) { return x.id === t.dataset.id; }); confirmDialog('Delete ' + ((m && m.name) || 'this map') + ' from your uploads? Encounters already using it keep their copy.', function () { removeLibraryMap(t.dataset.id); render(); }, { title: 'Delete map?', yes: 'Delete', danger: true }); };
  A['cl-type'] = function (t) { cl().type = t.dataset.v; render(); };
  A['cl-open'] = function (t) { try { clOpenPreview(t.dataset.id); } catch (e) {} };
  A['cl-back'] = function () { cl().preview = null; render(); };
  A['cl-refresh'] = function () { u().uLibSaved = false; try { clFetchIndex(true); } catch (e) {} };
  A['cl-saved'] = function () { u().uLibSaved = true; if (!allItems().length) u().uLibTab = 'maps'; render(); };
  A['cl-link'] = function (t) { var e = null; try { e = clFindEntry(t.dataset.id); } catch (er) {} var url = CONTENT_REPO_URL + (e && e.path ? '/blob/main/' + e.path : ''); try { window.open(url, '_blank', 'noopener'); } catch (er) {} };
})();
