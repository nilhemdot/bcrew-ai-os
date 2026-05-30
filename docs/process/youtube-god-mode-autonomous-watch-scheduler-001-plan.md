# YOUTUBE-GOD-MODE-AUTONOMOUS-WATCH-SCHEDULER-001 Plan

Status: Closed under `youtube-god-mode-autonomous-watch-scheduler-v1`

Last updated: 2026-05-26

## What

Build the autonomous scheduler for the public YouTube God Mode full-watch lane.

Plain English: the system should keep watching approved public YouTube sources without Steve or Codex babysitting each batch. It should decide what is safe and valuable to watch next, respect budget caps, run the existing guarded full-watch runner, refresh the Director/source rankings, and leave Steve a morning report.

## Why

Steve is right: the point of building the system is not for a human to manually trigger every watch batch forever.

The system has two layers:

- `youtube-creator-daily-watch` is scheduled. It checks public creator channels and refreshes metadata.
- `youtube-god-mode-autonomous-watch-scheduler` is the scheduled live-bounded layer. It spends Gemini API money only inside explicit caps and calls the guarded full-watch runner for approved public/no-auth YouTube videos.

Steve approved the public YouTube live-bounded watcher operating posture on 2026-05-26. The job is allowed to run daily after metadata refresh without Codex babysitting normal batches.

## Acceptance Criteria

- The scheduler runs only approved public/no-auth YouTube videos.
- The scheduler uses the existing daily watch pool and source-value grader.
- The scheduler prioritizes:
  - catch-up batches for S/A sources until each approved source has enough baseline coverage
  - new videos from S/A sources after baseline catch-up
  - limited B-source sampling when source comparison needs more proof
  - limited ungraded-source sampling when the run has safe remaining capacity, so new approved creators can earn an evidence-based grade
- The scheduler refuses C/D sources unless Steve explicitly overrides.
- The scheduler enforces hard controls:
  - max videos per run
  - max Gemini spend per run
  - max Gemini spend per day
  - max runtime
  - retry limit
  - duplicate-video prevention
  - long-course routing out of the standard lane
  - no private/paid/auth/comment/community/course crawling
- The scheduler stops and reports, not guesses, when:
  - approval-required links need Steve
  - source route is missing
  - provider/API fails repeatedly
  - budget is exhausted
  - a selected video is too long for the standard lane
- After each successful run, it automatically refreshes:
  - Dev Intelligence Director
  - Build Intel Source Value Grader
  - Dev Hub read model/API summary
- The morning report shows:
  - videos watched
  - sources/creators covered
  - cost and cost per idea
  - new top build recommendations
  - new approval-required links
  - failures/blockers
  - what will run next
- The scheduler remains internal/report-only for downstream decisions. It does not auto-create backlog cards or approve builds.

## Definition Of Done

Done means all of this is true and command-proven:

- `lib/youtube-god-mode-autonomous-watch-scheduler.js` builds a run plan from live Foundation truth and exported pure functions.
- `scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs` proves synthetic selection, budget, duplicate, long-course, retry, approval, and no-write behavior.
- `package.json` exposes `process:youtube-god-mode-autonomous-watch-scheduler-check`.
- `lib/foundation-jobs.js` includes a scheduled live-bounded scheduler job row with explicit schedule, owner, run/day budget labels, and hub visibility.
- `lib/foundation-job-mutation-allowlist.js` explicitly allowlists the scheduled operational write posture for public YouTube full-watch only.
- Dry-run mode selects the next videos without Gemini calls.
- Live-bounded mode refuses to run unless explicit approved budget config is present.
- The scheduler invokes the existing `process:youtube-latest-20-full-watch-runner-check -- --apply --live-gemini-api` path instead of duplicating or bypassing runner logic.
- Director/source-grader/Dev Hub refresh only runs after a successful full-watch runner result.
- Failure output writes an internal morning report/summary and stops; it does not loop blindly.
- The focused proof confirms `reportOnly=true`, no backlog writes, no source-system writes, no external writes, no credential mutation, and no auto-approval.
- `node --check`, focused scheduler proof, selector proof, read-only runner proof, Director proof, source-grader proof, Dev Hub proof, and job mutation allowlist proof pass before the scheduled live-bounded row is trusted.

## Details

Existing code/docs to reuse:

- `lib/foundation-jobs.js`
- `lib/youtube-latest-20-intel-run.js`
- `lib/youtube-latest-20-full-watch-runner.js`
- `lib/build-intel-source-value-grader.js`
- `lib/dev-team-intelligence-director.js`
- `lib/dev-team-hub.js`
- `scripts/process-youtube-latest-20-intel-run-check.mjs`
- `scripts/process-youtube-latest-20-full-watch-runner-check.mjs`
- `scripts/process-build-intel-source-value-grader-check.mjs`
- `scripts/process-dev-team-intelligence-director-check.mjs`
- Foundation job ledger/runtime status for scheduled run visibility
- live intelligence report artifacts for already-watched duplicate prevention
- live `llm_calls` usage rows for spend/cost tracking
- live backlog/current sprint truth for card status, ownership, approval posture, and closeout
- existing Foundation report/atom/hit persistence only for internal morning-report artifacts
- `docs/process/youtube-latest-20-intel-run-001-plan.md`
- `docs/process/youtube-latest-20-full-watch-runner-001-plan.md`
- `docs/process/extractor-overnight-run-guard-001-plan.md`
- `docs/process/build-intel-source-value-grader-001-plan.md`

