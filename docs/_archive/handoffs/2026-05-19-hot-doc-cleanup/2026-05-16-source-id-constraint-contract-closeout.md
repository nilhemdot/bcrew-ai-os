# SOURCE-ID-CONSTRAINT-CONTRACT-001 Closeout

Date: 2026-05-16
Sprint: `source-id-constraint-contract-2026-05-16`
Closeout key: `source-id-constraint-contract-v1`
Card: `SOURCE-ID-CONSTRAINT-CONTRACT-001`

## Summary

`SOURCE-ID-CONSTRAINT-CONTRACT-001` creates the report-only source-ID constraint contract that `DB-CONSTRAINT-001` left as the next decision.

It does not add database foreign keys. It classifies every DB source-reference relation currently covered by `getFoundationDbConstraintAudit()` so the next schema hardening slice can be scoped from a map instead of guessing.

## What Changed

- Added `lib/source-id-constraint-contract.js`.
- Added `scripts/process-source-id-constraint-contract-check.mjs`.
- Added package script `process:source-id-constraint-contract-check`.
- Added source-ID contract coverage to `lib/foundation-core-governance-verifier.js`.
- Wired source-ID contract dogfood into `scripts/process-verifier-core-governance-split-module-check.mjs`.
- Wired source-ID contract dogfood into `scripts/foundation-verify.mjs`.
- Added current plan/state closeout records.
- Added Recent Work closeout registry entry.

## Contract Result

The contract covers 13 audited DB source-reference relations.

- `fk_safe_now`: 10 scalar, non-null source references that are shape-safe for future FK enforcement after a DB-backed source-contract registry exists.
- `needs_schema_design`: 3 array-backed source references that need a join table, trigger design, or schema redesign before database-level enforcement.

## Dogfood Proof

The dogfood proof recreates the failure modes that would make this contract dangerous:

- array-backed `source_ids` claimed as simple FK-safe
- scalar FK-safe row missing registered-source enforcement
- audited relation missing from the contract
- non-report-only mutation posture

All are rejected by the evaluator.

## Proof

```sh
node --check lib/source-id-constraint-contract.js scripts/process-source-id-constraint-contract-check.mjs lib/foundation-core-governance-verifier.js scripts/process-verifier-core-governance-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:source-id-constraint-contract-check -- --json
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=SOURCE-ID-CONSTRAINT-CONTRACT-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-CONSTRAINT-CONTRACT-001.json --closeoutKey=source-id-constraint-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SOURCE-ID-CONSTRAINT-CONTRACT-001 --closeoutKey=source-id-constraint-contract-v1
npm run process:foundation-ship -- --card=SOURCE-ID-CONSTRAINT-CONTRACT-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-CONSTRAINT-CONTRACT-001.json --closeoutKey=source-id-constraint-contract-v1 --commitRef=HEAD
```

## Not Next

- No DB schema migration.
- No source-contract table redesign.
- No live data mutation.
- No route redesign.
- No source extraction, connector auth, paid-source auth, or Build Intel work.
- No hub feature work, Marketing Video Lab route wiring, Canva asset mutation, Drive permissions mutation, Drive permissions request-access emails, or MEETING-VAULT-ACL-001 Phase B.

## Next Decision

Use this contract to decide the next DB source-ID hardening slice:

1. materialize source contracts into a DB registry table,
2. add scalar FK constraints for the 10 `fk_safe_now` relations,
3. or redesign array-backed provenance into join tables before constraint enforcement.
