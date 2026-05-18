# Agent Live Answer Preflight Gate Closeout

Card: `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001`

Closeout key: `agent-live-answer-preflight-gate-v1`

## What Changed

- Added `lib/agent-live-answer-preflight-gate.js`.
- Added focused proof `scripts/process-agent-live-answer-preflight-gate-check.mjs`.
- Added plan and approval artifacts.
- Wired runtime reliability verifier coverage and done-card coverage.
- Added the next-card current-progress allowlist for `AGENT-CAPABILITY-REGISTRY-001` while keeping `scripts/foundation-verify.mjs` under 5,000 lines.
- Updated current plan/state to record the shipped preflight gate.

## What It Does

The gate defines claim classes and required evidence stamps for operational agent answers:

- system health status
- builder/current sprint status
- repo branch/dirty status
- source freshness
- audit/verifier run status

Fresh current answers require fresh evidence: source kind, route or local command, source ID, lookup ref, queried-at timestamp, as-of timestamp, and evidence stamp.

## Proof

```bash
npm run process:agent-live-answer-preflight-gate-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json --closeoutKey=agent-live-answer-preflight-gate-v1 --commitRef=HEAD
```

Dogfood rejects memory-only current answers, missing preflight, stale live reads that sound current, missing-tool current answers, unavailable sources without wording, missing evidence stamps, and live runtime/model/external side effects.

## Not Done

This does not build Harlan UI.

This does not launch live agent runtime work.

This does not implement the capability registry.

This does not run live extraction, provider/model calls, external writes, Drive permission mutation, or Agent Feedback auto-send.

This does not work `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.

## Next

Continue with `AGENT-CAPABILITY-REGISTRY-001` unless repo truth surfaces a higher P0 repair.
