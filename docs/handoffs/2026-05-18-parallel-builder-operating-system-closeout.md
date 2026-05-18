# Parallel Builder Operating System Closeout

Card: `PARALLEL-BUILDER-OPERATING-SYSTEM-001`

Closeout key: `parallel-builder-operating-system-v1`

## What Changed

- Added `lib/parallel-builder-operating-system.js`.
- Added focused proof `scripts/process-parallel-builder-operating-system-check.mjs`.
- Added protocol doc `docs/process/parallel-builder-operating-system-001-protocol.md`.
- Added plan and approval artifacts:
  - `docs/process/parallel-builder-operating-system-001-plan.md`
  - `docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json`
- Registered the closeout and verifier coverage.

## What It Does

The operating system defines visible parallel builder coordination:

- one visible chat per builder
- one known repo/worktree per builder
- one branch per independent builder
- explicit file/module ownership
- shared-file lock protocol
- merge order
- commit/push ownership
- status, wrap, blocker, and assignment report formats
- crash/restart recovery from repo truth
- hidden subagent allowed/forbidden rules
- paste-ready prompts for Orchestrator, Foundation Builder A, Feature/Preflight Builder B, and Review/Audit Builder C

## Proof

Focused proof:

```bash
npm run process:parallel-builder-operating-system-check -- --close-card --json
```

Full proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=PARALLEL-BUILDER-OPERATING-SYSTEM-001 --planApprovalRef=docs/process/approvals/PARALLEL-BUILDER-OPERATING-SYSTEM-001.json --closeoutKey=parallel-builder-operating-system-v1 --commitRef=HEAD
```

Dogfood rejects:

- same worktree used by two builders
- same branch used by two independent builders
- overlapping file ownership
- hidden subagent spawned without explicit approval
- shared-file commit without coordination
- dirty state without wrap report

## Not Done

This does not launch parallel builders, create real worktrees, start workers, run live extraction, run auth-required or paid jobs, probe providers/models, call models, write external systems, mutate Drive permissions, or auto-send Agent Feedback.

This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

## Next

Use the protocol doc and paste-ready prompts before starting visible parallel builders. Continue the Foundation queue from live backlog truth.
