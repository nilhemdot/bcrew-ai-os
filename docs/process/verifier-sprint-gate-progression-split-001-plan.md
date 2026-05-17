# VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 Plan

Card:
`VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001`

## Scope

- Move only the Current Sprint gate-progression verifier domain into `lib/foundation-verifier-sprint-gate-progression.js`.
- The domain is Foundation sprint system/cadence, verify-gate tiering, rebuild-plan reconcile, Plan Critic replacement, security behavior proof, and verifier behavior sweep.
- Stop before `STRATEGY-HUB-MEETING-READY-001`; that and later feature/product cards remain separate verifier domains.
- Keep `scripts/foundation-verify.mjs` as orchestration.
- No active sprint overlay replacement.
- No arbitrary tail extraction.

## What Changes

- Add `lib/foundation-verifier-sprint-gate-progression.js` with the focused evaluator and dogfood proof.
- Replace the inline Current Sprint gate-progression block in `scripts/foundation-verify.mjs` with `evaluateFoundationVerifierSprintGateProgression`.
- Add `scripts/process-verifier-sprint-gate-progression-split-check.mjs` as the read-only focused proof.
- Register `process:verifier-sprint-gate-progression-split-check` in `package.json`.
- Add closeout metadata and this handoff so the ship gate can verify the work.

## What Does Not Change

- No Strategy Hub Meeting Ready, Avatar import, source grid, marketing, brand, verification-runs, changelog, or Foundation UI complete extraction in this sprint.
- No source extraction jobs, paid calls, connector auth, Drive permission changes, email sends, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of the gate progression checks.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.

## Dogfood Proof Recreates The Failure Class

Dogfood proof recreates the failure class before closeout.

The focused proof must call `buildFoundationVerifierSprintGateProgressionDogfoodProof()` and prove the synthetic evaluator rejects:

- hidden Current Sprint system/cadence failure
- hidden verify-gate tiering failure
- hidden Plan Critic gate failure
- hidden security behavior proof failure
- hidden verifier behavior sweep failure
- old inline root predicates still being present

Compilation, substring checks, and line-count changes alone are not acceptable.

## Acceptance Checks

- Approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script is read-only.
- Root verifier delegates to the new module.
- Old inline sprint gate-progression predicates are gone from root.
- `scripts/foundation-verify.mjs` line count decreases from the pre-split JS-counted baseline and lands below 10K.
- `foundation:verify` remains green.
- Full Foundation ship gate passes before push.

## Commands

```bash
node --check lib/foundation-verifier-sprint-gate-progression.js scripts/process-verifier-sprint-gate-progression-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-sprint-gate-progression-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-sprint-gate-progression-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --closeoutKey=verifier-sprint-gate-progression-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SPRINT-GATE-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-sprint-gate-progression-split-v1 --commitRef=HEAD
```

## Risks

- This split must preserve the exact active-or-historical sprint wording checks instead of turning them into loose substring proof.
- The root verifier is below 10K after this split, but the clean target remains below 5K.
- The next split should re-inspect the remaining root and pick the next coherent domain from repo truth.
