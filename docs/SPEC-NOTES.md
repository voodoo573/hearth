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
- The build still says v1.6.0 (`APP_VERSION`, `CACHE_VERSION`) on purpose: the
  combined release sets both.
