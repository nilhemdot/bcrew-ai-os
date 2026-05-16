# SOURCE-CONTRACT-REGISTRY-TABLE-001 Plan

## What

Build the first DB-backed source-contract registry table so future source-ID foreign-key constraints have a real referenced table instead of relying on markdown or code-only source contracts.

V1 creates schema, an explicit apply sync command, a read-only focused check, dogfood proof, and verifier coverage. It does not add foreign keys to source-reference tables.

## Why

`SOURCE-ID-CONSTRAINT-CONTRACT-001` classified 13 DB source-reference relations and found 10 scalar relations that are shape-safe for future FK enforcement after a DB-backed source registry exists.

The next root step is not to add broad FKs immediately. The safe step is to materialize source contracts into Postgres with an explicit sync boundary, then let later cards add scalar FKs or redesign array-backed provenance from a real registry.

The operator value is concrete: Steve can answer "which source IDs are live DB truth right now?" from Postgres, and future schema hardening can reference that table instead of treating source IDs as loose strings. The useful product behavior is a real workflow where source-health, verifier, and later hub reads can point at the same DB-backed source registry instead of translating markdown/code-only source lists by hand.

## Acceptance Criteria

- A `source_contract_registry` table exists with `source_id` as primary key and stores metadata-only source contract rows.
- `initFoundationDb()` only creates the schema; it does not silently sync or repair source-contract rows.
- A dedicated sync path upserts registry rows from `getSourceContracts()` only when called with explicit `--apply` posture.
- The sync path is idempotent and records `contract_hash`, `contract_payload`, `synced_at`, and `synced_by`.
- The read-only focused proof validates live DB rows match the current code source-contract set.
- The evaluator rejects duplicate source IDs, missing source IDs, stale hashes, inactive current sources, extra active DB rows, and invalid source IDs.
- The focused proof script is read-only by default and does not mutate backlog, Current Sprint, source contracts, extraction, connectors, or paid APIs.
- Current Sprint, live backlog, approval file, and durable Plan Critic row all agree before build.
- Source-contract verifier coverage proves the registry table exists, rows are synced, and dogfood rejection behavior passes.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/source-contract-registry-table.js` owns schema SQL, row normalization, hash/evaluator logic, sync helpers, snapshot helpers, and dogfood proof.
- `scripts/sync-source-contract-registry.mjs` supports dry-run by default and requires `--apply` for DB writes.
- `scripts/process-source-contract-registry-table-check.mjs` validates approval, Plan Critic, live backlog/current sprint, table/schema, synced rows, dogfood, read-only posture, package scripts, rebuild docs, and closeout registration.
- `package.json` exposes `source-contract-registry:sync` and `process:source-contract-registry-table-check`.
- `lib/foundation-db.js` creates the table schema, exports the sync/snapshot helpers, and includes the table in the read-only gate table list.
- `lib/foundation-source-contract-verifier.js`, `scripts/process-verifier-source-contracts-module-check.mjs`, and `scripts/foundation-verify.mjs` have thin coverage for this registry table.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-source-contract-registry-table-closeout.md` exists.
- Recent Builds closeout registry includes `source-contract-registry-table-v1`.

## Details

Existing code, docs, scripts, and live backlog truth to reuse:

- `getSourceContracts()` in `lib/source-contracts.js`.
- `SOURCE-ID-CONSTRAINT-CONTRACT-001` and `lib/source-id-constraint-contract.js` for the FK-readiness input.
- `getFoundationDbConstraintAudit()` in `lib/foundation-db.js` for source-reference audit context.
- `lib/foundation-source-contract-verifier.js` and `scripts/process-verifier-source-contracts-module-check.mjs`.
- `scripts/process-source-id-constraint-contract-check.mjs` as the prior focused proof shape.
- `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and the live backlog/current sprint tables.

Implementation shape:

- Add `source_contract_registry` as a compact metadata registry, not a new source-contract authoring system.
- Keep `lib/source-contracts.js` as the current source-contract definition source for V1.
- Use a stable hash over the normalized metadata payload so stale DB rows are observable.
- Sync rows through an explicit `source-contract-registry:sync -- --apply` command, not through startup repair.
- Mark rows missing from code as inactive only during explicit apply; never silently mutate during `initFoundationDb()` or `foundation:verify`.
- Keep this as the registry prerequisite for later scalar FK work.

Split/extraction plan:

- Do not grow `lib/foundation-db.js` with broad business logic; delegate registry behavior to `lib/source-contract-registry-table.js`.
- Do not add broad inline verifier logic to `scripts/foundation-verify.mjs`; pass snapshot/dogfood into the source-contract verifier module.
- Keep the focused proof read-only and use the sync script for the one explicit DB write path.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Sync gate: `npm run source-contract-registry:sync -- --apply --actor=codex-source-contract-registry-table`.
- Focused gate: `npm run process:source-contract-registry-table-check -- --json`.
- Regression gate: `npm run process:verifier-source-contracts-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-CONTRACT-REGISTRY-TABLE-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-REGISTRY-TABLE-001.json --closeoutKey=source-contract-registry-table-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-source-contract-registry-table-check.mjs` is read-only and has no `--apply` path.
- It must not call `updateBacklogItem()`, `createBacklogItem()`, `upsertFoundationCurrentSprintOverlay()`, raw live-table mutation SQL, external connectors, paid APIs, source extraction, or `fs.writeFile`.
- `scripts/sync-source-contract-registry.mjs` is the only write path and must require `--apply`.

Speed budget:

- Focused proof should run under 10 seconds.
- Source-contract split proof should remain under 10 seconds.
- Full Foundation ship gate must stay under the existing 300 second budget.

## Risks

- **Startup repair risk:** putting sync inside `initFoundationDb()` would recreate the self-repairing truth pattern. Mitigation: schema creation only in init; row sync is explicit apply.
- **Broad FK overreach risk:** this card can drift into adding source-ID FKs. Mitigation: no FK constraints are added; later cards use this registry as prerequisite.
- **Stale registry risk:** DB rows can drift from code contracts. Mitigation: stable hashes and focused verifier coverage fail when rows are missing, extra, inactive, or stale.
- **Sensitive payload risk:** source contracts include links and metadata. Mitigation: store metadata-only source contract payloads already visible in Foundation source surfaces; no secrets or credential values.
- **Rollback path:** remove the new table sync exports/scripts/verifier wiring and leave source IDs under the existing verifier-backed contract until a safer registry design is approved.

## Tests

```sh
node --check lib/source-contract-registry-table.js scripts/sync-source-contract-registry.mjs scripts/process-source-contract-registry-table-check.mjs lib/foundation-db.js lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run source-contract-registry:sync -- --apply --actor=codex-source-contract-registry-table
npm run process:source-contract-registry-table-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-CONTRACT-REGISTRY-TABLE-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-REGISTRY-TABLE-001.json --closeoutKey=source-contract-registry-table-v1 --commitRef=HEAD
```

Not next: no source-ID FK constraints, no array-backed provenance redesign, no source-contract authoring UI, no route redesign, no seed/live overwrite, no source extraction, no connector auth, no paid-source auth, no Build Intel extraction, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no Drive permissions mutation, no Drive permissions request-access emails, and no MEETING-VAULT-ACL-001 Phase B.
