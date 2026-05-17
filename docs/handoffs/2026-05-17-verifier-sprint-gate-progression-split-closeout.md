# Verifier Sprint Gate Progression Split Closeout

Date: 2026-05-17
Card: `VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001`
Closeout: `verifier-sprint-gate-progression-split-v1`

## Summary

- Extracted Foundation sprint system/cadence, verify-gate tiering, rebuild-plan reconcile, Plan Critic replacement, security behavior proof, and verifier behavior sweep checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-sprint-gate-progression.js`.
- Added `scripts/process-verifier-sprint-gate-progression-split-check.mjs` as a read-only focused proof.
- Left Strategy Hub Meeting Ready and later feature/product cards in root for a separate domain split.
- Left the active sprint overlay untouched.
- Brought `scripts/foundation-verify.mjs` below the 10K emergency threshold while preserving the under-5K clean target.

## Proof

- `node --check lib/foundation-verifier-sprint-gate-progression.js scripts/process-verifier-sprint-gate-progression-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-sprint-gate-progression-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-sprint-gate-progression-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --closeoutKey=verifier-sprint-gate-progression-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-sprint-gate-progression-split-v1 --commitRef=HEAD`

## Dogfood

`buildFoundationVerifierSprintGateProgressionDogfoodProof()` rejects synthetic failures for hidden Current Sprint system/cadence failure, hidden verify-gate tiering failure, hidden Plan Critic gate failure, hidden security behavior proof failure, hidden verifier behavior sweep failure, and old inline root predicates still being present.

## Known Limits

- This does not finish the verifier monolith split.
- This does not get `scripts/foundation-verify.mjs` below 5,000 lines.
- This does not move Strategy Hub Meeting Ready, Avatar import, source grid, marketing, brand, verification-runs, changelog, or Foundation UI complete checks.
- This does not change source extraction jobs, connector auth, Drive permissions, paid calls, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 10K is now cleared, but the clean target remains under 5K.
