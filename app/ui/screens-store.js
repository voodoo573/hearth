// Hearth UI polish — Hearth Maps store. PROPOSAL ONLY: there is no store in the app. This screen exists only
// behind the hidden flag (localStorage 'hearth.flag.store' = '1' or ?store=1), nothing links to it while the
// flag is off, every pack below is PLACEHOLDER data from Jenny's SPEC §6, no prices are shown (pricing is
// Thomas's call), and nothing here can buy anything.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, tag = U.tag, esc = U.esc;
  var PACKS = [ // PLACEHOLDER (SPEC §6) — not real products
    ['Crypt Collection', 'Six tombs and catacombs with torchlight that stops at walls.', 'Owned', ['crypt', 'dungeon']],
    ['Wild Roads', 'Forest tracks, river crossings and a storm that rolls in.', 'Coming soon', ['forest', 'snow']],
    ['Harbour & Hearth', 'Docks, a tavern and a ship at anchor, with lantern light.', 'Coming soon', ['tavern', 'ship']],
    ['Into the Deep', 'Caverns and a volcanic rift with drifting embers.', 'Coming soon', ['cavern', 'volcanic']]];
  function thumb(id) { var s = ''; try { s = paintedThumbStyle(id) || ''; } catch (e) {} return '<span class="sthumb" style="' + s + '"></span>'; }
  function html() {
    var desk = U.isDesk();
    var fx = [['torch', 'Light that stops at walls', 'Torches and lanterns throw real shadows.'], ['weather', 'Living weather', 'Rain, snow and fog that drift across the map.'], ['flame', 'Embers', 'Volcanic maps glow and spark.']];
    return '<div class="stack gap5">' +
      '<div class="card raised shero"><div class="f1"><div class="hstack gap2">' + tag('Proposal', 'crim') + tag('Placeholder data') + '</div><div class="t-display" style="margin-top:14px">Maps that come alive</div><div class="t-body" style="margin-top:8px;max-width:560px">Hearth maps carry effects only they can do. No prices are shown here: pricing hasn’t been decided.</div>' +
      '<div class="sfx">' + fx.map(function (f) { return '<div class="hstack gap3"><span class="lead">' + ic(f[0]) + '</span><div><div class="t-h3">' + f[1] + '</div><div class="t-meta">' + f[2] + '</div></div></div>'; }).join('') + '</div></div></div>' +
      '<div class="spacks">' + PACKS.map(function (p) { var own = p[2] === 'Owned'; return '<div class="card spack"><div class="sthumbs">' + p[3].map(thumb).join('') + '</div><div class="spb"><div class="hstack gap2"><div class="t-h2 f1">' + esc(p[0]) + '</div>' + tag(p[2], own ? 'moss' : '') + '</div><div class="t-meta" style="margin-top:6px">' + esc(p[1]) + '</div>' + btn(own ? 'Open in Library' : 'Coming soon', 'block' + (own ? ' primary' : ''), own ? 'map' : 'clock', own ? 'data-u-go="library"' : 'disabled aria-disabled="true"') + '</div></div>'; }).join('') + '</div>' +
      '<div class="t-meta" style="text-align:center">Placeholder packs from the design spec. Nothing on this page is for sale.</div></div>';
  }
  U.screens.store = {
    owns: true,
    html: function () { return U.storeOn() ? html() : ''; },
    meta: function () { return { title: 'Hearth Maps', meta: 'Proposal · placeholder data', actions: btn('Restore purchases', 'ghost', 'refresh', 'data-u-act="store-restore"'), back: 'home', psub: 'Proposal' }; },
    css: [
      '.shero{padding:32px;background:radial-gradient(ellipse at 85% 0%,color-mix(in srgb,var(--ember) 18%,transparent),transparent 60%),var(--tex),var(--u-surface)}',
      '.sfx{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px}.u-phone .sfx{grid-template-columns:1fr}',
      '.spacks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.u-phone .spacks{grid-template-columns:1fr}',
      '.spack{padding:0;overflow:hidden;display:flex;flex-direction:column}.sthumbs{display:grid;grid-template-columns:1fr 1fr;gap:2px;height:150px}',
      '.sthumb{display:block;background-size:600% 600%;background-color:var(--page-deep)}',
      '.spb{padding:18px;display:flex;flex-direction:column;gap:8px;flex:1}.spb .u-btn{margin-top:auto}'
    ].join('\n')
  };
  U.actions['store-restore'] = function () { try { showToast('Proposal only: there are no purchases to restore'); } catch (e) {} };
})();
