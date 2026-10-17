// Hearth UI polish — Home, Characters (+ empty state). Markup uses the design-system names; HearthUI.px
// prefixes them. The app's own wiring (data-play, data-home-act, data-home-menu, data-home-panel...) binds
// to this markup, so every action still runs through the app's code.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, tag = U.tag, sec = U.sec, esc = U.esc;
  function rel(iso) {
    var t = typeof iso === 'number' ? iso : Date.parse(iso || ''); if (!t) return '';
    var d = (Date.now() - t) / 864e5;
    if (d < 0.5) return 'Today'; if (d < 1.5) return 'Yesterday'; if (d < 7) return Math.round(d) + ' days ago'; if (d < 14) return 'Last week';
    if (d < 45) return Math.round(d / 7) + ' weeks ago';
    try { return new Date(t).toLocaleDateString('en-GB', { month: 'long', timeZone: 'Europe/London' }); } catch (e) { return ''; }
  }
  function lvlReady(ch) { try { return (ch.xp || 0) > 0 && levelForXp(ch.xp || 0) > (ch.level || 1) ? levelForXp(ch.xp) : 0; } catch (e) { return 0; } }
  function firstResource(ch) {
    try { var rs = characterResources(ch) || []; var r = rs[0]; if (!r) return null; return { name: r.name, left: resourceRemaining(ch, r), max: resourceMax(ch, r) }; } catch (e) { return null; }
  }
  function games() { try { return loadGames(); } catch (e) { return { games: [] }; } }
  function gameStats(g) {
    var encs = g.encounters || [], enc = encs.find(function (e) { return e.id === g.activeEncounterId; }) || encs[0] || null;
    var foes = enc ? (enc.monsters || []).length : 0;
    return { players: (g.players || []).length, encs: encs.length, enc: enc, foes: foes };
  }
  function liveInfo(g) {
    var h = (typeof HearthLink !== 'undefined' && HearthLink.host) || null, gc = games();
    var live = !!(h && h.status === 'live' && g && g.id === gc.activeGameId);
    var devs = h && h.devices ? Object.keys(h.devices).map(function (k) { return h.devices[k]; }).filter(function (d) { return !d.kicked; }) : [];
    return { live: live, connected: devs.filter(function (d) { return d.online; }).length, known: devs.length, code: h && h.code };
  }
  U.liveInfo = liveInfo; U.rel = rel; U.games = games; U.gameStats = gameStats;
  function vt(l, v, s) { return '<div class="vt"><div class="t-label">' + l + '</div><div class="t-num">' + v + (s ? '<small>' + s + '</small>' : '') + '</div></div>'; }
  function vtSlots(ch, label) {
    var s = U.slotInfo(ch);
    return '<div class="vt"><div class="t-label">' + label + '</div>' + (s ? '<div class="pips-wrap">' + U.pips(s.total, s.left) + '</div>' : '<div class="t-num">–</div>') + '</div>';
  }
  function heroMeta(ch) { return [U.classLine(ch), U.subLine(ch), U.raceName(ch), ch.background && (typeof BACKGROUNDS !== 'undefined' && BACKGROUNDS[ch.background] ? BACKGROUNDS[ch.background].name : '')].filter(Boolean).map(esc).join(' · '); }
  function portrait(ch, cls) { return ch.photo ? '<img class="' + cls + '" src="' + esc(ch.photo) + '" alt="">' : '<span class="' + cls + ' por-empty" aria-hidden="true">' + ic('user', 'xl') + '</span>'; }
  function draftCard() {
    var d = null; try { d = loadDraftProgress(); } catch (e) {}
    if (!d) return '';
    return '<div class="card pad hstack gap3 draftbar"><span class="lead">' + ic('pencil') + '</span><div class="f1"><div class="t-h3">Unfinished character found</div><div class="t-meta">' + esc(typeof draftSummary === 'function' ? draftSummary(d) : '') + '</div></div>' + btn('Discard', 'ghost sm', null, 'id="discardDraftBtn"') + btn('Resume', 'primary sm', null, 'id="resumeDraftBtn"') + '</div>';
  }
  // the app's backup reminder, in the new card style (same data-nudge hooks, so the app's handler still runs)
  function nudge() {
    var due = null; try { due = typeof hearthNudgeDue === 'function' ? hearthNudgeDue() : null; } catch (e) {}
    if (!due) return '';
    var first = due.kind === 'first';
    return '<div class="card pad nudge" role="status" aria-label="Backup reminder" data-nudge-kind="' + esc(due.kind) + '"><span class="lead">' + ic('download') + '</span><div class="f1"><div class="t-h3">' + (first ? 'Keep ' + esc(due.name || 'your character') + ' safe' : 'Time for a backup?') + '</div><div class="t-meta">' +
      (first ? 'Hearth saves on this device only. Export a backup file, or sign in with Google to sync your characters to your other devices.' : 'It’s been a while since your last backup. Export a file, or sign in with Google so your characters sync automatically.') + '</div></div>' +
      '<div class="nudge-acts">' + btn('Export backup', 'primary sm', null, 'data-nudge="export"') + btn('Sign in with Google', 'sm', null, 'data-nudge="signin"') + '</div>' + ibtn('x', 'data-nudge="later"', true, 'Dismiss backup reminder') + '</div>';
  }
  var DED = 'First play test &middot; 5th June 2026 &middot; by our fearless adventurer <b>Mr&nbsp;G.&nbsp;N.&nbsp;Wood</b>';

  // ---------------- Home ----------------
  function quick() {
    var gc = games(), n = U.chars().length, encs = gc.games.reduce(function (a, g) { return a + (g.encounters || []).length; }, 0);
    var lib = 0; try { lib = (typeof BATTLE_MAPS !== 'undefined' ? BATTLE_MAPS.length : 0); } catch (e) {}
    return [
      ['user', 'Characters', n ? n + (n === 1 ? ' hero' : ' heroes') + ' · create or import' : 'Create or import a hero', 'data-home-menu="player"'],
      ['crown', 'Dungeon Master', gc.games.length + (gc.games.length === 1 ? ' game' : ' games') + ' · ' + encs + (encs === 1 ? ' encounter' : ' encounters'), 'data-home-menu="dm"'],
      ['map', 'Library', 'Maps, homebrew &amp; community', 'data-home-panel="library"'],
      ['anvil', 'The Forge', 'Subclasses, items, house rules', 'data-u-go="forge"']];
  }
  function heroDesk(ch) {
    if (!ch) return '<div class="card raised hero hero-empty" style="grid-column:span 8"><span class="emblem">' + ic('user', 'xl') + '</span><div class="stack"><div class="t-display">Your adventure starts here</div><div class="t-body" style="margin-top:6px">Build a hero step by step, roll a random one, or bring one in from a file.</div>' +
      '<div class="hstack gap3" style="margin-top:24px">' + btn('Build a hero', 'primary lg', 'userplus', 'data-home-act="create-char"') + btn('Roll a random hero', 'lg', 'd20', 'data-home-act="random-char"') + btn('Import', 'lg ghost', 'download', 'data-home-menu="player"') + '</div></div></div>';
    var hp = U.hpOf(ch), res = firstResource(ch), up = lvlReady(ch), cast = U.slotInfo(ch);
    var fourth = res ? vt(esc(res.name), res.left, ' / ' + res.max) : vt('Speed', (function () { try { return raceDataFor(ch).speed; } catch (e) { return '–'; } })(), ' ft');
    return '<div class="card raised hero" style="grid-column:span 8">' + portrait(ch, 'por') + '<div class="stack">' +
      '<div class="hstack gap2">' + tag('Continue playing', 'gold') + (up ? tag(ic('levelup', 'sm') + ' Level ' + up + ' ready', 'moss') : '') + '</div>' +
      '<div class="t-display" style="margin-top:14px">' + esc(ch.name) + '</div><div class="t-body" style="margin-top:4px">' + heroMeta(ch) + '</div>' +
      '<div class="vit">' + vt('Hit points', hp.cur, ' / ' + hp.max) + vt('Armour class', U.acOf(ch)) + (cast ? vtSlots(ch, 'Spell slots') : vt('Level', ch.level || 1)) + fourth + '</div>' +
      '<div class="hstack gap3" style="margin-top:auto">' + btn('Open sheet', 'primary lg', 'sword', 'data-play="' + esc(ch.id) + '"') + btn('Switch character', 'lg', 'swap', 'data-u-act="switch"') + (up ? btn('Level up', 'lg ghost', 'levelup', 'data-u-act="levelup" data-id="' + esc(ch.id) + '"') : '') + '</div></div></div>';
  }
  function gameDesk() {
    var gc = games(), g = gc.games.find(function (x) { return x.id === gc.activeGameId; }) || gc.games[0];
    if (!g) return '<div class="card raised pad-l stack" style="grid-column:span 4"><div class="t-label">Dungeon Master</div><div class="t-h2" style="margin-top:12px">Run a game</div><div class="t-meta">Start a campaign, build encounters and share a live link with your players.</div>' +
      '<div class="hstack gap3" style="margin-top:auto">' + btn('New game', 'primary lg', 'plus', 'data-home-act="new-game" style="flex:1"') + btn('One-shot', 'lg', 'scroll', 'data-home-menu="dm"') + '</div></div>';
    var s = gameStats(g), L = liveInfo(g);
    return '<div class="card raised pad-l stack" style="grid-column:span 4"><div class="hstack gap2">' + (L.live ? '<span class="dot"></span><span class="t-label" style="color:var(--moss)">Game · live now</span>' : '<span class="t-label">Game · ' + (g.id === gc.activeGameId ? 'current' : 'paused') + '</span>') + '</div>' +
      '<div class="t-h2" style="margin-top:12px">' + esc(g.name) + '</div><div class="t-meta">' + s.encs + (s.encs === 1 ? ' encounter' : ' encounters') + ' · you are the DM</div>' +
      '<div class="list card sunk" style="margin:18px 0"><div class="row"><span class="lead">' + ic('users') + '</span><div class="grow"><div class="t-h3">' + s.players + (s.players === 1 ? ' player' : ' players') + '</div><div class="t-meta">' + (L.live ? L.connected + ' connected' : 'Share the live link to connect them') + '</div></div></div>' +
      (s.enc ? '<div class="row"><span class="lead">' + ic('sword') + '</span><div class="grow"><div class="t-h3">' + esc(s.enc.name || 'Encounter') + '</div><div class="t-meta">Next encounter · ' + s.foes + (s.foes === 1 ? ' creature' : ' creatures') + '</div></div></div>' : '') + '</div>' +
      '<div class="hstack gap3" style="margin-top:auto">' + btn('Run game', 'primary lg', 'crown', 'data-home-opengame="' + esc(g.id) + '" style="flex:1"') + btn('Live link', 'lg', 'link', 'data-u-act="livelink" data-id="' + esc(g.id) + '"') + '</div></div>';
  }
  function mapsList(n) {
    if (typeof BATTLE_MAPS === 'undefined') return '';
    var pick = ['snow', 'tavern', 'ship', 'crypt', 'forest', 'dungeon'].map(function (id) { return BATTLE_MAPS.find(function (m) { return m.id === id; }); }).filter(Boolean).slice(0, n);
    return pick.map(function (m) { var fx = window.HearthUILib ? HearthUILib.fxLine(m) : esc(m.cat); return '<div class="row mapt"><span class="mthumb" style="' + (typeof paintedThumbStyle === 'function' ? (paintedThumbStyle(m.id) || '') : '') + '"></span><div class="grow"><div class="t-h3">' + esc(m.name) + '</div><div class="t-meta">Hearth map · ' + fx + '</div></div>' + tag('Included') + '</div>'; }).join('');
  }
  function homeDesk() {
    var ch = U.current(), list = U.chars().filter(function (c) { return !ch || c.id !== ch.id; });
    var q = quick().map(function (t) { return '<button type="button" class="card qt" ' + t[3] + ' style="grid-column:span 3"><span class="emblem">' + ic(t[0]) + '</span><div class="f1"><div class="t-h3" style="font-size:18px">' + t[1] + '</div><div class="t-meta" style="margin-top:3px">' + t[2] + '</div></div><span class="faded">' + ic('right') + '</span></button>'; }).join('');
    var rows = list.slice(0, 4).map(function (c) { var h = U.hpOf(c); return '<button type="button" class="row" data-play="' + esc(c.id) + '">' + U.avatar(c, 44) + '<div class="grow"><div class="t-h3">' + esc(c.name) + '</div><div class="t-meta">' + esc([U.classLine(c), U.subLine(c)].filter(Boolean).join(' · ')) + '</div></div><div style="width:120px">' + U.hpbar(h.cur, h.max) + '<div class="t-meta" style="margin-top:4px;text-align:right">' + h.cur + ' / ' + h.max + ' HP</div></div><span class="chev">' + ic('right') + '</span></button>'; }).join('');
    if (!rows) rows = '<div class="row"><span class="lead">' + ic('userplus') + '</span><div class="grow"><div class="t-h3">' + (ch ? 'Only one hero so far' : 'No heroes yet') + '</div><div class="t-meta">Build another, roll one, or import from a file.</div></div>' + btn('New character', 'sm', 'plus', 'data-home-act="create-char"') + '</div>';
    var all = U.chars().length;
    return '<div class="wrap g home-g">' + draftCard() + nudge() + heroDesk(ch) + gameDesk() + q +
      '<div class="card listcard" style="grid-column:span 6"><div class="lc-h">' + sec('Your characters', all ? 'See all ' + all : '', 'data-home-menu="player"') + '</div><div class="list">' + rows + '</div></div>' +
      '<div class="card listcard" style="grid-column:span 6"><div class="lc-h">' + sec('Hearth maps', 'Open library', 'data-home-panel="library"') + '</div><div class="list">' + mapsList(4) + '</div></div>' +
      '<div class="ded" style="grid-column:span 12">' + DED + '</div></div>' + U.homeModals();
  }
  function homePhone() {
    var ch = U.current(), gc = games(), g = gc.games.find(function (x) { return x.id === gc.activeGameId; }) || gc.games[0];
    var hero;
    if (ch) {
      var hp = U.hpOf(ch), up = lvlReady(ch), cast = U.slotInfo(ch);
      hero = '<div class="card raised phero">' + portrait(ch, 'av por-ph') + '<div class="f1"><div class="hstack gap2">' + tag('Continue', 'gold') + (up ? tag('Lv ' + up + ' ready', 'moss') : '') + '</div><div class="t-h2" style="margin-top:8px">' + esc(ch.name) + '</div><div class="t-meta">' + esc([U.classLine(ch), U.subLine(ch)].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="pvit">' + vt('HP', hp.cur, ' /' + hp.max) + vt('AC', U.acOf(ch)) + (cast ? vtSlots(ch, 'Slots') : vt('Level', ch.level || 1)) + '</div>' +
        '<div class="hstack gap2" style="grid-column:1/3">' + btn('Open sheet', 'primary lg', 'sword', 'data-play="' + esc(ch.id) + '" style="flex:1"') + '<button type="button" class="btn lg sq" data-u-act="switch" aria-label="Switch character">' + ic('swap', 'sm') + '</button></div></div>';
    } else hero = '<div class="card raised pad stack gap3"><div class="t-h2">Your adventure starts here</div><div class="t-meta">Build a hero, roll one, or bring one in.</div>' + btn('Build a hero', 'primary lg block', 'userplus', 'data-home-act="create-char"') + '</div>';
    var live = '';
    if (g) { var s = gameStats(g), L = liveInfo(g); live = '<div class="card pad hstack gap3"><span class="lead round" style="color:var(--moss)">' + ic('crown') + '</span><div class="f1"><div class="hstack gap2">' + (L.live ? '<span class="dot"></span><span class="t-label" style="color:var(--moss)">Live now</span>' : '<span class="t-label">Your game</span>') + '</div><div class="t-h3" style="margin-top:4px">' + esc(g.name) + '</div><div class="t-meta">' + s.players + (s.players === 1 ? ' player' : ' players') + ' · ' + s.encs + (s.encs === 1 ? ' encounter' : ' encounters') + '</div></div>' + btn('Run', 'primary', null, 'data-home-opengame="' + esc(g.id) + '"') + '</div>'; }
    var q = '<div class="pq">' + quick().map(function (t) { return '<button type="button" class="card" ' + t[3] + '><span class="emblem">' + ic(t[0]) + '</span><div><div class="t-h3">' + t[1] + '</div><div class="t-meta">' + t[2] + '</div></div></button>'; }).join('') + '</div>';
    // Hearth Maps (store flag only): phones have no sidebar, so Home carries the same "New" entry the desk sidebar shows
    var maps = U.storeOn() ? '<button type="button" class="card pad hstack gap3 pmaps" data-u-go="store"><span class="lead">' + ic('bag') + '</span><div class="f1"><div class="hstack gap2"><span class="t-h3">Hearth Maps</span>' + tag('New') + '</div><div class="t-meta">Painted battle maps for your table</div></div>' + ic('right', 'sm') + '</button>' : '';
    return '<div class="stack gap4">' + draftCard() + nudge() + hero + live + q + maps + '<div class="ded" style="font-size:12.5px">' + DED + '</div></div>' + U.homeModals();
  }
  function greet() { var h = 12; try { h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/London' })); } catch (e) {} return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  U.screens.home = {
    owns: true,
    html: function () { return U.isDesk() ? homeDesk() : homePhone(); },
    meta: function () {
      var ch = U.current();
      return { title: greet(), meta: ch ? 'Pick up where you left off' : 'Welcome to Hearth', search: 'Search spells, items, monsters…',
        actions: btn('Join a game', '', 'link', 'data-u-act="join"') + btn('New character', 'primary', 'plus', 'data-home-act="create-char"'),
        ptitle: '<span class="brass-text">Hearth</span>',
        pright: ibtn('search', 'data-u-go="reference"', true, 'Search') + (ch ? '<button type="button" class="ibtn plain" data-u-act="switch" aria-label="Switch character">' + U.avatar(ch, 32, 'thin') + '</button>' : ibtn('gear', 'data-u-go="settings"', true, 'Settings')) };
    },
    css: [
      '.home-g{grid-template-columns:repeat(12,minmax(0,1fr));grid-template-rows:auto auto auto 1fr auto;min-height:calc(100vh - 88px - 64px)}',
      '.home-g>.draftbar,.home-g>.nudge{grid-column:1/-1}',
      '.nudge{display:flex;align-items:center;gap:12px}.nudge-acts{display:flex;gap:8px;flex-wrap:wrap}',
      '.u-phone .nudge{flex-wrap:wrap}.u-phone .nudge .f1{flex-basis:calc(100% - 110px)}.u-phone .nudge-acts{order:4;width:100%}',
      '.hero{display:grid;grid-template-columns:210px 1fr;gap:28px;padding:28px;overflow:hidden}',
      '.hero .por{width:210px;height:100%;min-height:250px;border-radius:14px;object-fit:cover;border:1px solid var(--gold-deep);box-shadow:0 0 0 4px rgba(0,0,0,.35),var(--sh2);background:var(--page-deep)}',
      '.por-empty{display:flex;align-items:center;justify-content:center;color:var(--gold)}',
      '.hero:after{content:"";position:absolute;right:-90px;top:-90px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--ember) 16%,transparent),transparent 65%);pointer-events:none}',
      '.hero-empty{grid-template-columns:auto 1fr;align-items:center}.hero-empty .emblem{width:132px;height:132px}',
      '.vit{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 24px}',
      '.vt{padding:12px 14px;border-radius:10px;background:var(--well);border:1px solid var(--hair);min-width:0}.vt .t-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vt .t-num{font-size:24px;margin-top:8px}.vt .t-num small{font:500 13px var(--sans);color:var(--ink-faded)}.vt .pips-wrap{margin-top:14px}',
      '.qt{display:flex;align-items:center;gap:16px;padding:20px;text-align:left;cursor:pointer;color:var(--ink);font:inherit}.qt .emblem{width:60px;height:60px;flex:none}.qt .emblem svg{width:28px;height:28px}.qt:hover{box-shadow:var(--sh2)}',
      '.listcard{padding:20px 8px 8px;display:flex;flex-direction:column;min-height:0}.lc-h{padding:0 16px}',
      'button.row{width:100%;background:none;border:0;border-radius:10px;text-align:left;color:var(--ink);font:inherit;cursor:pointer}button.row:hover{background:color-mix(in srgb,var(--gold) 6%,transparent)}',
      '.list>.row+.row{border-top:1px solid var(--hair)}',
      '.mapt{display:flex;gap:14px;align-items:center}.mthumb{width:92px;height:62px;border-radius:8px;border:1px solid var(--rim);background-size:600% 600%;background-color:var(--page-deep);flex:none}',
      '.phero{padding:16px;display:grid;grid-template-columns:76px 1fr;gap:14px;align-items:center}',
      '.phero .por-ph{width:76px;height:76px;border-radius:16px;object-fit:cover;border:2px solid var(--gold-deep);background:var(--page-deep)}',
      '.pvit{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;grid-column:1/3}.pvit .vt{padding:9px 10px}.pvit .vt .t-num{font-size:20px;margin-top:6px}.pvit .pips-wrap{margin-top:10px}',
      '.btn.sq{width:52px;padding:0;flex:none}',
      '.pq{display:grid;grid-template-columns:1fr 1fr;gap:12px}','.pmaps{width:100%;text-align:left;min-height:64px;color:var(--ink);cursor:pointer}.pmaps .u-lead{color:var(--gold)}',
      '.pq .card{padding:14px;display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:118px;text-align:left;color:var(--ink);font:inherit;cursor:pointer}.pq .emblem{width:44px;height:44px}.pq .emblem svg{width:22px;height:22px}',
      '.av.thin{border-width:1px}',
      '.draftbar{align-items:center}'
    ].join('\n')
  };

  // ---------------- Characters ----------------
  function charMenu(c) {
    if (state.ui.charMenuOpen !== c.id) return '';
    return '<div class="menu" role="menu"><button type="button" class="menu-i" data-edit="' + esc(c.id) + '">' + ic('pencil', 'sm') + 'Edit in builder</button><button type="button" class="menu-i" data-u-act="export-char" data-id="' + esc(c.id) + '">' + ic('upload', 'sm') + 'Export</button><button type="button" class="menu-i danger-t" data-u-act="delete-char" data-id="' + esc(c.id) + '">' + ic('trash', 'sm') + 'Delete</button></div>';
  }
  function sorted() {
    var l = U.chars().slice(), cur = U.current();
    if (state.ui.uCharSort === 'recent') l.sort(function (a, b) { return (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0); });
    else if (cur) l.sort(function (a, b) { return (a.id === cur.id ? -1 : 0) - (b.id === cur.id ? -1 : 0); });
    var q = (state.ui.uCharQ || '').toLowerCase();
    if (q) l = l.filter(function (c) { return (c.name + ' ' + U.classLine(c)).toLowerCase().indexOf(q) >= 0; });
    return l;
  }
  function seg() { var n = U.chars().length, r = state.ui.uCharSort === 'recent'; return '<div class="seg" role="tablist"><button type="button" class="' + (r ? '' : 'on') + '" data-u-act="charsort" data-v="all" role="tab" aria-selected="' + !r + '">All ' + n + '</button><button type="button" class="' + (r ? 'on' : '') + '" data-u-act="charsort" data-v="recent" role="tab" aria-selected="' + r + '">Recent</button></div>'; }
  function card(c, cur) {
    var h = U.hpOf(c), w = rel(c.updatedAt);
    return '<div class="card cc ' + (cur ? 'active' : '') + '"><div class="top2">' + (cur ? tag('Playing', 'gold') : (w ? tag(esc(w)) : '')) + '<span class="cmenu">' + ibtn('more', 'data-char-menu="' + esc(c.id) + '"', true, 'More for ' + c.name) + charMenu(c) + '</span>' + (c.photo ? '<img src="' + esc(c.photo) + '" alt="">' : '<span class="pimg avi">' + esc(String(c.name || '?').replace(/^Sample:\s*/, '').charAt(0).toUpperCase()) + '</span>') + '</div>' +
      '<div class="bd"><div class="t-h2 ell">' + esc(c.name) + '</div><div class="t-meta ell">' + esc([U.classLine(c), U.subLine(c)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="meta3"><div><span class="t-label">HP</span><b>' + h.cur + '<small class="faded">/' + h.max + '</small></b></div><div><span class="t-label">AC</span><b>' + U.acOf(c) + '</b></div><div><span class="t-label">Level</span><b>' + (c.level || 1) + '</b></div></div>' +
      '<div style="margin-top:12px">' + U.hpbar(h.cur, h.max) + '</div><div class="hstack gap2" style="margin-top:auto;padding-top:16px">' + btn('Open sheet', 'sm ' + (cur ? 'primary' : 'quiet'), null, 'data-play="' + esc(c.id) + '" style="flex:1"') + '<button type="button" class="ibtn exp" data-u-act="export-char" data-id="' + esc(c.id) + '" aria-label="Export ' + esc(c.name) + '">' + ic('upload', 'sm') + '</button></div></div></div>';
  }
  function joined() {
    var out = [], j = (typeof HearthLink !== 'undefined' && HearthLink.join) || null;
    if (j && j.code) { var who = U.chars().find(function (c) { return c.id === j.charId; }); out.push('<div class="row"><span class="lead">' + ic('map') + '</span><div class="grow"><div class="t-h3">' + esc(j.gameName || 'Live game') + '</div><div class="t-meta">' + (who ? 'as ' + esc(who.name) + ' · ' : '') + (j.status === 'linked' ? 'live now' : esc(j.status || '')) + '</div></div>' + (j.status === 'linked' ? '<span class="dot"></span>' : '') + '</div>'); }
    try { (HearthGoogle.games.invited || []).slice(0, 3).forEach(function (g) { out.push('<div class="row"><span class="lead">' + ic('map') + '</span><div class="grow"><div class="t-h3">' + esc(g.name || 'Game') + '</div><div class="t-meta">Invited with Google</div></div></div>'); }); } catch (e) {}
    return out.length ? out.join('') : '<div class="t-meta" style="padding:8px">No games joined yet. Your DM will send you a link or a code.</div>';
  }
  function lastBackup() { var t = 0; try { t = Number(localStorage.getItem('hearth.ui.lastBackupAt') || 0); } catch (e) {} return t; }
  function rail() {
    var g = (typeof HearthGoogle !== 'undefined' && HearthGoogle.user) ? HearthGoogle.user : null, gc = games(), lb = lastBackup();
    return '<div class="stack gap4 rail">' +
      '<div class="card"><div class="hstack gap3"><span class="lead">' + ic('link') + '</span><div class="f1"><div class="t-h3">Join a game</div><div class="t-meta">Paste the link or code your DM shared</div></div></div><label class="field" style="margin:14px 0 10px"><input data-u-joincode placeholder="hearth-XXXX-XXXX" aria-label="Game code or link" autocomplete="off"></label>' + btn('Join', 'primary block', null, 'data-u-act="join" data-home-act="join-game"') +
      '<div class="t-label" style="margin:20px 0 4px">Games you’ve joined</div><div class="list" style="margin:0 -8px">' + joined() + '</div></div>' +
      '<div class="card"><div class="hstack gap3"><span class="lead" style="color:' + (g ? 'var(--moss)' : 'var(--gold)') + '">' + ic(g ? 'cloud' : 'cloudoff') + '</span><div class="f1"><div class="t-h3">' + (g ? 'Synced with Google' : 'Not synced') + '</div><div class="t-meta">' + (g ? esc(g.email || 'Signed in') : 'Optional: keep heroes on every device') + '</div></div>' + (g ? '<span class="dot"></span>' : btn('Sign in', 'sm', null, 'data-home-act="account"')) + '</div><div class="t-body" style="margin-top:12px;font-size:13px">Your characters follow you to every phone, tablet and laptop you sign in on.</div></div>' +
      '<div class="card"><div class="hstack gap3"><span class="lead">' + ic('clock') + '</span><div class="f1"><div class="t-h3">Last backup</div><div class="t-meta">' + (lb ? esc(rel(lb)) + ' · ' : 'Not backed up from here yet · ') + U.chars().length + ' characters, ' + gc.games.length + ' games</div></div></div>' + btn('Back up now', 'block quiet', 'download', 'data-transfer-all="1" style="margin-top:14px"') + '</div>' +
      '<div class="card parch"><div class="t-label">Tip</div><div style="margin-top:8px;font-size:13.5px">Open a hero’s menu to edit them in the builder, export a file for a friend, or delete them (Hearth offers a backup first).</div></div></div>';
  }
  var IMPORT = '<input type="file" id="homeImportFile" accept=".json,application/json" style="display:none">';
  function charsDesk() {
    var l = sorted(), cur = U.current();
    var cards = l.map(function (c) { return card(c, cur && c.id === cur.id); }).join('');
    var nw = '<div class="card cc new"><span class="emblem">' + ic('userplus') + '</span><div class="t-h2">New character</div><div class="t-meta" style="max-width:220px">Step-by-step builder, or roll a random hero in one tap</div><div class="hstack gap2" style="margin-top:6px">' + btn('Create', 'primary', 'plus', 'data-home-act="create-char"') + btn('Random', '', 'd20', 'data-home-act="random-char"') + '</div></div>';
    var imp = '<div class="card cc new"><span class="emblem">' + ic('download') + '</span><div class="t-h2">Import</div><div class="t-meta" style="max-width:220px">From a Hearth character file or a full backup</div>' + btn('Choose file', '', 'upload', 'id="homeImportBackupBtn" style="margin-top:6px"') + '</div>';
    return '<div class="g chars-g"><div class="g ccgrid">' + cards + nw + imp + '</div>' + rail() + '</div>' + IMPORT;
  }
  function charsPhone() {
    var l = sorted(), cur = U.current();
    var rows = l.map(function (c) { var h = U.hpOf(c), on = cur && c.id === cur.id; return '<div class="card pc ' + (on ? 'active' : '') + '"><button type="button" class="pc-open" data-play="' + esc(c.id) + '">' + U.avatar(c, 56) + '<div class="f1"><div class="hstack gap2"><div class="t-h3 ell" style="font-size:17px">' + esc(c.name) + '</div>' + (on ? tag('Playing', 'gold') : '') + '</div><div class="t-meta ell">' + esc([U.classLine(c), U.subLine(c)].filter(Boolean).join(' · ')) + '</div><div class="hstack gap2" style="margin-top:7px"><div class="f1">' + U.hpbar(h.cur, h.max) + '</div><span class="t-meta">' + h.cur + '/' + h.max + '</span></div></div></button><span class="cmenu">' + ibtn('morev', 'data-char-menu="' + esc(c.id) + '"', true, 'More for ' + c.name) + charMenu(c) + '</span></div>'; }).join('');
    return '<div class="stack gap4"><div class="hstack gap2">' + btn('New character', 'primary', 'plus', 'data-home-act="create-char" style="flex:1"') + btn('Random', '', 'd20', 'data-home-act="random-char"') + '<button type="button" class="btn sq44" data-u-act="join" data-home-act="join-game" aria-label="Join a game">' + ic('link', 'sm') + '</button></div>' + seg() + '<div class="stack gap3">' + rows + '</div></div>' + IMPORT;
  }
  // empty state
  var OPTS = [['userplus', 'Build a hero', 'Guided, step by step: race, class, background and gear. About 5 minutes.', 'Start building', 'primary', 'data-home-act="create-char"'], ['d20', 'Roll a random hero', 'A ready-to-play level 1 character in one tap. Edit anything after.', 'Roll one', '', 'data-home-act="random-char"'], ['download', 'Import', 'Bring a character from a Hearth file or a full backup.', 'Choose file', '', 'id="homeImportBackupBtn"']];
  function emptyDesk() {
    var o = OPTS.map(function (x) { return '<div class="card raised"><span class="lead round">' + ic(x[0]) + '</span><div class="t-h2">' + x[1] + '</div><div class="t-body" style="font-size:13.5px;min-height:42px">' + x[2] + '</div>' + btn(x[3], 'block ' + x[4], null, x[5]) + '</div>'; }).join('');
    return '<div class="ewrap"><div class="empty bigempty"><span class="emblem">' + ic('user') + '</span><div class="t-display" style="margin-top:10px">Your adventure starts here</div><div class="t-body" style="font-size:16px;max-width:520px">You haven’t made a character yet. Build one, roll one, or bring one in. Everything stays on this device until you choose to sync.</div></div>' +
      '<div class="opts">' + o + '</div><div class="steps"><div><b>1</b>Make a hero</div><div><b>2</b>Join your DM’s game</div><div><b>3</b>Play: HP, spells and rolls in one place</div></div>' +
      '<div class="card joinbar"><span class="lead round">' + ic('link') + '</span><div class="f1"><div class="t-h3">Joining a friend’s game?</div><div class="t-meta">Make your hero first, then open the link your DM sent. Or paste it here.</div></div><label class="field" style="width:300px"><input data-u-joincode placeholder="hearth-XXXX-XXXX" aria-label="Game code or link"></label>' + btn('Join', '', null, 'data-u-act="join" data-home-act="join-game"') + '</div></div>' + IMPORT;
  }
  function emptyPhone() {
    var o = OPTS.slice(1).map(function (x) { return '<button type="button" class="card hstack gap3 eopt" ' + x[5] + '><span class="lead round">' + ic(x[0]) + '</span><div class="f1"><div class="t-h3">' + x[1] + '</div><div class="t-meta">' + x[2].split('.')[0] + '.</div></div><span class="faded">' + ic('right') + '</span></button>'; }).join('');
    return '<div class="stack gap4 pempty"><div class="empty" style="padding:36px 8px 12px"><span class="emblem" style="width:112px;height:112px">' + ic('user', 'xl') + '</span><div class="t-h1" style="margin-top:8px">Your adventure starts here</div><div class="t-body">No characters yet. Build one, roll one or bring one in.</div></div>' +
      btn('Build a hero', 'primary lg block', 'userplus', 'data-home-act="create-char"') + '<div class="stack gap3">' + o + '</div>' +
      '<button type="button" class="card parch hstack gap3 eopt" data-u-act="join" data-home-act="join-game"><span style="color:var(--parch-ink)">' + ic('link', 'lg') + '</span><div class="f1"><div class="t-h3">Joining a friend’s game?</div><div class="t-meta">Make a hero, then open the link your DM sent.</div></div></button></div>' + IMPORT;
  }
  U.screens.characters = {
    owns: true, nav: 'play',
    html: function () { var n = U.chars().length; return (n ? (U.isDesk() ? charsDesk() : charsPhone()) : (U.isDesk() ? emptyDesk() : emptyPhone())) + U.homeModals(); },
    meta: function () {
      var n = U.chars().length, g = (typeof HearthGoogle !== 'undefined' && HearthGoogle.user);
      return n ? { title: 'Characters', meta: n + (n === 1 ? ' hero' : ' heroes') + ' on this device' + (g ? ' · synced' : ''), search: 'Search characters…', extra: seg(),
        actions: btn('Random', '', 'd20', 'data-home-act="random-char"') + btn('New character', 'primary', 'plus', 'data-home-act="create-char"'),
        back: 'home', pright: ibtn('search', 'data-u-act="charsearch"', true, 'Search characters') + ibtn('upload', 'data-u-act="export"', true, 'Export or import') }
        : { title: 'Characters', meta: 'No characters yet', back: 'home', pright: ibtn('help', 'data-u-act="tour"', true, 'How Hearth works') };
    },
    after: function () {
      var s = document.querySelector('.u-top [data-u-search]');
      if (s) { s.value = state.ui.uCharQ || ''; s.oninput = function () { state.ui.uCharQ = s.value; var pos = s.selectionStart; render(); var s2 = document.querySelector('.u-top [data-u-search]'); if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) {} } }; s.dataset.uLocal = '1'; }
    },
    css: [
      '.chars-g{grid-template-columns:minmax(0,1fr) 340px;align-items:start}',
      '.ccgrid{grid-template-columns:repeat(auto-fill,minmax(232px,1fr));grid-auto-rows:1fr;align-content:start}',
      '.cc{padding:0;display:flex;flex-direction:column;min-width:0}',
      '.cc .top2{height:150px;position:relative;border-radius:var(--r-md) var(--r-md) 0 0;background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--ember) 20%,transparent),transparent 70%),rgba(0,0,0,.25);border-bottom:1px solid var(--hair);display:flex;align-items:flex-end;justify-content:center}',
      '.cc .top2 img,.cc .top2 .pimg{width:112px;height:112px;margin-bottom:-36px;border-radius:50%;border:3px solid var(--gold-deep);box-shadow:0 0 0 4px rgba(0,0,0,.35),var(--sh2);object-fit:cover;background:var(--page-deep);display:flex;align-items:center;justify-content:center;font:600 44px var(--serif);color:var(--gold)}',
      '.cmenu{position:absolute;right:6px;top:6px;z-index:3}.pc .cmenu{position:relative;right:auto;top:auto}',
      '.cc .top2 .tag{position:absolute;left:12px;top:14px}',
      '.cc .bd{padding:46px 20px 20px;text-align:center;display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}',
      '.cc .meta3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}',
      '.cc .meta3 div{padding:8px 4px;border-radius:9px;background:var(--well);border:1px solid var(--hair)}',
      '.cc .meta3 b{display:block;font:700 18px var(--serif)}.cc .meta3 small{font-size:12px}',
      '.cc .exp{width:34px;height:34px}',
      '.cc.new{border-style:dashed;background:transparent;box-shadow:none;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;min-height:360px}',
      '.rail .card{padding:20px}.rail .row{min-height:52px;padding:8px}',
      '.menu{position:absolute;right:0;top:46px;min-width:190px;padding:6px;border-radius:var(--r-md);background:var(--tex),var(--u-surface);border:1px solid var(--rim-strong);box-shadow:var(--sh3);display:flex;flex-direction:column;z-index:10}',
      '.menu-i{display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border-radius:8px;background:none;border:0;color:var(--ink);font:600 14px var(--sans);text-align:left;cursor:pointer}.menu-i:hover{background:var(--well)}',
      '.pc{display:flex;gap:6px;align-items:center;padding:8px 6px 8px 14px}.pc-open{flex:1;min-width:0;display:flex;gap:14px;align-items:center;background:none;border:0;color:var(--ink);font:inherit;text-align:left;padding:6px 0;cursor:pointer}',
      '.btn.sq44{width:44px;padding:0}',
      '.ewrap{min-height:calc(100vh - 88px - 64px);display:flex;flex-direction:column;justify-content:center;padding-bottom:40px}.bigempty{max-width:620px;margin:0 auto}',
      '.bigempty .emblem{width:132px;height:132px;box-shadow:inset 0 0 0 5px rgba(0,0,0,.25),inset 0 0 0 6px var(--hair),0 0 80px color-mix(in srgb,var(--ember) 30%,transparent)}.bigempty .emblem svg{width:60px;height:60px;stroke-width:1.2}',
      '.joinbar{max-width:1080px;margin:28px auto 0;width:100%;display:flex;align-items:center;gap:16px;padding:18px 22px}',
      '.opts{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px;max-width:1080px;width:100%;margin-left:auto;margin-right:auto}',
      '.opts .card{padding:24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}.opts .lead{width:52px;height:52px}',
      '.steps{display:flex;gap:28px;justify-content:center;margin-top:36px}.steps div{display:flex;align-items:center;gap:10px;color:var(--ink-faded);font-size:13px}.steps b{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--rim-strong);color:var(--gold);font:700 12px var(--sans)}',
      '.eopt{padding:14px;width:100%;text-align:left;color:var(--ink);font:inherit;cursor:pointer}',
      '.pempty{min-height:calc(100vh - 56px - 100px)}.pempty>.parch{margin-top:auto}'
    ].join('\n')
  };
  // ---------------- actions ----------------
  var A = U.actions;
  A.join = function () { var i = document.querySelector('[data-u-joincode]'); var v = i && i.value.trim(); if (typeof linkOpenJoinOverlay === 'function') linkOpenJoinOverlay(v || undefined); };
  A.levelup = function (t) { state.activeCharId = t.dataset.id; state.ui.rollLog = []; setActiveTab('play'); state.ui.levelUpDialog = true; render(); };
  A.livelink = function (t) { try { dmSwitchGame(t.dataset.id); } catch (e) {} state.ui.homePanel = null; setActiveTab('dm'); state.ui.dmLinkPanel = true; render(); };
  A.charsort = function (t) { state.ui.uCharSort = t.dataset.v === 'recent' ? 'recent' : null; render(); };
  A['export-char'] = function (t) { var ch = U.chars().find(function (c) { return c.id === t.dataset.id; }); state.ui.charMenuOpen = null; if (ch && typeof exportCharacterBackup === 'function') exportCharacterBackup(ch); };
  A.importfile = function () { var f = document.getElementById('homeImportFile'); if (f) f.click(); };
  A.charsearch = function () { var q = window.prompt('Search characters', state.ui.uCharQ || ''); if (q != null) { state.ui.uCharQ = q; render(); } };
  A.tour = function () { if (typeof hearthOpenTour === 'function') hearthOpenTour(); };
  // stamp the last full backup so Characters can show it
  if (typeof window.exportAllBackup === 'function' && !window.exportAllBackup._u) {
    var eab = window.exportAllBackup; window.exportAllBackup = function () { try { localStorage.setItem('hearth.ui.lastBackupAt', String(Date.now())); } catch (e) {} return eab.apply(this, arguments); }; window.exportAllBackup._u = true;
  }
  // Player in a live game: the app's link bar (turn, initiative, My sheet / Leave) in the polish look. Desk: a
  // card in the bottom-right corner, clear of the sheet's centre column; phone: just above the tab bar.
  // Content is unchanged: it is the shared player-visible order (playerVisibility), never monster HP or AC.
  window.HearthUI.addCss('u-ui-linkbar', [
    '.!hearth-link-bar{background:var(--tex),var(--u-surface)!important;color:var(--ink)!important;border:1px solid var(--gold-deep)!important;border-radius:var(--r-lg)!important;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--gold) 14%,transparent),var(--sh2)!important;font:500 14px var(--sans)!important}',
    '.!hearth-link-bar.!your-turn{border-color:var(--gold)!important;box-shadow:var(--glow),var(--sh2)!important}',
    '.u-desk .!hearth-link-bar{left:auto!important;right:24px!important;bottom:24px!important;transform:none!important;width:340px!important}',
    '.u-phone .!hearth-link-bar{bottom:calc(96px + var(--hearth-safe-bottom,0px))!important;width:calc(100vw - 24px)!important}',
    '.!hearth-link-bar-main{min-height:48px;padding:10px 14px!important;color:var(--ink)!important}',
    '.!hearth-link-head{font-weight:600}.!hearth-link-head strong{color:var(--gold)}.!hearth-link-caret{color:var(--gold)}',
    '.!hearth-link-dot{background:var(--good,#5fae6e)!important;box-shadow:0 0 6px color-mix(in srgb,var(--good,#5fae6e) 60%,transparent)}',
    '.!hearth-link-bar-body{padding:0 14px 14px!important;border-top:1px solid var(--hair);padding-top:10px!important}',
    '.!hearth-link-me{color:var(--ink-faded);opacity:1!important}',
    '.!hearth-link-order li{display:flex;align-items:center;gap:10px;padding:7px 10px!important;border-radius:var(--r-sm);color:var(--ink);margin:0 0 2px}',
    '.!hearth-link-order li.!turn{background:color-mix(in srgb,var(--gold) 14%,transparent);box-shadow:inset 0 0 0 1px var(--gold-deep)}',
    '.!hearth-link-order li.!you{color:var(--gold);font-weight:600}',
    '.!hearth-link-init{font-family:var(--serif);color:var(--gold);opacity:1!important;min-width:24px!important}',
    '.!hearth-link-bar-btns .!btn{flex:1;min-height:44px;border-radius:var(--r-md)!important;background:var(--tex),var(--u-raised,var(--u-surface))!important;border:1px solid var(--rim)!important;color:var(--ink)!important;font:600 14px var(--sans)!important}',
    '#hearthLinkBar .!btn.!danger{color:var(--danger,#e07a6a)!important;border-color:color-mix(in srgb,var(--danger,#e07a6a) 55%,transparent)!important}'
  ].join('\n'));
  // The bar sits under any open dialog (roll dialog, roll result, pickers, polish modals) so it never covers
  // their buttons; it comes back when the dialog closes. Raw CSS: :has() on body can't go through pxCss.
  (function () { var st = document.createElement('style'); st.id = 'u-ui-linkbar-raw';
    st.textContent = 'body:has(.dialog-backdrop, .skills-dialog-backdrop, .skill-choice-backdrop, .death-outcome-backdrop, .roll-outcome-dialog, .u-layer) #hearthLinkBar{display:none!important}';
    document.head.appendChild(st); })();
})();
