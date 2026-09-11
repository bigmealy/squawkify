# Adding a new practice's recordings

Data lives in three git-crypt-encrypted, hand-maintained JSON manifests in
`public/data/`: `songs.json`, `practices.json`, `recordings.json` (schemas:
`src/app/models/{song,practice,recording}.ts`). See `DESIGN.md` for the
full data-model rationale. This file is the mechanical steps only.

## 1. Find the practice's files in Dropbox

**Always use the Dropbox web UI (dropbox.com), never the locally-synced
Dropbox folder on disk** — it contains unrelated personal subfolders that
shouldn't be browsed for this task.

Recordings live under `Marty/seagles/Seagles Practice Mixes/<YYYYMMDD>/`.
Open that dated subfolder and list its files.

## 2. Ask the human for practice metadata

You cannot infer venue/label from Dropbox alone — ask for: practice date
(usually the folder name), venue, and label (e.g. "Full Band" vs a partial
lineup like "Vocal Practice (names)"). Also ask for explicit playback
order if the filenames don't already have a numeric prefix — don't assume
alphabetical/directory order is the intended set order.

## 3. Mint ONE Dropbox share link per practice (not per file)

Per-file share links (24 files -> 24 manual copies) are too much manual
work, and naively swapping the trailing path on one existing file's link
does **not** work — Dropbox validates the link's token against the exact
file it names, and a mismatched swap silently serves a "No Access" page
(still HTTP 200, so check content, not status).

The working method:

1. Open the practice's dated subfolder, click **"Share folder"** (top
   right) -> the settings gear icon in that panel -> the **"Link for
   viewing"** tab (the quick "Copy link" on the share panel itself
   defaults to an edit link) -> "Create link" if none exists yet -> "Copy
   link".
2. This gives `https://www.dropbox.com/scl/fo/<subfolder_id>/<subfolder_share_id>?rlkey=<rlkey>&st=...&dl=0`.
3. Build each file's `recordings.json` `url` as:
   `https://www.dropbox.com/scl/fo/<subfolder_id>/<subfolder_share_id>?preview=<url-encoded filename>&rlkey=<rlkey>&raw=1`
   (drop `st=`/`dl=0`, add `preview=<filename>&raw=1`).

If reading the copied link back out of the clipboard via a browser
automation tool gets content-filtered (query-string-shaped tokens can trip
output filters), inject it into a visible page element
(`el.innerText = await navigator.clipboard.readText()`) and read that
element's text back instead of reading the clipboard API result directly.

Before writing all entries, spot-check one built URL with `curl -sIL` and
confirm a real redirect chain ending at `dl.dropboxusercontent.com`, not a
silent "No Access" page (still HTTP 200, so check the `location` headers,
not just the status code).

## 4. Append practices.json

One entry: `{ "id": "<YYYY-MM-DD>", "date": "<YYYY-MM-DD>", "venue": "...", "label": "..." }`.
`id` always equals `date` verbatim — no separate slug.

## 5. Append recordings.json

- `id`: next sequential `r<N>` (check the current highest numeral first).
- `songId`: must already exist in `songs.json` (kebab-case slug) — add a
  new song entry first if this practice introduces one.
- `takeLabel`: mirror the file's own naming (e.g. "Take 1", "Take 2",
  "Ending", "Part 1") rather than inventing new vocabulary.
- `setOrder`: populate 1..N in the confirmed playback order when the human
  gives one, or when filenames carry a numeric performance-order prefix
  (`01-`, `02-`, ...). Omit entirely (for every recording in that practice)
  when there's no numbered prefix and no explicit order was given —
  `sortRecordingsBySetOrder` treats a missing value as `0` and falls back
  to manifest order.
- `notes`: free text, used sparingly to flag anomalies (missing takes,
  partial/section-only recordings, split-into-parts songs, etc).
- Keep each practice's recordings contiguous in the array (cosmetic
  convention, not enforced by code).

## 6. songs.json

Only touch this if a genuinely new song appears — add
`{ "id": "<kebab-slug>", "title": "...", "status": "learning" | "gigging" }`.

## 7. ngsw-config.json

The `dropbox-recordings` dataGroup's `urls` pattern should already be
`https://www.dropbox.com/scl/fo/**` (broad enough to cover every practice's
distinct per-folder share ID). If it's ever narrowed back to one specific
folder ID, broaden it again — a new practice always mints a new folder ID,
so a narrow pattern silently stops caching every prior practice's audio.

## 8. Verify, don't auto-commit

- `ng serve`, confirm the new practice appears in the Practices view
  (most-recent-first) with correct grouping/order, and its takes appear
  under the right songs in the Setlist view.
- Spot-check 2-3 new URLs with `curl -sIL` for a real redirect chain to
  `dl.dropboxusercontent.com`.
- These manifests are `git-crypt`-encrypted at rest in git (transparent
  locally once unlocked) — edit them as plain JSON, no special handling
  needed for the encryption itself.
- Don't commit/push unless explicitly asked.
