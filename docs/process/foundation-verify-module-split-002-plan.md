# FOUNDATION-VERIFY-MODULE-SPLIT-002 Plan

## Goal

Continue shrinking verifier monolith risk by extracting one coherent verifier proof area into a named module with focused dogfood proof.

## Existing Work Check

- `VERIFIER-MODULAR-SPLIT-001` started the verifier split pattern.
- `scripts/foundation-verify.mjs` is still a large monolith and remains a maintenance risk.
- The LLM auth audit freshness check caused a late ship failure, so it is a good candidate for a focused verifier module.

## Implementation

1. Extract the LLM auth audit verifier condition into `lib/foundation-verify-llm-auth-audit.js`.
2. Keep `scripts/foundation-verify.mjs` as the orchestrator.
3. Preserve the same strict checks: fresh job, classified credentials/routes, dry-run-only call, approval, plan, closeout proof, API route, and source markers.
4. Add a synthetic dogfood proof that stale/missing latest job fails.

## Dogfood Proof

Run a focused module proof that passes with healthy fixtures and fails with stale/missing latest job fixtures.

## Definition Of Done

- One verifier proof area is extracted into a module.
- The module has focused synthetic proof.
- Full verifier still enforces the same behavior.
- The split reduces future edit pressure inside `scripts/foundation-verify.mjs`.

## Not Next

- Do not split the entire verifier in one sprint.
- Do not weaken LLM auth freshness.
- Do not change model routes or provider auth.

## What

Build the narrow V1 card `FOUNDATION-VERIFY-MODULE-SPLIT-002`: split the LLM auth audit verifier proof into a focused module while keeping `scripts/foundation-verify.mjs` as the orchestrator.

## Why

The verifier is still a monolith and the LLM auth audit freshness check just caused a real late ship failure. Steve gets quality and speed when this proof area can be read, tested, and fixed without digging through the whole verifier.

The operator value is a real workflow improvement for Steve: when model/auth freshness breaks, the system can isolate that proof quickly, explain the blocker, and unlock faster repair without making the whole verifier harder to understand.

## Acceptance Criteria

- `FOUNDATION-VERIFY-MODULE-SPLIT-002` adds `lib/foundation-verify-llm-auth-audit.js`.
- The module checks real runtime status, approval, plan, closeout, route/API source markers, and fresh latest job behavior.
- The module dogfood proof passes healthy fixtures and rejects stale/missing latest job fixtures.
- The focused proof returns pass/revise style detail with score-like healthy/blocked status for this card.
- `scripts/foundation-verify.mjs` delegates this proof area to the module.
- Reject substring proof: any substring-only proof fails unless the real function path and dogfood fixtures also pass.

## Definition Of Done

- Focused proof command passes: `npm run process:foundation-verify-llm-auth-audit-check -- --json`.
- `npm run foundation:verify` still enforces the same LLM auth audit behavior.
- Full ship gate passes.

## Details

Reuse existing code: `lib/llm-auth-audit-proof.js`, `scripts/process-llm-auth-audit-check.mjs`, approval files, current closeout records, `getLlmRuntimeSnapshot`, and `getFoundationJobRunSnapshot`. Gate decision: focused module proof plus full ship gate because this edits canonical verifier behavior.

Also reuse existing docs in `docs/rebuild/current-state.md`, existing scripts under `scripts/process-llm-auth-audit-check.mjs`, live backlog truth for `FOUNDATION-VERIFY-MODULE-SPLIT-002`, and Current Sprint truth for this sprint. This is a fast and proportional module split, not another heavy verifier rewrite.

## Risks

- Risk: extraction weakens a strict verifier check. Repair path is to keep old logic until module output matches behavior.
- Risk: module only checks strings. Dogfood must use actual function behavior and synthetic stale fixtures.
- Risk: broad split grows scope. Keep this to one proof area only.

## Tests

- Static: `node --check lib/foundation-verify-llm-auth-audit.js scripts/process-foundation-verify-llm-auth-audit-check.mjs scripts/foundation-verify.mjs`.
- Focused: `npm run process:foundation-verify-llm-auth-audit-check -- --json`.
- Full: `npm run foundation:verify` and final `process:foundation-ship`.
