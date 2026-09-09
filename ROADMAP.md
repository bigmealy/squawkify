# Band Rehearsal Player — Roadmap

Staged build plan, thinnest-possible-path first. See `DESIGN.md` for the
full design rationale behind each decision referenced here. Each stage
should be shippable/demoable before moving to the next.

## Stage 1 — Scaffold ✅

- `ng new`, standalone components + signals (no NgModules).
- Get it building locally.
- Deployment (GitHub upstream, Azure Static Web Apps) deliberately not
  part of this stage — moved to Stage 7, alongside real-device
  shakedown. Trade-off: no live deploy to demo until late, in exchange
  for not touching GitHub/Azure account setup until there's a real app
  worth deploying.
- Complete — `band-rehearsal-player` scaffolded (routing + SCSS), `ng
  build`/`ng serve` verified locally.

## Stage 2 — Data model, no audio yet ✅

- Hand-write the Songs / Practices / Recordings JSON manifests. ✅ —
  real setlist, practice dates, and 53 recordings (sourced from the
  Dropbox mixes folder) are in `public/data/`.
- Define TypeScript interfaces for all three. ✅ — `Song`, `Practice`,
  `Recording` in `src/app/models/`; `recordings.json` keys renamed to
  camelCase to match (`setOrder` is optional — only the 2026-04-01
  practice has it populated so far).
- Load manifests via `HttpClient`. ✅ — `RehearsalData` service
  (`src/app/data/`) uses `httpResource` to load all three into signals,
  with `isLoading`/`error` derived from them; covered by
  `rehearsal-data.spec.ts`.
- Build Setlist view (grouped by song) and Practices view (grouped by
  date) as plain list/detail navigation, correctly joined and ordered by
  `setOrder`. ✅ — `SetlistList`/`SetlistDetail` and
  `PracticesList`/`PracticeDetail` (`src/app/features/`), lazy-routed via
  `app.routes.ts`. Joining/grouping/ordering logic lives in
  `src/app/data/rehearsal-grouping.ts` (pure, unit-tested) and is exposed
  from `RehearsalData` as `songsWithRecordings`/`practicesWithRecordings`
  computed signals. Setlist ordered by manifest order, takes within a song
  most-recent-practice-first, practices most-recent-first, recordings
  within a practice by `setOrder` (falling back to manifest order when
  absent). Root `App` cleaned up to a nav + `<router-outlet>` shell.
- No playback yet — just confirm the data model and navigation are
  right.

Stage 2 complete — data model, manifests, loading, and navigation are all
in place with no audio playback yet.

## Stage 3 — Playback ✅

- Persistent mini-player component (Spotify-style bar, not a full-screen
  now-playing view). ✅ — `MiniPlayer` (`src/app/playback/mini-player/`),
  a sticky footer bar hidden until a recording is selected, then showing
  song title + take label.
- `<audio>` element wired to Dropbox raw links (`raw=1` /
  `dl.dropboxusercontent.com` style, not the Dropbox API). ✅ — real
  `raw=1` URLs from `recordings.json`, set imperatively on the `<audio>`
  element (rather than via an `[src]` binding) so it's guaranteed to land
  before `play()` is called.
- Play/pause/scrub. ✅ — via the native `<audio controls>` element.
  `PlayerState` (root-provided signal service, `src/app/playback/`) is
  the single source of truth for what's current/playing; Setlist/Practice
  detail rows call it through component methods (`onPlay`), not directly
  from templates. Covered by `player-state.spec.ts` and
  `mini-player.spec.ts`.
