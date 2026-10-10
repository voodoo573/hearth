# Live game link (beta, v1.1.0)

A DM and players link their devices so each player's sheet syncs live with the DM's board. No account is needed (Google sign-in is optional, see below) and there is no build step. Without a live game, the app works exactly as before: the libraries below sit in the page as inert text and are only run when a game is started or joined.

## How it works

1. **DM:** Battle Forge or battle map → **🔗 Live game** → **Start live game**. The DM gets a QR code and a short code (`HEARTH-7KQ3`).
2. **Player:** Home → Player → **🔗 Join a game**. They scan the QR code (📷 Scan) or type the code, then pick which of their characters joins. The QR code holds `https://hearthdnd.org/app/?join=HEARTH-7KQ3`, so a phone's own camera app also lands on the join screen.
3. **DM:** gets **"Accept <name>?"**. Nothing is linked until the DM says yes.
4. From then on, the two devices talk **directly** (WebRTC data channel, peer-to-peer). Only the first handshake goes through a free signalling service: the PeerJS public cloud broker, `0.peerjs.com`. Public STUN servers (`stun.l.google.com`) help the devices find each other. There is **no TURN relay**, so if the network blocks device-to-device traffic the link can't be made, and the app explains this (router "AP/client isolation").

### What syncs

| Player → DM (live) | DM → player |
|---|---|
| name, HP, max HP, temp HP, AC, conditions, concentration, death saves, initiative bonus, speed, passive Perception, darkvision, auras (with save bonus), saving throws, damage resistances | damage (typed; resistances, immunities and vulnerabilities applied; temp HP absorbs first), healing, HP set, conditions, concentration on/off, initiative order and whose turn it is |

- The player's token is created on the DM's board automatically, linked by the character's stable id plus the device id.
- Damage lands on the player's sheet through the sheet's own HP rules, so the concentration save prompt and death saves happen on the player's device. The player sees a toast such as `DM: −5 fire (resistant, halved)`.
- **Auras** (Aura of Protection, Courage, Devotion) are data in `LINK_AURA_DEFS`. The DM's map and the projector draw a soft ring of the aura's radius around the token. The ring sits on its own layer: above the map (including painted maps and their animated overlay), under the fog/AoE layer and under the tokens. On the DM map it follows the token while it is being dragged. When the DM rolls a save (🎲 Save on a combat card, or a concentration save) for a friendly creature inside an ally's Aura of Protection, the bonus is added and shown in the roll text, for example `d20 [9] +1 +3 Aura of Protection (Sir Oswin) = 13`. Auras end while the paladin is at 0 HP. Auras don't stack: the highest bonus applies.

### Sessions and conflicts

- **Reconnect:** an accepted device gets a session token. If its phone sleeps or the page reloads, it rejoins the same code by itself, with no new accept. If the DM's page reloads, the DM resumes the same code (within 24 hours) and accepted players come back on their own.
- **Remove / reject:** the DM sees a players list in the Live game panel and can remove anyone. A removed or rejected device needs the DM's OK again.
- **Conflicts:** last write wins per field. For HP, a DM change wins until the player's device confirms it has applied it (every DM change has a sequence number; the player echoes the last one applied). Changes made while a player is away are queued and replayed once on reconnect.

### Security

- The DM accepts every new device. Messages from unaccepted peers are ignored.
- Every message is size-limited and shape-validated (`linkParseMsg`, `linkCleanSnap`, and per-message checks). Unknown condition, aura and damage-type ids are dropped.
- All text from the network is escaped before it reaches the DOM, including the projector window.
- The code is the only "secret" needed to *ask* to join, so the accept step is the real gate.

## Protocol v1

JSON messages, each with `t` (type):

