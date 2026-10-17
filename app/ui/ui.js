// Hearth UI polish — app shell (desktop sidebar + top bar; phone app bar + bottom tabs) and the screen
// registry. Design: Jenny (ui-polish SPEC). Screens register in HearthUI.screens; each one renders
// markup written with the design-system class names (card, btn, row...), which px() prefixes to u-*.
// A class written as !name is kept as-is (app hooks such as .tab or .active).
(function () {
  'use strict';
  var W = window, D = document;
  var I = W.HEARTH_ICONS || {};
  var DESK = 1280;
  function isDesk() { return (W.innerWidth || D.documentElement.clientWidth) >= DESK; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // class prefixer: class="btn primary !tab" -> class="u-btn u-primary tab"
  // \u0001...\u0002 marks raw app markup that must keep its own class names (see raw())
  function raw(html) { return '\u0001' + html + '\u0002'; }
  function px(html) {
    return String(html).split(/(\u0001[\s\S]*?\u0002)/).map(function (part) { return part.charAt(0) === '\u0001' ? part.slice(1, -1) : pxPart(part); }).join('');
  }
  function pxPart(html) {
    return String(html).replace(/class="([^"]*)"/g, function (m, c) {
      return 'class="' + c.split(/\s+/).filter(Boolean).map(function (k) { return k.charAt(0) === '!' ? k.slice(1) : 'u-' + k; }).join(' ') + '"';
    });
  }
  // CSS prefixer for screen styles written with Jenny's class names (one level of @media supported)
  function pxCss(css) {
    var out = '', i = 0;
    function selFix(sel) {
      return sel.split(',').map(function (x) {
        x = x.trim(); if (!x) return x;
        var lead = '.u2 ', m = /^\.(u-desk|u-phone)\b\s*/.exec(x); // .u-desk/.u-phone sit on body next to .u2
        if (m) { lead = '.u2.' + m[1] + ' '; x = x.slice(m[0].length); }
        return lead + x.replace(/\.(!?)(?!u-)(-?[_a-zA-Z][\w-]*)/g, function (m0, r, n) { return r ? '.' + n : '.u-' + n; }); // .!cls = the app's own class
      }).join(',');
    }
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    var re = /([^{}]+)\{/g, depth = 0;
    while (i < css.length) {
      var open = css.indexOf('{', i); if (open < 0) break;
      var head = css.slice(i, open).trim();
      if (head.indexOf('@media') === 0 || head.indexOf('@supports') === 0) {
        var j = open + 1, d = 1; while (j < css.length && d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
        out += head + '{' + pxCss(css.slice(open + 1, j - 1)) + '}\n'; i = j; continue;
      }
      var close = css.indexOf('}', open);
      out += (head.indexOf('@') === 0 ? head : selFix(head)) + '{' + css.slice(open + 1, close) + '}\n';
      i = close + 1;
    }
    return out;
  }
  function addCss(id, css) { var s = D.getElementById(id); if (!s) { s = D.createElement('style'); s.id = id; D.head.appendChild(s); } s.textContent = pxCss(css); }
  function ic(name, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (I[name] || '') + '</svg>'; }
  function btn(label, kind, icon, extra, trail) {
    return '<button type="button" class="btn ' + (kind || '') + '" ' + (extra || '') + '>' + (icon ? ic(icon, 'sm') : '') + (label ? '<span>' + label + '</span>' : '') + (trail ? ic(trail, 'sm') : '') + '</button>';
  }
  function ibtn(name, extra, plain, label) { return '<button type="button" class="ibtn' + (plain === false ? '' : ' plain') + '" aria-label="' + esc(label || name) + '" ' + (extra || '') + '>' + ic(name) + '</button>'; }
  function tag(t, k) { return '<span class="tag ' + (k || '') + '">' + t + '</span>'; }
  function sec(label, link, linkAttr) { return '<div class="sec-h"><span class="t-label">' + label + '</span>' + (link ? '<button type="button" class="sec-link" ' + (linkAttr || '') + '>' + link + '</button>' : '') + '</div>'; }
  function hpbar(cur, max) { var w = max > 0 ? Math.max(0, Math.min(100, Math.round(100 * cur / max))) : 0; return '<div class="hpbar"><i class="' + (max > 0 && cur / max < 0.5 ? 'low' : '') + '" style="width:' + w + '%"></i></div>'; }
  function pips(total, filled, round) { var h = ''; for (var k = 0; k < total; k++) h += '<i class="' + (k < filled ? '' : 'u') + '"></i>'; return '<span class="pips' + (round ? ' round' : '') + '">' + h + '</span>'; }

  // ---------- current character helpers (read-only views of the app's data) ----------
  function chars() { try { return loadCharacters() || []; } catch (e) { return []; } }
  function current() { var l = chars(); return (state.activeCharId && l.find(function (c) { return c.id === state.activeCharId; })) || l[0] || null; }
  function hpOf(ch) { var m = 0; try { m = maxHp(ch); } catch (e) {} var c = ch.currentHp == null ? m : ch.currentHp; return { cur: c, max: m }; }
  function acOf(ch) { try { return ac(ch); } catch (e) { return '–'; } }
  function classLine(ch) { try { return characterClassLine(ch); } catch (e) { return ''; } }
  function subLine(ch) { try { return characterSubclassLine(ch) || ''; } catch (e) { return ''; } }
  function raceName(ch) { try { return (RACES[ch.race] && RACES[ch.race].name) || ''; } catch (e) { return ''; } }
  function initials(n) { return esc(String(n || '?').replace(/^Sample:\s*/, '').trim().charAt(0).toUpperCase() || '?'); }
  function avatar(ch, size, cls) {
    var s = size || 44;
    if (ch && ch.photo) return '<img class="av ' + (cls || '') + '" src="' + esc(ch.photo) + '" width="' + s + '" height="' + s + '" alt="" style="width:' + s + 'px;height:' + s + 'px">';
    return '<span class="av avi ' + (cls || '') + '" style="width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * 0.42) + 'px" aria-hidden="true">' + initials(ch && ch.name) + '</span>';
  }
  function slotInfo(ch) { try { var r = slotsRemaining(ch) || []; var lo = r[0]; return lo ? { total: lo.total, left: lo.remaining, level: lo.level } : null; } catch (e) { return null; } }

  // ---------- routing ----------
  function storeOn() { try { return localStorage.getItem('hearth.flag.store') === '1' || /[?&]store=1\b/.test(location.search); } catch (e) { return false; } }
  function route() {
    var u = state.ui || {};
    if (!state.ruleset) return 'rules';
    if (state.tab === 'build') return 'builder';
    if (state.tab === 'play') return 'sheet';
    if (state.tab === 'gear') return 'gear';
    if (state.tab === 'forge') return 'forge';
    if (state.tab === 'reference') return 'reference';
    if (state.tab === 'dm') return u.dmMapMode ? 'map' : 'encounter';
    if (u.uPage === 'store' && storeOn()) return 'store';
    if (u.homePanel === 'library') return 'library';
    if (u.homePanel === 'settings') return 'settings';
    if (u.homeMenu === 'player' || u.homePanel === 'characters') return 'characters';
    if (u.homeMenu === 'dm') return 'dm';
    return 'home';
  }
  var NAV = [['character', 'Home', 'home'], ['play', 'Play', 'sword'], ['gear', 'Gear', 'pack'], ['forge', 'Forge', 'anvil'], ['reference', 'Reference', 'book']];
  function navKey(r) {
    if (screens[r] && screens[r].nav) return screens[r].nav;
    if (r === 'home' || r === 'builder') return 'character';
    if (r === 'sheet') return 'play';
    return { gear: 'gear', forge: 'forge', reference: 'reference' }[r] || null;
  }
  var screens = {};
  function go(where) {
    var u = state.ui;
    u.uPage = null;
    if (where === 'home' || where === 'characters' || where === 'dm' || where === 'library' || where === 'settings' || where === 'store') {
      state.tab = 'character'; setActiveTab('character');
      u.homeMenu = where === 'characters' ? 'player' : where === 'dm' ? 'dm' : null;
      u.homePanel = where === 'library' ? 'library' : where === 'settings' ? 'settings' : null;
      if (where === 'store') u.uPage = 'store';
    } else if (where === 'sheet') { setActiveTab('play'); }
    else { setActiveTab(where); }
    render();
    try { W.scrollTo(0, 0); } catch (e) {}
  }

  // ---------- shell ----------
  var shell, sideEl, topEl, abarEl, tabbarEl, lastMode = null;
  function sideHTML(r) {
    var nk = /^(dm|encounter|library|store|settings)$/.test(r) ? null : navKey(r);
    var nav = NAV.map(function (n) { return '<button type="button" class="nav-a' + (n[0] === nk ? ' on' : '') + '" data-tab="' + n[0] + '">' + ic(n[2]) + '<span>' + n[1] + '</span></button>'; }).join('');
    var tbl = [['dm', 'Dungeon Master', 'crown', r === 'dm' || r === 'encounter'], ['library', 'Library', 'map', r === 'library']];
    if (storeOn()) tbl.push(['store', 'Hearth Maps', 'bag', r === 'store', true]);
    var tab = tbl.map(function (n) { return '<button type="button" class="nav-a' + (n[3] ? ' on' : '') + '" data-u-go="' + n[0] + '">' + ic(n[2]) + '<span>' + n[1] + '</span>' + (n[4] ? tag('New') : '') + '</button>'; }).join('');
    var ch = current(), me = '';
    if (ch) {
      var hp = hpOf(ch);
      me = '<div class="mechar"><button type="button" class="mechar-open" data-u-go="sheet" aria-label="Open ' + esc(ch.name) + '’s sheet">' + avatar(ch, 44) + '<div class="grow"><div class="t-h3 ell">' + esc(ch.name) + '</div><div class="t-meta ell">' + esc(classLine(ch)) + ' · AC ' + esc(acOf(ch)) + '</div>' + hpbar(hp.cur, hp.max) + '</div></button>' + ibtn('swap', 'data-u-act="switch"', true, 'Switch character') + '</div>';
    }
    var ver = esc(String(W.HEARTH_VERSION || '').replace(/^v/, ''));
    return '<div class="brand"><span class="brand-ic !home-brand-icon" aria-hidden="true"></span><div><b>Hearth<sup>' + (state.ruleset === '5.5e' ? '5.5e' : '5e') + '</sup></b><small>A COMPANION FOR THE TABLE</small></div></div>' +
      '<nav class="nav" aria-label="Main">' + nav + '</nav><div class="t-label nav-l">At the table</div><nav class="nav" aria-label="At the table">' + tab + '</nav>' +
      '<div class="side-foot">' + me + '<nav class="nav"><button type="button" class="nav-a' + (r === 'settings' ? ' on' : '') + '" data-u-go="settings">' + ic('gear') + '<span>Settings</span></button></nav>' +
      '<div class="legal">Hearth v' + ver + ' · SRD 5.1 &amp; 5.2 (CC-BY-4.0)<br>Unofficial · not affiliated with WotC · <button type="button" class="legal-link" data-legal-open="1">About &amp; legal</button></div></div>';
  }
  function tabbarHTML(r) {
    var nk = navKey(r);
    return NAV.map(function (n) { return '<button type="button" class="' + (n[0] === nk ? 'on' : '') + '" data-tab="' + n[0] + '">' + ic(n[2], 'lg') + '<span>' + n[1] + '</span></button>'; }).join('');
  }
  function topHTML(m) {
    var s = m.search ? '<label class="field search">' + ic('search', 'sm') + '<input type="search" data-u-search placeholder="' + esc(m.search) + '" aria-label="Search">' + '<kbd>/</kbd></label>' : '';
    return '<div class="ttl"><h1 class="t-h1">' + m.title + '</h1>' + (m.meta ? '<div class="t-meta">' + m.meta + '</div>' : '') + '</div>' + (m.extra || '') + s + (m.actions || '');
  }
  function abarHTML(m) {
    var left = m.back ? ibtn('left', 'data-u-back="' + esc(m.back) + '" style="margin-left:-8px"', true, 'Back') : '<span class="logo !home-brand-icon" aria-hidden="true"></span>';
    var title = m.ptitle || m.title;
    return left + '<div class="ttl">' + title + (m.psub ? '<small>' + m.psub + '</small>' : '') + '</div>' + (m.pright || '');
  }
  function legacyMeta(r) {
    var T = { builder: ['New character', 'Build a hero step by step'], encounter: ['Encounter', 'Battle forge'], rules: ['Hearth', ''], map: ['Battle map', ''] };
    var t = T[r] || ['Hearth', ''];
    return { title: t[0], meta: t[1] };
  }
  function ensureShell() {
    var app = D.querySelector('.app'); if (!app) return false;
    D.body.classList.add('u2');
    D.documentElement.classList.add('u2-root');
    if (!shell) {
      var oldNav = app.querySelector('nav.tabs'); if (oldNav) oldNav.remove();
      shell = D.createElement('div'); shell.className = 'u-shell';
      sideEl = D.createElement('aside'); sideEl.className = 'u-side'; sideEl.setAttribute('aria-label', 'Hearth');
      var main = D.createElement('section'); main.className = 'u-main';
      topEl = D.createElement('header'); topEl.className = 'u-top';
      abarEl = D.createElement('header'); abarEl.className = 'u-abar';
      tabbarEl = D.createElement('nav'); tabbarEl.className = 'u-tabbar'; tabbarEl.setAttribute('aria-label', 'Main');
      var c = D.getElementById('content');
      app.insertBefore(shell, c);
      main.appendChild(abarEl); main.appendChild(topEl); main.appendChild(c);
      var legal = D.getElementById('legalNote'); if (legal) main.appendChild(legal);
      shell.appendChild(sideEl); shell.appendChild(main);
      app.appendChild(tabbarEl);
      D.addEventListener('click', onClick, true);
      D.addEventListener('keydown', onKey);
      W.addEventListener('resize', function () { if (lastMode !== isDesk()) render(); });
    }
    return true;
  }
  function paintShell(r, meta, fresh) {
    var desk = isDesk(); lastMode = desk;
    D.body.classList.toggle('u-desk', desk); D.body.classList.toggle('u-phone', !desk);
    D.body.dataset.uRoute = r;
    // the shell is painted fresh before the app renders (so the app's own wiring binds once to buttons such as
    // data-home-act in the top bar), and after it only where the markup changed
    function put(el, html) { if (fresh || el._uHtml !== html) { el._uHtml = html; el.innerHTML = html; } }
    put(sideEl, desk ? px(sideHTML(r)) : '');
    put(tabbarEl, desk ? '' : px(tabbarHTML(r)));
    put(topEl, desk ? px(topHTML(meta)) : '');
    put(abarEl, desk ? '' : px(abarHTML(meta)));
    D.body.classList.toggle('u-noshell', r === 'rules');
    D.body.classList.toggle('u-notabs', !!meta.noTabs);
  }

  // ---------- events ----------
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-tab],[data-u-go],[data-u-back],[data-u-act]') : null;
    if (!t || !D.body.contains(t)) return;
    if (t.matches('.u-side [data-tab], .u-tabbar [data-tab]')) {
      e.preventDefault(); e.stopPropagation();
      state.tab = t.dataset.tab;
      if (state.tab === 'character' && state.ui) { state.ui.homeMenu = null; state.ui.homePanel = null; state.ui.uPage = null; }
      setActiveTab(state.tab); render(); try { W.scrollTo(0, 0); } catch (er) {}
      return;
    }
    if (t.dataset.uGo) {
      e.preventDefault(); e.stopPropagation();
      var g = t.dataset.uGo;
      if (g === 'sheet') { var ch = current(); if (ch) { state.activeCharId = ch.id; go('sheet'); } else go('characters'); return; }
      W.HearthUI.go(g); return;
    }
    if (t.dataset.uBack) { e.preventDefault(); e.stopPropagation(); W.HearthUI.go(t.dataset.uBack); return; }
    if (t.dataset.uAct && actions[t.dataset.uAct]) { e.preventDefault(); e.stopPropagation(); actions[t.dataset.uAct](t, e); }
  }
  function onKey(e) {
    if (e.key === '/' && isDesk() && !/INPUT|TEXTAREA|SELECT/.test((D.activeElement || {}).tagName || '')) {
      var s = D.querySelector('[data-u-search]'); if (s) { e.preventDefault(); s.focus(); }
    }
    if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('[data-u-search]')) {
      var q = e.target.value.trim(); actions.search(null, null, q);
    }
  }
  var actions = {
    'switch': function () { if (typeof openCharacterSwitcher === 'function') openCharacterSwitcher(); },
    search: function (t, e, q) {
      state.ui.refSearch = q || ''; try { if ('referenceSearch' in state.ui) state.ui.referenceSearch = q; } catch (er) {}
      setActiveTab('reference'); render();
      var inp = D.querySelector('#content input[type="search"], #content input[placeholder*="earch"]');
      if (inp && q) { inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  };

  // ---------- no emoji (hard rule 4) ----------
  // The app's own markup on the screens this build doesn't redraw still carries a few emoji glyphs; swap
  // each for the matching SVG icon (or drop it). On the DM map and encounter screens the icons are gold; the
  // battle board itself (#dmMapGrid: tokens, fog, templates) is skipped (no emoji there, and it redraws a lot) -
  // its template buttons draw SVG icons in aoeShapeSVG instead.
  var EMO = { '📷': 'camera', '📸': 'camera', '🖼': 'image', '📝': 'pencil', '⚔': 'sword', '🗡': 'sword', '✦': 'sparkle', '✨': 'sparkle', '⚡': 'bolt', '⛨': 'shield', '🛡': 'shield', '🎒': 'pack', '☆': 'star', '★': 'star', '⭐': 'star', '📜': 'scroll', '🎲': 'd20', '❤': 'heart', '🔥': 'flame', '🗺': 'map', '📖': 'book', '🔒': 'lock', '🔍': 'search', '⚙': 'gear', '💾': 'download', '📤': 'upload', '📥': 'download', '🏆': 'trophy', '🔔': 'bell', '✏': 'pencil', '🧪': 'potion', '💀': 'skull', '👁': 'eye', '🪄': 'wand', '🔨': 'anvil', '⚒': 'anvil', '🌙': 'moon', '☀': 'sun', '⏱': 'clock', '🕐': 'clock', '💰': 'coins', '🪙': 'coins', '🎉': 'sparkle', '✓': 'check', '✔': 'check', '✅': 'check',
    // DM map / encounter screens
    '▶': 'play', '✎': 'pencil', '🏷': 'tag', '📓': 'book', '📚': 'map', '🔗': 'link', '🌫': 'cloud', '👆': 'hand', '👥': 'users', '📏': 'ruler',
    '☐': 'box', '☑': 'boxcheck', '📍': 'pin', '📌': 'pin', '⚓': 'anchor', '🙈': 'eyeoff', '🥕': 'moon', '⬇': 'download',
    '🔴': 'dot:hostile', '🟢': 'dot:ally', '⚪': 'dot:neutral' };
  // real emoji (Extended_Pictographic, minus ©, ®, ™, ‼, ⁉, ℹ and the plain arrows), plus the three dingbats
  // the app uses as icons (✦ ☆ ★). Plain text marks such as ✓ and ✕ stay as text.
  var EMO_SRC = '(?:(?![\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u2194-\\u21AA\\u2713\\u2715\\u2716\\u2717])\\p{Extended_Pictographic}|[\\u2726\\u2605\\u2606])\\uFE0F?';
  var EMO_RE = new RegExp(EMO_SRC, 'u'), EMO_RE_G = new RegExp(EMO_SRC, 'gu');
  function emoDm() { var r = route(); return r === 'map' || r === 'encounter'; }
  function deEmoji(root) {
    if (!root || (root.closest && root.closest('#dmMapGrid'))) return;
    var dm = emoDm();
    var w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, hit = [];
    while ((n = w.nextNode())) { if (EMO_RE.test(n.nodeValue)) hit.push(n); }
    hit.forEach(function (t) {
      var p = t.parentElement; if (!p || p.closest('script,style,textarea,#dmMapGrid,[data-u-keep-emoji]') || p.namespaceURI === 'http://www.w3.org/2000/svg') return;
      if (p.tagName === 'OPTION' || p.tagName === 'TITLE') { t.nodeValue = t.nodeValue.replace(EMO_RE_G, '').replace(/^\s+/, ''); return; }
      var f = D.createDocumentFragment(), last = 0, s = t.nodeValue; EMO_RE_G.lastIndex = 0; var m;
      while ((m = EMO_RE_G.exec(s))) {
        if (m.index > last) f.appendChild(D.createTextNode(s.slice(last, m.index)));
        var k = EMO[m[0].replace('\uFE0F', '')], dot = k && k.indexOf('dot:') === 0;
        if (dot) { var sd = D.createElement('span'); sd.className = 'u-emo u-emo-dot u-emo-' + k.slice(4); sd.setAttribute('aria-hidden', 'true'); sd.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="6.5"/></svg>'; f.appendChild(sd); }
        else if (k && I[k]) { var sp = D.createElement('span'); sp.className = 'u-emo' + (dm ? ' u-emo-gold' : ''); sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = '<svg viewBox="0 0 24 24" focusable="false">' + I[k] + '</svg>'; f.appendChild(sp); }
        last = m.index + m[0].length;
      }
      if (last < s.length) f.appendChild(D.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(f, t);
      if (!p.textContent.trim() && !p.querySelector('svg')) { var g = D.createElement('span'); g.className = 'u-emo'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = '<svg viewBox="0 0 24 24" focusable="false">' + I.sparkle + '</svg>'; p.appendChild(g); }
    });
  }
  var emoMo = null;
  function watchEmoji() {
    if (emoMo || !W.MutationObserver) return;
    emoMo = new MutationObserver(function (list) {
      list.forEach(function (m) { if (m.type === 'characterData') { if (m.target.parentElement && EMO_RE.test(m.target.nodeValue)) deEmoji(m.target.parentElement); return; } m.addedNodes.forEach(function (a) { if (a.nodeType === 1) deEmoji(a); else if (a.nodeType === 3 && a.parentElement && EMO_RE.test(a.nodeValue)) deEmoji(a.parentElement); }); });
    });
    emoMo.observe(D.body, { childList: true, subtree: true, characterData: true });
  }

  // ---------- render hook ----------
  var CONTENT_HTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  // Run one of the app's render functions with our markup in place of its own. The app's wiring
  // (document.querySelectorAll on its data-* hooks) then binds to our markup, so every action keeps
  // going through the app's own code.
  function withMarkup(html, fn) {
    var el = D.getElementById('content'), used = false;
    Object.defineProperty(el, 'innerHTML', { configurable: true, get: function () { return CONTENT_HTML.get.call(el); }, set: function (v) { delete el.innerHTML; used = true; CONTENT_HTML.set.call(el, html); } });
    try { fn(); } finally { if (!used) delete el.innerHTML; }
  }
  function afterRender() {
    if (!ensureShell()) return;
    var r = route(), sc = screens[r];
    var meta = (sc && sc.meta && sc.meta()) || legacyMeta(r);
    paintShell(r, meta);
    var c = D.getElementById('content');
    c.classList.toggle('u-screen', !!(sc && sc.owns));
    c.classList.toggle('u-legacy', !(sc && sc.owns));
    if (sc && sc.after) try { sc.after(c); } catch (e) { console.warn('ui after', r, e); }
    try { deEmoji(D.body); watchEmoji(); } catch (e) { console.warn('ui emoji', e); }
  }
  function hook(name, rkey) {
    var orig = W[name]; if (typeof orig !== 'function') return;
    W[name] = function () {
      var r = route(), sc = screens[r];
      if (sc && sc.html && (!rkey || rkey.indexOf(r) >= 0)) { var self = this, args = arguments; withMarkup(px(sc.html()), function () { orig.apply(self, args); }); return; }
      return orig.apply(this, arguments);
    };
    W[name]._uOrig = orig;
  }
  function boot() {
    if (!W.render || W.render._u) return;
    var origRender = W.render;
    W.render = function () {
      try { if (ensureShell()) { var r0 = route(), s0 = screens[r0]; paintShell(r0, (s0 && s0.meta && s0.meta()) || legacyMeta(r0), true); } } catch (e) { console.warn('ui pre-shell', e); }
      var out = origRender.apply(this, arguments); try { afterRender(); } catch (e) { console.warn('ui shell', e); } return out;
    };
    W.render._u = true;
    ['renderCharacter', 'renderPlay', 'renderGear', 'renderForge', 'renderReference', 'renderBuild'].forEach(function (n) { hook(n); });
    var st = D.createElement('style'); st.id = 'u2-screen-css'; D.head.appendChild(st);
    Object.keys(screens).forEach(function (k) { if (screens[k].css) addCss('u2-css-' + k, screens[k].css); });
    render();
  }
  // the Home overlays the app draws inside its Home markup (One-shot, Export/Import, Ruleset, AI Core).
  // Owned Home-family screens include them so those panels keep working.
  function homeModals() {
    var p = (state.ui || {}).homePanel;
    // Export / Import is now a dialog (screens-dialogs.js); the old Home panel opens it instead
    if (p === 'transfer' && actions['export']) { state.ui.homePanel = null; setTimeout(function () { if (!D.querySelector('[data-u-modal="export"]')) actions['export']({ dataset: { cat: state.ui.exportCategory || '' } }); }, 0); return ''; }
    var f = { ruleset: 'homePanelRuleset', aicore: 'homePanelAiCore', transfer: 'homePanelTransfer', oneshot: 'homePanelOneShot' }[p];
    if (!f || typeof W[f] !== 'function' || typeof W.homeModalWrap !== 'function') return '';
    try { return raw(W.homeModalWrap(p === 'aicore' ? W[f](current()) : W[f]())); } catch (e) { return ''; }
  }
  // ---------- overlays ----------
  // Desktop: a centred .dialog over a .scrim, centred in the main column. Phone: a bottom .sheet with a grab
  // handle (swipe down closes). Escape and the scrim close too; focus is trapped and handed back on close.
  var FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function modal(o) {
    var desk = isDesk(), back = D.activeElement, layer = D.createElement('div');
    layer.className = 'u-layer'; layer.setAttribute('data-u-modal', o.id || '');
    var box = desk ? 'dialog' : 'sheet';
    layer.innerHTML = px('<div class="scrim' + (o.light ? ' light' : '') + '" data-u-scrim></div><div class="' + box + ' ' + (o.cls || '') + '" role="' + (o.role || 'dialog') + '" aria-modal="true"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + ' tabindex="-1">' + (desk ? '' : '<span class="grab" aria-hidden="true"></span>') + o.html() + '</div>');
    D.body.appendChild(layer); D.body.classList.add('u-modal-open');
    var panel = layer.lastElementChild, closed = false;
    if (o.width && desk) panel.style.width = o.width + 'px';
    function close(reason) {
      if (closed) return; closed = true;
      D.removeEventListener('keydown', key, true);
      layer.remove(); if (!D.querySelector('.u-layer')) D.body.classList.remove('u-modal-open');
      try { if (o.onClose) o.onClose(reason || 'close'); } catch (e) { console.warn(e); }
      var to = (o.returnFocus && D.querySelector(o.returnFocus)) || back; try { if (to && to.focus && D.body.contains(to)) to.focus(); } catch (e) {}
    }
    function key(e) {
      if (!D.body.contains(layer) || layer !== [].slice.call(D.querySelectorAll('.u-layer')).pop()) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close('escape'); return; }
      if (e.key === 'Tab') {
        var f = [].slice.call(panel.querySelectorAll(FOCUSABLE)).filter(function (x) { return x.offsetParent !== null || x === D.activeElement; });
        if (!f.length) { e.preventDefault(); panel.focus(); return; }
        var i = f.indexOf(D.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
      if (o.onKey) o.onKey(e);
    }
    D.addEventListener('keydown', key, true);
    layer.querySelector('[data-u-scrim]').addEventListener('click', function () { close('scrim'); });
    layer.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('[data-u-close]'); if (c && layer.contains(c)) { e.preventDefault(); close(c.getAttribute('data-u-close') || 'close'); } });
    if (!desk) { // swipe down on the sheet's header area
      var y0 = null, dy = 0;
      panel.addEventListener('touchstart', function (e) { var t = e.target; var sc = t.closest && t.closest('[data-u-scroll]'); if (sc && sc.scrollTop > 0) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
      panel.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { panel.style.transform = 'translateY(' + dy + 'px)'; } }, { passive: true });
      panel.addEventListener('touchend', function () { if (y0 == null) return; y0 = null; if (dy > 90) close('swipe'); else panel.style.transform = ''; });
    }
    setTimeout(function () { var f = (o.focus && panel.querySelector(o.focus)) || panel.querySelector(FOCUSABLE) || panel; try { f.focus({ preventScroll: true }); } catch (e) {} }, 0);
    return { layer: layer, panel: panel, close: close, refresh: function () { var keep = panel.querySelector('[data-u-scroll]'), st = keep ? keep.scrollTop : 0; panel.innerHTML = px((desk ? '' : '<span class="grab" aria-hidden="true"></span>') + o.html()); var k2 = panel.querySelector('[data-u-scroll]'); if (k2) k2.scrollTop = st; } };
  }
  W.HearthUI = { modal: modal, homeModals: homeModals, raw: raw, screens: screens, px: px, pxCss: pxCss, addCss: addCss, ic: ic, btn: btn, ibtn: ibtn, tag: tag, sec: sec, hpbar: hpbar, pips: pips, esc: esc,
    chars: chars, current: current, hpOf: hpOf, acOf: acOf, classLine: classLine, subLine: subLine, raceName: raceName, avatar: avatar, slotInfo: slotInfo,
    route: route, go: go, isDesk: isDesk, actions: actions, withMarkup: withMarkup, storeOn: storeOn, boot: boot };
})();
