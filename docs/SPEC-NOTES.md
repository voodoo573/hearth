# Hearth 1.7.0 — DM screen: our notes on Jenny's specs

These are Hearth's own notes on how the build reads Jenny's specs
(`jenny-art/map-interactions/SPEC.md`, `jenny-art/dm-layout/PROPOSAL.md`,
`jenny-art/atmosphere/NOTES.md`). Her files are left as they are; anything we
decided or changed is written down here instead.

## Who counts as "inside" a template
- A creature is caught when **the centre of any square it fills** is inside the
  template (or exactly on its edge). A Large dragon (2×2) is caught if any one
  of its four square centres is covered; a Huge one (3×3) if any of nine is.
- Cones follow 5e: the width at any distance equals that distance (half-angle
  atan ½ ≈ 26.6°). The cone's origin creature is never counted.
- Dead creatures aren't counted. The creature count shows on the DM screen only;
  the projector's label gives the size (`30 ft cone`), never the count, so a
  hidden creature can't be given away by a number.
- Code: `hits()` in `app/dm/mi.js`.

## Waypoints while moving a token
- **W** is the waypoint key. **Space** also works, because Space isn't
  hold-to-pan anywhere on the DM screen (if a hold-to-pan Space is ever added,
  Space comes off this list).
- Pausing for **~350 ms** also adds one (Jenny's spec said 400 ms). A gold dot
  fills on the square while you wait, so you can see a waypoint coming.

## Tool fan
- The ✦ fan holds only things you do during a turn: AoE, Measure, Point (inner
  ring) and Fog, Group, Grid, Map, View (outer ring). **Weather & light** moved to
  the ⋯ More menu.
- Both fans use the SPEC v3 geometry: a quarter-circle centred on the screen
  corner, with a brass track and two evenly spaced rings.

## The projector
- Creatures that are hidden, dead, or under fog are left out of the map message
  entirely (no token, label, turn-order row, light or picture), in every mode.
- The map fills the screen (no side bars). It's framed on what the players can
  see and kept inside the map's edges. Turn order sits over the map on a
  translucent panel.
- Nothing about sound is shown on the projector. If its browser holds audio
  until a tap, the DM screen shows **Tap to enable sound**; any tap or key on
  the projector window also starts it.

## The map on the DM screen
- Full-bleed on desktop and phone: no frame, no side bars. The board covers the
  stage (under the strip, or from the pinned card's edge to the screen edge).
- It opens framed on all the creatures where they fit, otherwise on whoever's
  turn it is.
- When a fan opens, the camera pans only inside the map's edges. On desktop it
  only moves the board up; on a phone it can also slide it left (and, for a
  template, zoom to about 52 px squares at most) so the template, its origin
  creature and the tokens clear the fan. A creature in the map's last couple of
  squares under the fan's corner can't always clear it without panning past
  the map's edge, which the board never does. The template stays framed then.
- A cone's resize handle sits right on its corner. It only slides off to clear
  a token.

## Weather & light
- On the DM screen the light layer sits under the templates, tokens and their
  labels, so every creature stays readable after dark. The projector keeps
  Jenny's layering, where tokens take the scene's light.
- Hearth maps with torches or fires throw a few embers after dark even with no
  weather set (uploaded maps never do).
- Storm: lightning is the engine's own (`setLightning`/`flash()`). Jenny's
  engine has no cloud shadow, so ours lives in `app/dm/atmo.js`: soft shadows
  that drift with the wind under the rain. Both screens run the same loop,
  phased off the clock, so they match.

## 1.7.0 QA fixes (Lee's DM-side pass, `tests/qa170.test.js`)
- One question for every player-facing channel: `playerVisibility(enc)` in
  `app/index.html` (hidden from players, a dead monster, or a non-player whose
  footprint is under the soft fog). The projector map, its turn order and
  lights, templates that follow a creature, roll cards, the live game link to
  the phones and the weather's embers, smoke and DM sound all use it.
  `playerVisibleName(c)` gives the name players may see (a hide-name creature
  is only its token number; its real name is never sent).
- A template attached to a creature the players can't see isn't sent to the
  projector at all, so it can't trace the creature.
- Rolls for a creature the players can't see are DM-only (`secret`): no
  auto-project for "important" rolls in either layout, no Send-to-projector.
- A light carried by a creature the players can't see is DM-only: it glows on
  the DM's light layer but throws no embers or smoke, and the DM screen's own
  sound leaves it out (left out, not just lowered: a crackle panned to where
  nobody stands gives the ambush away). This needs one flag in Jenny's engine
  (`dmOnly` on a light, honoured by `fireSources()` and `audioState().fires`
  in `app/dm/atmo/hearth-atmosphere.js`), worth folding into her source copy.
- Fog undo is a per-cell diff: undo puts back only the sub-squares that step
  changed and that still hold its result, so later changes (classic Hide all,
  the classic brush, darkvision reveals) survive. Fog, template and move undo
  and the round history are kept in `sessionStorage`: they survive a reload,
  and go when the tab closes (the fog history says so).
- Cones and lines from a Large or bigger creature start on the edge of its
  space, facing the aim (the apex slides round the footprint as it's aimed).
  Medium and smaller casters are unchanged (centre of their square). A template
  dragged off the creature keeps its own point.
- The DM's template label counts hidden creatures too, marked:
  "3 creatures (1 hidden)". The projector label is still size only.
- Measure counts squares like the move chip (a diagonal square is 5 ft); a drag
  is charged along its cheapest route, as the reach shading assumes.
- The combined release (UI polish + 1.5.1 merge + C2 QA fixes) sets
  `APP_VERSION`, `HEARTH_VERSION` and both `CACHE_VERSION`s to 1.7.0.

### Follow-ups from the QA-170 screenshots (`tests/qa170.test.js`, "Follow-up")

- The dark plates and corner fans stay dark on every theme, so their text no
  longer uses the theme inks (`--ink`, `--ink-soft`, `--gold`), which go dark
  on light themes. `mi.css` has `--mi-plate-ink`, `--mi-plate-soft` and
  `--mi-plate-gold`. Dark themes map them to the theme inks, so they look as
  before. Light themes get light inks (their own ink mixed almost all the way to
  white), and the chosen fan button gets a
  gold mixed toward white. They're used by the desk help line, the phone's
  off-screen markers ("Ranger in cone"), the labels under the template fan's
  and the tool fan's buttons, and (deepened instead) the template's name on the
  pale light-theme chip. The worst case across all 26 palettes was 1.01–3.08:1
  and is now 6.1:1 or better (help line 7.8, markers 14.3, fan labels 7.8,
  template name 6.1).
- A creature's name caption keeps clear of the bottom-corner furniture: the
  tool fan and template fan (quarter circles on the corner), the round fan
  button, the pills and the help line. A covered caption moves above its token,
  then to its left, and goes back under once nothing covers it (`mi.js`
  `clearCaps`, run after every map refresh, scroll and fan close).
- The phone's off-screen markers slide up or down off their creature's row
  (at most four marker-heights) to the nearest spot clear of the template
  labels, the pills and each other. The labels themselves keep their places.

### Change to Jenny's engine copy (`app/dm/atmo/hearth-atmosphere.js`), to fold into her source

This is the only change to her engine in 1.7.1. It adds an opt-in `dmOnly`
flag on a light. Lights without it behave exactly as before. The follow-ups
above don't touch the engine. Her `atmosphere/hearth-atmosphere.js` is byte-identical to the 1.7.0
vendored copy, and the patch applies cleanly to it (checked on a copy). To
apply it: `patch atmosphere/hearth-atmosphere.js < engine.diff`.

```diff
--- a/app/dm/atmo/hearth-atmosphere.js
+++ b/app/dm/atmo/hearth-atmosphere.js
@@ -150,7 +150,7 @@
       return p;
     }
     var emitters = [];
-    function fireSources() { var o2 = emitters.slice(); for (var i = 0; i < lights.length; i++) { var l = lights[i]; if (l.type === 'campfire' || l.type === 'torch') { var q = lightPos(l); o2.push({ x: q.x, y: q.y, r: l.type === 'campfire' ? 0.45 : 0.15 }); if (l.type === 'campfire') o2.push(o2[o2.length - 1], o2[o2.length - 1]); } } return o2; }
+    function fireSources() { var o2 = emitters.slice(); for (var i = 0; i < lights.length; i++) { var l = lights[i]; if (l.dmOnly) continue; if (l.type === 'campfire' || l.type === 'torch') { var q = lightPos(l); o2.push({ x: q.x, y: q.y, r: l.type === 'campfire' ? 0.45 : 0.15 }); if (l.type === 'campfire') o2.push(o2[o2.length - 1], o2[o2.length - 1]); } } return o2; }
     function spawnSmoke(p, initial) { p.x = R() * W; p.y = R() * H; p.life = 4 + R() * 5; p.age = initial ? R() * p.life : 0; p.r = (0.7 + R() * 1.3) * sq; p.k = R() * 1000;
       var src = fireSources(); if (src.length && R() < 0.6) { var f = src[(R() * src.length) | 0]; p.x = (f.x + (R() - 0.5) * 0.6) * sq; p.y = (f.y + (R() - 0.5) * 0.6) * sq; if (initial) p.y -= R() * sq * 3; }
       return p; }
@@ -175,7 +175,8 @@
       L = L || {}; var p = LIGHTS[L.type] || LIGHTS.torch, id = L.id || ('l' + (++lid));
       var l = { id: id, x: L.x || 0, y: L.y || 0, follow: L.follow || null, token: L.token || null,
         radius: L.radius || p.radius, colour: parseColour(L.colour || L.color, p.colour), flicker: L.flicker != null ? L.flicker : p.flicker,
-        speed: L.speed || p.speed, intensity: L.intensity != null ? L.intensity : 1, seed: L.seed != null ? L.seed : (hashStr(id) % 10000) / 100, type: L.type || 'torch', occlude: L.occlude !== false };
+        speed: L.speed || p.speed, intensity: L.intensity != null ? L.intensity : 1, seed: L.seed != null ? L.seed : (hashStr(id) % 10000) / 100, type: L.type || 'torch', occlude: L.occlude !== false,
+        dmOnly: !!L.dmOnly }; // Hearth 1.7.1: a DM-only light (carried by a creature the players can't see) glows on the DM's light layer only — no embers, smoke or sound
       lights.push(l); kick(); return l.id;
     }
     function removeLight(id) { for (var i = lights.length - 1; i >= 0; i--) if (lights[i].id === id || id === '*') lights.splice(i, 1); kick(); }
@@ -783,7 +784,7 @@
       audioState: function () { var f = flashLog.splice(0, flashLog.length), t = tick * DT;
         return { t: t, weather: st.weather, wI: st.wI, time: st.time, darkness: st.darkness, indoor: st.indoor, wet: build.wet, snow: build.snow,
           gust: n1(t * 0.18, 3), sandGust: st.weather === 'sandstorm' ? sandGust(t) : 0, sandWhite: st.weather === 'sandstorm' ? sandWhite(t) : 0, flash: flashV,
-          strikes: f, fires: lights.filter(function (l) { return /campfire|torch|candle|lantern/.test(l.type); }).map(function (l) { var p = lightPos(l); return { type: l.type, x: p.x / cols, i: l.intensity }; }),
+          strikes: f, fires: lights.filter(function (l) { return !l.dmOnly && /campfire|torch|candle|lantern/.test(l.type); }).map(function (l) { var p = lightPos(l); return { type: l.type, x: p.x / cols, i: l.intensity }; }),
           lava: st.weather === 'embers' ? Math.min(1, emitters.length / 12) : 0 }; },
       renderAt: function (t) { t0abs = clock() - t * 1000; tick = Math.max(0, Math.floor(t * HZ) - 60); reseed(); render(); },
       stop: stop
```
