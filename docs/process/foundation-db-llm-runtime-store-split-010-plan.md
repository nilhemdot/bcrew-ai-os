# FOUNDATION-DB-MONOLITH-SPLIT-010 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-010`
Sprint: `foundation-db-llm-runtime-store-split-2026-05-16`
Closeout key: `foundation-llm-runtime-store-split-v1`

## What

Extract LLM runtime storage behavior from `lib/foundation-db.js` into a focused `lib/foundation-llm-runtime-store.js` module.

V1 moves only the existing LLM runtime public behaviors:

- LLM credential upsert and mapping
- LLM route upsert and mapping
- route probe recording
- LLM call creation, finish, runtime snapshot, stale-call read, and stale-call reaper behavior

`lib/foundation-db.js` keeps the existing export names as thin delegates so current callers keep importing from the same place.

## Why

`lib/foundation-db.js` is still above the architecture-risk line at more than 9,000 lines. LLM runtime storage is a clean bounded domain because it owns credential/route/call ledger state that is used by the LLM router, ship preflight, runtime routes, and auth audit proof.

Root invariant: this is extraction only. SQL intent, output shapes, exported function names, runtime snapshot semantics, stale-call behavior, and current callers must remain unchanged.

Operator value: Steve gets a smaller Foundation DB core and a named LLM runtime store that can be reviewed independently before Build Intel, Canva, source extraction, or hub agents rely on model routing.

## Acceptance Criteria

- `lib/foundation-llm-runtime-store.js` exports `createFoundationLlmRuntimeStore()` plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the new store factory, wires it with `pool`, `withFoundationTransaction`, and `insertChangeEvent`.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for `llm-router`, ship preflight, runtime routes, auth audit checks, and worker stale-call cleanup.
- `lib/foundation-db.js` no longer owns inline LLM credential, route, probe, call, snapshot, or stale-call functions/mappers.
- A synthetic behavior proof exercises the real module function path with fake pool/transaction behavior and proves snapshot mapping, create/finish call mapping, and stale-call reaper behavior are preserved without live connectors or live LLM calls.
- Focused proof dogfoods the unsafe old pattern: old inline LLM runtime ownership in `foundation-db.js` fails, missing module ownership fails, missing delegates fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-010` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-llm-runtime-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-llm-runtime-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the LLM runtime store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current LLM runtime functions in `lib/foundation-db.js`, the store-factory split pattern from `lib/foundation-shared-comms-store.js`, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-llm-runtime-store.js` with a dependency-injected store factory. Move the LLM mappers and functions into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof script is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live OpenAI, Anthropic, Gemini, Canva, Gmail, Missive, Slack, Google, ClickUp, FUB, or paid-source APIs. It must not mutate live backlog, sprint, source, or hub state. For `scripts/process-foundation-llm-runtime-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live LLM calls, and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Existing routes or runtime scripts break because their imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Stale LLM call cleanup behavior changes during the move.
  - Repair path: preserve the existing SQL and dogfood with fake pool rows that prove stale read and stale reaper mapping still work.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool/transaction behavior and verifies returned runtime snapshot and call objects.
- Risk: This drifts into LLM routing policy, provider auth, Canva, source extraction, or hub feature work.
  - Repair path: do not change credentials, secrets, route selection, provider calls, source schedules, UI surfaces, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-llm-runtime-store.js lib/foundation-db.js scripts/process-foundation-llm-runtime-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-llm-runtime-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-010 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-010.json --closeoutKey=foundation-llm-runtime-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: LLM runtime behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies the returned data shape.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change LLM credential, route, probe, or call table schema, indexes, constraints, columns, or migrations.
- Do not change route selection policy, provider auth, model choice, secret names, cost caps, or live LLM execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, source crawl schedules, or hub feature work.
- Do not move foundation jobs, source crawl target leasing, intelligence atom stores, action router stores, shared-comms storage, agent feedback storage, user/access control, or Meeting Vault storage in this card.
