# Verifier Phase G Operator Closeout Split Closeout

Date: 2026-05-17
Card: `VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001`
Closeout: `verifier-phase-g-operator-closeout-split-v1`

## What Changed

- Extracted Foundation 1100 review, plain-English sweep, UI menu layout, Recent Builds UI, comprehensive changelog, daily executive summary, and source lifecycle expansion verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-phase-g-operator-closeout.js`.
- Added `scripts/process-verifier-phase-g-operator-closeout-split-check.mjs` as a read-only focused proof.
- Kept the active sprint overlay untouched.

## Proof

- `node --check lib/foundation-verifier-phase-g-operator-closeout.js scripts/process-verifier-phase-g-operator-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-phase-g-operator-closeout-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-phase-g-operator-closeout-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 --closeoutKey=verifier-phase-g-operator-closeout-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-phase-g-operator-closeout-split-v1 --commitRef=HEAD`

## Dogfood

The focused proof rejects hidden Foundation 1100 closeout failures, hidden Phase G operator status failures, closeout ownership smearing, missing metadata proof, and old inline Phase G predicates.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K is only the emergency milestone; under 5K is the clean target.
