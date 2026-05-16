# RUNTIME-WORKER-001 Plan

## What

Ship a narrow Foundation worker reliability slice for `RUNTIME-WORKER-001`. Keep the existing `npm run foundation:worker` runner, job registry, LaunchAgent supervision, active-run lock, pause/resume controls, and stale-run reapers. Add the missing worker reliability surface that makes scheduled jobs boring to leave running: dry-run argument safety, retry/failure visibility, blocked-schedule visibility, stale active-run alerts, and a focused proof that the failure modes are caught.

This is not a scheduler rewrite. It does not add new jobs, source extraction, hub features, Canva behavior, Marketing Video Lab wiring, Build Intel extraction, autonomous agent behavior, or auto-restart-on-push.

## Why

Foundation cannot depend on Steve watching terminals. The worker already exists, but the card is still open because the operator cannot yet see one clear answer to: which scheduled jobs are due, which failures will retry, which jobs are blocked by mutation posture, which active runs are stale, and whether a dry-run command is truly dry.

There is also a concrete safety leak in the current sprint proof command: the sprint row names `--dry-run`, while `scripts/foundation-worker.mjs` only checks `dryRun`. A typo or kebab-case flag should never turn a proof into a real scheduled job pass. This card fixes that boundary and proves it.

The operator value is simple: Runtime Health should show whether the background worker lane is safe to leave alone overnight, and the proof command should not accidentally run work when it says dry run.

Useful operator behavior this unlocks:

- Steve can open Runtime Health in the morning and immediately see whether the worker lane is healthy, retrying, blocked, stale, or needs attention.
- A failed scheduled job is no longer hidden as old history; it appears as a retry/failure state with the next operator action.
- A scheduled job blocked by mutation posture is not confused with "nothing due"; it is reported as blocked with the schedule guard reason.
- A stale active run is visible before it silently prevents the next scheduled cycle.
- A proof command that says dry-run is dry-run even if an operator or sprint row uses kebab-case `--dry-run`.

## Acceptance Criteria

