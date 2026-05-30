# FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 Closeout

Closeout key: `focused-sprint-id-historical-aware-v1`

## What Shipped

- Added `lib/focused-sprint-id-historical-aware.js` with the reusable audit-ref detector and dogfood proof.
- Added `scripts/process-focused-sprint-id-historical-aware-check.mjs` with guarded close-card proof.
- Updated the audit-named focused checks:
  - `scripts/process-agent-feedback-routes-split-check.mjs`
  - `scripts/process-app-page-routes-split-check.mjs`
- Repaired the Agent Feedback split dogfood so out-of-scope route proof checks the Agent Feedback module boundary instead of stale raw server substrings.
- Routed `focused-check-active-sprint-id-assumption` to this closeout in `lib/deep-audit-findings-closure-gate.js`.
- Registered package script and closeout record.

## Why It Matters

Focused checks should remain valid after sprint rollover because the card is done and the closeout is verified. They should not require an old dated sprint ID to remain the active Current Sprint.

This closes the May 19 deep-audit finding without rewriting every legacy proof script.

## Proof

```bash
node --check lib/focused-sprint-id-historical-aware.js lib/agent-feedback-routes.js scripts/process-focused-sprint-id-historical-aware-check.mjs scripts/process-agent-feedback-routes-split-check.mjs scripts/process-app-page-routes-split-check.mjs
npm run process:focused-sprint-id-historical-aware-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --commitRef=HEAD
```

## Known Limits

- This does not rewrite every historical focused proof script.
- Bootstrap/default sprint constants can remain only when explicitly marked as non-live truth.
- Active-card proof still validates against the active sprint when a card is actually active.

## Next

Continue `FOUNDATION-CSS-SURFACE-DECOUPLE-001`.
