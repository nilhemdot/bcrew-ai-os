# YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001 Plan

## What

Build the deep-watch lane for public YouTube courses and long trainings that the normal latest-video lane routes out.

Plain English: short videos and courses are not the same job. The short lane catches up on creator uploads. The long-course lane watches one to three long public YouTube trainings at a time, produces a course map, captures visual/audio evidence, identifies resources and approval needs, creates implementation steps, and sends the results into the same synthesis, Director, source-grader, and Dev page flow.

## Why

Steve wants the extractor to learn from full trainings, not skip them. A two-hour course can contain the repo, setup process, architecture, tool chain, mistakes, and implementation detail that a short video does not. Mixing those courses into the normal latest-video batch waters down both jobs. This card makes the routing explicit: same extractor family, different run profile.

## Acceptance Criteria

- Selects public/no-auth YouTube long-course candidates that were routed out of the standard latest-video lane.
- Uses the same Gemini API public YouTube video/audio/visual route as the short-video runner, but splits long courses into bounded video clips with `videoMetadata` start/end offsets so the system does not retry one oversized provider call.
- Uses a long-course prompt profile that asks for:
  - course map
  - visual/audio evidence
  - workflow moments
  - resource needs
  - implementation plan
  - scoping questions
  - build candidates
- Persists a unique long-course report artifact per applied batch.
- Persists proposal-only atoms and evidence hits so the Dev Intelligence Director can rank the output.
- Does not create backlog cards automatically.
- Does not purchase, download, opt in, log in, crawl comments, crawl communities, touch private/paid sources, or write externally.

## Definition Of Done

- Add `lib/youtube-long-course-full-watch-lane.js`.
- Add `scripts/process-youtube-long-course-full-watch-lane-check.mjs`.
- Add package script `process:youtube-long-course-full-watch-lane-check`.
- Extend the Gemini Eyes route with a long-course prompt profile without breaking the standard short-video profile.
- Focused proof shows:
  - long-course route can select routed-out course videos
  - long-course route builds bounded segment plans from the stored YouTube duration
  - long-course prompt outputs a course map and implementation plan
  - report metadata marks the output as long-course
  - no automatic backlog or external writes occur
- Apply path requires both `--apply` and `--live-gemini-api`.

## Not Next

- Do not use logged-in course portals, Skool, MyICOR, Gumroad, Calendly, private videos, paid communities, member areas, comments, forms, checkout pages, or downloads.
- Do not replace source-specific approval packets for paid/private/community/course sources.
- Do not auto-approve resource links.
- Do not auto-promote build candidates into backlog or sprint.

## Tests

- `node --check lib/god-mode-extractor-eyes-quality-loop.js`
- `node --check lib/youtube-long-course-full-watch-lane.js`
- `node --check scripts/process-youtube-long-course-full-watch-lane-check.mjs`
- `npm run process:youtube-long-course-full-watch-lane-check -- --json`
- Apply proof, only when explicitly running a live course watch:
  - `npm run process:youtube-long-course-full-watch-lane-check -- --apply --live-gemini-api --batch-size=1 --json`
