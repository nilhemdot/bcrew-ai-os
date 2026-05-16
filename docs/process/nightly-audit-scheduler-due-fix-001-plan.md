# NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001 Plan

Card: `NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001`
Sprint: `foundation-audit-reliability-2026-05-16`
Closeout key: `nightly-audit-scheduler-due-fix-v1`

## What

Fix the scheduled local-time job runtime so the first run of `nightly-deep-audit` cannot be skipped forever when the worker checks after the configured `03:00 America/Toronto` window and no prior successful run exists.

V1 changes only the scheduler due calculation and its proof surface. It does not change the audit contents, connector behavior, hub UI, or any provider spend path.

## Why

The current green gate proves the nightly auditor is registered and shaped correctly, but it does not prove the job actually fires. A scheduled job with no latest run can currently roll `nextRunAt` to tomorrow when checked after 03:00, then repeat the same miss the next day. That makes the auditor theater even though the registration checks are green.

Operator value: Steve can trust that "nightly audit scheduled" means "missed scheduled runs become due and visible," not merely "a job definition exists." The useful real workflow is a morning review where Steve sees an actual audit run or a clear missed-run failure, improving speed and quality without him manually checking files.

## Acceptance Criteria

- `getFoundationJobRuntime()` treats an enabled scheduled local-time job with no valid latest run as due when `now` is after today's scheduled local time.
- Before the first scheduled local time, the same job is not due and points at today's schedule.
- After a successful latest run, the next run points to the next local scheduled day.
- Running or queued latest runs still report `running` and do not launch duplicate work.
- A focused dogfood proof recreates the old failure: no latest run, worker checks at 03:01 local, old behavior would schedule tomorrow, new behavior is due now.
- `nightly-deep-audit` keeps `runtimeMode: scheduled`, `mutationPosture: report_only`, and the schedule mutation guard stays healthy.
- Verifier coverage names the scheduler dogfood so future greens fail if this regression returns.

## Definition Of Done

- `NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001` closes under `nightly-audit-scheduler-due-fix-v1`.
- This plan and `docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json` validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-nightly-audit-scheduler-due-fix-check.mjs` passes and proves the no-latest 03:01 local dogfood failure is blocked.
- `foundation:verify` and the full Foundation ship gate pass before push.

## Details

Root cause / root invariant: a scheduled reviewer is healthy only when the actual function path and job ledger prove it can become due and run. A configured job definition is not enough.

Existing code to reuse:

- `lib/foundation-jobs.js` for job definitions, schedule posture, local-time helpers, and `getFoundationJobRuntime()`.
- `lib/foundation-runtime-job-store.js` for runtime snapshots that consume `getFoundationJobRuntime()`.
- `lib/nightly-deep-audit-constants.js` for job key and schedule constants.
- existing schedule mutation guard code in `lib/foundation-job-mutation-allowlist.js`.

Existing docs and live truth to reuse:

- `docs/process/nightly-deep-audit-upgrade-001-plan.md`,
- `docs/handoffs/nightly-deep-audit-2026-05-14.md`,
- current live backlog and Current Sprint DB truth,
- AGENTS Foundation rebuild discipline on dogfood proof and no false-green checks.

Existing scripts to reuse:

- `npm run process:nightly-deep-audit-upgrade-check -- --json`,
- `npm run foundation:verify -- --json-summary`,
- `npm run process:foundation-ship`.

Large-file split/extraction plan: this card touches `scripts/foundation-verify.mjs`, already over the 5,000-line architecture-risk threshold. The verifier touch must be a thin wrapper/delegation only; no new responsibility is added to the monolith. New scheduler behavior and dogfood proof stay outside the monolith in `lib/foundation-jobs.js` and the focused proof script.

Gate decision tree: static syntax checks first, focused scheduler dogfood second through `npm run process:nightly-audit-scheduler-due-fix-check -- --json`, `foundation:verify` third, and full `process:foundation-ship` before push because the blast radius touches runtime scheduling, Foundation jobs, package scripts, and verifier trust.

Focused proof is fast, targeted under 2 minutes, read-only by default, and calls the actual function path `getFoundationJobRuntime()` with synthetic fixtures. It has no live-state mutation, no report write, no backlog write, no sprint write, and no `--apply` path.

## Risks

- Risk: first-run due logic launches duplicate jobs.
  - Response: running/queued latest run status remains a hard no-duplicate guard, and latest successful runs still schedule the next day.
- Risk: timezone handling drifts around DST.
  - Response: reuse the existing local-time conversion helpers and test local scheduled times through fixed UTC examples.
- Risk: proof becomes substring theater.
  - Response: focused proof calls `getFoundationJobRuntime()` with synthetic no-latest and latest-run fixtures and asserts due/nextRun behavior.
- Risk: the scheduler fix hides the broader freshness problem.
  - Response: `NIGHTLY-AUDIT-RUN-PROOF-001` follows with a freshness verifier that checks actual latest successful runs after the schedule window.

Rollback path: revert the scheduler helper change and leave the card open if focused dogfood fails. Do not weaken the schedule guard or mark the job manual to make tests pass.

## Tests

```bash
node --check lib/foundation-jobs.js scripts/process-nightly-audit-scheduler-due-fix-check.mjs scripts/foundation-verify.mjs
npm run process:nightly-audit-scheduler-due-fix-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json --closeoutKey=nightly-audit-scheduler-due-fix-v1 --commitRef=HEAD
```

Dogfood proof recreates the exact audit failure mode: no latest run, post-03:00 worker check, and old tomorrow-rollover behavior. The new proof must fail closed if that path is not due now, and it rejects substring-only proof.

## Not Next

- Do not rewrite the nightly audit.
- Do not add LLM provider spend.
- Do not build Build Intel extraction.
- Do not build hub features, Marketing Video Lab wiring, or Canva asset mutation.
- Do not change connector sync behavior.
- Do not mutate backlog or sprint state from focused proof scripts.
