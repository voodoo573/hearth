/* HearthAtmosphere audio v2.0.0 - procedural ambience that follows the atmosphere (Jenny).
   100% self-synthesised with WebAudio at runtime: no samples, no downloads, no CDN (see CREDITS.md).
   Off by default. Exactly one screen plays it (the DM or the projector, never both): see createAudio().
     const snd = HearthAtmosphere.createAudio(atm, { role: 'dm' | 'projector', channel? });
     snd.enable(true)        // call from a click/tap (browser autoplay rules)
     snd.setVolume(0.6)      // 0..1
     snd.setOutput('projector')  // which screen plays; synced to the other window      */
(function (root) {
  'use strict';
  var H = root.HearthAtmosphere = root.HearthAtmosphere || {};
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) | 0; var x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function noiseBuf(ctx, kind, secs, R) {
    var n = Math.round(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (var i = 0; i < n; i++) { var w = R() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08; b6 = w * 0.115926; }
        else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } }
      // crossfade the loop seam
      var f = Math.min(2048, n >> 3); for (var j = 0; j < f; j++) { var k = j / f; d[n - f + j] = d[n - f + j] * (1 - k) + d[j] * k; } }
    return b;
  }
  // ---------- engine: works on AudioContext (live) or OfflineAudioContext (video soundtrack) ----------
  function engine(ctx, out, seed) {
    var R = rng(seed || 7), NB = { white: noiseBuf(ctx, 'white', 4, R), pink: noiseBuf(ctx, 'pink', 5, R), brown: noiseBuf(ctx, 'brown', 6, R) };
    var master = ctx.createGain(); master.gain.value = 1;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -8; comp.knee.value = 6; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.3;
    var dcb = ctx.createBiquadFilter(); dcb.type = 'highpass'; dcb.frequency.value = 25; dcb.Q.value = 0.7;   // DC / sub-rumble blocker
    master.connect(dcb); dcb.connect(comp); comp.connect(out);
    var outdoor = ctx.createBiquadFilter(); outdoor.type = 'lowpass'; outdoor.frequency.value = 18000; outdoor.connect(master);
    var started = false, L = {}, gen = {};
    function src(buf, rate, t) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1; s.start(t, R() * buf.duration * 0.9); return s; }
    function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
    function chain(nodes) { for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
    function gain(v) { var g = ctx.createGain(); g.gain.value = v || 0; return g; }
    function build(t) {
      started = true;
      // rain: hiss + body + low downpour rumble
      L.rainHiss = gain(); chain([src(NB.pink, 1, t), filt('highpass', 700, 0.5), filt('lowpass', 9000), L.rainHiss, outdoor]);
      L.rainBody = gain(); chain([src(NB.white, 0.9, t), filt('bandpass', 1300, 0.55), L.rainBody, outdoor]);
      L.rainLow = gain(); chain([src(NB.brown, 1, t), filt('lowpass', 380, 0.6), L.rainLow, outdoor]);
      // wind: breathy band + a faint whistle, both swept by the gust value
      L.windF = filt('bandpass', 420, 0.9); L.wind = gain(); chain([src(NB.pink, 1, t), L.windF, L.wind, outdoor]);
      L.whisF = filt('bandpass', 1150, 9); L.whis = gain(); chain([src(NB.white, 1, t), L.whisF, L.whis, outdoor]);
      // sandstorm: two resonant howl formants + grit hiss + low roar
      L.howF1 = filt('bandpass', 700, 5); L.howF2 = filt('bandpass', 1800, 7); L.how = gain();
      var hs = src(NB.white, 1, t); hs.connect(L.howF1); hs.connect(L.howF2); L.howF1.connect(L.how); L.howF2.connect(L.how); L.how.connect(outdoor);
      L.grit = gain(); chain([src(NB.white, 1.1, t), filt('highpass', 2600, 0.7), L.grit, outdoor]);
      L.sandLow = gain(); chain([src(NB.brown, 0.8, t), filt('lowpass', 220, 0.7), L.sandLow, outdoor]);
      // fire roar + lava rumble (indoor-safe: not through the outdoor filter)
      L.roar = gain(); chain([src(NB.brown, 1.3, t), filt('lowpass', 420, 0.7), L.roar, master]);
      L.lava = gain(); chain([src(NB.brown, 0.6, t), filt('lowpass', 110, 0.8), L.lava, master]);
      gen = { drip: t, crack: t, pop: t, bub: t, crk: [t + 0.3, t + 0.55, t + 0.8] };
      L.crkP = [-0.6, 0.15, 0.7].map(function (p) { var pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pn) { pn.pan.value = p; pn.connect(master); } return pn || master; });
      L.crkF = [4400 + R() * 300, 4800 + R() * 300, 5150 + R() * 300];
    }
    function set(g, v, t, tc) { g.gain.setTargetAtTime(v, t, tc || 0.35); }
    function burst(t, dur, ftype, f, q, peak, dest, buf) { // one-shot noise grain
      var s = ctx.createBufferSource(); s.buffer = buf || NB.white; var b = filt(ftype, f, q), g = gain(0);
      chain([s, b, g, dest || master]); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(0.004, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      s.start(t, R() * 3); s.stop(t + dur + 0.05);
    }
    function thunder(t, a, dist) {
      var close = 1 - dist, T = t + 0.25 + dist * 3.2, lv = (0.5 + 0.5 * a) * (0.55 + 0.45 * close) * 2.4;
      if (close > 0.35) { burst(T, 0.25 + 0.15 * close, 'lowpass', 4200, 0.7, 0.35 * lv, outdoor); burst(T + 0.03, 0.6, 'lowpass', 900, 0.9, 0.5 * lv, outdoor, NB.brown); }   // the crack
      var s = ctx.createBufferSource(); s.buffer = NB.brown; var lp = filt('lowpass', 140 + 120 * close, 0.8), g = gain(0); chain([s, lp, g, outdoor]);
      var dur = 4 + dist * 3 + R() * 2; g.gain.setValueAtTime(0, T); g.gain.linearRampToValueAtTime(lv * 1.1, T + 0.12 + dist * 0.5);
      var tt = T + 0.4 + dist * 0.4; for (var i = 0; i < 5; i++) { tt += 0.35 + R() * 0.7; g.gain.linearRampToValueAtTime(lv * (0.25 + 0.65 * R()) * (1 - i / 6), tt); }
      g.gain.linearRampToValueAtTime(0.0001, T + dur); s.start(T, R() * 4); s.stop(T + dur + 0.1);
      lp.frequency.setValueAtTime(lp.frequency.value, T); lp.frequency.linearRampToValueAtTime(70 + 40 * close, T + dur);
    }
    function update(S, t, look, fade) {
      if (!started) build(t);
      look = look || 0.25; var w = S.weather, I = S.wI, raining = w === 'rain' || w === 'heavyrain' || w === 'storm', heavy = raining && w !== 'rain';
      var night = S.time === 'night' ? 1 : S.time === 'dusk' ? 0.55 : S.time === 'dawn' ? 0.25 : 0, gust = clamp(S.gust, 0, 1), ind = !!S.indoor;
      master.gain.setTargetAtTime(fade == null ? 1 : fade, t, 0.05);
      outdoor.frequency.setTargetAtTime(ind ? 650 : 18000, t, 0.3);
      // rain
      var rv = raining ? (heavy ? 0.55 + 0.45 * I : 0.25 + 0.4 * I) : 0;
      set(L.rainHiss, rv * 0.3, t); set(L.rainBody, rv * (heavy ? 0.34 : 0.16), t); set(L.rainLow, rv * (heavy ? 0.22 : 0.06), t);
      if (raining) { var rate = (heavy ? 30 : 16) * I * (ind ? 0.3 : 1); while (gen.drip < t + look) { gen.drip += -Math.log(1 - R()) / Math.max(rate, 0.1); if (gen.drip < t) continue;
          burst(gen.drip, 0.008 + R() * 0.02, 'bandpass', 1800 + R() * 4200, 1.2, (0.05 + R() * 0.12) * (heavy ? 0.8 : 1), outdoor); } } else gen.drip = t;
      // wind
      var wa = { snow: 1.5, storm: 0.85, heavyrain: 0.45, rain: 0.22, fog: 0.16, ash: 0.45, embers: 0.18, none: 0.1, sandstorm: 0 }[w]; if (wa == null) wa = 0.1;
      wa *= (0.55 + 0.45 * I) * (ind ? 0.25 : 1);
      L.windF.frequency.setTargetAtTime(300 + gust * 700, t, 0.5); set(L.wind, wa * (0.26 + 0.7 * gust * gust), t, 0.5);
      L.whisF.frequency.setTargetAtTime(900 + gust * 900, t, 0.6); set(L.whis, wa * 0.06 * Math.max(0, gust - 0.35), t, 0.6);
      // sandstorm
      var sv = w === 'sandstorm' ? (0.5 + 0.5 * I) : 0, sg = S.sandGust || 0, swh = S.sandWhite || 0;
      L.howF1.frequency.setTargetAtTime(520 + 520 * sg + 180 * swh, t, 0.7); L.howF2.frequency.setTargetAtTime(1450 + 900 * sg, t, 0.9);
      set(L.how, sv * (0.25 + 0.55 * sg + 0.3 * swh), t, 0.5); set(L.grit, sv * (0.06 + 0.12 * sg + 0.12 * swh), t, 0.4); set(L.sandLow, sv * (0.25 + 0.3 * sg), t, 0.6);
      // thunder, one per strike
      (S.strikes || []).forEach(function (k) { thunder(t + Math.max(0, k.t - S.t), k.a, k.dist); });
      // fire: roar + crackles (campfires dominate; torches are faint), lava rumble + bubbling for ember maps
      var fa = 0; (S.fires || []).forEach(function (f) { fa += ({ campfire: 1, torch: 0.4, lantern: 0.04, candle: 0.03 }[f.type] || 0) * (f.i == null ? 1 : f.i); });
      fa = Math.min(1.3, fa); var lava = S.lava || 0;
      set(L.roar, fa * 0.16 + lava * 0.1, t); set(L.lava, lava * 0.5, t);
      var cr = fa * 9 + lava * 5;
      if (cr > 0.2) { while (gen.crack < t + look) { gen.crack += -Math.log(1 - R()) / cr; if (gen.crack < t) continue;
          burst(gen.crack, 0.003 + R() * 0.012, 'highpass', 1500 + R() * 3500, 0.7, 0.06 + Math.pow(R(), 3) * 0.5); }
        while (gen.pop < t + look) { gen.pop += -Math.log(1 - R()) / (cr * 0.08); if (gen.pop < t) continue; burst(gen.pop, 0.02 + R() * 0.03, 'bandpass', 700 + R() * 900, 1.5, 0.25 + R() * 0.3); } }
      else { gen.crack = t; gen.pop = t; }
      if (lava > 0) { while (gen.bub < t + look) { gen.bub += -Math.log(1 - R()) / (1.5 * lava); if (gen.bub < t) continue; burst(gen.bub, 0.08 + R() * 0.1, 'bandpass', 90 + R() * 120, 3, 0.35 * lava, master, NB.brown); } } else gen.bub = t;
      // night insects: three crickets, outdoors, calm-ish weather only
      var ins = ind ? 0 : night * ({ none: 1, fog: 0.6, embers: (S.lava || 0) > 0.05 ? 0 : 0.6, ash: 0 }[w] || 0) * (1 - 0.5 * gust);   // no crickets on a lava field
      for (var c = 0; c < 3; c++) {
        if (ins < 0.05) { gen.crk[c] = t + R(); continue; }
        while (gen.crk[c] < t + look) { var ct = gen.crk[c]; gen.crk[c] += 0.55 + c * 0.13 + R() * 0.25 + (R() < 0.08 ? 1.5 + R() * 2 : 0); if (ct < t) continue;
          var o = ctx.createOscillator(), cf = L.crkF[c] + R() * 40; o.type = 'sine'; o.frequency.setValueAtTime(cf * 1.006, ct); o.frequency.linearRampToValueAtTime(cf * 0.99, ct + 0.11);   // slight downward glide: less piercing than a pure tone var g = gain(0); o.connect(g); g.connect(L.crkP[c]);
          var pk = ins * (0.008 + 0.005 * (c === 1));   // -6 dB after the spectral check: they poked out of the 4-5 kHz band for (var p = 0; p < 3; p++) { var pt = ct + p * 0.042; g.gain.setValueAtTime(0, pt); g.gain.linearRampToValueAtTime(pk, pt + 0.006); g.gain.setValueAtTime(pk, pt + 0.016); g.gain.linearRampToValueAtTime(0, pt + 0.024); }
          o.start(ct); o.stop(ct + 0.16); } }
    }
    return { update: update, master: master, output: comp };
  }
  H.audioEngine = engine;

  // ---------- live controller: off by default, one output screen, synced settings ----------
  H.createAudio = function (atm, o) {
    o = o || {}; var role = o.role || 'dm', id = role + '-' + Math.random().toString(36).slice(2, 8);
    var st = { enabled: false, volume: o.volume != null ? clamp(o.volume, 0, 1) : 0.6, output: o.output || 'dm' };
    var ctx = null, eng = null, vol = null, yielded = false, playing = false, offFrame = null, listeners = {}, ch = null, own = false;
    if (o.channel && typeof o.channel === 'object') ch = o.channel; else if (typeof BroadcastChannel !== 'undefined') { try { ch = new BroadcastChannel(o.channel || 'hearth-projector-map'); own = true; } catch (e) { } }
    function emit(ev, a) { (listeners[ev] || []).forEach(function (f) { try { f(a); } catch (e) { } }); }
    function post(m) { try { if (ch) ch.postMessage(m); } catch (e) { } }
    function shouldPlay() { return st.enabled && st.output === role && !yielded; }
    function start() {
      if (!ctx) { var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return emit('unsupported'); ctx = new AC(); vol = ctx.createGain(); vol.connect(ctx.destination); eng = engine(ctx, vol, (atm.seed || 7) ^ 0x5a5a); }
      vol.gain.setTargetAtTime(st.volume * st.volume, ctx.currentTime, 0.1);
      if (ctx.state !== 'running') ctx.resume().then(function () { if (ctx.state !== 'running') emit('blocked'); }, function () { emit('blocked'); });
      if (!offFrame) offFrame = atm.on('frame', function () { if (playing && ctx.state === 'running') eng.update(atm.audioState(), ctx.currentTime + 0.05, 0.3); });
      playing = true; post({ type: 'hearth-atmos-audio-claim', id: id }); emit('playing', true);
    }
    function halt() { if (!playing) return; playing = false; if (ctx) { vol.gain.setTargetAtTime(0, ctx.currentTime, 0.15); var c = ctx; setTimeout(function () { if (!playing && c.state === 'running') c.suspend(); }, 600); } emit('playing', false); }
    function apply() { if (shouldPlay()) start(); else halt(); emit('change', api.state()); }
    function onMsg(ev) { var d = ev.data; if (!d || typeof d.type !== 'string') return;
      if (d.type === 'hearth-atmos-audio') { st.enabled = !!d.state.enabled; st.volume = clamp(+d.state.volume, 0, 1); st.output = d.state.output; yielded = false; apply(); }
      else if (d.type === 'hearth-atmos-audio-claim' && d.id !== id && playing) { yielded = true; halt(); } }   // never two screens at once
    if (ch) ch.addEventListener('message', onMsg);
    function share() { post({ type: 'hearth-atmos-audio', state: { enabled: st.enabled, volume: st.volume, output: st.output } }); }
    var api = {
      enable: function (on) { st.enabled = !!on; yielded = false; apply(); share(); return api; },     // call from a user gesture
      setVolume: function (v) { st.volume = clamp(+v, 0, 1); if (ctx && playing) vol.gain.setTargetAtTime(st.volume * st.volume, ctx.currentTime, 0.1); share(); emit('change', api.state()); return api; },
      setOutput: function (r) { st.output = r === 'projector' ? 'projector' : 'dm'; yielded = false; apply(); share(); return api; },
      unlock: function () { if (ctx) ctx.resume(); else if (shouldPlay()) start(); return api; },  // for a projector-side "tap to enable sound" button
      state: function () { return { enabled: st.enabled, volume: st.volume, output: st.output, role: role, playing: playing, context: ctx ? ctx.state : 'none' }; },
      on: function (ev, f) { (listeners[ev] = listeners[ev] || []).push(f); return api; },
      destroy: function () { halt(); if (offFrame) offFrame(); if (ch) { ch.removeEventListener('message', onMsg); if (own) ch.close(); } if (ctx) ctx.close(); }
    };
    return api;
  };

  // ---------- offline render of a recorded state timeline (demo videos) ----------
  // frames: [{ s: atm.audioState(), fade: 0..1 }] at 'fps'; resolves to a 16-bit stereo WAV as base64.
  H.renderAudioTrack = function (frames, fps, seed, volume) {
    var sr = 48000, dur = frames.length / fps + 0.5, oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr), vol = oc.createGain(); vol.gain.value = volume == null ? 0.8 : volume; vol.connect(oc.destination);
    var eng = engine(oc, vol, seed || 7), q = 128 / sr, lastQ = -1;
    frames.forEach(function (f, i) { var tq = Math.round(i / fps / q); if (tq <= lastQ) return; lastQ = tq; var tt = tq * q;
      oc.suspend(tt).then(function () { eng.update(f.s, tt, 0.25, f.fade); oc.resume(); }); });
    return oc.startRendering().then(function (buf) {
      var n = buf.length, a = buf.getChannelData(0), b = buf.getChannelData(1), out = new DataView(new ArrayBuffer(44 + n * 4));
      function str(o2, s) { for (var i = 0; i < s.length; i++) out.setUint8(o2 + i, s.charCodeAt(i)); }
      str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
      out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
      for (var i = 0, p = 44; i < n; i++, p += 4) { out.setInt16(p, clamp(a[i], -1, 1) * 32767, true); out.setInt16(p + 2, clamp(b[i], -1, 1) * 32767, true); }
      var bytes = new Uint8Array(out.buffer), s = '', CH = 0x8000; for (var j = 0; j < bytes.length; j += CH) s += String.fromCharCode.apply(null, bytes.subarray(j, j + CH));
      return btoa(s);
    });
  };
})(typeof window !== 'undefined' ? window : this);
