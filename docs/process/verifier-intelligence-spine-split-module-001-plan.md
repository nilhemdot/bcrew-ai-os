# VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001 Plan

## What

Extract the existing intelligence-spine verifier predicates from `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-spine-verifier.js`.

The split keeps the same PASS/FAIL intent for:

- `INTEL-JOBS-001` job ledger and governed extraction provenance
- `REPORT-MINING-001` old-system report-shape salvage gate
- `INTEL-ATOM-001` governed report artifact, atom, hit, and Scoper-query proof
- `RETRIEVAL-001`, `RETRIEVAL-002`, and `RETRIEVAL-003` lexical, semantic, and hybrid retrieval proof
- retrieval eval baseline before Strategy Hub consumes evidence
- `SYNTHESIS-FACTS-001` source-backed synthesis fact ledger
- `SYNTHESIS-ENGINE-001` clustered synthesis quality guard
- `ACTION-ROUTER-001` approval-gated routes with owner and provenance

The root verifier should delegate these checks to `evaluateFoundationIntelligenceSpineVerifier()` and keep only orchestration/wiring.

## Why

`scripts/foundation-verify.mjs` is still above the active danger line at about `14,538` lines. The intelligence spine is one of the most important Foundation proof domains because it guards the substrate that later hubs and build-intel tools will consume.

Leaving these rows inline makes the verifier harder to audit and makes it easier to weaken retrieval, synthesis, or Action Router proof while thinking the change is a harmless cleanup.

Operator value for Steve: the intelligence spine becomes inspectable as one focused module. Future failures around atoms, retrieval, synthesis, or Action Router approval can be debugged without hunting through the full verifier monolith.

## Acceptance Criteria

- `lib/foundation-intelligence-spine-verifier.js` exports `evaluateFoundationIntelligenceSpineVerifier()` and `buildFoundationIntelligenceSpineVerifierDogfoodProof()`.
- `scripts/foundation-verify.mjs` delegates the extracted intelligence-spine rows to that module.
- `scripts/foundation-verify.mjs` line count is lower than the recorded `14,538` baseline.
- `scripts/process-verifier-intelligence-spine-split-module-check.mjs` is read-only and registered as `process:verifier-intelligence-spine-split-module-check`.
- The focused proof validates approval, live backlog, Current Sprint state, durable Plan Critic pass, module delegation, dogfood rejection, package script registration, line-count reduction, and exact closeout when present.
- Dogfood proof recreates the failure class and proves the module fails closed when job-ledger provenance, retrieval tier guards, Action Router approval gates, or synthesis evidence proof are weakened.
- `npm run backlog:hygiene -- --json`, `npm run foundation:verify -- --json-summary`, and `process:foundation-ship` pass before push.

## Definition Of Done

- The live backlog card `VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001` is in `done`.
- Current Sprint shows the card in `done_this_sprint` with sprint-review posture.
- The closeout exists at `docs/handoffs/2026-05-16-verifier-intelligence-spine-split-module-closeout.md`.
- `lib/foundation-build-closeout-overnight-records.js` has a matching closeout record under `verifier-intelligence-spine-split-module-v1`.
- Dashboard and worker are restarted by `process:foundation-ship` so runtime serves the pushed `HEAD`.
- Only this Foundation card's files are committed and pushed. Unrelated local files, mockup assets, and Codex usage edits remain untouched.

## Details

Files in scope:

- `lib/foundation-intelligence-spine-verifier.js`
- `scripts/process-verifier-intelligence-spine-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-intelligence-spine-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/handoffs/2026-05-16-verifier-intelligence-spine-split-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

Existing work reused:

- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- Existing code reused: `lib/foundation-core-governance-verifier.js`, `scripts/process-verifier-core-governance-split-module-check.mjs`, `lib/foundation-build-log.js`, `lib/approval-integrity.js`, `lib/process-plan-critic.js`, `lib/foundation-current-sprint-store.js`, and the existing intelligence stores/proof scripts listed below.
- Existing verifier split pattern from `lib/foundation-core-governance-verifier.js`
- Existing focused proof pattern from `scripts/process-verifier-core-governance-split-module-check.mjs`
- Existing live backlog and Current Sprint helpers
- Existing approval integrity validation
- Existing Plan Critic run ledger
- Existing closeout registry and ship/fanout gates
- Existing intelligence stores and proof scripts; this card does not rewrite them

Large-file split plan: this card touches `scripts/foundation-verify.mjs`, which is over 5,000 lines, only to remove one coherent proof domain and replace it with a thin delegation call. No new verifier responsibility may be added to the root file. If the work expands into unrelated verifier checks, stop and open a new card.

Check-script write posture: `scripts/process-verifier-intelligence-spine-split-module-check.mjs` is read-only by default and has no `--apply` path. It validates live state, files, Plan Critic rows, closeout ownership, and dogfood fixtures only; it must not write DB rows, files, backlog state, or Current Sprint overlays.

Gate decision tree: static syntax checks run first, focused proof runs through the real process path `npm run process:verifier-intelligence-spine-split-module-check -- --json`, and the full gate runs through `foundation:verify` plus `process:foundation-ship` because the blast radius touches the canonical verifier and proof of intelligence substrate.

Behavior proof, not substring proof: the focused command proves real behavior through the actual function path `evaluateFoundationIntelligenceSpineVerifier()`, the focused process command, and live API/DB snapshots from the existing intelligence stores. It then calls `buildFoundationIntelligenceSpineVerifierDogfoodProof()` to prove synthetic broken states fail closed. The proof rejects missing job-ledger provenance, missing retrieval tier guard, missing Action Router approval gate, and missing synthesis evidence proof. Substring-only proof is rejected and is not enough to close this card.

Speed boundary: the focused proof stays bounded by reading repo/source surfaces once, using already-computed DB snapshots, and using synthetic dogfood fixtures. It should stay under 10 seconds locally and must not run extraction, embeddings, synthesis refresh, action routing, or any paid/source-auth workflow. The full ship gate remains the slower canonical proof and should stay within the 300-second process budget.

## Risks

- Risk: extraction accidentally changes a PASS/FAIL row. Mitigation: focused proof and full `foundation:verify` compare live behavior after delegation.
- Risk: proof becomes another substring check. Mitigation: dogfood creates failing fixtures for missing ledger provenance, missing tier guard, missing approval gate, and missing synthesis evidence proof.
- Risk: cleanup drifts into intelligence behavior changes. Mitigation: not-next boundaries explicitly forbid store rewrites, extraction, synthesis refresh, action-router mutation, hub features, and Build Intel work.
- Risk: current sprint/live backlog drift makes the board misleading. Mitigation: update live DB, docs, Plan Critic, and Current Sprint overlay before calling the card done.
- Risk: unrelated dirty files get swept into the commit. Mitigation: stage only scoped files and verify `git status --short` before commit.

Rollback/repair path: if focused proof or full verifier fails, keep the card in `building_now`, repair only the module/root delegation, and rerun focused proof. If behavior changed beyond verifier ownership, revert the behavioral part and keep only extraction wiring.

## Tests

```bash
node --check lib/foundation-intelligence-spine-verifier.js
node --check scripts/process-verifier-intelligence-spine-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-intelligence-spine-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001.json --closeoutKey=verifier-intelligence-spine-split-module-v1 --commitRef=HEAD
```
