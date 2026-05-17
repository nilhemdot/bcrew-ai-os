# VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 Plan

Card:
`VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001`

## Scope

- Move only the post-Phase-G readiness blocker closeout verifier checks into `lib/foundation-verifier-readiness-blocker-closeout.js`.
- The domain is source lifecycle completion, source lifecycle dynamic counts, synthesis verification, extraction run hardening, Drive access request, Meeting Vault ACL readiness, and Meeting Vault auto-enforcement closeout proof.
- Keep `scripts/foundation-verify.mjs` as orchestration that gathers data, calls the focused module, and pushes returned checks.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## What Changes

- Add `lib/foundation-verifier-readiness-blocker-closeout.js` with the focused evaluator and dogfood proof.
- Replace the inline readiness blocker closeout block in `scripts/foundation-verify.mjs` with `evaluateFoundationVerifierReadinessBlockerCloseout`.
- Add `scripts/process-verifier-readiness-blocker-closeout-split-check.mjs` as the focused read-only proof.
- Register `process:verifier-readiness-blocker-closeout-split-check` in `package.json`.
- Add closeout metadata and this handoff so the ship gate can verify the work.

## What Does Not Change

- No source extraction jobs, paid calls, connector auth, Drive permission changes, email sends, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of the readiness blocker checks.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.

## Dogfood Proof Recreates The Failure Class

Dogfood proof recreates the failure class before closeout.

The focused proof must call `buildFoundationVerifierReadinessBlockerCloseoutDogfoodProof()` and prove the synthetic evaluator rejects:

- hidden source lifecycle completion failure
- hidden synthesis verification failure
- hidden extraction hardening failure
- hidden Drive or Meeting Vault closeout failure
- old inline root predicates still being present

Compilation, substring checks, and line-count changes alone are not acceptable.

## Acceptance Checks

- Approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script is read-only.
- Root verifier delegates to the new module.
- Old inline readiness blocker build-log exact predicates are gone from root.
- `scripts/foundation-verify.mjs` line count decreases from the pre-split JS-counted baseline.
- `foundation:verify` remains green.
- Full Foundation ship gate passes before push.

## Commands

```bash
node --check lib/foundation-verifier-readiness-blocker-closeout.js scripts/process-verifier-readiness-blocker-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-readiness-blocker-closeout-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-readiness-blocker-closeout-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --closeoutKey=verifier-readiness-blocker-closeout-split-v1
npm run process:foundation-ship -- --card=VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-readiness-blocker-closeout-split-v1 --commitRef=HEAD
```

## Risks

- The coverage source must include the new module source so done-card literals remain visible to surface trust.
- The dynamic-counts proof remains async because the closeout handoff existence check uses `repoFileExists`.
- The split must stop at the readiness blocker closeout domain and leave current-sprint/process-security checks for separate sprints.
