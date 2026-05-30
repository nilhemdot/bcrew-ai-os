# FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 Closeout

Date: 2026-05-18
Closeout key: `foundation-db-schema-seed-split-v1`
Branch: `foundation/system-health-red-to-green-001`

## Summary

Extracted Foundation DB schema/bootstrap initialization out of `lib/foundation-db.js` into `lib/foundation-db-schema-seed-store.js`.

The root DB file now keeps stable public `initFoundationDb` and `bootstrapFoundationDb` export names as delegates, while the new module owns the initializer body, explicit bootstrap seed posture, local `seedTable` helper, schema SQL imports, static seed imports, split evaluator, and dogfood proof.

## Why

The May 18 audit flagged `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001` because `lib/foundation-db.js` still mixed schema initialization, seed/bootstrap logic, stores, and query APIs. Earlier DB seed cards made bootstrap seed explicit and split static core seed arrays, but the root still owned the initializer implementation.

This card removes that responsibility from the root without changing startup semantics or adding any schema/seed write policy.

## Files

- `lib/foundation-db-schema-seed-store.js`
- `lib/foundation-db.js`
- `lib/foundation-core-seed.js`
- `lib/foundation-db-split-verifier.js`
- `lib/foundation-process-hardening-verifier.js`
- `lib/foundation-verify-process-hardening-runner.js`
- `lib/foundation-verifier-backend-split-assurance.js`
- `lib/foundation-verifier-module-assurance.js`
- `lib/code-quality-nightly-audit.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-build-closeout-tightening-records.js`
- `scripts/process-foundation-db-schema-seed-split-check.mjs`
- `scripts/process-db-seed-check.mjs`
- `scripts/process-foundation-core-seed-split-check.mjs`
- `scripts/process-verifier-foundation-db-split-module-check.mjs`
- `scripts/process-runtime-safety-hardening-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/foundation-db-schema-seed-split-001-plan.md`
- `docs/process/approvals/FOUNDATION-DB-SCHEMA-SEED-SPLIT-001.json`

## Proof

Required proof commands:

```bash
node --check lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/foundation-core-seed.js lib/foundation-db-split-verifier.js lib/foundation-process-hardening-verifier.js lib/foundation-verifier-module-assurance.js lib/code-quality-nightly-audit.js scripts/foundation-verify.mjs scripts/process-foundation-db-schema-seed-split-check.mjs scripts/process-db-seed-check.mjs scripts/process-foundation-core-seed-split-check.mjs scripts/process-verifier-foundation-db-split-module-check.mjs scripts/process-runtime-safety-hardening-check.mjs
npm run process:foundation-db-schema-seed-split-check -- --json
npm run process:db-seed-check -- --json
npm run process:foundation-core-seed-split-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run process:runtime-safety-hardening-check -- --card=FOUNDATION-DB-INIT-SEED-SPLIT-001 --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-SCHEMA-SEED-SPLIT-001.json --closeoutKey=foundation-db-schema-seed-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --closeoutKey=foundation-db-schema-seed-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-SCHEMA-SEED-SPLIT-001.json --closeoutKey=foundation-db-schema-seed-split-v1 --commitRef=HEAD
```

Focused dogfood rejects:

- root-owned `export async function initFoundationDb`
- root-owned `seedTable`
- missing schema/seed module owner
- missing stable root delegates
- stale audit findings for `foundation-db-schema-seed-store-monolith` and `init-foundation-db-seed-mutation-risk`

The real runtime dogfood still calls `initFoundationDb()` and verifies watched live truth tables remain unchanged.

## Boundaries

This did not change schema semantics, table definitions, seed data, store SQL behavior, source extraction, hub feature behavior, connector auth, Drive permissions, or any external systems.

This did not launch parallel builders or hidden subagents.

## Next

Continue the Foundation queue from repo truth. The likely next Foundation-up cards are `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001` and `BUILD-LOG-API-CACHE-AND-SLIM-001` unless live backlog priority says otherwise.