Suggested operating modes:

- `dry-run`: builds the next watch plan and reports it; no Gemini calls.
- `live-bounded`: runs one guarded batch within approved caps.
- `catch-up`: bounded sequence for approved S/A baseline coverage.
- `steady-state`: watches new releases from S/A sources after catch-up.

Correct steady-state flow:

`daily metadata watch -> source/value ranking -> scheduler selects safe next videos -> guarded full-watch runner -> immediate deep visual handoff for screen/code/UI hot spots -> Director refresh -> source grader refresh -> Dev Hub/morning report`

This is not the Scoper. This scheduler only decides what to watch next and keeps the intelligence pool fresh. Scoper still turns a build recommendation into a scoped backlog-ready card.

Behavior proof must call real function paths, not source markers:

- build a synthetic current pool with S/A/B/C/D creators and prove selection order
- build a synthetic duplicate-watch ledger and prove already-watched videos are skipped
- build a synthetic spend ledger and prove run/day budget exhaustion stops the run
- build a synthetic long-course row and prove it routes out of the standard lane
- build a synthetic provider failure sequence and prove retry cap then stop/report
- run the scheduler dry-run against live repo/local Foundation truth without Gemini calls
- prove live mode refuses to run without explicit budget config and approval posture
- prove the runner command is the existing full-watch runner command, not a bypass path
- prove future live batches can immediately hand just-watched videos to the deep visual review lane before Director/source-grader refresh
- prove post-run Director/source-grader refresh only happens after a successful runner result

Gate decision tree:

- Static gate: `node --check` for the scheduler module and focused proof script.
- Focused gate: `npm run process:youtube-god-mode-autonomous-watch-scheduler-check -- --json`.
- Regression gates: dry-run latest-20 selector, read-only full-watch runner proof, source grader proof, Director proof, and Dev Hub proof.
- Full gate: run the focused scheduler proof and Foundation job mutation allowlist proof before trusting the scheduled live-bounded row, because this touches Foundation job scheduling, extraction runtime, provider spend, source safety, and morning operator reporting.

Reason: this is high-impact automation with spend and source-boundary risk. Static-only proof is not enough, but the default focused gate must stay fast by proving dry-run/synthetic behavior without Gemini calls.

Operator value:

- Steve no longer has to ask Codex to babysit public YouTube catch-up batches.
- Steve can see what ran, what it cost, what changed in recommendations, what needs approval, and what runs next.
- The system keeps S/A sources fresh automatically while throttling lower-value sources.
- Manual intervention only happens for approvals, failures, budgets, or source-boundary decisions.

Speed boundary:

- Default scheduler proof must not call Gemini and should stay under 2 minutes.
- Live-bounded run mode can take longer, but it is capped by max videos, max runtime, retry cap, and spend budget.
- Catch-up mode must run as repeated bounded batches, not one unbounded giant job.

## Risks

- Risk: automated watching spends too much.
  - Repair path: hard daily/run budgets and stop-on-budget-exhausted behavior.
- Risk: scheduler follows unsafe links or logged-in sources.
  - Repair path: public YouTube only for V1; approval links remain queued for Steve/source-specific follow-up.
- Risk: scheduler loops forever after provider failures.
  - Repair path: retry cap, failure ledger, and stop/report behavior.
- Risk: lower-value creators consume the budget.
  - Repair path: source grades control priority; C/D sources are throttled by default, and ungraded sources have a small exploratory cap.
- Risk: automation hides bad output quality.
  - Repair path: morning report includes quality/cost/source-grade changes and Director movement.

## Tests

```bash
node --check lib/youtube-latest-20-intel-run.js lib/youtube-latest-20-full-watch-runner.js lib/build-intel-source-value-grader.js lib/dev-team-intelligence-director.js
npm run process:youtube-latest-20-intel-run-check -- --json --batch-size=9
npm run process:youtube-latest-20-full-watch-runner-check -- --json --batch-size=9
npm run process:build-intel-source-value-grader-check -- --json
npm run process:dev-team-intelligence-director-check -- --json
```

Add a future focused command when this card is implemented:

```bash
npm run process:youtube-god-mode-autonomous-watch-scheduler-check -- --json
```

## Not Next

- Do not crawl Skool, MyICOR, paid communities, logged-in courses, comments, or private sources in this card.
- Do not auto-approve links.
- Do not auto-create backlog or sprint cards from video output.
- Do not bypass the existing guarded full-watch runner.
- Do not run unbounded long courses in the standard lane.
- Do not remove budget caps, retry caps, source boundaries, or kill-switch posture after live-bounded proofs are green.

Closeout proof lives in `docs/_archive/handoffs/2026-05-26-youtube-god-mode-autonomous-watch-scheduler-v1-closeout.md`. V1 is approval/budget-gated: dry-run is safe by default, and the scheduled row now runs live-bounded public YouTube batches after Steve approved the operating posture on 2026-05-26.
