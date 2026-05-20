# 2026-05-20 Orchestrator Green/Clear Handoff

## State

- Main branch was repaired and verified after `BRAIN-FLEET-FOUNDATION-001`.
- Active Current Sprint blocker is `HARLAN-AUTH-ESCALATION-LOOP-001`.
- Manual `foundation:verify -- --json-summary` is green: 518/518.
- Scheduled `foundation-verify` job was forced through the ledger and succeeded.
- Scheduled `connector-uptime-monitor` job was forced through the ledger and succeeded.
- Build-lane repeated-failure action gate is healthy.
- System Health nightly audit is healthy.
- Deep-audit findings closure gate is healthy.
- Current Sprint active-card gate is healthy.
- Current Sprint dynamic truth is healthy.
- Foundation plan reconcile is healthy.
- Backlog hygiene is healthy: 776 cards, 0 findings.

## Repair

- `lib/hub-read-routes.js` keeps the full diagnostics backlog payload under budget while preserving proof-bearing backlog fields:
  - full `summary`
  - full `nextAction`
  - full `statusNote`
  - bounded `whyItMatters` at 120 characters
  - source/owner and long why text remain trimmed
- `lib/foundation-daily-exec-summary.js` now accepts live Phase G completion truth and done-card closeout truth when compact backlog rows do not carry every historical closeout detail.
- `scripts/process-foundation-health-watch-to-green-check.mjs` is now historical-aware:
  - accepts the verified `foundation-health-watch-to-green-v1` closeout after sprint rollover
  - treats old health rows as "classified if present" instead of requiring resolved red/yellow rows to remain visible
  - skips live Current Sprint writes from `--apply --close-card` once the sprint has already rolled forward

## Proof Commands

- `node --check lib/hub-read-routes.js`
- `node --check lib/foundation-daily-exec-summary.js`
- `node --check scripts/process-foundation-health-watch-to-green-check.mjs`
- `npm run process:daily-exec-summary-check -- --json`
- `npm run process:foundation-hub-full-payload-reduce-check -- --json`
- `npm run process:foundation-full-diagnostics-perf-check -- --json`
- `npm run process:foundation-health-watch-to-green-check -- --json`
- `npm run process:foundation-health-watch-to-green-check -- --apply --close-card --json`
- `npm run foundation:verify -- --json-summary`
- `npm run foundation:job -- --job=foundation-verify --force`
- `npm run foundation:job -- --job=connector-uptime-monitor --force`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:deep-audit-findings-closure-gate-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run backlog:hygiene -- --json`

## Known Note

Resolved after the green/clear audit: `npm run process:foundation-health-watch-to-green-check -- --json` is historical-aware and should no longer make Builders think the live system is red after the active sprint rolls forward. It now accepts the verified `foundation-health-watch-to-green-v1` closeout and treats old health rows as "classified if present" rather than requiring stale red/yellow rows to remain visible forever.

## Next Builder

Proceed with one Builder on `HARLAN-AUTH-ESCALATION-LOOP-001`.

Builder must not start lower-priority cards until Harlan is shipped and the standard gates stay green.

Do not start a second UI Builder unless it uses a separate worktree/branch, declares file ownership, avoids shared-file overlap, and waits for serialized merge-lane clearance.
