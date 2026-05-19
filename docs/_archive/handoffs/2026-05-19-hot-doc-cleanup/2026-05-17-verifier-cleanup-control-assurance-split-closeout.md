# Verifier Cleanup Control Assurance Split Closeout

Date: 2026-05-17

Card: `VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001`
Closeout key: `verifier-cleanup-control-assurance-split-v1`

## What Changed

Extracted cleanup/control assurance verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-cleanup-control-assurance.js`.

The root verifier still gathers the live Foundation payloads and sources. The new module owns checks for cleanup wave closeouts, Phase E re-audit closeout, local-private doc boundary proof, document categorization cleanup, hard-checkpoint backlog promotion, phase-one enforcement proof, gate reliability proof, and the Foundation control-layer closeout checks.

## Proof

- `lib/foundation-verifier-cleanup-control-assurance.js` adds the focused evaluator and dogfood proof.
- `scripts/process-verifier-cleanup-control-assurance-split-check.mjs` proves the split is read-only, delegated, line-count reducing, and behavior-backed.
- Dogfood rejects hidden cleanup wave, private-doc boundary, hard-checkpoint backlog, phase-one enforcement, control-layer, gate-reliability, and old-inline-predicate failures.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierCleanupControlAssurance({ ... })`.

## Expected Gates

```bash
node --check lib/foundation-verifier-cleanup-control-assurance.js
node --check scripts/process-verifier-cleanup-control-assurance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-cleanup-control-assurance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-cleanup-control-assurance-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CLEANUP-CONTROL-ASSURANCE-SPLIT-001.json --closeoutKey=verifier-cleanup-control-assurance-split-v1 --commitRef=HEAD
```

## Not Changed

- No active sprint overlay replacement.
- No behavior rewrite of cleanup, document categorization, gate reliability, personal workspace boundary, decision auto-emit, CEO dashboard pattern, Phase G, readiness blockers, process hardening, runtime reliability, or source extraction.
- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, Harlan runtime work, or UI feature work.

## Next

Continue verifier monolith reduction from repo truth. Under 5K remains the clean target, and the next sprint should choose another coherent verifier domain instead of moving code just for line count.
