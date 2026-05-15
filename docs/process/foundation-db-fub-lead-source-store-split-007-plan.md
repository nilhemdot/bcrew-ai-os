# FOUNDATION-DB-MONOLITH-SPLIT-007 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-007`
Sprint: `foundation-db-fub-lead-source-store-split-2026-05-15`
Closeout key: `foundation-fub-lead-source-store-split-v1`

## What

Extract the FUB lead-source rules and snapshot store from `lib/foundation-db.js` into a focused `lib/foundation-fub-lead-source-store.js` module.

V1 moves only the storage and row-mapping boundary for:

- `listFubLeadSourceRules()`
- `getFubLeadSourceSnapshot(contextKey)`
- `upsertFubLeadSourceRule(input, actor)`
- `saveFubLeadSourceSnapshot(input, actor)`
- FUB lead-source rule/snapshot row mapping and input normalization helpers.

`lib/foundation-db.js` keeps the public exports as wrappers or re-exported store methods so existing callers do not change. Schema/init for `fub_lead_source_rules` and `fub_lead_source_snapshots` stays in `lib/foundation-db.js` for this slice.

## Why

`lib/foundation-db.js` is still above the architecture-risk line after the previous split. The FUB lead-source store is a narrow next cut because it is already cohesive, small enough to move safely, and Foundation-owned source-truth storage rather than Sales/Marketing hub feature work.

Root invariant: this is extraction only. Table names, SQL behavior, return shapes, actor defaults, conflict behavior, source normalization, scan payload shape, and existing callers must remain unchanged.

Operator value: Steve keeps the same FUB lead-source classifications and snapshots feeding Foundation/Strategy/Owners surfaces, while the DB monolith gets smaller and future FUB source-governance changes have a named module instead of landing beside unrelated DB code.

## Acceptance Criteria

- `lib/foundation-fub-lead-source-store.js` owns FUB lead-source row mapping, input normalization, list/get/upsert/save behavior, evaluator helpers, and dogfood proof.
- `lib/foundation-db.js` imports `createFubLeadSourceStore()` and keeps the existing public exports for `listFubLeadSourceRules`, `getFubLeadSourceSnapshot`, `upsertFubLeadSourceRule`, and `saveFubLeadSourceSnapshot`.
- Existing imports from `lib/foundation-db.js`, `server.js`, `lib/fub-source-routes.js`, and scripts continue to work without caller changes.
- SQL tables and columns remain unchanged: `fub_lead_source_rules` and `fub_lead_source_snapshots`.
- Rule return shape remains `{ source, marketingType, ownershipType, flagState, sourceGroup, notes, updatedAt, updatedBy }`.
- Snapshot return shape remains `{ contextKey, contextLabel, sources, scan, refreshedAt, refreshedBy }`.
- Focused proof is read-only by default and dogfoods the unsafe old shape: inline FUB lead-source store ownership in `foundation-db.js` fails, delegated module ownership passes, and synthetic store calls preserve list/get/upsert/save behavior with fake dependencies.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-fub-lead-source-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-fub-lead-source-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused gate proves the FUB lead-source store extraction and dogfood behavior, and full gate is required because this card changes `lib/foundation-db.js`, a new Foundation DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state. It therefore requires focused proof plus full `foundation:verify` and `process:foundation-ship` before push.

## Details

Existing code to reuse: the current FUB lead-source functions in `lib/foundation-db.js`, `withFoundationTransaction()`, the existing `create*Store()` split pattern, `lib/fub-source-routes.js` dependency injection, Strategy Operating Truth's `getFubLeadSourceSnapshot` dependency, Plan Critic, approval-integrity, and Foundation ship gates.

Implementation shape: create `lib/foundation-fub-lead-source-store.js` with `createFubLeadSourceStore({ pool, withFoundationTransaction })`. Update `lib/foundation-db.js` to instantiate the store after transaction helpers exist and export the four public functions from the store. Keep schema/init SQL in `lib/foundation-db.js`.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. The new module owns the FUB lead-source store boundary, and `lib/foundation-db.js` becomes a thin wrapper/export site for this responsibility instead of receiving new behavior. No new responsibility is added to the DB monolith. The `scripts/foundation-verify.mjs` touch adds read-only coverage only; it does not add verifier runtime responsibility, live-state repair, seed writes, or any DB mutation path.

Verifier/check posture: the focused proof script is read-only. It must not call live FUB APIs, refresh ClickUp/FUB data, mutate live DB, update backlog/sprint state, write reports, or call provider/auth routes. It may inspect source files, validate approval/current sprint/Plan Critic state, run synthetic fake-pool store calls, and verify module/delegation shape.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live FUB/ClickUp/auth calls and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push, but the card-specific proof remains fast enough to use repeatedly during the split.

## Risks

- Risk: Moving the store changes FUB rule or snapshot return shape.
  - Repair path: focused proof uses fake query rows and asserts exact mapped rule/snapshot shape.
- Risk: Moving save/upsert changes normalization or conflict behavior.
  - Repair path: fake transaction proof inspects query text, parameter values, defaults, and normalized sources.
- Risk: Strategy Operating Truth breaks because it depends on `getFubLeadSourceSnapshot`.
  - Repair path: keep the public `foundation-db.js` export name unchanged; no Strategy caller changes.
- Risk: This drifts into FUB route or Sales hub work.
  - Repair path: do not touch server route behavior, FUB API refresh logic, Sales listing assignments, or hub UI.

## Tests

```bash
node --check lib/foundation-fub-lead-source-store.js scripts/process-foundation-fub-lead-source-store-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-fub-lead-source-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-007 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-007.json --closeoutKey=foundation-fub-lead-source-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: FUB lead-source storage buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the store and `foundation-db.js` delegates the public exports.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change FUB lead-source table schema, indexes, constraints, columns, or migrations.
- Do not change FUB route behavior, FUB API refreshes, ClickUp integration, Sales listing assignment storage, or hub UI.
- Do not change Strategy Operating Truth behavior beyond preserving its existing dependency.
- Do not move schema init, bootstrap seeds, source crawl, foundation jobs, intelligence, shared communications, sales listing storage, agent feedback storage, or hub behavior.
- Do not touch Marketing Video Lab live wiring or Canva client work in this card.
- Do not run live paid-source auth.
- Do not run `MEETING-VAULT-ACL-001 Phase B`.
- Do not mutate Google Drive permissions.
- Do not send request-access emails.
