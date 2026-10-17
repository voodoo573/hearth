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
  // Apply one scene to an atmosphere instance. s = the map-state form of the settings (see mapState), env = screen hooks.
  // Every setter runs only when its value really changed: setWeather reseeds the particles.
  function applyScene(R, s, env) {
    var H = W.HearthAtmosphere, atm = R.atm, k = R.k; R.env = env;
    var hearth = s.map || null, meta = hearth ? env.meta || null : null;
    var mk = (hearth || '-') + ':' + s.cols + 'x' + s.rows + ':' + (meta ? 1 : 0);
    if (k.map !== mk) { // walls, indoor and map embers: Hearth maps only (uploaded maps: none of these)
      k.map = mk; k.doors = null;
      var walls = hearth && H.wallsFor ? H.wallsFor(hearth, s.cols, s.rows) : null;
      atm.setWalls(walls || null); atm.setIndoor(!!walls);
      atm.setEmitters(meta ? H.emittersFromMeta(meta) : []);
      R.doorIds = walls && walls.doors ? walls.doors.map(function (d) { return d.id; }) : [];
    }
    var dk = JSON.stringify(s.doors || {});
    if (k.doors !== dk) { k.doors = dk; (R.doorIds || []).forEach(function (id) { if (s.doors && s.doors[id] != null) atm.setDoor(id, !!s.doors[id]); }); }
    // the projector normally gets these from the DM's snapshot first, so here they already match and nothing reseeds
    var st = atm.state();
    if (st.weather !== s.w || Math.abs(st.wI - s.i) > 1e-3) atm.setWeather(s.w, s.i);
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
  function teardownDM() {
    var r = D.R; D.R = null; D.key = null;
    if (D.sync) { try { D.sync.stop(); } catch (e) { } D.sync = null; }
    if (D.hello) { try { D.hello(); } catch (e) { } D.hello = null; }
    if (D.snd) { try { D.snd.destroy(); } catch (e) { } D.snd = null; }
    if (r) { try { r.atm.stop(); } catch (e) { } r.atm.weatherEl.remove(); r.atm.lightEl.remove(); }
  }
  function channel() { return typeof getMapChannel === 'function' ? getMapChannel() : null; }
  function reduced() { try { return !!(W.hearthReducedMotion && W.hearthReducedMotion()); } catch (e) { return false; } }
  function mount(g) { // weather right above the map art (and its animated overlay), light right above the tokens
    var atm = D.R.atm, base = g.querySelector('#dmPaintedOv') || g.querySelector('#dmPaintedBase') || g.querySelector('.dm-map-img, .dm-map-video');
    var wRef = base ? base.nextSibling : g.firstChild;
    if (atm.weatherEl.parentNode !== g || atm.weatherEl.previousSibling !== base) g.insertBefore(atm.weatherEl, wRef);
    var ov = g.querySelector('#miOv');
    if (atm.lightEl.parentNode !== g || atm.lightEl.nextSibling !== ov) g.insertBefore(atm.lightEl, ov || null);
  }
  function wire(enc) {
    D.enc = enc;
    var s = mapState(enc, false), g = grid();
    if (!s || !g || !(typeof dmLayoutIsC2 === 'function' && dmLayoutIsC2())) { if (D.R) teardownDM(); bindPanel(); return; }
    if (!libReady()) {
      if (!D.loading) { D.loading = true; ensureLib('dm/').then(function () { D.loading = false; if (grid()) wire(encNow()); }, function () { D.loading = false; if (typeof showToast === 'function') showToast('Weather couldn\u2019t load \u2014 check the connection', 3000); }); }
      bindPanel(); return;
    }
    var key = s.cols + 'x' + s.rows + ':' + s.seed;
    if (D.key !== key) {
      teardownDM();
      var H = W.HearthAtmosphere;
      D.R = { atm: H.create({ cols: s.cols, rows: s.rows, quality: 'auto', animate: !reduced(), dmView: true, seed: s.seed }), k: {} };
      D.key = key;
      var mine = D.R.atm; mine.on('stop', function () { if (D.R && D.R.atm === mine) teardownDM(); }); // it stops itself after 60 s off screen
      var ch = channel();
      D.sync = H.sync(D.R.atm, { role: 'dm', channel: ch || undefined });
      if (H.createAudio) {
        D.snd = H.createAudio(D.R.atm, { role: 'dm', channel: ch || undefined, volume: (U().atmoSnd && U().atmoSnd.volume) || 0.6, output: (U().atmoSnd && U().atmoSnd.output) || 'dm' });
        D.snd.on('change', function (st) { U().atmoSnd = { enabled: st.enabled, output: st.output, volume: st.volume }; paintSound(); });
        if (U().atmoSnd && U().atmoSnd.enabled) D.snd.enable(true);
        // a projector that opens later learns the sound settings when it says hello
        if (ch) { var onHello = function (ev) { var d = ev.data; if (d && d.type === 'hearth-atmos-hello' && d.from === 'projector' && D.snd) D.snd.setVolume(D.snd.state().volume); }; ch.addEventListener('message', onHello); D.hello = function () { ch.removeEventListener('message', onHello); }; }
      }
    }
    mount(g);
    applyScene(D.R, s, { role: 'dm', meta: metaFor(enc), tokenPos: tokenPosDM, reduced: reduced() });
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
    var h = '<div class="atmo">';
    h += '<div class="c2-lbl">Weather</div><div class="atmo-grid">' + seg('data-atmo-w', WEATHER, a.w) + '</div>';
    h += '<div class="c2-row atmo-slide' + (a.w === 'none' ? ' off' : '') + '"><span>Strength</span><input type="range" min="0.1" max="1" step="0.05" value="' + a.i + '" data-atmo-i="1" aria-label="Weather strength"' + (a.w === 'none' ? ' disabled' : '') + '><output>' + Math.round(a.i * 100) + '%</output></div>';
    h += '<div class="c2-row atmo-wind' + (a.w === 'none' ? ' off' : '') + '"><span>Wind</span>' + WIND.map(function (o) { var on = nearestWind(a.wind) === o[1]; return '<button class="c2-btn atmo-dir ' + (on ? 'on' : '') + '" data-atmo-wind="' + o[1] + '" aria-label="Wind blowing ' + o[2] + '" aria-pressed="' + on + '"' + (a.w === 'none' ? ' disabled' : '') + '>' + o[0] + '</button>'; }).join('') + '</div>';
    h += '<div class="c2-lbl">Light</div><div class="c2-row atmo-seg">' + seg('data-atmo-t', TIMES, a.t) + '</div>';
    h += '<div class="c2-row atmo-slide"><span>Darkness</span><input type="range" min="0" max="1" step="0.05" value="' + a.d + '" data-atmo-d="1" aria-label="Magical darkness"><output>' + Math.round(a.d * 100) + '%</output></div>';
    if (a.d > 0.5 || a.t === 'night') h += '<div class="c2-note atmo-note">Your screen stays readable; the projector shows the full dark.</div>';
    // light carried by creatures on the board (any map)
    var onMap = (enc.combatants || []).filter(function (c) { return c.mapX != null && !(c.kind === 'monster' && c.dead); })
      .map(function (c, i) { return [c, i]; }).sort(function (x, y) { return (a.lights[y[0].id] ? 1 : 0) - (a.lights[x[0].id] ? 1 : 0) || x[1] - y[1]; }).map(function (x) { return x[0]; }); // creatures carrying light first
    h += '<div class="c2-lbl">Carried light</div>';
    if (!onMap.length) h += '<div class="c2-note atmo-note">Put creatures on the map to give them a torch or lantern.</div>';
    else h += '<div class="atmo-lights">' + onMap.map(function (c) {
      var t = a.lights[c.id] || '';
      return '<label class="atmo-lt' + (t ? ' on' : '') + '"><span>' + E(c.name || 'Creature') + (c.hiddenFromPlayers ? ' <small>(hidden)</small>' : '') + '</span><select data-atmo-light="' + E(c.id) + '" aria-label="Light carried by ' + E(c.name || 'creature') + '">' +
        LIGHTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === t ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>';
    if (hid) {
      h += '<div class="c2-row"><button class="c2-btn ' + (a.mapLights !== false ? 'on' : '') + '" data-atmo-maplights="1" aria-pressed="' + (a.mapLights !== false) + '">' + (a.mapLights !== false ? '\u2611' : '\u2610') + ' Torches & fires on the map</button></div>';
      if (walls && walls.doors && walls.doors.length) h += '<div class="c2-row">' + walls.doors.map(function (d) { var open = a.doors[d.id] != null ? !!a.doors[d.id] : !!d.open; return '<button class="c2-btn ' + (open ? 'on' : '') + '" data-atmo-door="' + E(d.id) + '" aria-pressed="' + open + '">' + E(DOOR_NAMES[d.id] || d.id) + ': ' + (open ? 'open' : 'closed') + '</button>'; }).join('') + '</div>';
      h += '<div class="c2-note atmo-note">' + (walls ? 'Walls on this Hearth map block light and cast shadows.' : 'Lava and fires on this Hearth map throw embers and light.') + '</div>';
    } else if (hasMap) h += '<div class="c2-note atmo-note">Uploaded map: weather and light cover the whole board. Wall shadows and lava embers come with Hearth\u2019s painted maps.</div>';
    h += soundHTML();
    if (isActive(a)) h += '<div class="c2-row atmo-end"><button class="c2-btn" data-atmo-reset="1">Clear weather & light</button></div>';
    return h + '</div>';
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
    if (P.snd) { try { P.snd.destroy(); } catch (e) { } P.snd = null; }
    if (r) { try { r.atm.stop(); } catch (e) { } r.atm.weatherEl.remove(); r.atm.lightEl.remove(); }
    if (P.btn) { P.btn.remove(); P.btn = null; }
    clearInterval(P.timer); P.timer = 0; P.key = null;
  }
  function soundButton(show) {
    if (!show) { if (P.btn) P.btn.hidden = true; return; }
    if (!P.btn) {
      P.btn = document.createElement('button'); P.btn.className = 'pj-snd'; P.btn.id = 'pjSnd'; P.btn.type = 'button';
      P.btn.innerHTML = '<span aria-hidden="true">\uD83D\uDD0A</span> Tap to enable sound';
      P.btn.addEventListener('click', function () { if (P.snd) P.snd.unlock(); setTimeout(function () { var st = P.snd && P.snd.state(); if (st && st.context === 'running') soundButton(false); }, 250); });
      document.body.appendChild(P.btn);
    }
    P.btn.hidden = false;
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
      P.R = { atm: H.create({ cols: s.cols, rows: s.rows, quality: 'auto', animate: !env.reduced, dmView: false, seed: s.seed }), k: {} };
      P.key = key;
      var mine = P.R.atm; mine.on('stop', function () { if (P.R && P.R.atm === mine) projTeardown(); });
      P.sync = H.sync(P.R.atm, { role: 'projector', channel: env.channel || undefined });
      if (H.createAudio) {
        P.snd = H.createAudio(P.R.atm, { role: 'projector', channel: env.channel || undefined });
        P.snd.on('blocked', function () { soundButton(true); });
        // browsers keep a projector window silent until someone taps it: some say so ('blocked'), some just leave the audio suspended
        P.snd.on('playing', function (on) { if (!on) soundButton(false); else setTimeout(function () { var st = P.snd && P.snd.state(); if (st && st.playing) soundButton(st.context !== 'running'); }, 600); });
      }
      P.timer = setInterval(function () { var g = document.getElementById('grid'); if (g && P.last && P.last.atmo) tokenFilters(g, P.last.atmo); }, 1000);
    }
    var atm = P.R.atm, base = env.after && env.after.parentNode === grid ? env.after : null;
    grid.insertBefore(atm.weatherEl, base ? base.nextSibling : grid.firstChild);
    var lbl = grid.querySelector('.plbl'), fog = grid.querySelector('.pfogcv, .pfog-wrap');
    grid.insertBefore(atm.lightEl, lbl || fog || null);
    applyScene(P.R, s, { role: 'projector', meta: s.map ? env.meta : null, reduced: env.reduced, tokenPos: function (id) {
      var el = grid.isConnected ? grid.querySelector('[data-tok-id="' + id + '"]') : null; if (!el || !grid.clientWidth) return null;
      var cell = (parseFloat(grid.style.width) || grid.clientWidth) / s.cols; return { x: (el.offsetLeft + el.offsetWidth / 2) / cell, y: (el.offsetTop + el.offsetHeight / 2) / cell };
    } });
    tokenFilters(grid, s);
  }

  W.HearthAtmo = {
    version: '1.7.0', cfg: cfg, isActive: isActive, mapState: mapState, panelHTML: panelHTML, wire: wire, ensureLib: ensureLib,
    projectorDraw: projectorDraw, mapLights: mapLights,
    get atm() { return D.R ? D.R.atm : null; }, get sound() { return D.snd; },
    _proj: function () { return { atm: P.R ? P.R.atm : null, snd: P.snd, btn: P.btn }; }, _teardown: teardownDM
  };
})(window);
