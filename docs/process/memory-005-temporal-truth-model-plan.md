# MEMORY-005 Temporal Truth Model Plan

## What

Implement the first temporal truth model for strategy and decision records.

- Card: `MEMORY-005`
- Title: Implement a temporal truth model for strategy and decisions
- Closeout key: `memory-005-temporal-truth-model-v1`
- Owner: Foundation Data
- Next card after close: `STRATEGY-001`

## Why

Foundation needs to answer “what is true now?” without losing what used to be true. Graphiti was deferred, but temporal truth cannot stay deferred because strategy, decisions, operating doctrine, and source-backed facts change over time.

Operator value: Steve should not have to read old chats or compare stale docs to know whether a decision or strategy fact is current, superseded, future-dated, or conflicting.

## Acceptance Criteria

- A reusable temporal truth contract exists for decision and strategy records.
- Temporal records support `validFrom`, `validUntil`, `supersededBy`, and computed `currentState` query rules.
- Decision DB/schema support exists for `valid_from`, `valid_until`, and `superseded_by`.
- Decision store read/write mapping preserves temporal fields and marks superseded decisions with `valid_until` / `superseded_by`.
- Strategy records can be normalized into the same temporal query model from source-backed values like `sourceId`, `asOf`, owner, and detail.
- Focused dogfood rejects overlapping current truth, future truth becoming current early, missing provenance, and invalid temporal windows.
- Operating Truths documents the model as meaning/rule doctrine, not live values.

## Definition Of Done

- `process:memory-005-check` reports `status=healthy`.
- Plan Critic reports pass at 9.8+.
- Live `decisions` table has `valid_from`, `valid_until`, and `superseded_by` columns.
- `MEMORY-005` is `done`, Current Sprint marks it `done_this_sprint`, and `STRATEGY-001` becomes the active blocker.
- `foundation:verify` and `process:foundation-ship` pass from committed repo truth.

## Details

Existing work reused:

- Existing code reused: `decisions` table, `foundation-decision-store.js`, pending doc update supersession behavior, decision review surfaces, `foundation-db.js`, and source-backed strategy snapshots that already carry `sourceId` and `asOf`.
- Existing docs reused: `docs/strategy/operating-truths.md`, prior Graphiti-deferred rebuild decision notes, and data-source maturity temporal-truth language.
- Existing scripts reused: Plan Critic, backlog hygiene, repeated-failure gate, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth reused for `MEMORY-005`, `STRATEGY-001`, active blocker state, proof commands, and not-next boundaries.

Behavior proof path:

- `normalizeTemporalTruthRecord()` maps decision and strategy-shaped rows into one temporal shape.
- `getCurrentTemporalTruthRecords()` answers current truth from `validFrom`, `validUntil`, `supersededBy`, status, and as-of time.
- `evaluateTemporalTruthRecords()` fails when records are missing provenance/owner/time windows or when more than one current record exists for the same truth key.
- `buildMemory005DogfoodProof()` proves old superseded truth stays historical, future truth does not become current early, overlapping current truth fails, missing provenance fails, and invalid date windows fail.
- The focused proof also checks live database schema, decision-store mapping, Operating Truths doctrine, closeout registry, package script, and Current Sprint progression.
- No substring-only proof is accepted: the real function path has to normalize temporal records, compute current state, reject weak synthetic cases, and inspect the live decision schema.
- Operator behavior: Steve can ask the real workflow question “what is true now?” and get current truth without losing history; this unlocks higher quality Strategy atoms and decision work instead of making Steve reread stale notes.
- Gate decision tree: static syntax checks first, focused `process:memory-005-check` second, then full gates because this card touches DB schema, decision-store behavior, Current Sprint truth, package scripts, closeout registry, and Foundation snapshots. The focused proof is intentionally fast and should stay under 2 minutes; full `process:foundation-ship` owns final blast-radius proof.

## Risks

- Risk: this turns into a broad memory/graph rebuild.
  - Mitigation: V1 only adds temporal fields, a query contract, decision-store mapping, and focused proof.
- Risk: temporal fields become another report-only note.
  - Mitigation: the focused proof checks live DB columns and code paths, not only markdown.
- Risk: current truth gets hidden by history cleanup.
  - Mitigation: superseded truth stays queryable; current-state is computed at query time.
- Risk: decisions get auto-applied.
  - Mitigation: this card does not lock/apply decisions or mutate external systems.
- Repair path if proof fails: fix the temporal contract/schema/store mapping. If a repair requires external writes, private broad extraction, credential/key mutation, Drive permission mutation, provider access, or decision lock/apply, park that action with exact blocker and continue safe sprint work.

## Tests

- `node --check lib/memory-005-temporal-truth-model.js scripts/process-memory-005-check.mjs lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/foundation-decision-store.js`
- `npm run process:memory-005-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MEMORY-005 --closeoutKey=memory-005-temporal-truth-model-v1`
- `npm run process:foundation-ship -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --commitRef=HEAD`

Dogfood must reject:

- overlapping current records for the same truth key
- missing provenance or owner
- invalid `validUntil <= validFrom`
- future truth being returned as current
- superseded truth being returned as current

## Not Next

- No Graphiti, vector memory rebuild, broad conversation import, or autonomous memory agent.
- No external model upload of private memory, chats, source data, or decision history.
- No automatic locking, applying, or rewriting decisions without explicit human approval.
- No Strategy Hub UI rebuild, Strategy atom system, governance workflow, or DATA-003 live-value rendering inside this card.
- No destructive history rewrite: superseded truth stays queryable as history.
