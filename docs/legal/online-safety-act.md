# Online Safety Act 2023: scope note and assessments for Hearth

Prepared 11 October 2026 (draft). **Not legal advice; solicitor to confirm the scope conclusion.**

## 1. Is Hearth a "user-to-user service"?

The OSA covers services where content generated, uploaded or shared by one user may be *encountered* by another user of the service. Hearth's relevant features are:

- **Live game link:** a DM and the players they accept exchange character names, HP, conditions and similar game state, peer-to-peer. There's no free-text chat. Character names are free text.
- **Email invites (Google sign-in):** a DM's game name and display name are shown to the players they invited.
- **Community Content Library:** contributors submit homebrew through GitHub pull requests or issues. **Every item is reviewed and merged by the maintainer before Hearth shows it.** Users can't post directly into Hearth.
- **Bug reports:** these go to GitHub Issues, which is GitHub's own service, not Hearth's.

There's no chat, no public profiles, no feeds, no comments and no public user-generated content inside Hearth.

**Assessment:** the curated Library is probably *provider content* rather than user-to-user content, because nothing appears until the provider publishes it. The live game and invites let a small amount of free-text content (character, game and display names) reach other users the DM has accepted. That arguably makes Hearth a user-to-user service with very limited functionality. Hearth doesn't clearly fall within the Schedule 1 exemptions, so this note treats it **as possibly in scope**, and records the light-touch assessments Ofcom expects from small, low-risk services.

## 2. Illegal content risk assessment (summary)

| Priority illegal harm | Relevant functionality | Likelihood | Impact | Measures |
|---|---|---|---|---|
| CSEA / grooming | Contact between strangers: **not possible**. Live games need a QR code or join code from the DM plus the DM's acceptance, and are used in person at the table. | Negligible | High | No discovery, no messaging, no profiles; DM accept and kick |
| Harassment, threats, hate (in free-text names) | Character and game names visible to the table | Low | Low | Short fields; only people already at the table; DM kick; Terms §5–6; report contact |
| Terrorism, fraud, drugs, weapons and similar | Not supported by any feature | Negligible | — | — |
| IP infringement (not a priority OSA harm, but relevant) | Community Library | Low–Medium | Medium | Pre-moderation; CONTRIBUTING rules; takedown route in Terms §7 |

**Overall risk level:** low for all priority harms. **Governance:** Thomas Dalton is the named person responsible. Reports go to hearthdnd@gmail.com. Review yearly, or before adding any messaging, sharing or discovery feature.

## 3. Children's access assessment

- Can children access the service? **Yes.** There's no age assurance, and the 13+ audience includes 13–17 year olds.
- Is there a significant number of child users, or is it likely to attract them? **Possibly** (fantasy RPG tool).
- Conclusion: **treat Hearth as likely to be accessed by children**. The children's risk assessment matches the table above. There is no route to primary priority content (pornography, self-harm and suicide, eating disorders) because users can't post media or text to strangers. Existing safeguards: no stranger contact, DM-controlled tables, a pre-moderated Library, and privacy-protective defaults (see the Children's Code assessment).

## 4. Ongoing duties checklist

- [x] Terms of Use explain acceptable use and how to report (`/terms.html`)
- [x] Complaints and reporting contact: hearthdnd@gmail.com
- [x] Library items are reviewed before publication; items can be removed
- [ ] Keep a simple log of reports and actions taken
- [ ] Re-run these assessments before launching chat, image sharing, public profiles or any stranger-to-stranger feature
