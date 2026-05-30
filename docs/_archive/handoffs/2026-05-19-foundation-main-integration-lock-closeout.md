# Foundation Main Integration Lock Closeout

Date: 2026-05-19
Card: `FOUNDATION-MAIN-INTEGRATION-LOCK-001`
Closeout key: `foundation-main-integration-lock-v1`

## What Changed

- Added a dedicated main integration lock evaluator and focused proof.
- Added side-branch routing truth for current non-main branches.
- Wired the proof into package scripts, Plan Critic, approval integrity, live Backlog, Current Sprint, and closeout lookup.

## What It Proves

- `main` is the current integration branch.
- Local `main` contains `origin/main` before push, and must match `origin/main` after push.
- Dashboard served commit equals repo `HEAD`.
- Foundation worker startup commit equals repo `HEAD`.
- Current sprint closeout truth is present.
- Non-main branches are integrated, preserved side commits, WIP, or release-train candidates.
- The old 108-card branch pileup fails dogfood unless merged or explicitly release-trained.

## Current Branch Routing

- `foundation/system-health-red-to-green-001` and `origin/foundation/system-health-red-to-green-001` are integrated historical branches.
- `preserve/local-main-before-foundation-merge-2026-05-19`, its remote mirror, and the local pre-merge branch preserve unrelated side commits for later review.
- `wip/marketing-video-lab-phase-2a-2026-05-15` is WIP non-Foundation work, not completed Foundation sprint work.

## Proof Commands

```sh
node --check lib/foundation-main-integration-lock.js scripts/process-foundation-main-integration-lock-check.mjs
npm run process:foundation-main-integration-lock-check -- --apply --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MAIN-INTEGRATION-LOCK-001.json --closeoutKey=foundation-main-integration-lock-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --closeoutKey=foundation-main-integration-lock-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --closeoutKey=foundation-main-integration-lock-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=FOUNDATION-MAIN-INTEGRATION-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-MAIN-INTEGRATION-LOCK-001.json --closeoutKey=foundation-main-integration-lock-v1 --commitRef=HEAD
```

## Next

Run `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` next. Source/extraction stays behind main integration, merge-lane enforcement, health green/classification, and audit routing.

## Known Limits

- This does not prune local or remote branches.
- This does not merge preserved side commits.
- This does not launch parallel builders.
- This does not run live extraction, provider probes, credential repair, Drive mutation, sends, or external writes.
