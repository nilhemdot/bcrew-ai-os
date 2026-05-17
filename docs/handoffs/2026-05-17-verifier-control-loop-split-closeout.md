# Verifier Control-Loop Split Closeout

Date: 2026-05-17
Card: `VERIFIER-CONTROL-LOOP-SPLIT-001`
Closeout: `verifier-control-loop-split-v1`

## What Changed

Extracted the Foundation readiness exit-test, SYSTEM-010 runtime/process-control, known-cleaned backlog hygiene, Action Review apply/review, Build Intel intake, and Foundation control-compression verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-control-loop.js`.

## Proof

- `node --check lib/foundation-verifier-control-loop.js scripts/process-verifier-control-loop-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-control-loop-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-CONTROL-LOOP-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CONTROL-LOOP-SPLIT-001.json --closeoutKey=verifier-control-loop-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-CONTROL-LOOP-SPLIT-001 --closeoutKey=verifier-control-loop-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-CONTROL-LOOP-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CONTROL-LOOP-SPLIT-001.json --closeoutKey=verifier-control-loop-split-v1 --commitRef=HEAD`

## Dogfood

The module dogfood rejects readiness false-green, missing runtime leg, Action Review mutation without destination proof, Build Intel intake mutation/screenshot-policy failure, and control-compression mutation or critical-failure suppression.

## Known Limits

- This does not split the whole verifier.
- This does not move downstream verifier-module checks.
- This does not change verifier behavior, active sprint truth, Plan Critic scoring, readiness status, runtime controls, Action Review behavior, Build Intel behavior, or control-compression behavior.
- This does not build connectors, source extraction, hub features, Canva, Fal, ElevenLabs, voice, or Harlan terminal/runtime work.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K remains the immediate emergency milestone; under 5K is the clean target, and work continues after that from live backlog truth.
