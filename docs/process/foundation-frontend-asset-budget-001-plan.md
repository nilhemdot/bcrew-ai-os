# FOUNDATION-FRONTEND-ASSET-BUDGET-001 Plan

## What
Add a focused Foundation frontend asset-budget guardrail for `/foundation`: discover the real JS/CSS assets from `public/foundation.html`, measure raw bytes, gzip bytes, served status, and cache-control posture, feed the same snapshot into the nightly code-quality audit, and prove the budget with a read-only process check.

Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused. The card reuses `lib/code-quality-nightly-audit.js`, `public/foundation.html`, `scripts/foundation-verify.mjs`, `docs/process/foundation-frontend-perf-audit-001-plan.md`, `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`, `scripts/process-code-quality-nightly-audit-check.mjs`, the approval-integrity validator, the Plan Critic ledger, and the live Current Sprint overlay instead of rebuilding audit infrastructure.

## Why
Steve needs the Foundation UI to stay fast and trustworthy while frontend and hub work continues. The earlier frontend monolith split made `public/foundation.js` smaller, but there is no durable budget proving future split files, CSS, cache headers, or missing static assets stay visible before the UI gets slow again.

Operator value: Steve and the team can keep building hubs against Foundation only if the command surface stays fast, visible, and honest. This unlocks safer hub/frontend work because the morning audit will name asset bloat or cache posture drift before operators feel the UI getting slow.

## Acceptance Criteria
- `FOUNDATION-FRONTEND-ASSET-BUDGET-001` has live backlog, Current Sprint, approved plan, and Plan Critic pass truth before build.
- The budget discovers assets dynamically from `public/foundation.html` instead of hardcoding a fixed asset count.
- The snapshot reports raw bytes, gzip bytes, line count, served status, HTTP status, cache-control, aggregate totals, and plain-English findings.
- Dogfood proof recreates the original audit class: oversized assets fail, missing assets fail, large no-store assets warn, aggregate bloat fails, and healthy split assets pass.
- The nightly code-quality audit consumes the same budget snapshot instead of its old three-file detector.
- The focused script is read-only and report-only: no DB writes, no backlog mutation, no UI mutation, no auto-fixes.
- The focused check/process script is read-only by default and has no `--apply` mode because this card is report-only; any future cache-header or bundling apply path must be a separate approved card.
- Root `foundation:verify` has ID-named coverage for the card, module, package script, dogfood proof, and closeout registration when done.

## Definition Of Done
- Existing code reused: `lib/code-quality-nightly-audit.js`, `public/foundation.html`, `scripts/foundation-verify.mjs`, the approval-integrity validator, Plan Critic ledger, Current Sprint overlay, and live backlog.
- New focused code lives in `lib/foundation-frontend-asset-budgets.js` and `scripts/process-foundation-frontend-asset-budget-check.mjs`.
- `npm run process:foundation-frontend-asset-budget-check -- --json` passes against the real Foundation page and serves every discovered asset without a risk-level budget failure.
- `npm run process:code-quality-nightly-audit-check -- --json` includes the dynamic asset budget snapshot.
- `npm run foundation:verify -- --json-summary` passes with the new ID-named coverage.
- `npm run process:foundation-ship -- --card=FOUNDATION-FRONTEND-ASSET-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FRONTEND-ASSET-BUDGET-001.json --closeoutKey=foundation-frontend-asset-budget-v1 --commitRef=HEAD` passes before push.

## Details
This is a narrow Foundation reliability V1. The module reads the real Foundation HTML and extracts local script/style references so the invariant follows current asset truth as files are split. It measures repo bytes and, during focused proof, live served headers from the local dashboard. Risk-level failures are missing assets, failed asset responses, single JS/CSS assets above risk budgets, and aggregate raw/gzip bloat. Review-level findings include warning-budget growth and large no-store JS/CSS assets. That keeps the gate useful without blocking hub work just because the current static server still uses `no-store` for JS/CSS.

The proof must call the real function path and synthetic dogfood fixtures. It must not accept substring-only checks such as “the report says asset budget.” The root verifier registration in `scripts/foundation-verify.mjs` is intentionally thin because the verifier remains a known >5,000-line monolith; this card adds no new verifier responsibility beyond one small ID-named registration that delegates behavior to `lib/foundation-frontend-asset-budgets.js`. The split/extraction plan is to keep all asset-budget behavior in the new focused module now, and continue the existing verifier proof-module split queue rather than putting frontend-budget logic into the root verifier.

Gate decision tree: focused proof for the new asset-budget module, read-only process script, and nightly-audit integration; full `process:foundation-ship` before push because the root verifier and package scripts are touched. The focused command must stay fast, targeting under two minutes, so future hub/frontend work will actually run it.

## Risks
- Risk: the budget becomes another stale static list. Repair path: fail if asset discovery does not come from `public/foundation.html`.
- Risk: current `no-store` cache posture makes every run fail. Repair path: treat large no-store assets as review findings, not risk failures, until a later cache-policy card changes serving behavior.
- Risk: adding to `scripts/foundation-verify.mjs` grows a known monolith. Repair path: keep the verifier change to imports plus one ID-named check group, and leave broader verifier split work to the existing verifier monolith cleanup queue.
- Risk: the nightly audit reports noise. Repair path: surface the aggregate snapshot and only promote new/changed budget failures to backlog with Steve approval.

## Tests
- `node --check lib/foundation-frontend-asset-budgets.js scripts/process-foundation-frontend-asset-budget-check.mjs lib/code-quality-nightly-audit.js scripts/foundation-verify.mjs`
- `npm run process:foundation-frontend-asset-budget-check -- --json`
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-FRONTEND-ASSET-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FRONTEND-ASSET-BUDGET-001.json --closeoutKey=foundation-frontend-asset-budget-v1 --commitRef=HEAD`

## Not Next
Do not redesign the Foundation UI, bundle assets, change cache headers, add compression middleware, wire Marketing Video Lab, build Canva asset-library features, run paid-source auth, start Build Intel extraction, add hub feature work, mutate Drive permissions, or work Meeting Vault Phase B in this sprint.
