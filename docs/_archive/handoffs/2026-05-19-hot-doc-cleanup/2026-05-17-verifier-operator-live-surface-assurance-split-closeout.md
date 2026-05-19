# Verifier Operator Live Surface Assurance Split Closeout

Date: 2026-05-17

Card: `VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001`
Closeout key: `verifier-operator-live-surface-assurance-split-v1`

## What Changed

Extracted operator/live-surface assurance verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-operator-live-surface-assurance.js`.

The root verifier still gathers the live Foundation payloads and sources. The new module owns checks for Foundation/Ops page contracts, Strategy Hub v2 source-to-gap route review, Runtime Health extraction-control proof, Owners governance visibility, and Recent Builds/Recent Work discipline.

## Proof

- `lib/foundation-verifier-operator-live-surface-assurance.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-operator-live-surface-assurance-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden Ops surface contract, Strategy Hub source-review, extraction-control proof, Owners governance, Recent Builds discipline, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierOperatorLiveSurfaceAssurance({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-operator-live-surface-assurance.js
node --check scripts/process-verifier-operator-live-surface-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-operator-live-surface-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-operator-live-surface-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-operator-live-surface-assurance-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of Strategy Hub, Runtime Health, Owners governance, Recent Builds, Ops Hub, Foundation Hub, cleanup/control, process hardening, runtime reliability, structural assurance, or Plan Critic scoring.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
