# ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 Plan

## What

Close the P2 deep-audit finding that Admin deal-review policy dates are duplicated across the runner, job registry, and Ops UI copy.

Closeout key: `admin-deal-policy-source-contract-v1`.

This card creates one repo-local source contract for the Admin deal backlog cutoff, post-policy effective date, daily limit, maturity gate, source IDs, and write boundary. The runner, scheduled job definition, and Ops UI must consume that contract instead of carrying their own policy literals.

Not next:

- Do not change Admin review behavior or write new source fields.
- Do not run live Admin deal review jobs.
- Do not call Google Sheets, FUB, ClickUp, or any external connector.
- Do not change the Q2 policy dates or policy meaning.
- Do not start Value Builder or extraction expansion before the audit-control cleanup queue is done.

## Why

The May 19 deep audit found policy-date drift risk: the same Admin deal review rules were encoded in multiple places. That forces future policy changes to depend on manual grep work and makes audit/UI text drift from the runner.

## Definition Of Done

- `lib/admin-deal-policy-source-contract.js` owns the Admin deal policy dates, labels, daily limit, maturity days, source IDs, and write boundary.
- `scripts/review-admin-deals.mjs` imports policy values from the source contract instead of declaring date literals.
- `lib/foundation-jobs.js` builds the scheduled Admin backlog job args, summary, and inputs from the source contract.
- `public/ops.js` uses job/source-contract text for Admin backlog extra detail instead of hardcoded date copy.
- The nightly code-quality audit no longer proposes `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001` when source-contract proof passes.
- The old failure mode is dogfooded: local runner date constants, hardcoded job args, or hardcoded Ops UI policy text fail closed.
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001` closes and Current Sprint advances to `APPROVAL-THRESHOLD-REGISTRY-001`.

## Acceptance Criteria

- `npm run process:admin-deal-policy-source-contract-check -- --close-card --json` reports healthy.
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch` reports healthy and does not propose `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, and ship gate pass.

## Details

Root invariant: Admin deal policy is source-owned only when the runner, scheduled job, and Ops UI all read from the same contract. A central module existing is not enough if stale local constants remain in the runner or hardcoded UI copy.

Proof must exercise the actual function path, not just marker strings:

- `getAdminDealPolicySourceContract()` provides the policy metadata used by consumers.
- `getFoundationJobDefinition('admin-deal-backlog-review')` must return args and summary built from the contract.
- `buildCodeQualityNightlyAudit({ skipEndpointFetch: true })` must stop proposing this card only after the evaluator accepts runner/job/UI behavior.
- Dogfood fixtures must reject weak plans where the source module exists but the runner, job registry, or Ops UI still keeps local policy literals.

Substring-only proof is rejected. Comments or `.includes()` markers are not enough unless backed by the function/API/process paths above.

The V1 code path:

- Add `lib/admin-deal-policy-source-contract.js` with contract constants, job helper builders, source evaluator, and dogfood.
- Update `scripts/review-admin-deals.mjs` to import the contract.
- Update `lib/foundation-jobs.js` to build Admin backlog args/summary/inputs from the contract.
- Update `public/ops.js` so Admin backlog extra detail uses the job summary.
- Update `lib/code-quality-nightly-audit.js` so the old finding is suppressed only when the evaluator proves source-contract usage.
- Add `scripts/process-admin-deal-policy-source-contract-check.mjs` as the focused proof and closeout writer.

## Reuse Existing Work

Existing code:

- `scripts/review-admin-deals.mjs`
- `lib/foundation-jobs.js`
- `public/ops.js`
- `lib/code-quality-nightly-audit.js`
- `lib/deep-audit-findings-closure-gate.js`
- `lib/current-sprint-active-card-gate.js`
- `lib/process-write-guard.js`

Existing docs:

- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/source-notes/owners-dashboard.md`
- `docs/source-notes/freedom-sheet.md`
- `docs/process/deep-audit-findings-closure-gate-001-plan.md`

Existing scripts:

- `process:code-quality-nightly-audit-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `foundation:verify`
- `process:foundation-ship`

Existing policy:

- Audit findings become live backlog truth or shipped proof.
- Green means raw green; classification is not repair.
- Current Sprint is the executable command surface.
- Blockers block unsafe actions, not the whole sprint.
- Source-field corrections remain human-owned until an explicit apply lane is approved.

## Operator Value

Steve gets one maintainable policy point for the Admin deal review lane. The scheduled job and Ops UI now tell the same story as the runner, so a future policy date or daily quota change happens in one place and the audit can prove it.

## Speed Bound

The focused gate must stay under 2 minutes locally. It reads source files, live backlog/Current Sprint rows, and runs the code-quality audit with endpoint fetches skipped. It does not run deal review, read Sheets/FUB/ClickUp, mutate external systems, or run a full deep audit.

## Risks

- Risk: behavior changes in the deal review runner.
  - Mitigation: this card only changes where existing constants come from; it does not change review logic or source writes.
- Risk: a source contract module exists but consumers still drift.
  - Mitigation: dogfood rejects runner-local constants, hardcoded job args, and Ops UI policy literals.
- Risk: scheduled job args lose the backlog cutoff.
  - Mitigation: focused proof checks job args still include the contract-built `--backlog-since` value.
- Risk: card expands into Ops review behavior work.
  - Mitigation: no live Admin job run, no connector calls, no external writes, no source-field apply lane.

## Tests

- Static: `node --check lib/admin-deal-policy-source-contract.js scripts/process-admin-deal-policy-source-contract-check.mjs`.
- Focused: `npm run process:admin-deal-policy-source-contract-check -- --close-card --json`.
- Audit dogfood: `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`.
- Full: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

## Gate Decision Tree

Blast radius is full because this card changes a scheduled job definition, an Ops UI copy source, nightly audit detector behavior, Current Sprint truth, and live backlog closeout.

Use static syntax first, then focused behavior proof, then full Foundation gates:

- static: module/script syntax
- focused: contract evaluator, job arg/summary builders, audit detector suppression, dogfood failures, and live sprint closeout
- full: `foundation:verify` and `process:foundation-ship`

## Gate Decision

Full Foundation gate. This card closes a P2 deep-audit finding and changes scheduled job metadata.
