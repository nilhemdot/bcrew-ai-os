# Build Lane Reliability Sprint Closeout

Card: `BUILD-LANE-RELIABILITY-SPRINT-001`

Closeout key: `build-lane-reliability-sprint-v1`

## What Changed
- Added `lib/build-lane-reliability.js` with scaffold, sprint metadata, proof brittleness, verify-loop, Current Sprint surface, and fanout sync evaluators.
- Added `scripts/process-build-lane-reliability-sprint-check.mjs` as the focused proof and guarded apply/close path.
- Patched `/api/foundation/current-sprint` to keep `currentSprint` and also expose top-level `sprint`, `items`, `stages`, and `cadence`.
- Compacted the default `/api/foundation-hub` Current Sprint summary so build-lane cards do not blow the V2 payload budget.
- Added verifier coverage so Current Sprint compatibility fields and reliability card IDs are checked.
- Created live backlog truth for the umbrella reliability sprint and six subcards.
- Repaired shipped-card focused proofs so source-contract, payload-budget, and Current Sprint verifier split checks accept historical closeout ownership instead of requiring their old sprint to remain active.
- Updated the Current Sprint verifier dogfood fixture to include the new top-level route compatibility markers.

## Proof
- `node --check lib/build-lane-reliability.js lib/hub-read-routes.js lib/foundation-current-sprint-verifier.js scripts/process-build-lane-reliability-sprint-check.mjs`
- `npm run process:build-lane-reliability-sprint-check -- --json`
- `npm run process:source-contract-validation-layer-check -- --json`
- `npm run process:foundation-hub-payload-budget-v2-check -- --json`
- `npm run process:verifier-current-sprint-split-module-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-LANE-RELIABILITY-SPRINT-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-RELIABILITY-SPRINT-001.json --closeoutKey=build-lane-reliability-sprint-v1 --commitRef=HEAD`

## Dogfood
- Complete synthetic Foundation card scaffold passes.
- Thin card fails before build starts.
- Complete Current Sprint metadata passes.
- Thin Current Sprint metadata fails for missing proof, plan, approval, closeout, existing-work, and no-go fields.
- Card ID coverage via imported constants passes.
- Literal forbidden-job pattern text inside proof fixtures passes.
- Real forbidden runtime job/config fails.
- Repeated full verify before focused proof is green is flagged.
- Focused proof plus one final ship gate passes.
- Stale served-code fanout and missing local closeout classify with separate repair actions.

## Boundaries
No extractor work, connectors, OAuth, auth-required extraction, Harlan, Fal, voice, Canva, OpenHuman, Foundation UI polish, root splitting, Drive permission mutation, or live Agent Feedback auto-send ran in this sprint.

## Next
Recommended next sprint: `EXTRACTION-RUNTIME-READINESS-001`, unless the build-lane reliability proof turns red and needs a targeted repair.
