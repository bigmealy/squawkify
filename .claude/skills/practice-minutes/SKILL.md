---
name: practice-minutes
description: >
  Turns a raw Whisper transcript (.txt) of a Seagles band practice into a
  minutes.md draft, in this project's standard practice-minutes format
  (practice header, overall points, per-song points, actions checklist).
  Use this whenever the user provides, points to, or mentions a practice
  transcript file — any Whisper output of a rehearsal, whatever it's named
  or wherever it lives (e.g. a "*-Speech-Only.txt", not necessarily called
  "transcript.txt" or sitting next to the practice's mixed audio) — and
  wants minutes, meeting notes, or a summary produced from it, even if
  they don't name this skill directly or use the exact word "minutes".
  Also trigger on requests like "turn this transcript into practice
  notes", "summarize what happened at practice from this transcript", or
  "generate minutes for the <date> practice".
---

# Practice minutes from a Whisper transcript

Turns a raw Whisper transcript of a full-band practice into a `minutes.md`
draft the human reviews before it enters the existing "Adding a new
practice's recordings" workflow (see this repo's `CLAUDE.md`, step 6).

**This skill only writes `minutes.md`.** It never touches
`public/data/minutes.json`, doesn't upload anything to Azure, and doesn't
run `azcopy` — those stay manual, later, separate steps once the human has
reviewed and edited the draft this skill produces.

**The raw transcript itself must never leave where it already sits.**
Read it, and nothing else — never copy, move, rename, or write it (or any
derivative file containing its content, e.g. a saved excerpt) anywhere
else on disk, and absolutely never into this repo's working tree or any
git-tracked location, even one that's git-crypt encrypted. Never run
`azcopy`, `git add`, or any other command that would upload or commit the
transcript. The transcript is source material this skill reads once and
discards; only the `minutes.md` draft it produces is meant to persist
anywhere else.

## Why the filtering matters

A Whisper transcript of a practice is mostly not minutes material. It
contains actual songs being played and sung (which Whisper dutifully
transcribes as lyrics, often garbled or repetitive since it isn't built
for music), plus a lot of ordinary chat that has nothing to do with the
music. Buried in there is the part that's actually worth keeping: remarks
about how a song went, decisions the band made, problems to fix next time,
and action items. The job here is separating that signal from the noise,
not summarizing the whole transcript.

## Inputs

- The transcript file path (required — the human locates and gives you
  this manually every time; never search for, list, or guess at a
  transcript on your own initiative). Don't assume where it lives: in
  practice this has turned out to be an entirely different folder tree
  from the mixed-audio one in `CLAUDE.md`'s step 1, with its own filename
  convention (e.g. a `*-Speech-Only.txt`). Whatever name the file has, and
  wherever it is, "the transcript" means whichever file the human pointed
  you at — and, per the note above, that's the only thing you do with it:
  read it, then leave it exactly where it is.
- Nothing else is required, but check for it:
  - The practice's date — normally the transcript's parent folder name
    (`<YYYYMMDD>`), but confirm with the human if it's not obviously a
    date. Convert it to `<YYYY-MM-DD>` for the header.
  - Look up that date in `public/data/practices.json` (repo root) — if a
    matching `id` exists, reuse its `venue` and `label` for the header.
    If there's no entry yet (this practice hasn't been added to the app
    yet), that's fine — the practice-adding workflow happens later; just
    leave venue/attendance as best-effort from context in the transcript,
    or mark them `**[NEEDS REVIEW]**` if genuinely unknown.
  - Load `public/data/songs.json` for the canonical list of song titles,
    used in "Cross-checking song titles" below.

## Output

Write `minutes.md` into the practice's **mixed-audio folder** — the same
place `CLAUDE.md`'s step 1 describes, so it rides along automatically the
next time that folder gets `azcopy`'d up to Azure per that workflow's own
step 6. This is deliberately **not** the transcript's own folder.

That mixed-audio folder currently lives on a mounted volume whose path
isn't fixed yet (it's moved before — it used to be a `~/Desktop/...`
folder). Don't assume or hard-code a location for it: ask the human for
the destination folder each time, the same way you already get the
transcript path from them, and write `minutes.md` there. If they haven't
given it yet, ask before writing anything.

Use exactly this structure:

```markdown
# Practice Minutes — <YYYY-MM-DD>

**Venue:** <venue> **Attendance:** <label, e.g. "Full band">

## Overall points

- <band-wide point>
- <band-wide point>

## Song-specific points

### <Song Title>

- <point about this song>

### <Another Song Title>

- <point>

## Actions

- [ ] <action item>
```

This is the same structure already verified rendering correctly in the
player (headings, bold labels, bullet lists, and GitHub-flavored-markdown
checkboxes all render as intended) — don't deviate from it, since the app's
`practice-minutes.scss` styling assumes this shape.

Omit a section entirely if the transcript genuinely has nothing for it
(e.g. no actions were raised) rather than leaving an empty heading.

## Reading the transcript: signal vs. noise

Expect the overwhelming majority of a transcript — even one named
something like `*-Speech-Only.txt` that sounds pre-filtered — to still be
actual song performances. Whisper transcribes singing and playing almost
verbatim (often across several consecutive takes of the same song), and
that routinely makes up the bulk of the file. Don't assume any filtering
has already happened upstream; treat every transcript as fully raw.

