# Foundation Hub Payload Budget V2 Closeout

Card: `FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001`
Closeout key: `foundation-hub-payload-budget-v2-v1`
Branch: `foundation/system-health-red-to-green-001`
Date: 2026-05-17

## What Changed

- Added `lib/foundation-hub-payload-budget-v2.js` as the canonical V2 budget owner for the default `/api/foundation-hub` payload.
- Set the canonical default summary payload budget to `650,000` bytes with at least `20,000` bytes of required headroom.
- Wired `foundationHubPayloadBudgetV2` metadata through `lib/foundation-hub-performance.js`.
- Added dogfood checks for oversized payloads, full-diagnostic leaks, hidden backlog rows, missing compaction markers, and arbitrary row dropping.
- Added focused proof at `scripts/process-foundation-hub-payload-budget-v2-check.mjs` and registered `process:foundation-hub-payload-budget-v2-check`.
- Added hub-safety/root verifier coverage and closeout registry coverage.
- Reused the existing Foundation job compactor in the explicit full diagnostics route so V2 card growth does not push `/api/foundation-hub?view=full` back over its existing 4.2 MB budget.
- Preserved scheduled-job proof fields in that compactor (`scheduleLocalTime`, `scheduleTimezone`, and mutation allowlist modes/postures) so audit freshness checks still use real runtime contracts.

## Proof

- `node --check lib/hub-read-routes.js lib/foundation-hub-summary-payload.js lib/foundation-hub-payload-budget-v2.js lib/foundation-hub-performance.js lib/foundation-hub-safety-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-hub-payload-budget-v2-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-cleanup-records.js`
- `npm run process:foundation-hub-payload-budget-v2-check -- --json`
  - Default route: `98ms / 627,837B`, summary mode, `639/639` backlog rows preserved, V2 status `healthy`, `22,163B` headroom.
  - Full route regression guard: `5.054s / 4,120,626B`, under the existing `15s / 4,200,000B` full diagnostics budget, with Foundation jobs compacted.
  - Dogfood rejected over-budget, full-leak, hidden-row, missing-compaction, and row-dropping fixtures.
- `npm run backlog:hygiene -- --json`: healthy, `639` cards scanned, `0` findings.
- `npm run foundation:verify -- --failures-only`: `446/446` checks passed.

Final ship gate to record after commit:

- `npm run process:foundation-ship -- --card=FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001.json --closeoutKey=foundation-hub-payload-budget-v2-v1 --commitRef=HEAD`

## Boundaries

No UI polish, hub feature work, Harlan, Fal, voice, Canva, connector auth, external-write jobs, DB schema changes, or Steve local mockup assets were touched.

## Next

Recommended next sprint after this ships: `SOURCE-CONTRACT-VALIDATION-LAYER`, unless Foundation Hub payload drifts red again.
