// v1.7.2 — character photo (Tom: "I can't add a photo"). Tapping the sheet avatar (phone app bar, desk top bar)
// or the menu's Change photo opens Choose photo / Take photo / Remove photo; the picker opens, the photo saves by
// character id and shows on the sheet and Home; Take photo asks for the camera (capture). node tests/photo.test.js 8816
const { chromium } = require(process.env.PW_MODULE || 'playwright-core');
const S = require('./ui-seed.js'); const fs = require('fs'), zlib = require('zlib');
const PORT = process.argv[2] || '8816';
const results = []; const errs = [];
function check(name, ok, info) { results.push({ ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !ok ? '  ' + JSON.stringify(info).slice(0, 500) : '')); }
// a tiny valid PNG (8x8 red)
function png() { const w = 8, h = 8, raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 220; raw[o + 1] = 40; raw[o + 2] = 40; } }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
const FILE = '/tmp/hearth-photo-test.png'; fs.writeFileSync(FILE, png());
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  for (const [w, h] of [[1440, 900], [412, 915], [773, 1024]]) {
    const desk = w >= 1280, tag = `${w}px:`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !desk, isMobile: !desk, serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/app/index.html`); await p.evaluate(S.SEED, {}); await p.reload(); await p.waitForTimeout(800);
    await p.evaluate(S.STAGE, {}); await p.evaluate(() => { state.activeCharId = loadCharacters()[0].id; const c = getCharacter(state.activeCharId); c.photo = null; saveCharacter(c); HearthUI.go('sheet'); }); await p.waitForTimeout(500);
    const av = desk ? '.u-top #playPhotoBtn' : '.u-abar .u-cs-pav';
    const a = await p.evaluate((s) => { const n = document.querySelector(s); const r = n && n.getBoundingClientRect(); return n && { w: r.width, h: r.height, label: n.getAttribute('aria-label') }; }, av);
    check(tag + ' sheet avatar is a 44px Change photo button', a && a.w >= 44 && a.h >= 44 && /photo/i.test(a.label), a);
    await p.click(av); await p.waitForTimeout(300);
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-u-modal="cs-photo"] [data-u-act]')].map(n => n.textContent.trim()));
    check(tag + ' avatar opens Choose photo / Take photo / Switch character', rows.includes('Choose photo') && rows.includes('Take photo') && rows.includes('Switch character') && !rows.includes('Remove photo'), rows);
    const fcP = p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    await p.click('[data-u-modal="cs-photo"] [data-u-act="cs-photo-pick"]');
    const fc = await fcP;
    check(tag + ' Choose photo opens the picker (image/*)', !!fc && (await fc.element().getAttribute('accept')) === 'image/*');
    if (fc) { await fc.setFiles(FILE); await p.waitForTimeout(1200); }
    const saved = await p.evaluate(() => ({ photo: /^data:image\//.test(getCharacter(state.activeCharId).photo || ''), img: !!document.querySelector('.u-abar .u-cs-pav img, .u-top #playPhotoBtn img') }));
    check(tag + ' photo saves and shows on the sheet', saved.photo && saved.img, saved);
    await p.evaluate(() => HearthUI.go('home')); await p.waitForTimeout(400);
    const home = await p.evaluate(() => { const src = getCharacter(state.activeCharId).photo; return [...document.querySelectorAll('#content img')].some(i => i.getAttribute('src') === src); });
    check(tag + ' photo shows on Home', home);
    // menu entry + camera
    await p.evaluate(() => HearthUI.go('sheet')); await p.waitForTimeout(400);
    await p.click('[data-u-act="cs-menu"]'); await p.waitForTimeout(300);
    check(tag + ' sheet menu has Change photo', await p.evaluate(() => !!document.querySelector('[data-u-modal="cs-menu"] [data-u-act="cs-photo"]')));
    await p.click('[data-u-modal="cs-menu"] [data-u-act="cs-photo"]'); await p.waitForTimeout(300);
    const fc2P = p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
    const rows2 = await p.evaluate(() => [...document.querySelectorAll('[data-u-modal="cs-photo"] [data-u-act]')].map(n => n.textContent.trim()));
    await p.click('[data-u-modal="cs-photo"] [data-u-act="cs-photo-cam"]');
    const fc2 = await fc2P;
    check(tag + ' Take photo asks for the camera (capture)', !!fc2 && (await fc2.element().getAttribute('capture')) === 'user');
    if (fc2) await fc2.setFiles([]);
    check(tag + ' Remove photo offered once there is one', rows2.includes('Remove photo'), rows2);
    await ctx.close();
  }
  await b.close();
  const real = errs.filter(e => !/hearth-effects|effects engine/i.test(e));
  check('no page errors', real.length === 0, real);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();
