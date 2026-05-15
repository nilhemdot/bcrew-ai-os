# FOUNDATION-DB-MONOLITH-SPLIT-006 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-006`
Sprint: `foundation-db-strategy-goal-truth-split-2026-05-15`
Closeout key: `foundation-strategy-goal-truth-split-v1`

## What

Extract the Strategy Prework Coverage and Strategy Goal Truth snapshot builders from `lib/foundation-db.js` into a focused `lib/foundation-strategy-goal-truth.js` module.

V1 moves only the source-truth read/build boundary for:

- Strategy prework participant coverage over `shared_communication_artifacts`.
- Strategy goal truth over BHAG and Agent Engine doc source snapshots.
- Pure participant inference, artifact mapping, goal fact normalization, status, and group-building helpers.

`lib/foundation-db.js` keeps pool ownership, public exports, schema/init, doc source snapshot persistence, source crawl, intelligence, shared communications, FUB storage, sales storage, and all other DB stores. The new module receives live dependencies from `lib/foundation-db.js`: `pool` and `getDocSourceSnapshot`. This avoids circular imports while moving Strategy source-truth builder logic out of the DB monolith.

## Why

`lib/foundation-db.js` is still above the architecture-risk line after the previous DB splits. The Strategy Prework Coverage and Strategy Goal Truth builders are a natural next module boundary because they read source-backed evidence and assemble operator-facing Strategy truth; they are not generic DB persistence, schema migration, backlog, sprint, or shared communications write behavior.

Root invariant: this is an extraction only. Participant expectations, title/current-cycle detection, read-method labels, doc paths, source IDs, goal group labels, rules, caveats, and public return shapes must remain unchanged.

Operator value: Steve keeps the same Strategy evidence and goal-truth surfaces, while the DB monolith gets smaller and future Strategy source-truth changes have a named module instead of landing beside unrelated DB persistence code.

## Acceptance Criteria

- `lib/foundation-strategy-goal-truth.js` owns `getStrategyPreworkCoverageSnapshot()`, `getStrategyGoalTruthSnapshot()`, and their pure helpers.
- `lib/foundation-db.js` exports wrappers that delegate to the new module while passing `pool` and `getDocSourceSnapshot`.
- Existing public imports of `getStrategyPreworkCoverageSnapshot()` and `getStrategyGoalTruthSnapshot()` continue to work without caller changes.
- Strategy goal doc paths and source IDs remain unchanged:
  - `docs/strategy/bhag-model.md`
  - `docs/strategy/agent-engine.md`
  - `SRC-GDRIVE-001`
  - `SRC-FREEDOM-BHAG-001`
  - `SRC-FREEDOM-ENGINE-001`
  - `SRC-FREEDOM-COMMUNITY-001`
  - `SRC-OWNERS-001`
- Strategy goal group keys remain unchanged: `team_volume`, `community_agents`, and `agent_engine_capacity`.
- Focused proof is read-only by default and dogfoods the unsafe old shape: inline Strategy prework/goal truth ownership in `foundation-db.js` fails, delegated module ownership passes, and synthetic fixtures preserve expected participant, artifact, and goal group shape.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-strategy-goal-truth-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-strategy-goal-truth-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused gate proves the Strategy goal-truth module extraction and dogfood behavior, and full gate is required because this card changes `lib/foundation-db.js`, a new Foundation module, package scripts, verifier coverage, closeout records, and live sprint/backlog state. It therefore requires focused proof plus full `foundation:verify` and `process:foundation-ship` before push.

## Details

Existing code to reuse: the current Strategy Prework Coverage and Strategy Goal Truth builder functions in `lib/foundation-db.js`, `getDocSourceSnapshot()`, `BHAG_DOC_PATH` and `AGENT_ENGINE_DOC_PATH` from `lib/foundation-strategy-source-snapshots.js`, the existing Plan Critic and approval-integrity process, and the existing Foundation DB split proof-script pattern.

Implementation shape: create `lib/foundation-strategy-goal-truth.js` with named exports for the live snapshot builders plus pure evaluator/dogfood helpers. Update `lib/foundation-db.js` to import the module and export small delegating wrappers.

Verifier/check posture: the focused proof script is read-only. It must not call live Google APIs, mutate live DB, run bootstrap seed writes, update backlog/sprint state, write reports, or call live provider/auth routes. It may inspect source files, import pure helpers, run synthetic row fixtures, verify real module/delegation shape, and read existing Current Sprint / Plan Critic state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live Google, external auth, and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push, but the card-specific proof remains fast enough to use repeatedly during the split.

## Risks

- Risk: Moving the builder changes Strategy participant or current-cycle detection.
  - Repair path: focused proof verifies expected participant keys and synthetic current-cycle artifact mapping.
- Risk: Moving the builder changes BHAG or Agent Engine doc path semantics.
  - Repair path: focused proof verifies the exact doc path constants and goal group keys remain present in the module.
- Risk: Circular import breaks Strategy Operating Truth, which depends on `getStrategyGoalTruthSnapshot()`.
  - Repair path: the new module accepts `pool` and `getDocSourceSnapshot` as dependencies, while `lib/foundation-db.js` keeps the public wrapper and passes that wrapper into Strategy Operating Truth.
- Risk: This becomes a broad DB refactor.
  - Repair path: no schema changes, no doc source snapshot writes, no source crawl/job/intelligence/shared-comms/FUB/sales/hub movement, no public API changes, no seed movement, and no paid-source auth.

## Tests

```bash
node --check lib/foundation-strategy-goal-truth.js scripts/process-foundation-strategy-goal-truth-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-strategy-goal-truth-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-006 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-006.json --closeoutKey=foundation-strategy-goal-truth-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: Strategy Prework Coverage and Goal Truth source-builder logic buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the builders and `foundation-db.js` delegates to it.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Google source IDs, doc paths, labels, participant names, goal labels, rules, caveats, or return shapes.
- Do not change `doc_source_snapshots` schema, writes, or API shape.
- Do not move BHAG / Agent Engine source snapshot behavior already split in `FOUNDATION-DB-MONOLITH-SPLIT-004`.
- Do not move Strategy Operating Truth behavior already split in `FOUNDATION-DB-MONOLITH-SPLIT-005`.
- Do not move schema init, bootstrap seeds, source crawl, foundation jobs, intelligence, shared communications, sales, FUB storage, or hub behavior.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run live paid-source auth.
- Do not run `MEETING-VAULT-ACL-001 Phase B`.
- Do not mutate Drive permissions.
- Do not send request-access emails.
