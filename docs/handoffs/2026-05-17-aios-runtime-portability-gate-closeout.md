# AIOS Runtime Portability Gate Closeout

Card: `AIOS-RUNTIME-PORTABILITY-GATE-001`

Closeout key: `aios-runtime-portability-gate-v1`

## What Changed

- Added `lib/aios-runtime-portability-gate.js`.
- Added focused proof `scripts/process-aios-runtime-portability-gate-check.mjs`.
- Added plan and approval artifacts:
  - `docs/process/aios-runtime-portability-gate-001-plan.md`
  - `docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json`
- Wired verifier coverage through `lib/foundation-runtime-reliability-verifier.js`, `lib/foundation-verify-coverage-card-ids.js`, and `scripts/foundation-verify.mjs`.
- Registered closeout key `aios-runtime-portability-gate-v1`.
- Updated current plan/state to record the shipped runtime portability gate.
- Tightened the default Foundation Hub backlog summary `source` text limit so adding this card does not push the default Hub backlog section over its V2 budget. Full backlog history and detail remain available through the dedicated routes.

## What It Does

The gate requires every runtime adapter to declare Foundation-owned:

- identity
- tools
- permissions and write posture
- model/provider route
- auth posture
- cost/spend policy
- logs/transcripts export
- source and compiled-KB truth boundary
- fallback brain
- adapter-only ownership

Claude, Codex, OpenClaw, OpenHuman, Higgsfield-style, and future runtimes are treated as adapters. Foundation owns truth and the route contract.

## Why It Matters

This prevents AIOS from binding itself to one CLI, one provider, one prompt stack, one subscription path, or one runtime's local memory. Runtime capability can improve without moving source truth, permission policy, model routing, cost policy, logs, or fallback behavior out of Foundation.

## Proof

Focused proof:

```bash
npm run process:aios-runtime-portability-gate-check -- --close-card --json
```

Full proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=AIOS-RUNTIME-PORTABILITY-GATE-001 --planApprovalRef=docs/process/approvals/AIOS-RUNTIME-PORTABILITY-GATE-001.json --closeoutKey=aios-runtime-portability-gate-v1 --commitRef=HEAD
```

Dogfood rejects:

- missing identity
- runtime-owned source/KB truth
- missing tool/permission policy
- direct provider/model route
- missing cost policy
- missing logs/transcripts export
- missing fallback brain
- unapproved live paid/auth run

## Not Done

This does not run live extraction, auth-required or paid runs, provider/model probes, connector/OAuth repair, runtime adapter install, model calls, external writes, Drive permission mutation, or Agent Feedback auto-send.

This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

## Next

Continue the bounded Foundation queue with `AGENT-STATUS-FRESHNESS-GATE-001`.
