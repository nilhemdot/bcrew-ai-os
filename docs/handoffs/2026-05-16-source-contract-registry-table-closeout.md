# SOURCE-CONTRACT-REGISTRY-TABLE-001 Closeout

Date: 2026-05-16
Sprint: `source-contract-registry-table-2026-05-16`
Closeout key: `source-contract-registry-table-v1`
Card: `SOURCE-CONTRACT-REGISTRY-TABLE-001`

## Summary

`SOURCE-CONTRACT-REGISTRY-TABLE-001` materializes source contracts into a DB-backed `source_contract_registry` table before any source-ID foreign-key work.

The card creates a metadata registry only. It does not add foreign keys, redesign array-backed provenance, create a source-contract authoring UI, run extraction, or mutate source systems.

## What Changed

- Added `lib/source-contract-registry-table.js`.
- Added `scripts/sync-source-contract-registry.mjs`.
- Added `scripts/process-source-contract-registry-table-check.mjs`.
- Added package scripts `source-contract-registry:sync` and `process:source-contract-registry-table-check`.
- Added `source_contract_registry` schema creation to Foundation DB bootstrap.
- Added explicit registry sync and snapshot helpers through `lib/foundation-db.js`.
- Added registry snapshot and dogfood coverage to `lib/foundation-source-contract-verifier.js`.
- Wired registry proof through `scripts/process-verifier-source-contracts-module-check.mjs`.
- Wired registry proof through `scripts/foundation-verify.mjs`.
- Updated current rebuild plan/state.
- Added Recent Builds closeout registry entry.

## Registry Result

The registry sync populated `36` active source-contract rows from `getSourceContracts()`.

- Expected rows: `36`
- Active DB rows: `36`
- Missing rows: `0`
- Extra active rows: `0`
- Stale hash rows: `0`
- Inactive current rows: `0`

Each row stores stable metadata and a contract hash so future source-ID constraints can reference DB-backed source-contract truth instead of loose strings.

## Dogfood Proof

The dogfood proof recreates unsafe registry states and proves the evaluator rejects them:

- duplicate source IDs
- missing DB rows
- stale contract hashes
- inactive current rows
- extra active rows
- invalid source-ID shape

## Proof

```sh
node --check lib/source-contract-registry-table.js scripts/sync-source-contract-registry.mjs scripts/process-source-contract-registry-table-check.mjs lib/foundation-db.js lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run source-contract-registry:sync -- --apply --actor=codex-source-contract-registry-table
npm run process:source-contract-registry-table-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --failures-only
npm run process:ship-check -- --card=SOURCE-CONTRACT-REGISTRY-TABLE-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-REGISTRY-TABLE-001.json --closeoutKey=source-contract-registry-table-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SOURCE-CONTRACT-REGISTRY-TABLE-001 --closeoutKey=source-contract-registry-table-v1
npm run process:foundation-ship -- --card=SOURCE-CONTRACT-REGISTRY-TABLE-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-REGISTRY-TABLE-001.json --closeoutKey=source-contract-registry-table-v1 --commitRef=HEAD
```

## Not Next

- No source-ID FK constraints.
- No array-backed provenance redesign.
- No source-contract authoring UI.
- No route redesign.
- No seed/live overwrite.
- No source extraction, connector auth, paid-source auth, or Build Intel extraction.
- No hub feature work, Marketing Video Lab wiring, Canva asset mutation, Drive permissions mutation, Drive permissions request-access emails, or `MEETING-VAULT-ACL-001` Phase B.

## Next Decision

The next DB source-ID hardening slice can now choose between:

1. scalar source-ID FK constraints for the 10 `fk_safe_now` relations from `SOURCE-ID-CONSTRAINT-CONTRACT-001`,
2. a plan-only scalar FK migration card with rollback/dogfood proof,
3. or array-backed provenance redesign for the 3 relations that cannot safely use simple FK constraints.
