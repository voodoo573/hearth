// Hearth UI polish — Settings (two panes on desktop, grouped rows on phone) and the theme picker pop-up
// (SPEC §8). Look-and-feel buttons keep the app's data-look-pref / data-text-size / data-dice-pref hooks, so
// the app's own handlers save them. The picker previews on <html> through hearthApplyLook and only saves
// on Apply, exactly as wireHearthLookSettings does (prefs.palette + prefs.theme).
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, tag = U.tag, sec = U.sec, esc = U.esc;
  // ---------- theme registry + grouping ----------
  var RACE_IDS = ['scales', 'hollow']; // the app files these under "classes"; Thomas's grouping gives races their own group
  var CLASSIC_SW = { light: ['#e3cf9f', '#e8d6a8', '#2a1a0c', '#a87c38', '#3e382f', '#7a1e1a'], dark: ['#221912', '#2e2218', '#f3e3c0', '#d4a04b', '#3e382f', '#e57866'] };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function reg() {
    var P = window.HEARTH_PALETTES || {}, R = {};
    Object.keys(P).forEach(function (k) {
      var v = P[k], f = String(v.from || '').replace('custom · for Scott', 'For Scott').replace(' / Underdark', '');
      if (!f) f = (v.group === 'places' ? 'Place' : v.group === 'signature' ? 'Signature' : 'Classic') + ' · ' + String(v.texture || 'none').replace('none', 'smooth');
      R[k] = { id: k, name: String(v.name || k).replace(/\s*\(signature\)$/i, ''), tone: v.tone === 'light' ? 'light' : 'dark', texture: v.texture || 'none', frm: cap(f), blurb: v.blurb || '', sw: v.sw || CLASSIC_SW.dark, group: v.group };
    });
    if (R.hearth) R.hearth.frm = 'Signature · leather & brass';
    R.light = { id: 'light', name: 'Light', tone: 'light', texture: 'parchment', frm: 'Classic · parchment', blurb: 'Parchment paper, warm gold ink. The original leather-bound look.', sw: CLASSIC_SW.light, classic: true };
    R.dark = { id: 'dark', name: 'Dark', tone: 'dark', texture: 'leather', frm: 'Classic · candle-light', blurb: 'Deep leather, candle-light gold. The original night look.', sw: CLASSIC_SW.dark, classic: true };
    return R;
  }
  function groups(R) {
    var G = [['hearth', 'Hearth & classic', 'Hearth', 'flame', []], ['places', 'Places', 'Places', 'map', []], ['classes', 'Classes', 'Classes', 'sword', []], ['races', 'Races', 'Races', 'users', []], ['scott', 'Scott’s themes', 'Scott’s', 'star', []]];
    var by = {}; G.forEach(function (g) { by[g[0]] = g[4]; });
    if (R.hearth) by.hearth.push('hearth'); by.hearth.push('light', 'dark');
    Object.keys(R).forEach(function (k) {
      var t = R[k]; if (k === 'hearth' || t.classic) return;
      var g = RACE_IDS.indexOf(k) >= 0 || t.group === 'races' ? 'races' : t.group === 'places' ? 'places' : t.group === 'classes' ? 'classes' : t.group === 'friends' ? 'scott' : 'hearth';
      by[g].push(k);
    });
    return G.filter(function (g) { return g[4].length; });
  }
  function keyOf(prefs) { var P = window.HEARTH_PALETTES || {}; return prefs && prefs.palette && P[prefs.palette] ? prefs.palette : (prefs && prefs.theme === 'dark' ? 'dark' : 'light'); }
  function prefs() { if (!state.prefs) state.prefs = loadPrefs(); return state.prefs; }
  function lookFor(k, base) { var P = window.HEARTH_PALETTES || {}, o = Object.assign({}, base); if (P[k]) { o.palette = k; o.theme = P[k].tone; } else { o.palette = ''; o.theme = k === 'dark' ? 'dark' : 'light'; } return o; }
  function recents() { try { return JSON.parse(localStorage.getItem('hearth.ui.recentThemes') || '[]').filter(function (x) { return typeof x === 'string'; }); } catch (e) { return []; } }
  function pushRecent(k) { var r = recents().filter(function (x) { return x !== k; }); r.unshift(k); try { localStorage.setItem('hearth.ui.recentThemes', JSON.stringify(r.slice(0, 6))); } catch (e) {} }
  function mini(t, big) { var v = t.sw.map(function (c, i) { return '--c' + i + ':' + c; }).join(';'); return '<span class="mp tx-' + esc(t.texture) + (big ? ' big' : '') + '" style="' + esc(v) + '" aria-hidden="true"><span class="tb"><i></i><s></s></span><span class="cd"><u></u><u></u><span class="dg"></span><span class="bt"></span><span class="hp"></span></span></span>'; }
  function swatch(t, cls) { var s = t.sw; return '<span class="' + (cls || 'sw') + '" style="background:linear-gradient(135deg,' + s[4] + ' 0 34%,' + s[0] + ' 34% 66%,' + s[3] + ' 66%)" aria-hidden="true"></span>'; }
  U.themes = { reg: reg, groups: groups, keyOf: keyOf, RACE_IDS: RACE_IDS };

  // ---------- theme picker ----------
  var TP = null;
  function openThemes(opener) {
    var R = reg(), G = groups(R), orig = Object.assign({}, prefs()), cur = keyOf(orig), sel = cur, desk = U.isDesk();
    var flat = []; G.forEach(function (g) { flat = flat.concat(g[4]); });
    function gOf(k) { for (var i = 0; i < G.length; i++) if (G[i][4].indexOf(k) >= 0) return G[i][0]; return G[0][0]; }
    function card(k) {
      var t = R[k], on = k === sel;
      var right = (k === cur && cur !== sel) ? tag('Current') : (desk ? '<span class="tone">' + ic(t.tone === 'light' ? 'sun' : 'moon', 'sm') + '</span>' : '');
      return '<button type="button" class="tc2' + (on ? ' sel' : '') + '" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-tk="' + esc(k) + '" aria-label="' + esc(t.name + ', ' + t.frm) + '">' + (on ? '<span class="ck">' + ic('check') + '</span>' : '') + mini(t) + '<span class="meta"><span class="f1" style="min-width:0"><span class="t-h3">' + esc(t.name) + '</span><span class="t-meta">' + esc(t.frm) + '</span></span>' + right + '</span></button>';
    }
    function gridHTML() { return G.map(function (g) { return '<div class="gh" id="u-tg-' + g[0] + '"><span class="t-label">' + esc(g[1]) + '</span><span class="t-meta">' + g[4].length + '</span></div><div class="cards" role="presentation">' + g[4].map(card).join('') + '</div>'; }).join(''); }
    function footHTML() {
      var t = R[sel], same = sel === cur;
      var txt = same ? '<div class="f1" style="min-width:0"><div class="t-h3">' + esc(t.name) + ' <span class="t-meta" style="font-family:var(--sans)">· your current theme</span></div><div class="t-meta ell">' + esc(t.blurb) + '</div></div>'
        : '<div class="f1" style="min-width:0"><div class="t-h3">Previewing ' + esc(t.name) + '</div><div class="t-meta ell">' + (desk ? esc(t.blurb) + ' ' : '') + 'Cancel goes back to ' + esc(R[cur].name) + '.</div></div>';
      var b = btn('Cancel', 'quiet' + (desk ? '' : ' lg'), null, 'data-u-close="cancel"') + btn(same ? 'Apply' : 'Apply theme', 'primary' + (desk ? '' : ' lg'), 'check', 'data-tp-apply');
      return desk ? swatch(t) + txt + '<div class="hstack gap2">' + b + '</div>' : '<div class="hstack gap3">' + swatch(t) + txt + '</div><div class="g fb">' + b + '</div>';
    }
    function html() {
      var gsel = gOf(sel);
      if (desk) {
        var rail = G.map(function (g) { return '<button type="button" class="ra' + (g[0] === gsel ? ' on' : '') + '" data-tp-jump="' + g[0] + '">' + ic(g[3]) + '<span>' + esc(g[1]) + '</span><b>' + g[4].length + '</b></button>'; }).join('');
        return '<div class="hd"><span class="lead" style="width:44px;height:44px">' + ic('palette', 'lg') + '</span><div class="f1"><div class="t-h1" id="u-tp-title">Choose a theme</div><div class="t-body" style="margin-top:4px">' + flat.length + ' themes. Tap one to try it; nothing is saved until you apply.</div></div><span class="live"><span class="dot"></span><span data-tp-live>' + (sel === cur ? 'Live preview · the app behind updates as you tap' : 'Previewing on the app behind') + '</span></span>' + ibtn('x', 'data-u-close="close"', false, 'Close') + '</div>' +
          '<div class="bodyw"><div class="rail">' + rail + '<div class="t-meta" style="margin-top:auto;padding:10px 12px">Texture, font, card style and motion stay as you set them in Appearance.</div></div><div class="grid scroll" data-u-scroll role="radiogroup" aria-labelledby="u-tp-title">' + gridHTML() + '</div></div><div class="ft" data-tp-foot>' + footHTML() + '</div>';
      }
      var chips = G.map(function (g) { return '<button type="button" class="chip' + (g[0] === gsel ? ' on' : '') + '" data-tp-jump="' + g[0] + '">' + esc(g[2]) + '</button>'; }).join('');
      return '<div class="hd"><div class="f1"><div class="t-h1" id="u-tp-title" style="font-size:22px">Theme</div><div class="t-meta" style="margin-top:2px">Tap to preview. Nothing is saved until you apply.</div></div>' + ibtn('x', 'data-u-close="close"', false, 'Close') + '</div>' +
        '<div class="chips tpchips">' + chips + '</div><div class="grid scroll" data-u-scroll role="radiogroup" aria-labelledby="u-tp-title">' + gridHTML() + '</div><div class="ft" data-tp-foot>' + footHTML() + '</div>';
    }
    function sync() {
      var p = TP.panel;
      p.querySelectorAll('[data-tk]').forEach(function (b) { var k = b.getAttribute('data-tk'); b.outerHTML = U.px(card(k)); });
      p.querySelector('[data-tp-foot]').innerHTML = U.px(footHTML());
      var gsel = gOf(sel); p.querySelectorAll('[data-tp-jump]').forEach(function (b) { b.classList.toggle('u-on', b.getAttribute('data-tp-jump') === gsel); });
      var lv = p.querySelector('[data-tp-live]'); if (lv) lv.textContent = sel === cur ? 'Live preview · the app behind updates as you tap' : 'Previewing on the app behind';
    }
    function preview(k, focus) {
      if (!R[k]) return; sel = k; window.hearthApplyLook(lookFor(k, orig)); sync();
      var b = TP.panel.querySelector('[data-tk="' + k + '"]'); if (b) { if (focus) b.focus(); try { b.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    }
    var applied = false;
    function apply() {
      applied = true;
      var p = prefs(), P = window.HEARTH_PALETTES || {};
      if (P[sel]) { p.palette = sel; p.theme = P[sel].tone; } else { p.palette = ''; p.theme = sel === 'dark' ? 'dark' : 'light'; }
      savePrefs(p); applyPrefsToBody(); try { hearthLookChanged(); } catch (e) {}
      if (sel !== cur) pushRecent(cur);
      TP.close('apply'); render();
      try { showToast(R[sel].name + ' theme applied'); } catch (e) {}
    }
    TP = U.modal({ id: 'themes', cls: 'tp' + (desk ? '' : ' tpp'), light: true, label: 'Choose a theme', html: html, returnFocus: '[data-u-act="themes"]', focus: '[data-tk][tabindex="0"]',
      onClose: function (why) { if (!applied) window.hearthApplyLook(orig); TP = null; },
      onKey: function (e) {
        var a = document.activeElement, onCard = a && a.hasAttribute && a.hasAttribute('data-tk');
        if (!onCard) return;
        var i = flat.indexOf(a.getAttribute('data-tk')), cols = desk ? 4 : 2, j = null;
        // move within the group's grid row by row (groups start new rows)
        var g = G.find(function (x) { return x[4].indexOf(flat[i]) >= 0; }), gi = g[4].indexOf(flat[i]);
        if (e.key === 'ArrowRight') j = Math.min(flat.length - 1, i + 1);
        else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
        else if (e.key === 'ArrowDown') { if (gi + cols < g[4].length) j = i + cols; else { var ng = G[G.indexOf(g) + 1]; j = ng ? flat.indexOf(ng[4][Math.min(gi % cols, ng[4].length - 1)]) : i; } }
        else if (e.key === 'ArrowUp') { if (gi - cols >= 0) j = i - cols; else { var pg = G[G.indexOf(g) - 1]; if (pg) { var col = gi % cols, last = pg[4].length - 1, rowStart = last - (last % cols); j = flat.indexOf(pg[4][Math.min(rowStart + col, last)]); } else j = i; } }
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = flat.length - 1;
        else if (e.key === 'Enter') { e.preventDefault(); apply(); return; }
        else if (e.key === ' ') { e.preventDefault(); preview(flat[i], true); return; }
        if (j != null) { e.preventDefault(); preview(flat[j], true); }
      } });
    var P2 = TP.panel;
    P2.addEventListener('click', function (e) {
      var c = e.target.closest('[data-tk]'); if (c) { preview(c.getAttribute('data-tk'), false); c.focus(); return; }
      var jmp = e.target.closest('[data-tp-jump]'); if (jmp) { var h = P2.querySelector('#u-tg-' + jmp.getAttribute('data-tp-jump')), gr = P2.querySelector('[data-u-scroll]'); if (h && gr) gr.scrollTo({ top: h.offsetTop - gr.offsetTop - 14, behavior: 'smooth' }); P2.querySelectorAll('[data-tp-jump]').forEach(function (b) { b.classList.toggle('u-on', b === jmp); }); return; }
      if (e.target.closest('[data-tp-apply]')) { apply(); }
    });
    var gr = P2.querySelector('[data-u-scroll]');
    if (gr) gr.addEventListener('scroll', function () { gr.classList.toggle('u-fadetop', gr.scrollTop > 4); });
    var first = P2.querySelector('[data-tk="' + sel + '"]'); if (first) try { first.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    return TP;
  }
  U.openThemes = openThemes;

  // ---------- Settings ----------
  var SECS = [['look', 'palette', 'Appearance'], ['text', 'type', 'Text & reading'], ['dice', 'd20', 'Dice'], ['account', 'cloud', 'Account & sync'], ['data', 'download', 'Data & backups'], ['homebrew', 'anvil', 'Homebrew'], ['ai', 'chip', 'AI Core'], ['about', 'info', 'About & legal']];
  function secKey() { var k = state.ui.uSetSec; return SECS.some(function (s) { return s[0] === k; }) ? k : 'look'; }
  function look() { try { return HEARTH_LOOK_OPTIONS; } catch (e) { return []; } }
  var SHORT = { texture: 'Drawn in CSS, works offline', font: 'Clean uses your device’s sans-serif', cards: 'Flat drops shadows, lighter on old phones', motion: 'Reduce turns off animations and moving water and fire' };
  function segRow(title, help, buttons) { return '<div class="opt"><div><div class="t-h3">' + title + '</div><div class="t-meta">' + help + '</div></div><div class="seg wrapseg" role="group" aria-label="' + esc(title) + '">' + buttons + '</div></div>'; }
  function lookSeg(o) { var p = prefs(); return segRow(esc(o.label), esc(SHORT[o.key] || o.help), o.opts.map(function (x) { var on = (p[o.key] || '') === x[0]; return '<button type="button" class="' + (on ? 'on !selected' : '') + '" data-look-pref="' + o.key + '" data-look-val="' + esc(x[0]) + '" aria-pressed="' + on + '">' + esc(x[1]) + '</button>'; }).join('')); }
  var SIZES = [['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']];
  function textSeg() { var p = prefs(); return segRow('Text size', 'Spells, features, notes and the roll log', SIZES.map(function (s) { var on = (p.textSize || 'm') === s[0]; return '<button type="button" class="' + (on ? 'on !selected' : '') + '" data-text-size="' + s[0] + '" aria-pressed="' + on + '">' + s[1] + '</button>'; }).join('')); }
  function themeRow() {
    var R = reg(), k = keyOf(prefs()), t = R[k] || R.hearth || R.dark;
    var rec = recents().filter(function (x) { return x !== k && R[x]; }).slice(0, 2);
    if (rec.length < 2) ['hearth', 'arcane', 'scott-ultramarine', 'dark'].forEach(function (x) { if (rec.length < 2 && x !== k && R[x] && rec.indexOf(x) < 0) rec.push(x); });
    var rs = rec.map(function (x) { return swatch(R[x], 'rsw') + '<span class="t-meta" style="color:var(--ink-soft);margin-right:8px">' + esc(R[x].name) + '</span>'; }).join('');
    return '<div class="thr"><div class="mpw">' + mini(t, true) + '</div><div class="f1" style="min-width:0"><div class="t-label">Theme</div><div class="t-h2" style="margin-top:6px">' + esc(t.name) + '</div><div class="t-meta" style="margin-top:2px">' + esc(t.frm) + '</div><div class="t-body" style="margin-top:8px">' + esc(t.blurb) + '</div><div class="hstack gap2" style="margin-top:12px;flex-wrap:wrap"><span class="t-meta">' + (recents().length ? 'Recent' : 'Try') + '</span>' + rs + '</div></div>' + btn('Change', 'primary lg', 'palette', 'data-u-act="themes" aria-haspopup="dialog"') + '</div>';
  }
  function diceSets() { try { return HEARTH_DICE_SETS; } catch (e) { return []; } }
  function dp() { try { return hearthDicePrefs(); } catch (e) { return {}; } }
  function diceBtn(key, val, label, on) { return '<button type="button" class="' + (on ? 'on !selected' : '') + '" data-dice-pref="' + key + '" data-dice-val="' + esc(val) + '" aria-pressed="' + !!on + '">' + esc(label) + '</button>'; }
  function section(k) {
    var p = prefs(), d = dp();
    if (k === 'look') return '<div class="t-h1">Appearance</div><div class="t-body" style="margin-top:4px">Themes recolour the whole app. Every accent, including the DM screen, follows your choice.</div>' + themeRow() + sec('Look & feel') + textSeg() + look().map(lookSeg).join('');
    if (k === 'text') return '<div class="t-h1">Text &amp; reading</div><div class="t-body" style="margin-top:4px">Scales reading-heavy surfaces: features, items, spells, notes, the roll log and class tables.</div>' + '<div style="height:12px"></div>' + textSeg() +
      segRow('Older screens', 'Width of the screens that still use the classic layout (the encounter tracker)', [['auto', 'Auto'], ['on', 'Wide'], ['off', 'Narrow']].map(function (x) { var on = (p.wideScreen || 'auto') === x[0]; return '<button type="button" class="' + (on ? 'on !selected' : '') + '" data-wide-pref="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + '</button>'; }).join('')) +
      '<div class="card parch pad" style="margin-top:16px"><div class="t-label">Live preview</div><div style="margin-top:6px;font:15px/1.6 var(--serif)" class="!feature-desc">This is the sort of text you’ll see on feature cards, magic items and spells. Pick a size above and this paragraph changes with it.</div></div>';
    if (k === 'dice') return '<div class="t-h1">Dice</div><div class="t-body" style="margin-top:4px">Rolls tumble as 3D dice that land on the real result. Tap to skip. With reduced motion the dice appear already settled.</div><div style="height:12px"></div>' +
      segRow('Animation', 'Numbers only skips the 3D roll', diceBtn('diceAnim', 'on', 'Animated', d.anim === 'on') + diceBtn('diceAnim', 'off', 'Numbers only', d.anim === 'off')) +
      segRow('Size', 'Corner keeps big rolls full screen', diceBtn('diceSize', 'full', 'Full screen', d.size === 'full') + diceBtn('diceSize', 'compact', 'Corner', d.size === 'compact')) +
      '<div class="opt"><div><div class="t-h3">Dice colours</div><div class="t-meta">Match the theme, or pick a set</div></div><div class="chips" style="flex-wrap:wrap">' + '<button type="button" class="chip' + (d.colour === 'auto' ? ' on !selected' : '') + '" data-dice-pref="diceColour" data-dice-val="auto" aria-pressed="' + (d.colour === 'auto') + '">Match theme</button>' + diceSets().map(function (s) { return '<button type="button" class="chip' + (d.colour === s.id ? ' on !selected' : '') + '" data-dice-pref="diceColour" data-dice-val="' + esc(s.id) + '" aria-pressed="' + (d.colour === s.id) + '">' + esc(s.name || s.id) + '</button>'; }).join('') + '</div></div>' +
      segRow('Dice on projector', 'Opt-in. Your DM decides if a roll is shown; nothing goes there automatically.', diceBtn('diceProjector', 'off', 'Off', d.projector === 'off') + diceBtn('diceProjector', 'ask', 'Ask each time', d.projector !== 'off')) +
      '<div class="hstack gap2" style="margin-top:20px">' + btn('Try a roll', '', 'd20', 'data-dice-test="1"') + btn('Open roll log', 'quiet', 'list', 'data-roll-log-open="1"') + '</div>';
    if (k === 'account') { var g = (typeof HearthGoogle !== 'undefined' && HearthGoogle.user) || null; return '<div class="t-h1">Account &amp; sync</div><div class="t-body" style="margin-top:4px">Optional. Sign in with Google to keep characters and games on every device.</div><div class="card sunk pad hstack gap3" style="margin-top:20px"><span class="lead" style="color:' + (g ? 'var(--moss)' : 'var(--gold)') + '">' + ic(g ? 'cloud' : 'cloudoff') + '</span><div class="f1"><div class="t-h3">' + (g ? 'Synced with Google' : 'Not signed in') + '</div><div class="t-meta">' + esc(g ? (g.email || g.name || 'Signed in') : 'Everything stays on this device until you sign in.') + '</div></div>' + btn(g ? 'Manage' : 'Sign in with Google', g ? '' : 'primary', null, 'data-home-act="account"') + '</div>'; }
    if (k === 'data') { var lb = 0; try { lb = Number(localStorage.getItem('hearth.ui.lastBackupAt') || 0); } catch (e) {} var sc = { chars: 0, games: 0 }; try { sc = hearthSampleCounts(); } catch (e) {}
      return '<div class="t-h1">Data &amp; backups</div><div class="t-body" style="margin-top:4px">Hearth saves on this device. Export files to move or back up characters, games and encounters.</div><div class="hstack gap2" style="margin-top:20px">' + btn('Export or import', 'primary', 'upload', 'data-u-act="export"') + btn('Back up everything', '', 'download', 'data-transfer-all="1"') + '</div><div class="t-meta" style="margin-top:8px">' + (lb ? 'Last full backup ' + esc(U.rel(lb).toLowerCase()) : 'No full backup from this device yet') + '</div>' +
        sec('Snapshots') + '<div class="t-meta">Before each update Hearth keeps a snapshot of your characters, games and settings on this device (maps and videos aren’t included).</div>' + U.raw('<div class="hearth-snap-list" id="hearthSnapList"><div class="hearth-snap-empty">Loading snapshots…</div></div>') +
        ((sc.chars || sc.games) ? sec('Sample data') + '<div class="hstack gap3"><div class="f1 t-meta">You have the welcome tour’s sample ' + (sc.chars ? 'character' : '') + (sc.chars && sc.games ? ' and ' : '') + (sc.games ? 'game' : '') + '.</div>' + btn('Remove sample data', 'danger', 'trash', 'data-sample-remove="1"') + '</div>' : ''); }
    if (k === 'homebrew') { var hb = 0, ci = 0; try { hb = loadAiHomebrew().length; } catch (e) {} try { ci = Object.keys(loadCommunityInstalled()).length; } catch (e) {}
      return '<div class="t-h1">Homebrew</div><div class="t-body" style="margin-top:4px">Your own creations live in the Forge; community content comes from the Library.</div><div class="list card sunk" style="margin-top:20px"><button type="button" class="row rowbtn" data-u-go="forge"><span class="lead">' + ic('anvil') + '</span><div class="grow"><div class="t-h3">The Forge</div><div class="t-meta">' + hb + (hb === 1 ? ' homebrew entry' : ' homebrew entries') + '</div></div><span class="chev">' + ic('right', 'sm') + '</span></button><button type="button" class="row rowbtn" data-u-act="lib-content"><span class="lead">' + ic('users') + '</span><div class="grow"><div class="t-h3">Community content</div><div class="t-meta">' + ci + ' added from the Library</div></div><span class="chev">' + ic('right', 'sm') + '</span></button></div>'; }
    if (k === 'ai') return '<div class="t-h1">AI Core</div><div class="t-body" style="margin-top:4px">Diagnostics and an offline rules sense-check for your characters and saved data.</div><div style="margin-top:20px">' + btn('Open AI Core', 'primary', 'chip', 'data-home-panel="aicore"') + '</div>';
    var ver = esc(String(window.HEARTH_VERSION || '').replace(/^v/, '')), mail = ''; try { mail = CONTACT_EMAIL; } catch (e) {}
    return '<div class="t-h1">About &amp; legal</div><div class="t-body" style="margin-top:4px">Hearth v' + ver + ' · SRD 5.1 &amp; 5.2 (CC-BY-4.0). A companion app for fifth-edition (5e-compatible) tabletop games. Unofficial fan-made software, not affiliated with, endorsed or sponsored by Wizards of the Coast.</div>' +
      '<div class="hstack gap2" style="margin-top:20px;flex-wrap:wrap">' + btn('About & legal', 'primary', 'info', 'data-legal-open="1"') + btn('Report a bug', '', 'help', 'data-bug-report="1"') + btn('Replay the welcome tour', 'quiet', 'refresh', 'data-tour-replay="1"') + '</div>' + (mail ? '<div class="t-meta" style="margin-top:14px">Questions, feedback or account deletion: <a href="mailto:' + esc(mail) + '" style="color:var(--gold)">' + esc(mail) + '</a></div>' : '');
  }
  function settingsDesk() {
    var k = secKey();
    var sn = SECS.map(function (s) { return '<button type="button" class="sna' + (s[0] === k ? ' on' : '') + '" data-u-act="set-sec" data-v="' + s[0] + '"' + (s[0] === k ? ' aria-current="page"' : '') + '>' + ic(s[1]) + '<span>' + esc(s[2]) + '</span></button>'; }).join('');
    return '<div class="g fill setg"><div class="card pad stack gap1 sn">' + sn + '<div class="t-meta" style="margin-top:auto;padding:12px">Changes save automatically' + ((typeof HearthGoogle !== 'undefined' && HearthGoogle.user) ? ' and sync to your other devices.' : ' on this device.') + '</div></div><div class="card raised stack setpane">' + section(k) + '</div></div>' + U.homeModals();
  }
  function settingsPhone() {
    var k = state.ui.uSetSec; if (k && SECS.some(function (s) { return s[0] === k; })) return '<div class="card raised stack setpane">' + section(k) + '</div>' + U.homeModals();
    var R = reg(), t = R[keyOf(prefs())], p = prefs(), d = dp(), g = (typeof HearthGoogle !== 'undefined' && HearthGoogle.user) || null, ch = U.current();
    var size = (SIZES.find(function (s) { return s[0] === (p.textSize || 'm'); }) || SIZES[1])[1];
    var chev = function (v) { return (v ? '<span class="val">' + esc(v) + '</span>' : '') + '<span class="chev">' + ic('right', 'sm') + '</span>'; };
    var row = function (icn, name, meta, right, attr) { return '<' + (attr ? 'button type="button" ' + attr : 'div') + ' class="row' + (attr ? ' rowbtn' : '') + '"><span class="lead">' + ic(icn) + '</span><div class="grow"><div class="t-body rn">' + name + '</div>' + (meta ? '<div class="t-meta">' + meta + '</div>' : '') + '</div>' + right + '</' + (attr ? 'button' : 'div') + '>'; };
    var grp = function (rows) { return '<div class="card grp list">' + rows.join('') + '</div>'; };
    var lb = 0; try { lb = Number(localStorage.getItem('hearth.ui.lastBackupAt') || 0); } catch (e) {}
    var hb = 0; try { hb = loadAiHomebrew().length; } catch (e) {}
    var ver = esc(String(window.HEARTH_VERSION || '').replace(/^v/, ''));
    return '<div class="stack gap3 setph"><button type="button" class="card raised pad hstack gap3 acct" data-u-act="set-sec" data-v="account">' + (ch ? U.avatar(ch, 48) : '<span class="lead">' + ic('user') + '</span>') + '<div class="f1"><div class="t-h3">' + esc(g ? (g.name || 'Signed in') : 'Account & sync') + '</div><div class="hstack gap2 t-meta">' + (g ? '<span class="dot"></span>Synced with Google' : 'Not signed in · sign in to sync') + '</div></div><span class="chev">' + ic('right', 'sm') + '</span></button>' +
      '<div class="t-label gl">Appearance</div>' + grp([row('palette', 'Theme', esc(t.name), btn('Change', 'sm', null, 'data-u-act="themes" aria-haspopup="dialog"')), row('type', 'Text size', '', chev(size), 'data-u-act="set-sec" data-v="text"'), row('sparkle', 'Look &amp; feel', 'Texture, font, card style, motion', chev(p.motion === 'reduced' ? 'Reduced motion' : ''), 'data-u-act="set-sec" data-v="look"')]) +
      '<div class="t-label gl">Dice</div>' + grp([row('d20', 'Animated dice', '', '<span class="toggle' + (d.anim === 'on' ? ' on' : '') + '"></span>', 'data-dice-pref="diceAnim" data-dice-val="' + (d.anim === 'on' ? 'off' : 'on') + '" role="switch" aria-checked="' + (d.anim === 'on') + '"'), row('tv', 'Dice on projector', d.projector === 'off' ? 'Off · DM shows rolls by choice' : 'On · each roll gets a “Show” button', '<span class="toggle' + (d.projector !== 'off' ? ' on' : '') + '"></span>', 'data-dice-pref="diceProjector" data-dice-val="' + (d.projector !== 'off' ? 'off' : 'ask') + '" role="switch" aria-checked="' + (d.projector !== 'off') + '"'), row('list', 'More dice options', 'Size, colours, roll log', chev(''), 'data-u-act="set-sec" data-v="dice"')]) +
      '<div class="t-label gl">Data</div>' + grp([row('download', 'Back up &amp; export', lb ? 'Last backup ' + esc(U.rel(lb).toLowerCase()) : 'No backup from here yet', chev(''), 'data-u-act="set-sec" data-v="data"'), row('anvil', 'Homebrew', hb + (hb === 1 ? ' entry' : ' entries'), chev(''), 'data-u-act="set-sec" data-v="homebrew"'), row('chip', 'AI Core', 'Diagnostics &amp; rules check', chev(''), 'data-home-panel="aicore"')]) +
      '<div class="t-label gl">About</div>' + grp([row('info', 'About &amp; legal', 'Hearth v' + ver + ' · SRD 5.1 &amp; 5.2 (CC-BY-4.0)', chev(''), 'data-legal-open="1"'), row('help', 'Report a bug', '', chev(''), 'data-bug-report="1"'), row('refresh', 'Replay the welcome tour', '', chev(''), 'data-tour-replay="1"')]) + '</div>' + U.homeModals();
  }
  U.screens.settings = {
    owns: true, nav: 'character',
    html: function () { return U.isDesk() ? settingsDesk() : settingsPhone(); },
    meta: function () {
      var k = state.ui.uSetSec, s = SECS.find(function (x) { return x[0] === k; });
      return { title: 'Settings', meta: 'Preferences, account and data', search: 'Search settings…', back: (!U.isDesk() && s) ? 'settings-root' : 'home', ptitle: (!U.isDesk() && s) ? esc(s[2]) : 'Settings' };
    },
    after: function (c) {
      try { hearthFillSnapshotList(); } catch (e) {}
      if (!c._uSetWired) { c._uSetWired = 1; c.addEventListener('click', function (e) { if (U.route() === 'settings' && e.target.closest && e.target.closest('[data-text-size],[data-wide-pref],[data-look-pref]')) setTimeout(render, 0); }); }
      var s = document.querySelector('.u-top [data-u-search]');
      if (s) { s.dataset.uLocal = '1'; s.onkeydown = function (e) { if (e.key !== 'Enter') return; e.stopPropagation(); var q = s.value.toLowerCase(); var M = [['look', 'appearance theme colour color palette texture font card motion'], ['text', 'text size reading wide narrow screen'], ['dice', 'dice roll projector colour animation'], ['account', 'account google sync sign'], ['data', 'backup export import snapshot sample data'], ['homebrew', 'homebrew forge community'], ['ai', 'ai core diagnostics'], ['about', 'about legal licence bug tour version']]; var hit = M.find(function (m) { return m[1].indexOf(q) >= 0 || q.split(/\s+/).some(function (w) { return w && m[1].indexOf(w) >= 0; }); }); if (hit) { state.ui.uSetSec = hit[0]; render(); } }; }
    },
    css: [
      '.setg{grid-template-columns:260px minmax(0,1fr);min-height:calc(100vh - 88px - 64px);align-items:stretch}',
      '.sn .sna{display:flex;align-items:center;gap:12px;height:46px;padding:0 14px;border-radius:10px;font:600 14.5px var(--sans);color:var(--ink-soft);background:none;border:0;cursor:pointer;text-align:left;width:100%}',
      '.sn .sna svg{color:var(--ink-faded)}.sn .sna.on{color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,transparent);box-shadow:inset 0 0 0 1px var(--rim)}.sn .sna.on svg{color:var(--gold)}',
      '.setpane{padding:28px 32px}',
      '.opt{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px;align-items:center;padding:18px 0}.opt+.opt{border-top:1px solid var(--hair)}',
      '.seg>button[aria-pressed="true"]{background:var(--tex),var(--u-surface)!important;color:var(--gold)!important;box-shadow:inset 0 0 0 1px var(--rim-strong),0 2px 4px rgba(0,0,0,.4)!important}',
      '.seg>button[aria-pressed="false"]{background:none!important;color:var(--ink-faded)!important;box-shadow:none!important}',
      '.wrapseg{flex-wrap:wrap;height:auto;min-height:44px}',
      '.chip[aria-pressed="true"]{background:var(--brass-grad);color:var(--on-gold);border-color:var(--gold-deep)}',
      '.thr{display:flex;align-items:center;gap:24px;margin:22px 0 26px;padding:18px;border-radius:14px;background:var(--well);border:1px solid var(--hair)}',
      '.rsw{width:22px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);flex:none}',
      '.thr .mpw{width:240px;flex:none}',
      '.mp{position:relative;display:block;height:96px;border-radius:8px;overflow:hidden;background:var(--c0);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      '.mp.big{height:132px}.mp.big .tb{height:24px}.mp.big .cd{top:34px}',
      '.mp.tx-leather,.mp.tx-stone,.mp.tx-brushed{background-image:linear-gradient(160deg,rgba(255,255,255,.07),rgba(0,0,0,.18))}',
      '.mp.tx-parchment{background-image:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.25),transparent 60%),linear-gradient(rgba(120,80,30,.06),rgba(120,80,30,.12))}',
      '.mp.tx-stars{background-image:radial-gradient(1px 1px at 20% 30%,rgba(255,255,255,.6),transparent),radial-gradient(1px 1px at 70% 60%,rgba(255,255,255,.5),transparent),radial-gradient(1px 1px at 85% 20%,rgba(255,255,255,.5),transparent)}',
      '.mp .tb{position:absolute;left:0;right:0;top:0;height:18px;background:var(--c4);display:flex;align-items:center;gap:4px;padding:0 8px}',
      '.mp .tb i{width:6px;height:6px;border-radius:50%;background:var(--c3)}.mp .tb s{height:4px;width:34%;border-radius:2px;background:var(--c2);opacity:.75;text-decoration:none}',
      '.mp .cd{position:absolute;left:8px;right:8px;top:26px;bottom:8px;border-radius:6px;background:var(--c1);box-shadow:0 1px 3px rgba(0,0,0,.35),inset 0 0 0 1px color-mix(in srgb,var(--c3) 35%,transparent);padding:8px 9px}',
      '.mp .cd u{display:block;height:5px;border-radius:3px;background:var(--c2);opacity:.9;margin-bottom:5px;text-decoration:none}.mp .cd u+u{opacity:.45;width:62%}',
      '.mp .cd .bt{position:absolute;left:9px;bottom:8px;width:44px;height:14px;border-radius:7px;background:var(--c3)}',
      '.mp .cd .hp{position:absolute;right:9px;bottom:12px;width:40%;height:5px;border-radius:3px;background:color-mix(in srgb,var(--c2) 18%,transparent)}.mp .cd .hp:before{content:"";position:absolute;inset:0 30% 0 0;border-radius:3px;background:var(--c3)}',
      '.mp .cd .dg{position:absolute;right:9px;top:8px;width:8px;height:8px;border-radius:50%;background:var(--c5)}',
      '.rowbtn{width:100%;background:none;border:0;color:var(--ink);font:inherit;text-align:left;cursor:pointer}',
      '.setph .gl{margin:4px 4px -4px}.grp{padding:0;overflow:hidden}.grp .row{min-height:56px;padding:8px 14px}.grp .row+.row{border-top:1px solid var(--hair)}.grp .val{color:var(--ink-faded);font-size:14px;margin-right:2px}.grp .rn{font-size:15px;color:var(--ink)}',
      '.acct{width:100%;text-align:left;color:var(--ink);font:inherit;cursor:pointer}',
      '.u-phone .setpane{padding:20px 18px}.u-phone .opt{grid-template-columns:1fr;gap:10px}.u-phone .thr{flex-wrap:wrap}.u-phone .thr .mpw{width:100%}',
      // theme picker
      '.tp{display:flex;flex-direction:column;padding:0!important;overflow:hidden!important}',
      '.u-desk .u-layer>.tp{top:64px!important;bottom:64px;transform:translateX(-50%)!important;width:1240px;max-height:none!important}',
      '.tp .hd{display:flex;align-items:flex-start;gap:16px;padding:26px 28px 18px;border-bottom:1px solid var(--hair)}',
      '.tp .ft{display:flex;align-items:center;gap:16px;padding:16px 24px;border-top:1px solid var(--hair);background:color-mix(in srgb,var(--page) 35%,transparent)}',
      '.tp .ft .sw{width:56px;height:40px;border-radius:9px;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 2px 6px rgba(0,0,0,.5)}',
      '.tp .bodyw{flex:1;min-height:0;display:grid;grid-template-columns:220px minmax(0,1fr)}',
      '.tp .rail{padding:18px 14px;border-right:1px solid var(--hair);display:flex;flex-direction:column;gap:4px}',
      '.tp .ra{display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:10px;font:600 14px var(--sans);color:var(--ink-soft);background:none;border:0;cursor:pointer;text-align:left}',
      '.tp .ra svg{color:var(--ink-faded)}.tp .ra b{margin-left:auto;font:600 12px var(--sans);color:var(--ink-faded)}.tp .ra.on{color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,transparent);box-shadow:inset 0 0 0 1px var(--rim)}.tp .ra.on svg{color:var(--gold)}',
      '.tp .grid{overflow:auto;padding:18px 24px 40px;display:flex;flex-direction:column;gap:12px;min-height:0;scroll-behavior:smooth}',
      '.tp .grid.scroll.fadetop{-webkit-mask-image:linear-gradient(transparent,#000 28px,#000 calc(100% - 56px),transparent);mask-image:linear-gradient(transparent,#000 28px,#000 calc(100% - 56px),transparent)}',
      '.tp .gh{display:flex;align-items:center;gap:10px;margin-top:8px}.tp .gh:first-child{margin-top:0}.tp .gh:after{content:"";flex:1;height:1px;background:var(--hair)}',
      '.tp .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
      '.tc2{position:relative;border-radius:12px;background:var(--well);border:1px solid var(--hair);padding:8px;display:flex;flex-direction:column;gap:9px;text-align:left;color:var(--ink);font:inherit;cursor:pointer;min-width:0}',
      '.tc2:hover{border-color:var(--rim)}.tc2.sel{border-color:var(--gold);box-shadow:var(--glow)}',
      '.tc2 .ck{position:absolute;right:14px;top:14px;width:26px;height:26px;border-radius:50%;background:var(--brass-grad);color:var(--on-gold);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.6);z-index:2}.tc2 .ck svg{width:15px;height:15px;stroke-width:2.4}',
      '.tc2 .meta{display:flex;align-items:center;gap:8px;padding:0 4px 2px}.tc2 .meta .f1{display:flex;flex-direction:column}.tc2 .meta .t-h3{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tc2 .meta .t-meta{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tc2 .meta .tone{margin-left:auto;color:var(--ink-faded)}',
      '.live{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:999px;font:600 12.5px var(--sans);color:var(--gold);border:1px solid var(--rim-strong);background:color-mix(in srgb,var(--gold) 9%,transparent);white-space:nowrap}.live .dot{background:var(--gold)}',
      '.u-phone .u-layer>.tpp{top:150px;max-height:none!important;padding:0!important}',
      '.tpp .hd{padding:30px 20px 12px;border:0}.tpchips{padding:0 20px 12px;border-bottom:1px solid var(--hair);overflow:auto;scrollbar-width:none}.tpp .chips .chip{height:32px;padding:0 12px;font-size:12.5px;flex:none}',
      '.tpp .grid{flex:1;padding:14px 16px 40px}.tpp .cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tpp .mp{height:78px}.tpp .tc2{padding:6px;gap:7px}.tpp .tc2 .ck{right:11px;top:11px;width:24px;height:24px}',
      '.tpp .tc2 .meta .t-h3{white-space:normal;line-height:1.2}.tpp .ft{flex-direction:column;align-items:stretch;gap:12px;padding:14px 16px 34px}.tpp .ft .sw{width:46px;height:34px}.tpp .fb{grid-template-columns:1fr 1.4fr;gap:10px}'
    ].join('\n')
  };
  var A = U.actions;
  A.themes = function (t) { if (!TP) openThemes(t); };
  A['set-sec'] = function (t) { state.ui.uSetSec = t.dataset.v; render(); try { window.scrollTo(0, 0); } catch (e) {} };
  A['lib-content'] = function () { state.ui.uLibTab = 'content'; U.go('library'); };
  // phone sub-pages go back to the grouped list
  var origGo = U.go;
  U.go = function (where) { if (where === 'settings-root') { state.ui.uSetSec = null; state.tab = 'character'; state.ui.homePanel = 'settings'; render(); return; } if (where === 'settings') state.ui.uSetSec = state.ui.uSetSec || null; return origGo(where); };
})();
