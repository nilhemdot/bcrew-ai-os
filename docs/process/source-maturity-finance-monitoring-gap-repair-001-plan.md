# SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001 Plan

## Card

`SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001`

## What

Repair the `SRC-FINANCE-001` monitored-stage source maturity gap by adding an explicit manual/on-demand refresh boundary to the signed-off finance source contract.

This is a narrow V1 source-contract maturity repair. It changes the contract posture and proof only; it does not build finance automation.

## Why

`SRC-FINANCE-001` already has signed-off current-reality source facts, but live source maturity blocks at `monitored` because the contract does not state a refresh boundary. That creates false noise in the Foundation source queue and hides the next real gap.

Useful operator behavior: Foundation should say finance is manually/on-demand monitored today, then expose the next actual maturity gap instead of asking Steve to re-prove whether finance truth exists.

## Existing Work

- `SRC-FINANCE-001` is signed off for current-reality finance meaning in `lib/source-contracts.js`, `docs/source-registry.md`, and `docs/rebuild/current-state.md`.
- Live source maturity shows `SRC-FINANCE-001` has existing source fact signals but no monitoring boundary, so its next gap is `monitored`.
- The source maturity grid treats `updateMethod`, `refreshSchedule`, or `manualRefresh` as a valid monitoring boundary only when the contract states one.
- Continuous finance automation, payment reconciliation, and approved finance range reads are not in scope for this card.
- Existing code is reused: `lib/source-contracts.js`, `lib/source-maturity-grid.js`, `lib/source-maturity-gap-followup.js`, and `lib/source-contract-validation-layer.js`.
- Existing docs are reused: `docs/source-registry.md`, `docs/rebuild/current-state.md`, and `docs/handoffs/2026-05-18-source-maturity-gap-followup-triage.md`.
- Existing scripts are reused: `scripts/process-source-maturity-gap-followup-check.mjs`, `scripts/foundation-verify.mjs`, backlog hygiene, and `process:foundation-ship`.
- Live backlog and Current Sprint truth are reused through the build-lane scaffold path before building_now.

## Details

- Add a truthful manual/on-demand monitoring posture to `SRC-FINANCE-001`.
- Make clear that no background finance automation is approved by this repair.
- Preserve the next real source maturity gap instead of pretending atom-flow, synthesis, routing, or apply is complete.
- Add focused proof, live backlog/current sprint metadata, approval, closeout registry, and done-card verifier coverage.
- Reuse `buildSourceMaturityGridSnapshot` to prove behavior through the same maturity path that operators see.
- Reuse `getFoundationSnapshot()` and `getSourceContracts()` for live proof.
- Reuse `evaluatePlanCriticPlan`, approval integrity, Current Sprint overlay, backlog hygiene, foundation verify, and ship gate.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No Google Sheets read/write.
- No external write.
- No Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- Do not mark atomized, synthesized, routed, finance automation, or payment reconciliation complete.

## Acceptance Criteria

- Synthetic dogfood proves signed-off finance facts without a monitoring boundary fail at `monitored`.
- Synthetic dogfood proves the same finance contract with `updateMethod`, `refreshSchedule`, and `manualRefresh` advances to the next real gap.
- Live proof shows `SRC-FINANCE-001` has existing source fact signals and a green monitored stage.
- Live proof shows no active extraction target was introduced for `SRC-FINANCE-001`.
- Live proof shows the next gap remains visible, currently expected to be `atomized`, not hidden as complete.
- Live backlog card exists and moves through Current Sprint with existing-work metadata, not-next boundaries, proof commands, approval ref, and closeout key.
- Closeout registry and done-card verifier coverage name this card and closeout key.

## Files

- `lib/source-contracts.js`
- `lib/source-maturity-finance-monitoring-gap-repair.js`
- `scripts/process-source-maturity-finance-monitoring-gap-repair-check.mjs`
- `package.json`
- `lib/foundation-build-closeout-source-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`
- `docs/process/approvals/SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001.json`
- `docs/handoffs/2026-05-18-source-maturity-finance-monitoring-gap-repair-closeout.md`

## Risks

- False green risk: adding generic monitoring text could hide missing automation. Mitigation: contract text explicitly says manual/on-demand only and no background automation is approved.
- Scope drift risk: finance data reads or Sheets writes could sneak into a maturity repair. Mitigation: proof and Current Sprint boundaries forbid Google Sheets read/write and active extraction targets.
- Completion inflation risk: monitored repair could imply atomized/synthesized/routed are done. Mitigation: proof requires the next real gap to remain visible.
- Process drag risk: this card could rerun full verification repeatedly while iterating. Mitigation: use focused proof first and reserve full Foundation ship gate for final ship.
- Regression repair path: if source maturity does not advance, do not weaken the grid; repair the source contract posture or leave the card blocked with the exact missing boundary. If the next gap becomes `complete` without atom/synthesis/route proof, treat that as a verifier regression and fix the grid before ship.

## Tests

Focused/default tests:

- Synthetic finance source with signed-off facts but no refresh boundary fails at `monitored`.
- Synthetic repaired finance source advances from `monitored` to the next real gap.
- Live `SRC-FINANCE-001` has signed-off source facts and an explicit monitoring boundary.
- Live source maturity no longer blocks finance at `monitored`.
- No active extraction target is introduced for `SRC-FINANCE-001`.
- Current Sprint metadata includes existing-work, not-next, proof commands, approval ref, and closeout key.
- Closeout registry and done-card verifier coverage include this card.

Commands:

- `node --check lib/source-maturity-finance-monitoring-gap-repair.js scripts/process-source-maturity-finance-monitoring-gap-repair-check.mjs`
- `npm run process:source-maturity-finance-monitoring-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-finance-monitoring-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-finance-monitoring-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-finance-monitoring-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FINANCE-MONITORING-GAP-REPAIR-001.json --closeoutKey=source-maturity-finance-monitoring-gap-repair-v1 --commitRef=HEAD`

Gate decision tree: static checks (`node --check`) for syntax; focused proof (`process:source-maturity-finance-monitoring-gap-repair-check`) while iterating; full `foundation:verify` once focused proof is green because the blast radius touches source-contract truth and source maturity; full `process:foundation-ship` before push.

Speed bound: the focused proof uses local source contracts, Foundation snapshot reads, and metadata checks only. It must stay fast enough to run repeatedly while iterating.

## Definition Of Done

- `SRC-FINANCE-001` has explicit `updateMethod`, `refreshSchedule`, and `manualRefresh` posture for manual/on-demand review.
- The source maturity grid clears the monitored-stage gap for finance.
- The next real gap remains visible.
- No Google Sheets read/write, live extraction, external write, model/provider call, paid run, auth repair, Drive mutation, or Agent Feedback auto-send occurs.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.
