# Data protection impact assessment (DPIA): Hearth

- **Service:** Hearth (hearthdnd.org and the Android app `org.hearthdnd.app`), v1.4.x
- **Controller:** Thomas Dalton (United Kingdom). Contact: hearthdnd@gmail.com (email only)
- **Prepared:** 11 October 2026 **Approved by / date:** Thomas Dalton, 11 October 2026
- **Status:** a light-touch DPIA. A DPIA isn't clearly *mandatory* here, since there's no large-scale or high-risk processing. The ICO's Children's Code expects one for services likely to be accessed by under-18s, so this is it.

## 1. What the processing is

| Processing | Personal data | Whose | Where | Trigger |
|---|---|---|---|---|
| Local storage of characters, games, notes and maps | Whatever the user types (character names; possibly real first names in notes); optional portrait photos | The user and their friends | User's device only (localStorage, IndexedDB) | Always (core app). Never leaves the device. |
| Google sign-in, character sync | Google email, display name, Firebase UID; character sheets (up to about 900 KB each, may include a portrait) | Signed-in users (13+) | Firebase Auth + Cloud Firestore (Google, may be US) | Opt-in only |
| DM game invites | Game name, DM display name, invited email addresses, join code; join note (UID, email, name, random device ID, nonce) | DMs; invited players (who didn't enter their own email) | Firestore | Opt-in by DM |
| Live game link | Character name, HP, conditions and similar; IP addresses seen by the broker and STUN | Players at the table | Peer-to-peer (DTLS); PeerJS broker and Google STUN see IPs and a session code | Opt-in by DM |
| OCR import | Photo, processed on the device; IP seen by jsDelivr on the engine download | User | Device; jsDelivr CDN | Opt-in |
| Community Content Library | IP seen by GitHub on the download | User | GitHub raw | Opt-in (opening the Library) |
| Bring-your-own AI | Whatever the user sends to an endpoint they configure | User | User's chosen service | Opt-in; Hearth isn't a party to it |
| Hosting | IP address, user agent, request logs | All visitors | Netlify | Always (website) |
| Bug reports and email | Version, platform, user agent, screen size (bug template); email address and message | Reporters | GitHub (public, controlled by GitHub); Gmail | User-initiated |

**Not processed:** location, contacts, analytics, advertising IDs, crash telemetry, profiling, payments.

## 2. Necessity and proportionality

- Data minimisation: the core app needs no account. Cloud features are opt-in and store only what sync and invites need. Firestore rules (`docs/firestore.rules`) deny by default, limit fields and sizes, and restrict reads to the owner and invitees.
- Lawful bases: contract (sync and invites), legitimate interests (invite verification, hosting and security, replying to emails), legal obligation (handling rights requests). See `privacy.html#bases`.
- Transparency: `privacy.html` (expanded on the legal-fixes branch) and the in-app About & legal dialog.
- Rights: in-app deletion of cloud data and the Auth account; email route; Export for portability.
- Retention: until the user deletes it; emails normally at most 12 months; email deletion requests completed within 30 days.
- Processors and transfers: Google, Netlify, GitHub, jsDelivr; UK–US data bridge or standard contractual clauses with the UK Addendum (see `privacy.html#transfers`). **Action:** confirm each provider's DPF certification and that its data processing terms are accepted (Firebase, Netlify).

## 3. Risks and mitigations

| Risk | Likelihood | Severity | Mitigation | Residual |
|---|---|---|---|---|
| Firestore misconfiguration exposes characters or emails | Low | Medium | Deny-by-default rules with emulator tests (`tests/firestore-rules.test.mjs`); **check the deployed rules match the repo**; restrict the API key; consider App Check | Low |
| Invited players' emails visible to the other invitees of the same game | Medium (by design) | Low | Disclosed in the privacy policy; only the DM's own invitees; at most 50 | Low |
| A child under 13 signs in | Low | Medium | 13+ store audience; Google's own age gate; privacy notice; deletion on request | Low |
| A minor's personal details in free text shared in a live game | Low | Low | Only DM-accepted players at the same table; nothing stored server-side; no public content | Low |
| Third parties (PeerJS, STUN, jsDelivr, GitHub) see IP addresses | High (inherent) | Low | Disclosed; only when the feature is used; no identifiers added | Low |
| User sends data to an untrustworthy AI endpoint | Low | Medium | Off by default; the user enters the endpoint; disclosed as outside Hearth's control | Low |
| Loss of the operator's Gmail account or unanswered rights requests | Low | Medium | Single published contact; keep account recovery up to date; log requests | Low |

## 4. Outcome

No high residual risk was found, so no prior consultation with the ICO is needed. **Actions:**

1. Confirm the deployed Firestore rules and the API key restrictions.
2. Accept the Google Cloud/Firebase and Netlify data processing terms and record them.
3. Check whether the ICO data protection fee applies (tier 1) and pay or record the exemption. **Solicitor to confirm.**
4. Review this DPIA when adding any SDK or user-to-user feature.