- Player → DM: `hello {v, deviceId, token, sessionId, char, account}`, `state {ack, char}`, `bye`
- DM → player: `pending`, `welcome {v, token, sessionId, game, seq, rejoin}`, `reject {reason}`, `kick`, `end`, `apply {seq, kind: damage|heal|set, amount, raw, dtype, note}`, `conds {keys}`, `conc {on}`, `combat {started, round, yourTurn, order[{n, i, k, you, turn}]}`

`char` is the snapshot made by `linkCharSnapshot()`.

## Code layout (all in `app/index.html`)

- **Vendored libraries** (inert `<script type="text/plain" id="hearth-vendor-*">`, run on demand by `linkLoadVendor`): PeerJS 1.5.5 (MIT), jsQR 1.4.0 (Apache-2.0; only used when `BarcodeDetector` isn't available), qrcode-generator 2.0.4 (MIT).
- **Transport adapter**: `HEARTH_LINK_TRANSPORTS[id] = { id, label, needsAccount, host(code, ev), connect(code, ev) }`. `host()` resolves to a handle with `close()` and calls `ev.onConnection(conn)` for each incoming device. `connect()` resolves to a connection. Every connection is `{ remoteId, send(obj), close(), on('data'|'close', fn), isOpen() }`. The session logic only ever sees that interface.
- **Account slot**: `HearthAccount` (`register(provider)`, `use(id)`, `identity()`). Today only `none` exists, and `identity()` is `null`. It is sent in `hello` so a DM can later see who an invited player is.
- **Session logic**: `HearthLink` with host functions (`linkHost*`, `dmLink*`) and join functions (`linkJoin*`).
- **Hooks into the app**: `loadEncounter`/`saveEncounter` carry `link`; `hearthLinkAfterSave()` at the end of `saveEncounter`; `dmLinkDialogsHTML()` in both DM views; `wireDMLinkDialogs()` in `wireDMEncounter()`; `linkBoot()` at start-up.

## Optional Google sign-in (Firebase)

Opt-in. Nobody has to sign in for anything above. Nothing Firebase-related is downloaded until someone taps **Sign in with Google**, or a device that signed in before starts up. The modular Firebase SDK v12.6.0 is then loaded from `www.gstatic.com` with `import()`.

Where to find it: Home → Player → **☁ Sync with Google**; the **My games** part of **🔗 Join a game**; and **Invite by Google email** in the DM's Live game panel.

- **Character sync** (`users/{uid}/characters/{id}`). localStorage stays the source of truth. Each character is stored as one doc `{ id, ed: '5e'|'5.5e', updatedAt (ms), deleted, data (JSON string, up to 900 KB), name, v: 1 }`.
  - The merge (`hearthSyncReconcile`) is last-write-wins on `updatedAt` (the character's own `updatedAt`, set by `saveCharacter`). It runs on every cloud snapshot and 1.5 s after any local save (`saveCharacters` calls `hearthSyncLocalChanged`), and when the device comes back online.
  - Deletions travel as tombstones. A per-device record (`hearth.sync.v1`) remembers what was last in sync, so "deleted here" can be told apart from "new on another device".
  - Characters over 900 KB (huge portraits) are skipped and listed in the account dialog.
  - Signing out stops syncing; the characters stay on the device.
- **Invites** (`games/{dmUid}_{gameId}`). A signed-in DM types a player's Google email in the Live game panel. The game doc holds the invited emails (lower-cased), plus the current live code and `live` flag, kept up to date when the DM starts or ends a live game.
  - The player's **My games** list (a Firestore query, `invited array-contains <my email>`) shows the game while it's live, with a **Join** button.
  - Joining leaves a note in `games/{id}/joins/{uid}` `{ uid, email, deviceId, nonce, code, at }` (the rules make the email the signed-in account's verified email). The player's `hello` carries `{ provider, uid, email, gameId, nonce }`.
  - The DM's device reads the note and checks that the device id and nonce match. The accept prompt then shows **✓ Google: email (invited)**, or "couldn't be verified" for a claim that doesn't check out.
  - **The DM still accepts every device.**
  - Game data still flows over the live game link (PeerJS for the handshake, then direct WebRTC). Firestore carries only the invite and this verification note. A full Firestore signalling transport (`HEARTH_LINK_TRANSPORTS.firebase`) fits the same adapter, and could later relay data when AP isolation blocks P2P.
  - A player's email reaches the DM only when they join from **My games**. Joining by code sends no account.
- **Account slot**: the Google provider is registered with `HearthAccount.register({ id: 'google', ... })` and selected on sign-in.
- **Web**: `signInWithPopup`, falling back to `signInWithRedirect` if the popup is blocked.
- **Android app**: Google blocks sign-in inside a WebView, so the APK uses `@capacitor-firebase/authentication` 7.5 (`skipNativeAuth: true`, provider `google.com`). The native Google account sheet returns an ID token, and the web SDK signs in with `signInWithCredential`, so Firestore works the same as on the web.
- **Security rules**: `docs/firestore.rules` (same as `/workspace/firebase/firestore.rules`). Users read and write only their own characters. Game docs are readable only by the DM (owner) and by invited accounts with a verified email matching the invite list. Every write is validated by key set, types, sizes and formats; the server sets timestamps. Everything else is denied.
- **Firebase project**: `hearth-ae2e0` (config inlined as `HEARTH_FIREBASE_CONFIG`; these values are public by design).

Before going live, Thomas needs to:

1. **Deploy the rules**: `firebase deploy --only firestore:rules` with `docs/firestore.rules`. Firestore was created in production mode, so everything is denied until then.
2. **Authorised domains** (Authentication → Settings): `hearthdnd.org` (done). Add `www.hearthdnd.org` if used, and `inquisitive-daffodil-dcf270.netlify.app` (or the specific `pr-<n>--…` preview host) to try sign-in on the PR preview. The Android app signs in natively, so `localhost` (the Capacitor origin `https://localhost`, on the list by default) is only used by the web SDK's `signInWithCredential`.
3. **Android**: package `org.hearthdnd.app`, upload-key SHA-1 `A1:55:F6:46:7F:27:C9:61:B3:58:2C:D6:07:0F:0B:4C:E9:CC:7F:FC`. Already registered: `google-services.json` includes the Android OAuth client for it. Once the app ships through Play with Play App Signing, add the **app signing key** SHA-1 from Play Console → App integrity, or native sign-in fails for Play installs. Debug builds signed with the debug keystore need that SHA-1 added too.
4. Optional: the OAuth consent screen (app name, logo, support email). Until it's published, the Google sheet says "unverified app" / shows the project name.

## Known limits

- **Internet is needed for the handshake** (PeerJS broker). Once linked, traffic is device-to-device, but both devices still need a working network path to each other.
- **Router / AP isolation** (guest, hotel and school Wi-Fi) blocks device-to-device traffic. With no TURN relay the link fails, and the app says why. Workaround: home Wi-Fi, or one phone's hotspot.
- The **PeerJS public broker** is free and has no uptime guarantee. If it's down, new players can't join; players already linked stay connected.
- **Players see only names and initiative** of visible combatants (not monster HP).

## Tests

- `tests/game-link.test.js`: live game link, DM + 3 players, real PeerJS broker.
- `tests/google-signin.test.js`: sign-in, sync and invites against the Firebase Auth + Firestore emulators (auth 9099, firestore 8085, project `hearth-ae2e0`). The app connects to the emulators only on localhost when `localStorage['hearth.fb.emulator'] = '9099:8085'`.
- `tests/firestore-rules.test.mjs`: security rules tests (`@firebase/rules-unit-testing`, Firestore emulator).


`tests/game-link.test.js` is a Playwright test (`node tests/game-link.test.js 8811` with the site served on that port; set `PW_MODULE` to your playwright-core path). It runs one DM and three players in separate browser contexts against the real PeerJS broker.
