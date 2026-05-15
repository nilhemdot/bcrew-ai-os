# FOUNDATION-DB-MONOLITH-SPLIT-001 Plan

## What

Extract the backlog write store from `lib/foundation-db.js` into `lib/foundation-backlog-store.js` without changing the public DB API.

V1 moves `createBacklogItem`, `updateBacklogItem`, the done-lane closeout guard, backlog change-event state mapping, changed-field calculation, and the locked update path into a focused store factory. `lib/foundation-db.js` keeps DB connection ownership, transactions, backlog seed/read helpers, and the existing public exports.

## Why

`lib/foundation-db.js` is still about 19K lines and mixes unrelated responsibilities. The backlog write path is a good next seam because it is important, bounded, already protected by concurrency dogfood, and used across process scripts and server routes through two public functions.

The operator value is lower future risk and higher build speed for Steve and the team: backlog/task truth stays protected, but future backlog write changes happen in a small module instead of expanding the DB monolith. That unlocks the real workflow Steve keeps asking for: Foundation cleanup can keep moving quickly without making task truth fragile or forcing every hub builder to wait on a 19K-line DB file.

## Acceptance Criteria

- `lib/foundation-backlog-store.js` owns backlog create/update behavior and exports a store factory.
- `lib/foundation-db.js` delegates `createBacklogItem` and `updateBacklogItem` to the store without changing caller imports.
- The done-lane closeout guard still rejects weak move-to-done updates.
- The update path still locks rows before merging fields and records before/after/changedFields metadata.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.
- The focused proof rejects the old failure modes and confirms the proof script is read-only.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-backlog-store-split-check -- --json`.
- `foundation:verify` and the full Foundation ship gate pass before push.
- Closeout and Recent Builds identify `foundation-backlog-store-split-v1`.

## Details

Existing code to reuse: `createBacklogItem`, `updateBacklogItem`, `assertBacklogDoneCloseout`, `updateBacklogItemWithClient`, `insertChangeEvent`, `withFoundationTransaction`, `getNextPrefixedId`, `mapBacklogRow`, and `normalizeBacklogScopeKey`.

Existing docs and policy to reuse: `docs/process/backlog-store-concurrency-001-plan.md`, `docs/process/foundation-db-store-split-001-plan.md`, AGENTS.md Foundation Rebuild Discipline, the deep audit monolith findings, and the current Foundation cleanup closeouts.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the new focused proof script.

Implementation shape: create `createFoundationBacklogStore({ withFoundationTransaction, insertChangeEvent, getNextPrefixedId, normalizeBacklogScopeKey, mapBacklogRow })`. Keep DB connection ownership, schema, seed drift, and read snapshot behavior in `foundation-db.js`. Only move the backlog write store boundary.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call live mutators, write files, or update sprint/backlog state. It should inspect code, validate live state, and run pure dogfood fixtures only.

Gate decision tree: static proof alone is too weak because this touches live backlog write behavior. Focused proof covers the module boundary and dogfood cases and should stay fast, proportional, and under 2 minutes so it is used by default. Full Foundation ship gate is required because `lib/foundation-db.js`, package scripts, verifier coverage, and closeout records change.

## Risks

- Risk: callers import `createBacklogItem` / `updateBacklogItem` from `lib/foundation-db.js` and break if exports change.
  - Repair path: keep wrapper exports with the same names and run existing process gates.
- Risk: splitting the store weakens the done-lane closeout guard.
  - Repair path: dogfood a weak move-to-done fixture and require rejection.
- Risk: splitting the store weakens lost-update protection.
  - Repair path: dogfood that the module source still uses `FOR UPDATE` and that before/after/changedFields metadata remains present.
- Risk: this becomes a broad DB refactor.
  - Repair path: no schema changes, no source crawl/job/intelligence/decision store movement, no public API changes.

## Tests

```bash
node --check lib/foundation-backlog-store.js scripts/process-foundation-backlog-store-split-check.mjs lib/foundation-db.js
npm run process:foundation-backlog-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-001.json --closeoutKey=foundation-backlog-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe patterns this store owns: weak done-lane closeout, missing row lock, missing before/after metadata, and missing changedFields metadata.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not move schema init, source crawl, job, intelligence, decision, or sales stores in this slice.
- Do not change backlog schema or public route behavior.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run paid-source auth.
- Do not run MEETING-VAULT-ACL-001 Phase B.
- Do not mutate Drive permissions.
- Do not send request-access emails.
