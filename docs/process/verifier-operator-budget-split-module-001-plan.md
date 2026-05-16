# VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001 Plan

Card: `VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001`

## What

Extract the operator budget verifier checks from `scripts/foundation-verify.mjs` into a focused module.

This card moves the proof domain for route budgets, endpoint budgets, Foundation frontend asset budgets, Foundation DOM budgets, and verifier failure-reporting into `lib/foundation-operator-budget-verifier.js`, with a focused read-only proof script at `scripts/process-verifier-operator-budget-split-module-check.mjs`.

## Why

The remaining high-risk Foundation monolith is `scripts/foundation-verify.mjs` at more than 13,000 lines. The server, DB, CSS, and main Foundation frontend files are now under the 5,000-line danger line, but the verifier still carries too many proof domains inline.

Useful operator behavior: future Foundation green checks become easier to trust because budget/performance proof lives in one named module with dogfood fixtures instead of being buried inside the root verifier. When a budget/proof fails, Steve and the team can see whether the failure is route latency, payload bloat, frontend asset size, DOM churn, or verifier reporter behavior from one focused proof instead of searching a 13,000-line verifier. This unlocks speed and quality for the real workflow of morning Foundation review and sprint closeout without feature drift.

## Acceptance Criteria

- `lib/foundation-operator-budget-verifier.js` owns the route/endpoint/frontend-budget verifier checks and exports a single evaluator plus dogfood proof.
- `scripts/foundation-verify.mjs` delegates this domain with a thin wrapper and no longer owns the old inline budget ensure blocks.
- Dogfood recreates old budget failures:
  - `/api/source-of-truth` over latency must fail.
  - Foundation Hub payload over budget must fail.
  - Endpoint metrics missing/over budget must fail.
  - Frontend asset risk must fail.
  - DOM risk must fail.
- Root invariant: each operator budget verifier check stays green only when the actual measured runtime/code evidence is inside budget and synthetic over-budget or missing-proof cases fail closed. The check should prove real behavior through actual function paths, route/payload measurements, live backlog/closeout artifacts, and synthetic failing cases, not active-sprint status, current blocker position, warning suppression, or substring-only evidence.
- Focused proof is read-only, checks live backlog/current sprint/Plan Critic evidence, and proves root line count decreased.
- No route behavior, auth behavior, DB schema, source extraction, hub features, Canva asset-library behavior, paid-source auth, or Drive permissions change.

## Definition Of Done

- Live backlog has `VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001` in `done` with closeout key `verifier-operator-budget-split-module-v1`.
- Current Sprint shows the card moved through Scoping, Sprint Ready, Building Now, and Done This Sprint.
- Plan Critic row exists with score at least 9.8.
- Approval file validates and records this plan snapshot.
- Focused proof, `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.

## Details

Reuse existing modules:

- `lib/foundation-route-budget-verifier.js`
- `lib/foundation-endpoint-budgets.js`
- `lib/foundation-frontend-asset-budgets.js`
- `lib/foundation-frontend-dom-budgets.js`
- `lib/foundation-verify-reporter.js`

The root verifier may pass already-loaded sources and payload snapshots into the module. The module owns the assertions and dogfood, while the root owns orchestration only.

## Risks

- Risk: moving checks drops coverage.
  - Guard: focused proof compares the old inline labels, requires module checks to pass, and dogfoods old failures.
- Risk: adding another verifier module still grows the root verifier.
  - Guard: root receives a thin delegate only and line count must stay below the pre-split baseline.
- Risk: budget findings become noisy.
  - Guard: this card changes verifier structure only; it does not change budget thresholds.
- Risk: a failed proof leaves the verifier half-split.
  - Guard: if focused proof or full verifier fails, the card stays in Building Now. Do not close the sprint. Repair the module until the moved checks match behavior, or restore the delegated section from git and record the regression reason before trying a smaller slice.
- Risk: dogfood becomes another green-theater check.
  - Guard: if the dogfood fixture does not recreate and reject the old budget failures, the card is blocked even if syntax and full verifier pass.

## Tests

Gate decision: full Foundation ship gate. This card touches `scripts/foundation-verify.mjs`, `package.json`, live backlog/sprint evidence, and a new verifier module, so it must run static checks, focused proof, full verifier, and the canonical Foundation ship wrapper.

- `node --check lib/foundation-operator-budget-verifier.js scripts/process-verifier-operator-budget-split-module-check.mjs scripts/foundation-verify.mjs`
- `npm run process:verifier-operator-budget-split-module-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-OPERATOR-BUDGET-SPLIT-MODULE-001.json --closeoutKey=verifier-operator-budget-split-module-v1 --commitRef=HEAD`

Repair path: if any focused or full gate fails, keep the card out of Done This Sprint, fix the failing module/root delegate, and rerun the same command set. If a moved assertion cannot be preserved safely, revert only this card's verifier edits from git, leave the backlog card in Building Now with the failure note, and split a smaller verifier domain next. Do not weaken the budget thresholds or remove a failing check to force a green closeout.

## Not Next

Do not optimize frontend renderers, change route budgets, redesign Runtime Health, build hub features, wire Marketing Video Lab, build Canva asset-library workflows, add paid-source auth, run Build Intel extraction, work Meeting Vault Phase B, or mutate Drive permissions.
