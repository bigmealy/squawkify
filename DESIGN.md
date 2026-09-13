# Band Rehearsal Player — Design Notes

## Goal

Custom web player so band-mates (6 people total) can conveniently listen to
rehearsal recordings on phones/devices. Recordings are captured every
rehearsal and mixed afterward by the site owner.

## Navigation

Two views over the same underlying data:

1. **Practices** (default/landing view) — list of practices. Selecting a
   practice shows the songs played that day, playable individually or as a
   "play all" playlist.
2. **Setlist** — list of songs. Selecting a song shows every recording of
   that song (with practice date etc.), playable individually or as a
   "play all versions" playlist.

Both views are just different groupings of the same recordings list, so no
data duplication is needed — Setlist groups by song, Practices groups by
practice.

## Data model

Three related lists, hand-maintained manifest files (JSON/CSV) initially —
no auto-discovery from cloud storage for now.

- **Songs** (canonical list): id/slug, title, maybe status (e.g.
  "learning" vs "gigging"). Exists independently of recordings, so a new
  song can be added before any recording of it exists.
- **Practices**: date, venue, label.
- **Recordings** (join table): `song_id`, `practice_id`, recording URL
  (see "Audio hosting" below for where that URL currently points), take
  label, notes, `set_order` (explicit playback order within a practice).

## Audio hosting — Azure Blob Storage

**History:** originally hosted on Dropbox (raw share links); migrated to
Azure Blob Storage on 2026-09-13 after real-world testing showed Dropbox's
shared-link rate limiting triggers fast (a handful of requests within
~1 minute tripped `503`s) and isn't cleanly scoped per-file, undermining
the prefetch-then-blob caching approach below. See ROADMAP.md's Stage 10
for the migration itself; this section describes the current setup.

- **Account**: `squawkfiy`, West Europe, Standard performance, LRS
  redundancy, Hot access tier, Microsoft-managed encryption keys, 7-day
  soft delete on blobs and containers, `allowSharedKeyAccess: true` (used
  for admin uploads via `azcopy`/account key — see `CLAUDE.md`), public
  network access enabled from all networks (app-level auth is deferred to
  the phased plan below rather than restricted at the network level).
- **Container**: `squawkify`, anonymous public access at the **Blob**
  level (not container listing) — chosen specifically so `recordings.json`
  URLs stay plain HTTPS links needing no backend or SAS-token minting for
  playback itself, matching the phased-auth plan below.
- **URL layout unchanged from Dropbox**: same per-practice-dated-folder
  scheme, just a different host —
  `https://squawkfiy.blob.core.windows.net/squawkify/<YYYYMMDD>/<filename>`.
  The migration was a mechanical URL rewrite (92 recordings), not a
  data-model change.
- Azure Blob Storage supports HTTP Range requests natively (verified via
  `curl` and via a real `<audio>` seek), same as Dropbox did.
