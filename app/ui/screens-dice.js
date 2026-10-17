// Hearth UI polish — the roll result (Jenny's dice-desk / dice-phone). The app's roll-outcome dialog and its
// wiring stay: this module redraws its content as Jenny's result card (d20 art with the natural roll, total,
// breakdown, Advantage / Normal / Disadvantage, one primary "Roll damage", Smite) and adds the roll log beside
// it on desktop and under it on phone. The app's own buttons stay in the dialog (hidden) and are clicked for us,
// so every path still runs the app's code. Rule 2: nothing goes to the projector from here, ever.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, esc = U.esc, D = document;
  function dlgState() { var d = state.ui.rollDialog, o = state.ui.rollOutcome; return { d: d, o: o, line: d && o && o.lineIdx != null ? d.lines[o.lineIdx] : null }; }
  function linked() { try { var j = HearthLink && HearthLink.join; return !!(j && j.token && (j.status === 'linked' || j.status === 'reconnecting')); } catch (e) { return false; } }
  function d20Vals(line) { var m = /\[([\d,\s]+)\]/.exec(String(line && line.rollDetail || '')); return m ? m[1].split(',').map(function (x) { return parseInt(x, 10); }).filter(isFinite) : []; }
  function natOf(line) { var v = d20Vals(line); if (!v.length) return null; var a = line.advantage || 'normal'; return a === 'adv' ? Math.max.apply(null, v) : a === 'dis' ? Math.min.apply(null, v) : v[0]; }
  function minus(s) { return String(s).replace(/(^|\s)-(\d)/g, '$1\u2212$2'); }
  function dieSVG(n, sides) {
    var g = 'u-d20g' + Math.random().toString(36).slice(2, 7);
    return '<svg class="u-die-svg" viewBox="0 0 100 110" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--gold) 70%,#fff)"/><stop offset="0.55" style="stop-color:var(--gold)"/><stop offset="1" style="stop-color:var(--gold-deep)"/></linearGradient></defs>' +
      '<polygon points="50,3 95,29 95,81 50,107 5,81 5,29" fill="url(#' + g + ')" stroke="var(--gold-deep)" stroke-width="2" stroke-linejoin="round"/>' +
      '<polygon points="50,24 79,74 21,74" fill="none" stroke="color-mix(in srgb,var(--gold-deep) 80%,#000)" stroke-width="1.3" stroke-linejoin="round" opacity=".75"/>' +
      '<path d="M50,3 50,24 M95,29 79,74 M5,29 21,74 M50,107 79,74 M50,107 21,74 M95,81 79,74 M5,81 21,74 M95,29 50,24 M5,29 50,24" stroke="color-mix(in srgb,var(--gold-deep) 80%,#000)" stroke-width="1" opacity=".55" fill="none"/>' +
      (n != null ? '<text x="50" y="63" text-anchor="middle" font-family="var(--serif)" font-weight="700" font-size="' + (String(n).length > 1 ? 26 : 30) + '" fill="var(--on-gold)">' + esc(n) + '</text>' : '<text x="50" y="62" text-anchor="middle" font-family="var(--sans)" font-weight="700" font-size="15" fill="var(--on-gold)">d' + esc(sides || '') + '</text>') + '</svg>';
  }
  function fmtTime(ts) { try { var a = Date.now() - ts; if (a < 60000) return 'just now'; return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function logRows(n) {
    var list = []; try { list = (typeof rollFeedLoad === 'function' ? rollFeedLoad() : []).slice(0, n); } catch (e) {}
    if (!list.length) return '<div class="t-meta" style="padding:10px 14px">Your rolls this session show here.</div>';
    return list.map(function (r) { return '<div class="row"><span class="lead">' + ic('d20', 'sm') + '</span><div class="grow"><div class="t-h3 ell">' + esc(r.label) + '</div><div class="t-meta ell">' + esc(minus(r.dice || '')) + ' \u00b7 ' + esc(fmtTime(r.ts)) + '</div></div><span class="v">' + esc(r.total) + '</span></div>'; }).join('');
  }
  function smiteOpt(d) {
    if (!d || !d.layeredOptions) return null;
    var applied = d.layeredApplied || [];
    if (applied.some(function (id) { return /^smite_/.test(id); })) return null;
    return d.layeredOptions.filter(function (o) { return /^smite_\d+$/.test(o.id); }).sort(function (a, b) { return parseInt(a.id.slice(6), 10) - parseInt(b.id.slice(6), 10); })[0] || null;
  }
  function body() {
    var s = dlgState(), o = s.o, line = s.line, d = s.d; if (!o) return '';
    var isD20 = line && line.kind === 'd20', nat = isD20 ? natOf(line) : null, vals = isD20 ? d20Vals(line) : [];
    var adv = (line && line.advantage) || 'normal', locked = isD20 && (vals.length > 1 || (line && line._uAdv));
    var title = [d && d.title, o.title || o.label].filter(Boolean).map(esc).join(' \u00b7 ');
    var md = (line && line.mod) || 0, modTxt = (md < 0 ? ' \u2212 ' : ' + ') + Math.abs(md);
    var brk = isD20 && vals.length ? (vals.length > 1 ? '[' + vals.join(', ') + '] \u2192 ' : '') + nat + modTxt : esc(minus(o.detail || o.formula || ''));
    var sides = null; if (!isD20 && line) { var ds = Array.isArray(line.dice) ? line.dice[0] : line.dice; sides = ds && ds.sides; }
    var next = o.nextLineIdx != null && d ? d.lines[o.nextLineIdx] : null;
    var nextLbl = next ? (o.nextLabel || 'Roll next').replace(/^Roll Damage/, 'Roll damage').replace(/^Roll Healing/, 'Roll healing') + (next.formula ? ' ' + String(next.formula).replace(/\s*\+\s*/g, '+').replace(/\s+(slashing|piercing|bludgeoning|radiant|fire|cold|acid|lightning|necrotic|poison|psychic|thunder|force).*$/i, '') : '') : '';
    var sm = isD20 && line && line.isAttack ? smiteOpt(d) : null;
    var smDice = sm ? (/\+\s*(\d+d\d+)/.exec(sm.sub || sm.desc || sm.label || '') || [])[1] || '' : '';
    if (sm && !smDice) { var lv = parseInt(sm.id.slice(6), 10) || 1; smDice = Math.min(5, 1 + lv) + 'd8'; }
    var natPill = isD20 && (nat === 20 || nat === 1) ? '<span class="verdict ' + (nat === 20 ? 'crit' : 'fumble') + '">Natural ' + nat + (nat === 20 && line.isAttack ? ' \u00b7 critical hit' : '') + '</span>' : '';
    var h = '<div class="hstack gap2 dc-head"><span class="t-label">' + title + '</span>' + (linked() ? '<span class="mla tag moss">' + ic('check', 'sm') + ' Shared with your DM</span>' : '<span class="mla tag">' + ic('list', 'sm') + ' In your roll log</span>') + '</div>' +
      '<div class="dc-res"><div class="dc-die">' + dieSVG(nat, sides) + '</div><div class="dc-num"><div class="dc-total">' + esc(o.total) + '</div><div class="dc-brk">' + brk + '</div>' + (natPill ? '<div style="margin-top:10px">' + natPill + '</div>' : '') + '</div></div>' +
      '<div data-dc-slot="emp"></div>' +
      (isD20 ? '<div class="dc-adv" role="group" aria-label="Advantage">' + [['adv', 'Advantage'], ['normal', 'Normal'], ['dis', 'Disadvantage']].map(function (x) {
        var on = x[0] === adv; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-u-act="dc-adv" data-v="' + x[0] + '" aria-pressed="' + on + '"' + (locked && !on ? ' disabled' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="dc-acts' + (next && sm ? '' : ' one') + '">' +
        (next ? '<button type="button" class="btn primary lg" data-u-act="dc-next">' + ic('d20', 'sm') + '<span>' + esc(nextLbl) + '</span></button>' : '<button type="button" class="btn primary lg" data-u-act="dc-done">' + ic('check', 'sm') + '<span>' + esc(o.commitLabel || 'Done') + '</span></button>') +
        (sm && next ? '<button type="button" class="btn lg" data-u-act="dc-smite" data-v="' + esc(sm.id) + '">' + ic('flame', 'sm') + '<span>Smite +' + esc(smDice) + '</span></button>' : '') +
      '</div>' +
      '<div class="hstack dc-foot"><button type="button" class="btn ghost sm" data-u-act="dc-back">' + ic('left', 'sm') + '<span>Back to the roll</span></button>' + (next && o.commitLabel ? '<button type="button" class="btn ghost sm mla" data-u-act="dc-done">' + esc(o.commitLabel) + '</button>' : '') + '</div>' +
      '<div class="t-meta dc-note">' + ic('tv', 'sm') + '<span>Your DM decides if a roll is shown on the projector. Nothing goes there automatically.</span></div>' +
      (U.isDesk() ? '' : '<div class="list log dc-plog">' + logRows(2) + '</div>');
    return h;
  }
  function decorate() {
    var dlg = D.querySelector('.roll-outcome-dialog'); if (!dlg || dlg.dataset.u) return;
    dlg.dataset.u = '1';
    var st = dlg.querySelector('.roll-outcome-stage'); if (st) st.classList.add('u-dc-app');
    var card = D.createElement('div'); card.className = 'u-dc'; card.innerHTML = U.px(body());
    dlg.insertBefore(card, dlg.firstChild);
    var emp = dlg.querySelector('.roll-outcome-empowered'), es = card.querySelector('[data-dc-slot="emp"]'); if (emp && es) es.appendChild(emp);
    var bd = dlg.closest('#rollOutcomeBackdrop');
    if (bd && U.isDesk() && !bd.querySelector('.u-dclog')) {
      var log = D.createElement('div'); log.className = 'u-card u-raised u-log u-dclog'; log.setAttribute('aria-label', 'Roll log');
      log.innerHTML = U.px('<div class="hstack" style="padding:0 14px"><span class="t-h2">Roll log</span><button type="button" class="sec-link" style="margin-left:auto" data-u-act="dc-log">All rolls</button></div><div class="list" style="margin-top:12px">' + logRows(9) + '</div><div class="t-meta" style="padding:14px 14px 0">' + (linked() ? 'Your rolls are shared with your DM\u2019s roll log only.' : 'Rolls stay on this device until you join a game.') + '</div>');
      bd.appendChild(log);
    }
  }
  function app(id) { return D.getElementById(id); }
  U.actions['dc-next'] = function () { var b = app('rollOutcomeNext'); if (b) b.click(); };
  U.actions['dc-back'] = function () { var b = app('rollOutcomeBack'); if (b) b.click(); };
  U.actions['dc-done'] = function () {
    var c = app('rollOutcomeCommit'); if (c) { c.click(); return; }
    var b = app('rollOutcomeBack'); if (b) b.click(); // back to the roll dialog, then its Done closes (and commits) it
    var dd = app('rollDialogDone'); if (dd) dd.click();
  };
  U.actions['dc-log'] = function () { var b = app('rollOutcomeBack'); if (b) b.click(); var dd = app('rollDialogDone'); if (dd) dd.click(); state.ui.hfRollLogOpen = true; render(); };
  U.actions['dc-smite'] = function (t) {
    // Smite: back to the roll, add the app's own Divine Smite layer, then roll damage (the smite dice follow).
    var s = dlgState(), id = t.dataset.v; if (!s.d) return;
    var b = app('rollOutcomeBack'); if (b) b.click();
    var add = D.querySelector('.roll-dialog [data-add-layer="' + id + '"]'); if (add) add.click();
    var dmg = D.querySelector('.roll-dialog .roll-line:not(.locked) [data-roll-line]:not([disabled])');
    var lines = (state.ui.rollDialog && state.ui.rollDialog.lines) || [];
    var idx = lines.findIndex(function (l) { return l.kind === 'damage' && l.result == null; });
    var btn = idx >= 0 ? D.querySelector('.roll-dialog [data-roll-line="' + idx + '"]') : dmg; if (btn) btn.click();
  };
  U.actions['dc-adv'] = function (t) {
    // Advantage / disadvantage after a straight roll: roll the second d20 now and keep the higher / lower one.
    // The first die stands; once a second die is rolled the choice is locked. Both dice go to the roll log.
    var s = dlgState(), line = s.line, mode = t.dataset.v; if (!line || line.kind !== 'd20') return;
    var vals = d20Vals(line); if (vals.length !== 1 || mode === 'normal' || line._uAdv) return;
    var r1 = vals[0], r2 = rollDie(20), chosen = mode === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2);
    var c2 = chosen; if (line.reliableTalent && c2 < 10) c2 = 10;
    var total = c2 + (line.mod || 0); if (line.indomitableMightFloor && total < line.indomitableMightFloor) total = line.indomitableMightFloor;
    line.advantage = mode; line._uAdv = true; line.result = total;
    var wasCrit = !!line.isCrit; line.isCrit = !!line.isAttack && chosen >= (line.critThreshold || 20);
    line.rollDetail = 'd20(' + mode + ') [' + r1 + ', ' + r2 + '] ' + fmtMod(line.mod || 0) + ' = ' + total;
    var d = s.d, idx = d.lines.indexOf(line);
    for (var i = idx + 1; i < d.lines.length; i++) { var n = d.lines[i]; if (n.static || n.kind !== 'damage' || n.result != null || (n.pairsWith != null && n.pairsWith !== idx)) continue;
      if (line.isCrit && !wasCrit) { n.crit = true; if (n.formula.indexOf('(crit') < 0) n.formula += ' (' + critLabel() + ')'; }
      if (!line.isCrit && wasCrit) { n.crit = false; n.formula = String(n.formula).replace(/\s*\(crit[^)]*\)/, ''); } }
    try { hearthDiceFromLine(line); } catch (e) {}
    state.ui.rollOutcome = hearthMakeRollOutcome(d, line, idx);
    render();
  };
  new MutationObserver(function () { if (D.querySelector('.roll-outcome-dialog:not([data-u])')) decorate(); }).observe(D.body, { childList: true, subtree: true });
  U.addCss('u2-css-dice', [
    '#rollOutcomeBackdrop{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(0,0,0,.5)!important}',
    '.!roll-outcome-dialog{width:640px!important;max-width:calc(100vw - 32px)!important;padding:22px 24px 20px!important;text-align:left!important;background:var(--tex),var(--u-surface)!important;border:1px solid var(--gold-deep)!important;border-radius:var(--r-lg)!important;box-shadow:inset 0 0 0 4px rgba(0,0,0,.2),inset 0 0 0 5px var(--hair),var(--sh3)!important;color:var(--ink)!important}',
    '.u-desk #rollOutcomeBackdrop{display:block!important}',
    '.u-desk .!roll-outcome-dialog{position:fixed!important;top:150px!important;left:calc(272px + (100vw - 272px - 640px - var(--dclog) - 24px) / 2)!important;transform:none!important;margin:0!important;width:min(640px,calc(100vw - 272px - var(--dclog) - 88px))!important}',
    '.u-desk{--dclog:420px}',
    '@media (max-width:1599px){.u-desk{--dclog:340px}}',
    '.dc-app{display:none!important}',
    '.dc-head .t-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '.dc-res{display:flex;align-items:center;gap:28px;margin:18px 0 6px}',
    '.dc-die{width:150px;height:150px;flex:none;filter:drop-shadow(0 12px 24px rgba(0,0,0,.7)) drop-shadow(0 0 30px color-mix(in srgb,var(--ember) 35%,transparent))}',
    '.dc-die .die-svg{width:100%;height:100%}',
    '.dc-num{min-width:0}',
    '.dc-total{font:700 84px/1 var(--serif);background:var(--brass-grad);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '.dc-brk{font:500 16px var(--sans);color:var(--ink-soft);margin-top:4px}',
    '.verdict{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:999px;font:700 13px var(--sans);letter-spacing:.4px;color:var(--gold);border:1px solid var(--rim-strong);background:color-mix(in srgb,var(--gold) 10%,transparent)}',
    '.verdict.fumble{color:var(--crimson-ink);border-color:color-mix(in srgb,var(--oxblood) 55%,transparent);background:color-mix(in srgb,var(--oxblood) 12%,transparent)}',
    '.dc-adv{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}',
    '.dc-adv .chip{cursor:pointer}.dc-adv .chip[disabled]{opacity:.45;cursor:default}',
    '.dc-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dc-acts.one{grid-template-columns:1fr}',
    '.dc-acts .btn{min-width:0}.dc-acts .btn span{overflow:hidden;text-overflow:ellipsis}',
    '.dc-foot{margin-top:10px;min-height:32px}',
    '.dc-note{display:flex;gap:8px;align-items:flex-start;margin-top:8px}',
    '.dc .!roll-outcome-empowered{margin:10px 0 0}',
    '.dclog{position:fixed;z-index:2;right:32px;top:150px;width:var(--dclog);max-height:calc(100vh - 190px);overflow:auto;padding:20px 8px 18px}',
    '.log .row{min-height:58px}.log .v{font:700 22px var(--serif);min-width:40px;text-align:right;color:var(--ink)}',
    '.dc-plog{margin:14px -8px 0;border-top:1px solid var(--hair)}',
    '.u-phone .!roll-outcome-dialog{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;max-width:none!important;max-height:calc(100vh - 150px)!important;overflow:auto!important;border-radius:var(--r-xl) var(--r-xl) 0 0!important;transform:none!important;margin:0!important;padding:28px 18px 24px!important;border-bottom:0!important}',
    '.u-phone .!roll-outcome-dialog:before{content:"";position:absolute;left:50%;top:10px;width:40px;height:5px;margin-left:-20px;border-radius:3px;background:var(--rim-strong)}',
    '.u-phone .dc-res{gap:20px;margin:14px 0 4px}.u-phone .dc-die{width:118px;height:118px}.u-phone .dc-total{font-size:64px}',
    '.u-phone .dc-adv .chip{height:44px;flex:1;justify-content:center;padding:0 10px}',
    '.u-phone .dc-acts .btn{height:52px;padding:0 10px}',
    '.u-phone .dc-foot .btn{height:44px}'
  ].join('\n'));
})();
