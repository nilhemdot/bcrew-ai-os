# Source ID Scalar FK Migration Closeout - 2026-05-16

Closeout key: `source-id-scalar-fk-migration-v1`  
Card: `SOURCE-ID-SCALAR-FK-MIGRATION-001`  
Sprint: `source-id-scalar-fk-migration-2026-05-16`

## What Changed

Added real database enforcement for the 10 scalar `source_id` relations classified `fk_safe_now` by the source-ID constraint contract.

The migration is apply-gated. Dry-run is default, and schema writes only happen through:

```sh
npm run source-id-scalar-fks:apply -- --apply --actor=codex-source-id-scalar-fk-migration --json
```

## Result

- `source_contract_registry` stayed healthy: 36 expected / 36 active.
- Live scalar source references had 0 invalid references before apply.
- 10 scalar FK constraints were added and validated against `source_contract_registry(source_id)`.
- The 3 array-backed `source_ids` relations were not touched.
- Source-contract verifier coverage now fails if scalar FK enforcement is missing.

## Files

- `lib/source-id-scalar-fk-migration.js`
- `scripts/apply-source-id-scalar-fks.mjs`
- `scripts/process-source-id-scalar-fk-migration-check.mjs`
- `lib/foundation-source-contract-verifier.js`
- `scripts/process-verifier-source-contracts-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/source-id-scalar-fk-migration-001-plan.md`
- `docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json`

## Proof

```sh
node --check lib/source-id-scalar-fk-migration.js scripts/apply-source-id-scalar-fks.mjs scripts/process-source-id-scalar-fk-migration-check.mjs lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs
npm run source-id-scalar-fks:apply -- --json
npm run source-id-scalar-fks:apply -- --apply --actor=codex-source-id-scalar-fk-migration --json
npm run process:source-id-scalar-fk-migration-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --failures-only
npm run process:ship-check -- --card=SOURCE-ID-SCALAR-FK-MIGRATION-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json --closeoutKey=source-id-scalar-fk-migration-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SOURCE-ID-SCALAR-FK-MIGRATION-001 --closeoutKey=source-id-scalar-fk-migration-v1
npm run process:foundation-ship -- --card=SOURCE-ID-SCALAR-FK-MIGRATION-001 --planApprovalRef=docs/process/approvals/SOURCE-ID-SCALAR-FK-MIGRATION-001.json --closeoutKey=source-id-scalar-fk-migration-v1 --commitRef=HEAD
```

Results:

- Focused proof: healthy, 10/10 scalar FK constraints validated, 0 invalid source references.
- Source-contract verifier regression: healthy.
- Backlog hygiene: 530 cards, 0 findings.
- Foundation verify: 408/408.

## Not Next

No array-backed provenance redesign, trigger/join-table schema design, source-contract authoring UI, startup/init FK creation, source extraction, connector auth, paid-source auth, Build Intel extraction, hub feature work, Marketing Video Lab wiring, Canva asset mutation, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

## Next

Continue the no-auth Foundation cleanup queue. Good next candidates: array-backed source provenance design, another verifier split/line-count cleanup, or the next source/runtime integrity card that does not require Steve auth.
