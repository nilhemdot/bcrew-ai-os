# Verifier Frontend Structural Assurance Split Closeout - 2026-05-17

Card:
`VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001`

Closeout key:
`verifier-frontend-structural-assurance-split-v1`

## Summary

Extracted the frontend structural assurance verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-frontend-structural-assurance.js`.

The root verifier now delegates frontend split assurance instead of owning that call/check block inline.

## Domain Boundary

Included:

- `VERIFIER-FRONTEND-SPLIT-ASSURANCE-001`

Not included:

- nightly audit triage
- historical split closeout checks
- runtime reliability
- process hardening
- source-contract registry
- connector auth
- product/hub/connector feature build

## Proof

Focused dogfood rejects:

- hidden frontend split assurance failure
- old inline root predicates still present

Commands for this sprint:

```bash
node --check lib/foundation-verifier-frontend-structural-assurance.js
node --check scripts/process-verifier-frontend-structural-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-frontend-structural-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-frontend-structural-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --closeoutKey=verifier-frontend-structural-assurance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-frontend-structural-assurance-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth. Under 10K is cleared, but the clean target remains under 5K. Pick the next coherent verifier domain after inspecting the remaining root; do not move code just for line count.
