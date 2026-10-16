# Hearth signature reskin ("hearth" palette): notes for Lumi

**Drop-in:** `hearth-reskin.css` (18 KB, has 3 small WebP textures embedded: leather 1.3 KB, parchment 0.5 KB, charcoal 0.3 KB, all offline). Source: `src.css`, `tex.py` (makes the textures), `build.js` (embeds them). Edit src.css and run `node build.js`.

## Wiring
1. Load **after** the app `<style>` blocks and after `themes.css` / `themes-2.css`.
2. Add to the PALETTES map: `hearth:{tone:'dark',color:'#110e0c'}`. Result: `<html data-theme="dark" data-palette="hearth">`.
3. **New default:** for new installs, if `prefs.palette` is unset, use `'hearth'`. Suggestion: existing users who already picked Light/Dark keep their look, and we show a one-time "Try the new Hearth look" toast. Your call.
4. Put it at the top of the theme picker as "Hearth (signature)". theme-color is `#110e0c`.

## What it does (all scoped to `[data-palette="hearth"]`)
- Base: dark charcoal texture with a faint ember glow from below.
- Banner: leather plate with a double brass rim, 4 rivets and a gradient brass title; the shield sits in a brass bezel with an ember glow.
- Tab bar: leather strap with a stitched brass edge; the active tab has an ember glow and a flame underline.
- Tiles, cards and DM tiles: tooled leather with a brass hairline. Large home tiles get rivets.
- Parchment reading strips (boosts, resources, `.vellum-box`, `.hearth-tour`), with dark ink and an ember left edge.
- Buttons: primary ones (`.btn.primary`, Start combat, Open projector) are brass plates with pressed states. Secondary ones are leather with a brass edge.
- Inputs: inset leather wells with a brass focus ring.
- Selected options (`*-card.selected`, `.dialog-option.selected`, `[aria-pressed]`): a brass ring and full-strength text. This also fixes the washed-out selected Settings cards.
- Dialogs: a leather frame with an inner brass rim. `hr` and `.divider` become a brass rule with an ember centre.
- Nothing animates. Transitions are off under prefers-reduced-motion.

## Checks done
- **Other palettes untouched:** `leak-check.txt` renders tavern, arcane, no-palette light and no-palette dark with and without the file, and they are pixel-identical. The first row ("forge") is a warm-up and differs between two runs even without the file, so ignore it.
- **Contrast:** `contrast.md` has 20/20 pairs passing AA (lowest is crimson on the lightest leather pixel, 4.88). Texture surfaces are measured at their worst 2% pixel.
- **Safe area:** no padding, margin or top rules on `.app`, `body` or `.header`, so the v0.93.1 `env(safe-area-inset-top)` and `--hearth-native-top` fix is unchanged. The phone renders include a mock status bar.
- **Renders:** `png/{phone,desk}-{home,sheet,dm,forge,dialog,settings}-{before,after}.png` and `png/contact-phone.jpg` / `contact-desktop.jpg`. "Before" is today's default Light look.

## Risks / please check
- The selectors (`.boosts-strip`, `.resources-strip`, `.dm-*`, `.settings-size-card`) were taken from v1.4.1. If 1.5.x renamed any of them, those parts fall back to the generic leather look rather than breaking.
- I used `!important` widely to win over the ~350 dark rules and themes-2. It is scoped to this palette only.
- Parchment strips force dark ink on all their children. Any coloured badge inside them (e.g. a red "used" chip) will turn dark brown, so check the resources pips in 1.5.x.
- HP Damage/Heal keep the app's semantic red/green. The brass bottom edge (#9a6d2a) is about 4:1 with button text, but the text sits mid-plate, where it's 6.8:1.
- Tested only in Chromium against the v1.4.1 copy, not in the Android WebView or 1.5.x.
- In the settings render, "Light" shows as selected because I forced the palette without changing prefs. That's a test artifact.
