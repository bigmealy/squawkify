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
- **Opportunistic caching (implemented):** `ngsw-config.json` has a
  `dataGroup` (`dropbox-recordings`) matching the shared folder's URL, using
  a `performance` (cache-first) strategy. This turned out to need more than
  config alone: Chrome's `<audio>` element always requests these URLs with a
  `Range` header, and Dropbox answers with `206 Partial Content` — but the
  Cache API spec forbids storing a `206` response (`cache.put()` throws),
  and `ngsw`'s `DataGroup.cacheResponse()` has no special handling for that
  case, so it silently fails to cache anything cached purely off the
  `<audio>` element's own requests (playback still works, it just never
  gets cached). `<audio>` also has no `crossorigin` attribute here, so its
  requests are `no-cors` → opaque responses, which need
  `cacheOpaqueResponses: true` to be cacheable at all — moot for the `206`
  case, but relevant for the fix below.
  Resolution: `src/app/playback/recording-cache.ts`'s `warmRecordingCache()`
  fires a plain, headerless `fetch(url, { mode: 'no-cors' })` once a track's
  live stream has already loaded its metadata (called from
  `mini-player.ts`'s `onLoadedMetadata()`). A headerless request gets a full
  `200` from Dropbox (confirmed via `curl`), which — combined with
  `cacheOpaqueResponses: true` — *is* cacheable. `ngsw` matches cache
  lookups by URL only (not by the incoming request's headers), so a later
  Range-bearing request from `<audio>` for the same URL still hits this
  cached full-body entry.
  **Resolved verification concern:** does serving a full-body response to a
  Range-bearing request break seeking? No — browsers already handle a
  server that ignores `Range` and returns `200` by treating the whole
  response as the resource (the same fallback that would kick in against
  any plain HTTP server without range support at all); once the full body
  is available, seeking/scrubbing is decode-buffer-local and unaffected by
  how the bytes arrived. No byte-range slicing of the cached response is
  needed.

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

**Noted trade-off (resolved):** Angular's built-in service worker (`ngsw`)
is tuned for app-shell/JSON caching, not streaming-media range requests —
see the opportunistic-caching note above under Audio hosting for how this
was actually worked around (a headerless warm-up fetch, since `ngsw` can
never cache the `<audio>` element's own Range-bearing/206 requests
directly).

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
- Player UI details beyond the persistent mini-player shape and queue
  behavior above (exact transport controls, layout specifics) not yet
  discussed.
