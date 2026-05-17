# SOURCE-CONTRACT-VALIDATION-LAYER-001 Plan

## What
Build a Foundation-owned validation layer for source contracts so connector and extractor work cannot build on thin, ambiguous, or unsafe source truth.

V1 adds `lib/source-contract-validation-layer.js`, a focused proof script, source-contract verifier coverage, and source registry/current-state documentation. The layer validates every current source contract against explicit auth, extraction, freshness, connector, lane, blocked-state, and atom-flow expectations.

This is active sprint scope approved by Steve in main session. It is not side work or hub work.

## Why
Source contracts are the upstream permission and meaning layer for Foundation. If a source row says "readable" but does not declare owner, auth posture, extraction posture, freshness expectation, connector status, atom-flow expectation, or blocked next action, later connector/extractor work can accidentally treat a thin contract as approved source supply.

The useful operator value for Steve and the team is fail-closed source readiness in a real workflow: no-auth/internal sources can pass, auth-required sources remain blocked, and future extractor work has a real contract check to call before it runs. This unlocks better quality and speed because Foundation can reject weak source supply before it becomes connector, extractor, hub, or agent behavior.

## Acceptance Criteria
- Reuse the existing live backlog card `SOURCE-CONTRACT-VALIDATION-LAYER-001`; do not create a duplicate card.
- Every current source contract validates source ID, owner, lane/brand where applicable, auth posture, extraction posture, freshness expectation, connector status, atom-flow expectation, and blocked reason/next action when blocked.
- Source registry and current-state docs state the validation contract and fail-closed boundary.
- Valid no-auth/internal source contracts pass.
- Missing owner fails.
- Missing auth posture fails.
- Missing extraction posture fails.
- Blocked source without blocker/reason/next action fails.
- Stale or fuzzy freshness expectation fails.
- Auth-required source contracts stay blocked and cannot start extraction.
- Existing auth-required blocked sources have no active extraction target.
- The focused proof calls the actual function path `evaluateSourceContractValidationLayer()` and `assertSourceContractAllowsExtraction()`; substring-only proof is rejected.
- No OAuth work, auth-required extraction, live connector calls, external-write jobs, UI polish, Harlan, Fal, voice, OpenHuman, Canva, or tiny root split happens in this sprint.

## Definition Of Done
- Add `lib/source-contract-validation-layer.js`.
- Add `scripts/process-source-contract-validation-layer-check.mjs`.
- Register `process:source-contract-validation-layer-check`.
- Add `docs/process/approvals/SOURCE-CONTRACT-VALIDATION-LAYER-001.json`.
- Wire validation coverage into `lib/foundation-source-contract-verifier.js` and full `foundation:verify`.
- Update `docs/source-registry.md` and `docs/rebuild/current-state.md` with the source-validation boundary.
- Add a closeout registry record and closeout handoff.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` before commit and push.

## Details
Existing code to reuse:

- `lib/source-contracts.js` for source contracts, connectors, and grouped source systems.
- `lib/source-contract-registry-table.js` for source ID shape and registry expectations.
- `lib/source-lifecycle-completion.js` for accepted-blocked source blocker/reason/next-action truth.
- `getExtractionControlSnapshot()` for the no-active-target proof on auth-required sources.
- `lib/foundation-source-contract-verifier.js` for canonical source-contract verifier ownership.
- Existing live backlog, Current Sprint, Plan Critic, approval integrity, backlog hygiene, and ship gate paths.

The validation layer is a pure evaluator plus explicit validation profiles. It does not sync registry rows, mutate source contracts, change extraction targets, run connectors, or touch route behavior.

File-size plan:

- `scripts/foundation-verify.mjs` is above the preferred hand-written module budget, so this sprint adds no new responsibility there. The root verifier remains orchestration-only and continues to delegate through `evaluateFoundationSourceContractVerifierOrchestration()`.
- New responsibility lives in `lib/source-contract-validation-layer.js`, a focused module kept under the 1,500-line preferred hand-written module budget.
- `lib/foundation-source-contract-verifier.js` receives only source-contract-domain verifier wiring, not broad root logic.
- The approval JSON is a data record with an explicit file-size budget under 80 lines.
- The closeout handoff is a report artifact with an explicit file-size budget under 140 lines.

Gate decision tree: static syntax check plus focused source-contract validation proof, then full `process:foundation-ship` because this touches source-contract verifier coverage and active Foundation source doctrine.

## Risks
The main risk is creating a second source-truth layer that drifts from source contracts. The mitigation is to require one validation profile per live `SRC-*` contract, reject phantom profiles, reuse lifecycle completion blockers, and verify source registry/current-state documentation.

Another risk is overclaiming readiness for auth-required or paid/auth sources. The mitigation is to treat those sources as blocked until authorized and prove no active extraction target can attach to them.

Repair path: if focused proof or `foundation:verify` fails, the layer fails closed. Do not patch a pass into verifier output, do not seed/repair live state from the check script, and do not run extraction. Repair the profile, source contract, blocker card, or documentation in the owning source layer, then rerun focused proof and the full ship gate.

## Tests
- `node --check lib/source-contract-validation-layer.js lib/foundation-source-contract-verifier.js scripts/process-source-contract-validation-layer-check.mjs`
- `npm run process:source-contract-validation-layer-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-CONTRACT-VALIDATION-LAYER-001 --planApprovalRef=docs/process/approvals/SOURCE-CONTRACT-VALIDATION-LAYER-001.json --closeoutKey=source-contract-validation-layer-v1 --commitRef=HEAD`

## Not Next
Do not run auth-required extraction, OAuth, OpenHuman, Fal, voice, Harlan, Canva, Foundation UI polish, connector live calls, external-write jobs, schema migration, or a root line-count split in this sprint.
