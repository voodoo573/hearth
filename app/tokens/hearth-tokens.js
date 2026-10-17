/* HearthTokens v1.0.0 — brass-rimmed token frames for Hearth (Jenny). Offline, no dependencies.
   HearthTokens.createToken({img, kind, size, state, conditions, cell, label, alt}) -> HTMLElement
   kind: player|ally|neutral|enemy|boss   size: tiny|small|medium|large|huge|gargantuan
   state: string or array of selected|active|bloodied|dead   conditions: array of HearthEffects names
   Condition badges come from window.HearthEffects.createConditionBadge (load hearth-effects.js first). */
(function (root) {
  'use strict';
  var KINDS = {
    player:  { a: '#fff1b8', b: '#e0b44a', c: '#7a5414', glow: '#ffd36a', bg: '#3a2c14' },
    ally:    { a: '#c8fff4', b: '#3fb6a4', c: '#0f4f48', glow: '#5ee8d4', bg: '#123a36' },
    neutral: { a: '#f2d8b0', b: '#b58449', c: '#5a3a1a', glow: '#e0b070', bg: '#3a2a1c' },
    enemy:   { a: '#ffc6a0', b: '#c8401e', c: '#4a0e08', glow: '#ff6a2a', bg: '#3a1210' },
    boss:    { a: '#fff4c0', b: '#e8a830', c: '#5a1a08', glow: '#ff7a20', bg: '#2e1208' }
  };
  var SIZES = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
  var uid = 0;
  function sizeCells(s) { return SIZES[String(s || 'medium').toLowerCase()] || 1; }
  function frameSVG(kind, px) {
    var k = KINDS[kind] || KINDS.neutral, id = 'ht' + (++uid), boss = kind === 'boss';
    var rw = boss ? 9 : (px < 48 ? 9 : 7); // rim thicker at tiny sizes so it stays readable
    var r = 50 - rw / 2 - 1, rivets = '', n = boss ? 12 : 8;
    if (px >= 40) for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.PI / n, x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r;
      rivets += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (boss ? 1.6 : 1.4) + '" fill="url(#' + id + 'v)" stroke="#1a0e06" stroke-width=".4"/>';
    }
    var crest = boss ? '<g class="ht-crest"><path d="M50 -9 C44 -1 38 2 40 9 C35 6 32 1 33 -4 C27 3 27 10 33 14 L67 14 C73 10 73 3 67 -4 C68 1 65 6 60 9 C62 2 56 -1 50 -9Z" fill="url(#' + id + 'f)" stroke="#2a0a02" stroke-width="1"/>' +
      '<path d="M50 0 C47 5 45 8 47 12 L53 12 C55 8 53 5 50 0Z" fill="#fff0a0"/><path d="M38 12 L50 4 L62 12 L58 16 L42 16Z" fill="url(#' + id + 'g)" stroke="#1a0e06" stroke-width=".8"/></g>' : '';
    var ornate = boss ? '<circle cx="50" cy="50" r="' + (r - rw / 2 - 1.2) + '" fill="none" stroke="' + k.b + '" stroke-width="1" stroke-dasharray="2 2.4" opacity=".9"/>' : '';
    return '<svg class="ht-frame" viewBox="0 ' + (boss ? -12 : 0) + ' 100 ' + (boss ? 112 : 100) + '" aria-hidden="true" style="' + (boss ? 'top:-12%;height:112%' : '') + '">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + k.a + '"/><stop offset=".45" stop-color="' + k.b + '"/><stop offset="1" stop-color="' + k.c + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'v" cx=".35" cy=".35"><stop offset="0" stop-color="#fff6d0"/><stop offset="1" stop-color="' + k.c + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c8401e"/><stop offset=".6" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ffd060"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#120a05" stroke-width="' + (rw + 2.4) + '"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="url(#' + id + 'g)" stroke-width="' + rw + '"/>' +
      '<circle cx="50" cy="50" r="' + (r - rw / 2 + 0.6) + '" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1.2"/>' +
      '<path d="M' + (50 - r * 0.8) + ' ' + (50 - r * 0.6) + ' A' + r + ' ' + r + ' 0 0 1 ' + (50 + r * 0.3) + ' ' + (50 - r * 0.95) + '" fill="none" stroke="rgba(255,250,220,.55)" stroke-width="1.3" stroke-linecap="round"/>' +
      ornate + rivets + crest + '</svg>';
  }
  var CSS = '.ht-token{position:relative;display:inline-block;box-sizing:border-box;border-radius:50%;user-select:none;--ht-glow:#ffd36a}' +
    '.ht-token .ht-face{position:absolute;inset:7%;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 40% 35%,var(--ht-bg2),var(--ht-bg) 70%,#0b0806);box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 4px 10px rgba(0,0,0,.55)}' +
    '.ht-token .ht-face img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.ht-token .ht-face .ht-initials{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 calc(var(--ht-px)*.36) Georgia,serif;color:#f3e6c8;text-shadow:0 1px 2px #000}' +
    '.ht-token .ht-frame{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}' +
    '.ht-token.ht-boss{filter:drop-shadow(0 0 6px rgba(255,110,30,.55))}' +
    '.ht-ring{position:absolute;inset:-9%;border-radius:50%;pointer-events:none}' +
    '.ht-selected .ht-sel{border:2px dashed #fff4d0;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 0 6px rgba(255,240,200,.7);animation:htspin 8s linear infinite}' +
    '.ht-active .ht-act{box-shadow:0 0 0 3px var(--ht-glow),0 0 16px 4px var(--ht-glow);animation:htpulse 1.6s ease-in-out infinite;opacity:.9}' +
    '.ht-bloodied .ht-face::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,transparent 45%,rgba(160,10,0,.55) 100%)}' +
    '.ht-bloodied .ht-blood{position:absolute;left:50%;bottom:-6%;transform:translateX(-50%);width:26%;height:26%;min-width:10px;min-height:10px}' +
    '.ht-dead .ht-face{filter:grayscale(1) brightness(.45) contrast(1.1)}.ht-dead .ht-frame{filter:grayscale(.85) brightness(.6)}' +
    '.ht-dead .ht-x{position:absolute;inset:14%;pointer-events:none}' +
    '.ht-badges{position:absolute;inset:0;pointer-events:none}.ht-badges>*{position:absolute;transform:translate(-50%,-50%);filter:drop-shadow(0 1px 1px rgba(0,0,0,.8))}' +
    '.ht-more{font:700 9px/1 system-ui,sans-serif;color:#f3e6c8;background:#2a1a10;border:1px solid #c8a040;border-radius:8px;padding:2px 3px}' +
    '.ht-label{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:3px;font:600 9px/1.2 Georgia,serif;white-space:nowrap;padding:1px 5px;border-radius:3px;background:rgba(18,12,8,.85);color:#f3e6c8;border:1px solid rgba(200,160,64,.5)}' +
    '@keyframes htspin{to{transform:rotate(360deg)}}@keyframes htpulse{0%,100%{opacity:.6}50%{opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.ht-sel,.ht-act{animation:none!important}}.ht-still .ht-sel,.ht-still .ht-act{animation:none!important}';
  function injectCSS() {
    if (typeof document === 'undefined' || document.getElementById('hearth-tokens-css')) return;
    var s = document.createElement('style'); s.id = 'hearth-tokens-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function badgeSize(px) { return px >= 160 ? 28 : px >= 96 ? 24 : px >= 56 ? 20 : 16; }
  function createToken(o) {
    o = o || {}; injectCSS();
    var kind = KINDS[o.kind] ? o.kind : 'neutral', k = KINDS[kind];
    var cells = sizeCells(o.size), cell = o.cell || 64;
    var px = Math.round(cells * cell * (kind === 'boss' && cells === 1 ? 1.15 : 1)); // a medium boss gets a little extra presence
    var states = [].concat(o.state || []).filter(Boolean);
    var el = document.createElement('div');
    el.className = 'ht-token ht-' + kind + ' ht-size-' + String(o.size || 'medium').toLowerCase() + states.map(function (s) { return ' ht-' + s; }).join('');
    el.style.width = el.style.height = px + 'px';
    el.style.setProperty('--ht-px', px + 'px'); el.style.setProperty('--ht-glow', k.glow);
    el.style.setProperty('--ht-bg', k.bg); el.style.setProperty('--ht-bg2', k.b + '55');
    el.dataset.span = cells; el.setAttribute('role', 'img');
    el.setAttribute('aria-label', [o.alt || o.label || kind, states.join(', '), (o.conditions || []).join(', ')].filter(Boolean).join(' — '));
    var face = '<div class="ht-face">' + (o.img ? '<img src="' + String(o.img).replace(/"/g, '&quot;') + '" alt="" draggable="false">' :
      '<span class="ht-initials">' + String(o.label || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() + '</span>') + '</div>';
    var under = '<div class="ht-ring ht-sel"></div><div class="ht-ring ht-act"></div>', extra = '';
    if (states.indexOf('bloodied') >= 0 && states.indexOf('dead') < 0) extra += '<svg class="ht-blood" viewBox="0 0 20 20"><path d="M10 1 C6 7 3 10 3 13.5 A7 7 0 0 0 17 13.5 C17 10 14 7 10 1Z" fill="#b0140a" stroke="#2a0402" stroke-width="1.3"/><path d="M7 12 a3 3 0 0 0 2 4" fill="none" stroke="#ff9a80" stroke-width="1.2" stroke-linecap="round"/></svg>';
    if (states.indexOf('dead') >= 0) extra += '<svg class="ht-x" viewBox="0 0 100 100"><path d="M18 18 L82 82 M82 18 L18 82" stroke="#1a0402" stroke-width="16" stroke-linecap="round"/><path d="M18 18 L82 82 M82 18 L18 82" stroke="#a8261a" stroke-width="9" stroke-linecap="round"/></svg>';
    el.innerHTML = under + face + frameSVG(kind, px) + extra;
    // condition badges ride the rim, clockwise from 1 o'clock (the crest owns 12 o'clock on bosses)
    var conds = (o.conditions || []).slice(), HE = root.HearthEffects;
    if (conds.length) {
      var wrap = document.createElement('div'); wrap.className = 'ht-badges';
      var bs = badgeSize(px), rad = 0.5 - 0.035, max = px < 48 ? 3 : px < 96 ? 5 : 8, step = Math.min(34, 300 / Math.max(max, conds.length)) ;
      step = Math.max(step, (bs * 1.05) / (px * rad) * 180 / Math.PI);
      var shown = conds.slice(0, conds.length > max ? max - 1 : max);
      shown.forEach(function (c, i) {
        var b = HE && HE.createConditionBadge ? HE.createConditionBadge(c, bs) : null;
        if (!b) { b = document.createElement('span'); b.className = 'ht-more'; b.textContent = String(c).slice(0, 3); }
        var a = (-60 + i * step) * Math.PI / 180;
        b.style.left = (50 + Math.cos(a) * rad * 100) + '%';
        b.style.top = (50 + Math.sin(a) * rad * 100) + '%';
        b.style.width = b.style.height = bs + 'px'; wrap.appendChild(b);
      });
      if (conds.length > shown.length) {
        var m = document.createElement('span'); m.className = 'ht-more'; m.textContent = '+' + (conds.length - shown.length);
        var a2 = (-60 + shown.length * step) * Math.PI / 180;
        m.style.left = (50 + Math.cos(a2) * rad * 100) + '%'; m.style.top = (50 + Math.sin(a2) * rad * 100) + '%';
        m.title = conds.slice(shown.length).join(', '); wrap.appendChild(m);
      }
      el.appendChild(wrap);
    }
    if (o.label && o.showLabel) { var l = document.createElement('span'); l.className = 'ht-label'; l.textContent = o.label; el.appendChild(l); }
    return el;
  }
  root.HearthTokens = { version: '1.0.0', createToken: createToken, frameSVG: frameSVG, sizeCells: sizeCells, kinds: Object.keys(KINDS), sizes: Object.keys(SIZES), states: ['selected', 'active', 'bloodied', 'dead'], css: CSS };
})(typeof window !== 'undefined' ? window : this);
