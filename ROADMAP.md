# Band Rehearsal Player — Roadmap

Staged build plan, thinnest-possible-path first. See `DESIGN.md` for the
full design rationale behind each decision referenced here. Each stage
should be shippable/demoable before moving to the next.

## Stage 1 — Scaffold ✅

- `ng new`, standalone components + signals (no NgModules).
- Get it building locally.
- Deployment (GitHub upstream, Azure Static Web Apps) deliberately not
  part of this stage — moved to Stage 6, alongside real-device
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

## Stage 3 — Playback

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
- "Play all" queue logic for practice-sets. Not started — only
  single-track play from a row's Play button exists so far. (Song-version
  "play all" dropped — not needed: takes of a song are alternate versions,
  not a sequence you'd play through.)
- Stop-at-end behavior (no auto-loop back to start). Not deliberately
  implemented yet — true today only because there's no queue to
  auto-advance into; revisit once "Play all" lands.
- This is the core value of the app — everything before it is
  scaffolding.

Stage 3 in progress — single-track playback landed (mini-player, `<audio>`
wiring, play/pause/scrub via native controls). Queueing and stop-at-end
still to come.

## Stage 4 — PWA install

- `ng add @angular/pwa`.
- Icons, web manifest.
- Base service worker: app-shell/JSON caching only. Leave the `ngsw`
  audio `dataGroup` (opportunistic caching) out for now — deferred item.
- Confirm "add to home screen" works on a real phone.

## Stage 5 — Lock-screen / background playback

- Media Session API metadata + transport handlers.
- Placeholder artwork generation (color block + initials) for lock-screen
  display.
- Verify background/backgrounded-tab playback doesn't pause on
  visibility-change — test on an actual iOS device, since that's the
  flaky case.

## Stage 6 — Deploy & real-device shakedown

- Create a personal GitHub repo, push, `git remote add origin` /
  `git push -u origin main`.
- Create the Azure Static Web App resource (Portal or `az
  staticwebapp create`), linked to that repo/branch, unlisted URL, no
  auth yet:
  - App location `/`, output location
    `dist/band-rehearsal-player/browser` (must include the `/browser`
    suffix — verify manually even if a preset autofills something
    else).
  - Api location blank (no Azure Functions API).
  - Let the wizard auto-generate the GitHub Actions workflow and
    deployment-token secret — don't hand-author one in advance.
- Confirm the `*.azurestaticapps.net` URL loads the live app after the
  workflow runs.
- Test with actual Dropbox links on phones (iOS Safari + Android
  Chrome).
- Verify range-request seeking/scrubbing.
- Verify background audio and install flow.
- Fix whatever breaks here before telling the band it's ready.

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
- **Player UI details** beyond mini-player shape and queue behavior
  (exact transport controls, layout specifics).
