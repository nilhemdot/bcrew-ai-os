# FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 Plan

## What

Repair the current raw workflow failures and tighten the health gates so repeated failures and red/yellow workflow rows cannot be closed by classification.

This is the umbrella P0 correction after Steve clarified that green means fixed, not documented. The card owns four proof sections:

- governed connector uptime repair proof
- false-green process exits
- repeated-failure blocker output
- meeting transcript latest-state repair
- ship/fanout bootstrap proof so repeated-failure telemetry resolves only after real fanout proof, not by deleting red history

## Why

The system was able to report healthy process checks while live health still carried raw risk/watch rows and a repeated connector failure. That recreates the old failure mode: builders keep moving while the machine is down or wasting runs.

The expected morning behavior is repair-first. If a workflow fails repeatedly, Foundation Builder must fix it or attach it to an active repair lane before value/source work resumes.

## Acceptance Criteria

- `connector-uptime-monitor` has a later successful governed `foundation_job_runs` row after the May 19, 2026 10:05 EDT failure.
- `process:build-lane-repeated-failure-action-gate-check -- --json` returns healthy after the connector repair.
- Repeated-failure gate JSON exposes `unsatisfiedRedItems` and `blockingItems` with job/fingerprint, latest failure, owner, repair card, decision, and next action.
- `meeting-transcripts-extract-backlog` latest state is no longer the Orchestrator-created cancellation.
- Closed Current Sprint proof scripts use verified historical closeout mode after sprint rollover instead of reading today's active blocker inside old sprint proof.
- `process:system-health-nightly-audit-check` cannot exit healthy while embedded workflow health is red/yellow.
- `process:foundation-operating-reliability-check` cannot exit healthy while live runtime health still has failed jobs or down connectors.
- Current Sprint records this card as the P0 raw-green blocker before normal sprint/value work resumes.
- `process:foundation-ship` can finish a clean ship after fanout failures by passing a short-lived in-flight proof into its final `foundation:verify`; the durable ship proof is still recorded only after final verify passes.

## Definition Of Done

- `scripts/process-foundation-raw-green-repair-and-lock-check.mjs` proves the raw-green repair and lock behavior.
- `lib/foundation-system-health.js` keeps approval-bound workflow failures blocking green unless they are repaired or explicitly excepted in sprint truth.
- `scripts/process-system-health-nightly-audit-check.mjs` and `scripts/process-foundation-operating-reliability-check.mjs` fail closed on false-green health exits.
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs` surfaces blocking repeated-failure details in JSON output.
- `scripts/process-current-sprint-dynamic-truth-check.mjs` stays healthy after sprint rollover by using verified historical closeout proof for its closed sprint.
- `scripts/process-foundation-ship.mjs` breaks the fanout/final-verify bootstrap without creating a permanent success proof before final verification.
- `lib/build-lane-failure-telemetry.js` accepts only fresh in-flight ship proof from the ship gate environment and keeps historical telemetry intact.
- Live backlog and Current Sprint truth close this card only after the focused proof passes.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Existing code and live truth reused:

- `lib/foundation-system-health.js`
- `lib/build-lane-repeated-failure-action-gate.js`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-current-sprint-dynamic-truth-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-foundation-operating-reliability-check.mjs`
- `scripts/process-foundation-ship.mjs`
- `lib/build-lane-failure-telemetry.js`
- `scripts/run-foundation-job.mjs`
- live `foundation_job_runs`, live Backlog, Current Sprint, and Plan Critic rows

## Existing Work Reused

Allowed live repair:

- Run the governed read-only `connector-uptime-monitor` job.
- Run the existing bounded `meeting-transcripts-extract-backlog` bite to clear the Orchestrator-created cancelled latest state.

Existing docs and closeout surfaces reused:

- `docs/process/build-lane-repeated-failure-action-gate-001-plan.md`
- `docs/process/foundation-health-watch-to-green-001-plan.md`
- `docs/process/connector-uptime-monitor-001-plan.md`
- Current Sprint overlay for `FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19`

## Operator Value

Steve should be able to trust the morning repair loop without translating reports. After this card:

- repeated failure output names the exact blocker and repair route
- connector uptime cannot fail 30+ times without a blocking gate
- health checks cannot pass while embedded workflow health is red/yellow
- Foundation Builder gets a concrete repair lane before Value Builder resumes

