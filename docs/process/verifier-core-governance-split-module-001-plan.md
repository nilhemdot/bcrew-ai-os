# VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 Plan

## What

Extract the existing core governance/security verifier predicates from `scripts/foundation-verify.mjs` into `lib/foundation-core-governance-verifier.js`.

The split keeps the same PASS/FAIL intent for:

- Foundation architecture doctrine and checkpoint promotion
- People / Agents navigation and docs clarity
- Owners source-note signoff visibility
- docs authority indexes
- direct model/transcription host blocking outside approved adapters
- backlog seed/live drift and done-closeout guardrails
- DB constraint/source-reference audit health
- admin-gated Foundation/Ops/doc read APIs
- app auth role gates
- local admin bypass locality checks
- PDF export token forwarding
- generic FUB proxy mutation blocking

The root verifier should delegate these checks to `evaluateFoundationCoreGovernanceVerifier()` and keep only orchestration/wiring.

## Why

`scripts/foundation-verify.mjs` is still over the active danger line at about `14,675` lines. The verifier is now safer than it was, but it is still too large to audit quickly. A giant verifier makes it easier to weaken a critical security/governance row while thinking we are only making a small cleanup change.

This card reduces that monolith without changing route behavior, auth behavior, source contracts, DB schema, backlog behavior, hub features, Canva behavior, paid-source auth, extraction, screenshots, atoms, or Build Intel work.

Operator value for Steve: future Foundation greens become easier to trust because one critical proof domain lives in a focused module with direct dogfood fixtures instead of being buried inside a 14K-line script. This unlocks a faster real workflow for reviewing failed governance/security proof because the operator can read one small module instead of hunting through the whole canonical verifier.

## Acceptance Criteria

- `lib/foundation-core-governance-verifier.js` exports `evaluateFoundationCoreGovernanceVerifier()` and `buildFoundationCoreGovernanceVerifierDogfoodProof()`.
- `scripts/foundation-verify.mjs` delegates the extracted rows to that module.
- `scripts/foundation-verify.mjs` line count is lower than the recorded `14,675` baseline.
- `scripts/process-verifier-core-governance-split-module-check.mjs` is read-only and registered as `process:verifier-core-governance-split-module-check`.
- The focused proof validates approval, live backlog, Current Sprint state, durable Plan Critic pass, module delegation, dogfood rejection, package script registration, line-count reduction, and exact closeout when present.
- Dogfood proof recreates the failure class and proves the module fails closed when direct host calls, broad ungated routes, Host-header localhost bypass, FUB proxy mutations, invalid DB references, or weak done-closeout guard terms appear.
- `npm run backlog:hygiene -- --json`, `npm run foundation:verify -- --json-summary`, and `process:foundation-ship` pass before push.

## Definition Of Done

- The live backlog card `VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001` is in `done`.
- Current Sprint shows the card in `done_this_sprint` with a sprint-review posture.
- The closeout exists at `docs/handoffs/2026-05-16-verifier-core-governance-split-module-closeout.md`.
- `lib/foundation-build-closeout-overnight-records.js` has a matching closeout record under `verifier-core-governance-split-module-v1`.
- Dashboard and worker are restarted after the commit if needed so runtime serves the pushed HEAD.
- Only this Foundation card's files are committed and pushed. Unrelated local files, mockup assets, and Codex usage edits remain untouched.

## Details

Files in scope:

- `lib/foundation-core-governance-verifier.js`
- `scripts/process-verifier-core-governance-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-core-governance-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/handoffs/2026-05-16-verifier-core-governance-split-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

Existing work reused:

- Existing code in `lib/foundation-current-sprint-store.js` for guarded Current Sprint overlay writes
- Existing code in `lib/foundation-backlog-store.js` / live backlog truth in `backlog_items` as task truth
- Existing library code in `lib/approval-integrity.js` for approval validation
- Existing library code in `lib/process-plan-critic.js` for Plan Critic pass logging
- Existing scripts pattern from prior verifier split focused proof scripts
- Existing docs in `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md`
- Existing code in `lib/foundation-build-log.js` closeout fanout
- existing route split modules such as `lib/hub-read-routes.js`, `lib/fub-source-routes.js`, `lib/auth-routes.js`, and `lib/app-page-routes.js`

Gate decision tree: static syntax checks run first, focused proof runs through `process:verifier-core-governance-split-module-check`, and the full gate runs through `foundation:verify` plus `process:foundation-ship` because the blast radius touches the canonical verifier and process proof surface.

Speed boundary: the focused proof stays fast and proportional by reading repo/source surfaces once, using synthetic dogfood fixtures, and avoiding live external-source calls. The full ship gate is still required because the verifier is load-bearing, but this card does not add another heavy extraction or hub workflow.

## Risks

- Risk: extraction accidentally changes a PASS/FAIL row. Mitigation: focused proof and full `foundation:verify` compare live behavior after delegation.
- Risk: proof becomes another substring check. Mitigation: dogfood creates failing fixtures for the exact governance/security failure classes.
- Risk: line-count cleanup drifts into auth or route behavior changes. Mitigation: not-next boundaries explicitly forbid behavior changes and hub feature work.
- Risk: current sprint/live backlog drift makes the board misleading. Mitigation: update live DB, docs, Plan Critic, and Current Sprint overlay before calling the card done.
- Risk: unrelated dirty files get swept into the commit. Mitigation: stage only scoped files and verify `git status --short` before commit.

Rollback/repair path: if the focused proof or full verifier fails, keep the card in `building_now`, repair the module or root delegation only, and rerun the focused proof before any closeout. If behavior changed beyond verifier ownership, revert the behavioral part and keep only the extraction.

## Tests

```bash
node --check lib/foundation-core-governance-verifier.js
node --check scripts/process-verifier-core-governance-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001.json --closeoutKey=verifier-core-governance-split-module-v1 --commitRef=HEAD
```
