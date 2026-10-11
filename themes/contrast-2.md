# Batch 2 themes: WCAG contrast check

Same checks and worst-case method as contrast.md (batch 1). AA body text 4.5:1, wordmark 3:1, focus ring 3:1.

## Summary

| Theme | Inspiration | Tone | Body | Secondary | Faded | Labels | Accent text | HP colours | Result |
|---|---|---|---|---|---|---|---|---|---|
| Sacred Dawn | paladin · cleric | light | 11.62 | 6.32 | 4.80 | 5.01 | 4.84 | 6.33 | pass (14/14) |
| Nightshade | rogue | dark | 11.74 | 7.55 | 5.08 | 5.60 | 9.56 | 5.89 | pass (14/14) |
| Wildwood | ranger · druid | dark | 10.27 | 6.78 | 4.96 | 5.15 | 5.76 | 5.67 | pass (14/14) |
| Moonsilver | wizard · elf | dark | 10.89 | 7.20 | 4.92 | 5.41 | 8.61 | 5.48 | pass (14/14) |
| Eldritch Deep | warlock · drow / Underdark | dark | 12.89 | 8.30 | 5.47 | 6.10 | 8.12 | 6.55 | pass (14/14) |
| Wild Surge | sorcerer | dark | 12.81 | 8.27 | 5.54 | 6.16 | 6.77 | 6.30 | pass (14/14) |
| Velvet Encore | bard | dark | 12.30 | 7.94 | 5.29 | 5.88 | 8.70 | 6.28 | pass (14/14) |
| Warpaint | barbarian | light | 11.24 | 6.51 | 4.91 | 5.09 | 4.78 | 6.53 | pass (14/14) |
| Still Mountain | monk | light | 10.45 | 5.87 | 4.94 | 5.09 | 4.54 | 6.15 | pass (14/14) |
| Banner & Blade | fighter | light | 10.13 | 6.19 | 4.98 | 4.97 | 4.60 | 6.47 | pass (14/14) |
| Clockwork | artificer · gnome | dark | 10.00 | 6.65 | 5.02 | 5.05 | 5.37 | 4.93 | pass (14/14) |
| Dragonscale | dragonborn | dark | 10.96 | 7.21 | 4.90 | 5.40 | 4.75 | 5.66 | pass (14/14) |
| Honeyed Hollow | halfling | light | 9.87 | 5.77 | 4.81 | 4.96 | 4.51 | 5.99 | pass (14/14) |
| Scott's Ultramarine | custom · for Scott | dark | 9.38 | 7.72 | 5.98 | 6.42 | 7.49 | 5.08 | pass (14/14) |
| Scott's Royal Marine | custom · for Scott · Royal Marines colours | dark | 10.50 | 8.31 | 6.02 | 6.64 | 7.41 | 4.65 | pass (14/14) |

Colours nudged by build2.js to reach their target: dawn ink-faded #736e62→#635f54; dawn rs-label-ink #6b6659→#615c51; wildwood ink-faded #9d9d87→#a2a28d; surge header-sub #ffe0f0→#ffeaf6; warpaint ink-faded #64615d→#565350; warpaint rs-label-ink #5c5955→#53514d; warpaint gold #a2340f→#9a310e; mountain ink-faded #6b6c65→#575852; mountain rs-label-ink #63645e→#555651; mountain gold #a14800→#994400; banner ink-faded #575a5f→#474a4e; banner rs-label-ink #4f5257→#474a4f; banner gold #7a5c00→#644b00; banner focus #897127→#7c6623; clockwork ink-faded #97a8a9→#a1b0b1; hollow ink-faded #736237→#5e502d; hollow rs-label-ink #6b5b32→#5c4e2c; hollow gold #8a4a00→#834600.

## Sacred Dawn · paladin · cleric

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#2a2416` | 11.62:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#534d40` | 6.32:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#635f54` | 4.80:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#615c51` | 5.01:1 | 4.8 | pass |
| Accent text (gold) on page | `#7d5800` | 4.84:1 | 4.5 | pass |
| Accent text (gold) on cards | `#7d5800` | 6.33:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#a3261e` | 7.25:1 | 4.5 | pass |
| Heal (moss) on cards | `#2e6b34` | 6.33:1 | 4.5 | pass |
| Temp HP on cards | `#1d5c70` | 7.34:1 | 4.5 | pass |
| Wordmark on header plate | `#5a3c00` | 7.63:1 | 3 | pass |
| Header subtitle (9px caps) | `#5e4a1e` | 6.41:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#2a2416` | 11.65:1 | 4.5 | pass |
| Primary button text | `#1c1404` | 5.78:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#93742a` | 3.32:1 | 3 | pass |

