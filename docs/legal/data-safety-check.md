# Play data safety: re-check after the legal-fixes branch

Checked 11 October 2026 against `/workspace/play-store/data-safety.md` (the answers for 1.4.1) and the code on the `legal-fixes` branch.

| Data safety answer | Still accurate? | Notes |
|---|---|---|
| Collects data only with optional Google sign-in (email, name, user IDs, user-generated content, photos, device or other IDs) | **Yes** | No new collection. The About & legal dialog is static text. |
| Shared: No (processors only) | **Yes** | Google/Firebase as processor. GitHub, jsDelivr and PeerJS only serve files or broker connections and receive no app data. |
| Encrypted in transit | **Yes** | Unchanged |
| Deletion: in-app and https://hearthdnd.org/privacy.html#delete | **Yes** | The `#delete` anchor is kept in the rewritten privacy policy |
| Privacy policy URL https://hearthdnd.org/privacy.html | **Yes** | Same URL, expanded content |
| No analytics, crash reporting or ads SDKs | **Yes** | The landing page no longer calls Google Fonts (now self-hosted) |
| Not declared: QR camera, on-device OCR, peer-to-peer live game, IP addresses, user-configured AI | **Yes** | Unchanged. The privacy policy now also names jsDelivr, GitHub, PeerJS, Google STUN and Netlify. |

**Result:** no change is needed to the Play data safety form. Two related Play points to handle separately:

- In the Play Console, update the Content rating questionnaire to "Violence: fantasy violence, text only" (finding 15 of the legal review).
- If the Android 1.5.0 build adds any SDK, re-check this table.
- The Android `www/privacy.html` is copied from the site tree at build time (`hearth-android/scripts/prepare-web.mjs`), so rebuild the APK/AAB from this branch after it's merged. The new `terms.html` and `legal.html` aren't bundled into the Android app; it links to them on hearthdnd.org, and its in-app About & legal dialog contains the attribution and licence texts offline.
