# SOURCE-ID-SCALAR-FK-MIGRATION-001 Plan

## What

Add apply-gated PostgreSQL foreign keys from the 10 scalar `fk_safe_now` `source_id` relations to `source_contract_registry(source_id)`.

This is the first real source-ID database enforcement slice after `SOURCE-ID-CONSTRAINT-CONTRACT-001` and `SOURCE-CONTRACT-REGISTRY-TABLE-001`. It only covers scalar `source_id` columns that the contract already classified as safe now.

## Why

The Foundation now has a DB-backed source-contract registry, but source references can still drift unless the database enforces the scalar references directly.

The operator value is trust: future extraction/artifact/atom rows cannot silently point at a non-registered source ID, and future source-ID hardening does not depend on another reminder in docs.

For Steve, this unlocks safer source-to-hub work: new rows created by real workflows must reference a registered source, so source evidence can move upward without quiet provenance drift. This improves Foundation quality without adding hub features.

## Acceptance Criteria

- The migration relation list is derived from `getSourceIdConstraintContractRows()` and includes exactly the 10 scalar `fk_safe_now` `source_id` relations.
- The 3 array-backed `source_ids` relations are explicitly excluded and remain for a future provenance redesign card.
- Dry-run is the default; schema mutation only happens through `source-id-scalar-fks:apply -- --apply`.
- Apply aborts before schema writes if `source_contract_registry` is stale/unhealthy or any scalar live source reference is not in the active registry.
- Apply adds/validates named FK constraints in a transaction and rolls back on failure.
- The focused proof verifies all 10 constraints exist, reference `source_contract_registry(source_id)`, and are validated.
- Dogfood proves array-backed relations cannot enter this scalar migration and unsafe identifiers are rejected.
- Behavior proof uses the actual function path and real DB round-trip: dry-run snapshot, apply-gated transaction, PostgreSQL constraint validation, focused proof query, and verifier regression. No substring-only proof is accepted.
- Source-contract verifier and root `foundation:verify` include scalar FK migration coverage.
- Current Sprint, live backlog, approval, durable Plan Critic run with pass score, docs, closeout record, and full ship gate agree.

## Definition Of Done

- `lib/source-id-scalar-fk-migration.js` owns constants, relation selection, constraint-name generation, snapshot evaluation, dogfood, and apply helper.
- `scripts/apply-source-id-scalar-fks.mjs` is dry-run by default and requires `--apply` for schema writes.
- `scripts/process-source-id-scalar-fk-migration-check.mjs` is read-only and proves plan approval, Plan Critic, sprint/backlog state, registry health, validated constraints, array exclusion, dogfood, package scripts, verifier coverage, docs, and closeout.
- `package.json` exposes `source-id-scalar-fks:apply` and `process:source-id-scalar-fk-migration-check`.
- `lib/foundation-source-contract-verifier.js`, `scripts/process-verifier-source-contracts-module-check.mjs`, and `scripts/foundation-verify.mjs` verify scalar FK enforcement.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the sprint status.
- `docs/handoffs/2026-05-16-source-id-scalar-fk-migration-closeout.md` records the closeout.
- Recent Builds closeout registry includes `source-id-scalar-fk-migration-v1`.

## Details

Existing code, docs, scripts, and live truth to reuse:

- `lib/source-id-constraint-contract.js`
- `lib/source-contract-registry-table.js`
- `scripts/sync-source-contract-registry.mjs`
- `lib/foundation-source-contract-verifier.js`
- `scripts/process-verifier-source-contracts-module-check.mjs`
- `scripts/foundation-verify.mjs`
- live backlog, Current Sprint, and Plan Critic ledger

Implementation shape:

