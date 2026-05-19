# Verifier Process-Governance Split Closeout - 2026-05-17

## Card

`VERIFIER-PROCESS-GOVERNANCE-SPLIT-001`

## Closeout Key

`verifier-process-governance-split-v1`

## What Changed

Extracted the process-governance verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-process-governance.js`.

The root verifier now delegates this domain through `evaluateFoundationVerifierProcessGovernance(...)` and pushes the returned checks.

## Scope Boundary

This split covers the completed/current sprint governance chain around sprint repair, verifier sprint independence, modular split, root-vs-patch, current sprint dynamic truth, sprint stage gate, Foundation plan reconcile, connector credential, LLM auth audit, source extraction gap follow-up, atom-flow demotion, extract retry execution, and research-lane purge.

No active sprint overlay was reopened or replaced.

## Proof

- `node --check lib/foundation-verifier-process-governance.js scripts/process-verifier-process-governance-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-process-governance-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-PROCESS-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-governance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-PROCESS-GOVERNANCE-SPLIT-001 --closeoutKey=verifier-process-governance-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-PROCESS-GOVERNANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-GOVERNANCE-SPLIT-001.json --closeoutKey=verifier-process-governance-split-v1 --commitRef=HEAD`

## Dogfood

The focused dogfood proof rejects missing closeout proof, skipped-stage shortcuts, missing stage-gate enforcement, symptom-patch acceptance, source-gap extraction mutation, and research-lane mutation.

## Remaining Work

`scripts/foundation-verify.mjs` is still above both the 10K emergency line and the 5K clean target. Continue with the next coherent verifier domain split; do not stop at this closeout.
