# YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001 Plan

## What

Catch up the approved public YouTube creator list through the highest available God Mode lane before major Dev build promotion.

Plain English: do not let the roadmap be shaped by the first creators we happened to extract. Get the approved creator list caught up, compare them side by side, then decide which ideas are strongest.

## Why

Steve's rule is correct: if 30+ creators are on the watch list, extracting only a subset can bias the Director. Similar ideas across creators may merge into a stronger build, or one creator may explain a better implementation path than another.

## Catch-Up Depth

V1 baseline:

- Every approved public creator gets at least latest 10 relevant public videos through the best available video/audio/visual lane.
- S/A sources get deeper baseline, up to latest 50 relevant public videos where useful.
- Mark and ICOR remain priority deep baselines.
- New releases from watched creators continue after catch-up; this is not "latest 10 and done."
- Long-course videos route to the long-course lane instead of failing the standard lane.
- Videos already watched under video/audio/visual full-watch are valuable, but they are tagged as not fully source-appropriate God Mode until comments/approved resource follow-up/hands status is resolved.

## Acceptance Criteria

- The watchlist coverage report shows every approved public creator:
  - channel URL
  - tracked metadata count
  - video/audio/visual watched count
  - comments status
  - approved resource-follow status
  - long-course pending count
  - current source grade by lane
  - next watch action
- The scheduler can select across all approved creators, not only already-graded sources.
- Ungraded creators get a limited exploratory baseline so they can be graded.
- C/D sources are not deeply watched after baseline unless Steve explicitly overrides or they are valuable in a non-Dev lane.
- Director output for major build promotion waits for source comparison across the baseline set.

## Definition Of Done

- Add or update the coverage report used by Dev Hub/source leaderboard.
- Add scheduler logic for ungraded-source sampling and all-creator baseline catch-up.
- Add a proof that all approved creators are represented or have a clear blocked reason.
- Add a proof that Scoper/build promotion can see whether source baseline is incomplete.

## Not Next

- Do not run every historical video for every creator by default.
- Do not watch C/D sources deeply after the baseline without override.
- Do not use transcript-only results as catch-up completion.
- Do not treat this as permission to crawl Skool, MyICOR, private communities, paid courses, comments, or external resources without the required source packet.
