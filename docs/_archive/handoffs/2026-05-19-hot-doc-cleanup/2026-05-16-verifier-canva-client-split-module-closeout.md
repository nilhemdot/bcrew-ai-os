# Verifier Canva Client Split Module Closeout

Date: 2026-05-16
Card: `VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001`
Closeout key: `verifier-canva-client-split-module-v1`

## What Changed

Moved the Canva client verifier predicate out of `scripts/foundation-verify.mjs` into `lib/foundation-canva-client-verifier.js`.

The root verifier now delegates the existing PASS/FAIL row for `CANVA-CLIENT-001` instead of owning the Canva refresh-token, OAuth bootstrap, read-only wrapper, and official-doc evidence checks inline.

## What It Does

The module exports:

- `evaluateFoundationCanvaClientVerifier()`
- `buildFoundationCanvaClientVerifierDogfoodProof()`
- `evaluateFoundationCanvaClientVerifierSplitSource()`
- the card, sprint, closeout, plan, approval, and focused-proof constants for the split

The root verifier line count dropped from the recorded `12,734` baseline to about `12,730` proof-counted lines while preserving Canva client behavior.

## Why It Matters

Canva is now a Foundation integration primitive for future brand and Marketing workflows, but its verifier proof should stay read-only and inspectable. This split keeps refresh-token rotation and no-write safeguards visible without burying the checks inside a 12K-line root verifier.

## Where It Lives

- `lib/foundation-canva-client-verifier.js`
- `scripts/process-verifier-canva-client-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-canva-client-split-module-check`
- `docs/process/verifier-canva-client-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-canva-client-verifier.js
node --check scripts/process-verifier-canva-client-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-canva-client-split-module-check -- --json
npm run foundation:verify -- --json-summary
```

Results:

- focused proof: 14/14
- Plan Critic: 10/10
- `foundation:verify`: 380/380
- root verifier line count: `12,734` -> about `12,730`

Dogfood proof rejects:

- missing `CANVA_REFRESH_TOKEN`
- missing refresh-token replacement/rotation-safe bootstrap evidence
- exposed Canva write wrapper
- missing official read-plan evidence for `/brand-templates`

Final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001.json --closeoutKey=verifier-canva-client-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `scripts/foundation-verify.mjs`.
- This does not create, upload, export, update, or delete Canva content.
- This does not wire Marketing Video Lab routes.
- This does not create the Brand Ingredient Asset Library or clean Tanner's Canva folders.
- This does not change route behavior, auth, source extraction, DB schema, backlog semantics, connector auth, paid-source auth, Build Intel extraction, Meeting Vault Phase B, Drive permission mutation, or hub feature work.

## Review Next

Continue the standard-mode no-auth Foundation cleanup queue with the next coherent verifier proof-domain split or a bounded source-of-truth latency cleanup if verifier slices start creating more root integration overhead than they remove.