## Nightshade · rogue

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#e6e6e4` | 11.74:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#babab9` | 7.55:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#989897` | 5.08:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#a0a09f` | 5.60:1 | 4.8 | pass |
| Accent text (gold) on page | `#9fe36e` | 11.98:1 | 4.5 | pass |
| Accent text (gold) on cards | `#9fe36e` | 9.56:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff7d72` | 5.89:1 | 4.5 | pass |
| Heal (moss) on cards | `#66d6c2` | 8.36:1 | 4.5 | pass |
| Temp HP on cards | `#8ab8e8` | 7.06:1 | 4.5 | pass |
| Wordmark on header plate | `#a9ea78` | 10.70:1 | 3 | pass |
| Header subtitle (9px caps) | `#b8b2a7` | 7.24:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#ece8e0` | 12.48:1 | 4.5 | pass |
| Primary button text | `#d8f5c0` | 10.14:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#9fe36e` | 11.98:1 | 3 | pass |

## Wildwood · ranger · druid

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#ece6cc` | 10.27:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#c0bda5` | 6.78:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#a2a28d` | 4.96:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#a6a58e` | 5.15:1 | 4.8 | pass |
| Accent text (gold) on page | `#ff8f6a` | 6.76:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ff8f6a` | 5.76:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8a8a` | 5.67:1 | 4.5 | pass |
| Heal (moss) on cards | `#a8d860` | 7.76:1 | 4.5 | pass |
| Temp HP on cards | `#7cc4d0` | 6.54:1 | 4.5 | pass |
| Wordmark on header plate | `#f0d8a0` | 6.34:1 | 3 | pass |
| Header subtitle (9px caps) | `#c8be9e` | 4.77:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f0e8d0` | 7.24:1 | 4.5 | pass |
| Primary button text | `#f6f2dc` | 5.64:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ff8f6a` | 6.76:1 | 3 | pass |

## Moonsilver · wizard · elf

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#edf1f6` | 10.89:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#c2c6cc` | 7.20:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#9fa4aa` | 4.92:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#a8acb2` | 5.41:1 | 4.8 | pass |
| Accent text (gold) on page | `#8fe8d2` | 11.01:1 | 4.5 | pass |
| Accent text (gold) on cards | `#8fe8d2` | 8.61:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8a96` | 5.48:1 | 4.5 | pass |
| Heal (moss) on cards | `#b4e07c` | 8.17:1 | 4.5 | pass |
| Temp HP on cards | `#86c8ff` | 6.89:1 | 4.5 | pass |
| Wordmark on header plate | `#f2f6fb` | 6.48:1 | 3 | pass |
| Header subtitle (9px caps) | `#d2dce8` | 5.07:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#eef3fa` | 6.30:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 7.76:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#8fe8d2` | 11.01:1 | 3 | pass |

## Eldritch Deep · warlock · drow / Underdark

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#ece6f6` | 12.89:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#bfbac9` | 8.30:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#9b96a5` | 5.47:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#a49fae` | 6.10:1 | 4.8 | pass |
| Accent text (gold) on page | `#d9a6ff` | 9.72:1 | 4.5 | pass |
| Accent text (gold) on cards | `#d9a6ff` | 8.12:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8090` | 6.55:1 | 4.5 | pass |
| Heal (moss) on cards | `#b9ec6a` | 11.43:1 | 4.5 | pass |
| Temp HP on cards | `#7ee0f0` | 10.34:1 | 4.5 | pass |
| Wordmark on header plate | `#c6f070` | 12.31:1 | 3 | pass |
| Header subtitle (9px caps) | `#bba8d6` | 7.41:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#efe8fa` | 13.45:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 9.75:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#d9a6ff` | 9.72:1 | 3 | pass |

## Wild Surge · sorcerer

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#fbeef8` | 12.81:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#cec0ce` | 8.27:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#ab9cac` | 5.54:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#b4a5b5` | 6.16:1 | 4.8 | pass |
| Accent text (gold) on page | `#ff8ad8` | 6.77:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ff8ad8` | 6.79:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8a7a` | 6.30:1 | 4.5 | pass |
| Heal (moss) on cards | `#9ee6a0` | 9.81:1 | 4.5 | pass |
| Temp HP on cards | `#80d4ff` | 8.78:1 | 4.5 | pass |
| Wordmark on header plate | `#fff0c8` | 4.57:1 | 3 | pass |
| Header subtitle (9px caps) | `#ffeaf6` | 4.53:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#ffffff` | 5.18:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 5.53:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ff8ad8` | 6.77:1 | 3 | pass |

