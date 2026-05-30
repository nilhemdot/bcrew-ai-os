# FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 Plan

## What

Refresh Foundation endpoint metric truth so System Health no longer reports missing endpoint budget rows for the required operator routes.

This card uses the existing endpoint-budget system and the nightly deep audit writer. It does not rewrite route budgets, relax thresholds, or classify around missing metrics.

## Why

After raw workflow failures were repaired, System Health still carried endpoint review rows because the latest nightly audit JSON had zero `endpointMetrics`. An older May 17 report had measurements, but the latest report is the source used by health. That made endpoint health stale.

## Acceptance Criteria

- The latest nightly deep audit JSON for May 19 contains current `endpointMetrics` for all required Foundation routes.
- The five endpoint metric System Health rows disappear or are proven current:
  - `/api/foundation-hub`
  - `/api/source-of-truth`
  - `/api/foundation/source-lifecycle`
  - `/api/foundation/build-log`
  - `/api/foundation/gstack-build-intel`
- `process:system-health-nightly-audit-check -- --json` reports `endpointRiskCount=0` and `endpointReviewCount=0`.
- Existing `process:foundation-endpoint-budgets-check -- --json` passes against the refreshed endpoint snapshot.
- The old endpoint-budget proof accepts the focused verifier-module delegation path instead of expecting all verifier strings in the root verifier file.
- Current Sprint moves the active blocker to `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001` only after focused proof passes.

## Definition Of Done

- `docs/handoffs/nightly-deep-audit-2026-05-19.json` and `.md` exist with five measured endpoint metrics.
- `scripts/process-foundation-endpoint-metrics-freshness-check.mjs` proves approval, Plan Critic, live backlog/current sprint truth, endpoint metric freshness, endpoint System Health row removal, endpoint budget proof, closeout registry, package script, and verifier coverage.
- `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001` is closed in live backlog and Current Sprint after focused proof passes.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Root invariant: endpoint budget health is current only when the latest audit artifact used by System Health contains healthy measurements for every required route.

Existing code reused:

- `lib/foundation-endpoint-budgets.js`
- `lib/foundation-system-health.js`
- `lib/foundation-operator-budget-verifier.js`

Existing scripts reused:

- `scripts/process-foundation-endpoint-budgets-check.mjs`
- `scripts/process-nightly-deep-audit-upgrade-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`

Existing docs reused:

- `docs/handoffs/nightly-deep-audit-2026-05-19.json`
- `docs/_archive/handoffs/nightly-deep-audit-2026-05-19.md`
- `docs/process/foundation-endpoint-budgets-001-plan.md`

Live backlog and Current Sprint truth reused:

- live `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001` backlog row
- live `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001` next-card row
- live Current Sprint active blocker

## Reuse Existing Work

This is a repair of freshness, not a rebuild. The existing code, existing docs, existing scripts, live backlog, and Current Sprint records above are the source of truth. The new script only proves the repair and closes the card; it does not create a replacement endpoint budget system.

## Operator Value

This unlocks a clean Foundation operator surface for Steve: endpoint health no longer asks a builder to chase stale rows after the endpoints have been measured. The real workflow is faster because the next builder sees only the remaining handoff and file-size cleanup rows instead of re-debugging endpoint budget history.

## Rollback Or Repair Path

If proof fails, fail closed and do not move the active blocker. Repair path:

- If endpoint rows reappear, rerun the existing nightly deep audit metric capture and inspect the failing route.
- If a measured route is over budget, stop this card and scope a route-specific performance repair instead of hiding it.
- If approval or Plan Critic fails, revise the plan/approval and rerun the focused proof before mutating sprint truth.
- If `foundation:verify` or ship fails, leave the card executing and repair the failing gate before push.

## Behavioral Proof

The proof must verify the real behavior path used by System Health, not substring-only markers:

- Load the actual latest endpoint budget snapshot through `loadLatestFoundationEndpointBudgetSnapshot()`.
- Read the May 19 nightly deep audit artifact used by health.
- Run the actual System Health process check and assert endpoint risk/review counts are zero.
- Run the existing endpoint-budget process check.
- Reject weak dogfood where endpoint metrics are missing, stale, timed out, or only classified away.
- Reject substring-only proof; source markers are secondary guardrails after the API/process path is proven.

## Tight Scope And Not Next

Tight V1 scope:

- refresh/prove current endpoint metrics
- repair stale endpoint-budget proof delegation
- close this one Current Sprint card

Not next:

- Do not classify endpoint rows instead of removing/proving them current.
- Do not change endpoint thresholds unless a measured route is truly over budget.
- Do not rewrite the routes or lazy-loading behavior.
- Do not start source/value/agent work.
- Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.
- Do not launch parallel builders.

## Gate Decision Tree

Gate level: full.

Decision tree:

- Static is not enough because the card reads live Backlog/Current Sprint truth and endpoint artifacts.
- Focused proof is required to exercise the real System Health and endpoint-budget process path.
- Full gate is required before ship because the blast radius includes Current Sprint truth, package scripts, closeout registry, verifier coverage, and generated health artifacts.

Reason: this card updates Current Sprint truth, uses generated audit artifacts as live health input, repairs a stale proof path, and changes the ship state for a P0 Foundation cleanup card.

## Risks

- Risk: the card becomes classification-around-it cleanup.
  - Response: close proof requires endpoint risk/review counts to be zero and endpoint finding IDs absent.
- Risk: a route is actually slow or bloated.
  - Response: fail closed and scope a route-specific budget repair; do not close freshness.
- Risk: generated audit artifacts go stale again.
  - Response: keep the endpoint-budget proof tied to latest nightly JSON and System Health counts so missing metrics fail again.
- Risk: the check becomes too heavy to run.
  - Response: the focused gate targets under 2 minutes; full `foundation:verify` and `process:foundation-ship` remain ship gates only.

## Speed Bound

The focused proof should run under 2 minutes on the local machine because it reads existing artifacts and runs two existing process checks. It does not rerun broad extraction or a heavy audit during closeout.

## Tests

```bash
node --check scripts/process-foundation-endpoint-metrics-freshness-check.mjs scripts/process-foundation-endpoint-budgets-check.mjs
npm run process:foundation-endpoint-metrics-freshness-check -- --apply --close-card --json
npm run process:foundation-endpoint-budgets-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.json --closeoutKey=foundation-endpoint-metrics-freshness-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --closeoutKey=foundation-endpoint-metrics-freshness-v1
npm run process:foundation-ship -- --card=FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001.json --closeoutKey=foundation-endpoint-metrics-freshness-v1 --commitRef=HEAD
```

## Next

After this closes, continue Foundation-only cleanup with `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`.
