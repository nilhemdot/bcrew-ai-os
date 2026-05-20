# OPS-003 Ops Improvement Rollup Plan

## What

Repair and prove the bounded Freedom OPS rollup path for `OPS-003`.

- Card: `OPS-003`
- Title: Repair the ops-improvement rollup and remove the dead NPS Scores & Reviews dependency
- Closeout key: `ops-003-ops-improvement-rollup-v1`
- Owner: Foundation Ops
- Next card after close: `ENGINE-001`

This card adds a governed proof around the live `Data Entry - Ops Cont Improvement` and `Ops Satisfaction` formulas. It may apply only the named formula repairs in this plan when live proof requires them.

## Why

`Ops Satisfaction` should not report operator health from dead tabs, wrong target formulas, or future scaffold rows.

The source meaning is already mapped in `docs/source-notes/freedom-sheet.md`, but the workflow still needed executable proof that:

- the removed `NPS Scores & Reviews` dependency is not in the watched formula path
- `K10` rolls executed deals from the Owners-backed admin deal ledger
- `Q4` rolls company NPS from the signed-off client/deal/NPS source rows
- the read layer uses latest nonblank month-row logic
- the known `Ops Satisfaction!F5` bug is repaired so the agent-onboarding capture gap subtracts `F4`, not `D4`

Operator value: Steve can trust that this current spreadsheet-era OPS read layer is not silently broken while the future source-owned Freedom rebuild continues. This unlocks a real workflow: the operator can open the Current State sheet watch or Ops Satisfaction surface and know whether OPS values are safe to read, need repair, or are blocked by an explicit source issue.

## Acceptance Criteria

- Live watched formulas contain zero `NPS Scores & Reviews` references.
- `Data Entry - Ops Cont Improvement!K10` uses `ADMIN ONLY - Deal Data Entry` executed-date and deal-credit columns.
- `Data Entry - Ops Cont Improvement!Q4` uses `Data Entry - Clients, Deals, NPS & GReviews` NPS received and score rows.
- `Ops Satisfaction!F5` is exactly `=F3-F4`.
- `Ops Satisfaction` latest actual formulas use nonblank latest-row queries and do not render sheet errors.
- `opsImprovementRollup` is exposed in `scripts/sheets-structure-verify.mjs` and summarized by `public/foundation-current-state-renderers.js`.
- `OPS-003` is closed in live backlog and Current Sprint advances to `ENGINE-001`.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

- `OPS-003` focused proof reports `status=healthy` and `requiredRepairCount=0`.
- `opsImprovementRollup` is present in the sheet structure API data-health payload.
- Closeout registry exposes `ops-003-ops-improvement-rollup-v1` with where-it-lives and proof commands.
- Live backlog row is `done`, Current Sprint row is `done_this_sprint`, and `ENGINE-001` is active blocker.
- `foundation:verify` and `process:foundation-ship` pass from committed repo truth.

## Details

Existing code, docs, scripts, and live backlog truth reused:

- `DATA-001` Freedom adapter boundary and source-ID schema-drift posture.
- `docs/source-notes/freedom-sheet.md` locked meaning for the OPS rollup/read-layer chain.
- `lib/google-delegated.js` delegated Sheets read/write helper with imported-range write guards.
- `scripts/sheets-structure-verify.mjs` sheet structure route source for `/api/sheets/structure-status`.
- Current Sprint, Plan Critic, backlog hygiene, repeated-failure gate, `foundation:verify`, and `process:foundation-ship`.
- Live backlog truth for `OPS-003`, `ENGINE-001`, and the current sprint overlay.

Implementation files:

- `lib/ops-003-ops-improvement-rollup.js`
- `scripts/process-ops-003-check.mjs`
- `scripts/sheets-structure-verify.mjs`
- `public/foundation-current-state-renderers.js`
- `docs/source-notes/freedom-sheet.md`
- closeout registry, verifier coverage marker, package script, approval, and closeout handoff

Live read ranges:

