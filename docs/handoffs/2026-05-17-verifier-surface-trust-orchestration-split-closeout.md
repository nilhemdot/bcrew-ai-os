# Verifier Surface Trust Orchestration Split Closeout

Date: 2026-05-17

Card: `VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-surface-trust-orchestration-split-v1`

## What Changed

Moved the surface/trust orchestration layer from `scripts/foundation-verify.mjs` into `lib/foundation-surface-trust-verifier.js`.

The root verifier still gathers the live Foundation payloads, runtime metadata, done-card records, and source text. The surface/trust module now owns the existing evaluator call, check aggregation, dogfood proof, and historical split self-check for this domain. The root keeps forwarding `verifierExceptionValidation` and `missingArtifactClaims` to downstream process-trust checks from the wrapper result.

## Proof

- `lib/foundation-surface-trust-verifier.js` adds `evaluateFoundationSurfaceTrustVerifierOrchestration()`.
- `scripts/process-verifier-surface-trust-orchestration-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects stale verifier exceptions, missing done-card verifier proof, missing artifact claims, stale served code, and incomplete surface maps.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationSurfaceTrustVerifierOrchestration({ ... })`.
- `scripts/process-verifier-surface-trust-split-module-check.mjs` remains compatible with wrapper delegation.

## Expected Gates

```bash
node --check lib/foundation-surface-trust-verifier.js
node --check scripts/process-verifier-surface-trust-orchestration-split-check.mjs
node --check scripts/process-verifier-surface-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-surface-trust-orchestration-split-check -- --json
npm run process:verifier-surface-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-surface-trust-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SURFACE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-surface-trust-orchestration-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of served-code trust, worker-code trust, exception expiry, done-card verifier coverage, artifact-claim validation, surface map coverage, surface freshness, backlog seed/live drift exposure, DB constraint audit exposure, source trust, process trust, runtime reliability, structural assurance, connector auth, route budgets, or Plan Critic scoring.
- No connector auth, source extraction job implementation, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
