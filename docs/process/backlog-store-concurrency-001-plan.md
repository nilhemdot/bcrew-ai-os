# BACKLOG-STORE-CONCURRENCY-001 Plan

## What

Prevent silent lost updates in backlog mutation paths.

## Why

The deep audit found `updateBacklogItem()` reads a backlog row, merges fields in JavaScript, and writes the whole row without row locking, optimistic concurrency, or field-level patch SQL. Two writers can overwrite each other silently. Backlog is task truth; silent overwrite is unacceptable.

## Acceptance Criteria

- Backlog updates use row locking, optimistic concurrency, or field-level patch SQL.
- Change events record accurate before/after state.
- A dogfood proof simulates two concurrent backlog writers updating different fields and proves neither silently overwrites the other.
- The proof uses actual backlog store behavior, not substring-only checks.
- `BACKLOG-STORE-CONCURRENCY-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- `updateBacklogItem()` or the new safer update path prevents lost concurrent writes.
- Focused proof covers conflicting writers and non-conflicting field updates.
- Foundation verifier covers the concurrency invariant.
- Sprint item closes only after dogfood proof and ship gates pass.

## Details

Existing code to reuse: `createBacklogItem()`, `updateBacklogItem()`, `insertChangeEvent()`, backlog table schema, and backlog hygiene checks. Existing docs to reuse: deep audit, runtime safety plan, AGENTS.md, current rebuild plan/state. Existing scripts to reuse: `process:runtime-safety-hardening-check`, `backlog:hygiene`, `foundation:verify`, and ship gates.

Prefer the smallest safe change: row-level lock inside the existing transaction or optimistic `updated_at` compare. Do not redesign the whole backlog store in V1.

The dogfood proof must exercise black-box behavior through the actual backlog update function path and a DB-style concurrent writer round-trip. No substring-only proof is acceptable.

Gate decision: static syntax checks for changed JS, focused `process:runtime-safety-hardening-check` proof for concurrent backlog writes, then full `process:foundation-ship` because the blast radius touches live backlog task truth. Operator value: Steve can trust that two agents or scripts will not silently overwrite the backlog card he is using as command truth. Speed bound: the focused proof should target under 2 minutes by creating a synthetic backlog row and running two bounded concurrent transactions.

## Risks

- Row locking can increase contention if used poorly. Repair path: keep the transaction narrow.
- Optimistic concurrency may require caller updates. Repair path: provide backward-compatible safe default or clear conflict errors.
- A synthetic proof using fake objects is not enough. It must exercise the real store path or a transaction-backed equivalent.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=BACKLOG-STORE-CONCURRENCY-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BACKLOG-STORE-CONCURRENCY-001 --planApprovalRef=docs/process/approvals/BACKLOG-STORE-CONCURRENCY-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not redesign the full backlog model.
- Do not build UI.
- Do not auto-move backlog cards beyond this sprint process.
- Do not use a mock-only dogfood proof.
