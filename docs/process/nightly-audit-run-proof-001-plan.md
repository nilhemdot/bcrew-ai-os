# NIGHTLY-AUDIT-RUN-PROOF-001 Plan

Card: `NIGHTLY-AUDIT-RUN-PROOF-001`
Sprint: `foundation-audit-reliability-2026-05-16`
Closeout key: `nightly-audit-run-proof-v1`

## What

Add a run-freshness proof so Foundation verification can tell the difference between a configured nightly auditor and a nightly auditor that actually ran after its scheduled window.

## Why

The current false-green gap happened because the verifier checked registration, command shape, and report format but not latest successful scheduled execution. A job can be configured, scheduled, and still operationally dead.

Operator value: Steve gets a visible failure when an important scheduled Foundation reviewer misses its run, instead of discovering it manually days later. The useful real workflow is a morning check where the system itself says whether the code reviewer actually ran, improving speed and quality.

## Acceptance Criteria

- A focused verifier/helper can evaluate `nightly-deep-audit` run freshness from job definition, current time, and latest job-run snapshot.
- After the configured 03:00 local schedule window, no latest successful run for the current schedule day is a failure.
- Before the schedule window, missing current-day run is not a failure.
- A failed/latest non-successful run after the window is a failure with plain-English detail.
- A successful latest run after the window passes.
- The proof is read-only and does not attempt to repair job state or write fake run rows.
- `foundation:verify` includes the freshness proof and fails closed if the proof is absent.

## Definition Of Done

- `NIGHTLY-AUDIT-RUN-PROOF-001` closes under `nightly-audit-run-proof-v1`.
- This plan and `docs/process/approvals/NIGHTLY-AUDIT-RUN-PROOF-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- Focused proof rejects missing/stale/failed latest runs and accepts a fresh successful run.
- `foundation:verify` and full Foundation ship gate pass before push.

## Details

Root cause / root invariant: a green auditor must prove actual successful execution after the schedule window. Registration and report-shape checks are necessary but not sufficient.

Existing code to reuse:

- `lib/foundation-runtime-job-store.js` for latest run snapshots.
- `lib/foundation-jobs.js` for schedule definition and runtime semantics.
- `lib/nightly-deep-audit-constants.js` for job identity.
- Existing verifier modules for focused, read-only checks.

Existing docs to reuse:

- `docs/process/nightly-deep-audit-upgrade-001-plan.md`,
- `docs/process/nightly-audit-scheduler-due-fix-001-plan.md`,
- the fresh backfill report from `NIGHTLY-DEEP-AUDIT-BACKFILL-001`.

Existing scripts to reuse:

- `npm run process:nightly-audit-scheduler-due-fix-check -- --json`,
- `npm run foundation:verify -- --json-summary`,
- `npm run process:foundation-ship`.

Gate decision tree: static syntax checks first, focused proof for run-freshness fixtures through `npm run process:nightly-audit-run-proof-check -- --json`, then `foundation:verify`, then full ship gate because the blast radius changes what a green Foundation verifier means.

Large-file split/extraction plan: this card may touch `scripts/foundation-verify.mjs`, already over the 5,000-line architecture-risk threshold. The verifier touch must be a thin wrapper/delegation only; no new responsibility is added to the monolith. New run-freshness logic lives in a focused module or existing audit verifier module.

Focused proof is fast, targeted under 2 minutes, read-only by default, and calls actual function paths with synthetic successful, missing, stale, and failed run fixtures. It has no live-state mutation, no fake job-run insert, no backlog write, no sprint write, and no `--apply` path.

Repair path: if run-freshness proof is too strict or too loose, keep the card open, revise the helper fixtures, and rerun focused proof before `foundation:verify`. Do not add an escape hatch that makes stale scheduled jobs green.

## Risks

- Risk: strict freshness check blocks local development before 03:00.
  - Response: proof uses schedule-window semantics; before the window it reports pending, not failed.
- Risk: a long build session prevents the scheduler from running and causes a legitimate failure.
  - Response: that is the point; missed critical scheduled reviews must be visible. Backfill can repair the run evidence after the miss is acknowledged.
- Risk: proof writes fake run records.
  - Response: focused proof uses synthetic fixtures in memory and the live verifier reads only job snapshots.

## Tests

```bash
node --check lib/foundation-jobs.js lib/foundation-intelligence-audit-verifier.js scripts/process-nightly-audit-run-proof-check.mjs scripts/foundation-verify.mjs
npm run process:nightly-audit-run-proof-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=NIGHTLY-AUDIT-RUN-PROOF-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-RUN-PROOF-001.json --closeoutKey=nightly-audit-run-proof-v1 --commitRef=HEAD
```

Dogfood proof recreates the exact miss: job is scheduled and green by definition, but no successful run exists after the schedule window. That must fail until a real run is recorded, and the proof rejects substring-only checks.

## Not Next

- Do not auto-run or auto-repair from the verifier.
- Do not change audit content or LLM provider behavior.
- Do not touch hub features, Canva asset writes, paid-source auth, or source extraction.
