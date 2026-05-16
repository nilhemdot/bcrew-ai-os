# FOUNDATION-DB-MONOLITH-SPLIT-009 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-009`
Sprint: `foundation-db-shared-comms-store-split-2026-05-16`
Closeout key: `foundation-shared-comms-store-split-v1`

## What

Extract the shared-communications archive, candidate, synthesis, and review-application store behavior from `lib/foundation-db.js` into a focused `lib/foundation-shared-comms-store.js` module.

V1 moves only the existing Foundation DB shared-communication public behaviors:

- archive/source stats reads and existing-artifact lookups
- archive/context search helpers
- artifact processing queue reads and processing-run provenance writes
- artifact and candidate upserts
- candidate snapshot, reject, status, and apply-to-backlog/decision/question behavior
- shared-communication synthesis run recording, synthesis snapshot reads, and synthesis verification DB report behavior

`lib/foundation-db.js` keeps the existing export names as thin delegates so current callers keep importing from the same place.

## Why

`lib/foundation-db.js` is still above the active architecture-risk line at more than 11,000 lines. The shared-communications store is one of the clearest remaining bounded domains because it owns the source archive and proposal path that Foundation uses to move extracted source signal upward toward hubs.

Root invariant: this is extraction only. SQL intent, output shapes, exported function names, source/candidate/synthesis semantics, change-event behavior, and current callers must remain unchanged.

Operator value: Steve gets a smaller Foundation DB core while preserving the source archive/candidate machinery that feeds Strategy and future hubs. Future source-to-hub work can change a named shared-comms store instead of adding more behavior to the DB monolith.

## Acceptance Criteria

- `lib/foundation-shared-comms-store.js` exports `createFoundationSharedCommunicationStore()` plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the new store factory, wires it with `pool`, `withFoundationTransaction`, existing mappers/normalizers, ID allocation, and change-event insertion.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for server routes and extraction scripts.
- `lib/foundation-db.js` no longer owns inline shared-communication archive/candidate/synthesis functions or mappers.
- A synthetic store behavior proof exercises the real module function path with a fake pool/transaction and proves archive redaction, sensitive archive mode, context search, candidate snapshot mapping, artifact upsert mapping, and candidate-to-backlog transaction behavior are preserved without live connectors.
- Focused proof dogfoods the unsafe old pattern: old inline shared-comms store ownership in `foundation-db.js` fails, missing module ownership fails, delegated module ownership passes, and `lib/foundation-db.js` line count decreases from the pre-card baseline.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-009` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-shared-comms-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-shared-comms-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the shared-comms store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current shared-communication functions in `lib/foundation-db.js`, the existing store-factory split pattern from `lib/foundation-fub-lead-source-store.js`, the shared-comms coverage split from `lib/foundation-shared-comms-coverage.js`, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-shared-comms-store.js` with a dependency-injected store factory. Move the shared-comms mappers and functions into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof script is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live Gmail, Missive, Slack, Google, ClickUp, Canva, FUB, or paid-source APIs. It must not mutate live backlog, sprint, source, or hub state. For `scripts/process-foundation-shared-comms-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Existing routes or extraction scripts break because their imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and probe syntax/import behavior before full ship.
- Risk: Candidate apply behavior changes while moving transaction code.
  - Repair path: preserve the existing SQL and dependency-inject `getNextPrefixedId`, `insertChangeEvent`, mappers, and normalizers instead of rewriting the apply logic.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with a fake pool/transaction and verifies returned objects, redaction behavior, context search scoring, and candidate summary shape.
- Risk: This drifts into source extraction or hub feature work.
  - Repair path: do not touch extraction runners, source schedules, provider auth, Strategy/Sales/Marketing/Ops UI behavior, Canva work, or paid-source auth.

## Tests

```bash
node --check lib/foundation-shared-comms-store.js lib/foundation-db.js scripts/process-foundation-shared-comms-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-shared-comms-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-009 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-009.json --closeoutKey=foundation-shared-comms-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: shared-comms store behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies the returned data shape.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change shared communication table schema, indexes, constraints, columns, or migrations.
- Do not change source extraction target schedules, extraction quotas, candidate generation prompts, provider auth, or source crawler behavior.
- Do not touch Meeting Vault ACL Phase B, Drive permission mutation, request-access emails, Strategy/Sales/Marketing/Ops hub feature work, Canva asset work, paid-source auth, or Build Intel extraction implementation.
- Do not move foundation jobs, source crawl target leasing, intelligence atom stores, action router stores, agent feedback storage, or user/access control in this card.