- **CORS gotcha (found the hard way):** Azure Storage accounts ship with
  **zero CORS rules by default**. This doesn't block direct playback
  (`<audio src>` doesn't need CORS) but silently breaks any
  `fetch()`-based approach — the prefetch-then-blob code below failed with
  `TypeError: Failed to fetch` and quietly fell back to plain streaming,
  with no visible error anywhere. Easy to mistake for "it's just always
  been streaming-only." Fixed with an explicit CORS rule (`GET, HEAD,
  OPTIONS`) scoped to the production SWA origin plus local dev ports
  (`http://localhost:4200`, `http://localhost:4300`) — set via
  `az storage cors add --services b ...`. Worth checking first if caching
  ever silently stops working again after any storage account changes.
  **The production SWA domain is deliberately not written in this repo's
  docs**, even though it's referenced by name here: this repo is public,
  and Phase 1 of the access-control plan below relies on that URL being
  *unlisted* — publishing it in plain markdown would defeat that, and the
  site itself displays real band-mates' names in practice labels. Keep
  the actual domain in a private note (or just the Azure Portal /
  `az staticwebapp list`) rather than in any tracked file.
- **Caveat carried over from Dropbox, still true:** the audio files
  themselves are hit directly by the browser via public blob URLs — they
  are not proxied through the site. Any auth added to the site later only
  gates *discovery* of the manifest/setlist, not the raw recording files
  themselves. Anyone with a URL can still play/download it without
  logging in. Acceptable for a 6-person band, but worth remembering if
  recordings become sensitive.
- Not a concern: Azure bandwidth/request costs at this scale (~90
  recordings, ~400MB total, 6 users) — Hot-tier storage is a fraction of a
  cent per GB/month, and the fetch-then-cache approach means each file is
  downloaded from Azure roughly once per device rather than once per play,
  keeping egress well within Azure's free monthly allowance.
- **Opportunistic caching, superseded:** the original Dropbox-era approach
  (a `dropbox-recordings` `ngsw` dataGroup plus
  `src/app/playback/recording-cache.ts`'s headerless warm-up fetch) no
  longer exists — replaced by the prefetch-then-blob approach below, which
  makes the *primary* playback request itself the one that populates the
  cache, rather than relying on a racing secondary fetch. See Stage 8/10
  in ROADMAP.md for the history.

## Prefetch-then-blob playback (2026-09-11 investigated/reverted, 2026-09-13 resolved)

**Status: implemented and verified end-to-end.** This section is kept as
a handoff/postmortem narrative — what was tried, what broke, what was
fixed — since the debugging history below is still valuable even though
the outcome it was blocked on has since been resolved. Skip to the
"Resolution (2026-09-13)" note at the end for the current state.

Originally: **built, debugged, and deliberately reverted** in one session
after real-world testing turned up a Dropbox-side issue that wasn't
resolved before time ran out; the code reverted to the "Opportunistic
caching" design (see the superseded note in the Azure hosting section
above). What follows is that original session's handoff note, unmodified
except for this framing.

**Motivation.** The opportunistic-caching approach above only ever caches
a *secondary*, best-effort warm-up request — the live `<audio>` stream
itself is never cached, so even a fully-cached track still does a real
network stream on every play; only a *second* play benefits, and only if
the warm-up fetch won by the time you next hit play. The idea explored
here was to make caching actually work for the primary playback path:
`fetch()` the whole file, turn it into a `Blob`, and play from
`URL.createObjectURL(blob)` — one request instead of two, and a real
cache hit (near-instant, `(ServiceWorker)` in the Network tab) on replay.

**What was built.** In `mini-player.ts`, the constructor `effect()` was
rewritten to, on each track selection: `fetch(url, { signal })` (default
`cors` mode, not `no-cors` — a `Blob` needs a readable response) inside an
`AbortController`-scoped async IIFE, `await response.blob()`,
`URL.createObjectURL(blob)`, assign that to `audio.src`, then `.play()` —
with no `await` between the `.src` assignment and `.play()`, preserving
an existing (already-hard-won) invariant that the two must land in the
same synchronous continuation or `.play()` can reject with
`NotSupportedError`. `AbortController` cancelled a stale in-flight fetch
on rapid track-skipping or component destroy. A fetch failure fell back
to the old direct-URL streaming behaviour (`audio.src = url` unmodified)
so a bad prefetch wouldn't break playback outright. `recording-cache.ts`
(the old warm-up-fetch file) became dead code and was deleted, since the
single prefetch now does both jobs (playback + cache-warming) by itself.
All of this is fully described, with exact code shape, in the plan file
from that session if it's still around
(`~/.claude/plans/foamy-scribbling-galaxy.md` at the time of writing) —
worth reading in full before re-attempting, rather than re-deriving the
design from scratch.

**CORS was confirmed fine.** `curl -H "Origin: ..." <url> -L` against a
real `recordings.json` URL showed Dropbox's `dl.dropboxusercontent.com`
response (after the redirect) carries `access-control-allow-origin: *` on
both plain and Range GETs — a default (`cors`-mode) `fetch()` should
succeed non-opaque and `.blob()` should work. This part of the premise
held up.

**iOS Safari autoplay risk: accepted, never actually tested.** Inserting
a real fetch before `.play()` risks the browser deciding too much time
has passed since the user's tap to still honour `.play()`
(`NotAllowedError`), since fetch involves genuine async scheduling rather
than a same-tick continuation. The plan was to ship it and verify
manually on a real device over LAN (`npm run serve-lan`, `ng serve --host
0.0.0.0`, browse from the phone to the machine's LAN IP) — this part
*did* get tested and **passed**: tapping play on an iPhone over LAN
worked fine, no autoplay rejection observed. So this specific risk turned
out to be a non-issue in practice, at least in the one test done.

**Real bug found: opaque-response cache poisoning.** `ngsw-config.json`'s
`dropbox-recordings` dataGroup had `cacheOpaqueResponses: true` (needed
by the *old* no-cors warm-up approach). Left on, it caused this loop: any
time the prefetch `fetch()` failed for *any* reason, the code fell back
to `audio.src = <raw url>`, and the native `<audio>` element's own
request for that URL — `no-cors`/opaque, Range-bearing — got cached
because opaque responses are cacheable regardless of their real status
(see the correction added to the "Opportunistic caching" note above).
Because `ngsw` matches cache entries by URL only, that one bad opaque
entry then got served to *every future* request for that URL, including
the prefetch's own `cors`-mode `fetch()` — and per the Fetch spec, an
opaque response can never satisfy a cors-mode request, so it permanently
failed with `TypeError: Failed to fetch` from then on, re-triggering the
fallback forever. Confirmed directly via
`caches.open(name).then(c => c.match(url))` in DevTools: the cached entry
showed `type: "opaque", status: 0`. **Fix identified and verified
correct in isolation:** set `cacheOpaqueResponses: false` on that
dataGroup — the prefetch's happy-path caching goes through the normal
`res.ok` branch and never needed opaque caching to begin with, so this
closes the poisoning loop with no downside. This fix was *not* re-applied
on revert — it only matters if the prefetch-then-blob approach comes
back, since the currently-live warm-up-fetch approach still needs
`cacheOpaqueResponses: true` to work at all.

**Blocker that ended the session: Dropbox rate-limiting (`503`).**
During testing — a mix of manual replays and an automated browser
reproduction session, each re-downloading a multi-megabyte file
repeatedly in a short window — Dropbox started returning `503 Service
Unavailable` for a growing fraction of requests, including for tracks
that had never been touched before. This is almost certainly ordinary
abuse/rate-limit protection on Dropbox's side reacting to request volume,
not a bug in the code (the fallback behaviour handled it gracefully:
playback degraded to direct streaming rather than breaking). But it made
it impossible to cleanly verify the actual happy path — "prefetch
succeeds → real cache entry written → replay is instant" — before time
ran out; the throttle was still active more than 30 minutes after the
heavy-testing burst, longer than expected.

**Open questions for next time:**
- Does normal, human-paced usage (one band member playing tracks at a
  normal cadence, not automated rapid-fire testing) ever actually trip
  this rate limit? Nothing here suggests it would, but it was never
  confirmed clean — the whole session's testing volume may have been an
  artefact of debugging, not representative of real usage.
- If retried, re-apply the `cacheOpaqueResponses: false` fix from the
  start, and test *sparingly* — a handful of plays with deliberate pauses
  between them, not rapid repeated full-file fetches, to avoid
  re-triggering Dropbox's throttling and burning another session on it.
- Worth deciding upfront whether the full trade-off is even wanted:
  prefetch-then-blob means playback no longer starts progressively (the
  whole file — one sample was ~5MB — downloads before the first note
  plays), versus the current approach's instant-start progressive
  streaming with weaker (secondary-only) caching. That trade-off was
  accepted going in, but is worth re-confirming as still desired.

**Resolution (2026-09-13):** the Dropbox rate-limiting blocker above was
resolved by removing Dropbox from the picture entirely — see the "Audio
hosting — Azure Blob Storage" section's History note and ROADMAP.md's
Stage 10. This wasn't a Dropbox-side fix; migrating to a storage account
under our own control just made the whole failure mode inapplicable. The
`cacheOpaqueResponses: false` fix identified above was re-applied as part
of that migration. End-to-end verification then turned up a *second*,
previously-unknown blocker — Azure Blob Storage ships with no CORS rule
by default, so the prefetch `fetch()` failed with `TypeError: Failed to
fetch` and silently fell back to plain streaming (see the CORS gotcha in
the Azure hosting section above). Once a CORS rule was added, the full
happy path was confirmed for real: `fetch()` succeeds (`type: "cors"`),
`audio.src` is a genuine `blob:` URL, the service worker's `recordings`
cache holds a real entry (checked directly via
`caches.open(name).then(c => c.keys())`), and a replay's cached entry
keeps its original origin `Date` header rather than getting a fresh one —
consistent with being served from cache under the 90-day `maxAge`, not
re-fetched. The trade-off called out above (no more progressive/
instant-start playback) is accepted and now live. Implemented in commit
`494871a` on `prefetch-blob-playback` (not yet merged to `main` as of
this note).

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
`ngsw` can never cache the `<audio>` element's own Range-bearing/206
requests directly. Worked around first via a headerless warm-up fetch,
later replaced by the prefetch-then-blob approach (see Audio hosting
above), which makes the *primary* playback request itself the one `ngsw`
caches, sidestepping the Range-request limitation entirely.

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
  hand-maintained and only revisit auto-discovery (from Azure Blob
  Storage, now) if manifest upkeep actually starts to feel like a burden.
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
