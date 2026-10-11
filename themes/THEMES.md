# Hearth extra themes: notes for Lumi

**Files:** `themes.css` (drop-in), `palettes.js` + `build.js` (source; run `node build.js` to regenerate the CSS and `contrast.md`), `png/` (renders of the real v1.4.1 app with themes.css injected).

## How it plugs in (no edits to existing CSS)
The app has about 350 `html[data-theme="dark"] …` component rules, so `data-theme` **stays as the base tone** (`light`/`dark`). The palette goes in a second attribute:

```html
<html data-theme="dark" data-palette="arcane">
```
1. Load `themes.css` **after** the app's `<style>` blocks. Selectors have the same specificity as the app's, so the later file wins.
2. `prefs.theme` keeps `'light' | 'dark'`. Add `prefs.palette` (default `''` = today's look) and the optional visual prefs below.
3. In `applyPrefsToBody()`:
```js
const PALETTES = { tavern:{tone:'dark',color:'#140c07'}, forest:{tone:'light',color:'#24361f'},
  forge:{tone:'dark',color:'#111214'}, arcane:{tone:'dark',color:'#0d0e26'}, frost:{tone:'light',color:'#1f2e3e'},
  infernal:{tone:'dark',color:'#100605'}, contrast:{tone:'dark',color:'#000000'},
  oldmap:{tone:'light',color:'#2c2216'}, hoard:{tone:'dark',color:'#07110c'} };
const pal = PALETTES[prefs.palette];
const theme = pal ? pal.tone : (prefs.theme === 'dark' ? 'dark' : 'light');
const h = document.documentElement;
h.setAttribute('data-theme', theme);
pal ? h.setAttribute('data-palette', prefs.palette) : h.removeAttribute('data-palette');
for (const k of ['texture','font','cards','motion']) prefs[k] ? h.setAttribute('data-'+k, prefs[k]) : h.removeAttribute('data-'+k);
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal ? pal.color : (theme==='dark' ? '#1a1814' : '#1a1814'));
```
4. Settings: put the palette swatches under the Light/Dark cards (same `settings-size-card` pattern, `data-palette-pref`). Picking a palette overrides Light/Dark. Picking Light or Dark clears the palette. Android: also update the native status-bar colour from `pal.color`.

## Themes (all body text passes WCAG AA; High Contrast passes AAA)
| id | Name | Tone | Mood | Body ink | Faded/labels |
|---|---|---|---|---|---|
| tavern | Tavern Night | dark | deep smoky brown, candle amber, brass; leather texture | 11.0 | 6.1 |
| forest | Elven Forest | light | birch-bark pages, moss ink, lichen-gold, moss banner | 10.8 | 4.9 |
| forge | Dwarven Forge | dark | charcoal and iron, molten orange, stone-block texture | 10.6 | 5.3 |
| arcane | Arcane Tower | dark | midnight indigo, violet cards, starlight gold, faint stars | 11.6 | 5.9 |
| frost | Frost (Icewind) | light | ice-blue and snow-white, steel ink and banner; best in sunlight | 11.3 | 4.8 |
| infernal | Infernal | dark | blackened red, ember accents, bone text | 12.9 | 6.8 |
| contrast | High Contrast | dark | black, white, yellow, solid outlines, clean font, framed cards | 19.2 | 13.6 |
| oldmap | Old Map (optional) | light | pale sepia chart paper, iron-gall ink, navigator's grid | 10.1 | 5.1 |
| hoard | Dragon Hoard (optional) | dark | deep emerald, heaped gold, gold buttons | 11.5 | 6.5 |

Ratios are worst case across the page gradient and both ends of the card sheen. Every new theme also clears 4.5:1 for gold accent text, crimson, heal-green and temp-HP text on cards, the subtitle, the ability plate and button text, plus 3:1 for focus rings. Full table: `contrast.md`.

**The current themes fail some of these checks** (fix them while you're in there):
- Light: `--ink-faded` #6e5230 drops to 3.82:1 at the bottom of the page gradient. `--rs-label-ink` is 4.11. Gold text (#a87c38, used for "Mr G. N. Wood" and the create tile) is 1.99 on the page and 2.71 on cards. The focus ring is 2.5.
- Dark: crimson #c25a4a (DAMAGE and low-HP text) is 3.04 on cards, and temp-HP #6a9aaa is 4.27.

Semantic colours keep their meaning in every theme. Gold/amber means "whose turn", blue means DM selection, crimson means damage, green means heal and teal means temp HP.

## Visual options (independent of palette)
| attribute | values | notes |
|---|---|---|
| `data-texture` | `parchment` `leather` `stone` `none` | Omit it to get the palette default. Leather and stone are tiny inline SVG noise tiles, so they work offline with no image files. Arcane gets stars and Old Map gets a chart grid by default. Also works on the classic light and dark themes. |
| `data-font` | `classic` (default) `clean` | Clean uses the app's own `--rs-sans` system stack, which helps legibility at small sizes and for dyslexic readers. No web fonts. |
| `data-cards` | `raised` (default) `flat` `framed` | Flat has no shadows, so it's cheaper on old phones. Framed has a 2px rule border and suits High Contrast and printing. |
| `data-motion` | `reduced` | A manual override on top of `prefers-reduced-motion`. **Please gate the painted-map overlay loop on this as well.** |

The existing Text size option sits naturally alongside these. A possible later addition is `data-density="compact"` for DMs on small phones.

## Hooks: places where themes.css overrides hard-coded colours
These are the header plate (`.header-compact`, h1, `.hearth-edition-badge`, `.header .subtitle`), the ability-score band (`.stats-bar` and its stat cells, now the palette's plate), the HP controls (`.hp-btn*`, `.hp-input`, `.hp-quickstep-btn`), `.action-tab(-card)`, `.stat-cell`, and primary buttons. New tokens: `--header-a/-b/-ink/-sub`, `--plate-ink`, `--control-fill(-hover)`, `--page-texture`, `--tex-*`.

**Remaining small leaks** (still hard-coded warm brown/gold, minor, best fixed at source by switching to tokens):
- `.action-roll-btn` border `rgba(212,160,75,.45)`
- `.feature-spell-tag` text #6d4f19, which is low contrast on every dark theme, **including the current Dark**
- `.spell-source-tag.*` class colours
- About 20 other `rgba(60,42,24,…)` / `rgba(212,160,75,…)` fills in the dark-mode Play-screen rules

I only checked the Home and Play screens. The DM map, Forge and dialogs need a pass with each palette.

---

# Batch 2: class & ancestry themes (themes-2.css)

**Files:** `themes-2.css` (load **after** `themes.css`; it reuses the shared textures, hooks and options), `palettes2.js` + `build2.js` (source; `node build2.js` regenerates the CSS, `contrast-2.md` and `distinct-2.md`). Renders: `png/phone-<id>.png`, `png/sheet-<id>.png`, contact sheet `png/themes-sheet-2.png`. Batch 1 (`themes.css`, the 9 shipping in 1.5.0) is unchanged byte-for-byte.

Same mechanism: `data-theme` = base tone, `data-palette` = id. Add these to the `PALETTES` map:
```js
// batch 2
  dawn:{tone:'light',color:'#2a2416'},
  shade:{tone:'dark',color:'#070707'},
  wildwood:{tone:'dark',color:'#0b1206'},
  moonsilver:{tone:'dark',color:'#0e131a'},
  pact:{tone:'dark',color:'#07040c'},
  surge:{tone:'dark',color:'#5a0f6e'},
  encore:{tone:'dark',color:'#22030e'},
  warpaint:{tone:'light',color:'#121110'},
  mountain:{tone:'light',color:'#2a3038'},
  banner:{tone:'light',color:'#5e0c16'},
  clockwork:{tone:'dark',color:'#3a2a10'},
  scales:{tone:'dark',color:'#2a1e08'},
  hollow:{tone:'light',color:'#1e3a14'},
  'scott-ultramarine':{tone:'dark',color:'#0b0c5a'},
  'scott-marine':{tone:'dark',color:'#081426'},
```
`color` is the browser/status-bar colour. Sacred Dawn, Still Mountain and Dragonscale have **light header plates with dark lettering**, so their `color` is a dark tone (not the plate) to keep the white status-bar icons readable.

| id | Name | Inspiration | Tone | Texture | Mood | Body ink | Faded/labels |
|---|---|---|---|---|---|---|---|
| dawn | Sacred Dawn | paladin · cleric | light | parchment | Sunlit white marble and temple stone, warm sun-gold accents and a pale gold header | 11.6 | 4.6 |
| shade | Nightshade | rogue | dark | leather | Soot-black leather and smoke-grey text with a thin trickle of poison green | 11.7 | 5.1 |
| wildwood | Wildwood | ranger · druid | dark | leather | Dark bark and olive moss with ash-wood text and a fletching-red accent | 10.3 | 4.7 |
| moonsilver | Moonsilver | wizard · elf | dark | stars | Deep sea-night blue, moonlit silver text and seafoam accents, with faint drifting motes | 10.9 | 4.9 |
| pact | Eldritch Deep | warlock · drow / Underdark | dark | stars | Lightless violet-black with faelight-lilac accents, sickly green lettering and glowing spores | 12.9 | 5.5 |
| surge | Wild Surge | sorcerer | dark | none | A raw-magic gradient from magenta through violet to ember orange, with hot-pink accents | 12.8 | 5.5 |
| encore | Velvet Encore | bard | dark | weave | Plush wine-red velvet, gilt lettering and gold-trimmed cards like a theatre box | 12.3 | 5.3 |
| warpaint | Warpaint | barbarian | light | parchment | Bleached bone pages, a charcoal fur header and slashes of ochre-red war paint | 11.2 | 4.6 |
| mountain | Still Mountain | monk | light | weave | Pale bamboo paper on a woven-mat texture, a saffron-robe header with slate lettering, saffron accents | 10.5 | 4.6 |
| banner | Banner & Blade | fighter | light | none | Polished steel-grey pages under a heraldic scarlet banner with gold charges | 10.1 | 4.7 |
| clockwork | Clockwork | artificer · gnome | dark | stone | Oxidised verdigris-teal panels, brass plating and copper accents | 10.0 | 4.6 |
| scales | Dragonscale | dragonborn | dark | scales | Burnished olive-bronze scales, a molten bronze header and dragonfire-red accents | 11.0 | 4.9 |
| hollow | Honeyed Hollow | halfling | light | parchment | Golden honey pages, a leafy green door of a header and amber accents | 9.9 | 4.5 |
| scott-ultramarine | Scott's Ultramarine | custom, for Scott (Thomas's friend) | dark | brushed (own) | Saturated true-ultramarine panels, polished-silver lettering and borders under a brushed-silver header band | 9.4 | 6.0 |
| scott-marine | Scott's Royal Marine | custom, for Scott (Royal Marines colours) | dark | none + stripes (own) | Deep navy, gold lettering and brass buttons, edged with thin gold/green/red regimental stripes like a stable belt | 10.5 | 6.0 |

All 15 pass all 14 checks from batch 1: body, secondary, faded and label text at 4.5:1 or better on page and cards; gold accent text on page and cards; crimson, heal and temp-HP text on cards; wordmark at 3:1; subtitle, ability plate and button text at 4.5:1; and focus ring at 3:1. Full tables are in `contrast-2.md`. A few derived colours were nudged automatically by `build2.js` to clear 4.5. They're listed there.

**Skipped on purpose:** dwarf (Dwarven Forge covers it) and tiefling (hellfire crimson and obsidian would be a near-twin of Infernal).

**Merged where natural:** paladin + cleric, ranger + druid, wizard + elf, warlock + drow/Underdark, artificer + gnome.

**New textures (CSS-only, also valid `data-texture` values):**
- `scales`: offset arcs with a sheen, used on Dragonscale.
- `weave`: a slat checker with thread lines. It's velvet nap on Velvet Encore and a bamboo mat on Still Mountain, which has a per-palette softer shade.

`stars` is now also a valid `data-texture` value.

**Special rules:** Wild Surge overrides the body background with a diagonal magenta-to-ember gradient and gives the header a three-stop gradient. Everything else goes through tokens.

**Semantic note:** in Nightshade and Eldritch Deep the accent (`--gold`, "whose turn") is green or lilac, so heal (`--moss`) is pushed to mint or lime to stay distinguishable. Please eyeball the initiative tracker in those two.

Same remaining leaks as batch 1 (`.feature-spell-tag` text and `.action-roll-btn` border). Also check the avatar placeholder, which is barely visible on the light palettes, as it is on today's Light.

### Scott's Ultramarine (`scott-ultramarine`), added on request
- **Look:** a dark base of saturated ultramarine. The page runs from #141c86 to #06073a and the cards are #16249a. Text, lettering and borders are polished silver (#f2f5fa / #d9e0ec / #bcc6dc).
- **Header band:** a crisp silver band with fine brushed lines and ultramarine lettering (#14208f). The ability-score band uses the same silver plate. Primary buttons are silver with ultramarine text.
- **Accent:** silver-periwinkle #cfdcff ("whose turn"). `--indigo` (DM selection) is set to white so it stays distinct on a blue page. HP colours are the standard soft red, green and cyan.
- **Texture:** `brushed` is a fine horizontal-line texture defined only for this palette, in a rule after the palette blocks. It isn't a general `data-texture` option. Users can still pick parchment, leather, stone, none, scales, weave or stars.
- **Contrast:** all 14 checks pass. Body 9.38, secondary 7.72, faded 5.98, labels 6.42, accent text 7.49 (worst of page and card), lowest HP colour 5.08. Every other result is in `contrast-2.md`.
- **Distinctness:** in the colour-distance check it's 17.9 from Moonsilver and 19.5 from Arcane Tower, the furthest of any batch-2 theme from its nearest neighbour. The side-by-side is `png/scott-vs-neighbours.png`.
- **Status bar:** the header band is light, so the status-bar `color` is the dark page tone #0b0c5a.

### Scott's Royal Marine (`scott-marine`), second option for Scott
- **Name:** "Scott's Royal Marine". "Scott's Corps" was considered, but on a small header it reads like "corpse" and needs explaining, so the fuller name is used. The id is `scott-marine` as requested. `scott-ultramarine` is unchanged; Scott can pick either.
- **Look:** a dark, deep-navy base (not ultramarine). The page runs from #0a2442 to #020a14 (#05162a mid) and the cards are #0c2b4b. Lettering is ivory (#f4efdf / #ddd6c0 / #bfb79c, labels #c9c0a2). The wordmark, "whose turn" accent and focus ring are Royal Marines yellow-gold #f5c518. Card borders are brass #d4a83a. Primary buttons are brass-gold (#e8b820 → #c2940e) with navy text (#0a1426).
- **Regimental stripes:** colours are `--rm-red #c8102e`, `--rm-gold #f5c518` and `--rm-green #2e8b3a`, defined in rules after the palette blocks (`build2.js` tail):
  - Order everywhere (Thomas, v1.5.0): YELLOW (gold), then GREEN, then RED, top to bottom or left to right.
  - Header plate: gold/green/red bands across the bottom edge (3px / 4px / 4px), with a gold border.
  - Play-screen vitals card (HP, AC, speed…): gold/green/red bands across the top edge as inset shadows.
  - Ability-score band (`.stats-bar`, the sheet view): the same bands across its top.
  - Home tiles: a thin gold/green/red edge stripe down the left side, like a stable belt.
  - Active tab: a gold underline over a red rule.
- **HP colours echo the regiment:** damage red #ff7671 and heal green #5fd47a (lightened from the regimental red and green so they pass 4.5:1 on the navy cards). Temp HP is #7fd0f0.
- **Texture and font:** no page texture by default, for a crisp look. The default font is classic. The clean sans (`data-font="clean"`) suits it well and is offered as an option.
- **Contrast:** all 14 checks pass with no automatic nudges. Body 10.50, secondary 8.31, faded 6.02, labels 6.64, accent text 7.41 (worst of page and card; 9.59 on page), danger 4.65, heal 6.43, temp HP 7.01, wordmark 7.97, subtitle 9.49, plate ink 11.30, button text 6.61, focus ring 9.59.
- **Distinctness:** 21.1 from Scott's Ultramarine and 8.2 from Nightshade, its nearest batch-2 theme. In the colour-only metric its nearest batch-1 theme is Arcane Tower (4.5), because both are dark blue with gold. Rendered side by side they look clearly different: Arcane is violet-indigo with pale starlight gold and drifting stars. This one is blue navy with saturated yellow gold and red/green stripes, which the metric doesn't count.
- **Status bar:** `color` #081426.
- **Images:** `png/phone-scott-marine.png`, `png/sheet-scott-marine.png`, and the side-by-side `png/scott-two-options.png`.
