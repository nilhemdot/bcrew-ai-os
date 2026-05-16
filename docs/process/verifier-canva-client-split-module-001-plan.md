# VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001 Plan

Card: `VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001`
Sprint: `verifier-canva-client-split-module-2026-05-16`
Closeout key: `verifier-canva-client-split-module-v1`

## Operator Outcome

Keep the Canva client trust boundary easy to audit while continuing to shrink the root verifier. Steve gets confidence that Canva is read-only, rotation-safe, and governed without starting Canva asset-library features or Canva writes.

## Current Gap

`CANVA-CLIENT-001` is already shipped, but its verifier predicate still lives inline in `scripts/foundation-verify.mjs`. That leaves the Canva credential/rotation/read-only proof mixed into the 12K-line verifier monolith.

## Scope

1. Add `lib/foundation-canva-client-verifier.js`.
2. Move the existing Canva client verifier predicate into that module with behavior unchanged.
3. Add `buildFoundationCanvaClientVerifierDogfoodProof()`.
4. Add `scripts/process-verifier-canva-client-split-module-check.mjs` as a read-only focused proof.
5. Add package script `process:verifier-canva-client-split-module-check`.
6. Update the root verifier to delegate the Canva client check to the module and self-check the split.
7. Update Rebuild Plan / Current State / Recent Work closeout.

## Not Next

- No Canva writes.
- No Canva uploads, exports, design creation, asset library sync, or folder cleanup.
- No Marketing Video Lab wiring.
- No hub feature work.
- No paid-source auth, Build Intel extraction, Gmail sends, ClickUp writes, or Drive permission mutation.
- No route/auth/source/DB/backlog behavior change.

## Proof

- Dogfood proof recreates the Canva verifier failure class: missing refresh token, missing rotation-safe bootstrap evidence, exposed write wrapper, and missing official read-plan evidence all fail closed.
- Focused proof required: `npm run process:verifier-canva-client-split-module-check -- --json`.
- Full verifier required: `npm run foundation:verify -- --json-summary`.
- Full gate required before push: `npm run process:foundation-ship -- --card=VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001.json --closeoutKey=verifier-canva-client-split-module-v1 --commitRef=HEAD`.

## Acceptance

- Root verifier no longer owns the old inline Canva client predicate block.
- `lib/foundation-canva-client-verifier.js` owns the Canva client verifier function, dogfood proof, and split constants.
- Canva refresh token rotation remains guarded; the verifier still checks `replaceEnvValueLine`, `refusing_to_write_env_without_apply`, and `code_challenge_method`.
- The existing `CANVA-CLIENT-001` read-only guarantees remain intact: official Canva Connect API read wrappers only, no write/export/upload helpers, optional live smoke remains zero-spend, and secrets remain redacted.
- `scripts/foundation-verify.mjs` line count decreases from the pre-card baseline.

## Repair Path

If proof fails, revert only this split module and restore the inline predicate from git. Do not touch `.env`, rotate Canva tokens, call Canva APIs, or alter Canva client behavior inside this card.
