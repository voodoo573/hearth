/* Hearth 1.6.0: dice physics pre-simulation worker (keeps big pools off the main thread).
   Loads the same vendored three.js r158 + cannon-es 0.20.0 + hearth-dice.js; no network. */
self.window = self;
importScripts('three.min.js', 'cannon-es.js', 'hearth-dice.js');
self.onmessage = function (e) {
  var o = e.data;
  try {
    var pl = HearthDice._planRaw(o), fr = pl.frames, stride = fr[0].length, buf = new Float32Array(fr.length * stride);
    fr.forEach(function (f, i) { buf.set(f, i * stride); });
    var plan = {}; for (var k in pl) if (k !== 'frames') plan[k] = pl[k];
    self.postMessage({ id: o.id, plan: plan, buf: buf.buffer, nf: fr.length, stride: stride }, [buf.buffer]);
  } catch (err) { self.postMessage({ id: o.id, error: String((err && err.message) || err) }); }
};
