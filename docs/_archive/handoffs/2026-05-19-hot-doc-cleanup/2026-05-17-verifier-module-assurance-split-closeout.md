# Verifier Module Assurance Split Closeout

Date: 2026-05-17
Card: `VERIFIER-MODULE-ASSURANCE-SPLIT-001`
Closeout: `verifier-module-assurance-split-v1`

## What Changed

Extracted the verifier-module assurance checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-module-assurance.js`.

This moved the root-level assurance for intelligence/audit, operator budget, hub safety, route-split, source-contract, source-trust, current-sprint, and intelligence-audit split modules behind one focused evaluator.

## Proof

- `node --check lib/foundation-verifier-module-assurance.js scripts/process-verifier-module-assurance-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-module-assurance-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-MODULE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-MODULE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-module-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-MODULE-ASSURANCE-SPLIT-001 --closeoutKey=verifier-module-assurance-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-MODULE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-MODULE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-module-assurance-split-v1 --commitRef=HEAD`

## Dogfood

The module dogfood rejects hidden focused-verifier failures, missing operator-budget dogfood, missing hub-safety matrix proof, missing split-module closeout proof, and substring-only proof.

## Known Limits

- This does not split the whole verifier.
- This does not move server-route split, Foundation-DB split, frontend split, Recent Builds, or process-hardening checks.
- This does not change verifier behavior, active sprint truth, Plan Critic scoring, source contracts, route budgets, hub safety, or Current Sprint behavior.
- This does not build connectors, source extraction, hub features, Canva, Fal, ElevenLabs, voice, or Harlan terminal/runtime work.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K remains the immediate emergency milestone; under 5K is the clean target, and work continues after that from live backlog truth.
