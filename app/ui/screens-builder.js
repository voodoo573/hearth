// Hearth UI polish — character builder. Every step is still the app's own wizard (renderBuild + wireWizardNav);
// on desktop this arranges it as Jenny's stepper rail | step card | parchment detail panel, and restyles the
// class cards. The 2024 (5.5e) builder is left as the app draws it, inside the new shell.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, ibtn = U.ibtn, esc = U.esc, D = document;
  var NAMES = { name: 'Name & level', race: 'Race', 'class': 'Class', subclass: 'Subclass', style: 'Fighting style', background: 'Background', bgchoices: 'Background choices', abilities: 'Ability scores', skills: 'Skills', spells: 'Spells', equipment: 'Equipment', identity: 'Look & identity', review: 'Review' };
  function steps() {
    var d = state.draft; if (!d || typeof WIZARD_STEPS === 'undefined') return [];
    return WIZARD_STEPS.map(function (s, i) { return [s, i]; }).filter(function (x) {
      var s = x[0];
      try {
        if (s === 'spells' && d.klass && !CLASSES[d.klass].spellcaster) return false;
        if (s === 'subclass' && d.klass) { var p = subclassPickLevel(d.klass); if (!p || d.level < p) return false; }
        if (s === 'style' && d.klass && !shouldHaveFightingStyle(d)) return false;
        if (s === 'bgchoices' && !bgChoiceInfo(d)) return false;
      } catch (e) {}
      return true;
    });
  }
  function val(s) {
    var d = state.draft || {};
    try {
      if (s === 'name') return d.name || '';
      if (s === 'race') return d.race && RACES[d.race] ? RACES[d.race].name : '';
      if (s === 'class') return d.klass && CLASSES[d.klass] ? CLASSES[d.klass].name : '';
      if (s === 'background') return d.background && BACKGROUNDS[d.background] ? BACKGROUNDS[d.background].name : '';
    } catch (e) {}
    return '';
  }
  function railHTML() {
    var l = steps(), cur = state.wizardStep, n = l.findIndex(function (x) { return x[1] === cur; });
    return '<div class="card brail"><div class="t-label">Step ' + (n + 1) + ' of ' + l.length + '</div><ol class="bsteps">' + l.map(function (x, k) {
      var st = x[1] < cur ? 'done' : x[1] === cur ? 'cur' : '';
      return '<li class="bs ' + st + '"' + (st === 'cur' ? ' aria-current="step"' : '') + '><span class="bn">' + (st === 'done' ? ic('check', 'sm') : (k + 1)) + '</span><span class="f1">' + esc(NAMES[x[0]] || x[0]) + '</span><span class="t-meta ell">' + esc(val(x[0])) + '</span></li>';
    }).join('') + '</ol><div class="t-meta" style="margin-top:auto">Progress saves as you go. Leave any time and pick up from Characters.</div></div>';
  }
  var AB = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  function detailHTML() {
    var d = state.draft || {}, k = d.klass, c = k && typeof CLASSES !== 'undefined' ? CLASSES[k] : null;
    if (!c) return '<div class="card parch bdet"><div class="t-label">Your hero so far</div><div class="t-h2" style="margin-top:8px;color:var(--parch-ink)">' + esc(d.name || 'Unnamed hero') + '</div><div class="t-body" style="margin-top:8px">' + esc([val('race'), val('background')].filter(Boolean).join(' · ') || 'Pick a race and a class to see what they bring.') + '</div></div>';
    var cap = function (a) { return (a || []).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join(', '); };
    var kv = [['Hit die', 'd' + c.hitDie], ['Hit points at 1st level', c.hitDie + ' + CON'], ['Saving throws', (c.saves || []).map(function (s) { return AB[s]; }).join(', ')], ['Armour', cap(c.armor)], ['Weapons', cap(c.weapons)], ['Skills', 'Choose ' + c.skillCount], ['Spellcasting', c.spellcaster ? (c.spellcastingType === 'half' ? 'From level 2' : c.spellcastingType === 'pact' ? 'Pact magic' : 'From level 1') + ' (' + AB[c.spellAbility] + ')' : 'None']];
    var f1 = ((c.levelFeatures || {})[1] || []).map(function (f) { return '<div style="margin-top:6px"><b>' + esc(f.name) + '.</b> ' + esc(f.desc) + '</div>'; }).join('');
    var ex = detailExtra(k) || {}; if (ex.sub) kv.push(['Subclass', ex.sub]);
    var role = CL[k] ? CL[k][1].replace(/an oath$/, 'a sacred oath') : c.name;
    return '<div class="card parch bdet"><div class="t-label">' + esc(c.name) + '</div><div class="t-h2" style="margin-top:6px;color:var(--parch-ink)">' + esc(role) + '</div><div class="bkv">' + kv.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' + (f1 ? '<div class="t-label" style="margin-top:16px">Level 1 features</div><div style="font-size:13px">' + f1 + '</div>' : '') + (ex.subs || '') +
      (ex.tip ? '<div class="btip">' + esc(ex.tip).replace(/^(Good first pick\.)/, '<b>$1</b>') + '</div>' : '') + '<div class="t-meta" style="margin-top:auto;padding-top:16px">SRD 5.1 · CC-BY-4.0 · complexity \u25cf easy \u25cf\u25cf\u25cf involved</div></div>';
  }

  // ---------- class step (Jenny's builder-desk / builder-phone) ----------
  var CL = { barbarian: ['flame', 'Rage-fuelled front-liner', 'STR', 1, 'Primal Path'], bard: ['sparkle', 'Magic through music and wit', 'CHA', 2, 'Bard College'],
    cleric: ['sun', 'Divine magic and healing', 'WIS', 2, 'Divine Domain'], druid: ['feather', 'Nature magic, Wild Shape', 'WIS', 3, 'Druid Circle'],
    fighter: ['sword', 'Master of weapons and armour', 'STR or DEX', 1, 'Martial Archetype'], monk: ['hand', 'Martial arts and ki', 'DEX & WIS', 2, 'Monastic Tradition'],
    paladin: ['shield', 'Holy warrior bound by an oath', 'STR & CHA', 2, 'Sacred Oath'], ranger: ['pin', 'Hunter and tracker of the wilds', 'DEX & WIS', 2, 'Ranger Archetype'],
    rogue: ['eyeoff', 'Stealth, skill and Sneak Attack', 'DEX', 2, 'Roguish Archetype'], sorcerer: ['bolt', 'Innate, flexible magic', 'CHA', 3, 'Sorcerous Origin'],
    warlock: ['moon', 'Power from an otherworldly pact', 'CHA', 2, 'Otherworldly Patron'], wizard: ['book', 'Scholarly arcane spellcasting', 'INT', 3, 'Arcane Tradition'] };
  var TIP = { barbarian: 'Good first pick. Lots of hit points and one big button: Rage.', fighter: 'Good first pick. Sturdy, simple, and great with any weapon.', paladin: 'Good first pick. Tough, heals allies and has simple, powerful choices each turn.',
    rogue: 'Skilled and sneaky. One big hit a turn with Sneak Attack.', cleric: 'Heals and protects the party; armour and spells both.', bard: 'Helps everyone: inspiration, skills and spells.', ranger: 'Ranged or two weapons, with a little nature magic.',
    monk: 'Fast and slippery; many small choices each turn.', warlock: 'Few spell slots that come back on a short rest; strong blasts.', druid: 'Lots of spells plus Wild Shape. More to track.', sorcerer: 'A short spell list you can bend with metamagic.', wizard: 'The biggest spell list in the game. Plan ahead.' };
  var GROUPS = { martial: ['barbarian', 'fighter', 'monk', 'rogue'], casters: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'], half: ['paladin', 'ranger'] };
  var clsFilter = 'all';
  function hbClasses() { var out = {}, n = 0; try { Object.keys(SUBCLASSES).forEach(function (k) { Object.keys(SUBCLASSES[k] || {}).forEach(function (id) { if (SUBCLASSES[k][id] && SUBCLASSES[k][id]._homebrew) { out[k] = 1; n++; } }); }); } catch (e) {} return { set: out, n: n }; }
  function inFilter(k) { if (clsFilter === 'all') return true; if (clsFilter === 'homebrew') return !!hbClasses().set[k]; return (GROUPS[clsFilter] || []).indexOf(k) >= 0; }
  function nextStepName() {
    var l = steps(), cur = state.wizardStep, i = l.findIndex(function (x) { return x[1] === cur; });
    var nx = l[i + 1]; return nx ? (NAMES[nx[0]] || nx[0]) : '';
  }
  U.actions['build-filter'] = function (t) { clsFilter = t.dataset.v; render(); };
  U.actions['build-menu'] = function () {
    var m = U.modal({ id: 'build-menu', cls: 'csdlg', label: 'Character builder', width: 420, html: function () {
      return '<div class="t-label" style="margin:0 0 8px">' + esc((state.draft && state.draft.name) || 'New character') + '</div><div class="list">' +
        '<button type="button" class="row cs-mrow" data-u-act="build-exit">' + ic('x') + '<span class="grow">Save &amp; exit</span></button>' +
        (D.getElementById('cancelBtn') ? '<button type="button" class="row cs-mrow cs-danger" data-u-act="build-discard">' + ic('trash') + '<span class="grow">' + esc(D.getElementById('cancelBtn').textContent.replace(/^Cancel\s*\u2014\s*/, '').replace(/^./, function (c) { return c.toUpperCase(); })) + '</span></button>' : '') + '</div>';
    } });
    U._buildMenu = m;
  };
  U.actions['build-discard'] = function () { if (U._buildMenu) U._buildMenu.close('act'); var b = D.getElementById('cancelBtn'); if (b) b.click(); };
  function classStep(c, desk) {
    var grid = c.querySelector('.card-grid'); if (!grid || !grid.querySelector('[data-class]')) return;
    var sec = grid.closest('.section'), d = state.draft || {};
    if (sec) { sec.classList.add('u-bclass'); var lab = sec.querySelector('.section-label'), hlp = sec.querySelector('.section-helper');
      if (lab) { lab.className = 'u-t-h1 u-bct'; lab.textContent = 'Choose a class'; }
      if (hlp) { hlp.className = (desk ? 'u-t-body' : 'u-t-meta') + ' u-bch'; hlp.textContent = desk ? 'Your class shapes how you fight, cast and help the party. You can multiclass later.' : 'Shapes how you fight, cast and help the party.'; }
      var hb = hbClasses(), chips = D.createElement('div'); chips.className = 'u-chips u-bchips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Filter classes');
      chips.innerHTML = U.px([['all', 'All ' + grid.querySelectorAll('[data-class]').length], ['martial', 'Martial'], ['casters', 'Spellcasters'], ['half', 'Half-casters']].concat(hb.n ? [['homebrew', 'Homebrew <b>' + hb.n + '</b>']] : []).map(function (x) {
        return '<button type="button" class="chip' + (clsFilter === x[0] ? ' on' : '') + '" data-u-act="build-filter" data-v="' + x[0] + '" aria-pressed="' + (clsFilter === x[0]) + '">' + x[1] + '</button>'; }).join(''));
      if (!desk) chips.classList.add('u-bchips-p');
      grid.parentNode.insertBefore(chips, grid);
    }
    [].slice.call(c.querySelectorAll('.step-tip')).forEach(function (t) { t.remove(); }); // the duplicate intro banner
    grid.classList.add('u-bgridc');
    [].slice.call(grid.querySelectorAll('[data-class]')).forEach(function (b) {
      var k = b.getAttribute('data-class'), info = CL[k] || ['sword', '', '', 2], cd = CLASSES[k] || {}, sel = d.klass === k, dots = '';
      for (var i = 0; i < 3; i++) dots += '<i class="' + (i < info[3] ? '' : 'u') + '"></i>';
      b.innerHTML = U.px('<div class="hstack gap3 bch"><span class="lead">' + ic(info[0]) + '</span><div class="f1" style="min-width:0"><div class="t-h3">' + esc(cd.name || k) + '</div><div class="t-meta">Hit die d' + esc(cd.hitDie) + '</div></div>' + (sel ? '<span class="tick">' + ic('check', 'sm') + '</span>' : '') + '</div>' +
        '<div class="t-body brole">' + esc(info[1]) + '</div><div class="hstack bcx"><span class="t-meta">' + esc(info[2]) + '</span><span class="mla pips round" role="img" aria-label="Complexity ' + info[3] + ' of 3">' + dots + '</span></div>');
      b.classList.add('u-bcls'); b.setAttribute('aria-pressed', String(sel));
      if (!inFilter(k)) b.hidden = true;
    });
    if (!desk && d.klass && CLASSES[d.klass]) { // phone: the parchment summary under the grid
      var k2 = d.klass, c2 = CLASSES[d.klass], sum = D.createElement('div'); sum.className = 'u-card u-parch u-bsum';
      sum.innerHTML = U.px('<div class="hstack"><b class="t-h3">' + esc(c2.name) + '</b><span class="mla t-meta">d' + esc(c2.hitDie) + ' \u00b7 saves ' + esc((c2.saves || []).map(function (x) { return AB[x]; }).join(', ')) + '</span></div><div style="font-size:13px;margin-top:6px">' + esc(CL[k2] ? CL[k2][1] : '') + '. ' + esc(TIP[k2] || '') + '</div>');
      grid.after(sum);
    }
  }
  function footer(c, desk) {
    var nav = c.querySelector('.nav-buttons'); if (!nav) return;
    nav.classList.add('u-bfoot');
    var back = nav.querySelector('#backBtn'), next = nav.querySelector('#nextBtn'), nn = nextStepName(), d = state.draft || {};
    if (back) { back.className = 'u-btn u-lg u-bback'; back.innerHTML = U.px(ic('left', 'sm') + (desk ? '<span>Back</span>' : '')); back.setAttribute('aria-label', 'Back'); }
    if (next) { var last = /Save/.test(next.textContent); next.className = 'u-btn u-primary u-lg u-bnext'; next.innerHTML = U.px('<span>' + (last ? 'Save &amp; play' : 'Next' + (nn ? ': ' + esc(nn) : '')) + '</span>' + ic(last ? 'check' : 'right', 'sm')); }
    if (desk && next && state.wizardStep != null && WIZARD_STEPS[state.wizardStep] === 'class' && d.klass) {
      var pl = 0; try { pl = subclassPickLevel(d.klass); } catch (e) {}
      var hint = D.createElement('span'); hint.className = 'u-t-meta u-mla u-bhint';
      hint.textContent = 'Next: ' + (pl && pl > (d.level || 1) ? 'Subclass at level ' + pl + ' \u00b7 ' : '') + (nn || '');
      nav.insertBefore(hint, next);
    }
    var cancel = c.querySelector('#cancelBtn'); if (cancel) cancel.classList.add('u-bcancel'); // reachable from the builder's menu
  }
  function detailExtra(k) {
    var c = CLASSES[k], info = CL[k]; if (!c || !info) return '';
    var pl = 0; try { pl = subclassPickLevel(k); } catch (e) {}
    var subs = []; try { subs = Object.keys(SUBCLASSES[k] || {}).map(function (id) { var x = SUBCLASSES[k][id]; return { n: x.name, hb: !!x._homebrew }; }); } catch (e) {}
    subs.sort(function (a, b) { return (a.hb - b.hb); });
    var shown = subs.slice(0, 2), more = subs.length - shown.length;
    return { sub: info[4] + (pl ? ', level ' + pl : ''), subs: subs.length ? '<div class="t-label" style="margin-top:16px">' + esc(info[4]) + 's</div><div style="font-size:13px;margin-top:6px">' + shown.map(function (x) { return '<div>' + esc(x.n) + ' <span class="t-meta">\u00b7 ' + (x.hb ? 'your homebrew' : 'SRD') + '</span></div>'; }).join('') + (more > 0 ? '<div class="t-meta">+ ' + more + ' more in Hearth</div>' : '') + '</div>' : '', tip: TIP[k] || '' };
  }
  function phoneHead(c) {
    c.classList.add('u-buildp');
    var l = steps(), cur = state.wizardStep, n = l.findIndex(function (x) { return x[1] === cur; }), d = state.draft || {};
    var h = D.createElement('div'); h.className = 'u-bph';
    h.innerHTML = U.px('<div class="hstack"><span class="t-label">Step ' + (n + 1) + ' of ' + l.length + ' \u00b7 ' + esc(NAMES[(l[n] || [])[0]] || '') + '</span><span class="mla t-meta ell">' + esc([d.name, val('race')].filter(Boolean).join(' \u00b7 ')) + '</span></div><div class="prog"><i style="width:' + Math.round(100 * (n + 1) / Math.max(1, l.length)) + '%"></i></div>');
    c.insertBefore(h, c.firstChild);
  }
  U.actions['build-exit'] = function () { try { saveDraftProgress(); } catch (e) {} U.go('home'); };
  U.screens.builder = {
    nav: 'play',
    meta: function () { var d = state.draft; return { title: 'New character', meta: d ? esc([d.name, val('race'), val('class')].filter(Boolean).join(' · ') || 'Build a hero step by step') : 'Build a hero step by step', actions: d ? btn('Save &amp; exit', 'ghost', 'x', 'data-u-act="build-exit"') + ibtn('more', 'data-u-act="build-menu"', false, 'Builder menu') : '', back: 'home', noTabs: !!d && !U.isDesk() && !(typeof currentEdition === 'function' && currentEdition() === '5.5e'), psub: '', ptitle: 'New character', pright: d ? btn('Save &amp; exit', 'ghost sm', '', 'data-u-act="build-exit"') + ibtn('morev', 'data-u-act="build-menu"', true, 'Builder menu') : '' }; },
    after: function (c) {
      if (!c.querySelector('.stepper') || !state.draft || currentEdition() === '5.5e') return;
      var desk = U.isDesk();
      classStep(c, desk); footer(c, desk);
      if (!desk) { phoneHead(c); return; }
      c.classList.add('u-build');
      var g = D.createElement('div'); g.className = 'u-bgrid';
      g.innerHTML = U.px(railHTML() + '<div class="card bmain"></div><div class="bside"></div>');
      var main = g.querySelector('.u-bmain'), side = g.querySelector('.u-bside');
      [].slice.call(c.children).forEach(function (k) { if (!k.matches('.dialog-backdrop,script,style')) main.appendChild(k); });
      var det = main.querySelector('.selection-detail');
      side.innerHTML = U.px(detailHTML());
      if (main.querySelector('[data-class]') && state.draft.klass) main.classList.add('u-has-class');
      if (det && !main.querySelector('[data-class]')) { det.classList.add('u-moved'); side.firstChild.appendChild(det); }
      c.insertBefore(g, c.firstChild);
    },
    css: [
      '#content.build{max-width:none!important;padding:24px 32px 32px!important}',
      '.bgrid{display:grid;grid-template-columns:300px minmax(0,1fr) 380px;gap:24px;align-items:stretch;min-height:calc(100vh - 88px - 64px)}',
      '.brail{padding:20px;display:flex;flex-direction:column;gap:14px}.bsteps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}',
      '.bs{display:flex;align-items:center;gap:12px;height:44px;padding:0 10px;border-radius:10px;color:var(--ink-soft);font:600 14px var(--sans)}.bs .t-meta{max-width:90px}',
      '.bs.cur{color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,transparent);box-shadow:inset 0 0 0 1px var(--rim)}',
      '.bn{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--rim-strong);font:700 12px var(--sans)}.bs.done .bn{background:var(--gold);border-color:var(--gold);color:var(--on-gold)}',
      '.bmain{padding:24px 28px;min-width:0}.bmain>.!stepper{display:none}',
      '.bmain .!card-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px}',
      '.bmain .!card-grid>.!card{min-height:96px;text-align:left;padding:16px!important}',
      '.bmain .!nav-buttons{display:flex;justify-content:space-between;gap:12px;margin-top:24px}.bmain .!nav-buttons>.!btn{flex:0 0 auto;min-width:140px}',
      '.bside{display:flex;flex-direction:column}.bdet{padding:22px;display:flex;flex-direction:column;flex:1}',
      '.bkv{margin-top:14px}.bkv>div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.14);font-size:13px}',
      '.bmain .!selection-detail{margin-top:18px}',
      '.bmain .!card-grid>.!card.!selected{box-shadow:inset 0 0 0 2px var(--gold),var(--sh2)!important;border-color:var(--gold)!important}',
      '.bmain.has-class .!selection-detail{display:none}',
      '.bclass{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}',
      '.bclass>.bct{margin:0}.bclass>.bch{margin:4px 0 0}',
      '.bcls .pips i{width:10px;height:10px}',
      '.bchips{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}',
      '.u-phone .bchips{flex-wrap:nowrap;overflow-x:auto;margin:14px -16px;padding:0 16px;scrollbar-width:none}.u-phone .bchips>*{flex:none}',
      '.u-phone .bfoot{position:sticky;bottom:0;z-index:4;background:linear-gradient(transparent,var(--bg) 18px);padding:22px 0 12px!important;border-top:0!important;margin-top:8px!important}',
      '.bchips .chip{cursor:pointer}',
      '.bgridc{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:1fr;gap:14px!important}',
      '.bgridc>.bcls{display:flex!important;flex-direction:column;gap:6px;padding:18px!important;text-align:left!important;min-height:0!important;position:relative;background:var(--tex),var(--u-surface)!important;border:1px solid var(--rim)!important;border-radius:var(--r-md)!important;color:var(--ink)!important;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--gold) 14%,transparent),var(--sh1)!important;cursor:pointer}',
      '.bgridc>.bcls[hidden]{display:none!important}',
      '.bgridc>.bcls.!selected{box-shadow:var(--glow),var(--sh2)!important;border-color:var(--gold)!important}',
      '.bcls .lead{width:46px;height:46px}.bcls .t-h3{font-size:17px}',
      '.bcls .tick{margin-left:auto;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--brass-grad);color:var(--on-gold);flex:none}',
      '.bcls .brole{font-size:13px;margin-top:4px;color:var(--ink-soft)}',
      '.bcls .bcx{margin-top:auto;padding-top:8px}',
      '.bfoot{display:flex!important;align-items:center;gap:12px;padding-top:18px;margin-top:18px!important;border-top:1px solid var(--hair)}',
      '.bfoot>.bback{flex:0 0 auto!important;min-width:0!important;width:auto!important}',
      '.bfoot>.bnext{flex:0 0 auto!important;min-width:0!important;width:auto!important;margin-left:auto}',
      '.bfoot>.bhint+.bnext{margin-left:0}',
      '.bcancel{display:none!important}',
      '.btip{margin-top:16px;padding:12px 14px;border-radius:10px;background:color-mix(in srgb,var(--parch-ink) 8%,transparent);border:1px solid color-mix(in srgb,var(--parch-ink) 18%,transparent);font-size:13px;line-height:1.45}',
      '.u-phone .bgridc.!card-grid{grid-template-columns:1fr 1fr!important;gap:10px!important;grid-auto-rows:auto}',
      '.u-phone .bgridc>.bcls{padding:12px!important;min-height:64px!important}',
      '@media (max-width:1599px){.bgrid{grid-template-columns:250px minmax(0,1fr) 330px}.bmain .bgridc.!card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
      '@media (max-width:1599px){.bfoot>.bhint{display:none}.bfoot>.bnext{margin-left:auto}.bfoot .!btn{white-space:nowrap}}',
      '@media (max-width:1439px){.bgrid{grid-template-columns:210px minmax(0,1fr) 280px;gap:18px}.bmain .bgridc.!card-grid{gap:10px!important}.bgridc>.bcls{padding:12px!important}.bcls .u-t-h3{font-size:15px}.bdet{padding:18px}}',
      '.bcls .u-tick{position:absolute;right:12px;top:12px}',
      '.u-phone .bcls .brole,.u-phone .bcls .bcx{display:none}.u-phone .bcls .lead{width:38px;height:38px}.u-phone .bcls .t-h3{font-size:15px}',
      '.u-phone .bcls .tick{position:absolute;right:8px;top:8px;width:22px;height:22px}',
      '.u-phone .bchips-p{flex-wrap:nowrap;overflow-x:auto;margin:12px -16px;padding:0 16px;scrollbar-width:none}',
      '.u-phone .bchips-p .chip{height:44px}',
      '.bsum{padding:14px 16px;margin-top:14px}','.u-phone .bclass .!selection-detail{display:none}',
      '.bph{margin:0 0 16px}.bph .prog{height:6px;border-radius:3px;background:var(--well);overflow:hidden;margin-top:10px}.bph .prog i{display:block;height:100%;background:var(--brass-grad);box-shadow:0 0 8px var(--ember)}',
      '#content.buildp>.!stepper{display:none}',
      '.u-phone .bfoot>.bback{width:52px!important;padding:0!important;height:52px}.u-phone .bfoot>.bnext{flex:1 1 auto!important;height:52px}'
    ].join('\n')
  };
})();
