# Verifier Backend Split Assurance Closeout

Date: 2026-05-17
Card: `VERIFIER-BACKEND-SPLIT-ASSURANCE-001`
Closeout: `verifier-backend-split-assurance-v1`

## What Changed

Extracted backend structural split assurance checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-backend-split-assurance.js`.

This moved server-route split verifier and Foundation-DB split verifier assurance behind one focused evaluator.

## Proof

- `node --check lib/foundation-verifier-backend-split-assurance.js scripts/process-verifier-backend-split-assurance-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-backend-split-assurance-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-BACKEND-SPLIT-ASSURANCE-001 --planApprovalRef=docs/process/approvals/VERIFIER-BACKEND-SPLIT-ASSURANCE-001.json --closeoutKey=verifier-backend-split-assurance-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-BACKEND-SPLIT-ASSURANCE-001 --closeoutKey=verifier-backend-split-assurance-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-BACKEND-SPLIT-ASSURANCE-001 --planApprovalRef=docs/process/approvals/VERIFIER-BACKEND-SPLIT-ASSURANCE-001.json --closeoutKey=verifier-backend-split-assurance-v1 --commitRef=HEAD`

## Dogfood

The module dogfood rejects hidden server-route split failures, hidden Foundation-DB split failures, missing split dogfood, old inline backend split predicates, and missing split closeout proof.

## Known Limits

- This does not split the whole verifier.
- This does not move stylesheet/frontend split, Recent Builds, runtime reliability, build-log, or process-hardening checks.
- This does not change verifier behavior, active sprint truth, route behavior, DB schema/store behavior, or Plan Critic scoring.
- This does not build connectors, source extraction, hub features, Canva, Fal, ElevenLabs, voice, or Harlan terminal/runtime work.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K remains the immediate emergency milestone; under 5K is the clean target, and work continues after that from live backlog truth.