## Gate Decision Tree

Gate level: full.

Reason: this card touches live job proof, Current Sprint truth, process checks, package scripts, closeout registry, verifier coverage, and health semantics. Static checks are not enough. The focused proof must read live job rows and run the actual process gates, then full `foundation:verify` and `process:foundation-ship` must pass.

## Behavioral Proof

Root invariant:

- A workflow failure cannot become green through classification, stale success, or missing blocker output.
- The actual function path must fail closed when workflow health is red/yellow, when repeated failures lack a repair route, or when the latest governed repair run is not successful.
- A failed fanout attempt cannot trap the final ship gate forever: after ship-check and fanout pass, final verify may use only a short-lived in-flight proof; if final verify fails, no durable proof is recorded and the repeated failure remains live.

Not allowed:

- No broad private/auth extraction beyond the existing bounded job.
- No Drive permission mutation.
- No email/send/external write.
- No provider probe outside the existing governed meeting transcript extraction path.
- No value/source/agent feature work until this P0 closes.

The proof is behavior-based. No substring-only proof is accepted:

- Reads live `foundation_job_runs` and proves successful connector/transcript runs happened after the broken rows.
- Runs the actual repeated-failure gate and proves it is healthy.
- Runs the actual system-health and operating-reliability process checks and proves they exit healthy only after workflow failures are repaired.
- Runs the actual Current Sprint dynamic-truth proof path in historical mode so closed sprint proof cannot be broken by the next active blocker.
- Dogfood proof exercises the actual function/API/process path by evaluating the live process outputs and the focused raw-green proof result, not just source markers.
- A synthetic weak proof shape is rejected by the focused gate when Plan Critic cannot verify actual behavior proof.
- Checks source text only as a secondary guardrail for the newly added false-green and blocker-output paths.

## Risks

- Risk: the card becomes another classification layer.
  - Response: close proof requires live governed job success after the broken rows and repeated-failure gate healthy.
- Risk: broad meeting extraction or private/auth repair work runs under the umbrella.
  - Response: only the existing bounded `meeting-transcripts-extract-backlog` bite is in scope.
- Risk: cleanup rows get mistaken for repaired workflow failures.
  - Response: the card separates blocking workflow health from classified endpoint/handoff/file-size cleanup and resumes those cards next.
- Risk: the new gate slows normal builds.
  - Response: the focused proof uses existing process checks and live row reads; expensive full gates run only at ship.

## Tight Scope And Not Next

Tight V1 scope:

- repair current connector repeated failure
- repair current transcript latest-state failure
- make false-green workflow exits fail closed
- expose repeated-failure blocking items clearly

Not next:

- endpoint metric implementation
- handoff archive cleanup
- file-size splits
- broad extraction/source activation
- any external write or permission mutation

## Speed Bound

The focused proof is fast enough to run by default: target under 1 minute after the governed connector and transcript repair jobs have already run. It does not rerun extraction inside the check; it reads the live job ledger and runs the three deterministic process gates. Full `foundation:verify` and `process:foundation-ship` remain ship-only gates.

## Tests

```bash
node --check lib/build-lane-failure-telemetry.js lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-foundation-ship.mjs scripts/process-system-health-nightly-audit-check.mjs scripts/process-foundation-operating-reliability-check.mjs scripts/process-build-lane-repeated-failure-action-gate-check.mjs scripts/process-current-sprint-dynamic-truth-check.mjs scripts/process-foundation-raw-green-repair-and-lock-check.mjs
npm run process:foundation-operating-reliability-check -- --json --no-api
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:foundation-raw-green-repair-and-lock-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001.json --closeoutKey=foundation-raw-green-repair-and-lock-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --closeoutKey=foundation-raw-green-repair-and-lock-v1
npm run process:foundation-ship -- --card=FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RAW-GREEN-REPAIR-AND-LOCK-001.json --closeoutKey=foundation-raw-green-repair-and-lock-v1 --commitRef=HEAD
```

## Next

After this closes, resume the cleanup queue:

1. `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`
2. `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`
3. `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`
4. `FOUNDATION-HEALTH-GREEN-LOCK-001`
