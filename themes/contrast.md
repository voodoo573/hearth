# Hearth themes: WCAG contrast check

Worst case across the page gradient (top / middle / bottom) and both ends of the card glow. AA body text = 4.5:1 (High Contrast is held to AAA, 7:1). Large wordmark = 3:1. Focus ring = 3:1 (non-text).

## Summary (worst-case ratios)

| Theme | Body ink | Secondary | Faded | Labels | Gold text | Result |
|---|---|---|---|---|---|---|
| Current Light (parchment) | 8.90 | 6.45 | 4.73 | 5.08 | 5.02 | pass |
| Current Dark | 10.37 | 7.57 | 5.33 | 6.05 | 5.59 | pass |
| Tavern Night | 11.00 | 8.62 | 6.05 | 6.70 | 7.60 | pass |
| Elven Forest | 10.82 | 7.45 | 4.85 | 5.10 | 4.99 | pass |
| Dwarven Forge | 10.62 | 8.00 | 5.29 | 5.93 | 5.47 | pass |
| Arcane Tower | 11.57 | 8.78 | 5.87 | 6.55 | 9.26 | pass |
| Frost (Icewind) | 11.34 | 7.64 | 4.83 | 5.07 | 5.39 | pass |
| Infernal | 12.87 | 10.01 | 6.83 | 7.51 | 6.99 | pass |
| High Contrast | 19.17 | 17.12 | 13.58 | 15.08 | 13.82 | pass |
| Old Map | 10.09 | 7.50 | 5.07 | 5.32 | 5.12 | pass |
| Dragon Hoard | 11.45 | 9.17 | 6.46 | 7.13 | 8.47 | pass |

## Current Light (parchment)

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#2a1a0c` | 8.90:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#4a3018` | 6.45:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#5e4527` | 4.73:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#5a4024` | 5.08:1 | 4.5 | pass |
| Accent text (gold) on page | `#5e4010` | 5.02:1 | 4.5 | pass |
| Accent text (gold) on cards | `#5e4010` | 6.86:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#7a1e1a` | 7.49:1 | 4.5 | pass |
| Heal (moss) on cards | `#4a5e2c` | 5.19:1 | 4.5 | pass |
| Temp HP on cards | `#2c5d6d` | 5.25:1 | 4.5 | pass |
| Wordmark on header plate | `#a87c38` | 3.09:1 | 3 | pass |
| Header subtitle (9px caps) | `#c9ad7a` | 5.38:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f6e7c6` | 9.48:1 | 4.5 | pass |
| Primary button text | `#f3e3c0` | 9.61:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#7a5218` | 3.65:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#8a5408` | 3.32:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#1b5fa8` | 3.43:1 | 3 | pass |

## Current Dark

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f3e3c0` | 10.37:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#d8c298` | 7.57:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#b9a27a` | 5.33:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#c4ad84` | 6.05:1 | 4.5 | pass |
| Accent text (gold) on page | `#d4a04b` | 6.84:1 | 4.5 | pass |
| Accent text (gold) on cards | `#d4a04b` | 5.59:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#e57866` | 4.52:1 | 4.5 | pass |
| Heal (moss) on cards | `#8aa66a` | 4.85:1 | 4.5 | pass |
| Temp HP on cards | `#7fb2c2` | 5.67:1 | 4.5 | pass |
| Wordmark on header plate | `#d4a04b` | 4.93:1 | 3 | pass |
| Header subtitle (9px caps) | `#c9ad7a` | 5.38:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f6e7c6` | 9.48:1 | 4.5 | pass |
| Primary button text | `#fbefd6` | 6.10:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#e2b45e` | 8.37:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 7.11:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 5.73:1 | 3 | pass |