- "Play all" queue logic for practice-sets. ✅ — `PlayerState.playAll()`/
  `playNext()` (`src/app/playback/player-state.ts`) drive a queue seeded
  from a practice's already-`setOrder`-sorted recordings; `PracticeDetail`
  has a "Play all" button above its recording list. (Song-version "play
  all" dropped — not needed: takes of a song are alternate versions, not a
  sequence you'd play through.)
- Stop-at-end behavior (no auto-loop back to start). ✅ — `playNext()`
  clears queue state and stops instead of wrapping once the last queued
  recording finishes; verified manually that a queue plays through in
  order and halts on the final track. A per-row "Play" click correctly
  interrupts an active queue.
- Previous/Next track transport controls in the mini-player, so a
  "Play all" queue can be navigated manually. ✅ — `PlayerState.hasPrevious`/
  `hasNext` computed signals and a symmetric `playPrevious()` (mirrors
  `playNext()`, no wrap at the start of the queue) back two always-visible
  buttons in `MiniPlayer`, disabled via the `disabled` attribute (not
  hidden) when there's no previous/next item — including single-track
  playback with no active queue, where both are disabled. Covered by
  `player-state.spec.ts` and `mini-player.spec.ts`.
- This is the core value of the app — everything before it is
  scaffolding.

Stage 3 complete — single-track playback, mini-player, `<audio>` wiring,
play/pause/scrub, "Play all" queueing with stop-at-end behavior, and
Previous/Next transport controls are all in place.

## Stage 4 — PWA install ✅

- `ng add @angular/pwa`. ✅ — added `@angular/service-worker`,
  `ngsw-config.json`, `manifest.webmanifest`, and `provideServiceWorker`
  in `src/app/app.config.ts`; `angular.json`'s production config builds
  with `serviceWorker: "ngsw-config.json"`.
- Icons, web manifest. ✅ — app branded "Squawkify" (band: Seagles); real
  "Seagles — An Eagles Tribute" badge artwork composited full-bleed onto
  a navy square (white background removed and replaced with the badge's
  own navy, circle scaled to ~80% of the canvas so it survives circular/
  rounded-corner masking on Android and iOS without clipping) and
  rendered into the standard Angular PWA icon set (72–512px) plus a
  180×180 `apple-touch-icon`, all in `public/icons/`. `manifest.webmanifest`
  has real `name`/`short_name`/`description`/`theme_color`/`background_color`
  (`#092439`, sampled directly from the badge's navy fill). `index.html`
  also carries `apple-mobile-web-app-*` meta tags for reliable iOS
  standalone-mode install.
- Base service worker: app-shell/JSON caching only. ✅ — the three
  `public/data/*.json` manifests (songs/practices/recordings) were added
  to `ngsw-config.json`'s `"app"` asset group (prefetch, alongside the
  app shell), verified via a production build + local static serve that
  the service worker registers, activates, and caches all three JSON
  files. The `ngsw` audio `dataGroup` (opportunistic caching) is
  correctly left out — deferred item, unchanged.
- Confirm "add to home screen" works on a real phone. **Deferred to Stage
  7** — real installability needs HTTPS, which only exists once the app
  is actually deployed (Stage 7 already lists install-flow verification
  as a to-do there). Local verification instead: production build served
  statically, confirmed in Chrome DevTools that the manifest parses
  correctly with all icons loading, and the service worker
  registers/activates with the expected app-shell + JSON caches
  populated.

Stage 4 complete — PWA manifest, real branding/icons, and a base
app-shell/JSON service worker are in place; only real-phone install
confirmation carries over to Stage 7's device shakedown.

## Stage 5 — Lock-screen / background playback (mostly complete)

- Media Session API metadata + transport handlers. ✅ —
  `buildMediaMetadata()` (`src/app/playback/media-session.ts`) builds a
  `MediaMetadata` (title + take label, album from practice
  label/venue + date, generated artwork) from the current
  `JoinedRecording`; wired into `MiniPlayer`
  (`src/app/playback/mini-player/mini-player.ts`), which is the one place
  that already holds both the real `<audio>` element and `PlayerState`.
  `play`/`pause` action handlers call the audio element directly;
  `previoustrack`/`nexttrack` handlers are toggled on/off (via `null`) in
  step with `PlayerState.hasPrevious`/`hasNext`, mirroring the mini-player
  buttons' own `[disabled]` logic. `playbackState` ('playing'/'paused') is
  kept in sync from the existing `(play)`/`(pause)` event handlers. All
  `navigator.mediaSession` access is guarded by `'mediaSession' in navigator`
  so it's a no-op in environments without support (including the Vitest/
  jsdom test environment — existing specs pass unmodified). **Deliberately
  not implemented:** `seekto`/`setPositionState` (lock-screen scrub-bar
  seeking) — on iOS, registering those replaces the previous/next track
  buttons with skip-forward/back-15s buttons, which is the opposite of
  what's wanted here.
