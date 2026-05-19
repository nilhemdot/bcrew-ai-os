# Verifier Process/Control Governance Split Closeout - 2026-05-17

Card:
`VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001`

Closeout key:
`verifier-process-control-governance-split-v1`

## Summary

Extracted the process/control governance verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-process-control-governance.js`.

The root verifier now delegates Connector Routing Truth, process governance, readiness follow-up, guardrail closeout, and Foundation control-loop checks instead of owning that behavior inline.

## Domain Boundary

Included:

- Connector Routing Truth Sprint
- `VERIFIER-PROCESS-GOVERNANCE-SPLIT-001`
- `VERIFIER-READINESS-FOLLOWUP-SPLIT-001`
- `VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001`
- `VERIFIER-CONTROL-LOOP-SPLIT-001`

Not included:

- runtime reliability
- verifier module assurance
- backend/frontend split assurance
- source-contract registry
- connector auth
- product/hub/connector feature build

## Proof

Focused dogfood rejects:

- hidden Connector Routing Truth failure
- hidden process governance failure
- hidden readiness follow-up failure
- hidden guardrail closeout failure
- hidden control-loop failure
- old inline root predicates still present

Commands for this sprint:

```bash
node --check lib/foundation-verifier-process-control-governance.js
node --check scripts/process-verifier-process-control-governance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-control-governance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-control-governance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --closeoutKey=verifier-process-control-governance-split-v1
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-control-governance-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth. Under 10K is cleared, but the clean target remains under 5K. Pick the next coherent verifier domain after inspecting the remaining root; do not move code just for line count.
