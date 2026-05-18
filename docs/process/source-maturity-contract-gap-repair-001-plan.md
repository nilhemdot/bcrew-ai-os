# SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001 Plan

## What

Repair the source maturity contract gap for `SRC-VIDEO-001` using existing repo and live DB truth only. V1 changes the stale `Pending Revalidation` contract into a narrow `V1 Source Boundary Locked` contract for the existing video URL manifest in `source_crawl_items` plus the YouTube subtitle transcript V1 lane. It does not run extraction, create targets, call providers, repair auth, or certify richer video understanding.

## Why

`SOURCE-MATURITY-GAP-FOLLOWUP-001` routed `SRC-VIDEO-001` to `SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001` because source maturity still sees the connected stage as the next gap. That is stale: the repo and DB already show video-link inventory and video-content extraction targets with successful manifest/subtitle evidence. Leaving the contract as pending keeps Foundation noisy and slows safe overnight source repair work.

Operator value for Steve: the useful thing this unlocks is cleaner source maturity truth at build speed. The video source stops reappearing as a fake unconnected source-contract gap, while the real work still left for Steve to approve, richer video extraction, remains visibly blocked as its own lane.

## Acceptance Criteria

- `SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001` has a live backlog card, complete Current Sprint metadata, Plan Critic pass, approval JSON, focused proof command, closeout key, and closeout registry record.
- `SRC-VIDEO-001` is `V1 Source Boundary Locked` only for the existing manifest/subtitle V1 boundary.
- The source note and source registry say the same boundary and preserve follow-up status for Loom, Drive video, Zoom, Skool, no-subtitle vision/transcription, rich-vision, and GOD-mode video understanding.
- The focused proof calls the real `buildSourceMaturityGridSnapshot`, `buildSourceExtractionCoverageSnapshot`, `buildSourceCoverageCloseoutSnapshot`, and source contract validation path.
- The proof dogfoods the stale pending-revalidation contract and proves it produces a connected-stage gap.
- The proof dogfoods the repaired V1 contract and proves connected/trusted/monitored/extracted stages clear while the source does not become fake-complete.
- `source_contract_registry` is sync-applied from `getSourceContracts()` so DB-backed registry truth matches the contract.
- No live extraction, transcript fetch, screenshot capture, crawl, model call, provider call, paid run, auth repair, external write, Drive permission mutation, or Agent Feedback auto-send runs.

## Definition Of Done

- `lib/source-maturity-contract-gap-repair.js` owns the repair contract, snapshot checks, synthetic dogfood, and closeout renderer.
- `scripts/process-source-maturity-contract-gap-repair-check.mjs` owns scaffold, Current Sprint progression, focused proof, close-card behavior, and write guards.
- `lib/source-contracts.js`, `docs/source-registry.md`, and `docs/source-notes/video-link-inventory.md` all describe the same V1 boundary.
- Closeout is written to `docs/handoffs/2026-05-18-source-maturity-contract-gap-repair-closeout.md`.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` are green before push.

## Details

Reuse existing code: `lib/source-contracts.js`, `lib/source-contract-validation-layer.js`, `lib/source-maturity-grid.js`, `lib/source-extraction-coverage.js`, `lib/source-coverage-closeout.js`, `lib/source-maturity-gap-followup.js`, build-lane Current Sprint helpers, Plan Critic, approval integrity, process write guard, source contract registry sync, and closeout records.

Reuse existing docs: `docs/source-notes/video-link-inventory.md`, `docs/source-registry.md`, `docs/handoffs/2026-05-18-source-maturity-gap-followup-triage.md`, `docs/rebuild/current-state.md`, and `docs/rebuild/current-plan.md`.

Reuse existing scripts: `scripts/process-source-maturity-gap-followup-check.mjs`, `scripts/process-source-contract-validation-layer-check.mjs`, `scripts/process-source-maturity-grid-check.mjs`, `scripts/process-source-extraction-coverage-check.mjs`, `scripts/process-source-coverage-closeout-check.mjs`, `npm run source-contract-registry:sync`, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

Split plan and no-new-responsibility plan: do not add new responsibility to `scripts/foundation-verify.mjs`, `server.js`, `lib/foundation-db.js`, `public/foundation.js`, or `lib/foundation-verifier-source-once-over-progression.js`. New behavior lives in `lib/source-maturity-contract-gap-repair.js`; the focused script is the process wrapper. Existing source contract and docs get narrow V1-boundary edits only.

File-size and artifact budgets: keep the hand-written module and focused proof under 1,500 lines each, keep `lib/source-contracts.js` under its current hand-written budget, keep closeout under 8 KB, and keep docs append-only and concise. If the proof needs broader verifier behavior later, split it into a source-maturity repair verifier module rather than expanding a critical root.

Behavior proof: the focused check must prove the actual function path, not only source markers. It calls `buildSourceMaturityGridSnapshot`, `buildSourceExtractionCoverageSnapshot`, `buildSourceCoverageCloseoutSnapshot`, and `evaluateSourceContractValidationLayer`, then compares the live `SRC-VIDEO-001` row against docs. It also uses a synthetic dogfood case where a stale `Pending Revalidation` contract produces a connected gap, and a repaired V1 contract clears connected/trusted/monitored/extracted while leaving atom/routing work open.

API/process path: this card does not need a new route, but it must preserve the existing source maturity/source extraction/source coverage API behavior because those routes are built from the same snapshot functions. Current Sprint and backlog behavior are proven through the focused process script and live DB overlay.

Gate decision tree: use static syntax checks first, then the focused `process:source-maturity-contract-gap-repair-check` while iterating, then source-contract registry sync, backlog hygiene, full `foundation:verify`, and full `process:foundation-ship` because the blast radius touches shared Foundation source contracts, package scripts, current-state docs, closeout registry, and verifier coverage.

Speed bound: the focused proof is proportional and should stay under 2 minutes; do not run repeated full verification while proof metadata or docs are still being repaired. Full verification runs once after focused proof is green, and the ship gate runs once after commit.

## Risks

- Risk: the repair over-certifies video extraction. Mitigation: the signed boundary is manifest/subtitle V1 only, with Loom, Drive video, Zoom, Skool, no-subtitle vision/transcription, rich-vision, and GOD-mode video understanding explicitly excluded.
- Risk: the card accidentally runs extraction. Mitigation: proof is read-only except governed backlog/sprint/registry sync/closeout writes, and not-next boundaries forbid extraction target creation, transcript fetch, screenshots, crawls, provider calls, and model calls.
- Risk: maturity looks complete from labels. Mitigation: the proof checks that the next gap is no longer connected/trusted/monitored but does not require full completion; atom/routing gaps can remain.
- Risk: live registry drifts from source contracts. Mitigation: run `npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-contract-gap-repair --json`.

## Tests

- `node --check lib/source-maturity-contract-gap-repair.js scripts/process-source-maturity-contract-gap-repair-check.mjs`
- `npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-contract-gap-repair --json`
- `npm run process:source-maturity-contract-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001.json --closeoutKey=source-maturity-contract-gap-repair-v1 --commitRef=HEAD`

## Not Next

No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, model summarization, OAuth repair, auth-required provider call, paid-source run, external write, Google Drive permission mutation, request-access email, ClickUp write, Gmail send, live Agent Feedback auto-send, Harlan, Fal, voice, Canva, OpenHuman, Marketing Hub production, broad UI redesign, or `MEETING-VAULT-ACL-001` Phase B.

reject substring-only proof. The focused proof must call the real source maturity, extraction coverage, coverage closeout, and validation behavior paths.
