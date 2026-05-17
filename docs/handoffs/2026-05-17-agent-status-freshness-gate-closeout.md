# Agent Status Freshness Gate Closeout

Card: `AGENT-STATUS-FRESHNESS-GATE-001`

Closeout key: `agent-status-freshness-gate-v1`

## What Changed

- Added `lib/agent-status-freshness-gate.js`.
- Added focused proof `scripts/process-agent-status-freshness-gate-check.mjs`.
- Added plan and approval artifacts:
  - `docs/process/agent-status-freshness-gate-001-plan.md`
  - `docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json`
- Wired verifier coverage through `lib/foundation-runtime-reliability-verifier.js`, `lib/foundation-verify-coverage-card-ids.js`, and `scripts/foundation-verify.mjs`.
- Registered closeout key `agent-status-freshness-gate-v1`.
- Updated current plan/state to record the shipped status freshness gate.

## What It Does

The gate requires agents to use fresh live Foundation/API truth before reporting current operational status. Memory, notes, handoffs, screenshots, and chat claims can still provide context, but they must be labeled as last-known unless revalidated live.

The contract requires:

- current-status claim type
- as-of timestamp
- fresh live API source
- route and source ID
- queried-at timestamp
- max-age budget
- current vs last-known evidence label
- conflict detection against live truth

## Why It Matters

Steve should not hear that Harlan, OpenHuman, extraction, voice, Fal, Canva, or any other capability is current/live because an old chat or memory file said so. Current status now means live Foundation/API truth, not stale confidence.

## Proof

Focused proof:

```bash
npm run process:agent-status-freshness-gate-check -- --close-card --json
```

Full proof:

```bash
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=AGENT-STATUS-FRESHNESS-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json --closeoutKey=agent-status-freshness-gate-v1 --commitRef=HEAD
```

Dogfood rejects:

- memory-only current claims
- stale live reads
- missing as-of timestamps
- conflicts with live status
- stale Harlan-style capability claims
- live extraction/model/external side effects

## Not Done

This does not run live extraction.

This does not run auth-required or paid jobs, provider/model probes, connector/OAuth repair, runtime adapter installs, model calls, external writes, Drive permission mutation, or Agent Feedback auto-send.

This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

## Next

Queue complete. Select the next Foundation sprint from fresh repo truth.
