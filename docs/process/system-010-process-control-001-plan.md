# SYSTEM-010 Process Control Plan

## What

Close top-level `SYSTEM-010` by proving the runtime/process-control surface that already shipped under `SYSTEM-010-GHOST-CLOSEOUT-001`.

This is not a rewrite. It is a reconciliation card: the lower-level ghost closeout already added active-process visibility, stop/decommission guardrails, process-owner metadata, stale-run liveness, restart visibility, and operator-safe controls. This card makes the live backlog and Current Sprint truth agree with that shipped Foundation capability.

## Why

Steve approved unattended Foundation work, but the system must be able to keep going without losing control of workers, jobs, or long-running processes. A blocked action should not stop the whole sprint. At the same time, unsafe process actions must fail closed.

`SYSTEM-010` is the Foundation gate that proves both rules:

- running work is visible,
- unsafe stop/decommission actions fail closed,
- decommission requires explicit confirmation,
- paused/decommissioned runtime modes are enforced,
- stale/orphan runtime state is visible,
- restart/service ownership is visible,
- Current Sprint can move to source-contract work after the process-control layer is accepted.

## Acceptance Criteria

- `SYSTEM-010-GHOST-CLOSEOUT-001` remains shipped and accepted with closeout key `system-010-ghost-closeout-v1`.
- `process:system-010-ghost-closeout-check` still passes.
- `lib/system-010-process-control.js` provides a reusable top-level evaluator and dogfood proof.
- Dogfood proves:
  - decommissioned jobs cannot run even with force,
  - paused jobs require explicit force recovery,
  - unowned PID stop fails closed,
  - stale served-code stop fails closed,
  - decommission requires exact confirmation,
  - decommission blocks active runs,
  - active-process snapshot exposes stale and cost/process risk.
- `SYS-RUNTIME-CONTROL-001` no longer says kill/decommission controls still need `SYSTEM-010` closeout.
- The earlier P0 reality gate remains healthy after legitimate progression beyond `SYSTEM-010`.
- Verifier follow-up/recent-build assumptions accept `SYSTEM-010` as closed instead of requiring it to stay scoped forever.
- `SYSTEM-010` closes in live backlog and Current Sprint.
- `SOURCE-012` becomes the next active blocker and is promoted for this sprint before extraction work.

## Definition Of Done

- `process:system-010-check` passes with `--apply --close-card --json`.
- `process:system-010-ghost-closeout-check` remains green.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `system-010-process-control-v1`.
- Main is clean and pushed.

## Details

The card accepts the already-shipped runtime control surface instead of rebuilding it.

Existing shipped controls include:

- `GET /api/foundation/active-processes`
- `POST /api/foundation/job-runs/:runId/stop`
- `POST /api/foundation/jobs/:jobKey/decommission`
- runtime mode `decommissioned`
- runner/worker process-owner metadata
- stop decisions that reject unsafe PID ownership or stale served code
- decommission decisions that require exact confirmation and no active run
- Runtime Health controls for stop/decommission
- runtime supervisor visibility for dashboard and Foundation worker

This card adds top-level proof and sprint truth only. It does not add new external actions, new source access, credential mutation, Drive permission mutation, or provider calls.

## Reuse Existing Work

Reuse existing code:

- `lib/runtime-process-control.js`
- `lib/foundation-runtime-read-routes.js`
- `scripts/process-system-010-ghost-closeout-check.mjs`
- `scripts/process-foundation-backlog-p0-reality-cleanup-check.mjs`
- `lib/foundation-recent-builds-verifier.js`
- `lib/foundation-verifier-followup-backlog-assurance.js`
- `scripts/run-foundation-job.mjs`
- `scripts/foundation-worker.mjs`
- `public/foundation.js`

Reuse existing docs:

- `docs/process/system-010-ghost-closeout-001-plan.md`
- `docs/process/system-010-ghost-closeout.md`
- `docs/process/runtime-supervisor-001-plan.md`

Reuse existing gates:

- `process:system-010-ghost-closeout-check`
- `process:foundation-backlog-p0-reality-cleanup-check`
- Recent Builds and follow-up backlog assurance verifier modules
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `foundation:verify`
- `process:foundation-ship`

## Behavioral Proof

The focused proof is behavior-based. It uses the runtime control functions directly and runs the shipped ghost closeout proof. It also checks live backlog/current sprint state and source-contract wording.

Dogfood cases prove failures, not just strings:

- hidden unsafe PID stop is rejected,
- stale served code rejects stop,
- decommissioned jobs reject force runs,
- bad decommission confirmation fails,
- active-run decommission fails,
- active-process snapshot exposes risk instead of hiding it.

## Tests

- `node --check lib/system-010-process-control.js scripts/process-system-010-check.mjs`
- `npm run process:system-010-check -- --apply --close-card --json`
- `npm run process:system-010-ghost-closeout-check -- --json`
- `npm run process:foundation-backlog-p0-reality-cleanup-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SYSTEM-010 --planApprovalRef=docs/process/approvals/SYSTEM-010.json --closeoutKey=system-010-process-control-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SYSTEM-010 --closeoutKey=system-010-process-control-v1`
- `npm run process:foundation-ship -- --card=SYSTEM-010 --planApprovalRef=docs/process/approvals/SYSTEM-010.json --closeoutKey=system-010-process-control-v1 --commitRef=HEAD`

Gate decision tree: static checks alone are not enough because this touches live backlog truth and Current Sprint; focused proof is `process:system-010-check` plus the existing ghost proof; full verification is required because the blast radius includes runtime, worker, source contract, package, closeout, and `foundation:verify` surfaces. The final full gate is `process:foundation-ship`.

Operator value: this unlocks useful operator behavior for Steve. He can leave the builder running, see active process state, park approval-bound actions without stopping the whole sprint, trust unsafe process actions to fail closed, and keep safe Foundation work moving.

Speed bound: the focused gate is a thin wrapper over existing runtime-control functions and one existing focused proof. It should run under 2 minutes in normal local conditions, which keeps the default path fast enough that builders use it instead of bypassing it.

## Risks

- Rebuilding the runtime-control surface would create avoidable risk. Mitigation: this card wraps the shipped ghost closeout and fails if that proof no longer passes.
- Closing top-level `SYSTEM-010` while stale source text remains would confuse future source work. Mitigation: the proof rejects the stale runtime-control source-contract sentence.
- Current Sprint could advance before proof is real. Mitigation: the check requires Plan Critic, approval, ghost proof, System Health, repeated-failure gate, and closeout registry.

## Not Next

- Do not start Value Builder split.
- Do not start source/extract implementation from this card.
- Do not mutate credentials, Drive permissions, public edge exposure, external systems, or sends.
- Do not run paid/provider/browser-auth work.
- Do not rebuild `SYSTEM-010-GHOST-CLOSEOUT-001`.
