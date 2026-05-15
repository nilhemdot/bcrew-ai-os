# FOUNDATION-DB-MONOLITH-SPLIT-003 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-003`
Sprint: `foundation-db-core-seed-split-2026-05-15`
Closeout key: `foundation-core-seed-split-v1`

## What

Extract the remaining static Foundation bootstrap seed arrays from `lib/foundation-db.js` into a focused `lib/foundation-core-seed.js` module without changing bootstrap behavior or live Postgres truth.

V1 moves only static seed/default data: Foundation users, locked decisions, parking-lot items, open questions, memory status rows, and default doc source snapshots. `lib/foundation-db.js` keeps pool ownership, schema/init, source-backed live snapshot builders, source crawl, intelligence, shared communications, and public DB exports.

## Why

`lib/foundation-db.js` is still above the architecture-risk line at roughly 13.2K lines after the first DB store splits. The next safest cut is static bootstrap seed data because it is large, naturally bounded, and should not be confused with live operational truth.

Root invariant: live Postgres/API remains operational truth after bootstrap. Seed modules are bootstrap/default doctrine only. Moving seed arrays out of the DB monolith must not create an auto-repair path, verifier write path, or live-state overwrite.

## Acceptance Criteria

- `lib/foundation-core-seed.js` exports the static seed arrays for users, decisions, parking lot, open questions, memory status, and doc source snapshots.
- `lib/foundation-db.js` imports those arrays and no longer defines those seed arrays inline.
- Bootstrap seeding still receives the same seed IDs/counts.
- `initFoundationDb()` remains schema-only by default; bootstrap seed writes still require explicit `includeBootstrapSeed: true` through existing startup/bootstrap flow.
- Focused proof is read-only by default and dogfoods the unsafe old shape: inline seed ownership in `foundation-db.js` fails, imported seed ownership passes, and seed counts/IDs match expected invariants.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-core-seed-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-core-seed-split-v1`.

## Details

Existing code to reuse: `seedTable()`, `initFoundationDb()`, explicit `includeBootstrapSeed` posture, existing seed inserts, existing `DB-SEED-001` seed/live drift doctrine, `FOUNDATION-DB-INIT-SEED-SPLIT-001` schema-only guard, and current DB split proof patterns.

Implementation shape: create `lib/foundation-core-seed.js` with named exports. Update `lib/foundation-db.js` to import those named arrays and continue using them in the same bootstrap seed paths. Do not move source-backed live snapshot builders in this slice; those require Google source reads and are a separate bounded split.

Verifier/check posture: the focused proof script is read-only. It must not call live DB mutators, run bootstrap seed writes, update backlog/sprint state, or write reports. It may read source files and pure module exports.

Gate decision tree: static source proof is not enough by itself. The focused proof must read the actual module exports, compare seed IDs/counts against expected invariants, confirm the DB monolith delegates to the module, and prove the old inline ownership shape fails. Full Foundation ship gate is required because `lib/foundation-db.js`, package scripts, verifier coverage, closeout records, and rebuild docs change.

## Risks

- Risk: Moving seed arrays changes bootstrap content.
  - Repair path: focused proof validates expected seed IDs/counts and key IDs before ship.
- Risk: This accidentally treats seed as live truth.
  - Repair path: proof confirms `initFoundationDb()` default remains schema-only and this card adds no live write path.
- Risk: This becomes a broad DB refactor.
  - Repair path: no schema changes, no source crawl/job/intelligence/shared-comms/sales/hub movement, no public API changes, and no source-backed live snapshot builder movement.
- Risk: The verifier monolith grows again.
  - Repair path: verifier receives only thin delegated coverage; behavior stays in `lib/foundation-core-seed.js` and the focused script.

## Tests

```bash
node --check lib/foundation-core-seed.js scripts/process-foundation-core-seed-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-core-seed-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-003 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-003.json --closeoutKey=foundation-core-seed-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: static seed ownership buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the arrays and `foundation-db.js` imports them.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not move source-backed live BHAG / Agent Engine snapshot builders in this card.
- Do not move schema init, source crawl, foundation jobs, intelligence, shared communications, sales, FUB, or hub behavior.
- Do not change bootstrap seed content beyond moving ownership.
- Do not mutate live Postgres truth from verifier/check paths.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run paid-source auth.
- Do not run MEETING-VAULT-ACL-001 Phase B.
- Do not mutate Drive permissions.
- Do not send request-access emails.
