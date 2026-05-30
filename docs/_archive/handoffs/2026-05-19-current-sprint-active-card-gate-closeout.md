# CURRENT-SPRINT-ACTIVE-CARD-GATE-001 Closeout

Date: 2026-05-19

Closeout key: `current-sprint-active-card-gate-v1`

## What Changed

- Added the active-card gate behavior in `lib/current-sprint-active-card-gate.js`.
- Added the focused proof and live sprint reset path in `scripts/process-current-sprint-active-card-gate-check.mjs`.
- Reset Current Sprint to `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19`.
- Created/scoped missing overnight guardrail cards so the approved sprint order is live backlog truth.
- Encoded the overnight operating rule: blockers block unsafe actions, not the whole sprint.

## What It Does

The gate rejects durable work when the active Current Sprint card lacks:

- active blocker/card
- owner
- next action
- definition of done
- proof commands
- not-next boundaries
- repo posture
- park-and-continue blocker policy

## Why It Matters

Steve approved unattended overnight work. This prevents the builder from continuing from chat-only instructions while Current Sprint or repo truth is stale.

## Where It Lives

- `lib/current-sprint-active-card-gate.js`
- `scripts/process-current-sprint-active-card-gate-check.mjs`
- `docs/process/current-sprint-active-card-gate-001-plan.md`
- `docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json`
- `package.json` script `process:current-sprint-active-card-gate-check`
- Current Sprint: `FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19`

## Proof

- `node --check lib/current-sprint-active-card-gate.js scripts/process-current-sprint-active-card-gate-check.mjs`
- `npm run process:current-sprint-active-card-gate-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json --closeoutKey=current-sprint-active-card-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --closeoutKey=current-sprint-active-card-gate-v1`
- `npm run process:foundation-ship -- --card=CURRENT-SPRINT-ACTIVE-CARD-GATE-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-ACTIVE-CARD-GATE-001.json --closeoutKey=current-sprint-active-card-gate-v1 --commitRef=HEAD`

## Next

Continue `DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001`.

Do not start Value Builder split or broad extraction overnight. If a card hits approval-bound work, park that action and continue to the next safe card.
