# SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001 Plan

## What

Design the database provenance model for the 3 array-backed `source_ids` relations that cannot safely receive simple scalar foreign keys.

This is a report-only Foundation data-integrity card. It does not create tables, install triggers, backfill rows, mutate source contracts, or change hub behavior.

## Why

The scalar source-ID migration now enforces 10 single-source `source_id` references through `source_contract_registry(source_id)`. Three remaining relations use `source_ids` arrays because one artifact, retrieval run, or synthesized item can cite multiple sources.

Forcing those arrays into simple foreign keys would create fake safety: PostgreSQL cannot enforce each array element with a normal FK, generated scalar projections would drop multi-source provenance, and trigger-only checks would still be hard to query. Steve needs the Foundation to move source truth up into hubs without provenance drift, so the next step is a clean normalized design before any schema mutation.

The useful operator behavior this unlocks is quality and speed in the real source-to-hub workflow: when build intel, meetings, shared communications, and later hub data cite multiple sources, Steve and the team can trace those sources as first-class provenance instead of trusting a loose array blob. This is a narrow V1 design card that keeps future implementation fast because the enforcement target is explicit before any database work starts.

## Acceptance Criteria

- The design derives the target relation list from `getSourceIdConstraintContractRows()` and selects exactly the 3 rows where `valueShape` is `array` and classification is `needs_schema_design`.
- Scalar `source_id` relations are explicitly excluded from this card.
- Each array relation gets a concrete normalized child-table recommendation with a `source_id` FK to `source_contract_registry(source_id)`.
- The design names why a simple FK on the array column is rejected.
- The design names why generated scalar projection is rejected for canonical enforcement.
- The design allows trigger-backed validation only as a temporary compatibility guard, not canonical truth.
- The design includes an apply-gated implementation sequence for a later card: create child table, backfill, validate invalid source IDs, dual-write from application/write path, then optionally retire or keep the compatibility array.
- Dogfood proof rejects unsafe designs through the actual function path: simple array FK, non-report-only posture, missing child-table FK, missing backfill/apply gate, scalar relation leakage, and wrong relation count.
- Focused proof is read-only: no `ALTER TABLE`, `CREATE TABLE`, trigger install, backlog mutation, sprint mutation, provider call, or file write.
- No substring-only proof is accepted; synthetic bad designs must fail through the real evaluator, not by checking source markers.
- Source-contract verifier and root `foundation:verify` include coverage for this design.
- Current Sprint, live backlog, approval, durable Plan Critic run, docs, closeout record, and full ship gate agree.

## Definition Of Done

- `lib/source-id-array-provenance-design.js` owns constants, design row derivation, design recommendations, evaluator, and dogfood proof.
- `scripts/process-source-id-array-provenance-design-check.mjs` proves approval, Plan Critic, live sprint/backlog state, relation selection, scalar exclusion, recommendation shape, dogfood, read-only posture, package script, verifier wiring, docs, and closeout.
- `package.json` exposes `process:source-id-array-provenance-design-check`.
- `lib/foundation-source-contract-verifier.js`, `scripts/process-verifier-source-contracts-module-check.mjs`, and `scripts/foundation-verify.mjs` verify the array provenance design.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the sprint status and the no-mutation boundary.
- `docs/handoffs/2026-05-16-source-id-array-provenance-design-closeout.md` records the closeout.
- Recent Builds closeout registry includes `source-id-array-provenance-design-v1`.

## Details

Existing code, existing docs, existing scripts, and live truth to reuse:

- `lib/source-id-constraint-contract.js`
- `lib/source-id-scalar-fk-migration.js`
- `lib/foundation-source-contract-verifier.js`
- `scripts/process-verifier-source-contracts-module-check.mjs`
- `scripts/foundation-verify.mjs`
- existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and source-ID closeouts
- existing scripts: `process:source-id-constraint-contract-check`, `process:source-id-scalar-fk-migration-check`, and `process:verifier-source-contracts-module-check`
- live backlog, Current Sprint, Plan Critic ledger, source-contract registry proof, and scalar FK proof

Recommended canonical design:

