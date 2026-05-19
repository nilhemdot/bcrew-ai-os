# Verifier Readiness Blocker Closeout Split Closeout

Date: 2026-05-17
Card: `VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001`
Closeout: `verifier-readiness-blocker-closeout-split-v1`

## Summary

- Extracted source lifecycle completion, dynamic counts, synthesis verification, extraction run hardening, Drive access request, Meeting Vault ACL readiness, and Meeting Vault auto-enforcement verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-readiness-blocker-closeout.js`.
- Added `scripts/process-verifier-readiness-blocker-closeout-split-check.mjs` as a read-only focused proof.
- Left the active sprint overlay untouched.
- Kept the split domain-based and stopped before current-sprint/sprint-system/process-security checks.

## Proof

- `node --check lib/foundation-verifier-readiness-blocker-closeout.js scripts/process-verifier-readiness-blocker-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-readiness-blocker-closeout-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-readiness-blocker-closeout-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --closeoutKey=verifier-readiness-blocker-closeout-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-readiness-blocker-closeout-split-v1 --commitRef=HEAD`

## Dogfood

`buildFoundationVerifierReadinessBlockerCloseoutDogfoodProof()` rejects synthetic failures for hidden source lifecycle completion failure, hidden synthesis verification failure, hidden extraction hardening failure, hidden Drive/Meeting Vault closeout failure, and old inline root predicates still being present.

## Known Limits

- This does not finish the verifier monolith split.
- This does not get `scripts/foundation-verify.mjs` below 5,000 lines.
- This does not move current-sprint/sprint-system/process-security checks.
- This does not change source extraction jobs, connector auth, Drive permissions, paid calls, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. The next likely domain starts at the current-sprint and process-security block after the Foundation sprint system/cadence checks, but the boundary should be re-inspected before building.
