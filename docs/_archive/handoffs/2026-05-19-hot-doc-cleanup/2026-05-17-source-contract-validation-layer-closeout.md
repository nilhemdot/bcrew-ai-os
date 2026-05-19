# Source Contract Validation Layer Closeout

Card: `SOURCE-CONTRACT-VALIDATION-LAYER-001`
Closeout key: `source-contract-validation-layer-v1`
Branch: `foundation/system-health-red-to-green-001`
Date: 2026-05-17

## What Changed

- Added `lib/source-contract-validation-layer.js` as the Foundation-owned fail-closed validation layer for live `SRC-*` source contracts.
- Added explicit validation profiles for all current source contracts covering owner, lane/brand, auth posture, extraction posture, freshness expectation, connector status, atom-flow expectation, and blocked reason/next action.
- Added `assertSourceContractAllowsExtraction()` so extractor work can refuse auth-required or otherwise blocked source contracts before it runs.
- Wired source-contract validation into `lib/foundation-source-contract-verifier.js` and full `foundation:verify`.
- Added focused proof at `scripts/process-source-contract-validation-layer-check.mjs` and registered `process:source-contract-validation-layer-check`.
- Updated `docs/source-registry.md` and `docs/rebuild/current-state.md` with the fail-closed contract boundary.
- Added plan, approval, Plan Critic log, Current Sprint ownership, and closeout registry coverage.

## Proof

- `node --check lib/source-contract-validation-layer.js lib/foundation-source-contract-verifier.js lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-cleanup-records.js scripts/process-source-contract-validation-layer-check.mjs scripts/foundation-verify.mjs`
- `npm run process:source-contract-validation-layer-check -- --json`
  - Live validation covers `39` source contracts with `39` pass, `14` blocked, and `0` active auth-required extraction targets.
  - Dogfood rejects missing owner, missing auth posture, missing extraction posture, blocked source without blocker/next action, stale/fuzzy freshness, and active auth-required extraction targets.
  - Valid no-auth source contracts pass while auth-required contracts remain blocked from extraction.
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-CONTRACT-VALIDATION-LAYER-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-VALIDATION-LAYER-001.json --closeoutKey=source-contract-validation-layer-v1 --commitRef=HEAD`

## Boundaries

No auth-required extraction, OAuth, OpenHuman, Fal, voice, Harlan, Canva, Foundation UI polish, connector live calls, external-write jobs, schema migration, root line-count split, or live Agent Feedback auto-send job ran in this sprint.

## Next

Recommended next sprint after this ships: `EXTRACTION-RUNTIME-READINESS-001`, unless source-contract validation turns red and needs a targeted repair first.
