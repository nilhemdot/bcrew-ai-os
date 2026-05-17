# VERIFIER-FRONTEND-SPLIT-ASSURANCE-001 Plan

Card:
`VERIFIER-FRONTEND-SPLIT-ASSURANCE-001`

## Intent

Extract the frontend structural split assurance checks from `scripts/foundation-verify.mjs` into a focused module while preserving the existing stylesheet split and frontend split verifier behavior.

## Scope

- Move stylesheet monolith split assurance and frontend split verifier self-checks into `lib/foundation-verifier-frontend-split-assurance.js`.
- Keep `scripts/foundation-verify.mjs` as orchestration only for this domain.
- Add a read-only focused proof script that dogfoods hidden stylesheet split failure, hidden frontend split verifier failure, missing dogfood, old inline predicates, and missing closeout proof.
- Register a Recent Builds closeout and live backlog card for this split.

## Non-Scope

- No active sprint overlay replacement.
- No arbitrary tail extraction for line count.
- No behavior changes to CSS, frontend renderers, navigation, Recent Builds, runtime reliability, backend routes, DB stores, source contracts, connectors, paid calls, hub features, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.

## Existing Code To Reuse

- `lib/foundation-stylesheet-monolith-split.js`
- `lib/foundation-frontend-split-verifier.js`
- `scripts/process-stylesheet-monolith-split-check.mjs`
- `scripts/process-verifier-frontend-split-checks-module-check.mjs`
- Prior verifier assurance split patterns:
  - `lib/foundation-verifier-backend-split-assurance.js`
  - `scripts/process-verifier-backend-split-assurance-check.mjs`

## Proof

Dogfood proof recreates the failure class by forcing:

- hidden stylesheet split failure
- hidden frontend split verifier failure
- missing split dogfood
- old inline frontend split predicates
- missing closeout proof

Focused proof command:

```bash
npm run process:verifier-frontend-split-assurance-check -- --json
```

Full ship proof:

```bash
node --check lib/foundation-verifier-frontend-split-assurance.js scripts/process-verifier-frontend-split-assurance-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-frontend-split-assurance-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FRONTEND-SPLIT-ASSURANCE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-SPLIT-ASSURANCE-001.json --closeoutKey=verifier-frontend-split-assurance-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-FRONTEND-SPLIT-ASSURANCE-001 --closeoutKey=verifier-frontend-split-assurance-v1
npm run process:foundation-ship -- --card=VERIFIER-FRONTEND-SPLIT-ASSURANCE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-SPLIT-ASSURANCE-001.json --closeoutKey=verifier-frontend-split-assurance-v1 --commitRef=HEAD
```

## Exit Criteria

- Root verifier line count decreases from 11065.
- Root verifier delegates frontend structural split assurance through `evaluateFoundationVerifierFrontendSplitAssurance`.
- Old inline `stylesheetMonolithSplitCard` and `frontendSplitVerifierInput` root predicates are gone.
- Full Foundation ship gate passes, commit is pushed, and work continues to the next coherent verifier domain.
