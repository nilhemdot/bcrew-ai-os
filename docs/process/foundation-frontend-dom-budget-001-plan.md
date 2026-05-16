# FOUNDATION-FRONTEND-DOM-BUDGET-001 Plan

## What

Add a Foundation frontend DOM rebuild budget so route/render changes are measured before they make the browser feel slow again.

V1 changes:

- Add `lib/foundation-frontend-dom-budgets.js` as the centralized DOM signal budget module.
- Measure Foundation frontend scripts discovered from `public/foundation.html` instead of only scanning `public/foundation.js`.
- Count `document.createElement`, `appendChild`, `innerHTML`, event listeners, total lines, and total bytes by split renderer file.
- Add route-render measurements from a VM proof for a real Current State renderer path.
- Replace the inline nightly-audit DOM counter with the centralized budget snapshot.
- Add a focused read-only proof script, thin verifier coverage, approval file, and closeout record.

## Why

The nightly audit found heavy DOM rebuild signals after the frontend split. The file-size split reduced monolith risk, but server speed is only half of the user experience. If Foundation routes rebuild large DOM trees on every filter, route switch, or state refresh, Steve sees a slow dashboard even when the APIs are fast.

Operator value: Foundation frontend performance gets an early warning system. Future hub/Foundation route changes can be checked against a concrete browser-work budget instead of waiting for Steve to say the website feels slow.

## Acceptance Criteria

- The DOM budget module discovers Foundation frontend JS assets from `public/foundation.html`.
- The module returns a report-only snapshot with rows, aggregate summary, findings, budgets, and no write/autofix posture.
- The nightly audit consumes `measureFoundationFrontendDomBudgetFromRepo()` and keeps `FOUNDATION-FRONTEND-DOM-BUDGET-001` as the proposed card for DOM churn findings.
- The old inline `public/foundation.js`-only DOM counter is removed from the nightly audit.
- VM route proof executes a real Current State renderer path and records create/append/innerHTML counts.
- Dogfood proof recreates the original failure class with a synthetic heavy render fixture and proves the budget returns `risk`.
- Current Foundation frontend scripts may be `review` while the system is still paying off DOM churn. They must not be `risk` for this V1 to close.
- The focused proof is read-only and does not mutate DB, backlog, sprint state, files, or runtime state.

## Definition Of Done

- `FOUNDATION-FRONTEND-DOM-BUDGET-001` is moved through live Current Sprint stages with timestamps.
- Plan Critic pass is recorded at `>= 9.8`.
- Approval file exists under `docs/process/approvals/`.
- Focused proof passes.
- `foundation:verify` passes.
- Full `process:foundation-ship` passes on committed HEAD.
- Closeout is registered in Recent Builds and pushed to `origin/main`.

## Details

Existing code/docs/scripts to reuse:

- `public/foundation.html` is the source of truth for Foundation frontend asset/script discovery.
- `lib/foundation-frontend-asset-budgets.js` already owns Foundation asset discovery patterns.
- `lib/code-quality-nightly-audit.js` owns the existing `foundation-dom-rebuild-risk` finding.
- `scripts/process-frontend-current-state-renderers-split-check.mjs` already proved renderer code can run safely in a Node VM/fake DOM.
- `scripts/foundation-verify.mjs` owns thin canonical verifier coverage.
- `lib/foundation-build-closeout-overnight-records.js` owns overnight closeout records.
- Live backlog and Current Sprint DB state remain task truth.
- Current plan/state docs remain the repo-truth narrative.

Implementation notes:

- Keep counting/classification behavior in `lib/foundation-frontend-dom-budgets.js`. Do not bury budget rules inside the nightly audit.
- `scripts/foundation-verify.mjs` is over 5,000 lines; only add thin delegated coverage that imports the module/proof. This is a split/extraction plan: behavior lives in the new module and focused proof, and the root verifier gets no new responsibility beyond a thin wrapper assertion. Do not expand it with inline DOM assertions or add more verifier ownership.
- VM route proof should execute the actual Current State renderer file with an instrumented fake DOM, not a substring check.
- The focused process check is read-only by default. It has no `--apply` path and must not write live state, backlog, sprint rows, DB rows, reports, or runtime state.
- This card does not optimize renderers or change UI behavior. It creates the measurement layer. Optimization belongs to a future card if the budget stays high.
- Do not touch Marketing Hub, Canva, Google Flow/Veo, hub feature work, auth, DB schema, external integrations, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Risks

- Risk: the DOM budget becomes another noisy audit finding.
  - Guard: V1 returns structured summary/status so future work can decide whether current state is healthy, review, or risk.
- Risk: the proof is only static source counting.
  - Guard: VM route proof executes a real Current State renderer and records DOM work.
- Risk: the current split frontend is already above budget.
  - Guard: this V1 allows `review` but blocks `risk`; later optimization can use the measured rows.
- Risk: root verifier grows again.
  - Guard: root verifier gets only thin delegated checks; behavior lives in the module and focused proof script.
- Rollback/repair path: if the centralized snapshot or VM proof fails, keep the old nightly finding intact and leave the card in executing. If the current repo snapshot is risk-level, do not close this card; either raise the finding as a follow-up optimization card or adjust only with explicit evidence.

## Tests

Focused proof:

- `node --check lib/foundation-frontend-dom-budgets.js scripts/process-foundation-frontend-dom-budget-check.mjs scripts/foundation-verify.mjs lib/code-quality-nightly-audit.js`
- `npm run process:foundation-frontend-dom-budget-check -- --json`

Gate decision tree uses static, focused, and full based on blast radius. This card requires a full gate because it touches the nightly code-quality audit, a Foundation frontend performance contract, package scripts, build closeout records, docs, and thin canonical verifier coverage. Static proof is `node --check`; focused proof is `process:foundation-frontend-dom-budget-check`; full proof is `foundation:verify` plus `process:foundation-ship`.

Broader proof:

- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-FRONTEND-DOM-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FRONTEND-DOM-BUDGET-001.json --closeoutKey=foundation-frontend-dom-budget-v1 --commitRef=HEAD`
