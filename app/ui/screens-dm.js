// Hearth UI polish — Dungeon Master hub (homeMenu 'dm'). Real games, encounters, party and notes.
// Every action goes through the app's own functions (dmSwitchGame, dmSwitchEncounter, dmCreateGame...).
// Party rows are the DM's own view (players' HP is theirs to see); monsters are never shown with HP here.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, tag = U.tag, sec = U.sec, esc = U.esc;
  function lib() { try { return HEARTH_TOKEN_LIBRARY; } catch (e) { return []; } }
  function libPath(k) { try { return hearthTokenLibPath(k); } catch (e) { return 'tokens/lib/' + k + '.webp'; } }
  function monImg(m) {
    if (m.tokenImage) return m.tokenImage;
    var L = lib(), id = String(m.monsterId || '').replace(/^m_/, '').replace(/_/g, '-');
    if (L.indexOf(id) >= 0) return libPath(id);
    var slug = String(m.name || '').toLowerCase().replace(/\s*\d+$/, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    return L.indexOf(slug) >= 0 ? libPath(slug) : null;
  }
  function monType(m) { try { var x = m.monsterId && findMonster(m.monsterId); return m.tokenIcon || m.monsterType || (x && x.type) || ''; } catch (e) { return ''; } }
  function tokOf(m, s) {
    var src = monImg(m), st = s ? ' style="width:' + s + 'px;height:' + s + 'px"' : '';
    if (src) return '<img src="' + esc(src) + '" alt=""' + st + '>';
    var svg = ''; try { svg = monsterTypeIcon(monType(m)); } catch (e) {}
    return '<span class="tokf"' + st + ' aria-hidden="true">' + U.raw(svg || '') + '</span>';
  }
  function toks(list, s, max) { var l = list.slice(0, max || 6); return '<div class="toks">' + l.map(function (m) { return tokOf(m, s); }).join('') + (list.length > l.length ? '<span class="tokmore">+' + (list.length - l.length) + '</span>' : '') + '</div>'; }
  function charFor(p) { var cs = U.chars(); return cs.find(function (c) { return p.charId && c.id === p.charId; }) || cs.find(function (c) { return c.name && p.name && c.name.replace(/^Sample:\s*/, '') === String(p.name).replace(/\s*\(.*\)$/, ''); }) || null; }
  function playerToks(g, s) { return '<div class="toks">' + (g.players || []).slice(0, 5).map(function (p) { var c = charFor(p); return c && c.photo ? '<img src="' + esc(c.photo) + '" alt=""' + (s ? ' style="width:' + s + 'px;height:' + s + 'px"' : '') + '>' : '<span class="tokf ini"' + (s ? ' style="width:' + s + 'px;height:' + s + 'px"' : '') + '>' + esc(String(p.name || '?').charAt(0).toUpperCase()) + '</span>'; }).join('') + '</div>'; }
  function diff(g, e) {
    try {
      var ms = (e.monsters || []).filter(function (m) { return m.monsterId; });
      var xp = ms.reduce(function (a, m) { return a + monsterXP(findMonster(m.monsterId)); }, 0);
      return rateEncounter(xp, ms.length, g.level || 1, Math.max(1, (g.players || []).length));
    } catch (e2) { return null; }
  }
  var DK = { Trivial: '', Easy: '', Medium: 'moss', Hard: 'gold', Deadly: 'crim' };
  function diffTag(d) { return d ? tag(d, DK[d] || '') : ''; }
  function mapStyle(e) { try { return (e && e.mapId && paintedThumbStyle(e.mapId)) || ''; } catch (er) { return ''; } }
  function activeEnc(g) { return (g.encounters || []).find(function (e) { return e.id === g.activeEncounterId; }) || (g.encounters || [])[0] || null; }
  function latestNote(g) { var n = (g.notes || []).slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || 0) - (a.updated || 0); }); return n[0] || null; }
  function allEncs(gc) { var out = []; gc.games.forEach(function (g) { (g.encounters || []).forEach(function (e) { out.push({ g: g, e: e }); }); }); return out; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : (b || a + 's')); }

  function gameCard(g, gc, big) {
    var L = U.liveInfo(g), e = activeEnc(g), np = (g.players || []).length, ms = e ? (e.monsters || []) : [];
    var head = L.live ? '<span class="dot"></span><span class="t-label" style="color:var(--moss)">Live now</span>' : (g.id === gc.activeGameId ? tag('Current', 'gold') : tag('Paused'));
    var del = gc.games.length > 1 ? '<button type="button" class="ibtn plain gdel" data-home-delgame="' + esc(g.id) + '" aria-label="Delete ' + esc(g.name) + '">' + ic('trash', 'sm') + '</button>' : '';
    if (big) {
      var note = latestNote(g);
      return '<div class="card raised gm active"><span class="gimg" style="' + mapStyle(e) + '"></span><div class="bd"><div class="hstack gap2">' + head + '<span class="mla">' + del + '</span></div><div class="t-h1 ell">' + esc(g.name) + '</div>' +
        '<div class="hstack gap4">' + playerToks(g) + '<span class="t-meta">' + (L.live ? L.connected + ' of ' + Math.max(np, L.known) + ' connected' : plural(np, 'player') + ' · level ' + (g.level || 1)) + '</span></div>' +
        (e ? '<div class="card sunk nextup"><div class="hstack gap3"><span class="gold">' + ic('sword') + '</span><div class="f1" style="min-width:0"><div class="t-h3 ell">Next up: ' + esc(e.name || 'Encounter') + '</div><div class="t-meta">' + plural(ms.length, 'creature') + (e.mapId ? ' · map ready' : '') + (e.fog ? ' · fog' : '') + '</div></div></div></div>' : '') +
        (note ? '<div class="t-body ell2" style="font-size:13px"><span class="t-label" style="margin-right:6px">Notes</span>' + esc(note.title ? note.title + ': ' : '') + esc(String(note.body || '').slice(0, 160)) + '</div>' : '') +
        '<div class="hstack gap3" style="margin-top:auto">' + btn('Run game', 'primary lg', 'crown', 'data-home-opengame="' + esc(g.id) + '"') + btn('Projector', 'lg', 'tv', 'data-u-act="dm-projector" data-id="' + esc(g.id) + '"') +
        '<button type="button" class="btn lg sq48" data-u-act="livelink" data-id="' + esc(g.id) + '" aria-label="Live game link">' + ic('link') + '</button></div></div></div>';
    }
    return '<div class="card gm gm2"><span class="gimg" style="' + mapStyle(e) + '"></span><div class="bd"><div class="hstack gap2">' + head + '<span class="mla">' + del + '</span></div><div class="t-h2 ell">' + esc(g.name) + '</div><div class="t-meta">' + plural(np, 'player') + ' · ' + plural((g.encounters || []).length, 'encounter') + '</div>' +
      '<div style="margin-top:6px">' + playerToks(g) + '</div>' + (e ? '<div class="t-body" style="font-size:13px">' + esc(e.name || 'Encounter') + ' is set up' + (ms.length ? ' with ' + plural(ms.length, 'creature') : '') + '.</div>' : '') +
      '<div class="hstack gap3" style="margin-top:auto">' + btn('Resume', '', 'sword', 'data-home-opengame="' + esc(g.id) + '"') + btn('Live link', 'ghost', 'link', 'data-u-act="livelink" data-id="' + esc(g.id) + '"') + '</div></div></div>';
  }
  function encRow(x) {
    var ms = x.e.monsters || [];
    return '<div class="enc"><div style="min-width:0"><div class="t-h3 ell">' + esc(x.e.name || 'Encounter') + '</div><div class="t-meta ell">' + esc(x.g.name) + ' · ' + plural(ms.length, 'creature') + '</div></div>' + (ms.length ? toks(ms, 0, 5) : '<span class="t-meta">No creatures yet</span>') + '<span>' + diffTag(diff(x.g, x.e)) + '</span>' +
      btn('Run', 'sm primary', 'sword', 'data-u-act="run-enc" data-g="' + esc(x.g.id) + '" data-e="' + esc(x.e.id) + '"') + '</div>';
  }
  function partyRows(g) {
    var e = activeEnc(g), ps = (e && e.playerState) || {};
    var rows = (g.players || []).map(function (p) {
      var c = charFor(p), max = p.maxHp || (c ? U.hpOf(c).max : 0), st = ps[p.id] || {}, cur = st.hp == null ? max : st.hp;
      var ac = p.ac || (c ? U.acOf(c) : '–'), pp = '–'; if (c) try { pp = 10 + skillBonus(c, 'perception'); } catch (er) {}
      return '<div class="pty">' + (c ? U.avatar(c, 40) : '<span class="av avi" style="width:40px;height:40px;font-size:17px">' + esc(String(p.name || '?').charAt(0).toUpperCase()) + '</span>') + '<div style="min-width:0"><div class="t-h3 ell">' + esc(String(p.name || 'Player').replace(/^Sample:\s*/, '')) + '</div><div class="t-meta ell">' + esc(c ? U.classLine(c) : 'Player') + '</div>' + (max ? U.hpbar(cur, max) : '') + '</div>' +
        '<b>' + (max ? cur + '<small class="faded">/' + max + '</small>' : '–') + '</b><b>' + esc(ac) + '</b><b>' + esc(pp) + '</b></div>';
    }).join('');
    return rows || '<div class="t-meta" style="padding:12px 4px">No players yet. Add them in the game, or share the live link.</div>';
  }
  function projCard() {
    var dp = {}; try { dp = hearthDicePrefs(); } catch (e) {}
    var on = dp.projector && dp.projector !== 'off';
    return '<div class="card raised pad-l"><div class="hstack gap3"><span class="emblem" style="width:52px;height:52px">' + ic('tv') + '</span><div><div class="t-h3">Projector</div><div class="t-meta">Players’ view on a TV or second screen</div></div></div>' +
      '<div class="list card sunk" style="margin:16px 0"><div class="row"><span class="grow t-body" style="font-size:13.5px">Map, initiative and turn banner</span>' + tag('Shown', 'moss') + '</div><div class="row"><span class="grow t-body" style="font-size:13.5px">Monsters</span>' + tag('Bloodied only') + '</div>' +
      '<button type="button" class="row rowbtn" data-u-act="dice-proj" role="switch" aria-checked="' + !!on + '"><div class="grow"><div class="t-body" style="font-size:13.5px">Dice rolls on projector</div><div class="t-meta">' + (on ? 'On: each roll gets a “Show on big screen” button' : 'Off: only when you choose to show one') + '</div></div><span class="toggle' + (on ? ' on' : '') + '"></span></button></div>' +
      btn('Open projector', 'block', 'tv', 'data-u-act="dm-projector"') + '</div>';
  }
  function linkCard(g) {
    var L = U.liveInfo(g), url = ''; try { if (L.code) url = linkJoinUrl(L.code).replace(/^https?:\/\//, ''); } catch (e) {}
    return '<div class="card pad-l"><div class="hstack gap3"><span class="lead">' + ic('link') + '</span><div class="f1" style="min-width:0"><div class="t-h3">Live game link</div><div class="t-meta ell">' + (url ? esc(url) : 'Start a live game to share a link') + '</div></div>' + (url ? btn('Copy', 'sm', null, 'data-u-act="copylink"') : btn('Start', 'sm', null, 'data-u-act="livelink" data-id="' + esc(g.id) + '"')) + '</div></div>';
  }
  function monCard() {
    var n = 0; try { n = (typeof SRD_MONSTERS !== 'undefined' ? SRD_MONSTERS.length : (typeof MONSTERS !== 'undefined' ? MONSTERS.length : 0)); } catch (e) {}
    var pick = ['owlbear', 'troll', 'mimic', 'wraith', 'gnoll', 'kobold', 'zombie'].filter(function (k) { return lib().indexOf(k) >= 0; });
    return '<div class="card pad-l"><div class="t-label" style="margin-bottom:12px">Monster library</div><div class="toks" style="margin-bottom:12px">' + pick.map(function (k) { return '<img src="' + esc(libPath(k)) + '" alt="" style="width:40px;height:40px">'; }).join('') + '</div><div class="t-meta">SRD monsters' + (n ? ' (' + n + ')' : '') + ' plus ' + lib().length + ' painted Hearth tokens. Quick-add with stats, or build your own.</div>' + btn('Browse monsters', 'quiet block', 'skull', 'data-u-act="monsters" style="margin-top:14px"') + '</div>';
  }
  function notesCard(g) {
    var notes = (g.notes || []).slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated || 0) - (a.updated || 0); }).slice(0, 2);
    var body = notes.length ? notes.map(function (n) { return (n.title ? '<b>' + esc(n.title) + '</b><br>' : '') + esc(String(n.body || '').slice(0, 220)); }).join('<br><br>') : 'Nothing written yet. Keep NPCs, plot threads and what happened last session here.';
    return '<div class="card parch pad-l stack notes"><div class="hstack"><span class="t-label">Session notes</span><button type="button" class="ibtn plain mla" data-u-act="notes" aria-label="Edit session notes" style="color:var(--parch-ink);margin-left:auto">' + ic('pencil', 'sm') + '</button></div><div class="nbody">' + body + '</div><div class="t-meta" style="margin-top:auto">Only you can see these</div></div>';
  }
  function dmDesk() {
    var gc = U.games(), g = gc.games.find(function (x) { return x.id === gc.activeGameId; }) || gc.games[0];
    if (!g) return '<div class="empty">' + btn('New game', 'primary', 'plus', 'data-home-act="new-game"') + '</div>';
    var others = gc.games.filter(function (x) { return x.id !== g.id; });
    var encs = allEncs(gc).sort(function (a, b) { return (a.g.id === g.id ? 0 : 1) - (b.g.id === g.id ? 0 : 1); });
    var more = others.length > 1 ? '<div class="card pad gmore"><div class="t-label">More games</div>' + others.slice(1).map(function (o) { return '<div class="row"><div class="grow"><div class="t-h3 ell">' + esc(o.name) + '</div><div class="t-meta">' + plural((o.players || []).length, 'player') + '</div></div>' + btn('Open', 'sm', null, 'data-home-opengame="' + esc(o.id) + '"') + '</div>'; }).join('') + '</div>' : '';
    return '<div class="g fill dmg"><div class="stack gap4" style="min-height:0"><div class="g gtop">' + gameCard(g, gc, true) + (others[0] ? gameCard(others[0], gc, false) : '<button type="button" class="card cc-new" data-home-act="new-game"><span class="emblem">' + ic('plus') + '</span><div class="t-h2">New game</div><div class="t-meta">Start another campaign</div></button>') + '</div>' + more +
      '<div class="g gbot"><div class="card stack encs"><div style="padding:0 18px">' + sec('Encounters · ' + encs.length, 'New encounter', 'data-u-act="new-enc" data-g="' + esc(g.id) + '"') + '</div><div class="list' + (encs.length > 6 ? ' scroll' : '') + '">' + encs.map(encRow).join('') + '</div></div>' +
      '<div class="card stack party"><div class="sec-h"><span class="t-label">Party · ' + esc(g.name) + '</span></div><div class="pty t-label phead"><span></span><span></span><span>HP</span><span>AC</span><span>PP</span></div><div class="list">' + partyRows(g) + '</div><div class="t-meta" style="margin-top:auto;padding-top:12px">PP = passive Perception. Updates live as players change their sheets.</div></div></div></div>' +
      '<div class="stack gap4">' + projCard() + linkCard(g) + monCard() + notesCard(g) + '</div></div>' + U.homeModals();
  }
  function dmPhone() {
    var gc = U.games(), g = gc.games.find(function (x) { return x.id === gc.activeGameId; }) || gc.games[0];
    if (!g) return btn('New game', 'primary lg block', 'plus', 'data-home-act="new-game"');
    var L = U.liveInfo(g), e = activeEnc(g), encs = allEncs(gc).sort(function (a, b) { return (a.g.id === g.id ? 0 : 1) - (b.g.id === g.id ? 0 : 1); });
    var top = '<div class="card raised pgm"><span class="gimg" style="' + mapStyle(e) + '"></span><div class="stack gap2" style="padding:14px 16px 16px"><div class="hstack gap2">' + (L.live ? '<span class="dot"></span><span class="t-label" style="color:var(--moss)">Live now</span>' : tag('Current', 'gold')) + '<span class="mla">' + playerToks(g, 28) + '</span></div><div class="t-h2 ell">' + esc(g.name) + '</div>' +
      '<div class="hstack gap2" style="margin-top:4px">' + btn('Run game', 'primary lg', 'crown', 'data-home-opengame="' + esc(g.id) + '" style="flex:1"') + '<button type="button" class="btn lg sq48" data-u-act="dm-projector" aria-label="Projector">' + ic('tv') + '</button><button type="button" class="btn lg sq48" data-u-act="livelink" data-id="' + esc(g.id) + '" aria-label="Live game link">' + ic('link') + '</button></div></div></div>';
    var others = gc.games.filter(function (x) { return x.id !== g.id; }).map(function (o) { var oe = activeEnc(o); return '<div class="card pad hstack gap3"><span class="pthumb" style="' + mapStyle(oe) + '"></span><div class="f1" style="min-width:0"><div class="t-h3 ell">' + esc(o.name) + '</div><div class="t-meta">Paused · ' + plural((o.players || []).length, 'player') + '</div></div>' + btn('Resume', 'sm', null, 'data-home-opengame="' + esc(o.id) + '"') + '</div>'; }).join('');
    var list = '<div class="card sunk list">' + encs.map(function (x) { var ms = x.e.monsters || []; return '<div class="row prow"><div class="grow" style="min-width:0"><div class="t-h3 ell">' + esc(x.e.name || 'Encounter') + '</div><div class="hstack gap2" style="margin-top:4px">' + (ms.length ? toks(ms, 24, 4) : '<span class="t-meta">' + esc(x.g.name) + '</span>') + diffTag(diff(x.g, x.e)) + '</div></div>' + btn('Run', '', null, 'data-u-act="run-enc" data-g="' + esc(x.g.id) + '" data-e="' + esc(x.e.id) + '"') + '</div>'; }).join('') + '</div>';
    return '<div class="stack gap4">' + top + others + sec('Encounters · ' + encs.length, 'New', 'data-u-act="new-enc" data-g="' + esc(g.id) + '"') + list + projCard() + notesCard(g) + '</div>' + U.homeModals();
  }
  U.screens.dm = {
    owns: true, nav: 'character',
    html: function () { return U.isDesk() ? dmDesk() : dmPhone(); },
    meta: function () {
      var gc = U.games(), ne = allEncs(gc).length;
      return { title: 'Dungeon Master', meta: plural(gc.games.length, 'game') + ' · ' + plural(ne, 'encounter') + ' ready',
        actions: btn('Create one-shot', '', 'sparkle', 'data-home-act="oneshot"') + btn('New game', 'primary', 'plus', 'data-home-act="new-game"'),
        back: 'home', pright: ibtn('sparkle', 'data-home-act="oneshot"', true, 'Create one-shot') + ibtn('plus', 'data-home-act="new-game"', true, 'New game') };
    },
    css: [
      '.dmg{grid-template-columns:minmax(0,1fr) 400px;align-items:stretch;min-height:calc(100vh - 88px - 64px)}',
      '.gtop{grid-template-columns:1.5fr 1fr}.gbot{grid-template-columns:minmax(0,1fr) 400px;flex:1;min-height:0}',
      '.gm{display:grid;grid-template-columns:300px minmax(0,1fr);overflow:hidden;padding:0;min-height:300px}.gm2{grid-template-columns:200px minmax(0,1fr)}',
      '.gimg{display:block;background-color:var(--page-deep);background-size:600% 600%;border-right:1px solid var(--rim);min-height:100%}',
      '.gm .bd{padding:22px;display:flex;flex-direction:column;gap:10px;min-width:0}',
      '.gdel{width:36px;height:36px;color:var(--ink-faded)}',
      '.nextup{padding:12px 14px;margin-top:6px}',
      '.ell2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.toks{display:flex;align-items:center}.toks img,.toks .tokf{width:34px;height:34px;border-radius:50%;border:2px solid var(--card-surface);margin-left:-8px;object-fit:cover;background:var(--page-deep);flex:none}.toks>:first-child{margin-left:0}',
      '.tokf{display:inline-flex;align-items:center;justify-content:center;color:var(--ink-faded)}.tokf svg{width:60%;height:60%;fill:currentColor}.tokf.ini{font:700 13px var(--serif);color:var(--gold)}.tokmore{font:600 12px var(--sans);color:var(--ink-faded);margin-left:6px}',
      '.encs{padding:20px 8px 8px;min-height:0}.encs .list{overflow:auto;max-height:520px}',
      '.enc{display:grid;grid-template-columns:minmax(0,1fr) 150px 80px auto;gap:16px;align-items:center;padding:16px 18px;min-height:56px}.enc+.enc{border-top:1px solid var(--hair)}.enc .tag{justify-self:start}',
      '.party{padding:20px}',
      '.pty{display:grid;grid-template-columns:40px minmax(0,1fr) 54px 44px 44px;gap:12px;align-items:center;padding:13px 4px}.pty+.pty{border-top:1px solid var(--hair)}.pty b{font:700 16px var(--serif);text-align:center}.pty b small{font:500 11px var(--sans)}',
      '.phead{padding-top:0;padding-bottom:4px}.phead span{text-align:center}',
      '.rowbtn{width:100%;background:none;border:0;color:var(--ink);font:inherit;text-align:left;cursor:pointer}',
      '.notes{flex:1;min-height:200px}.nbody{font:14px/1.6 var(--serif);margin:10px 0 14px;color:var(--parch-ink)}',
      '.cc-new{border-style:dashed;background:transparent;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--ink);font:inherit;cursor:pointer}',
      '.gmore{display:flex;flex-direction:column;gap:4px}',
      '.btn.sq48{width:52px;padding:0;flex:none}',
      '.pgm{padding:0;overflow:hidden}.pgm .gimg{height:116px;border-right:0;border-bottom:1px solid var(--rim);min-height:0}',
      '.pthumb{width:56px;height:56px;border-radius:10px;background-color:var(--page-deep);background-size:600% 600%;flex:none;border:1px solid var(--rim)}',
      '.prow{padding:10px 14px}',
      '.u-phone .sec-h+.list{margin-top:-6px}'
    ].join('\n')
  };
  var A = U.actions;
  A['run-enc'] = function (t) { try { dmSwitchGame(t.dataset.g); dmSwitchEncounter(t.dataset.e); } catch (e) {} state.ui.homePanel = null; state.ui.homeMenu = null; setActiveTab('dm'); render(); };
  A['new-enc'] = function (t) { try { dmSwitchGame(t.dataset.g); dmCreateEncounter(); } catch (e) {} state.ui.homeMenu = null; setActiveTab('dm'); render(); };
  A.monsters = function () { state.ui.homeMenu = null; setActiveTab('dm'); state.ui.dmEnemyPicker = true; render(); };
  A.notes = function () { state.ui.homeMenu = null; setActiveTab('dm'); state.ui.dmNotesOpen = true; render(); };
  A['dice-proj'] = function () { try { var on = hearthDicePrefs().projector !== 'off'; hearthDiceSetPref('diceProjector', on ? 'off' : 'ask'); } catch (e) {} render(); };
  A.copylink = function () { try { var u = linkJoinUrl(HearthLink.host.code); navigator.clipboard.writeText(u); showToast('Live game link copied'); } catch (e) {} };
  // Projector: open the game's map and use its own Project button (setup help first time, then the window)
  A['dm-projector'] = function (t) {
    try { if (t && t.dataset.id) dmSwitchGame(t.dataset.id); } catch (e) {}
    state.ui.homeMenu = null; setActiveTab('dm'); state.ui.dmMapMode = true; render();
    var b = document.getElementById('dmMapProject'); if (b) b.click();
  };
})();
