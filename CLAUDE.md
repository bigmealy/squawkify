# Adding a new practice's recordings

Data lives in three git-crypt-encrypted, hand-maintained JSON manifests in
`public/data/`: `songs.json`, `practices.json`, `recordings.json` (schemas:
`src/app/models/{song,practice,recording}.ts`). See `DESIGN.md` for the
full data-model rationale. This file is the mechanical steps only.

Audio is hosted on Azure Blob Storage (account `squawkfiy`, container
`squawkify`) — see `DESIGN.md`'s "Audio hosting — Azure Blob Storage"
section for the full rationale and the CORS gotcha. Dropbox is no longer
part of this workflow at all.

## 1. Find the practice's files locally

Recordings land in `~/Desktop/Seagles WIP/Seagles Practice Mixes/<YYYYMMDD>/`
once mixed. List that dated subfolder's files — no Dropbox browsing
involved.

## 2. Ask the human for practice metadata

Ask for: practice date (usually the folder name), venue, and label (e.g.
"Full Band" vs a partial lineup like "Vocal Practice (names)"). Also ask
for explicit playback order if the filenames don't already have a numeric
prefix — don't assume alphabetical/directory order is the intended set
order.

## 3. Upload the practice's folder to Azure

Account and container are fixed for the life of the project — there's no
per-practice link-minting step (unlike the old Dropbox workflow's
share-link dance, which is gone entirely now).

Generate a short-lived SAS token, then upload with `azcopy`:

```bash
RG=seagles
ACCOUNT=squawkfiy
CONTAINER=squawkify
PRACTICE=<YYYYMMDD>   # e.g. 20260910
EXPIRY=$(date -u -v+2H '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -d '+2 hours' '+%Y-%m-%dT%H:%MZ')

KEY=$(az storage account keys list --account-name $ACCOUNT --resource-group $RG --query "[0].value" -o tsv)

SAS=$(az storage container generate-sas \
  --account-name $ACCOUNT \
  --account-key "$KEY" \
  --name $CONTAINER \
  --permissions rwl \
  --expiry "$EXPIRY" \
  --https-only \
  -o tsv)

azcopy copy \
  "$HOME/Desktop/Seagles WIP/Seagles Practice Mixes/$PRACTICE/*" \
  "https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${PRACTICE}/?${SAS}" \
  --recursive \
  --exclude-pattern ".DS_Store"
```

Spot-check one uploaded file with `curl -sI` for a plain `200` before
writing all `recordings.json` entries.

## 4. Append practices.json

One entry: `{ "id": "<YYYY-MM-DD>", "date": "<YYYY-MM-DD>", "venue": "...", "label": "..." }`.
`id` always equals `date` verbatim — no separate slug.

## 5. Append recordings.json

- `id`: next sequential `r<N>` (check the current highest numeral first).
- `songId`: must already exist in `songs.json` (kebab-case slug) — add a
  new song entry first if this practice introduces one.
- `url`: `https://squawkfiy.blob.core.windows.net/squawkify/<YYYYMMDD>/<url-encoded filename>`
  — built directly from the fixed account/container, the practice date,
  and the file's own name (as uploaded in step 3). Percent-encode spaces,
  apostrophes, and parentheses in the filename (e.g. Python's
  `urllib.parse.quote`) — no share-link construction needed.
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

## 6. Minutes (optional)

If a transcribed/processed minutes markdown document exists for this
practice, drop `minutes.md` into the same local dated source folder
*before* running the `azcopy` upload in step 3, so it uploads in the same
pass as the audio — it lands in the same `<YYYYMMDD>/` blob prefix already
covered by the existing CORS rule and `azcopy` command, so no separate
storage/CORS step is needed.

Then append one entry to `public/data/minutes.json`:
`{ "practiceId": "<YYYY-MM-DD>", "url": "https://squawkfiy.blob.core.windows.net/squawkify/<YYYYMMDD>/minutes.md" }`
— `practiceId` equals the practice's `id`/`date` verbatim (same convention
as `practices.json`), `url` built the same mechanical way as
`recordings.json` URLs.

Skip this step entirely (don't write a placeholder entry) when no minutes
doc exists yet for this practice.

## 7. songs.json

Only touch this if a genuinely new song appears — add
`{ "id": "<kebab-slug>", "title": "...", "status": "learning" | "gigging" }`.

## 8. Verify, don't auto-commit

- `ng serve`, confirm the new practice appears in the Practices view
  (most-recent-first) with correct grouping/order, and its takes appear
  under the right songs in the Setlist view.
- Spot-check 2-3 new URLs with `curl -sI` for a plain `200`. No redirect
  chain to check (unlike the old Dropbox links) — Azure serves the blob
  directly.
- If a minutes entry was added, also `curl -sI` the `minutes.md` blob URL
  for a plain `200`, and in `ng serve` confirm the "View practice minutes"
  link appears on that practice's detail page and the rendered page shows
  real content (not a loading/error state).
- If you touched storage/CORS config itself (not just uploading files),
  also verify CORS is still scoped correctly:
  `curl -sI -H "Origin: <production SWA domain>" <url>` should show
  `access-control-allow-origin` echoing that origin. (Production domain
  deliberately not written here — see DESIGN.md's note on why.)
- These manifests are `git-crypt`-encrypted at rest in git (transparent
  locally once unlocked) — edit them as plain JSON, no special handling
  needed for the encryption itself.
- Don't commit/push unless explicitly asked.