- Placeholder artwork generation (color block + initials) for lock-screen
  display. ✅ — `src/app/playback/artwork.ts`: `hueFor(song.id)` hashes
  each song to a stable HSL hue (no hand-maintained palette needed),
  `initialsFor(song.title)` derives up to two initials, and
  `songArtworkDataUrl()` renders both onto a 512×512 canvas at runtime,
  returned as a `data:image/png` URL (or `null` if canvas 2D rendering is
  unavailable, so metadata omits artwork rather than throwing). Covered
  by `artwork.spec.ts`. Verified in-browser (`ng serve` + Chrome) that
  real songs render distinct color blocks with correct initials and that
  `navigator.mediaSession.metadata` reflects title/album/artwork
  correctly for both single-track and "Play all" queue playback,
  including metadata/enabled-state updates as the queue advances.
- Verify background/backgrounded-tab playback doesn't pause on
  visibility-change — test on an actual iOS device, since that's the
  flaky case. **Deferred to Stage 7** (real-device shakedown) — no code
  anywhere currently listens for `visibilitychange`, so this is a
  verification-only item, not a code change, unless real-device testing
  turns up a problem.

Stage 5 complete except real-device verification — Media Session
metadata, generated placeholder artwork, and play/pause/previous/next
lock-screen transport controls are all in place and verified in-browser;
only the actual-iOS-device confirmation carries over to Stage 7's device
shakedown.

## Stage 6 — UI/UX design pass ✅

- Mobile-first responsive redesign across the whole app, not just the
  mini-player: a dark, navy-forward theme (`#092439` base, cream text,
  gold/amber accents) extending the existing app icon's own badge
  palette, driven by a small design-token file
  (`src/styles/_tokens.scss`) rather than one-off hardcoded colors. ✅
- A single morphing shared header (`src/app/shell/header/`) replacing
  the previous plain `<nav>` in `app.html`: burger + app title on list
  views below ~768px, horizontal Setlist/Practices tabs above ~768px
  (no burger needed at tablet/desktop widths), and an iOS-style back
  chevron + page title on detail views. Back navigation uses real
  browser history (`Location.back()`), falling back to the parent list
  route on a deep link with no history. ✅
- A simple nav drawer (`src/app/shell/nav-drawer/`, native `<dialog>`
  for free focus-trapping/Escape-to-close) for the burger menu — just
  the two existing Setlist/Practices links. ✅
- List/detail view restyle (`setlist-list`, `setlist-detail`,
  `practices-list`, `practice-detail`): card-style rows, proper
  touch-target sizing, and a currently-playing highlight driven by the
  existing `PlayerState.current()` signal (no new playback logic). ✅
- Visual styling/layout pass over the mini-player, queue behavior, and
  Previous/Next transport controls — shape and behavior are already in
  place from Stage 3/5. Native `<audio controls>` is replaced with a
  custom Prev/Play-Pause/Next + scrub-bar transport UI for visual
  consistency with the rest of the redesign, still backed by the same
  `<audio>` element and `PlayerState`/Media Session wiring. Includes
  `env(safe-area-inset-bottom)` handling for the iOS home indicator. ✅
- Covers the "Player UI details" item previously listed under Deferred
  — removed from that list now that it's done.

