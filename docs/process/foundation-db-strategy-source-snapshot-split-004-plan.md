# FOUNDATION-DB-MONOLITH-SPLIT-004 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-004`
Sprint: `foundation-db-strategy-source-snapshot-split-2026-05-15`
Closeout key: `foundation-strategy-source-snapshot-split-v1`

## What

Extract the source-backed BHAG and Agent Engine doc snapshot builders from `lib/foundation-db.js` into a focused `lib/foundation-strategy-source-snapshots.js` module.

V1 moves only the bounded Strategy/BHAG source snapshot section: source IDs/doc paths, Toronto date helpers used by the Strategy source snapshots, numeric/format helpers shared by the DB file, `getLiveBhagSourceSnapshot()`, and `getLiveAgentEngineSourceSnapshot()`. `lib/foundation-db.js` keeps pool ownership, schema/init, `doc_source_snapshots` writes/reads, source crawl, intelligence, shared communications, finance snapshot behavior, and public DB exports.

## Why

`lib/foundation-db.js` is still above the architecture-risk line after the seed split. The Strategy/BHAG source snapshot builders are a natural module boundary because they do Google Sheet reads and source-backed Strategy math, not DB schema/store behavior.

Root invariant: this is an extraction only. Google source IDs, ranges, source IDs, doc paths, labels, sort orders, and `doc_source_snapshots` persistence must behave the same after the split.

Operator value: Steve can keep trusting the BHAG / Agent Engine source-backed Strategy facts while the DB monolith gets smaller. When future Strategy math changes, the code lives in a named source snapshot module instead of being buried beside schema, backlog stores, and unrelated DB behavior.

## Acceptance Criteria

- `lib/foundation-strategy-source-snapshots.js` owns `getLiveBhagSourceSnapshot()` and `getLiveAgentEngineSourceSnapshot()`.
- `lib/foundation-db.js` imports those snapshot builders and no longer defines them inline.
- Numeric/currency helpers still used by the finance snapshot path remain available without duplicating logic.
- Source-backed Google ranges and source IDs are unchanged.
- Focused proof is read-only by default and dogfoods the unsafe old shape: inline Strategy source builder ownership in `foundation-db.js` fails, delegated module ownership passes, and pure synthetic row proof preserves expected snapshot row shape.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-strategy-source-snapshot-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-strategy-source-snapshot-split-v1`.

## Details

Existing code to reuse: the current source-backed BHAG / Agent Engine builders in `lib/foundation-db.js`, existing `getSheetValues()` delegated Google access, existing `doc_source_snapshots` persistence, existing DB split proof patterns, and `FOUNDATION-DB-MONOLITH-SPLIT-003` module/evaluator style.

Implementation shape: create `lib/foundation-strategy-source-snapshots.js` with named exports for the two live snapshot builders plus the pure helpers still used by `lib/foundation-db.js`. Update `lib/foundation-db.js` to import those functions and preserve the existing `refreshDocSourceSnapshots()` / `getLiveDocSourceSnapshot()` behavior.

Verifier/check posture: the focused proof script is read-only. It must not call live Google APIs, mutate live DB, run bootstrap seed writes, update backlog/sprint state, or write reports. It may inspect source files, import pure helpers, run synthetic row fixtures, and verify the real module/delegation shape. Full Foundation ship gate is required because `lib/foundation-db.js`, package scripts, verifier coverage, closeout records, and rebuild docs change.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live Google and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push, but the card-specific proof remains fast enough to use repeatedly during the split.

## Risks

- Risk: Moving builders changes Google source ranges or source IDs.
  - Repair path: focused proof verifies required ranges/source IDs remain in the module and not in the DB monolith.
- Risk: Finance snapshot formatting breaks because helpers move.
  - Repair path: keep `parseNumber()` and `formatCompactCurrency()` as exported helpers and run syntax plus focused proof.
- Risk: This accidentally runs live Google reads inside the focused check.
  - Repair path: focused proof uses synthetic fixtures and static/module inspection only; live source behavior is covered by full verifier and existing health gates.
- Risk: This becomes a broad DB refactor.
  - Repair path: no schema changes, no source crawl/job/intelligence/shared-comms/sales/hub movement, no public API changes, no seed movement, and no doc snapshot persistence rewrite.

## Tests

```bash
node --check lib/foundation-strategy-source-snapshots.js scripts/process-foundation-strategy-source-snapshot-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-strategy-source-snapshot-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-004 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-004.json --closeoutKey=foundation-strategy-source-snapshot-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: source-backed Strategy/BHAG snapshot builder logic buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the builders and `foundation-db.js` imports them.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Google source IDs, ranges, labels, doc paths, or sort orders.
- Do not change `doc_source_snapshots` schema, writes, or API shape.
- Do not move finance snapshot behavior in this card.
- Do not move schema init, bootstrap seeds, source crawl, foundation jobs, intelligence, shared communications, sales, FUB, or hub behavior.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run live paid-source auth.
- Do not run `MEETING-VAULT-ACL-001 Phase B`.
- Do not mutate Drive permissions.
- Do not send request-access emails.
