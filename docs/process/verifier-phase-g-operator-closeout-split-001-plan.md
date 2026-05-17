# VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 Plan

Card:
`VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001`

## Intent

Extract the Phase G operator closeout verifier checks from `scripts/foundation-verify.mjs` into a focused module while preserving the existing Foundation 1100, operator UI, changelog, daily summary, and source lifecycle expansion behavior.

## Scope

- Move the Foundation 1100 review, plain-English sweep, UI menu layout, Recent Builds UI, comprehensive changelog, daily executive summary, and source lifecycle expansion verifier checks into `lib/foundation-verifier-phase-g-operator-closeout.js`.
- Keep `scripts/foundation-verify.mjs` as orchestration only for this domain.
- Add a read-only focused proof script that dogfoods hidden Foundation 1100 closeout failure, hidden Phase G operator status failure, ownership smearing, missing metadata proof, and old inline predicates.
- Register a Recent Builds closeout and live backlog card for this split.

## Non-Scope

- No active sprint overlay replacement.
- No arbitrary tail extraction for line count.
- No behavior changes to Foundation 1100 review logic, copy checks, UI routes, Recent Builds, changelog, Daily Summary, source lifecycle expansion, source lifecycle completion, readiness gates, source extraction jobs, connectors, paid calls, hub features, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.

## Existing Code To Reuse

- `lib/foundation-review-sprint.js`
- `lib/foundation-plain-english.js`
- `lib/foundation-ui-menu-layout-polish.js`
- `lib/foundation-recent-builds-ui.js`
- `lib/foundation-change-log.js`
- `lib/foundation-daily-exec-summary.js`
- `lib/source-lifecycle.js`
- Prior verifier split patterns:
  - `lib/foundation-verifier-backend-split-assurance.js`
  - `lib/foundation-verifier-frontend-split-assurance.js`

## Proof

Dogfood proof recreates the failure class by forcing:

- hidden Foundation 1100 closeout failure
- hidden Phase G operator status failure
- hidden closeout ownership smearing
- missing metadata proof
- old inline Phase G predicates

Focused proof command:

```bash
npm run process:verifier-phase-g-operator-closeout-split-check -- --json
```

Full ship proof:

```bash
node --check lib/foundation-verifier-phase-g-operator-closeout.js scripts/process-verifier-phase-g-operator-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-phase-g-operator-closeout-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-phase-g-operator-closeout-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-phase-g-operator-closeout-split-v1 --commitRef=HEAD
```

## Exit Criteria

- Root verifier line count decreases from 11041.
- Root verifier delegates Phase G operator closeout checks through `evaluateFoundationVerifierPhaseGOperatorCloseout`.
- Old inline `foundation1100BuildLogExact`, `plainEnglishBuildLogExact`, and `sourceLifecycleBuildLogExact` root predicates are gone.
- Full Foundation ship gate passes, commit is pushed, and work continues to the next coherent verifier domain.
