// Hearth UI polish — first-run onboarding (SPEC: onboarding-desk / onboarding-phone). Jenny's 3 steps of value
// cards replace the app's 5-step tour. Same entry points (hearthOpenTour / hearthCloseTour, #hearthTour) and the
// same "seen" flag (localStorage 'hearth.welcomeSeen'), so anyone who saw or finished the old tour, or already has
// characters or encounters, never gets it again. Settings / Home "How Hearth works" still replays it.
// Step 1 is Jenny's drawing; steps 2 and 3 reuse the old tour's content (samples, backups) in the same layout.
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, btn = U.btn, esc = U.esc, D = document;
  var STEPS = [
    { label: 'Welcome', title: 'Welcome to Hearth', crest: true,
      desk: 'A companion for the table. Works offline, on phones, tablets and laptops. Everything stays on this device. No account needed.',
      phone: 'A companion for the table. Works offline. Stays on this device. No account needed.',
      cards: [['sword', 'For players', 'Character sheets that do the maths: HP, spells, slots and rolls.'],
        ['crown', 'For DMs', 'A battle map, initiative and monster sheets, plus a projector view.'],
        ['link', 'For the table', 'A live link so everyone sees the same game on their own phone.']] },
    { label: 'Try it', title: 'Have a look round', icon: 'd20',
      desk: 'Start your own hero, or load a ready-made sample first. Samples are marked \u201cSample:\u201d and you can remove them any time in Settings.',
      phone: 'Make your own hero, or load a sample first. Samples are marked and easy to remove.',
      cards: [['user', 'Make a character', 'Build a hero step by step, or roll a random one. Sample: Sir Oswin, a level 3 paladin.', 'Try a sample character', 'try-character'],
        ['map', 'Run an encounter', 'Initiative, monsters on a painted map, fog and spell areas. Sample: an ambush on the Goblin Road.', 'Try a sample encounter', 'try-encounter'],
        ['link', 'Join a friend\u2019s game', 'Make your hero first, then open the link or scan the QR code your DM shares.']] },
    { label: 'Your data', title: 'Keep your adventures safe', icon: 'shield',
      desk: 'Hearth saves on this device only. Nothing is sent anywhere unless you choose to.',
      phone: 'Hearth saves on this device only. Nothing is sent anywhere unless you choose to.',
      cards: [['download', 'Back up', 'Every so often, export a backup file: Settings \u2192 Back up & export.'],
        ['cloud', 'Sync (optional)', 'Sign in with Google to carry your characters to your other devices.'],
        ['clock', 'Snapshots', 'Hearth keeps a copy of your data before each update.']] }
  ];
  var step = 0, prevFocus = null, wrap = null;
  function crest(size) { return '<span class="crest !home-brand-icon" aria-hidden="true" style="width:' + size + 'px;height:' + size + 'px;flex:0 0 ' + size + 'px"></span>'; }
  function dots() { return '<div class="dots" aria-hidden="true">' + STEPS.map(function (_, k) { return '<i class="' + (k === step ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }
  function cardBtn(c) { return c[3] ? btn(c[3], 'sm', null, 'data-tour="' + c[4] + '"') : ''; }
  function html() {
    var desk = U.isDesk(), s = STEPS[step], n = STEPS.length, last = step === n - 1;
    var count = desk ? s.label + ' \u00b7 step ' + (step + 1) + ' of ' + n : 'Step ' + (step + 1) + ' of ' + n;
    var art = s.crest ? crest(desk ? 132 : 112) : '<span class="obic" aria-hidden="true">' + ic(s.icon) + '</span>';
    var big = desk ? 'primary lg' : 'primary lg block';
    var next = last ? btn('Start using Hearth', big, null, 'data-tour="done"') : btn('Next', big, null, 'data-tour="next"', 'right');
    var back = step > 0 ? btn('Back', 'ghost', 'left', 'data-tour="back"') : '';
    if (desk) {
      return '<div class="ob" data-step="' + step + '">' + art + '<div class="t-label">' + count + '</div>' +
        '<h2 class="t-display obt" id="hearthTourTitle" tabindex="-1">' + esc(s.title) + '</h2><div class="t-body obb">' + esc(s.desk) + '</div>' +
        '<div class="of">' + s.cards.map(function (c) { return '<div class="card"><span class="lead">' + ic(c[0]) + '</span><div class="t-h3">' + esc(c[1]) + '</div><div class="t-meta" style="margin-top:4px">' + esc(c[2]) + '</div>' + (c[3] ? '<div class="obcb">' + cardBtn(c) + '</div>' : '') + '</div>'; }).join('') + '</div>' +
        '<div class="obf">' + (last ? back : btn('Skip tour', 'ghost', null, 'data-tour="skip"')) + dots() + '<div class="hstack gap2">' + (last ? '' : back) + next + '</div></div></div>';
    }
    return '<header class="obh">' + (step > 0 ? U.ibtn('left', 'data-tour="back"', true, 'Back') : '<span></span>') + (last ? '<span></span>' : btn('Skip', 'ghost sm', null, 'data-tour="skip"')) + '</header>' +
      '<div class="ob obp" data-step="' + step + '" data-u-scroll>' + art + '<div class="t-label" style="margin-top:10px">' + count + '</div>' +
      '<h2 class="t-display obt" id="hearthTourTitle" tabindex="-1">' + esc(s.title) + '</h2><div class="t-body obb">' + esc(s.phone) + '</div>' +
      '<div class="pill3">' + s.cards.map(function (c) { return '<div class="pill"><span class="lead">' + ic(c[0]) + '</span><span class="f1"><b>' + esc(c[1]) + '.</b> <span class="faded">' + esc(c[2]) + '</span>' + (c[3] ? '<span class="obcb">' + cardBtn(c) + '</span>' : '') + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="obfoot">' + dots() + next + '</div>';
  }
  function paint(focus) {
    if (!wrap) return;
    var desk = U.isDesk();
    wrap.className = 'u-layer u-obl' + (desk ? '' : ' u-obphone');
    wrap.innerHTML = U.px('<div class="scrim" data-u-scrim></div><div class="' + (desk ? 'dialog obd' : 'obsheet') + '">' + html() + '</div>');
    if (desk) wrap.lastElementChild.style.width = '820px';
    if (focus !== false) { var t = wrap.querySelector('#hearthTourTitle'); try { if (t) t.focus({ preventScroll: true }); } catch (e) {} }
  }
  function go(i) { if (i < 0 || i >= STEPS.length) return; step = i; paint(); }
  function key(e) {
    if (!wrap || !D.body.contains(wrap)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(step + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(step - 1); }
    else if (e.key === 'Tab') {
      var f = [].slice.call(wrap.querySelectorAll('button, a[href]')).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return; var i = f.indexOf(D.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    }
  }
  function close() {
    D.removeEventListener('keydown', key, true);
    var w = D.getElementById('hearthTour'); if (w) w.remove(); wrap = null;
    if (!D.querySelector('.u-layer')) D.body.classList.remove('u-modal-open');
    try { if (typeof hearthSyncShellState === 'function') hearthSyncShellState(); } catch (e) {}
    try { if (prevFocus && prevFocus.focus && D.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); } catch (e) {}
    prevFocus = null;
  }
  function open() {
    if (D.getElementById('hearthTour')) return;
    try { hearthMarkWelcomeSeen(); } catch (e) {} // shown once: saved as soon as it opens (as the old tour did)
    step = 0; prevFocus = D.activeElement;
    wrap = D.createElement('div'); wrap.id = 'hearthTour';
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'hearthTourTitle');
    D.body.appendChild(wrap); D.body.classList.add('u-modal-open');
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tour]'); if (!b) return;
      var a = b.dataset.tour;
      if (a === 'skip' || a === 'done') close();
      else if (a === 'next') go(step + 1);
      else if (a === 'back') go(step - 1);
      else if (a === 'try-character') { close(); hearthLoadSampleCharacter(); }
      else if (a === 'try-encounter') { close(); hearthLoadSampleEncounter(); }
    });
    D.addEventListener('keydown', key, true);
    paint();
    try { if (typeof hearthSyncShellState === 'function') hearthSyncShellState(); } catch (e) {}
  }
  var o1 = window.hearthOpenTour, o2 = window.hearthCloseTour;
  window.hearthOpenTour = open; window.hearthCloseTour = close; open._uOrig = o1; close._uOrig = o2;
  window.addEventListener('resize', function () { if (wrap) paint(false); });
  U.onboarding = { open: open, close: close, go: go, steps: STEPS.length };
  U.addCss('u-ui-onboarding', [
    '.obl{z-index:2600}',
    '.obd{padding:40px 44px 32px}.obl > .obd{left:50%!important;max-width:calc(100vw - 48px)!important}',
    '.ob{text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px}',
    '.ob .crest{border-radius:30px;border:1px solid var(--gold-deep);background-size:cover;background-position:center;box-shadow:0 0 0 6px rgba(0,0,0,.35),0 0 60px color-mix(in srgb,var(--ember) 45%,transparent)!important}',
    '.obphone .ob .crest{border-radius:26px}',
    '.obic{width:112px;height:112px;border-radius:30px;display:flex;align-items:center;justify-content:center;color:var(--gold);background:var(--well);border:1px solid var(--gold-deep);box-shadow:0 0 0 6px rgba(0,0,0,.35),0 0 60px color-mix(in srgb,var(--ember) 35%,transparent)}',
    '.obic svg{width:52px;height:52px}.obphone .obic{width:96px;height:96px;border-radius:26px}',
    '.obt:focus,.obt:focus-visible{outline:none!important;box-shadow:none!important}.obt{margin:0;font-size:38px;outline:none}.obphone .obt{font-size:32px}',
    '.obb{font-size:16px;max-width:560px}.obphone .obb{font-size:15px}',
    '.of{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:10px 0 6px;text-align:left;width:100%}',
    '.of .card{padding:18px;display:flex;flex-direction:column}.of .lead{margin-bottom:10px}',
    '.obcb{margin-top:auto;padding-top:12px;display:block}.obcb .u-btn{width:100%}',
    '.obf{display:flex;align-items:center;gap:12px;width:100%;margin-top:8px}.obf .dots{margin:0 auto}',
    '.dots{display:flex;gap:8px}.dots i{width:8px;height:8px;border-radius:4px;background:var(--rim)}.dots i.on{width:26px;background:var(--brass-grad)}',
    '.obsheet{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;background:var(--tex-page),var(--page)}',
    '.obh{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 8px;flex:none}',
    '.obp{flex:1;overflow:auto;justify-content:center;padding:0 22px 12px}',
    '.pill3{display:flex;flex-direction:column;gap:10px;width:100%;text-align:left;margin-top:6px}',
    '.pill3 .pill{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;background:var(--well);border:1px solid var(--hair);font-size:14px;line-height:1.45;color:var(--ink)}',
    '.pill3 .faded{color:var(--ink-faded)}.pill3 .obcb{padding-top:10px}',
    '.obfoot{flex:none;display:flex;flex-direction:column;align-items:center;gap:18px;padding:12px 18px 28px}'
  ].join('\n'));
})();
