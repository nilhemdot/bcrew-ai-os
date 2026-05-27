# YOUTUBE-DEEP-VISUAL-REVIEW-LANE-001 Plan

## What

Build the deep visual re-review lane for already-watched public YouTube videos where the normal watcher may miss exact screen-visible implementation detail.

Plain English: the standard watcher is useful for ideas, workflows, links, tools, and obvious visual moments. It is not enough for videos where the creator shows code, dashboards, terminal commands, UI layouts, settings, prompts, diagrams, or "copy this" implementation details. This lane has two jobs:

- Future runs: the autonomous YouTube extractor watches the video once, immediately checks whether that standard output has screen/code/UI hot spots, and hands hot videos into this deep visual review lane inside the same system run.
- Historical backlog: videos already watched before this upgrade get a top 50 backfill queue so the most valuable old videos can be re-reviewed without rewatching everything blindly.

## Why

Steve does not want the system to lose the gold in videos where the important value is on the screen. The historical YouTube backlog remains valuable, but the most important watched videos need a second pass before the system trusts their implementation detail. Future extraction should also route screen-heavy videos into this lane automatically instead of pretending one standard pass is always enough.

## Acceptance Criteria

- Reads existing full-watch report artifacts and the Dev Intelligence Director report.
- Scores watched videos for deep visual review using:
  - Director rank and mission value
  - screen/code/UI/dashboard/terminal/tooling terms
  - timestamped visual evidence count
  - workflow moments
  - build candidates
  - missed-by-transcript notes
  - resource/repo/tool links
- Produces a top 50 queue for historical re-review.
- Builds bounded segment plans around prior timestamp evidence where possible.
- Adds a `deep_visual` Gemini Eyes prompt profile focused on exact screen-visible text/code/UI/workflow details.
- Integrates with the autonomous watcher so future hot videos route to deep visual review immediately after the standard watch batch, before Director/source-grader refresh.
- Apply mode reruns selected public YouTube videos through the existing ledgered Gemini video/audio/visual route.
- Persists a deep visual review report, proposal-only atoms, and evidence hits.
- Marks output as `promptProfile=deep_visual` and `proofMode=youtube_deep_visual_review_v1`.
- Does not create backlog cards automatically.
- Does not purchase, download, opt in, log in, crawl comments, crawl communities, touch private/paid sources, or write externally.

## Definition Of Done

- Add `lib/youtube-deep-visual-review-lane.js`.
- Add `scripts/process-youtube-deep-visual-review-lane-check.mjs`.
- Add package script `process:youtube-deep-visual-review-lane-check`.
- Extend `lib/god-mode-extractor-eyes-quality-loop.js` with a `deep_visual` prompt profile.
- Extend the autonomous watcher script so live standard batches can immediately call the deep visual lane for the videos just watched.
- Focused proof shows:
  - the top 50 queue is populated from live watched-video reports
  - target videos include screen/code/UI evidence or Director-ranked value
  - timestamp segment plans are generated from prior visual evidence
  - apply mode is gated behind `--apply --live-gemini-api`
  - report metadata is deep-visual-specific
  - no automatic backlog or external writes occur

## Not Next

- Do not leave the future system as two manual passes. The standard watcher and deep visual lane must operate as one extractor workflow: standard pass first, immediate deep pass when hot spots exist.
- Do not claim exact OCR/keyframe extraction is fully solved until a later frame/OCR worker stores and verifies actual frames.
- Do not use logged-in course portals, Skool, MyICOR, Gumroad, Calendly, private videos, paid communities, member areas, comments, forms, checkout pages, or downloads.
- Do not auto-promote build candidates into backlog or sprint.
- Do not run all 50 videos in one unbounded provider call. Run bounded batches from the top 50 queue.

## Tests

- `node --check lib/god-mode-extractor-eyes-quality-loop.js`
- `node --check lib/youtube-deep-visual-review-lane.js`
- `node --check scripts/process-youtube-deep-visual-review-lane-check.mjs`
- `npm run process:youtube-deep-visual-review-lane-check -- --json`
- Apply proof, only with explicit live budget:
  - `npm run process:youtube-deep-visual-review-lane-check -- --apply --live-gemini-api --batch-size=3 --json`
