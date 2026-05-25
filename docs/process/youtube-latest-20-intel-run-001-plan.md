# YOUTUBE-LATEST-20-INTEL-RUN-001 Plan

## What

Create the governed run manifest for the next non-Mark public YouTube Build Intel extraction.

Plain English: Mark is the first completed baseline. The next public YouTube step should not be "watch everything" without control. It should select a small, source-backed, public/no-auth, non-Mark batch from the daily watch pool and prove that the batch can only move forward through the full God Mode route. Default mode spreads coverage across creators; targeted mode can focus a high-priority creator like ICOR with Tom for repeated guarded batches.

The manifest is not a "last 50 and done" process. Baseline videos are catch-up. New videos discovered today, tomorrow, or any future daily-watch run remain eligible until they are full-watched or intentionally rejected.

## Why

Steve wants the system to gather enough source intelligence before approving Dev builds. That means other approved public creators need to move from metadata rows into real extraction, but only through the proven full video/audio/visual path with transcript/page/resource evidence.

The missing gap is that `YOUTUBE-LATEST-20-INTEL-RUN-001` was in sprint truth but had no implementation/proof file. That makes the plan easy to misunderstand and invites manual or broad extraction.

## Acceptance Criteria

- Reads from the existing public YouTube daily watch pool.
- Excludes Mark videos because Mark has its own completed baseline path.
- Excludes already full-watched videos.
- Includes new daily-delta videos after baseline catch-up; already full-watched videos stay excluded.
- Selects only public/no-auth, non-private, non-paid rows.
- Caps the manifest to a small batch:
  - default coverage mode: at most 9 creators, 1 video per creator, 9 videos total
  - targeted creator mode: one requested creator can contribute up to the batch cap so ICOR/other priority baselines can catch up without mixing sources
  - every mode stays at most 9 videos total
- Records that runtime extraction must use Gemini API full video/audio/visual watching, not transcript-only or subscription scout output.
- Records that YouTube description/resource links must go through the resolver/Scoper path.
- Does not run extraction, call models, follow links, write backlog cards, or write externally from this proof.

## Definition Of Done

- Add `lib/youtube-latest-20-intel-run.js`.
- Add `scripts/process-youtube-latest-20-intel-run-check.mjs`.
- Add package script `process:youtube-latest-20-intel-run-check`.
- Focused proof reads the live daily watch pool and emits the selected non-Mark run manifest.
- Dogfood proof rejects Mark rows, paid/private rows, already full-watched rows, random channel noise, and proves targeted ICOR creator mode can select multiple videos without broadening into paid/auth sources.

## Not Next

- Do not run a broad all-creator extraction.
- Do not call Gemini or any model in this proof.
- Do not fetch transcripts, screenshots, comments, member/community content, downloads, opt-ins, purchases, or forms.
- Do not use Skool, MyICOR, Gumroad, Calendly, private/auth/paid/course sources.
- Do not create backlog cards from this manifest.
- Do not approve a build candidate directly from the manifest.

## Tests

- `node --check lib/youtube-latest-20-intel-run.js`
- `node --check scripts/process-youtube-latest-20-intel-run-check.mjs`
- `npm run process:youtube-latest-20-intel-run-check -- --json`
