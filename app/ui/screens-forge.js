// Hearth UI polish — The Forge. The editors stay the app's own (renderForge + its wiring); this adds Jenny's
// four tool cards, the homebrew list and the how-to above/beside them. The tool cards drive the app's own
// buttons (#forgeOpenBtn, #miForgeOpenBtn, the forge tabs), so nothing is re-implemented.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, tag = U.tag, esc = U.esc, D = document;
  function hb() { try { return loadAiHomebrew() || []; } catch (e) { return []; } }
  function rules() { try { return (loadDmSettings().houseRules) || []; } catch (e) { return []; } }
  function entries() {
    var out = [];
    hb().forEach(function (h) {
      var d = h.data || {};
      if (h.type === 'subclass') out.push({ k: 'sub', icon: 'sparkle', name: h.title || d.name || 'Untitled', sub: ((typeof CLASSES !== 'undefined' && CLASSES[d.klass] && CLASSES[d.klass].name) || d.klass || 'Homebrew') + ' subclass · ' + Object.keys(d.levelFeatures || {}).length + ' feature levels', t: 'Subclass', edit: '[data-forge-edit="' + (d.id || '') + '|' + (d.klass || '') + '"]', del: '[data-forge-delete="' + (d.id || '') + '|' + (d.klass || '') + '"]', at: h.savedAt || h.createdAt });
      else if (h.type === 'magic_item') out.push({ k: 'item', icon: 'ring', name: h.title || d.name || 'Untitled', sub: [(typeof MAGIC_ITEM_RARITIES !== 'undefined' && MAGIC_ITEM_RARITIES[d.rarity] && MAGIC_ITEM_RARITIES[d.rarity].name) || d.rarity, (typeof MAGIC_ITEM_TYPES !== 'undefined' && MAGIC_ITEM_TYPES[d.type] && MAGIC_ITEM_TYPES[d.type].name) || d.type, d.attune ? 'requires attunement' : ''].filter(Boolean).join(' · '), t: 'Magic item', edit: '[data-mi-edit="' + (d.id || '') + '"]', del: '[data-mi-delete="' + (d.id || '') + '"]', at: h.savedAt || h.createdAt });
    });
    rules().forEach(function (r) { out.push({ k: 'rule', icon: 'gavel', name: r.title || 'House rule', sub: 'Table rule' + (r.note ? ' · ' + r.note : ''), t: 'House rule', tab: 'rules', at: r.at || r.createdAt }); });
    return out;
  }
  var TOOLS = [
    ['sparkle', 'Subclass', 'Guided themes and templates. Saved subclasses appear in character creation next to the SRD ones.', 'Open the Forge', '#forgeOpenBtn', 'subclass', true],
    ['ring', 'Magic item', 'Rarity, attunement, charges and effects. Saved items show up in the inventory item picker.', 'New item', '#miForgeOpenBtn', 'item'],
    ['gavel', 'House rules', 'DM mode, crit damage, spell preparation and your own table rulings.', 'Edit rules', '', 'rules'],
    ['camera', 'Import from photo', 'Snap a page from a book you own, and Hearth drafts the entry for you to check.', 'Import photo', '', 'import']];
  function toolsHTML() { return '<div class="ftools">' + TOOLS.map(function (t) { return '<div class="card raised ftool"><span class="emblem">' + ic(t[0], 'lg') + '</span><div class="t-h2">' + t[1] + '</div><div class="t-meta">' + t[2] + '</div>' + btn(t[3], 'block' + (t[6] ? ' primary' : ''), null, 'data-u-act="forge-tool" data-sel="' + esc(t[4]) + '" data-tab="' + t[5] + '" style="margin-top:auto"') + '</div>'; }).join('') + '</div>'; }
  function listHTML() {
    var all = entries(), f = state.ui.uForgeF || 'all', l = all.filter(function (e) { return f === 'all' || e.k === f; });
    var n = function (k) { return all.filter(function (e) { return e.k === k; }).length; };
    var chips = [['all', 'All', all.length], ['sub', 'Subclasses', n('sub')], ['item', 'Magic items', n('item')], ['rule', 'House rules', n('rule')]].map(function (c) { return '<button type="button" class="chip' + (c[0] === f ? ' on' : '') + '" data-u-act="forge-f" data-v="' + c[0] + '" aria-pressed="' + (c[0] === f) + '">' + c[1] + ' <span class="faded">' + c[2] + '</span></button>'; }).join('');
    var rows = l.length ? l.map(function (e, i) { return '<div class="row frow"><span class="lead">' + ic(e.icon) + '</span><div class="grow" style="min-width:0"><div class="t-h3 ell">' + esc(e.name) + '</div><div class="t-meta ell">' + esc(e.sub) + '</div></div>' + tag(e.t) + '<span class="t-meta fwhen">' + esc(U.rel(e.at) || '') + '</span>' + btn('Edit', 'sm', 'pencil', 'data-u-act="forge-edit" data-i="' + i + '"') + (e.del ? U.ibtn('trash', 'data-u-act="forge-del" data-i="' + i + '"', true, 'Delete ' + e.name) : '<span style="width:44px"></span>') + '</div>'; }).join('')
      : '<div class="empty" style="padding:28px 12px"><span class="emblem">' + ic('anvil', 'lg') + '</span><div class="t-h3">Nothing forged yet</div><div class="t-meta">Pick a tool above. What you make shows up across Hearth straight away.</div></div>';
    return '<div class="card listcard flist"><div class="lc-h">' + U.sec('Your homebrew · ' + all.length, all.length ? 'Back up' : '', 'data-u-act="forge-backup"') + '<div class="chips" style="margin:6px 0 4px">' + chips + '</div></div><div class="list">' + rows + '</div></div>';
  }
  var HOW = '<div class="card pad parch fhow"><div class="t-label">How the Forge works</div><div style="margin-top:8px;font-size:13.5px">Pick a tool, fill in the guided steps, then save. It’s live across Hearth at once, stays on this device and travels in your backups.</div></div>';
  function cur() { var l = entries(); return l; }
  U.screens.forge = {
    nav: 'forge',
    meta: function () { return { title: 'The Forge', meta: 'Build homebrew subclasses, magic items and house rules', actions: btn('Import file', '', 'download', 'data-u-act="forge-tool" data-tab="import"'), psub: 'Homebrew' }; },
    after: function (c) {
      var sec = c.querySelector('section.ai-panel'); if (!sec) return;
      c.classList.add('u-forge');
      var wrap = D.createElement('div'); wrap.className = 'u-fwrap';
      wrap.innerHTML = U.px(toolsHTML() + '<div class="fmain"><div class="fleft">' + listHTML() + '<div class="card fwork"><div class="t-label">Workshop</div></div></div><div class="fright">' + HOW + '</div></div>');
      c.insertBefore(wrap, c.firstChild);
      wrap.querySelector('.u-fwork').appendChild(sec);
    },
    css: [
      '#content.forge{max-width:none!important;padding:24px 32px 32px!important}',
      '#content.forge section.!ai-panel>.!section-label,#content.forge section.!ai-panel>.!section-helper{display:none}',
      '#content.forge section.!ai-panel{margin:0;padding:0;background:none;border:0;box-shadow:none}',
      '.ftools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}',
      '.ftool{padding:22px;display:flex;flex-direction:column;gap:8px;min-height:250px}.ftool .emblem{width:64px;height:64px;margin-bottom:8px}',
      '.fmain{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:20px;margin-top:20px;align-items:start}',
      '.fleft{display:flex;flex-direction:column;gap:20px;min-width:0}.fright{display:flex;flex-direction:column;gap:20px}',
      '.frow{display:flex;align-items:center;gap:12px;min-height:56px}.fwhen{width:90px;text-align:right}',
      '.fwork{padding:20px}.fwork>.t-label{margin-bottom:12px}',
      '.u-phone .ftools{grid-template-columns:1fr 1fr;gap:12px}.u-phone .ftool{min-height:0;padding:14px}.u-phone .ftool .t-meta{display:none}.u-phone .ftool .emblem{width:44px;height:44px}',
      '.u-phone .fmain{grid-template-columns:1fr}.u-phone .fwhen{display:none}.u-phone #content.forge{padding:16px!important}'
    ].join('\n')
  };
  var A = U.actions;
  function tab(id) { var b = D.querySelector('[data-forge-tab="' + id + '"]'); if (b) b.click(); var w = D.querySelector('.u-fwork'); if (w) w.scrollIntoView({ block: 'start', behavior: 'auto' }); }
  A['forge-tool'] = function (t) { var s = t.dataset.sel; if (s && D.querySelector(s)) { D.querySelector(s).click(); return; } tab(t.dataset.tab); };
  A['forge-f'] = function (t) { state.ui.uForgeF = t.dataset.v === 'all' ? null : t.dataset.v; render(); };
  function pick(t) { var f = state.ui.uForgeF || 'all'; return entries().filter(function (e) { return f === 'all' || e.k === f; })[+t.dataset.i]; }
  A['forge-edit'] = function (t) { var e = pick(t); if (!e) return; if (e.edit && D.querySelector(e.edit)) D.querySelector(e.edit).click(); else tab(e.tab || 'rules'); };
  A['forge-del'] = function (t) { var e = pick(t); if (e && e.del && D.querySelector(e.del)) D.querySelector(e.del).click(); };
  A['forge-backup'] = function () { if (U.openExport) U.openExport(); else exportAllBackup(); };
})();
