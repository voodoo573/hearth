# Age Appropriate Design Code (Children's Code): self-assessment for Hearth

Prepared 11 October 2026 (draft). Hearth isn't aimed at children, but a fantasy tabletop RPG tool is *likely to be accessed* by 13–17 year olds in the UK, so the ICO Children's Code applies. The Play target audience is 13+, and under-13s are not targeted.

| # | Standard | How Hearth meets it | Gap or action |
|---|---|---|---|
| 1 | Best interests of the child | Free, no ads, no purchases, no engagement nudges or streaks; works offline | None |
| 2 | DPIA | `docs/legal/dpia.md` | Approve and date it |
| 3 | Age-appropriate application | The same high-privacy treatment for everyone, so age assurance isn't needed for risk reasons; Google's own age gate applies to sign-in | None |
| 4 | Transparency | Plain-English privacy policy with a children section; in-app About & legal | Consider a short in-app "what leaves your device" summary next to Sync with Google |
| 5 | Detrimental use of data | No profiling, no recommendations, no notifications for engagement | None |
| 6 | Policies and community standards | Terms of Use (acceptable use); curated Community Library | Enforce: remove abusive library items |
| 7 | Default settings | Every online feature is off by default (sign-in, live game, OCR, AI, Library) | None |
| 8 | Data minimisation | Only the data each feature needs; local-first | None |
| 9 | Data sharing | No sharing beyond processors and the user's own table | None |
| 10 | Geolocation | None collected; Permissions-Policy blocks geolocation (`netlify.toml`) | None |
| 11 | Parental controls | None, and none are needed (no monitoring features) | None |
| 12 | Profiling | None | None |
| 13 | Nudge techniques | No dark patterns; data-safety nudge is about backups and is dismissible | None |
| 14 | Connected toys and devices | Not applicable | None |
| 15 | Online tools | In-app deletion of cloud data; Report a bug; email contact | Make sure email requests are answered within one month |

**Conclusion:** Hearth largely conforms by design. Remaining actions: approve the DPIA, keep the privacy policy's children section current, and re-assess before adding chat, public profiles, user-to-user sharing beyond the table, ads or analytics. **Solicitor to confirm** if Hearth is ever monetised or gains social features.
