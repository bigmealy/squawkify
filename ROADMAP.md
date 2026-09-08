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

## Stage 2 — Data model, no audio yet

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
  `rehearsal-data.spec.ts`. Verified via a temporary `effect()` in
  `App` (to be removed once the views below consume it directly).
- Build Setlist view (grouped by song) and Practices view (grouped by
  date) as plain list/detail navigation, correctly joined and ordered by
  `setOrder`.
- No playback yet — just confirm the data model and navigation are
  right.

## Stage 3 — Playback

- Persistent mini-player component (Spotify-style bar, not a full-screen
  now-playing view).
- `<audio>` element wired to Dropbox raw links (`raw=1` /
  `dl.dropboxusercontent.com` style, not the Dropbox API).
- Play/pause/scrub.
- "Play all" queue logic for both song-versions and practice-sets.
- Stop-at-end behavior (no auto-loop back to start).
- This is the core value of the app — everything before it is
  scaffolding.

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
