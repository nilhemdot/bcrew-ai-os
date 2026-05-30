# CRITICAL-ROOTS-UNDER-3K-PHASE-4 Closeout

Closeout key: `critical-roots-under-3k-phase-4-v1`

## What Changed

- Moved shared FUB lead-source freshness helpers to `lib/fub-lead-source-governance.js`.
- Moved Owners governance routes and queue helpers to `lib/owners-governance-routes.js`.
- Moved Sales Hub payload cache and mutation routes to `lib/sales-hub-routes.js`.
- Reduced `server.js` below the 3,000-line critical-root threshold.

## Proof

Run:

```bash
node --check server.js lib/fub-lead-source-governance.js lib/owners-governance-routes.js lib/sales-hub-routes.js lib/critical-roots-under-3k-phase-4.js scripts/process-critical-roots-under-3k-phase-4-check.mjs scripts/foundation-verify.mjs
npm run process:critical-roots-under-3k-phase-4-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run process:ship-check -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json --closeoutKey=critical-roots-under-3k-phase-4-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --closeoutKey=critical-roots-under-3k-phase-4-v1
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-4 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-4.json --closeoutKey=critical-roots-under-3k-phase-4-v1 --commitRef=HEAD
```

## Not Next

- Does not redesign Sales Hub, Owners governance, FUB source routing, or Foundation Hub.
- Does not run Owners success-path live reads or Sales Hub success-path writes from the focused proof.
- Does not run live extraction, paid/auth-required jobs, external sends, Drive mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.

## Next

Continue remaining root-file cleanup from repo truth, then move to `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001`.
