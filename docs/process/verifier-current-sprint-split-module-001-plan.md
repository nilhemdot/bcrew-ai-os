# VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001 Plan

Card: `VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001`
Sprint: `verifier-current-sprint-split-module-2026-05-15`
Closeout key: `verifier-current-sprint-split-module-v1`

## What

Extract the Current Sprint verifier checks for `FOUNDATION-SPRINT-SYSTEM-001` and `FOUNDATION-SPRINT-CADENCE-001` from `scripts/foundation-verify.mjs` into `lib/foundation-current-sprint-verifier.js`.

This slice covers the live Current Sprint overlay, sprint command view, cadence/readout requirements, done-this-sprint review state, Meeting Vault / Drive permission stop-lines, current-sprint API health, and existing sprint proof docs/scripts.

## Why

The root verifier is still a high-risk file. Current Sprint proof is also a high-value process boundary: if it gets weak, the board drifts, cards move without doctrine, and old completed-card checks start failing every time the active blocker rolls forward.

This card keeps behavior unchanged while moving the Current Sprint proof domain into a focused module with dogfood fixtures.

## Acceptance Criteria

- `lib/foundation-current-sprint-verifier.js` owns the Current Sprint system/cadence verifier conditions.
- `scripts/foundation-verify.mjs` imports and delegates the two canonical Current Sprint PASS/FAIL rows through `evaluateFoundationCurrentSprintVerifier`.
- Focused dogfood proof accepts the healthy current sprint state and rejects:
  - unhealthy Current Sprint API/status,
  - missing current-sprint doctrine/source markers,
  - missing build-log/closeout ownership,
  - missing Drive / Meeting Vault stop-line evidence.
- The focused proof script is read-only and has no DB mutation, file-write, or `--apply` path.
- `scripts/foundation-verify.mjs` line count decreases from the `14,984` baseline.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001` and `verifier-current-sprint-split-module-v1`.

## Definition Of Done

- `VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001` closes under `verifier-current-sprint-split-module-v1`.
- `docs/process/verifier-current-sprint-split-module-001-plan.md` and `docs/process/approvals/VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-current-sprint-split-module-check.mjs` passes and proves healthy/broken Current Sprint fixtures.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- inline Current Sprint checks in `scripts/foundation-verify.mjs`,
- `lib/foundation-current-sprint.js`,
- `scripts/process-foundation-sprint-system-check.mjs`,
- `scripts/process-foundation-sprint-cadence-check.mjs`,
- prior focused verifier module patterns in `lib/foundation-source-trust-verifier.js` and `lib/foundation-db-split-verifier.js`.

Gate decision tree: this is Foundation verifier work touching the canonical gate, package scripts, closeout records, Current Sprint truth, and rebuild docs. Static syntax checks and focused proof run first. Full `process:foundation-ship` is required before push.

Large-file split plan: this card touches `scripts/foundation-verify.mjs`, already over the 5,000-line architecture-risk threshold, only to remove the two Current Sprint verifier rows and replace them with a thin delegation call. If work expands into other process/history checks, stop and open a new card.

## Risks

- Risk: Current Sprint proof gets weaker while moving code.
  - Response: focused dogfood rejects unhealthy current-sprint API/status, missing doctrine markers, missing build-log ownership, and missing Drive/Meeting Vault stop-lines.
- Risk: this becomes a broad process verifier rewrite.
  - Response: only the `FOUNDATION-SPRINT-SYSTEM-001` and `FOUNDATION-SPRINT-CADENCE-001` verifier rows move.
- Risk: closeout review state becomes confused when the active blocker is cleared.
  - Response: dogfood includes done-this-sprint review mode with a sprint review/rollover next action.

## Tests

```bash
node --check lib/foundation-current-sprint-verifier.js
node --check scripts/process-verifier-current-sprint-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-current-sprint-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001.json --closeoutKey=verifier-current-sprint-split-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad Current Sprint fixtures that should fail but can become easy to miss when the verifier is a large monolith. Substring-only proof is not enough.

## Not Next

- Do not rewrite the whole verifier.
- Do not change Current Sprint DB schema, stage behavior, route behavior, or UI behavior.
- Do not split `lib/foundation-db.js` in this card.
- Do not wire Marketing Video Lab, Canva asset library, hub feature work, paid-source auth, Build Intel extraction, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
