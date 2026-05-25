# AIOS Parallel Builder Lanes V1

Card: `AIOS-PARALLEL-BUILDER-LANES-001`

Status: scoped control-plane primitive

## Goal

Create the first durable AIOS builder-lane record shape so Steve can see who is working, what each lane owns, what proof is required, what is blocked, what is ready for review, and who integrates the work.

This is report-only. It does not launch real agents, terminals, provider calls, paid model runs, commits, pushes, or external writes.

## Why This Matters

Steve wants to talk to the orchestrator while 1-3 builders work on scoped cards in parallel. The repo already has protocol docs for visible builders, worktrees, branches, and merge lanes. The missing piece is a small control-plane model that can represent active lanes as data and fail closed when lane ownership is unsafe.

## V1 Scope

- Model lanes with:
  - lane id;
  - card id;
  - owner;
  - role;
  - files owned;
  - status;
  - started/updated timestamps;
  - proof commands;
  - blockers;
  - changed files;
  - integration status;
  - stop/decommission posture.
- Prove active lanes do not overlap in write ownership.
- Prove every lane has a card id and proof command.
- Prove blocked and ready-for-review states are visible.
- Prove no auto-commit, auto-push, shell launch, provider call, or external write exists in this slice.
- Prove the parent/orchestrator remains final integration owner.

## Not Next

- No UI.
- No terminal launching.
- No real worker runtime.
- No hidden subagents.
- No model/provider calls.
- No paid runs.
- No live extraction.
- No commits or pushes from builder lanes.
- No backlog mutation from the focused proof.

## Existing Work Reused

- `docs/process/parallel-builder-operating-system-001-protocol.md`
- `lib/parallel-builder-operating-system.js`
- `scripts/process-parallel-builder-operating-system-check.mjs`
- `docs/process/parallel-builder-worktree-protocol-001-plan.md`
- `docs/process/parallel-builder-merge-lane-enforcement-001-plan.md`

Those files define the rules. This card adds the small lane-status model that can later feed a Foundation page.

## Files

- `lib/parallel-builder-lanes.js`
- `scripts/process-parallel-builder-lanes-check.mjs`
- `docs/process/parallel-builder-lanes-001-plan.md`
- `package.json`

## Proof

```bash
node --check lib/parallel-builder-lanes.js scripts/process-parallel-builder-lanes-check.mjs
npm run process:parallel-builder-lanes-check -- --json
git diff --check
```

## Future Work

After V1 passes, a UI/runtime card can expose the lane table in Foundation and later connect it to real visible builder assignments. Real worker launch belongs in a separate card with explicit auth, process, stop-path, and merge safety.