- `intelligence_report_artifacts.source_ids` becomes enforced through a later `intelligence_report_artifact_sources` child table keyed by report artifact row plus `source_id`, with ordinal and provenance role metadata. The existing array can remain as a compatibility cache while reads migrate.
- `intelligence_retrieval_runs.source_ids` becomes enforced through a later `intelligence_retrieval_run_sources` child table keyed by retrieval run plus `source_id`, with ordinal and retrieval/filter metadata. The array stays compatibility-only until write paths dual-write.
- `shared_communication_synthesized_items.source_ids` becomes enforced through a later `shared_communication_synthesized_item_sources` child table keyed by synthesized item plus `source_id`, with ordinal and evidence-role metadata. Canonical evidence queries use the child table.

Implementation posture for this card:

- Build only the report-only design/evaluator and proof.
- Do not mutate PostgreSQL schema.
- Do not install triggers.
- Do not backfill data.
- Do not change writers.
- Do not migrate hub reads.
- Keep `lib/foundation-db.js` unchanged.
- `scripts/foundation-verify.mjs` is over the 5,000-line danger line, so this plan adds no new responsibility there: keep it as a thin wrapper/import/call only, and put all design behavior in the new module plus the focused proof script.

Later apply-gated implementation sequence:

1. Create the child table with FKs to the parent table and `source_contract_registry(source_id)`.
2. Backfill child rows from existing array values in an apply-gated migration.
3. Abort apply if any array element is missing from the active source-contract registry.
4. Add write-path dual-write so parent row updates and child provenance rows stay aligned.
5. Add verifier checks for parent/child parity and invalid source IDs.
6. Decide after production proof whether to retire the array, keep it as a cache, or make it generated from the child table.

Dogfood proof must use actual function paths and synthetic bad designs. It must reject a design that claims a simple FK can enforce an array column, a design that omits child-table FK enforcement, a design that leaks scalar relations into the card, a design without apply-gated backfill, and a design that tries to be mutating instead of report-only. This rejects substring-only proof and proves behavior through the evaluator output.

Gate decision tree:

- Static gate: `node --check` for changed JS and scripts.
- Focused gate: `npm run process:source-id-array-provenance-design-check -- --json`.
- Regression gate: `npm run process:verifier-source-contracts-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001.json --closeoutKey=source-id-array-provenance-design-v1 --commitRef=HEAD`.
- If Plan Critic returns revise, keep the card in Scoping until the plan is corrected and a durable pass row exists.

Check-script apply posture:

- `scripts/process-source-id-array-provenance-design-check.mjs` is read-only and has no `--apply` mode.
- No startup/init path creates array provenance tables or repairs source arrays automatically.

Speed budget:

- Focused proof should stay fast and run under 10 seconds.
- Source-contract verifier regression should stay fast and under 10 seconds.
- Full Foundation ship gate must stay under the existing 300 second budget.

## Risks

- **Fake FK risk:** a plan could claim array columns are enforced by normal FK constraints. Mitigation: evaluator and dogfood reject simple array-FK enforcement.
- **Queryability risk:** trigger-only validation could prevent bad writes but still leave provenance hard to query. Mitigation: normalized child table is canonical; trigger-only is temporary compatibility guard.
- **Data-loss risk:** generated scalar projection could pick a primary source and lose secondary provenance. Mitigation: generated scalar projection is explicitly rejected for canonical enforcement.
- **Migration risk:** child tables require parent keys and backfill sequencing. Mitigation: this card only designs the migration; a later apply-gated implementation must preflight invalid source IDs and run in a transaction.
- **Overreach risk:** source extraction, hub features, or paid-source auth could drift into this data-integrity card. Mitigation: not-next boundaries are explicit and proof checks report-only posture.
- **Repair path:** if proof fails, keep the card active, revise the design/evaluator, and do not proceed to schema implementation until this report-only design is green.

## Tests

```sh
node --check lib/source-id-array-provenance-design.js scripts/process-source-id-array-provenance-design-check.mjs lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run process:source-id-array-provenance-design-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001.json --closeoutKey=source-id-array-provenance-design-v1 --commitRef=HEAD
```

Not next: no DB schema mutation, no trigger installation, no join-table creation, no backfill apply, no source-contract authoring UI, no startup/init FK creation, no source extraction, no connector auth, no paid-source auth, no Build Intel extraction, no hub feature work, no Marketing Video Lab wiring, no Canva asset mutation, no Drive permissions mutation, no Drive permissions request-access emails, and no MEETING-VAULT-ACL-001 Phase B.
