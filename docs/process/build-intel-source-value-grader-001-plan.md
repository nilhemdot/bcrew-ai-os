# BUILD-INTEL-SOURCE-VALUE-GRADER-001 Plan

## What

Build a source-value grading layer for Build Intel sources.

Plain English: the system should not keep watching every creator forever just because they are on the list. After enough full-watch evidence exists, it should grade each creator/source by the value they actually produce and use that grade to prioritize future extraction.

## Why

Steve wants the system to compare creators side-by-side before major build promotion. Mark or ICOR should not dominate the roadmap only because they were extracted first. If another creator produces stronger AIOS ideas, realtor-training lessons, or marketing leverage, that source should rank higher.

The watch budget should concentrate on the best sources:

- S and A sources get watched heavily.
- B sources get selective watch.
- C and D sources are throttled or stopped unless a new high-signal item appears.

## Acceptance Criteria

- Reads existing full-watch reports, Director candidates, atoms, evidence hits, approval-required links, and Scoper/Portfolio promotion status where available.
- Grades creators/source targets S/A/B/C/D from actual extracted value, not manual vibes or UI decoration.
- Supports lane-specific grades:
  - AIOS/dev build value
  - realtor AI coaching/training value
  - marketing/content value
  - operations/process value
  - leadership/business strategy value
- Explains each grade in plain English with evidence:
  - useful build candidates
  - repeated actionable ideas
  - source-backed resource/code links
  - visual/audio evidence quality
  - relevance to the target lane
  - Director/Scoper/Portfolio promotion rate
  - noise/rejection rate
- Produces a watch-priority recommendation for each source:
  - watch_heavily
  - watch_selectively
  - sample_only
  - pause_until_new_signal
- Does not delete watchlist rows, mutate external systems, or silently stop sources without a reviewable report.

## Definition Of Done

- Add a deterministic source-value grading module and proof script.
- Dogfood proves:
  - a creator with repeated high-ranked, evidence-backed candidates grades above a noisy creator
  - a creator can grade S in realtor coaching but B/C in AIOS build
  - early extraction volume alone does not force an S grade
  - C/D sources are recommended for throttling, not silently removed
- Report becomes Director-readable and Dev page-ready.
- No automatic backlog, sprint, source deletion, or external writes.

## Not Next

- Do not build from the graded recommendations yet.
- Do not connect Skool, MyICOR paid training, private communities, comments, or auth-required sources from this card.
- Do not auto-delete or permanently blacklist creators.
- Do not hide low grades; make the reason reviewable.

## Tests

- `node --check lib/build-intel-source-value-grader.js`
- `node --check scripts/process-build-intel-source-value-grader-check.mjs`
- `npm run process:build-intel-source-value-grader-check -- --json`