## Tavern Night

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f7e4c0` | 11.00:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#e6c999` | 8.62:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#c9a771` | 6.05:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#d2b07a` | 6.70:1 | 4.5 | pass |
| Accent text (gold) on page | `#f2b65c` | 9.07:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f2b65c` | 7.60:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ee826c` | 5.26:1 | 4.5 | pass |
| Heal (moss) on cards | `#a3bf7a` | 6.73:1 | 4.5 | pass |
| Temp HP on cards | `#78b4c2` | 5.96:1 | 4.5 | pass |
| Wordmark on header plate | `#f6bb62` | 7.77:1 | 3 | pass |
| Header subtitle (9px caps) | `#d8b47e` | 6.84:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#fbecd0` | 11.47:1 | 4.5 | pass |
| Primary button text | `#fff2d8` | 5.50:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ffc66c` | 10.58:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 7.43:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 5.98:1 | 3 | pass |

## Elven Forest

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#18251a` | 10.82:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#2e4130` | 7.45:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#4a5d45` | 4.85:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#465a41` | 5.10:1 | 4.5 | pass |
| Accent text (gold) on page | `#4d5c16` | 4.99:1 | 4.5 | pass |
| Accent text (gold) on cards | `#4d5c16` | 6.52:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#8f2a22` | 7.39:1 | 4.5 | pass |
| Heal (moss) on cards | `#2c6a3a` | 5.77:1 | 4.5 | pass |
| Temp HP on cards | `#22606f` | 6.27:1 | 4.5 | pass |
| Wordmark on header plate | `#e9efdb` | 7.02:1 | 3 | pass |
| Header subtitle (9px caps) | `#bccaa6` | 4.78:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f1f5e6` | 7.45:1 | 4.5 | pass |
| Primary button text | `#f2f6e8` | 6.70:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#4f7a1c` | 3.45:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#8a5408` | 4.26:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#1b5fa8` | 4.39:1 | 3 | pass |

## Dwarven Forge

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#edebe7` | 10.62:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#d2cdc5` | 8.00:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#aca79f` | 5.29:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#b6b1a8` | 5.93:1 | 4.5 | pass |
| Accent text (gold) on page | `#ff8c40` | 6.64:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ff8c40` | 5.47:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#fa8472` | 5.18:1 | 4.5 | pass |
| Heal (moss) on cards | `#93c26e` | 6.13:1 | 4.5 | pass |
| Temp HP on cards | `#6cb2c9` | 5.33:1 | 4.5 | pass |
| Wordmark on header plate | `#ff9a50` | 5.62:1 | 3 | pass |
| Header subtitle (9px caps) | `#bdb7ad` | 5.92:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f1efea` | 10.27:1 | 4.5 | pass |
| Primary button text | `#fff4e8` | 5.34:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ff9a50` | 7.31:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 6.84:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 5.51:1 | 3 | pass |

## Arcane Tower

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#eeedff` | 11.57:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#d2cdf6` | 8.78:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#aca6db` | 5.87:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#b6b0e2` | 6.55:1 | 4.5 | pass |
| Accent text (gold) on page | `#f4d47e` | 10.98:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f4d47e` | 9.26:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff7d8c` | 5.45:1 | 4.5 | pass |
| Heal (moss) on cards | `#8fd8a2` | 7.96:1 | 4.5 | pass |
| Temp HP on cards | `#7ad2e2` | 7.72:1 | 4.5 | pass |
| Wordmark on header plate | `#f6da8c` | 9.77:1 | 3 | pass |
| Header subtitle (9px caps) | `#bdb5ec` | 7.00:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f2f0ff` | 11.91:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 7.44:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#f6da8c` | 11.56:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 7.22:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 5.82:1 | 3 | pass |

## Frost (Icewind)

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#122238` | 11.34:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#2a3f57` | 7.64:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#445d77` | 4.83:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#415a73` | 5.07:1 | 4.5 | pass |
| Accent text (gold) on page | `#6c4f0a` | 5.39:1 | 4.5 | pass |
| Accent text (gold) on cards | `#6c4f0a` | 7.20:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#a3242c` | 6.98:1 | 4.5 | pass |
| Heal (moss) on cards | `#2d6a3c` | 6.13:1 | 4.5 | pass |
| Temp HP on cards | `#1d5d73` | 6.93:1 | 4.5 | pass |
| Wordmark on header plate | `#eef5fb` | 6.70:1 | 3 | pass |
| Header subtitle (9px caps) | `#bcd0e0` | 4.65:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f4f9fd` | 6.96:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 8.02:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#1d5d9a` | 4.82:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#8a5408` | 4.44:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#1b5fa8` | 4.58:1 | 3 | pass |

