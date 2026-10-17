// Hearth UI polish — character builder. Every step is still the app's own wizard (renderBuild + wireWizardNav);
// on desktop this arranges it as Jenny's stepper rail | step card | parchment detail panel, and restyles the
// class cards. The 2024 (5.5e) builder is left as the app draws it, inside the new shell.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, esc = U.esc, D = document;
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
    return '<div class="card parch bdet"><div class="t-label">' + esc(c.name) + '</div><div class="t-h2" style="margin-top:6px;color:var(--parch-ink)">' + esc(d.name ? d.name + ' the ' + c.name : c.name) + '</div><div class="bkv">' + kv.map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' + (f1 ? '<div class="t-label" style="margin-top:16px">Level 1 features</div><div style="font-size:13px">' + f1 + '</div>' : '') + '<div class="t-meta" style="margin-top:auto;padding-top:16px">SRD 5.1 · CC-BY-4.0</div></div>';
  }
  U.actions['build-exit'] = function () { try { saveDraftProgress(); } catch (e) {} U.go('home'); };
  U.screens.builder = {
    nav: 'play',
    meta: function () { var d = state.draft; return { title: 'New character', meta: d ? esc([d.name, val('race'), val('class')].filter(Boolean).join(' · ') || 'Build a hero step by step') : 'Build a hero step by step', actions: d ? btn('Save &amp; exit', 'ghost', 'x', 'data-u-act="build-exit"') : '', back: 'home', psub: d ? esc(val('class') || 'Step by step') : '' }; },
    after: function (c) {
      if (!U.isDesk() || !c.querySelector('.stepper') || !state.draft || currentEdition() === '5.5e') return;
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
      '.bmain.has-class .!selection-detail{display:none}'
    ].join('\n')
  };
})();
