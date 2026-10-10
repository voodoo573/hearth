/* Hearth v0.93.1 — paints a battle map off the main thread so the app stays
   responsive on slow phones. Same renderer as the page (painted-maps.js);
   the page falls back to painting itself if this worker can't run. */
importScripts('painted-maps.js');
self.onmessage = async function (e) {
  const m = e.data || {};
  try {
    const H = self.HearthPaintedMaps;
    const rc = Math.max(8, m.cols), rr = Math.max(8, m.rows), px = m.px;
    let canvas = await H.render(m.id, rc, rr, px);
    const meta = canvas.hearthMeta || {};
    let ox = 0, oy = 0;
    if (rc !== m.cols || rr !== m.rows) {
      ox = Math.floor((rc - m.cols) / 2); oy = Math.floor((rr - m.rows) / 2);
      const c2 = new OffscreenCanvas(m.cols * px, m.rows * px);
      c2.getContext('2d').drawImage(canvas, ox * px, oy * px, m.cols * px, m.rows * px, 0, 0, m.cols * px, m.rows * px);
      canvas = c2;
    }
    const blob = await H.toWebP(canvas, 0.75);
    self.postMessage({ jid: m.jid, ok: true, blob: blob, overlays: (meta.overlays || []).slice(), ox: ox, oy: oy });
  } catch (err) {
    self.postMessage({ jid: m.jid, ok: false, error: String((err && err.message) || err) });
  }
};
