# Verifier Readiness/Follow-Up Split Closeout

Date: 2026-05-17
Card: `VERIFIER-READINESS-FOLLOWUP-SPLIT-001`
Closeout: `verifier-readiness-followup-split-v1`

## What Changed

Extracted the Foundation READY review, follow-up capture, Systems grouping, Sales GLS closeout coverage, and shipped-system registration verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-readiness-followup.js`.

## Proof

- `node --check lib/foundation-verifier-readiness-followup.js scripts/process-verifier-readiness-followup-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-readiness-followup-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-READINESS-FOLLOWUP-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-FOLLOWUP-SPLIT-001.json --closeoutKey=verifier-readiness-followup-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-READINESS-FOLLOWUP-SPLIT-001 --closeoutKey=verifier-readiness-followup-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-READINESS-FOLLOWUP-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-FOLLOWUP-SPLIT-001.json --closeoutKey=verifier-readiness-followup-split-v1 --commitRef=HEAD`

## Dogfood

The module dogfood rejects hidden READY review failure, follow-up scope creep, combined service buckets, missing shipped-system registration, and private agent feedback link leakage.

## Known Limits

- This does not split the whole verifier.
- This does not move Sheets quota, doctrine propagation, decision auto-emit, security, foundation done test, SYSTEM-010, Action Review, Build Intel, or control compression checks.
- This does not change verifier behavior, active sprint truth, Plan Critic scoring, Sales GLS behavior, or system registration data.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K remains the immediate emergency milestone; under 5K is the clean target, and work continues after that from live backlog truth.
