# Verifier Structural Assurance Core Split Closeout - 2026-05-17

Card:
`VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001`

Closeout key:
`verifier-structural-assurance-core-split-v1`

## Summary

Extracted the structural assurance core verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-structural-assurance-core.js`.

The root verifier now delegates verifier module assurance and backend structural split assurance instead of owning those call/check blocks inline.

## Domain Boundary

Included:

- `VERIFIER-MODULE-ASSURANCE-SPLIT-001`
- `VERIFIER-BACKEND-SPLIT-ASSURANCE-001`

Not included:

- nightly audit triage
- frontend split assurance
- Phase G operator closeout
- readiness blocker closeout
- sprint-gate progression
- Source Once-Over progression
- process/control governance
- runtime reliability
- source-contract registry
- connector auth
- product/hub/connector feature build

## Proof

Focused dogfood rejects:

- hidden module assurance failure
- hidden backend split assurance failure
- old inline root predicates still present

Commands for this sprint:

```bash
node --check lib/foundation-verifier-structural-assurance-core.js
node --check scripts/process-verifier-structural-assurance-core-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-structural-assurance-core-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001.json --closeoutKey=verifier-structural-assurance-core-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001 --closeoutKey=verifier-structural-assurance-core-split-v1
npm run process:foundation-ship -- --card=VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001.json --closeoutKey=verifier-structural-assurance-core-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth. Under 10K is cleared, but the clean target remains under 5K. Pick the next coherent verifier domain after inspecting the remaining root; do not move code just for line count.