- `scripts/foundation-worker.mjs` accepts both `--dryRun` and `--dry-run`, and the focused dogfood proof proves kebab-case dry-run cannot run real jobs.
- `npm run foundation:worker -- --once --dry-run` does not overwrite the long-running `foundation-worker` runtime status row with the one-shot dry-run process pid.
- Foundation job snapshots expose a `workerReliability` section with scheduled/due counts, failed latest runs, retry-candidate jobs, blocked scheduled jobs, stale active runs, and a plain-English status.
- `/api/foundation/jobs` and full Runtime Health payloads include the worker reliability snapshot without expanding the default `/api/foundation-hub` summary payload past budget.
- Runtime Health renders the worker reliability status inside the existing Foundation Jobs panel.
- Dogfood proof recreates the dangerous cases: dry-run flag mismatch, failed due job needing retry visibility, blocked scheduled job, and stale active run.
- Focused proof is read-only: it checks parser/dogfood/API/rendering/Plan Critic/Current Sprint behavior without mutating backlog, sprint, jobs, source systems, or external services.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/foundation-worker-reliability.js` owns worker reliability constants, argument parsing, snapshot validation, and synthetic dogfood proof.
- `scripts/foundation-worker.mjs` reuses the shared parser and keeps existing worker behavior unchanged except for safe `--dry-run` alias support.
- `lib/foundation-runtime-job-store.js` attaches `workerReliability` to the job snapshot using existing job definitions and latest run data.
- `lib/foundation-hub-summary-payload.js` preserves a compact `workerReliability` summary in compact Foundation job payloads.
- `public/foundation-runtime-renderers.js` renders the worker reliability summary without creating a new page or hub feature.
- `scripts/process-runtime-worker-check.mjs` passes against the live dashboard and proves this card’s failure modes.
- `lib/foundation-runtime-reliability-verifier.js` covers `RUNTIME-WORKER-001` so future `foundation:verify` checks the card did not regress.
- Backlog, Current Sprint, current plan/state docs, Recent Builds closeout, and ship proof agree.

## Details

Reuse existing work:

- `scripts/foundation-worker.mjs` already selects due jobs, reaps stale active work, captures worker runtime metadata, supports `--once`, `--job`, `--maxJobs`, and dry-run mode.
- `scripts/run-foundation-job.mjs` already owns job execution, active-run locking, timeouts, process-group cleanup, and finish semantics.
- `lib/foundation-runtime-job-store.js` already builds the job snapshot with jobs, latest runs, due state, schedule posture, and latest-run status.
- `lib/foundation-jobs.js` already computes schedule status, due/next-run state, mutation posture, and scheduled mutation guards.
- `public/foundation-runtime-renderers.js` already renders Foundation Jobs and Runtime Process Control.
- `RUNTIME-SUPERVISOR-001` already proves the worker LaunchAgent and served commit are visible; this card does not repeat that work.

Implementation shape:

- Add `parseFoundationWorkerArgs(argv)` and `buildFoundationWorkerReliabilityDogfoodProof()` in a new small module. The parser must normalize `--dry-run` to `dryRun` and preserve existing `--dryRun` behavior.
- Add `buildFoundationWorkerReliabilitySnapshot({ jobs, latestRuns, generatedAt })` to compute status from existing data only. It should not query, write, schedule, retry, or start jobs.
- Attach the snapshot in `getFoundationJobRunSnapshot`.
- Compact the snapshot in `compactFoundationJobRunSnapshot`.
- Render one worker reliability card at the top of `renderFoundationJobsPanel`.
- Add `process:runtime-worker-check` as the focused proof.
- Gate decision: static syntax checks, focused runtime-worker proof, then full `process:foundation-ship` because this touches the worker, job snapshots, Runtime Health UI, package scripts, and verifier coverage.
- Speed budget: keep this fast and proportional. The focused proof must complete in under 20 seconds on the local Mac Mini. `/api/foundation/jobs` must respond under 2 seconds, and the default `/api/foundation-hub` summary route must stay under 2 seconds and 800 KB. The worker reliability snapshot is computed from already-loaded job rows and must not introduce a new DB query loop, external API call, subprocess, or LLM call.

## Risks

- **Dry-run safety risk:** A misspelled dry-run flag can run real jobs or poison runtime truth with a one-shot proof pid. Dogfood must prove `--dry-run` and `--dryRun` both resolve to dry-run mode, and the live dry-run command must not overwrite the LaunchAgent worker status row.
- **False green risk:** A failed latest run can be hidden in job rows. Worker reliability must count failed latest runs and retry candidates from actual job snapshot data.
- **Blocked-schedule risk:** Scheduled jobs blocked by mutation posture can look like “no due jobs.” Worker reliability must surface blocked scheduled jobs separately.
- **Stale active-run risk:** Active runs older than their max runtime can block retries. Worker reliability must flag stale active runs using job runtime budget.
- **Payload risk:** Do not re-expand the default Foundation Hub payload after recent performance work. Keep the default payload compact and prove route budget in ship gate.
- **Worker mutation risk:** The focused proof script stays read-only. If live dry-run worker execution is needed, run it as an explicit proof command outside the proof script and keep it dry-run only.
- **Rollback path:** If the worker reliability snapshot causes API/render instability, revert the snapshot attachment and renderer while keeping the parser fix and dogfood proof as a smaller safety card.

## Tests

```sh
node --check lib/foundation-worker-reliability.js scripts/foundation-worker.mjs lib/foundation-runtime-job-store.js lib/foundation-hub-summary-payload.js public/foundation-runtime-renderers.js lib/foundation-runtime-reliability-verifier.js scripts/process-runtime-worker-check.mjs
npm run process:runtime-worker-check -- --json
npm run foundation:worker -- --once --dry-run --maxJobs=1
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=RUNTIME-WORKER-001 --planApprovalRef=docs/process/approvals/RUNTIME-WORKER-001.json --closeoutKey=runtime-worker-reliability-v1 --commitRef=HEAD
```

Not next: no new scheduler framework, no new scheduled jobs, no hub feature work, no Marketing Video Lab wiring, no Canva asset-library behavior, no paid-source auth, no source extraction, no Build Intel extraction, no autonomous live agent actions, no auto-restart-on-push install, no Meeting Vault Phase B, and no Drive permission mutation.
