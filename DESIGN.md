# Band Rehearsal Player — Design Notes

## Goal

Custom web player so band-mates (6 people total) can conveniently listen to
rehearsal recordings on phones/devices. Recordings are captured every
rehearsal and mixed afterward by the site owner.

## Navigation

Two views over the same underlying data:

1. **Setlist** — list of songs. Selecting a song shows every recording of
   that song (with practice date etc.), playable individually or as a
   "play all versions" playlist.
2. **Practices** — list of practices. Selecting a practice shows the songs
   played that day, playable individually or as a "play all" playlist.

Both views are just different groupings of the same recordings list, so no
data duplication is needed — Setlist groups by song, Practices groups by
practice.

## Data model

Three related lists, hand-maintained manifest files (JSON/CSV) initially —
no auto-discovery from Dropbox for now.

- **Songs** (canonical list): id/slug, title, maybe status (e.g.
  "learning" vs "gigging"). Exists independently of recordings, so a new
  song can be added before any recording of it exists.
- **Practices**: date, venue, label.
- **Recordings** (join table): `song_id`, `practice_id`, Dropbox URL,
  take label, notes, `set_order` (explicit playback order within a
  practice).

## Audio hosting — Dropbox

- Files live in a shared Dropbox folder, streamed (not downloaded) via
  querystring-tweaked direct links (`raw=1` / `dl.dropboxusercontent.com`
  style), not the Dropbox API.
- Dropbox direct links generally support HTTP range requests, which is
  needed for scrubbing/seeking in an `<audio>` element and for normal
  mobile Safari streaming behavior.
- Use one consistent link-generation method so links stay stable and
  reproducible; regenerating share links in bulk could break existing
  manifest entries.
- CORS is unlikely to be an issue since playback is just `<audio src>`,
  not fetch-based (would matter if a waveform view is ever added later).
- **Caveat:** the audio files themselves are hit directly by the browser
  via raw Dropbox URLs — they are not proxied through the site. Any auth
  added to the site later only gates *discovery* of the manifest/setlist,
  not the raw recording files themselves. Anyone with a Dropbox URL can
  still play/download it without logging in. Acceptable for a 6-person
  band, but worth remembering if recordings become sensitive.
- Not a concern currently: Dropbox usage/bandwidth limits, given only 6
  users.
- **Opportunistic caching (tentative):** the Angular service worker
  (`ngsw`) can be configured with a `dataGroup` matching the Dropbox
  domain, using a `performance` (cache-first) strategy with a
  `maxSize`/`maxAge` limit. This caches each recording the first time
  it's actually played — no curated "download for offline" list needed,
  just a side effect of normal listening. Config-only addition, no custom
  service worker code required. Not yet decided whether to include at
  launch or add later; low cost either way since it's additive to the
  `ngsw-config.json` already needed for PWA installability.

## Site hosting — Azure Static Web Apps

- Chosen over plain Azure Storage static website hosting specifically
  because Static Web Apps has built-in auth providers (GitHub,
  Microsoft/AAD, etc.) and role-based access rules, without needing a
  custom backend.
- **Phased access control plan:**
  1. Start with an unlisted URL, no auth.
  2. Later, add a `staticwebapp.config.json` defining routes and allowed
     roles/identities (the 6 band-mates), gating the whole site behind
     login.
  - This is a low-cost addition later — just a config file, no
    restructuring of the site or data needed.

## Frontend framework — Angular

**Decision (2026-09-08):** Angular, using standalone components and
signals rather than NgModules/RxJS-heavy patterns — kept lightweight to
match the app's small scope (two list views over one JSON-backed
recordings list, a persistent mini-player).

Rationale:

- Solo-maintained project; the developer already knows Angular well, so
  no framework learning curve is stacked on top of first-time PWA work.
- TypeScript is the stated language preference; Angular is TS-native.
- Angular's official PWA schematic (`ng add @angular/pwa`) gives a
  guided, documented path to manifest + service worker setup — valuable
  specifically because this is a first PWA project.
- Bundle size / initial load speed was explicitly deemed not a concern
  (internal 6-person tool), removing the main case for a lighter
  framework (e.g. Svelte, Vue).
- Azure Static Web Apps has a built-in Angular build preset, so
  deployment is a known path.

**Noted trade-off:** Angular's built-in service worker (`ngsw`) is tuned
for app-shell/JSON caching, not streaming-media range requests — see the
opportunistic-caching note and open verification item above under Audio
hosting.

**Not a factor in this choice:** the Media Session API (lock-screen
artwork/controls) and background audio are plain browser APIs, called
the same way regardless of framework — they didn't influence the
framework decision.

## Decisions (firmed up 2026-09-08)

- **Frontend framework**: Angular, standalone components + signals (see
  Frontend framework section above for rationale).
- **Manifest format**: JSON for Songs/Practices/Recordings.
- **Set order**: Recordings will carry an explicit `set_order` field for
  playback order within a practice, rather than relying on
  filename/alphabetical order.
- **Player UI shape**: persistent mini-player bar (Spotify-style) that
  stays visible while browsing the Setlist/Practices list views, rather
  than a full-screen now-playing takeover.
- **Background/standby playback**: build as an installable PWA (web
  manifest + service worker) so band-mates can add it to their home
  screen — more reliable background audio on iOS than a plain
  backgrounded tab. Still needs Media Session API metadata/handlers for
  lock-screen controls, and care to avoid pausing on visibility-change.
- **Auto-discovery trigger**: no fixed volume threshold — stay
  hand-maintained and only revisit Dropbox auto-discovery if manifest
  upkeep actually starts to feel like a burden.
- **Queue-end behavior**: "play all" (Setlist or Practice) stops after
  the last track; no auto-loop back to the start.
- **Artwork/metadata**: show simple generated/placeholder art per song
  (e.g. a color block with initials) rather than sourcing real photos —
  gives the lock-screen Media Session display something visual without
  extra maintenance. Paired with text metadata (title, practice date,
  take label).

## Open / deferred items

- PWA install flow/UX (how band-mates are prompted to add to home
  screen — manual instructions vs. in-app install prompt) not yet
  decided.
- **Range-request behavior on cached audio:** if opportunistic caching
  (above) is used, verify once built that a cached recording still
  correctly serves `Range` requests (needed for scrubbing/seeking via
  `<audio>`). Neither Angular's `ngsw` nor a from-scratch cache-first
  handler guarantees this automatically — a cached whole-file response
  has to be sliced to satisfy `bytes=...` requests, or seeking on a
  cached track will misbehave or force a full re-fetch.
- Player UI details beyond the persistent mini-player shape and queue
  behavior above (exact transport controls, layout specifics) not yet
  discussed.
