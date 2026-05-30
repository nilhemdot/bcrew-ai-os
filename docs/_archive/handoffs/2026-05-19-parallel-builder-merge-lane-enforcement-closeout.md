# Parallel Builder Merge Lane Enforcement Closeout

Card: `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`

Closeout key: `parallel-builder-merge-lane-enforcement-v1`

Date: 2026-05-19

## What Changed

- Added the P0 merge-lane enforcement gate that ties visible builder assignments to queue intake, serialized main merges, post-merge verification, and blocker handoff.
- Added a protocol doc for the three lanes: main session, worker branch/worktree, and review/integration lane.
- Added dogfood proof for same worktree, same branch, overlapping file scope, untracked builder, missing queue entry, simultaneous merges, missing post-merge proof, failed main without repair, 108-card pileup, and conflicting blocked-worker continuation.
- Updated live Backlog and Current Sprint so this card closes before system-health watch-to-green work resumes.

## Why It Matters

The prior failure was not just that a branch got big. The process allowed completed work to keep stacking outside `main` without a hard merge-lane decision. This gate makes that failure mode visible and blocking before parallel builders resume.

## Proof

- `node --check lib/parallel-builder-merge-lane-enforcement.js scripts/process-parallel-builder-merge-lane-enforcement-check.mjs lib/foundation-process-hardening-verifier.js`
- `npm run process:parallel-builder-merge-lane-enforcement-check -- --apply --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1`
- `npm run process:post-ship-fanout -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD`
- `npm run process:foundation-ship -- --card=PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001.json --closeoutKey=parallel-builder-merge-lane-enforcement-v1 --commitRef=HEAD`

## Status

- Parallel builders remain unlaunched by this card.
- Hidden or untracked workers are rejected by proof.
- Completed work missing a merge queue entry is rejected by proof.
- Multiple active main merges are rejected by proof.
- Failed main without a paused queue and repair card is rejected by proof.

## Next

Run `FOUNDATION-HEALTH-WATCH-TO-GREEN-001` next. If that card finds red health, fix it before source/extraction activation. If a remaining non-green row is approval-bound or threshold-watch, classify it with owner, reason, threshold, and next action.

## Not Next

- No live extraction.
- No hidden or untracked builders.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No Drive permission mutation.
- No Gmail, ClickUp, Slack, Agent Feedback, public, or external write.
