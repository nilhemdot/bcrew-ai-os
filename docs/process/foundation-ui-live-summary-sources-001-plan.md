# FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 Plan

## What

Move the Foundation Overview system-status rows out of frontend-owned live-looking copy and into a source-backed `currentStateSummary` payload on `/api/foundation-hub`.

V1 changes:

- Add `lib/foundation-current-state-summary.js` as the current-state summary contract builder.
- Add `currentStateSummary` to the default and full Foundation Hub payloads.
- Update `public/foundation-current-state-renderers.js` to render system maturity rows from `hub.currentStateSummary.surfaceRows`.
- Keep a visible degraded fallback if the payload is missing instead of pretending old hardcoded UI truth is current.
- Add a focused read-only proof script for the card.
- Add thin delegated verifier coverage and a closeout record.

## Why

The nightly audit found that Foundation UI embedded live-looking current-state summary truth directly in browser JS. That is the same drift class as hardcoded KPI years: the UI can keep saying a source is ready, healthy, or complete after the API/source layer changes.

The Foundation Overview should be an operator surface over source/backlog/API truth, not a second source of truth.

Operator value: Steve can trust the Foundation Overview as a live command surface instead of manually wondering whether the page is stale copy. If KPI/source/current-sprint inputs change, the Overview changes from the payload. If the payload is missing, the UI shows a degraded state instead of a false-ready status.

## Acceptance Criteria

- `/api/foundation-hub` exposes `currentStateSummary` with:
  - `schemaVersion`
  - `generatedAt`
  - `cardId`
  - `sourcePosture`
  - `surfaceRows`
  - `summary`
  - `sourceRefs`
- `public/foundation-current-state-renderers.js` does not own the live system-status row array.
- The Current State table renders from `hub.currentStateSummary.surfaceRows`.
- Synthetic payload dogfood proves changing a payload row changes the rendered output without editing frontend copy.
- KPI/source counts in the Current State payload are derived from runtime inputs, not fixed literals.
- The nightly audit no longer flags `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001` for active frontend live-summary copy.
- Missing payload state is visibly degraded; it does not fall back to stale “ready” claims.
- Dogfood proof recreates the original audit failure class by changing current-state source inputs and proving the rendered row copy follows the payload instead of frontend literals.

## Definition Of Done

- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001` is moved through the live sprint stages with timestamps.
- Plan Critic pass is recorded at `>= 9.8`.
- Approval file exists under `docs/process/approvals/`.
- Focused proof passes.
- `foundation:verify` passes.
- Full `process:foundation-ship` passes on committed HEAD.
- Closeout is registered in Recent Builds and pushed to `origin/main`.

## Details

Existing code/docs/scripts to reuse:

- `public/foundation-current-state-renderers.js` owns the current Overview renderer and table component.
- `lib/hub-read-routes.js` owns `/api/foundation-hub` summary/full payload construction.
- `lib/code-quality-nightly-audit.js` owns the current hardcoded-live-truth detector.
- `lib/foundation-build-closeout-overnight-records.js` owns current overnight closeout records.
- `scripts/foundation-verify.mjs` owns thin root verifier coverage.
- Live backlog and Current Sprint DB state remain task truth.
- Current plan/state docs remain the repo-truth narrative.

Implementation notes:

- Keep the new source-backed rows in a focused module instead of adding more responsibility to `server.js` or `public/foundation.js`.
- `scripts/foundation-verify.mjs` is over 5,000 lines; only add thin delegated coverage that calls the focused module/proof. Do not expand it with inline row assertions or new verifier responsibility. The split/extraction plan is: behavior lives in `lib/foundation-current-state-summary.js` and `scripts/process-foundation-ui-live-summary-sources-check.mjs`; the root verifier only delegates to those focused seams.
- Route/performance budget: `/api/foundation-hub` summary remains under the existing Foundation Hub warning budget of 800KB and should stay comfortably under the 300s ship-gate budget. The focused proof and full ship gate must fetch the real summary route and record payload bytes. If this adds meaningful payload weight, reduce row text or compact source metadata before shipping.
- Do not change source contracts, KPI data, hub feature behavior, auth, DB schema, or external integrations.
- Do not wire Marketing Video Lab, Canva asset libraries, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Risks

- Risk: moving UI row ownership can drop current-state rows.
  - Guard: focused proof checks required row IDs and rendered text.
- Risk: this becomes another code-owned truth pile.
  - Guard: payload rows include source references/provenance and dynamic values for live counts/health.
- Risk: the audit detector becomes theater if it is merely silenced.
  - Guard: dogfood mutates the payload and proves UI output changes from payload data, not frontend literals.
- Risk: adding coverage to the root verifier grows a monolith.
  - Guard: root verifier gets only thin delegated coverage; the behavior lives in `lib/foundation-current-state-summary.js` and the focused proof script.
- Rollback/repair path: if route proof fails or payload bytes regress, remove `currentStateSummary` from the Foundation Hub response and keep the frontend degraded fallback while the contract is repaired. If dogfood fails, do not ship; keep the backlog card in returned/scoping and repair the contract builder before moving to done.

## Tests

Focused proof:

- `node --check lib/foundation-current-state-summary.js public/foundation-current-state-renderers.js scripts/process-foundation-ui-live-summary-sources-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-ui-live-summary-sources-check -- --json`

Gate decision tree uses static, focused, and full based on blast radius. This card requires a full gate because it touches a hot Foundation route payload, an operator frontend surface, package scripts, and thin canonical verifier coverage. Static proof is `node --check`, focused proof is `process:foundation-ui-live-summary-sources-check`, and full proof is `foundation:verify` plus `process:foundation-ship`.

Broader proof:

- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001.json --closeoutKey=foundation-ui-live-summary-sources-v1 --commitRef=HEAD`
