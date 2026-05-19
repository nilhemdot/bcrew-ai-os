# VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001 Closeout

Date: 2026-05-15
Closeout key: `verifier-foundation-db-split-module-v1`
Card: `VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001`

## What Changed

Extracted the Foundation-DB split verifier assertions from `scripts/foundation-verify.mjs` into `lib/foundation-db-split-verifier.js`.

The root verifier now delegates this proof domain through `evaluateFoundationDbSplitVerifier(foundationDbSplitVerifierInput)` and keeps the canonical PASS/FAIL rows for:

- `FOUNDATION-DB-MONOLITH-SPLIT-001`
- `FOUNDATION-DB-MONOLITH-SPLIT-002`
- `FOUNDATION-DB-MONOLITH-SPLIT-003`
- `FOUNDATION-DB-MONOLITH-SPLIT-004`
- `FOUNDATION-DB-MONOLITH-SPLIT-005`
- `FOUNDATION-DB-MONOLITH-SPLIT-006`
- `FOUNDATION-DB-MONOLITH-SPLIT-007`
- `FOUNDATION-DB-MONOLITH-SPLIT-008`

## Why It Matters

`scripts/foundation-verify.mjs` remains one of the largest and highest-trust files in the repo. This slice removes a coherent Foundation-DB proof domain from the verifier monolith without changing DB behavior, schema, seed, live source truth, or hub features.

## Dogfood Proof

`scripts/process-verifier-foundation-db-split-module-check.mjs` proves the module accepts the current healthy state and rejects:

- missing backlog-store module evidence
- old inline backlog-store ownership
- missing decision-store dogfood proof
- missing core seed module export
- missing source snapshot module evidence
- missing operating truth module export
- missing goal truth module evidence
- missing FUB lead-source store module evidence
- missing shared-comms coverage module evidence
- old inline verifier predicates returning to `scripts/foundation-verify.mjs`

Substring-only proof is rejected.

## Proof Commands

```bash
node --check lib/foundation-db-split-verifier.js scripts/process-verifier-foundation-db-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-foundation-db-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FOUNDATION-DB-SPLIT-MODULE-001.json --closeoutKey=verifier-foundation-db-split-module-v1 --commitRef=HEAD
```

## Line Count

- Before: `scripts/foundation-verify.mjs` 15,515 lines
- After focused extraction: about 15,235 lines before final formatting drift

## Not Shipped

- No Foundation-DB behavior change
- No schema or seed change
- No live DB truth mutation beyond sprint/card state
- No hub feature work
- No Canva asset mutation
- No paid-source auth
- No Build Intel extraction
- No Drive permission mutation

## Next

Continue no-auth Foundation cleanup with another coherent verifier proof-domain split or a bounded Foundation-DB store split. Do not pull hub feature work into Foundation cleanup without an explicit sprint review decision.
