/* Hearth v1.7.0 — Atmosphere v2 (Jenny's HearthAtmosphere: weather, lighting, wall shadows, sound) wired into
   the C2 DM screen and the projector. Jenny's files are copied unchanged into dm/atmo/; this is only the glue.
   Product rule (Thomas): wall-blocked light, map light sources and lava/fire embers on Hearth's own painted maps only.
   Uploaded maps get global weather + time of day + darkness + light carried by tokens. No wall or fire drawing tool.
   Layering on both screens: map -> .pm-ov -> weather -> templates/auras -> tokens -> light -> labels/handles -> fog.
   Settings live in enc.atmo and travel to the projector inside the normal map state; the particle simulation is
   kept identical on both screens by HearthAtmosphere.sync over the existing projector channel (DM authoritative).
   Sound is off by default and plays on exactly one screen (HearthAtmosphere.createAudio). */
(function (W) {
  'use strict';
  var FILES = ['atmo/hearth-atmosphere.js', 'atmo/hearth-walls.js', 'atmo/hearth-atmosphere-audio.js'];
  var WEATHER = [['none', 'Clear'], ['rain', 'Rain'], ['heavyrain', 'Downpour'], ['storm', 'Storm'], ['snow', 'Snow'], ['fog', 'Fog'], ['embers', 'Embers'], ['ash', 'Ash'], ['sandstorm', 'Sandstorm']];
  var TIMES = [['day', 'Day'], ['dawn', 'Dawn'], ['dusk', 'Dusk'], ['night', 'Night']];
  var LIGHTS = [['', 'No light'], ['torch', 'Torch'], ['lantern', 'Lantern'], ['candle', 'Candle'], ['light', 'Light cantrip'], ['faerie', 'Faerie fire']];
  var WIND = [['\u2192', 0, 'east'], ['\u2198', 1, 'south-east'], ['\u2193', 2, 'south'], ['\u2199', 3, 'south-west'], ['\u2190', 4, 'west'], ['\u2196', 5, 'north-west'], ['\u2191', 6, 'north'], ['\u2197', 7, 'north-east']];
  var DOOR_NAMES = { 'north-door': 'North door' };

  function defaults() { return { w: 'none', i: 0.6, t: 'day', d: 0, wind: 0.35, lights: {}, mapLights: true, doors: {}, seed: 0 }; }
  function cfg(enc) { var a = (enc && enc.atmo) || {}, d = defaults(); for (var k in d) if (a[k] != null) d[k] = a[k]; return d; }
  function isActive(a) { if (a.w !== 'none' || a.t !== 'day' || a.d > 0) return true; for (var k in a.lights) if (a.lights[k]) return true; return false; }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------------------------------------------------------------- shared by both screens
  // Light sources painted into Hearth's own maps (meta.overlays from the painted-map generator, in squares).
  function mapLights(meta) {
    var out = [], n = 0;
    ((meta && meta.overlays) || []).forEach(function (o) {
      if (o.kind === 'torch' && o.x != null) out.push({ id: 'map-' + n++, type: 'torch', x: o.x, y: o.y, radius: 3.2 });
      else if (o.kind === 'fire' && o.x != null) out.push({ id: 'map-' + n++, type: 'campfire', x: o.x, y: o.y, radius: Math.max(3.2, Math.min(6, (o.w || 0.6) * 4)) });
      else if (o.kind === 'lamp' && o.x != null) out.push({ id: 'map-' + n++, type: 'lantern', x: o.x, y: o.y, radius: 2.6 });
      else if (o.kind === 'lava') { // lava keeps glowing at night: a few soft, barely flickering pools along the flow
        var pts = o.pts || (o.x != null ? [[o.x, o.y]] : []), acc = 99;
        for (var i = 0; i < pts.length; i++) {
          if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          if (acc >= 3 || i === pts.length - 1) { acc = 0; out.push({ id: 'map-' + n++, type: 'campfire', x: pts[i][0], y: pts[i][1], radius: 2.6, colour: '#ff6a24', flicker: 0.12, intensity: 0.85, occlude: false }); }
        }
      }
    });
    return out.slice(0, 28);
  }
  // Storm cloud shadow. Jenny's engine has the lightning but no cloud shadow, so it lives here, in our wrapper:
  // soft dark blotches drifting with the wind under the rain. Both screens run the same CSS loop phased off the
  // wall clock, so the DM screen and the projector show the shadows in the same place.
  var CLOUD_S = 90; // seconds for one tile to drift past
  function cloudEl(doc) {
    if (!doc.getElementById('hatmCloudCss')) {
      var st = doc.createElement('style'); st.id = 'hatmCloudCss';
      st.textContent = '.hatm-cloud{position:absolute;inset:0;overflow:hidden;pointer-events:none;transition:opacity 1.2s}' +
        '.hatm-cloud[hidden]{display:block;opacity:0}' +
        '.hatm-cloud>i{position:absolute;left:calc(var(--ct) * -1);top:calc(var(--ct) * -1);width:calc(100% + var(--ct) * 2);height:calc(100% + var(--ct) * 2);' +
        'background:radial-gradient(closest-side at 28% 34%,rgba(8,10,16,.5),rgba(8,10,16,.24) 55%,transparent),radial-gradient(closest-side at 74% 70%,rgba(8,10,16,.42),rgba(8,10,16,.18) 60%,transparent),radial-gradient(closest-side at 80% 18%,rgba(8,10,16,.3),transparent);' +
        'background-size:var(--ct) var(--ct);animation:hatmCloud ' + CLOUD_S + 's linear infinite;will-change:transform}' +
        '@keyframes hatmCloud{from{transform:translate(0,0)}to{transform:translate(var(--cdx),var(--cdy))}}' +
        '@media (prefers-reduced-motion: reduce){.hatm-cloud>i{animation:none}}';
      doc.head.appendChild(st);
    }
    var el = doc.createElement('div'); el.className = 'hatm-cloud'; el.hidden = true; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i></i>'; return el;
  }
  function cloudScene(R, s, env, gridEl) {
    var el = R.cloud; if (!el) return;
    var on = s.w === 'storm'; if (el.hidden === on) el.hidden = !on;
    if (!on) return;
    var w = gridEl ? gridEl.clientWidth || parseFloat(gridEl.style.width) || 600 : 600, T = Math.round(Math.max(240, w * 0.7));
    // drift one whole tile along the nearest of the eight wind directions, so the loop is seamless
    var d = nearestWind(s.wind), ang = d * Math.PI / 4, dx = Math.round(Math.cos(ang)), dy = Math.round(Math.sin(ang));
    var key = T + ':' + dx + ':' + dy + ':' + (env.reduced ? 1 : 0);
    if (R.cloudK === key) return; R.cloudK = key;
    var i = el.firstChild;
    el.style.setProperty('--ct', T + 'px'); el.style.setProperty('--cdx', (dx * T) + 'px'); el.style.setProperty('--cdy', (dy * T) + 'px');
    i.style.animationDelay = '-' + ((Date.now() / 1000) % CLOUD_S).toFixed(2) + 's';
    i.style.animationPlayState = env.reduced ? 'paused' : '';
  }
  // Apply one scene to an atmosphere instance. s = the map-state form of the settings (see mapState), env = screen hooks.
  // Every setter runs only when its value really changed: setWeather reseeds the particles.
  function applyScene(R, s, env) {
    var H = W.HearthAtmosphere, atm = R.atm, k = R.k; R.env = env;
    var hearth = s.map || null, meta = hearth ? env.meta || null : null;
    // Hearth maps after dark: their torches, fires and lava throw a few sparks even with no weather set
    // (the engine's embers rise from torch and campfire lights). Uploaded maps never do (product rule).
    var fires = meta && s.mapLights ? mapLights(meta).length : 0;
    var sparks = s.w === 'none' && fires > 0 && (s.t !== 'day' || s.d > 0.2);
    var mk = (hearth || '-') + ':' + s.cols + 'x' + s.rows + ':' + (meta ? 1 : 0) + (sparks ? ':s' : '');
    if (k.map !== mk) { // walls, indoor and map embers: Hearth maps only (uploaded maps: none of these)
      k.map = mk; k.doors = null;
      var walls = hearth && H.wallsFor ? H.wallsFor(hearth, s.cols, s.rows) : null;
      atm.setWalls(walls || null); atm.setIndoor(!!walls);
      atm.setEmitters(meta ? H.emittersFromMeta(meta) : []); // lava and fire overlays (torch sparks come from the torch lights themselves)
      R.doorIds = walls && walls.doors ? walls.doors.map(function (d) { return d.id; }) : [];
    }
    var dk = JSON.stringify(s.doors || {});
    if (k.doors !== dk) { k.doors = dk; (R.doorIds || []).forEach(function (id) { if (s.doors && s.doors[id] != null) atm.setDoor(id, !!s.doors[id]); }); }
    // the projector normally gets these from the DM's snapshot first, so here they already match and nothing reseeds
    var st = atm.state();
    var w = sparks ? 'embers' : s.w, wi = sparks ? 0.16 : s.i;
    if (st.weather !== w || Math.abs(st.wI - wi) > 1e-3) atm.setWeather(w, wi);
    if (atm.state().lightning !== (s.w === 'storm')) atm.setLightning(s.w === 'storm', 1);
    if (st.time !== s.t) atm.setTime(s.t);
    if (Math.abs(st.darkness - s.d) > 1e-3) atm.setDarkness(s.d);
    if (Math.abs(st.windDir - s.wind) > 1e-3) atm.setWind(s.wind);
    var list = (s.mapLights && meta ? mapLights(meta) : []).concat((s.lights || []).map(function (l) { return { id: 'tok-' + l.id, type: l.type, tok: l.id }; }));
    var lk = JSON.stringify(list);
    if (k.lights !== lk) {
      k.lights = lk; atm.removeLight('*');
      list.forEach(function (l) {
        var L = {}; for (var p in l) if (p !== 'tok') L[p] = l[p];
        if (l.tok) { var last = { x: -99, y: -99 }; L.follow = function () { var q = R.env && R.env.tokenPos(l.tok); if (q) last = q; return last; }; }
        atm.addLight(L);
      });
    }
    var anim = !env.reduced; if (R.anim !== anim) { R.anim = anim; atm.setAnimate(anim); }
  }

  // ---------------------------------------------------------------- script loading (lazy: only once someone uses it)
  var lib = null;
  function libReady() { var H = W.HearthAtmosphere; return !!(H && H.create && H.wallsFor && H.createAudio); }
  function ensureLib(base) {
    if (libReady()) return Promise.resolve(W.HearthAtmosphere);
    if (lib) return lib;
    var tries = 0;
    function add(src) { return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src + (tries ? '?r=' + tries : ''); s.onload = ok; s.onerror = function () { s.remove(); bad(); }; document.head.appendChild(s); }); }
    function go() {
      var chain = Promise.resolve();
      FILES.forEach(function (f, i) {
        chain = chain.then(function () { var have = [W.HearthAtmosphere && W.HearthAtmosphere.create, W.HearthAtmosphere && W.HearthAtmosphere.wallsFor, W.HearthAtmosphere && W.HearthAtmosphere.createAudio][i]; return have ? null : add((base || '') + f); });
      });
      return chain.then(function () { return W.HearthAtmosphere; }, function () { if (++tries > 4) { lib = null; throw new Error('atmosphere failed to load'); } return new Promise(function (r) { setTimeout(r, 500 * Math.pow(2, tries)); }).then(go); });
    }
    lib = go(); return lib;
  }

  // ================================================================= DM screen (C2)
  var D = { R: null, key: null, sync: null, snd: null, sndOff: null, hello: null, loading: false };
  function U() { return (typeof state !== 'undefined' && state.ui) || {}; }
  function encNow() { return typeof loadEncounter === 'function' ? loadEncounter() : null; }
  function hearthId(enc) { return typeof encPaintedId === 'function' ? encPaintedId(enc) || null : null; }
  function metaFor(enc) { return typeof paintedMetaFor === 'function' ? paintedMetaFor(enc) : null; }
  function visibleLights(enc, a, forPlayers) {
    var out = [];
    (enc.combatants || []).forEach(function (c) {
      var t = a.lights[c.id]; if (!t || c.mapX == null) return;
      if (c.kind === 'monster' && c.dead) return;
      if (forPlayers && c.hiddenFromPlayers) return;
      out.push({ id: c.id, type: t });
    });
    return out;
  }
  // what the projector needs (null = no atmosphere); also the DM's own scene
  function mapState(enc, forPlayers) {
    var a = cfg(enc); if (!isActive(a)) return null;
    return { w: a.w, i: a.i, t: a.t, d: a.d, wind: a.wind, seed: a.seed || 1, doors: a.doors, mapLights: a.mapLights !== false,
      map: hearthId(enc), cols: enc.mapCols || 20, rows: enc.mapRows || 15, lights: visibleLights(enc, a, forPlayers !== false) };
  }
  function grid() { return document.getElementById('dmMapGrid'); }
  function tokenPosDM(id) {
    var g = grid(); if (!g) return null;
    var el = g.querySelector('[data-map-token="' + (W.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (!el) return null;
    var enc = D.enc, cols = (enc && enc.mapCols) || 20, cell = (parseFloat(g.style.width) || g.clientWidth) / cols || 1;
    return { x: (el.offsetLeft + el.offsetWidth / 2) / cell, y: (el.offsetTop + el.offsetHeight / 2) / cell };
  }
  // Sound never outlives the board: Jenny's controller cuts dead on destroy(), so we turn it off first
  // (a ~0.15 s fade on whichever screen is playing, shared to the other), then destroy once it is quiet.
  var FADE_MS = 700;
  function retire(snd) { if (!snd) return; try { snd.enable(false); } catch (e) { } setTimeout(function () { try { snd.destroy(); } catch (e) { } }, FADE_MS); }
  // keepOn: a rebuild or "Clear" (the DM's sound choice is kept for the next scene); otherwise the sound is switched off
  function teardownDM(keepOn) {
    var r = D.R; D.R = null; D.key = null;
    if (D.watch) { clearInterval(D.watch); D.watch = null; }
    D.projBlocked = false; var ul = document.getElementById('atmoUnlock'); if (ul) ul.remove();
    if (D.sync) { try { D.sync.stop(); } catch (e) { } D.sync = null; }
    if (D.hello) { try { D.hello(); } catch (e) { } D.hello = null; }
    if (D.snd) { var was = U().atmoSnd ? Object.assign({}, U().atmoSnd) : null, snd = D.snd; D.snd = null; retire(snd);
      if (was) { U().atmoSnd = was; if (!keepOn) U().atmoSnd.enabled = false; } paintSound(); }
    if (r) { try { r.atm.stop(); } catch (e) { } r.atm.weatherEl.remove(); r.atm.lightEl.remove(); if (r.cloud) r.cloud.remove(); }
  }
  // leaving the board (another tab, closing the encounter) doesn't call us, so watch for the layers falling out of the page
  function watchBoard() {
    if (D.watch) return; var misses = 0;
    D.watch = setInterval(function () {
      if (!D.R) { clearInterval(D.watch); D.watch = null; return; }
      if (D.R.atm.lightEl.isConnected && grid()) { misses = 0; return; }
      if (++misses >= 2) teardownDM(false);
    }, 150);
  }
  function channel() { return typeof getMapChannel === 'function' ? getMapChannel() : null; }
  function reduced() { try { return !!(W.hearthReducedMotion && W.hearthReducedMotion()); } catch (e) { return false; } }
  function mount(g) { // weather right above the map art (and its animated overlay), light right above the tokens
    var atm = D.R.atm, base = g.querySelector('#dmPaintedOv') || g.querySelector('#dmPaintedBase') || g.querySelector('.dm-map-img, .dm-map-video');
    var wRef = base ? base.nextSibling : g.firstChild;
    if (atm.weatherEl.parentNode !== g || atm.weatherEl.previousSibling !== (D.R.cloud || base)) { if (D.R.cloud) g.insertBefore(D.R.cloud, wRef); g.insertBefore(atm.weatherEl, D.R.cloud ? D.R.cloud.nextSibling : wRef); }
    var ov = g.querySelector('#miOv');
    if (atm.lightEl.parentNode !== g || atm.lightEl.nextSibling !== ov) g.insertBefore(atm.lightEl, ov || null);
  }
  function wire(enc) {
    D.enc = enc;
    var s = mapState(enc, false), g = grid();
    var lay = typeof dmLayoutIsC2 === 'function' && dmLayoutIsC2() ? 'c2' : 'classic';
    // switching layout silences the sound (classic has no sound controls); the weather and light carry on
    if (D.layout && D.layout !== lay && D.snd && D.snd.state().enabled) { var sw = D.snd; U().atmoSnd = Object.assign({}, sw.state(), { enabled: false }); try { sw.enable(false); } catch (e) { } }
    D.layout = lay;
    if (!s || !g) { if (D.R) teardownDM(!!g); bindPanel(); return; }
    if (!libReady()) {
      if (!D.loading) { D.loading = true; ensureLib('dm/').then(function () { D.loading = false; if (grid()) wire(encNow()); }, function () { D.loading = false; if (typeof showToast === 'function') showToast('Weather couldn\u2019t load \u2014 check the connection', 3000); }); }
      bindPanel(); return;
    }
    var key = s.cols + 'x' + s.rows + ':' + s.seed;
    if (D.key !== key) {
      teardownDM(true);
      var H = W.HearthAtmosphere;
      D.R = { atm: H.create({ cols: s.cols, rows: s.rows, quality: 'auto', animate: !reduced(), dmView: true, seed: s.seed }), k: {}, cloud: cloudEl(document) };
      D.key = key;
      var mine = D.R.atm; mine.on('stop', function () { if (D.R && D.R.atm === mine) teardownDM(false); }); // it stops itself after 60 s off screen
      var ch = channel();
      D.sync = H.sync(D.R.atm, { role: 'dm', channel: ch || undefined });
      if (H.createAudio) {
        D.snd = H.createAudio(D.R.atm, { role: 'dm', channel: ch || undefined, volume: (U().atmoSnd && U().atmoSnd.volume) || 0.6, output: (U().atmoSnd && U().atmoSnd.output) || 'dm' });
        var snd0 = D.snd; D.snd.on('change', function (st) { if (D.snd !== snd0) return; U().atmoSnd = { enabled: st.enabled, output: st.output, volume: st.volume }; paintSound(); paintUnlock(); });
        if (U().atmoSnd && U().atmoSnd.enabled) D.snd.enable(true);
        // a projector that opens later learns the sound settings when it says hello
        if (ch) { var onHello = function (ev) { var d = ev.data; if (d && d.type === 'hearth-atmos-hello' && d.from === 'projector' && D.snd) D.snd.setVolume(D.snd.state().volume); if (d && d.type === 'hearth-atmo-snd-blocked') { D.projBlocked = !!d.blocked; paintUnlock(); } }; ch.addEventListener('message', onHello); D.hello = function () { ch.removeEventListener('message', onHello); }; }
      }
    }
    mount(g); watchBoard(); paintUnlock();
    applyScene(D.R, s, { role: 'dm', meta: metaFor(enc), tokenPos: tokenPosDM, reduced: reduced() });
    cloudScene(D.R, s, { reduced: reduced() }, g);
    bindPanel();
  }

  // ---------------------------------------------------------------- the Weather & light flyout
  function seg(attr, list, cur) { return list.map(function (o) { return '<button class="c2-btn atmo-chip ' + (o[0] === cur ? 'on' : '') + '" ' + attr + '="' + o[0] + '" aria-pressed="' + (o[0] === cur ? 'true' : 'false') + '">' + E(o[1]) + '</button>'; }).join(''); }
  function nearestWind(r) { var i = Math.round((((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8; return i; }
  function soundState() { return D.snd ? D.snd.state() : (U().atmoSnd || { enabled: false, output: 'dm', volume: 0.6 }); }
  function soundHTML() {
    var st = soundState(), mode = st.enabled ? st.output : 'off';
    return '<div class="c2-lbl">Sound</div><div class="c2-row atmo-seg" id="atmoSnd">' + seg('data-atmo-snd', [['off', 'Off'], ['dm', 'This screen'], ['projector', 'Projector']], mode) + '</div>' +
      '<div class="c2-row atmo-slide' + (st.enabled ? '' : ' off') + '" id="atmoVolRow"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="' + st.volume + '" data-atmo-vol="1" aria-label="Sound volume"' + (st.enabled ? '' : ' disabled') + '><output>' + Math.round(st.volume * 100) + '%</output></div>' +
      '<div class="c2-note atmo-note">Plays on one screen only. A projector may ask for one tap to allow sound.</div>';
  }
  function panelHTML(enc) {
    var a = cfg(enc), hid = hearthId(enc), walls = hid && W.HearthAtmosphere && W.HearthAtmosphere.wallsFor ? W.HearthAtmosphere.wallsFor(hid, enc.mapCols || 20, enc.mapRows || 15) : null;
    var hasMap = typeof encHasMap === 'function' ? encHasMap(enc) : true;
    if (!(W.HearthAtmosphere && W.HearthAtmosphere.wallsFor)) ensureLib('dm/').then(function () { if (U().c2Fly === 'weather' && typeof render === 'function') render(); }, function () { });
    var h = '<div class="atmo"><div class="atmo-col">'; // desktop: two columns (sky | creatures, map & sound), so nothing scrolls
    h += '<div class="c2-lbl">Weather</div><div class="atmo-grid">' + seg('data-atmo-w', WEATHER, a.w) + '</div>';
    h += '<div class="c2-row atmo-slide' + (a.w === 'none' ? ' off' : '') + '"><span>Strength</span><input type="range" min="0.1" max="1" step="0.05" value="' + a.i + '" data-atmo-i="1" aria-label="Weather strength"' + (a.w === 'none' ? ' disabled' : '') + '><output>' + Math.round(a.i * 100) + '%</output></div>';
    h += '<div class="c2-row atmo-wind' + (a.w === 'none' ? ' off' : '') + '"><span>Wind</span>' + WIND.map(function (o) { var on = nearestWind(a.wind) === o[1]; return '<button class="c2-btn atmo-dir ' + (on ? 'on' : '') + '" data-atmo-wind="' + o[1] + '" aria-label="Wind blowing ' + o[2] + '" aria-pressed="' + on + '"' + (a.w === 'none' ? ' disabled' : '') + '>' + o[0] + '</button>'; }).join('') + '</div>';
    h += '<div class="c2-lbl">Light</div><div class="c2-row atmo-seg">' + seg('data-atmo-t', TIMES, a.t) + '</div>';
    h += '<div class="c2-row atmo-slide"><span>Darkness</span><input type="range" min="0" max="1" step="0.05" value="' + a.d + '" data-atmo-d="1" aria-label="Magical darkness"><output>' + Math.round(a.d * 100) + '%</output></div>';
    if (a.d > 0.5 || a.t === 'night') h += '<div class="c2-note atmo-note">Your screen stays readable; the projector shows the full dark.</div>';
    // light carried by creatures on the board (any map)
    var onMap = (enc.combatants || []).filter(function (c) { return c.mapX != null && !(c.kind === 'monster' && c.dead); })
      .map(function (c, i) { return [c, i]; }).sort(function (x, y) { return (a.lights[y[0].id] ? 1 : 0) - (a.lights[x[0].id] ? 1 : 0) || x[1] - y[1]; }).map(function (x) { return x[0]; }); // creatures carrying light first
    h += '</div><div class="atmo-col">';
    h += '<div class="c2-lbl">Carried light</div>';
    if (!onMap.length) h += '<div class="c2-note atmo-note">Put creatures on the map to give them a torch or lantern.</div>';
    else h += '<div class="atmo-lights">' + onMap.map(function (c) {
      var t = a.lights[c.id] || '';
      return '<label class="atmo-lt' + (t ? ' on' : '') + '"><span>' + E(c.name || 'Creature') + (c.hiddenFromPlayers ? ' <small>(hidden)</small>' : '') + '</span><select data-atmo-light="' + E(c.id) + '" aria-label="Light carried by ' + E(c.name || 'creature') + '">' +
        LIGHTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === t ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>';
    if (hid) {
      h += '<div class="c2-row"><button class="c2-btn ' + (a.mapLights !== false ? 'on' : '') + '" data-atmo-maplights="1" aria-pressed="' + (a.mapLights !== false) + '">' + '<i class="atmo-cb" aria-hidden="true"></i> Torches & fires on the map</button></div>';
      if (walls && walls.doors && walls.doors.length) h += '<div class="c2-row">' + walls.doors.map(function (d) { var open = a.doors[d.id] != null ? !!a.doors[d.id] : !!d.open; return '<button class="c2-btn ' + (open ? 'on' : '') + '" data-atmo-door="' + E(d.id) + '" aria-pressed="' + open + '">' + E(DOOR_NAMES[d.id] || d.id) + ': ' + (open ? 'open' : 'closed') + '</button>'; }).join('') + '</div>';
      h += '<div class="c2-note atmo-note">' + (walls ? 'Walls on this Hearth map block light and cast shadows.' : 'Lava and fires on this Hearth map throw embers and light.') + '</div>';
    } else if (hasMap) h += '<div class="c2-note atmo-note">Uploaded map: weather and light cover the whole board. Wall shadows and lava embers come with Hearth\u2019s painted maps.</div>';
    h += soundHTML();
    if (isActive(a)) h += '<div class="c2-row atmo-end"><button class="c2-btn" data-atmo-reset="1">Clear weather & light</button></div>';
    return h + '</div></div>';
  }
  function paintSound() { var p = document.querySelector('[data-c2-panel="weather"] .atmo'); if (!p) return; var a = p.querySelector('#atmoSnd'), b = p.querySelector('#atmoVolRow'); if (!a || !b) return; var tmp = document.createElement('div'); tmp.innerHTML = soundHTML(); a.replaceWith(tmp.querySelector('#atmoSnd')); b.replaceWith(tmp.querySelector('#atmoVolRow')); }

  function commit(mut, rerender) {
    var enc = encNow(); if (!enc) return;
    var a = cfg(enc); if (!a.seed) a.seed = (Math.random() * 4294967295) >>> 0 || 1;
    mut(a, enc); enc.atmo = a;
    saveEncounter(enc);
    if (typeof broadcastMap === 'function') broadcastMap(enc);
    if (rerender !== false) render(); else wire(enc);
  }
  var bound = false;
  function bindPanel() {
    if (bound) return; bound = true;
    document.addEventListener('click', function (ev) {
      var un = ev.target.closest && ev.target.closest('[data-atmo-unlock]');
      if (un) { dmUnlockProjector(); return; }
      var t = ev.target.closest && ev.target.closest('[data-atmo-w],[data-atmo-t],[data-atmo-wind],[data-atmo-maplights],[data-atmo-door],[data-atmo-snd],[data-atmo-reset]');
      if (!t || !t.closest('.c2')) return;
      if (t.hasAttribute('data-atmo-snd')) { // a user gesture: allowed to start audio here
        var m = t.getAttribute('data-atmo-snd');
        var go = function () { if (!D.snd) return; if (m === 'off') D.snd.enable(false); else { D.snd.setOutput(m); D.snd.enable(true); } };
        U().atmoSnd = { enabled: m !== 'off', output: m === 'off' ? soundState().output : m, volume: soundState().volume };
        if (D.snd) go(); else { paintSound(); if (typeof showToast === 'function' && m !== 'off') showToast('Sound starts once there\u2019s weather or light to hear', 2600); }
        return;
      }
      if (t.hasAttribute('data-atmo-w')) { var w = t.getAttribute('data-atmo-w'); commit(function (a) { a.w = w; }); }
      else if (t.hasAttribute('data-atmo-t')) { var tm = t.getAttribute('data-atmo-t'); commit(function (a) { a.t = tm; }); }
      else if (t.hasAttribute('data-atmo-wind')) { var wi = +t.getAttribute('data-atmo-wind'); commit(function (a) { a.wind = wi * Math.PI / 4; }); }
      else if (t.hasAttribute('data-atmo-maplights')) commit(function (a) { a.mapLights = a.mapLights === false; });
      else if (t.hasAttribute('data-atmo-door')) { var id = t.getAttribute('data-atmo-door'); commit(function (a, enc) { var ws = W.HearthAtmosphere.wallsFor(hearthId(enc), enc.mapCols || 20, enc.mapRows || 15), d0 = ws && (ws.doors || []).find(function (d) { return d.id === id; }); var cur = a.doors[id] != null ? !!a.doors[id] : !!(d0 && d0.open); a.doors = Object.assign({}, a.doors); a.doors[id] = !cur; }); }
      else if (t.hasAttribute('data-atmo-reset')) commit(function (a) { var s = a.seed; Object.assign(a, defaults()); a.seed = s; });
    });
    document.addEventListener('change', function (ev) {
      var t = ev.target; if (!t.closest || !t.closest('.c2')) return;
      if (t.hasAttribute('data-atmo-light')) { var id = t.getAttribute('data-atmo-light'), v = t.value; commit(function (a) { a.lights = Object.assign({}, a.lights); if (v) a.lights[id] = v; else delete a.lights[id]; }); }
      else if (t.hasAttribute('data-atmo-i')) { var i = +t.value; commit(function (a) { a.i = i; }, false); }
      else if (t.hasAttribute('data-atmo-d')) { var d = +t.value; commit(function (a) { a.d = d; }); }
      else if (t.hasAttribute('data-atmo-vol') && D.snd) D.snd.setVolume(+t.value);
    });
    document.addEventListener('input', function (ev) { // live while dragging; saved on change
      var t = ev.target; if (!t.closest || !t.closest('.c2 .atmo')) return;
      var o = t.parentNode.querySelector('output'); if (o) o.textContent = Math.round(t.value * 100) + '%';
      if (!D.R) return;
      if (t.hasAttribute('data-atmo-i')) D.R.atm.setIntensity(+t.value);
      else if (t.hasAttribute('data-atmo-d')) D.R.atm.setDarkness(+t.value);
    });
  }

  // ================================================================= projector window
  // Called at the end of every projector draw() (the grid's innerHTML is rebuilt each time, so the two layers are re-inserted).
  var P = { R: null, key: null, sync: null, snd: null, btn: null, timer: 0, last: null };
  function projTeardown() {
    var r = P.R; P.R = null;
    if (P.sync) { try { P.sync.stop(); } catch (e) { } P.sync = null; }
    // keep the old controller listening a moment: the DM's 'sound off' follows the new map state and fades it out
    if (P.snd) { var ps = P.snd; P.snd = null; setTimeout(function () { try { ps.destroy(); } catch (e) { } }, FADE_MS + 300); }
    if (r) { try { r.atm.stop(); } catch (e) { } r.atm.weatherEl.remove(); r.atm.lightEl.remove(); if (r.cloud) r.cloud.remove(); }
    if (P.blocked) soundButton(false);
    clearInterval(P.timer); P.timer = 0; P.key = null;
  }
  // A projector browser may keep its audio suspended until that window gets a tap. Nothing is shown on the
  // projector (players see only the map): the DM screen shows "Tap to enable sound", which unlocks the
  // projector's audio directly (same-origin window) and over the channel; any tap or key on the projector
  // window also unlocks it silently.
  function soundButton(show) {
    show = !!show; if (P.blocked === show) return; P.blocked = show;
    var ch = P.ch; if (ch) try { ch.postMessage({ type: 'hearth-atmo-snd-blocked', blocked: show }); } catch (e) { }
    if (show && !P.armed) {
      P.armed = true;
      var go = function () { if (!P.snd) return; P.snd.unlock(); setTimeout(checkRunning, 250); };
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, go, true); });
    }
  }
  function checkRunning() { var st = P.snd && P.snd.state(); if (st && (!st.playing || st.context === 'running')) soundButton(false); }
  function projUnlock() { if (P.snd) { P.snd.unlock(); setTimeout(checkRunning, 250); setTimeout(checkRunning, 900); } }
  // DM side: the projector says whether its sound is waiting for a tap
  function dmUnlockProjector() {
    var w = W._hearthProjWin;
    try { if (w && !w.closed && w.HearthAtmo && w.HearthAtmo._unlock) w.HearthAtmo._unlock(); } catch (e) { }
    var ch = channel(); if (ch) try { ch.postMessage({ type: 'hearth-atmo-unlock' }); } catch (e) { }
  }
  function paintUnlock() {
    var st = document.querySelector('.c2-stage') || (grid() && grid().parentNode), el = document.getElementById('atmoUnlock');
    var want = !!D.projBlocked && !!D.snd && D.snd.state().enabled && D.snd.state().output === 'projector';
    if (!want) { if (el) el.remove(); var pb = document.querySelector('[data-c2-panel="weather"] .atmo-unlock-note'); if (pb) pb.remove(); return; }
    if (!el && st) { el = document.createElement('button'); el.id = 'atmoUnlock'; el.type = 'button'; el.className = 'atmo-unlock'; el.setAttribute('data-atmo-unlock', '1');
      el.innerHTML = (W.HearthIcons ? HearthIcons.svg('speaker') : '') + ' Tap to enable sound <small>on the projector</small>'; st.appendChild(el); }
  }
  function tokenFilters(grid, s) {
    if (!P.R) return;
    var f = P.R.atm.tokenFilter(), lit = {};
    (s.lights || []).forEach(function (l) { lit[l.id] = 1; });
    // player tokens sit above the light layer (they must stay above the fog), so they take the scene's brightness
    grid.querySelectorAll('.tok.player').forEach(function (el) { var v = lit[el.getAttribute('data-tok-id')] ? '' : f; if (el.style.filter !== v) el.style.filter = v; });
  }
  function projectorDraw(state, grid, env) {
    var s = state && state.atmo;
    if (!s) { if (P.R) projTeardown(); return; }
    if (!libReady()) { ensureLib(env.base).then(function () { if (P.last) env.redraw(); }); P.last = state; return; }
    P.last = state;
    var H = W.HearthAtmosphere, key = s.cols + 'x' + s.rows + ':' + s.seed;
    if (P.key !== key) {
      projTeardown();
      P.R = { atm: H.create({ cols: s.cols, rows: s.rows, quality: 'auto', animate: !env.reduced, dmView: false, seed: s.seed }), k: {}, cloud: cloudEl(document) };
      P.key = key;
      var mine = P.R.atm; mine.on('stop', function () { if (P.R && P.R.atm === mine) projTeardown(); });
      P.sync = H.sync(P.R.atm, { role: 'projector', channel: env.channel || undefined });
      P.ch = env.channel || null; P.blocked = false;
      if (P.ch && !P.unlockL) { P.unlockL = function (ev) { if (ev.data && ev.data.type === 'hearth-atmo-unlock') projUnlock(); }; P.ch.addEventListener('message', P.unlockL); }
      if (H.createAudio) {
        P.snd = H.createAudio(P.R.atm, { role: 'projector', channel: env.channel || undefined });
        P.snd.on('blocked', function () { soundButton(true); });
        // browsers keep a projector window silent until someone taps it: some say so ('blocked'), some just leave the audio suspended
        P.snd.on('playing', function (on) { if (!on) soundButton(false); else setTimeout(function () { var st = P.snd && P.snd.state(); if (st && st.playing) soundButton(st.context !== 'running'); }, 600); });
      }
      P.timer = setInterval(function () { var g = document.getElementById('grid'); if (g && P.last && P.last.atmo) tokenFilters(g, P.last.atmo); }, 1000);
    }
    var atm = P.R.atm, base = env.after && env.after.parentNode === grid ? env.after : null;
    grid.insertBefore(P.R.cloud, base ? base.nextSibling : grid.firstChild);
    grid.insertBefore(atm.weatherEl, P.R.cloud.nextSibling);
    var lbl = grid.querySelector('.plbl'), fog = grid.querySelector('.pfogcv, .pfog-wrap');
    grid.insertBefore(atm.lightEl, lbl || fog || null);
    applyScene(P.R, s, { role: 'projector', meta: s.map ? env.meta : null, reduced: env.reduced, tokenPos: function (id) {
      var el = grid.isConnected ? grid.querySelector('[data-tok-id="' + id + '"]') : null; if (!el || !grid.clientWidth) return null;
      var cell = (parseFloat(grid.style.width) || grid.clientWidth) / s.cols; return { x: (el.offsetLeft + el.offsetWidth / 2) / cell, y: (el.offsetTop + el.offsetHeight / 2) / cell };
    } });
    cloudScene(P.R, s, env, grid);
    tokenFilters(grid, s);
  }

  W.HearthAtmo = {
    version: '1.7.0', cfg: cfg, isActive: isActive, mapState: mapState, panelHTML: panelHTML, wire: wire, ensureLib: ensureLib,
    projectorDraw: projectorDraw, mapLights: mapLights,
    get atm() { return D.R ? D.R.atm : null; }, get sound() { return D.snd; },
    _proj: function () { return { atm: P.R ? P.R.atm : null, snd: P.snd, blocked: !!P.blocked }; }, _unlock: projUnlock, unlockProjector: dmUnlockProjector, _teardown: teardownDM
  };
})(window);
