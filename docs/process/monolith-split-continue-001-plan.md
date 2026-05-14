# MONOLITH-SPLIT-CONTINUE-001 Plan

## What

Continue measured monolith cleanup with one coherent split that reduces oversized Foundation code without changing behavior.

V1 extracts the new verification-cleanup closeout records into a dedicated small module and wires the root closeout registry through that module. This keeps new closeout truth out of the already-large closeout records file and proves the line-count direction is shrinking, not growing.

## Why

The hardening sprint made dangerous behavior harder to repeat, but Steve still has files at actively dangerous size: `lib/foundation-db.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, `server.js`, and `lib/foundation-build-closeout-records.js`.

The operator value is future speed and quality: new Foundation closeouts get added through modules instead of making the closeout monolith worse.

## Acceptance Criteria

- New verification-cleanup closeout records live in a dedicated module outside `lib/foundation-build-closeout-records.js`.
- The root closeout registry imports and spreads that module without changing public `getFoundationBuildCloseouts()` behavior.
- The proof records before/after line counts for the closeout registry surface.
- No behavior changes to build-log lookup, closeout validation, or Recent Work output.
- The split plan is documented because this touches a file over 5K lines.

## Definition Of Done

- `lib/foundation-build-closeout-cleanup-records.js` owns the new sprint closeout record.
- `lib/foundation-build-closeout-records.js` becomes a thinner aggregator for this new record set.
- Focused proof proves the new closeout is visible through the existing build-log API and validation still passes.
- Current Sprint has doctrine and a durable Plan Critic pass row before implementation.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `lib/foundation-build-log.js`, `lib/foundation-build-closeout-records.js`, `getFoundationBuildCloseouts()`, closeout validation, `process:ship-check`, `process:fanout-check`, `process:post-ship-fanout`, and full Foundation ship gates.

Existing docs to reuse: current plan/current state, previous closeout split closeout, the deep audit monolith findings, and this sprint closeout.

Existing scripts to reuse: `process:foundation-build-log-monolith-slice-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static proof alone is too weak; focused proof checks the actual build-log function path and line-count direction; full proof is required because Recent Work closeout truth, verifier coverage, and package scripts are changed. Blast radius is Foundation Recent Work and closeout evidence.

The focused proof stays fast and proportional, under two minutes, so line-count cleanup is checked by default instead of bypassed.

Split plan: this card intentionally touches `lib/foundation-build-closeout-records.js`, a file over 5K lines, only to import/spread a new module. No new closeout content belongs in the large file. New responsibility goes in the new module.

## Risks

- Risk: splitting closeout records breaks Recent Work.
  - Repair path: fail closed if `getFoundationBuildCloseouts()` cannot find `foundation-verification-cleanup-v1`.
- Risk: line count improves only by moving content but future sprints add back to the monolith.
  - Repair path: Plan Critic now requires split plans for files over 5K lines, and this card dogfoods that rule.
- Risk: this drifts into broad monolith refactor.
  - Repair path: only this closeout-record boundary ships in V1; larger DB/verifier/frontend splits stay queued.

## Tests

```bash
npm run process:foundation-verification-cleanup-check -- --json --no-api
npm run process:foundation-build-log-monolith-slice-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=RECURRING-DEEP-AUDIT-001 --planApprovalRef=docs/process/approvals/RECURRING-DEEP-AUDIT-001.json --closeoutKey=foundation-verification-cleanup-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern of adding new closeout records directly to the large registry and proves this sprint's record is imported from the new module instead.

## Not Next

- Do not split all of `foundation-db.js`, `foundation-verify.mjs`, `public/foundation.js`, or `server.js` in this card.
- Do not do product or hub feature work.
- Do not touch MEETING-VAULT-ACL-001 Phase B or Drive permissions.