## Velvet Encore · bard

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#fbeedd` | 12.30:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#d2bfb5` | 7.94:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#b09a95` | 5.29:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#b9a39d` | 5.88:1 | 4.8 | pass |
| Accent text (gold) on page | `#f2c65a` | 10.48:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f2c65a` | 8.70:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8c8c` | 6.28:1 | 4.5 | pass |
| Heal (moss) on cards | `#a8dc84` | 8.86:1 | 4.5 | pass |
| Temp HP on cards | `#88cce0` | 7.87:1 | 4.5 | pass |
| Wordmark on header plate | `#f6cf6a` | 7.16:1 | 3 | pass |
| Header subtitle (9px caps) | `#e6c8b0` | 6.75:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#fff4e2` | 9.82:1 | 4.5 | pass |
| Primary button text | `#250608` | 4.93:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#f2c65a` | 10.48:1 | 3 | pass |

## Warpaint · barbarian

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#1c1916` | 11.24:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#44413e` | 6.51:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#565350` | 4.91:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#53514d` | 5.09:1 | 4.8 | pass |
| Accent text (gold) on page | `#9a310e` | 4.78:1 | 4.5 | pass |
| Accent text (gold) on cards | `#9a310e` | 6.74:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#7e0f1e` | 9.63:1 | 4.5 | pass |
| Heal (moss) on cards | `#2f6230` | 6.53:1 | 4.5 | pass |
| Temp HP on cards | `#1d5868` | 7.18:1 | 4.5 | pass |
| Wordmark on header plate | `#ff8a5a` | 5.44:1 | 3 | pass |
| Header subtitle (9px caps) | `#d8ccb8` | 7.98:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f6efe2` | 11.06:1 | 4.5 | pass |
| Primary button text | `#fff4ea` | 6.74:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ae5334` | 3.30:1 | 3 | pass |

## Still Mountain · monk

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#232629` | 10.45:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#4b4d4a` | 5.87:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#575852` | 4.94:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#555651` | 5.09:1 | 4.8 | pass |
| Accent text (gold) on page | `#994400` | 4.54:1 | 4.5 | pass |
| Accent text (gold) on cards | `#994400` | 6.33:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#a01e2a` | 7.42:1 | 4.5 | pass |
| Heal (moss) on cards | `#3c6a1e` | 6.15:1 | 4.5 | pass |
| Temp HP on cards | `#1d5a6c` | 7.37:1 | 4.5 | pass |
| Wordmark on header plate | `#1c2024` | 5.43:1 | 3 | pass |
| Header subtitle (9px caps) | `#1e2226` | 5.31:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#14171a` | 5.96:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 9.43:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ae6525` | 3.08:1 | 3 | pass |

## Banner & Blade · fighter

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#13161b` | 10.13:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#393c41` | 6.19:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#474a4e` | 4.98:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#474a4f` | 4.97:1 | 4.8 | pass |
| Accent text (gold) on page | `#644b00` | 4.60:1 | 4.5 | pass |
| Accent text (gold) on cards | `#644b00` | 7.10:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#a3121f` | 6.79:1 | 4.5 | pass |
| Heal (moss) on cards | `#256030` | 6.47:1 | 4.5 | pass |
| Temp HP on cards | `#1a566c` | 6.98:1 | 4.5 | pass |
| Wordmark on header plate | `#ffd65a` | 5.32:1 | 3 | pass |
| Header subtitle (9px caps) | `#ffe2e2` | 6.11:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#ffffff` | 7.44:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 7.44:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#7c6623` | 3.10:1 | 3 | pass |

## Clockwork · artificer · gnome

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#e8f4f2` | 10.00:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#bbcac9` | 6.65:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#a1b0b1` | 5.02:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#a0b1b1` | 5.05:1 | 4.8 | pass |
| Accent text (gold) on page | `#f2a06a` | 6.88:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f2a06a` | 5.37:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8a80` | 4.93:1 | 4.5 | pass |
| Heal (moss) on cards | `#b0e070` | 7.37:1 | 4.5 | pass |
| Temp HP on cards | `#90d8ff` | 7.21:1 | 4.5 | pass |
| Wordmark on header plate | `#ffe6a8` | 5.18:1 | 3 | pass |
| Header subtitle (9px caps) | `#f6ead0` | 5.32:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#fff6e0` | 5.89:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 5.72:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#f2a06a` | 6.88:1 | 3 | pass |