## Infernal

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f1e6d2` | 12.87:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#dccbb0` | 10.01:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#bba78c` | 6.83:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#c5af92` | 7.51:1 | 4.5 | pass |
| Accent text (gold) on page | `#ff8e4e` | 7.84:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ff8e4e` | 6.99:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff6e5e` | 5.79:1 | 4.5 | pass |
| Heal (moss) on cards | `#a4c274` | 7.99:1 | 4.5 | pass |
| Temp HP on cards | `#7cbac6` | 7.34:1 | 4.5 | pass |
| Wordmark on header plate | `#ff9c5c` | 7.35:1 | 3 | pass |
| Header subtitle (9px caps) | `#d2bb9e` | 8.20:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f6ece0` | 13.01:1 | 4.5 | pass |
| Primary button text | `#fff1e2` | 7.75:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ff9c5c` | 8.64:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 8.60:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 6.93:1 | 3 | pass |

## High Contrast

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#ffffff` | 19.17:1 | 7 | pass |
| Secondary text (ink-soft) | `#f2f2f2` | 17.12:1 | 7 | pass |
| Faded/meta text (ink-faded) | `#d9d9d9` | 13.58:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#e4e4e4` | 15.08:1 | 4.5 | pass |
| Accent text (gold) on page | `#ffd83d` | 15.14:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ffd83d` | 13.82:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff7676` | 7.40:1 | 4.5 | pass |
| Heal (moss) on cards | `#6cf08a` | 13.21:1 | 4.5 | pass |
| Temp HP on cards | `#6fd8ff` | 11.81:1 | 4.5 | pass |
| Wordmark on header plate | `#ffd83d` | 15.14:1 | 3 | pass |
| Header subtitle (9px caps) | `#ffffff` | 21.00:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#ffffff` | 21.00:1 | 4.5 | pass |
| Primary button text | `#000000` | 15.14:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ffd83d` | 15.14:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#ffd83d` | 13.82:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#7fb2ff` | 8.87:1 | 3 | pass |

## Old Map

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#241a10` | 10.09:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#3f3020` | 7.50:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#5c4930` | 5.07:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#584630` | 5.32:1 | 4.5 | pass |
| Accent text (gold) on page | `#6a4310` | 5.12:1 | 4.5 | pass |
| Accent text (gold) on cards | `#6a4310` | 7.36:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#8c2418` | 7.49:1 | 4.5 | pass |
| Heal (moss) on cards | `#3b5c28` | 6.49:1 | 4.5 | pass |
| Temp HP on cards | `#245966` | 6.61:1 | 4.5 | pass |
| Wordmark on header plate | `#f1ddb0` | 6.67:1 | 3 | pass |
| Header subtitle (9px caps) | `#cdb68c` | 4.53:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f8eed6` | 7.72:1 | 4.5 | pass |
| Primary button text | `#f6ecd4` | 8.93:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#7a4e16` | 4.24:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#8a5408` | 3.70:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#1b5fa8` | 3.82:1 | 3 | pass |

## Dragon Hoard

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f7eecb` | 11.45:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#e4d6a4` | 9.17:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#c2b487` | 6.46:1 | 4.5 | pass |
| Small caps labels (rs-label-ink) | `#ccbd8d` | 7.13:1 | 4.5 | pass |
| Accent text (gold) on page | `#f5c94c` | 10.10:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f5c94c` | 8.47:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff7b6b` | 5.27:1 | 4.5 | pass |
| Heal (moss) on cards | `#86e2a4` | 8.52:1 | 4.5 | pass |
| Temp HP on cards | `#7ad2e0` | 7.69:1 | 4.5 | pass |
| Wordmark on header plate | `#f8d05a` | 7.42:1 | 3 | pass |
| Header subtitle (9px caps) | `#d6c690` | 6.47:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#fbf3d6` | 9.90:1 | 4.5 | pass |
| Primary button text | `#1a1205` | 5.45:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#f8d05a` | 10.72:1 | 3 | pass |
| Turn ring (amber) vs page/cards (non-text) | `#f0b450` | 7.20:1 | 3 | pass |
| Selection ring (blue) vs page/cards (non-text) | `#6fb0f0` | 5.80:1 | 3 | pass |

