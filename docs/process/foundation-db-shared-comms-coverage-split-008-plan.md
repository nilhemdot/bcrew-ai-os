# FOUNDATION-DB-MONOLITH-SPLIT-008 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-008`
Sprint: `foundation-db-shared-comms-coverage-split-2026-05-15`
Closeout key: `foundation-shared-comms-coverage-split-v1`

## What

Extract shared-communications coverage snapshot behavior from `lib/foundation-db.js` into a focused `lib/foundation-shared-comms-coverage.js` module.

V1 moves only:

- `getSharedCommunicationCoverageSnapshot()`
- the coverage aggregation helper behavior for shared artifacts, candidates, candidate coverage, processing coverage, and latest synthesis run shape
- evaluator and dogfood helpers for the module split

`lib/foundation-db.js` keeps the public export name stable as a wrapper so existing callers do not change.

## Why

`lib/foundation-db.js` is still above the architecture-risk line. Shared-comms coverage is a safe next cut because it is read-only, cohesive, and already bounded to reporting/coverage aggregation. Moving it gives Strategy/shared-comms visibility a named store module instead of leaving coverage SQL buried inside the DB monolith.

Root invariant: this is extraction only. SQL intent, output shape, source IDs, artifact/candidate aggregation, processing coverage math, latest synthesis metadata, and existing callers must remain unchanged.

Operator value: Steve keeps the same shared-comms coverage picture while the Foundation DB monolith gets smaller and future shared-comms coverage changes have a clear module boundary.

## Acceptance Criteria

- `lib/foundation-shared-comms-coverage.js` owns the shared-comms coverage snapshot function, aggregation helpers, evaluator, and dogfood proof.
- `lib/foundation-db.js` imports the module and keeps `getSharedCommunicationCoverageSnapshot()` as a stable public export.
- Existing callers from `server.js`, `lib/strategy-shared-comms-routes.js`, and scripts continue importing from `lib/foundation-db.js` without changes.
- The coverage output shape remains `{ generatedAt, totalArtifacts, totalCandidates, sources, latestSynthesisRun }`.
- Per-source and per-artifact-type fields remain stable: totals, candidate counts, processed/pending counts, processing/extraction percentages, first/last timestamps, candidate type counts.
- Focused proof dogfoods the unsafe old shape: inline shared-comms coverage ownership in `foundation-db.js` fails, delegated module ownership passes, and a synthetic aggregation fixture preserves the expected summary math.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-shared-comms-coverage-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-shared-comms-coverage-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused gate proves the shared-comms coverage extraction and dogfood behavior, and full gate is required because this card changes `lib/foundation-db.js`, a new Foundation DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current `getSharedCommunicationCoverageSnapshot()` SQL/aggregation logic in `lib/foundation-db.js`, `pool`, the existing `create*Store()` split pattern, `lib/strategy-shared-comms-routes.js`, Plan Critic, approval-integrity, and Foundation ship gates.

Implementation shape: create `lib/foundation-shared-comms-coverage.js` with `getSharedCommunicationCoverageSnapshotFromDb({ pool })`. Update `lib/foundation-db.js` to import the function and export `getSharedCommunicationCoverageSnapshot()` as a thin wrapper. Keep schema/init SQL in `lib/foundation-db.js`.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. The new module owns shared-comms coverage aggregation, and `lib/foundation-db.js` becomes a wrapper/export site for this responsibility instead of receiving new behavior. No new responsibility is added to the DB monolith. The `scripts/foundation-verify.mjs` touch adds read-only coverage only; it does not add verifier runtime responsibility, live-state repair, seed writes, or any DB mutation path.

Verifier/check posture: the focused proof script is read-only. It must not call live Missive/Gmail/Slack APIs, mutate live DB, update backlog/sprint state, write reports, or call provider/auth routes. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic aggregation fixtures in memory.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push.

## Risks

- Risk: Moving the coverage aggregation changes source or artifact totals.
  - Repair path: synthetic fixture checks total artifacts, total candidates, candidate coverage, processing coverage, pending counts, candidate type keys, and latest synthesis run mapping.
- Risk: Existing Strategy/shared-comms route breaks because it imports from `lib/foundation-db.js`.
  - Repair path: keep the public `foundation-db.js` export name unchanged; no caller changes.
- Risk: This drifts into shared-comms extraction or Meeting Vault work.
  - Repair path: do not touch extraction runners, Meeting Vault ACLs, Drive permissions, provider auth, or candidate generation.

## Tests

```bash
node --check lib/foundation-shared-comms-coverage.js scripts/process-foundation-shared-comms-coverage-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-shared-comms-coverage-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-008 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-008.json --closeoutKey=foundation-shared-comms-coverage-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: shared-comms coverage aggregation buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns aggregation and `foundation-db.js` delegates the public export.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change shared communication table schema, indexes, constraints, columns, or migrations.
- Do not change shared-comms extraction, candidate generation, synthesis, routing, or Strategy UI behavior.
- Do not touch Meeting Vault ACL Phase B, Drive permission mutation, request-access emails, live Missive/Gmail/Slack APIs, Sales/Marketing/Ops hub work, Canva client work, or paid-source auth.
- Do not move source crawl, foundation jobs, intelligence atom stores, action router, agent feedback storage, or hub behavior in this card.
