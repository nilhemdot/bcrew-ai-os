# FOUNDATION-DB-MONOLITH-SPLIT-011 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-011`
Sprint: `foundation-db-runtime-job-store-split-2026-05-16`
Closeout key: `foundation-runtime-job-store-split-v1`

## What

Extract Foundation runtime/job store behavior from `lib/foundation-db.js` into a focused `lib/foundation-runtime-job-store.js` module.

V1 moves only the existing runtime/job public behaviors:

- Foundation job schedule index, controls, health, latest-run snapshot, run lookup, run metadata update, run creation, finish, stop, and stale-run reaper behavior
- Foundation runtime status recording and lookup

`lib/foundation-db.js` keeps the existing export names as thin delegates so current callers keep importing from the same place.

## Why

`lib/foundation-db.js` is still above the architecture-risk line at more than 8,800 lines. Runtime/job storage is a clean bounded domain because it owns job control plane state used by the dashboard, worker, ship gates, source health, and runtime activation views.

Root invariant: this is extraction only. SQL intent, output shapes, exported function names, job health semantics, schedule index semantics, stale-run reaper behavior, and current callers must remain unchanged.

Operator value: Steve gets a smaller Foundation DB core and a named runtime/job store that can be reviewed independently before more connector uptime, nightly audit, source extraction, or hub work depends on job state.

## Acceptance Criteria

- `lib/foundation-runtime-job-store.js` exports `createFoundationRuntimeJobStore()` plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the new store factory, wires it with `pool`, `withFoundationTransaction`, and `insertChangeEvent`.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for runtime status, job controls, job run snapshots, job run mutation, and stale-run cleanup.
- `lib/foundation-db.js` no longer owns inline Foundation job run/control/runtime status mappers or public runtime/job store functions.
- A synthetic behavior proof exercises the real module function path with fake pool/transaction behavior and proves snapshot mapping, runtime status mapping, job control validation, create/finish metadata mapping, and stale-run reaper behavior are preserved without live connectors or scheduled jobs.
- Focused proof dogfoods the unsafe old pattern: old inline runtime/job ownership in `foundation-db.js` fails, missing module ownership fails, missing delegates fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-011` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-runtime-job-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-runtime-job-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the runtime/job store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current runtime/job functions in `lib/foundation-db.js`, the store-factory split pattern from `lib/foundation-llm-runtime-store.js`, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-runtime-job-store.js` with a dependency-injected store factory. Move the Foundation job run mapper, job control mapper, job health helper, job control apply helper, runtime status mapper, schedule index, controls, snapshots, run mutation, and stale-run reaper into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof script is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live OpenAI, Anthropic, Gemini, Canva, Gmail, Missive, Slack, Google, ClickUp, FUB, or paid-source APIs. It must not mutate live backlog, sprint, source, or hub state. For `scripts/process-foundation-runtime-job-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live scheduled jobs, and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Worker, dashboard, or source-health callers break because public imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Scheduled job health or stale-run cleanup behavior changes during the move.
  - Repair path: preserve the existing SQL and dogfood with fake pool rows that prove schedule index, snapshot, create/finish, and stale reaper mapping still work.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool/transaction behavior and verifies returned runtime status, schedule index, snapshots, controls, and job run objects.
- Risk: This drifts into connector health policy, source schedules, source extraction, Canva, or hub feature work.
  - Repair path: do not change job definitions, schedules, source crawler targets, credentials, connectors, routes, UI surfaces, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-runtime-job-store.js lib/foundation-db.js scripts/process-foundation-runtime-job-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-runtime-job-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-011 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-011.json --closeoutKey=foundation-runtime-job-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: runtime/job behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies the returned data shape.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Foundation job definitions, schedule policy, mutation posture policy, source schedules, worker process-control behavior, table schema, indexes, constraints, columns, or migrations.
- Do not change connector health behavior, source extraction, source crawl target leasing, route selection, provider auth, model choice, secret names, cost caps, or live job execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, source crawl schedules, hub feature work, Drive permissions mutation, request-access email, or Meeting Vault Phase B.
- Do not move source crawl target/item storage, intelligence atom stores, action router stores, shared-comms storage, agent feedback storage, user/access control, sales listing storage, or Meeting Vault storage in this card.