Stage 6 complete — navy/gold theme, morphing header, nav drawer, card-style
list/detail views, and the custom mini-player transport UI are all in
place (`src/app/shell/`, `src/styles/_tokens.scss`, restyled
`mini-player`).

## Stage 7 — Deploy & real-device shakedown (iOS verified, Android outstanding)

- Create a personal GitHub repo, push, `git remote add origin` /
  `git push -u origin main`. ✅ — pushed to `bigmealy/squawkify` on
  GitHub; recording/practice/song JSON manifests are `git-crypt`
  encrypted in the repo (real Dropbox links + band data shouldn't be
  public even though the repo/URL is otherwise unlisted).
- Create the Azure Static Web App resource (Portal or `az
  staticwebapp create`), linked to that repo/branch, unlisted URL, no
  auth yet:
  - App location `/`, output location
    `dist/band-rehearsal-player/browser` (must include the `/browser`
    suffix — verify manually even if a preset autofills something
    else). ✅ — resolved via a CI-built workflow (`skip_app_build:
    true`, `app_location: dist/band-rehearsal-player/browser`,
    `output_location: ""`) rather than Azure's own Oryx build, since
    Oryx can't unlock `git-crypt` to build the encrypted manifests.
  - Api location blank (no Azure Functions API). ✅
  - Let the wizard auto-generate the GitHub Actions workflow and
    deployment-token secret — don't hand-author one in advance.
    **Deviated**: hand-authored `.github/workflows/azure-static-web-apps.yml`
    instead, to add the `git-crypt` unlock step before build (needs a
    `GIT_CRYPT_KEY` secret alongside the wizard's own
    `AZURE_STATIC_WEB_APPS_API_TOKEN`).
- Confirm the `*.azurestaticapps.net` URL loads the live app after the
  workflow runs. ✅ — resource created, secrets set, workflow green,
  live URL confirmed loading the app.
- Test with actual Dropbox links on phones (iOS Safari + Android
  Chrome). ✅ on iOS Safari (iPhone) — playback confirmed. **Android
  Chrome not tested** — no Android device available; treat as
  outstanding until someone with one can check.
- Verify range-request seeking/scrubbing. ✅ on iOS Safari — scrubbing
  works. Also spot-checked server-side independent of any device: the
  Dropbox `raw=1` link redirects to `dl.dropboxusercontent.com`, which
  responds to a `Range` request with `206 Partial Content` and
  `accept-ranges: bytes`. Android still unverified.
- Verify background audio and install flow. ✅ on iOS Safari — locking
  the screen/switching apps keeps audio playing with working lock-screen
  transport controls, and "Add to Home Screen" installs and launches
  standalone with the correct icon/name. Android still unverified.
- Fix whatever breaks here before telling the band it's ready. Nothing
  broke on iOS.

Deploy pipeline is live (`bigmealy/squawkify` → Azure Static Web Apps,
encrypted manifests unlocked in CI) and the full device shakedown has
passed on iOS Safari (play/scrub, background audio, lock-screen
controls, home-screen install). The only remaining gap is Android
Chrome, which hasn't been tested on real hardware yet — the band has a
mix of iOS and Android phones, so this should be checked before calling
Stage 7 fully done.

## Deferred (explicitly not in the critical path)

- **SWA auth**: `staticwebapp.config.json` + role-gated routes for the 6
  band-mates. Bolt on once the unlisted URL feels insufficient — low
  cost, config-only addition.
- **Opportunistic `ngsw` audio caching**: cache-first `dataGroup` for the
  Dropbox domain, caching each recording on first play.
- **Range-request-on-cached-audio verification**: needed only if the
  above caching is added — confirm a cached recording still correctly
  serves `Range` requests for scrubbing.
- **Dropbox auto-discovery**: no fixed trigger; only revisit if manifest
  upkeep starts to feel like a burden.
- **PWA install flow/UX**: manual instructions vs. in-app install
  prompt — not yet decided.
