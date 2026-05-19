# VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001 Closeout

## Summary

Extracted the Recent Builds v2 closeout verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-recent-builds-verifier.js`.

## What Changed

- Added a focused Recent Builds closeout verifier module.
- Replaced the root verifier's inline Recent Builds closeout checks with a thin delegation.
- Added a read-only focused proof script for the split.
- Added process approval, package script, and build closeout registration.

## Dogfood Proof

The focused proof recreates the failure modes that would make this split unsafe:

- Missing proof commands are rejected.
- Invalid closeout schema rows are rejected.
- Missing `whereItLives`/closeout metadata is rejected.
- Healthy synthetic Recent Builds closeout fixtures still pass.

Substring-only proof is not enough; the proof executes the module predicates.

## Known Limits

- This does not split the rest of `scripts/foundation-verify.mjs`.
- This does not change `/api/foundation/build-log` behavior.
- This does not alter build-log closeout records or frontend rendering.
- This does not touch hub feature work, Canva writes, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Next

Continue verifier monolith cleanup with another coherent verifier proof domain after this card ships cleanly.