- `Data Entry - Ops Cont Improvement!A1:X40`
- `Ops Satisfaction!A1:L6`

Allowed sheet content repairs:

- `Ops Satisfaction!F5 = F3-F4`
- `Data Entry - Ops Cont Improvement!K10` only if it still contains the removed `NPS Scores & Reviews` dependency or lacks the Owners-backed admin deal ledger formula
- `Data Entry - Ops Cont Improvement!Q4` only if it still contains the removed dependency or lacks the live client/deal/NPS source formula

Behavior proof path:

- `readOps003LiveSnapshot()` reads the real Google Sheet formulas and effective values.
- `evaluateOps003Snapshot()` validates dead-reference removal, source formula posture, latest-row query behavior, gap formulas, and no remaining required repairs.
- `applyOps003SheetRepairs()` applies only the named repairs and only when the process check is run with explicit write posture.
- `buildSyntheticOps003Proof()` dogfoods false-green cases without touching live data.
- No substring-only proof is accepted: the focused proof reads the live Google Sheets API, calls the actual functions above, and the synthetic dogfood rejects weak formula markers that would hide the real behavior.
- Gate decision tree: static syntax checks run first, focused `process:ops-003-check` proof runs second, and full `process:foundation-ship` is required before push because this touches live spreadsheet content, Current Sprint state, package scripts, sheet structure API output, and frontend Current State copy. The focused proof reads only two bounded ranges and should stay under 2 minutes; the full gate stays with the normal Foundation ship budget.

## Risks

- Risk: spreadsheet mutation drifts into a broad Freedom rewrite.
  - Mitigation: allowed repairs are limited to named formula cells, and proof fails if broader behavior is needed.
- Risk: a builder treats source-note text as proof.
  - Mitigation: focused proof calls live delegated Google Sheets reads and validates formulas/effective values.
- Risk: future scaffold rows look like current operating truth.
  - Mitigation: `Ops Satisfaction` latest formulas must include nonblank row guards and ordered latest-month logic.
- Risk: a failed proof tempts classification instead of repair.
  - Mitigation: live required repairs must be zero before closeout; otherwise the card remains active or parks only the unsafe action and continues the next safe card.
- Risk: the gate becomes too slow for default use.
  - Mitigation: this proof reads two bounded ranges, reuses the Sheets cache unless fresh proof is required, and leaves full verification to the ship gate.
- Repair path if proof fails: rerun `npm run process:ops-003-check -- --json` to identify the exact formula/source failure. If it is one of the three approved formula cells, rerun `npm run process:ops-003-check -- --apply --json`. If the failure requires broader spreadsheet, ClickUp, FUB, finance, credential, provider, or permission mutation, park that action with owner/reason/next trigger and continue the next safe card instead of forcing the write.

## Tests

- `node --check lib/ops-003-ops-improvement-rollup.js scripts/process-ops-003-check.mjs scripts/sheets-structure-verify.mjs public/foundation-current-state-renderers.js`
- `npm run process:ops-003-check -- --apply --json`
- `npm run process:ops-003-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=OPS-003 --planApprovalRef=docs/process/approvals/OPS-003.json --closeoutKey=ops-003-ops-improvement-rollup-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=OPS-003 --closeoutKey=ops-003-ops-improvement-rollup-v1`
- `npm run process:foundation-ship -- --card=OPS-003 --planApprovalRef=docs/process/approvals/OPS-003.json --closeoutKey=ops-003-ops-improvement-rollup-v1 --commitRef=HEAD`

Dogfood must reject:

- a formula that still references `NPS Scores & Reviews`
- `Ops Satisfaction!F5` subtracting `D4`
- latest-row formulas without nonblank row guards
- a false-green state where formula repair is still required

## Not Next

- No Drive permission mutation.
- No ClickUp, FUB, finance, credential, OAuth, provider, or external send mutation.
- No broad Freedom rebuild or bonus-system redesign.
- No new dashboard surface beyond source-health/current-state wording already owned by this card.
- No paid/provider/browser-auth extraction work.
