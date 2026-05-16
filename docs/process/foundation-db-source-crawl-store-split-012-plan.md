# FOUNDATION-DB-MONOLITH-SPLIT-012 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-012`
Sprint: `foundation-db-source-crawl-store-split-2026-05-16`
Closeout key: `foundation-source-crawl-store-split-v1`

## What

Extract source-crawl and extraction-control store behavior from `lib/foundation-db.js` into a focused `lib/foundation-source-crawl-store.js` module.

V1 moves only existing source-crawl storage and read-model behavior:

- Source crawl target/run row mappers, stale-run state, target scheduling overlays, item summaries, run coverage, target coverage, and target health findings
- Source crawl target leasing, finish, stale-run reaping, target upsert, item upsert, item listing, retry classification, retry leasing, attempt start/finish, stale item reaping, and external-ID lookup
- Drive/video extraction queue reads plus extraction control and extraction hardening snapshots

`lib/foundation-db.js` keeps the existing export names as thin delegates so current scripts, worker code, verifiers, and routes keep importing from the same place.

## Why

`lib/foundation-db.js` is still above the architecture-risk line at about 8,270 lines. Source crawl storage is a clean bounded domain because it owns the intake ledger used by Drive/Gmail/video corpus extraction, retry handling, runtime health, source health, and future Build Intel ingestion.

Root invariant: this is extraction only. SQL intent, output shapes, exported function names, target/item retry semantics, stale lease behavior, extraction control payload shape, and current callers must remain unchanged.

Operator value: Steve gets a smaller Foundation DB core and a named source-crawl store that can be reviewed independently before more source extraction, connector uptime, or hub consumption depends on source-flow truth.

## Acceptance Criteria

- `lib/foundation-source-crawl-store.js` exports `createFoundationSourceCrawlStore()` plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the new store factory and wires it with `pool`, `withFoundationTransaction`, `insertChangeEvent`, `getFoundationJobScheduleIndex`, and the existing extraction retry helpers.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for source crawl target/item storage, retry leasing, queue reads, and extraction control snapshots.
- `lib/foundation-db.js` no longer owns inline source-crawl target/item mappers or public source-crawl/extraction-control functions.
- A synthetic behavior proof exercises the real module function path with fake pool/transaction behavior and proves target mapping, stale-run state, retry item mapping, queue read mapping, snapshot composition, and stale reaper mapping are preserved without live connectors or source extraction.
- Focused proof dogfoods the unsafe old pattern: old inline source-crawl ownership in `foundation-db.js` fails, missing module ownership fails, missing delegates fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-012` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-source-crawl-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, `process:fanout-check`, `process:post-ship-fanout`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-source-crawl-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the source-crawl store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current source-crawl functions in `lib/foundation-db.js`, the store-factory split pattern from `lib/foundation-runtime-job-store.js`, the existing extraction retry helpers from `lib/extraction-run-hardening.js`, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-source-crawl-store.js` with a dependency-injected store factory. Move the source crawl target/run/item mappers, schedule/coverage/health helpers, target/item mutation functions, retry helpers, Drive/video queue reads, and extraction-control snapshot builders into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof script is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live OpenAI, Anthropic, Gemini, Canva, Gmail, Missive, Slack, Google, ClickUp, FUB, Skool, myICOR, Loom, YouTube, or paid-source APIs. It must not run source extraction, lease real source targets, mutate live crawl targets/items, or mutate live hub state. For `scripts/process-foundation-source-crawl-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live scheduled jobs, source extraction, and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Source extraction scripts or worker callers break because public imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Source crawl retry or stale lease behavior changes during the move.
  - Repair path: preserve existing SQL and dogfood with fake pool rows that prove stale-run state, target lease/finish, item retry classification, attempt mapping, and stale reaper output still work.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool/transaction behavior and verifies returned target, item, queue, snapshot, and stale reaper objects.
- Risk: This drifts into live extraction, connector auth, source schedules, schema changes, Canva, or hub feature work.
  - Repair path: do not change source crawl target definitions, schedules, credentials, connectors, routes, UI surfaces, table schema, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-source-crawl-store.js lib/foundation-db.js scripts/process-foundation-source-crawl-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-source-crawl-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-012 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-012.json --closeoutKey=foundation-source-crawl-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: source-crawl behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies the returned data shape.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change source crawl target definitions, runtime schedules, retry policy defaults, mutation posture policy, worker process-control behavior, table schema, indexes, constraints, columns, or migrations.
- Do not run Drive, Gmail, Slack, Missive, video, YouTube, Loom, Skool, myICOR, Canva, ClickUp, FUB, Google, OpenAI, Anthropic, Gemini, or paid-source APIs.
- Do not change connector health behavior, route selection, provider auth, model choice, secret names, cost caps, or live job execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, hub feature work, Drive permissions mutation, request-access email, or Meeting Vault Phase B.
- Do not move intelligence job run storage, intelligence atom stores, action router stores, shared-comms storage, runtime/job storage, LLM runtime storage, agent feedback storage, user/access control, sales listing storage, or Meeting Vault storage in this card.
