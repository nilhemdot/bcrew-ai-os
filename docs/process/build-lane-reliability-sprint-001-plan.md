# BUILD-LANE-RELIABILITY-SPRINT-001 Plan

## What
Ship one P0 Foundation reliability train that makes the build lane stop wasting time on hand-stitched cards, thin Current Sprint metadata, brittle proof scripts, repeated full verifier loops, Current Sprint surface drift, and served-code fanout drift.

This is one sprint with six live backlog subcards:

- `CURRENT-SPRINT-SURFACE-API-DRIFT-001`
- `FOUNDATION-CARD-SCAFFOLD-001`
- `CURRENT-SPRINT-METADATA-STANDARD-GUARD-001`
- `PROOF-DESIGN-BRITTLENESS-GUARD-001`
- `VERIFY-LOOP-EFFICIENCY-GUARD-001`
- `SHIP-GATE-SERVED-CODE-FANOUT-SYNC-001`

The umbrella card is `BUILD-LANE-RELIABILITY-SPRINT-001`. One governed plan, approval, focused proof, closeout, and ship gate covers the train so the build system does not spend six separate slow ceremony loops on reliability plumbing.

This is main session approved Foundation process work, not side work or hub work. The requestedSharedFiles are the Foundation-owned process files listed in the file-size plan and tests below, and the active sprint scope is this build-lane reliability reset.

## Why
The source-contract sprint shipped real value, but it exposed unacceptable drag:

- the Current Sprint surface looked empty while DB truth had an active item;
- proof coverage failed on source shape instead of behavior;
- a forbidden-job regex matched its own proof pattern text;
- active sprint metadata had to be repaired mid-sprint;
- small repairs triggered repeated full verifier runs;
- fanout had to reason through served-code/API closeout drift.

These are assembly-line failures. Extraction and connector work should wait until the build lane can create, validate, and display the required build artifacts up front.

The useful operator behavior is direct: Steve can open Recent Work and see the real active sprint, Codex can scaffold a build-ready card without inventing metadata, and future builders get faster feedback from focused proof instead of burning time on repeated full verifier loops. That improves build speed and quality in the real workflow.

## Acceptance Criteria
- The six live reliability subcards exist and are covered by the umbrella sprint.
- `/api/foundation/current-sprint` exposes live DB sprint truth through both the nested `currentSprint` payload and top-level compatibility fields: `sprint`, `items`, `stages`, and `cadence`.
- Foundation Hub Current Sprint payload and `/api/foundation/current-sprint` agree with DB truth.
- A complete synthetic Foundation card scaffold passes.
- A thin synthetic card fails before build starts.
- A complete synthetic Current Sprint item passes metadata validation.
- A thin synthetic Current Sprint item fails for missing existing-work, proof, approval, closeout, and no-go fields.
- Proof coverage accepts card IDs referenced through exported constants.
- Proof scanners ignore their own proof fixture text but still reject a real forbidden runtime job/config.
- Verify-loop evaluation flags repeated full `foundation:verify` runs before focused proof is green.
- Verify-loop evaluation allows focused proof plus one final ship gate.
- Fanout sync evaluation classifies stale served-code drift, missing local closeout, and synced closeout states distinctly.
- The focused proof is read-only by default; live creation/closeout paths require explicit `--apply` / `--close-card` posture.
- `foundation:verify` includes verifier coverage for the Current Sprint compatibility fields and reliability card IDs.
- `BUILD-LANE-RELIABILITY-SPRINT-001` has Plan Critic score 10/10 and pass status with the proof command `npm run process:build-lane-reliability-sprint-check -- --json`.

## Definition Of Done
- Add `lib/build-lane-reliability.js`.
- Add `scripts/process-build-lane-reliability-sprint-check.mjs`.
- Register `process:build-lane-reliability-sprint-check`.
- Patch `/api/foundation/current-sprint` to expose top-level compatibility fields without removing the nested `currentSprint` contract.
- Add verifier coverage for the route shape and reliability card IDs.
- Create/repair live backlog cards for the umbrella and six subcards.
- Create the active Current Sprint overlay with all seven items and complete metadata.
- Add approval JSON, closeout registry record, and closeout handoff.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.
- Definition of Done for `BUILD-LANE-RELIABILITY-SPRINT-001`: the live umbrella card and six subcards are done, the active sprint overlay has all seven items in `done_this_sprint`, the closeout key is `build-lane-reliability-sprint-v1`, and every proof command listed in Tests passes.

## Details
Existing code to reuse:

- `foundation_sprints` and `foundation_sprint_items` for sprint truth.
- `backlog_items` for live card truth.
- `plan_critic_runs` for durable plan approval proof.
- `validateExistingWorkCheck()` for existing-work metadata.
- `process-write-guard.js` for explicit apply/close-card posture.
- `process:foundation-ship`, `process:fanout-check`, `process:post-ship-fanout`, and `foundation:verify`.
- Foundation Hub and Current Sprint route payloads.

Implementation shape:

- `lib/build-lane-reliability.js` owns pure evaluators and dogfood fixtures.
- The focused proof script validates live state, route payloads, docs, package registration, closeout registration, and dogfood behavior.
- The focused proof script can create/update live backlog and sprint overlay only with explicit write flags.
- The Current Sprint endpoint keeps the existing nested payload and adds compatibility fields to prevent empty-surface reads.

File-size plan:

- New hand-written module stays under 1,500 lines.
- New proof script stays under 1,500 lines.
- `scripts/foundation-verify.mjs` remains orchestration-only; add only minimal coverage constant wiring if needed.
- Approval JSON is a data record under 80 lines.
- Closeout handoff is a report artifact under 160 lines.

Gate decision tree: use focused proof and targeted API/static checks while iterating. Run full `foundation:verify` once near final ship, and run full `process:foundation-ship` before push.

## Risks
The main risk is turning reliability into another heavy process layer. The mitigation is one umbrella sprint, one focused proof, explicit write posture, and pure validators that can be reused by future scaffolds.

Another risk is hiding route drift by only checking the Hub payload. The mitigation is to compare DB truth, `/api/foundation/current-sprint`, and `/api/foundation-hub` in the focused proof.

Repair path: if focused proof fails, repair the exact failed scaffold, metadata, proof, route, or fanout classifier. Do not run extractor work. Do not run repeated full `foundation:verify` loops until focused proof is green.

## Tests
- `node --check lib/build-lane-reliability.js lib/hub-read-routes.js lib/foundation-current-sprint-verifier.js scripts/process-build-lane-reliability-sprint-check.mjs`
- `npm run process:build-lane-reliability-sprint-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-LANE-RELIABILITY-SPRINT-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-RELIABILITY-SPRINT-001.json --closeoutKey=build-lane-reliability-sprint-v1 --commitRef=HEAD`

## Not Next
Do not start `EXTRACTION-RUNTIME-READINESS-001` until this ships. Do not build extractor work, connectors, OAuth, auth-required extraction, Harlan, Fal, voice, Canva, OpenHuman, Foundation UI polish, root splitting, Drive permission mutation, or the live Agent Feedback auto-send job in this sprint.