## Dragonscale · dragonborn

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f6eed4` | 10.96:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#cac3ab` | 7.21:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#a6a18b` | 4.90:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#afa993` | 5.40:1 | 4.8 | pass |
| Accent text (gold) on page | `#ff7448` | 6.04:1 | 4.5 | pass |
| Accent text (gold) on cards | `#ff7448` | 4.75:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff8a9a` | 5.66:1 | 4.5 | pass |
| Heal (moss) on cards | `#a6dc78` | 7.95:1 | 4.5 | pass |
| Temp HP on cards | `#7cc8d8` | 6.73:1 | 4.5 | pass |
| Wordmark on header plate | `#2a1404` | 4.71:1 | 3 | pass |
| Header subtitle (9px caps) | `#2a1808` | 4.59:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#1e1004` | 5.00:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 5.07:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#ff7448` | 6.04:1 | 3 | pass |

## Honeyed Hollow · halfling

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#2a1f0a` | 9.87:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#534423` | 5.77:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#5e502d` | 4.81:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#5c4e2c` | 4.96:1 | 4.8 | pass |
| Accent text (gold) on page | `#834600` | 4.51:1 | 4.5 | pass |
| Accent text (gold) on cards | `#834600` | 6.74:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#a01c1c` | 7.15:1 | 4.5 | pass |
| Heal (moss) on cards | `#2e6a1c` | 5.99:1 | 4.5 | pass |
| Temp HP on cards | `#1d5a6a` | 7.03:1 | 4.5 | pass |
| Wordmark on header plate | `#ffd45a` | 4.49:1 | 3 | pass |
| Header subtitle (9px caps) | `#d8ecb8` | 5.03:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#fbf6dc` | 5.85:1 | 4.5 | pass |
| Primary button text | `#ffffff` | 6.36:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#9d6418` | 3.00:1 | 3 | pass |

## Scott's Ultramarine · custom · for Scott

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f2f5fa` | 9.38:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#d9e0ec` | 7.72:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#bcc6dc` | 5.98:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#c4cde0` | 6.42:1 | 4.8 | pass |
| Accent text (gold) on page | `#cfdcff` | 9.96:1 | 4.5 | pass |
| Accent text (gold) on cards | `#cfdcff` | 7.49:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff9aa4` | 5.08:1 | 4.5 | pass |
| Heal (moss) on cards | `#a8eca0` | 7.41:1 | 4.5 | pass |
| Temp HP on cards | `#8ae6ff` | 7.25:1 | 4.5 | pass |
| Wordmark on header plate | `#14208f` | 7.03:1 | 3 | pass |
| Header subtitle (9px caps) | `#24305a` | 6.97:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#0e1660` | 8.81:1 | 4.5 | pass |
| Primary button text | `#101a80` | 7.40:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#e6ecff` | 11.56:1 | 3 | pass |

## Scott's Royal Marine · custom · for Scott · Royal Marines colours

| Check | Colour | Ratio | Needs | |
|---|---|---|---|---|
| Body text (ink) | `#f4efdf` | 10.50:1 | 4.5 | pass |
| Secondary text (ink-soft) | `#ddd6c0` | 8.31:1 | 4.5 | pass |
| Faded/meta text (ink-faded) | `#bfb79c` | 6.02:1 | 4.8 | pass |
| Small caps labels (rs-label-ink) | `#c9c0a2` | 6.64:1 | 4.8 | pass |
| Accent text (gold) on page | `#f5c518` | 9.59:1 | 4.5 | pass |
| Accent text (gold) on cards | `#f5c518` | 7.41:1 | 4.5 | pass |
| Danger/low HP (crimson) on cards | `#ff7671` | 4.65:1 | 4.5 | pass |
| Heal (moss) on cards | `#5fd47a` | 6.43:1 | 4.5 | pass |
| Temp HP on cards | `#7fd0f0` | 7.01:1 | 4.5 | pass |
| Wordmark on header plate | `#f5c518` | 7.97:1 | 3 | pass |
| Header subtitle (9px caps) | `#e8dcb4` | 9.49:1 | 4.5 | pass |
| Ability plate text (plate-ink) | `#f4efdf` | 11.30:1 | 4.5 | pass |
| Primary button text | `#0a1426` | 6.61:1 | 4.5 | pass |
| Focus ring vs page (non-text) | `#f5c518` | 9.59:1 | 3 | pass |