Work through the transcript **in order, keeping a running sense of which
song is currently being played or discussed** — rather than scanning for
obvious song-boundary announcements. A song can start with no fanfare at
all (a full run-through of a song can begin mid-conversation with barely a
cue), and it's easy to blow straight past one, especially when its
performance section happens to read fairly cleanly and doesn't jump out
as "obviously lyrics." Losing track of which song you're in is the
single easiest way to misattribute a point or miss a song's section
entirely.

As you go, sort content into three rough buckets:

1. **Performance noise** — stretches where the band is actually playing.
   Whisper renders these as song lyrics (sometimes recognizable, often
   mangled), or as filler during instrumental/ad-lib sections. Skip them.
   Some concrete tells:
   - A run of lines that are (or nearly are) the actual lyrics of a known
     song, especially if it repeats across several consecutive stretches
     (separate takes) with minor variation between them.
   - Repeated single words or short chants — "guitar solo", "Here we go",
     "Oh my God", "Ooh", strings of "Yeah" — often dozens in a row.
     Whisper drops these in for instrumental passages, ad-libs, or crowd
     noise. Skim past runs like this rather than reading every line.
2. **Banter noise** — chat that isn't about the music: scheduling,
   equipment small talk unrelated to a specific fix, jokes, asides,
   inside jokes, unrelated trivia (music history, gear brands, tour
   stories). Skip this too, unless it resolves into something that
   belongs in Actions (see below).
3. **Signal** — anyone commenting on how a song went, what to change, an
   arrangement or structural decision, a part/harmony assignment, or a
   concrete thing that needs doing before next time. This is what goes in
   the minutes.

A practical tell: signal tends to cluster right after a performance
stretch ends (that's when the band stops and discusses how it went), but
don't rely on that alone — it can also surface as a short aside *before* a
song starts, or mid-performance during a false start or "can we try that
again" pause.

Musicians debating a specific chord/note/tab in detail can run long and
go back and forth several times before landing anywhere. Don't transcribe
that negotiation — compress it to the outcome: what was decided, or what's
still unresolved. One bullet capturing "the bass note here isn't settled
between sources" is more useful than reproducing the whole exchange that
established it.

Don't try to attribute remarks to specific band members — the output
format doesn't carry speaker attribution, so you only need *what* was
said, not *who* said it. (Real transcripts do sometimes surface first
names in banter — still leave them out of the minutes.)

## Sorting signal into sections

- **Overall points**: band-wide observations that aren't tied to one song
  — tempo/energy across the practice, a gear issue, a scheduling decision,
  general mix/sound feedback.
- **Song-specific points**: attribute a point to a song only when the
  transcript makes that reasonably clear (they just finished playing it,
  or it's named explicitly). Group all points for the same song under one
  `###` heading, in the order songs came up.
- **Actions**: anything phrased as (or clearly implying) something someone
  needs to do before the next practice — bring equipment, book a venue,
  learn a part, chase someone up. Phrase each as a short imperative, the
  same way `notes` free-text already does elsewhere in this project's data
  (e.g. "Bass to bring a backup cable").

## Cross-checking song titles

Match each song discussed against the `title` fields in
`public/data/songs.json`. When a transcript mentions a song by a name that
doesn't cleanly match an existing title (a nickname, a mishearing, a song
that isn't in the list at all — new to the set, or Whisper mangled the
name), still include it, but flag it:

```markdown
### Radio Ga Ga **[NEEDS REVIEW: no exact match in songs.json — closest is "Radio Gaga"?]**
```

Don't silently rename or drop it — the human reconciles this during
review, and may also need to add a new song to `songs.json` first (that's
the existing step 6→7 in `CLAUDE.md`'s workflow, out of scope here).

## Flagging ambiguity

Produce a complete draft in one pass — don't stop partway through to ask
the human something. Where a call is genuinely unclear, make your best
judgment and mark it inline so it's easy to spot on review, rather than
silently guessing:

```markdown
- Sounded like they want to drop the bridge section, but hard to tell if that was agreed or just floated. **[NEEDS REVIEW]**
```

Use this for: a song attribution you're not confident about, a
signal/noise call that could go either way, a title mismatch (see above),
or a genuine practice-relevant decision whose status is unclear (agreed
vs. just floated). If a whole song's section is too sparse or garbled to
say much, it's fine to write just a `**[NEEDS REVIEW]**` note under that
`###` heading explaining why, rather than force content that isn't there.

Don't over-flag. If something is clearly signal and clearly about one
song, just write it up plainly. And don't flag every unintelligible word
or fragment you skip over — most of a transcript's rough edges are noise
you silently drop (garbled lyrics, cut-off filler, one-off nonsense
words), not ambiguity worth surfacing. Reserve the flag for cases where
the *meaning or attribution of an actual point* is genuinely in doubt.

## After writing

Tell the human where `minutes.md` landed and mention the number of
`**[NEEDS REVIEW]**` flags, if any, so they know how much editing to
expect before this feeds into `CLAUDE.md`'s existing practice-adding
workflow.
