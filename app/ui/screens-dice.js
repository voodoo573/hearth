// Hearth UI polish — the roll result. The app's roll-outcome dialog (and its wiring) is kept; this restyles it
// as Jenny's result card (d20 face with the natural roll, big total, breakdown) and adds the two notes the
// spec asks for: the roll goes to the DM's roll log, and nothing reaches the projector on its own (rule 2).
(function () {
  'use strict';
  var U = window.HearthUI, ic = U.ic, D = document;
  function decorate() {
    var dlg = D.querySelector('.roll-outcome-dialog'); if (!dlg || dlg.dataset.u) return;
    dlg.dataset.u = '1';
    var st = dlg.querySelector('.roll-outcome-stage'), det = dlg.querySelector('.roll-outcome-detail'), die = dlg.querySelector('.roll-outcome-die');
    var m = det && /d20\s*\[(\d+)(?:[,\s]+(\d+))?\]/.exec(det.textContent);
    if (die && m) { var n = D.createElement('b'); n.className = 'u-nat'; n.textContent = m[1]; die.appendChild(n); die.classList.add('u-has-nat'); var t = D.createElement('div'); t.className = 'u-tag u-gold u-natl'; t.textContent = 'Natural ' + m[1]; if (det) det.after(t); }
    var head = D.createElement('div'); head.className = 'u-rhead';
    var live = (typeof HearthLink !== 'undefined') && HearthLink.join && HearthLink.join.status === 'linked';
    head.innerHTML = U.px('<span class="t-label">Your roll</span>' + (live ? '<span class="tag moss">' + ic('check', 'sm') + ' Shared with your DM</span>' : ''));
    dlg.insertBefore(head, dlg.firstChild);
    var note = D.createElement('div'); note.className = 'u-rnote';
    note.innerHTML = U.px(ic('tv', 'sm') + '<span>' + (live ? 'Your roll goes to your DM’s roll log. ' : '') + 'Your DM decides if a roll is shown on the projector. Nothing goes there automatically.</span>');
    (st || dlg).appendChild(note);
  }
  if (W()) { new MutationObserver(function () { if (D.querySelector('.roll-outcome-dialog:not([data-u])')) decorate(); }).observe(D.body, { childList: true, subtree: true }); }
  function W() { return !!window.MutationObserver && D.body; }
  U.addCss('u2-css-dice', [
    '.!roll-outcome-dialog{width:620px!important;max-width:calc(100vw - 32px)!important;padding:22px 24px!important;text-align:left!important}',
    '.rhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
    '.!roll-outcome-stage{display:grid!important;grid-template-columns:150px minmax(0,1fr);column-gap:24px;align-items:center;text-align:left}',
    '.!roll-outcome-die{grid-row:1/6;width:140px!important;height:140px!important;margin:0!important;position:relative;display:flex;align-items:center;justify-content:center;border:0!important;background:none!important;box-shadow:none!important}',
    '.!roll-outcome-die .emo{width:140px;height:140px;margin:0;color:var(--gold);filter:drop-shadow(0 6px 18px color-mix(in srgb,var(--ember) 45%,transparent))}',
    '.!roll-outcome-die .emo svg{stroke-width:1;fill:color-mix(in srgb,var(--gold) 22%,transparent)}',
    '.!roll-outcome-die .nat{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-top:22px;font:700 30px var(--serif);color:var(--ink)}',
    '.!roll-outcome-title{font:600 11px var(--sans)!important;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faded)!important;margin:0!important}',
    '.!roll-outcome-total{font:700 64px/1 var(--serif)!important;color:var(--gold)!important;margin:6px 0!important;text-align:left!important}',
    '.!roll-outcome-formula,.!roll-outcome-detail{color:var(--ink-soft)!important;font:500 14px var(--sans)!important;margin:0!important}',
    '.natl{justify-self:start;margin-top:8px}',
    '.!roll-outcome-actions{grid-column:1/-1;display:grid!important;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px!important}',
    '.!roll-outcome-actions>button{height:44px!important;min-height:44px;border-radius:10px!important;font:600 14px var(--sans)!important;text-transform:none!important;letter-spacing:0!important;margin:0!important;width:auto!important}',
    '.!roll-outcome-actions>.!roll-next-btn{background:var(--brass-grad)!important;color:var(--on-gold)!important;border:0!important}',
    '.!roll-outcome-actions>.!btn{background:var(--well)!important;color:var(--ink)!important;border:1px solid var(--rim-strong)!important}',
    '.rnote{grid-column:1/-1;display:flex;gap:8px;align-items:flex-start;margin-top:14px;color:var(--ink-faded);font-size:12.5px}',
    '.u-phone .!roll-outcome-dialog{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;max-width:none!important;border-radius:var(--r-xl) var(--r-xl) 0 0!important;transform:none!important;margin:0!important}',
    '.u-phone .!roll-outcome-stage{grid-template-columns:104px minmax(0,1fr)}.u-phone .!roll-outcome-die{width:100px!important;height:100px!important}.u-phone .!roll-outcome-die .emo{width:100px;height:100px}.u-phone .!roll-outcome-total{font-size:52px!important}'
  ].join('\n'));
})();
