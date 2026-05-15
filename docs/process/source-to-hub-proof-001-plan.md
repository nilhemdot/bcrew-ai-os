# SOURCE-TO-HUB-PROOF-001 Plan

## What

Prove existing Foundation source health can move into hub consumer contracts without giving hubs write access or Foundation internals. This is a tight v1, bounded proof card.

## Why

The whole Foundation exists so sources extract truth and hubs can use it. Existing connector uptime/source health gives us the source side; this card reuses that data and proves the safe hub consumption path with real runtime code.

## Acceptance Criteria

- `buildConnectorUptimeSnapshot()` feeds hub consumer contracts for sales, ops, marketing, and strategy.
- Each hub contract validates as read-only.
- Each hub contract includes source IDs.
- The proof records connector summary and per-hub validation status.

## Definition Of Done

- Plan approval exists at `docs/process/approvals/SOURCE-TO-HUB-PROOF-001.json` with score at least 9.8.
- Durable Plan Critic pass row exists for `SOURCE-TO-HUB-PROOF-001`.
- Focused proof passes with `npm run process:foundation-ready-safe-hub-lane-check -- --card=SOURCE-TO-HUB-PROOF-001 --json`.
- Full sprint closeout later runs `npm run process:foundation-ship -- --card=SOURCE-TO-HUB-PROOF-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`.

## Details

Reuse existing code: `lib/connector-uptime-monitor.js` and the new contract module from `HUB-CONSUMER-CONTRACT-001`. This is not next for new source connectors, not next for a hub feature, and not next for live provider work. It is a proof that source health can bleed up to hubs through a safe API-shaped boundary.

## Risks

- If connector health is degraded, the contract should still expose safe status rather than crash.
- If source IDs are missing, the hub cannot trace data back to Foundation source truth.
- The proof is read-only by default and has no `--apply` path. Rollback/repair path: if source IDs are missing or a contract is writable, keep this card out of Done and revise the contract until it fails closed.

## Plan Critic Gate

Decision tree: static syntax checks plus focused proof, then full `process:foundation-ship` at closeout because this touches package/process proof surfaces. Blast radius is bounded to existing code, existing scripts, the current sprint, and live backlog truth. The focused proof calls the actual function path from `buildConnectorUptimeSnapshot()` into `buildHubConsumerContract()`, rejects substring-only proof, and dogfoods the source-to-hub failure mode by requiring source IDs and read-only behavior. Operator value: Steve and the team can see whether real Foundation sources are safe for hub use before building product features. Speed target: the proof is fast and thin, intended to run under 2 minutes by default.

## Tests

- `npm run process:foundation-ready-safe-hub-lane-check -- --card=SOURCE-TO-HUB-PROOF-001 --json`
- `node --check scripts/process-foundation-ready-safe-hub-lane-check.mjs`
- Sprint closeout full gate: `npm run process:foundation-ship -- --card=SOURCE-TO-HUB-PROOF-001 --closeoutKey=foundation-ready-safe-hub-lane-v1`
