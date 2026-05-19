# `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` Plan

Closeout key: `parallel-builder-merge-lane-enforcement-v1`

## What

Build the P0 merge-lane enforcement gate that ties visible parallel builders to `main` integration discipline.

The card creates one actual function path in `lib/parallel-builder-merge-lane-enforcement.js` and one proof script in `scripts/process-parallel-builder-merge-lane-enforcement-check.mjs`. The gate validates three lanes:

- main session
- worker branch/worktree
- review/integration lane

It rejects the real failure patterns from the prior pileup: same worktree, same branch, overlapping file scope, hidden or untracked builder, completed work missing a queue entry, simultaneous active merges, missing post-merge verification, failed `main` without repair routing, 108-card stacking, and blocked workers continuing on conflicting files.

## Why

Steve needs a fast building machine he can trust. The old workflow let completed cards stack outside `main`; that turned speed into integration debt and wasted the operator's time. This gate unlocks useful operator behavior: Steve can run visible parallel builders later without personally policing branch/worktree ownership, queue intake, merge order, and post-merge proof.

This is not documentation polish. It is the P0 guardrail before parallel builders resume.

## Acceptance Criteria

- `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` exists as a live P0 backlog card.
- Plan Critic score is 9.8+ and status is pass, not revise.
- Current Sprint keeps this card ahead of health/audit/source activation until the focused proof closes it.
- The actual function path `evaluateParallelBuilderMergeLaneEnforcement()` returns ready for a healthy protocol.
- Dogfood rejects same worktree, same branch, overlapping file scope, hidden/untracked builder, completed work missing queue entry, simultaneous active merges, missing post-merge proof, failed `main` without repair, 108-card pileup, and conflicting blocked-worker continuation.
- Dogfood accepts a blocked worker only when the safe next file scope does not overlap the blocked scope.
- The package script `process:parallel-builder-merge-lane-enforcement-check` runs the focused proof.
- The closeout registry and verifier coverage include the card and closeout key.
- The focused proof updates live Backlog, Plan Critic, and Current Sprint only when `--apply` or `--close-card` is explicit.

## Definition Of Done

- Live backlog card is `done` under `parallel-builder-merge-lane-enforcement-v1`.
- Current Sprint active blocker advances to `FOUNDATION-HEALTH-WATCH-TO-GREEN-001`.
- `node --check` passes for the new module, proof script, and process-hardening verifier.
- `npm run process:parallel-builder-merge-lane-enforcement-check -- --apply --close-card --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD` passes.
- Commit subject includes `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` or `parallel-builder-merge-lane-enforcement-v1`.
- Commit is pushed to `main`.

## Details

Reuse existing code, existing docs, existing scripts, and live backlog/current sprint truth:

- existing code: `lib/parallel-builder-operating-system.js` for visible builder assignment behavior
- existing code: `lib/foundation-merge-queue.js` for queue entry and long-branch behavior
- existing docs: `docs/process/parallel-builder-operating-system-001-protocol.md`
- existing docs: `docs/process/foundation-merge-queue-protocol.md`
- existing scripts: `process:parallel-builder-operating-system-check`, `process:foundation-merge-queue-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`
- live backlog/current sprint: the P0 card must be created or updated in DB-backed truth and Current Sprint must move to health watch-to-green only after this proof passes

This card adds a narrow V1 enforcement wrapper rather than rebuilding those systems.

The root invariant is: completed worker output cannot remain an informal branch pile. It must be either in the merge queue, merged to `main` with proof, or blocked with owner and repair route.

## Risks

- Risk: this becomes another reminder doc. Repair path: fail closed unless the actual evaluator dogfood passes and verifier coverage includes it.
- Risk: this weakens flow by being too heavy. Repair path: keep the focused proof synthetic and fast, then use full gates only for final ship because the card touches process/verifier/closeout coverage.
- Risk: `main` fails after a merge and builders keep stacking anyway. Repair path: queue pauses and requires a repair card before any later merge.
- Risk: a builder blocks and keeps editing conflicting files. Repair path: blocker handoff must name safe next file scope and the evaluator fails conflicting continuation.
- Risk: proof regresses later. Repair path: reopen or route a follow-up P0 repair card; do not let source/extraction activation treat the gate as green.

Not next:

- Do not launch parallel builders from this card.
- Do not create real worktrees from this card.
- Do not merge worker branches from this card.
- Do not run live extraction, provider probes, auth-required or paid jobs, Drive mutation, sends, or external writes.
- Do not weaken, skip, bypass, or demote ship, fanout, backlog hygiene, or `foundation:verify`.

## Tests

Gate decision tree: full gate for final ship because this card changes process code, package scripts, closeout registry, verifier coverage, live Backlog, and Current Sprint. The default loop is focused and fast; the focused proof should stay under 2 minutes and avoid real worktree creation, network calls, external writes, and live extraction.

Static-only verification is not enough for this P0 because the blast radius includes DB-backed live backlog/current sprint state and verifier coverage. The focused gate is `process:parallel-builder-merge-lane-enforcement-check`; the full gate is `foundation:verify` plus `process:foundation-ship`.

Proof commands:

```bash
node --check lib/parallel-builder-merge-lane-enforcement.js scripts/process-parallel-builder-merge-lane-enforcement-check.mjs lib/foundation-process-hardening-verifier.js
npm run process:parallel-builder-merge-lane-enforcement-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1
npm run process:post-ship-fanout -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD
```
