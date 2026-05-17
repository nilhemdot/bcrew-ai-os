# Verifier Build-Log Registry Assurance Split Closeout

Date: 2026-05-17

Card: `VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001`
Closeout key: `verifier-build-log-registry-assurance-split-v1`

## What Changed

Extracted build-log registry assurance checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-build-log-registry-assurance.js`.

The root verifier still gathers the live build-log and closeout registry sources. The new module owns the `CLEANUP-003` build-log monolith slice assertion, `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001` registry split assertion, closeout ownership proof, and closeout validation proof, then returns the validation artifacts needed by downstream process-hardening checks.

## Proof

- `lib/foundation-verifier-build-log-registry-assurance.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-build-log-registry-assurance-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden build-log monolith slice, hidden closeout registry split, hidden closeout ownership proof, hidden closeout validation, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierBuildLogRegistryAssurance({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-build-log-registry-assurance.js
node --check scripts/process-verifier-build-log-registry-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-build-log-registry-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-build-log-registry-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-BUILD-LOG-REGISTRY-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-build-log-registry-assurance-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of build-log closeout registry records, closeout validation, ownership proof, process hardening, or Recent Builds.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
