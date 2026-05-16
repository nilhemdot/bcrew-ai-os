# Foundation Endpoint Budgets Closeout

Date: 2026-05-16
Card: `FOUNDATION-ENDPOINT-BUDGETS-001`
Closeout key: `foundation-endpoint-budgets-v1`

## What Changed

Added a focused endpoint budget layer for Foundation operator routes.

The existing nightly audit endpoint classifier now feeds a dedicated `lib/foundation-endpoint-budgets.js` module, and future nightly deep audit JSON artifacts persist `endpointMetrics` so morning health can report route latency and payload budget drift.

## What It Does

V1 tracks these operator routes:

- `/api/foundation-hub`
- `/api/source-of-truth`
- `/api/foundation/source-lifecycle`
- `/api/foundation/build-log`
- `/api/foundation/gstack-build-intel`

It classifies each route as healthy, review, or risk using the existing latency/payload budgets. The snapshot is report-only: no auto-fixes, no backlog mutation, and no route behavior changes.

## Why It Matters

The old 70-second Foundation Hub failure proved route speed is Foundation reliability, not polish. This card makes endpoint regressions visible in Foundation Operating Reliability / morning health before slow routes block hub work or make the system feel broken again.

## Where It Lives

- `lib/foundation-endpoint-budgets.js`
- `scripts/process-foundation-endpoint-budgets-check.mjs`
- `scripts/process-nightly-deep-audit-upgrade-check.mjs`
- `lib/nightly-deep-audit-upgrade.js`
- `lib/connector-uptime-monitor.js`
- `lib/hub-read-routes.js`
- `server.js`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:foundation-endpoint-budgets-check`
- `docs/process/foundation-endpoint-budgets-001-plan.md`
- `docs/process/approvals/FOUNDATION-ENDPOINT-BUDGETS-001.json`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-endpoint-budgets.js
node --check scripts/process-foundation-endpoint-budgets-check.mjs
node --check lib/nightly-deep-audit-upgrade.js
node --check scripts/process-nightly-deep-audit-upgrade-check.mjs
node --check lib/connector-uptime-monitor.js
node --check lib/hub-read-routes.js
node --check server.js
node --check scripts/foundation-verify.mjs
npm run process:foundation-endpoint-budgets-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-ENDPOINT-BUDGETS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-BUDGETS-001.json --closeoutKey=foundation-endpoint-budgets-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-ENDPOINT-BUDGETS-001 --closeoutKey=foundation-endpoint-budgets-v1
```

Results:

- focused proof: 17/17
- Plan Critic: 10/10
- backlog hygiene: healthy across 525 cards
- `foundation:verify`: 383/383
- live endpoint measurement status: healthy

Live focused measurement recorded:

- `/api/foundation-hub`: about 88ms / 529KB
- `/api/source-of-truth`: about 14ms / 134KB
- `/api/foundation/source-lifecycle`: about 382ms / 631KB
- `/api/foundation/build-log`: about 85ms / 369KB
- `/api/foundation/gstack-build-intel`: about 83ms / 34KB

Dogfood proof rejects:

- the old 70-second / 4.63 MB endpoint failure class
- an over-800KB payload warning
- missing endpoint metrics in the latest nightly JSON

Final ship proof:

```bash
npm run process:foundation-ship -- --card=FOUNDATION-ENDPOINT-BUDGETS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-BUDGETS-001.json --closeoutKey=foundation-endpoint-budgets-v1 --commitRef=HEAD
```

## Known Limits

- This does not rewrite or slim the five routes.
- Existing `docs/handoffs/nightly-deep-audit-2026-05-14.json` predates this card and does not contain endpoint metrics, so it reports missing metrics until the next nightly deep audit run writes the upgraded JSON shape.
- This does not build hub feature UI.
- This does not wire Marketing Video Lab live routes.
- This does not build Canva asset library features.
- This does not add paid-source auth, source extraction, or Build Intel extraction.
- This does not work `MEETING-VAULT-ACL-001` Phase B or mutate Drive permissions.

## Review Next

Continue no-auth Foundation cleanup. The next clean slices are source-lifecycle dynamic counts, frontend asset budgets, and other audit-driven guardrails that keep Foundation truth dynamic instead of hardcoded.
