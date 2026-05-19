# Source ID Array Provenance Design Closeout - 2026-05-16

Closeout key: `source-id-array-provenance-design-v1`

Card: `SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001`

Sprint: `source-id-array-provenance-design-2026-05-16`

## Result

Closed the report-only design step for the 3 array-backed `source_ids` relations that cannot safely receive simple scalar FKs.

No DB schema was mutated. No trigger was installed. No join table was created. No backfill ran.

## What Changed

- Added `lib/source-id-array-provenance-design.js`.
- Added `scripts/process-source-id-array-provenance-design-check.mjs`.
- Added Plan Critic doctrine and approval:
  - `docs/process/source-id-array-provenance-design-001-plan.md`
  - `docs/process/approvals/SOURCE-ID-ARRAY-PROVENANCE-DESIGN-001.json`
- Wired array provenance design coverage into:
  - `lib/foundation-source-contract-verifier.js`
  - `scripts/process-verifier-source-contracts-module-check.mjs`
  - `scripts/foundation-verify.mjs`
- Added `process:source-id-array-provenance-design-check` to `package.json`.

## Design Decision

Canonical enforcement for array-backed source provenance should be normalized child tables with `source_id` FKs to `source_contract_registry(source_id)`.

Recommended later child tables:

- `intelligence_report_artifact_sources`
- `intelligence_retrieval_run_sources`
- `shared_communication_synthesized_item_sources`

The existing array columns can remain as compatibility/cache fields while a later apply-gated implementation backfills child rows and dual-writes from the application path.

Rejected as canonical:

- Simple FK on `source_ids` array columns.
- Generated scalar projection as canonical provenance.
- Trigger-only validation as canonical truth.

Trigger validation can be a temporary compatibility guard later, but the child table is the queryable source of truth.

## Proof

Focused proof:

```sh
npm run process:source-id-array-provenance-design-check -- --json
```

Result: healthy.

Key checks:

- Design selects exactly 3 array-backed `source_ids` relations.
- Scalar `source_id` relations are excluded.
- Every relation has a normalized child-table recommendation.
- Every child-table recommendation points to `source_contract_registry(source_id)`.
- Dogfood rejects simple array FK claims.
- Dogfood rejects missing source registry FK design.
- Dogfood rejects scalar relation leakage.
- Dogfood rejects missing apply-gated backfill plan.
- Dogfood rejects non-report-only posture.
- Focused proof script is read-only.

Regression proof:

```sh
npm run process:verifier-source-contracts-module-check -- --json
```

Result: healthy.

## Known Limits

- This is design/proof only.
- This does not create child tables.
- This does not mutate PostgreSQL schema.
- This does not install triggers.
- This does not backfill data.
- This does not change write paths or hub reads.
- This does not run source extraction, connector auth, paid-source auth, Build Intel extraction, Marketing Video Lab wiring, Canva asset mutation, Drive permissions mutation, Drive permission request emails, or Meeting Vault Phase B.

## Recommended Next

Pause for Steve review, then choose one:

1. Continue no-auth Foundation cleanup: another verifier split or source/runtime integrity card.
2. Build the later apply-gated array provenance implementation card from this design.
3. Return to Build Intel/source extraction once Foundation data-integrity cleanup is stable enough for new source flow.
