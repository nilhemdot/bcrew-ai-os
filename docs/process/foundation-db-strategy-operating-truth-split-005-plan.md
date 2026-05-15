# FOUNDATION-DB-MONOLITH-SPLIT-005 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-005`
Sprint: `foundation-db-strategy-operating-truth-split-2026-05-15`
Closeout key: `foundation-strategy-operating-truth-split-v1`

## What

Extract the Strategy Operating Truth source-card builder from `lib/foundation-db.js` into a focused `lib/foundation-strategy-operating-truth.js` module.

V1 moves only the pure source-card construction boundary for finance, Owners, FUB, and KPI operating truth: sheet metric helpers, source fact/card helpers, conditional collection facts, and the `getStrategyOperatingTruthSnapshot()` implementation. `lib/foundation-db.js` keeps pool ownership, public exports, schema/init, source crawl, intelligence, shared communications, FUB snapshot storage, `doc_source_snapshots`, and all other DB stores.

The new module receives the live dependencies it needs from `lib/foundation-db.js`: `pool`, `getFubLeadSourceSnapshot`, and `getStrategyGoalTruthSnapshot`. This avoids a circular import while moving the live Strategy operating source-card logic out of the DB monolith.

## Why

`lib/foundation-db.js` is still above the architecture-risk line after the previous DB split. The Strategy Operating Truth builder is a natural module boundary because it reads signed-off source systems and builds operator-facing Strategy truth cards; it is not schema, migration, backlog, sprint, or generic DB-store behavior.

Root invariant: this is an extraction only. Google sheet IDs/ranges, source IDs, labels, current-read text, guardrails, KPI backlog IDs, and public return shape must remain unchanged.

Operator value: Steve can keep relying on the Strategy Operating Truth snapshot to stop hallucinated "build this source" recommendations while the DB monolith gets smaller. Future finance/Owners/FUB/KPI source-card changes will live in a named source-truth module instead of being buried beside unrelated DB persistence code.

## Acceptance Criteria

- `lib/foundation-strategy-operating-truth.js` owns `getStrategyOperatingTruthSnapshot()` and the source-card helpers for finance, Owners, FUB, and KPI operating truth.
- `lib/foundation-db.js` exports a wrapper that delegates to the new module while passing `pool`, `getFubLeadSourceSnapshot`, and `getStrategyGoalTruthSnapshot`.
- Existing public imports of `getStrategyOperatingTruthSnapshot()` continue to work without caller changes.
- Google ranges and source IDs are unchanged:
  - `'Cashflow Dash'!A1:J25`
  - `'(Input) Weekly Actuals'!A1:BR8`
  - `'Listings and Conditional Deals'!A1:B12`
  - `SRC-FINANCE-001`, `SRC-OWNERS-001`, `SRC-FUB-001`, `SRC-SUPABASE-001`
- Focused proof is read-only by default and dogfoods the unsafe old shape: inline Strategy Operating Truth source-card ownership in `foundation-db.js` fails, delegated module ownership passes, and synthetic source rows preserve the expected finance/Owners/FUB/KPI card shape.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-strategy-operating-truth-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-strategy-operating-truth-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused gate proves the Strategy Operating Truth module extraction and dogfood behavior, and full gate is required because this card changes `lib/foundation-db.js`, a new Foundation module, package scripts, verifier coverage, closeout records, and live sprint/backlog state. It therefore requires focused proof plus full `foundation:verify` and `process:foundation-ship` before push.

## Details

Existing code to reuse: the current Strategy Operating Truth builder in `lib/foundation-db.js`, `getDriveFileMetadata()` / `getSheetValues()` delegated Google access, `getSourceContracts()`, `parseNumber()` / `formatCompactCurrency()` from `lib/foundation-strategy-source-snapshots.js`, the existing FUB lead-source snapshot reader, and the existing KPI backlog-card query.

Implementation shape: create `lib/foundation-strategy-operating-truth.js` with named exports for the live snapshot builder plus pure evaluator/dogfood helpers. Update `lib/foundation-db.js` to import the module and export a small delegating wrapper.

Verifier/check posture: the focused proof script is read-only. It must not call live Google APIs, mutate live DB, run bootstrap seed writes, update backlog/sprint state, write reports, or call live provider/auth routes. It may inspect source files, import pure helpers, run synthetic row fixtures, and verify the real module/delegation shape. Full Foundation ship gate is required because `lib/foundation-db.js`, package scripts, verifier coverage, closeout records, and rebuild docs change.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live Google and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push, but the card-specific proof remains fast enough to use repeatedly during the split.

## Risks

- Risk: Moving the builder changes Google sheet ranges or source IDs.
  - Repair path: focused proof verifies the exact ranges/source IDs remain in the module and the DB monolith delegates.
- Risk: Circular import breaks the live Strategy snapshot path.
  - Repair path: the new module accepts `pool`, `getFubLeadSourceSnapshot`, and `getStrategyGoalTruthSnapshot` as dependencies instead of importing `lib/foundation-db.js`.
- Risk: KPI cards or FUB source facts disappear from the Strategy operating truth response.
  - Repair path: synthetic proof verifies finance, Owners, FUB, and KPI cards are all present with expected source IDs and labels.
- Risk: This becomes a broad DB refactor.
  - Repair path: no schema changes, no source crawl/job/intelligence/shared-comms/sales/hub movement, no FUB storage movement, no public API changes, no seed movement, and no doc snapshot persistence rewrite.

## Tests

```bash
node --check lib/foundation-strategy-operating-truth.js scripts/process-foundation-strategy-operating-truth-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-strategy-operating-truth-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-005 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-005.json --closeoutKey=foundation-strategy-operating-truth-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: source-card Strategy Operating Truth logic for finance/Owners/FUB/KPI buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the builder and `foundation-db.js` delegates to it.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Google source IDs, ranges, labels, doc paths, or source IDs.
- Do not change `doc_source_snapshots` schema, writes, or API shape.
- Do not move BHAG / Agent Engine snapshot behavior already split in `FOUNDATION-DB-MONOLITH-SPLIT-004`.
- Do not move schema init, bootstrap seeds, source crawl, foundation jobs, intelligence, shared communications, sales, FUB storage, or hub behavior.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run live paid-source auth.
- Do not run `MEETING-VAULT-ACL-001 Phase B`.
- Do not mutate Drive permissions.
- Do not send request-access emails.
