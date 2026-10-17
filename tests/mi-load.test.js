// Hearth v1.7.0 — C2 never draws the v1.6 templates or fog, even while (or if) the map-interactions code is slow
// or fails to load. Serve the repo root, then: node tests/mi-load.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./c2-stage.js');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info).slice(0, 300) : '')); }
// Watches the whole page for any v1.6 template or fog drawing on the C2 screen.
const WATCH = () => {
  window.__old = { hits: 0, what: [] }; window.__firstBoard = null;
  const OLD = '.c2 .dm-aoe-label, .c2 .dm-aoe-ctrls, .c2 .dm-aoe-rot-line, .c2 #dmAoeLayer [data-aoe-id]:not(.mi-tpl), .c2 #dmFogLayer > *, .c2 .c2-bar';
  const look = () => {
    const n = document.querySelectorAll(OLD); if (n.length) { window.__old.hits++; window.__old.what.push(n[0].className && (n[0].className.baseVal || n[0].className) || n[0].tagName); }
    if (!window.__firstBoard && document.querySelector('.c2 #dmMapGrid')) window.__firstBoard = { mi: !!window.HearthMI, wait: !!document.querySelector('.c2-miwait'), t: performance.now() };
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true });
};
async function open(b, route) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/app/index.html`);
  await p.evaluate(S.SEED); await p.reload(); await p.waitForTimeout(500);
  await p.addInitScript(WATCH);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 }); // slow 3G-ish
  await route(p);
  return { ctx, p };
}
const stage = (p) => p.evaluate((src) => { (0, eval)('(' + src + ')')({}); }, S.STAGE.toString());
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  // 1. throttled: mi.js arrives 2.5 s late on a slow connection
  {
    const { ctx, p } = await open(b, async (p) => { await p.route(/\/dm\/mi\.js/, async (r) => { await new Promise(ok => setTimeout(ok, 2500)); await r.continue(); }); });
    const t0 = Date.now(); await p.reload({ waitUntil: 'commit' });
    await p.waitForFunction(() => typeof setActiveTab === 'function', null, { timeout: 60000 });
    await stage(p); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ old: window.__old, mi: !!window.HearthMI, chips: document.querySelectorAll('.mi-chip').length, first: window.__firstBoard }));
    check('throttled load (slow network, mi.js 2.5 s late): the first C2 board already has the map-interactions templates', r.mi && r.first && r.first.mi && r.chips >= 1, Object.assign(r, { ms: Date.now() - t0 }));
    check('throttled load: the v1.6 template / fog renderer never drew on C2', r.old.hits === 0, r.old);
    await ctx.close();
  }
  // 2. the first mi.js request fails (dropped connection), the retry is slow
  {
    let n = 0;
    const { ctx, p } = await open(b, async (p) => { await p.route(/\/dm\/mi\.js/, async (r) => { n++; if (n === 1) return r.abort('connectionreset'); await new Promise(ok => setTimeout(ok, 1500)); await r.continue(); }); });
    await p.reload(); await p.waitForFunction(() => typeof setActiveTab === 'function', null, { timeout: 60000 });
    const pre = await p.evaluate(() => ({ mi: !!window.HearthMI }));
    await stage(p); await p.waitForTimeout(150);
    const wait = await p.evaluate(() => ({ mi: !!window.HearthMI, wait: !!document.querySelector('.c2-miwait'), aoeDisabled: !!document.querySelector('.c2-fan [data-c2-miwait], [data-c2-miwait]') || true, circle: document.querySelectorAll('#dmAoeLayer [data-aoe-id], .dm-aoe-label, .mi-chip').length }));
    check('failed first fetch: C2 shows "Loading map tools…" and draws no templates in the meantime', !pre.mi && !wait.mi && wait.wait && wait.circle === 0, Object.assign({ pre }, wait));
    // Place cone while waiting: no v1.6 template is dropped
    const before = await p.evaluate(() => loadEncounter().aoes.length);
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb && fb.querySelector('[data-c2-place]').click(); });
    await p.waitForTimeout(200);
    const afterPlace = await p.evaluate(() => loadEncounter().aoes.length);
    check('while waiting, Place cone does not fall back to the v1.6 template', afterPlace === before, { before, afterPlace });
    await p.waitForFunction(() => !!window.HearthMI && document.querySelectorAll('.mi-chip').length > 0, null, { timeout: 30000 });
    const done = await p.evaluate(() => ({ old: window.__old, wait: !!document.querySelector('.c2-miwait'), chip: (document.querySelector('.mi-chip') || {}).textContent, n: 0 }));
    check('…it retries, then re-renders with the new templates and labels', !done.wait && /^Circle · 15 ft radius · 2 creatures/.test(done.chip || '') && n >= 2, Object.assign(done, { requests: n }));
    check('failed first fetch: the v1.6 template / fog renderer never drew on C2', done.old.hits === 0, done.old);
    await p.evaluate(() => { const fb = [...document.querySelectorAll('.c2-atk')].find(x => /^Fire Breath/.test(x.textContent)); fb.querySelector('[data-c2-place]').click(); });
    await p.waitForTimeout(500);
    check('once loaded, Place cone works (map-interactions fan on Cone)', await p.evaluate(() => !!document.querySelector('.mi-afan [data-mi-shape="cone"].on')));
    await ctx.close();
  }
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = results.filter(r => r.ok).length; console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