- Use a new small module instead of growing `lib/foundation-db.js`.
- Derive scalar FK relations from the existing source-ID constraint contract; do not duplicate the relation contract manually.
- Generate deterministic constraint names that stay under PostgreSQL's 63-character identifier limit.
- Use `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY (...) REFERENCES source_contract_registry(source_id) NOT VALID`, followed by `VALIDATE CONSTRAINT`.
- If a constraint already exists, validate it idempotently.
- Keep the migration in one DB transaction.
- Dogfood and focused proof must reject weak behavior: array-backed relations are excluded by the real relation selector, unsafe identifiers throw before SQL is built, dry-run returns a preflight snapshot without commit, and the post-apply proof queries PostgreSQL metadata instead of trusting source markers.

Split/extraction plan:

- No new logic is added to `lib/foundation-db.js`.
- Root verifier only calls the focused snapshot helper and passes the result into the existing source-contract verifier module.
- The focused proof script is read-only and does not contain `ALTER TABLE`, backlog mutation, sprint mutation, raw writes, external connectors, or provider calls.

Gate decision tree:

- Static gate: `node --check` for changed JS and scripts.
- Dry-run gate: `npm run source-id-scalar-fks:apply -- --json`.
- Apply gate: `npm run source-id-scalar-fks:apply -- --apply --actor=codex-source-id-scalar-fk-migration --json`.
- Focused gate: `npm run process:source-id-scalar-fk-migration-check -- --json`.
- Regression gate: `npm run process:verifier-source-contracts-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-ID-SCALAR-FK-MIGRATION-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json --closeoutKey=source-id-scalar-fk-migration-v1 --commitRef=HEAD`.
- If Plan Critic returns revise, the card stays in Scoping/Building Now until the plan is tightened and a durable pass row exists.

Check-script apply posture:

- `scripts/process-source-id-scalar-fk-migration-check.mjs` is read-only and has no `--apply` mode.
- `scripts/apply-source-id-scalar-fks.mjs` is the only schema-write entrypoint and is dry-run unless `--apply` is explicit.
- No startup/init path syncs registry rows or creates FKs automatically.

Speed budget:

- Dry-run should run fast and proportionally under 10 seconds.
- Focused proof should run fast and proportionally under 10 seconds.
- Source-contract verifier regression should remain fast and proportionally under 10 seconds.
- Full Foundation ship gate must stay under the existing 300 second budget.

## Risks

- **Bootstrap ordering risk:** a fresh DB may not have synced registry rows yet. Mitigation: migration is not in startup/init and aborts unless registry health is already green.
- **Over-broad migration risk:** array-backed source IDs could be forced into simple FK constraints. Mitigation: relation list is contract-derived and dogfood rejects array-backed relations.
- **Constraint naming risk:** PostgreSQL silently truncates overlong identifiers. Mitigation: deterministic names are capped under 63 characters with a hash suffix where needed.
- **Live-data blocker risk:** stale source IDs would block validation. Mitigation: preflight counts invalid references before any schema write and aborts if nonzero.
- **Rollback path:** if apply fails, the transaction rolls back. If a later manual rollback is required, drop only the named constraints from this card and rerun the focused proof.

## Tests

```sh
node --check lib/source-id-scalar-fk-migration.js scripts/apply-source-id-scalar-fks.mjs scripts/process-source-id-scalar-fk-migration-check.mjs lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run source-id-scalar-fks:apply -- --json
npm run source-id-scalar-fks:apply -- --apply --actor=codex-source-id-scalar-fk-migration --json
npm run process:source-id-scalar-fk-migration-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-ID-SCALAR-FK-MIGRATION-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json --closeoutKey=source-id-scalar-fk-migration-v1 --commitRef=HEAD
```

Not next: no array-backed provenance redesign, no trigger/join-table design, no source-contract authoring UI, no startup repair/init mutation, no source extraction, no connector auth, no paid-source auth, no Build Intel extraction, no hub feature work, no Marketing Video Lab wiring, no Canva asset mutation, no Drive permissions mutation, no Drive permissions request-access emails, and no MEETING-VAULT-ACL-001 Phase B.
