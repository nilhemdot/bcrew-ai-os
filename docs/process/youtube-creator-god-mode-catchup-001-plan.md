# YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001 Plan

## What

Catch up the approved public YouTube creator list through the YouTube source SOP under `EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001`.

Plain English: this is not "watch more videos." The YouTube lane must run the whole source workflow: metadata triage, latest-10 baseline, full video/audio/visual watch, whole page extraction, description/resource links, approved free-resource capture, paid/free-community evaluation packets, creator grade updates, and morning autopilot reporting.

## Why

Steve's rule is correct: if 30+ creators are on the watch list, extracting only a subset can bias the Director. Similar ideas across creators may merge into a stronger build, or one creator may explain a better implementation path than another.

## Catch-Up Depth

V1 baseline:

- Every approved public creator gets at least latest 10 relevant public videos through the YouTube SOP.
- S/A sources get deeper baseline, up to latest 50 relevant public videos where useful.
- Mark and ICOR remain priority deep baselines.
- New releases from watched creators continue after catch-up; this is not "latest 10 and done."
- Long-course videos route to the long-course lane instead of failing the standard lane.
- Videos already watched under video/audio/visual full-watch are valuable, but they are tagged as not fully source-appropriate God Mode until whole-page extraction, resource follow-up, source-packet worker status, browser Hands status, free-resource capture, paid-gate evaluation, source grade, and autopilot disposition are resolved. YouTube comments are operator-excluded.

## YouTube Source SOP

1. Refresh public metadata for every approved creator.
2. Triage every metadata row before spending model budget:
   - public/no-auth only
   - relevant title/topic signal
   - duplicate/already-watched status
   - standard video vs long-course route
   - private/paid/auth blocker
   - noise/low-value blocker
3. Queue latest 10 relevant public videos per approved creator as the first baseline.
4. Watch qualifying videos with the full video/audio/visual route, not transcript-only or metadata-only output.
5. Extract the whole YouTube page:
   - title
   - description
   - visible metadata
   - captions/transcript status
   - page evidence
6. Classify every description/resource link.
7. Follow only packet-approved public/free resource links through the governed worker/Hands route.
8. Capture free value when allowed:
   - skills
   - code
   - templates
   - repos
   - docs
   - public resource pages
   - checklists or other free implementation material
9. If a free Skool/community is linked, create an exact free-community source packet; after approval, inspect allowed free chat, free courses, and free resources with governed Hands.
10. If a paid gate, login gate, purchase, private area, member-only area, form, checkout, or download boundary appears, stop and create an evaluation packet for Steve.
11. Paid-gate evaluation must answer:
   - what was learned for free
   - what appears to be behind the gate
   - price if visible
   - likely AIOS value
   - risks/unknowns
   - buy / do not buy / needs more free evidence recommendation
12. Persist atoms, evidence hits, resource dispositions, source-packet status, paid-gate evaluation, Director input, Scoper readiness, and creator grade update.
13. Update the source card so every approved creator is visible with grade/score, metadata count, watched count, pending baseline, resource status, paid-gate status, blockers, and next action.
14. Morning autopilot runs this SOP only after dry-run/live-bounded proof is green; it stops and reports blockers instead of guessing.

## Acceptance Criteria

- The watchlist coverage report shows every approved public creator:
  - channel URL
  - tracked metadata count
  - video/audio/visual watched count
  - comment status as `operator_excluded`
  - full YouTube page extraction status
  - approved resource-follow status
  - source-packet worker status
  - browser Hands status
  - free-resource capture status
  - free-community packet status
  - paid-gate evaluation status
  - long-course pending count
  - current source grade by lane
  - next watch action
- The scheduler can select across all approved creators, not only already-graded sources.
- Ungraded creators get a limited exploratory baseline so they can be graded.
- C/D sources are not deeply watched after baseline unless Steve explicitly overrides or they are valuable in a non-Dev lane.
- Director output for major build promotion waits for source comparison across the baseline set.
- Video-only catch-up cannot pass as God Mode completion.

## Definition Of Done

- Add or update the coverage report used by Dev Hub/source leaderboard.
- Add scheduler logic for ungraded-source sampling and all-creator baseline catch-up.
- Add the YouTube SOP runner/read model fields for page extraction, resource-link packet status, free-resource capture, free-community packets, paid-gate evaluations, and autopilot disposition.
- Add a proof that all approved creators are represented or have a clear blocked reason.
- Add a proof that Scoper/build promotion can see whether source baseline is incomplete.
- Add a proof that video-only completion fails.

## Not Next

- Do not run every historical video for every creator by default.
- Do not watch C/D sources deeply after the baseline without override.
- Do not use transcript-only results as catch-up completion.
- Do not use video-only results as God Mode completion.
- Do not treat this as permission to crawl Skool, MyICOR, private communities, paid courses, operator-excluded comments, or external resources without the required source packet.
