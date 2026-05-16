# SOURCE-ID-CONSTRAINT-CONTRACT-001 Plan

## What

Build a report-only source-ID constraint contract that classifies every DB-backed `source_id` or `source_ids` reference currently checked by the Foundation DB constraint audit.

The contract must say which references are safe for a simple source-contract foreign-key migration now, which should remain verifier-backed for V1, and which need schema redesign before a real database constraint. This is not a DB migration.

## Why

`DB-CONSTRAINT-001` deliberately left source-ID integrity as verifier-backed truth because a broad foreign-key migration would be unsafe without knowing which references are scalar, array-backed, nullable, historical, or external-ledger shaped.

The operator value is concrete: future Foundation schema hardening should not rely on vague "we should add FKs" language. Steve should be able to see a typed map of source references before approving any source-ID migration.

## Acceptance Criteria

- A single source-ID contract module lists the DB source-reference relations from `getFoundationDbConstraintAudit()`.
- Each relation has a classification: `fk_safe_now`, `verifier_backed`, or `needs_schema_design`.
- Each relation names table, column, value shape, nullability posture, historical/array risk, recommended enforcement, and rationale.
- The evaluator proves all audited DB source-reference relations have an explicit contract row.
- The evaluator rejects unsafe contract claims, including array-backed source IDs marked as simple FK-safe, missing registered-source enforcement, missing rationale, or a non-report-only migration posture.
- The focused proof script is read-only: no schema mutation, no live data mutation, no backlog/current-sprint mutation, and no report file write.
- Current Sprint, live backlog, approval file, and durable Plan Critic row all agree before build.
- Core governance verifier coverage proves the contract exists and the dogfood rejection behavior passes.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/source-id-constraint-contract.js` owns constants, source-reference contracts, evaluator, and dogfood proof.
- `scripts/process-source-id-constraint-contract-check.mjs` validates plan approval, durable Plan Critic pass, live backlog/current sprint state, source coverage, dogfood proof, read-only posture, package script, rebuild docs, and closeout registration.
- `package.json` exposes `process:source-id-constraint-contract-check`.
- `lib/foundation-core-governance-verifier.js` has thin SOURCE-ID-CONSTRAINT-CONTRACT coverage.
- `scripts/process-verifier-core-governance-split-module-check.mjs` and `scripts/foundation-verify.mjs` pass source-ID contract source/dogfood into the existing core governance verifier.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-source-id-constraint-contract-closeout.md` exists.
- Recent Builds closeout registry includes `source-id-constraint-contract-v1`.

## Details

Existing code, docs, scripts, and live backlog truth to reuse:

- `getFoundationDbConstraintAudit()` in `lib/foundation-db.js`.
- Existing source contract registry in `lib/source-contracts.js`.
- `lib/db-constraint-hardening.js` and `scripts/process-db-constraint-check.mjs` as the previous DB governance proof shape.
- `lib/foundation-core-governance-verifier.js`.
- `scripts/process-verifier-core-governance-split-module-check.mjs`.
- `scripts/foundation-verify.mjs`.
- live backlog card `SOURCE-ID-CONSTRAINT-CONTRACT-001`.

Implementation shape:

- Add a new small module instead of growing `lib/foundation-db.js`.
- Keep source-ID reference classification static and explicit for V1, but validate it against the same audited relation names used by `getFoundationDbConstraintAudit()`.
- Mark simple scalar, non-null source references as potential `fk_safe_now` only when the recommended enforcement is a source-contract FK or equivalent DB-backed source registry.
- Mark array-backed or aggregate source references as `verifier_backed` or `needs_schema_design`, not simple FK-safe.
- The output is report-only contract truth for future migration planning; it does not change table schema or add indexes.

Split/extraction plan:

- Do not add new logic to `lib/foundation-db.js`; only reuse its existing audit relation list.
- Do not add broad inline checks to `scripts/foundation-verify.mjs`; pass the new source/dogfood into the already-split core governance verifier.
- Keep the proof script read-only and free of `--apply` posture.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Focused gate: `npm run process:source-id-constraint-contract-check -- --json`.
- Regression gate: `npm run process:verifier-core-governance-split-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=SOURCE-ID-CONSTRAINT-CONTRACT-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-CONSTRAINT-CONTRACT-001.json --closeoutKey=source-id-constraint-contract-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-source-id-constraint-contract-check.mjs` is read-only by default and has no `--apply` path.
- It must not call `updateBacklogItem()`, `createBacklogItem()`, `upsertFoundationCurrentSprintOverlay()`, raw live-table mutation SQL, external connectors, paid APIs, source extraction, or `fs.writeFile`.

Speed budget:

- Focused proof should run under 10 seconds.
- Core-governance split proof should remain under 10 seconds.
- Full Foundation ship gate must stay under the existing 300 second budget.

## Risks

- **False safety risk:** a relation could be labeled FK-safe when it is array-backed or historical. Mitigation: dogfood rejects array-backed simple-FK claims and missing rationale/enforcement fields.
- **Schema overreach risk:** this can drift into a broad migration. Mitigation: this card is report-only and has no schema mutation or live data mutation.
- **Coverage drift risk:** the audit query and contract could disagree. Mitigation: evaluator fails if any audited relation lacks a contract row or if the contract contains relations outside the audited set without explicit follow-up status.
- **Verifier monolith risk:** `scripts/foundation-verify.mjs` is over 10K lines. Mitigation: only pass source/dogfood into the existing split verifier module and do not add broad inline verifier logic.
- **Rollback path:** remove the new module/script/package entry, remove the thin core-governance coverage, and return to the existing DB constraint audit only.

## Tests

```sh
node --check lib/source-id-constraint-contract.js scripts/process-source-id-constraint-contract-check.mjs lib/foundation-core-governance-verifier.js scripts/process-verifier-core-governance-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:source-id-constraint-contract-check -- --json
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-ID-CONSTRAINT-CONTRACT-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-CONSTRAINT-CONTRACT-001.json --closeoutKey=source-id-constraint-contract-v1 --commitRef=HEAD
```

Not next: no DB schema migration, no source-contract table redesign, no live data mutation, no route redesign, no source extraction, no connector auth, no paid-source auth, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no Drive permissions mutation, no Drive permissions request-access emails, and no MEETING-VAULT-ACL-001 Phase B.
