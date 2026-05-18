# Parallel Builder Worktree Protocol Closeout

Card: `PARALLEL-BUILDER-WORKTREE-PROTOCOL-001`

Closeout key: `parallel-builder-worktree-protocol-v1`

## What Changed

- Added `lib/parallel-builder-worktree-protocol.js`.
- Added `lib/foundation-verify-process-hardening-runner.js` so process-hardening orchestration wiring no longer pushes `scripts/foundation-verify.mjs` over 5,000 lines.
- Tightened `lib/foundation-hub-backlog-contract.js` so done cards remain lightweight pointers in the default Hub backlog summary while full/detail routes keep history accessible.
- Added focused proof `scripts/process-parallel-builder-worktree-protocol-check.mjs`.
- Added plan and approval artifacts:
  - `docs/process/parallel-builder-worktree-protocol-001-plan.md`
  - `docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json`
- Wired verifier coverage through `lib/foundation-process-hardening-verifier.js`, `lib/foundation-verify-coverage-card-ids.js`, and `scripts/foundation-verify.mjs`.
- Repaired the historical process-hardening split proofs so they accept the new runner delegation shape while still rejecting old inline root verifier ownership.
- Registered closeout key `parallel-builder-worktree-protocol-v1`.
- Updated current plan/state to record the setup sprint and next KB/action review sprint.
- Created the live next-queue backlog cards so `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` is live backlog truth, not a handoff-only label:
  - `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`
  - `FOUNDATION-KB-COMPILER-V1-001`
  - `ACTION-ROUTE-REVIEW-INBOX-001`
  - `ACTION-ROUTE-PROMOTION-WORKFLOW-001`
  - `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`

## What It Does

The protocol requires each parallel builder assignment to declare:

- card ID
- dedicated branch
- dedicated worktree
- base commit
- Current Sprint stage
- disjoint write scopes
- shared-file report-before-edit owner
- focused proof command
- merge handoff with changed files and proof

The verifier runner split keeps the root verifier as orchestration only for this domain. Focused proof fails if `scripts/foundation-verify.mjs` is at or above the 5,000-line guardrail.

## Why It Matters

Steve wants the system to build safely overnight. This makes speed safer by blocking shared worktree collisions, shared branch edits, overlapping write scopes, uncoordinated shared/root file changes, forbidden local/mockup scopes, and live side effects.

## Proof

Focused proof:

```bash
npm run process:parallel-builder-worktree-protocol-check -- --close-card --json
```

Full proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-WORKTREE-PROTOCOL-001.json --closeoutKey=parallel-builder-worktree-protocol-v1 --commitRef=HEAD
```

Dogfood rejects:

- two builders sharing one worktree
- worker edits on the shared Foundation branch
- overlapping write scopes
- missing Current Sprint coordination
- uncoordinated shared-file edits
- Steve local mockup/Harlan/Fal/voice/Canva/OpenHuman scopes
- live extraction/provider-probe/external-write side effects

## Not Done

This does not create worktrees, start workers, run live extraction, run auth-required or paid jobs, probe providers/models, repair connector/OAuth, call models, write external systems, mutate Drive permissions, or auto-send Agent Feedback.

This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

This does not split arbitrary lines. The only verifier split in this sprint is a real process-hardening orchestration boundary.

## Next

Start `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001` from fresh repo truth:

1. `FOUNDATION-KB-COMPILER-V1-001`
2. `ACTION-ROUTE-REVIEW-INBOX-001`
3. `ACTION-ROUTE-PROMOTION-WORKFLOW-001`
4. `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`

No live extraction.
