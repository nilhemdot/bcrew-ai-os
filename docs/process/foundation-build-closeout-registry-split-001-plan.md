# FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 Plan

Card: `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001`
Sprint: `foundation-build-closeout-registry-split-2026-05-15`
Closeout key: `foundation-build-closeout-registry-split-v1`

## What

Split the oversized Foundation build closeout registry so `lib/foundation-build-closeout-records.js` drops below the 5,000-line architecture-risk threshold.

This card moves a coherent control-plane/recent-foundation closeout slice into `lib/foundation-build-closeout-control-plane-records.js` and leaves the public build-log lookup behavior unchanged. `getFoundationBuildCloseouts()`, closeout validation, Recent Builds enrichment, and build-log fallback lookup must still resolve all existing records.

## Why

The previous ship gate exposed that closeout registry truth is load-bearing: the Recent Builds window and `FOUNDATION-SWEEP-001` closeout visibility can make a ship gate fail. Keeping that truth in one growing 5,812-line file makes it hard to review and easy to drop records while chasing performance or cleanup.

Operator value: Steve gets a tighter closeout truth layer. The useful real workflow is that Recent Builds, sprint review, and ship gates can answer "what shipped and what card closed?" quickly without Steve or a builder hunting through one giant file. This unlocks faster, higher-quality sprint review because closeout truth stays readable and reliable.

## Acceptance Criteria

- `lib/foundation-build-closeout-control-plane-records.js` owns the moved control-plane/recent-foundation closeout slice.
- `lib/foundation-build-closeout-records.js` imports and spreads the new module and drops from `5,812` lines to below `5,000` lines.
- `getFoundationBuildCloseouts()` returns the same required closeout keys after the split, including `source-outage-boundary-v1`, `foundation-performance-v1`, `plan-critic-architectural-rules-v1`, `foundation-surface-sweep-v1`, and `foundation-build-closeout-registry-split-v1`.
- Build-log source discovery includes the split module so closeout-key fallback checks cannot miss moved records.
- Focused dogfood proof accepts a healthy split and rejects a synthetic registry where a moved record is missing.
- `/api/foundation/build-log?limit=500` still exposes `FOUNDATION-SWEEP-001` through `foundation-surface-sweep-v1`.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, package script, focused proof, and verifier coverage all name `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001`.

## Definition Of Done

- `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001` closes under `foundation-build-closeout-registry-split-v1`.
- `docs/process/foundation-build-closeout-registry-split-001-plan.md` and `docs/process/approvals/FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-foundation-build-closeout-registry-split-check.mjs` passes and proves the split preserves records and rejects a dropped-record fixture.
- `foundation:verify` and full `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- `lib/foundation-build-log.js`,
- `lib/foundation-build-log-source.js`,
- `lib/foundation-build-closeout-records.js`,
- `lib/foundation-build-closeout-cleanup-records.js`,
- `lib/foundation-build-closeout-overnight-records.js`,
- `lib/foundation-build-closeout-tightening-records.js`,
- `lib/foundation-build-log-monolith-slice.js`,
- `scripts/process-foundation-build-log-monolith-slice-check.mjs`.

Existing docs to reuse:

- `docs/process/monolith-split-continue-001-plan.md`,
- `docs/process/verifier-runtime-reliability-split-001-plan.md`,
- `docs/handoffs/2026-05-15-verifier-runtime-reliability-split-closeout.md`,
- `AGENTS.md` Foundation rebuild discipline.

Existing scripts to reuse:

- `npm run process:foundation-build-log-monolith-slice-check -- --json`,
- `npm run backlog:hygiene -- --json`,
- `npm run foundation:verify -- --json-summary`,
- `npm run process:foundation-ship`.

Live backlog and Current Sprint truth to reuse:

- `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001` already exists in the live backlog as a scoped Foundation card.
- Current Sprint overlay tables remain the operating surface for stage progression; this card must start in Scoping, move to Building Now after approval, then close in Done This Sprint.

Gate decision tree: static checks first, focused split proof second, `foundation:verify` third, and full `process:foundation-ship` before push because this touches closeout truth, build-log lookup, package scripts, verifier coverage, and live sprint/backlog state. Keep the focused proof thin and fast enough to run by default; it should validate registry invariants without another heavy API crawl.

Large-file split plan: this card intentionally touches `lib/foundation-build-closeout-records.js`, a file over the 5,000-line architecture-risk threshold, only to extract existing records into a named module and add a thin import/spread. No new closeout bodies belong in the root registry. If the work expands into build-log behavior changes, route redesign, hub feature work, or Canva/Marketing wiring, stop and create a separate card.

## Risks

- Risk: a moved closeout record drops out of Recent Builds or validation.
  - Response: focused proof compares required keys through the actual `getFoundationBuildCloseouts()` path and rejects a missing-record fixture. Repair path: stop the sprint, restore the missing record in the split module, and rerun focused proof before any commit.
- Risk: this becomes another broad closeout registry rewrite.
  - Response: move one contiguous domain slice only; behavior stays unchanged. If the split changes behavior, fail closed and reopen the plan rather than patching Recent Builds symptoms.
- Risk: the root file gets smaller but source discovery misses split records.
  - Response: update build-log source discovery and verify moved keys are visible through both registry source and live build-log lookup. Follow-up work belongs in a new card if source discovery needs a broader redesign.

## Tests

- `node --check lib/foundation-build-closeout-control-plane-records.js lib/foundation-build-closeout-registry-split.js scripts/process-foundation-build-closeout-registry-split-check.mjs lib/foundation-build-closeout-records.js lib/foundation-build-log-source.js scripts/foundation-verify.mjs`
- `npm run process:foundation-build-closeout-registry-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001.json --closeoutKey=foundation-build-closeout-registry-split-v1 --commitRef=HEAD`

## Not Next

Do not build Marketing Video Lab live routes, Canva asset writes, Build Intel extraction, paid-source auth, Meeting Vault Phase B, Drive permission mutation, hub feature work, or broad verifier/Foundation DB rewrites in this card.
