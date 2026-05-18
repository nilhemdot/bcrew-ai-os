# FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 Plan

Status: approved for build
Card: `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
Sprint: `foundation-db-schema-seed-split-2026-05-18`
Closeout key: `foundation-db-schema-seed-split-v1`

## What

Extract the Foundation DB schema/bootstrap initializer out of `lib/foundation-db.js` into a focused `lib/foundation-db-schema-seed-store.js` module.

`lib/foundation-db.js` keeps the existing public export names as thin delegates: `initFoundationDb`, `bootstrapFoundationDb`, `buildFoundationDbInitSeedSplitDogfoodProof`, `getFoundationDbReadOnlyGateReadiness`, and `assertFoundationDbReadyForReadOnlyGate`.

## Why

The May 18 nightly audit still proposes `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001` because `lib/foundation-db.js` contains `initFoundationDb()` plus schema, seed/bootstrap, stores, and query APIs. Earlier cards already made `initFoundationDb()` schema-only by default and moved static seed arrays into dedicated modules, but the root DB file still owns the giant initializer body.

Root invariant: this card moves existing initialization behavior into a named module without changing startup semantics. It must not auto-sync seed to live backlog, add new migrations, alter live source contracts, or change Foundation store behavior.

Operator value: Steve gets a clearer DB boundary. Future audit/build chats can see that schema/bootstrap initialization has one module owner instead of treating the whole DB root as a mixed-responsibility monolith.

## Acceptance Criteria

- `lib/foundation-db-schema-seed-store.js` exports a dependency-injected initializer factory plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the initializer factory, wires it with the existing pool handle and scope constants, and re-exports the existing public initializer functions as delegates.
- `lib/foundation-db.js` no longer contains `export async function initFoundationDb`, `async function initFoundationDb`, or the inline `seedTable` helper.
- Existing callers of `initFoundationDb()` and `bootstrapFoundationDb()` keep working through unchanged `lib/foundation-db.js` export names.
- `FOUNDATION-DB-INIT-SEED-SPLIT-001`, `DB-SEED-001`, and the Foundation DB split verifier are updated to accept the new initializer module owner instead of expecting seed/bootstrap proof to live inline in `lib/foundation-db.js`.
- The code-quality nightly audit no longer emits the `foundation-db-schema-seed-store-monolith` or `init-foundation-db-seed-mutation-risk` findings against `lib/foundation-db.js`.
- Dogfood rejects the old unsafe shape: root-owned `export async function initFoundationDb`, root-owned `seedTable`, missing initializer delegate, missing schema/seed module, and stale audit finding behavior.
- Existing runtime dogfood still calls the real `initFoundationDb()` path and proves watched live truth rows are unchanged.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001` exists, is marked `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-db-schema-seed-split-check -- --json`.
- `process:db-seed-check`, `process:foundation-core-seed-split-check`, `process:verifier-foundation-db-split-module-check`, `process:code-quality-nightly-audit-check`, `backlog:hygiene`, `foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-db-schema-seed-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof dogfoods the exact audit finding and real initializer behavior, DB split verifier checks canonical coverage, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, initialization code, verifier coverage, package scripts, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current `initFoundationDb()` / `bootstrapFoundationDb()` implementation, `FOUNDATION-DB-INIT-SEED-SPLIT-001` dogfood, `DB-SEED-001` governance evaluator, `FOUNDATION-DB-MONOLITH-SPLIT-*` split verifier pattern, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Existing docs reused: `docs/process/foundation-db-init-seed-split-001-plan.md`, `docs/process/db-seed-001-plan.md`, `docs/process/foundation-db-core-seed-split-003-plan.md`, `docs/process/foundation-db-sales-listing-store-split-015-plan.md`, and the May 18 nightly audit triage.

Existing scripts reused: `scripts/process-runtime-safety-hardening-check.mjs`, `scripts/process-db-seed-check.mjs`, `scripts/process-foundation-core-seed-split-check.mjs`, `scripts/process-verifier-foundation-db-split-module-check.mjs`, and `scripts/process-code-quality-nightly-audit-check.mjs`.

Implementation shape: create `lib/foundation-db-schema-seed-store.js` with `createFoundationDbSchemaSeedStore({ pool, backlogScopeKeys })`. Move the initializer body and local seed helper into that module. In `lib/foundation-db.js`, instantiate the module and export constants/delegates with the same public names. Update focused evaluators so the schema/seed module is the owner and `lib/foundation-db.js` is only the wiring/export surface.

This is the required split/no-new-responsibility plan for touching over-budget shared Foundation files. `lib/foundation-db.js` loses responsibility; it does not gain one. `scripts/foundation-verify.mjs` only receives source wiring for the new module and must stay under the verifier registry line budget.

Main session owns this active sprint scope. No side build, hub chat, separate chat, parallel work, Canva, Fal, Harlan, Marketing Video Lab, or shared-route work is approved here; if any side lane requests these shared files it must return to main session coordination before commit, push, merge, or ship.

Verifier/check posture: the focused proof is read-only by default for live operating truth. It has no `--apply` path; if a future write path is added, no-flag writes must be blocked and live writes must require explicit `--apply` posture. It may call the real `initFoundationDb()` path because this card specifically proves schema initialization boundaries; the proof must fingerprint watched live truth rows before and after and show no seed, backlog, sprint, source, or closeout row mutation. It must not call live Gmail, ClickUp, FUB, Slack, Missive, Google Drive, Canva, OpenAI, Anthropic, Gemini, Skool, myICOR, Loom, YouTube, or paid-source APIs. It must not run source extraction, mutate hub state, auto-sync seed rows, or mutate Drive permissions.

Speed boundary: the focused proof should avoid endpoint scans and external systems. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: startup or worker imports break because public export names move.
  - Repair path: keep `lib/foundation-db.js` exports unchanged, run syntax checks, and run the full ship gate before push.
- Risk: bootstrap seed posture regresses during extraction.
  - Repair path: preserve `includeBootstrapSeed` / `bootstrapFoundationDb()` behavior and call the existing black-box mutation dogfood.
- Risk: audit is silenced by substring changes only.
  - Repair path: focused proof calls the real code-quality nightly audit builder and fails if the DB findings remain or if the evaluator accepts old root-owned initializer code.
- Risk: this grows into a DB rewrite.
  - Repair path: do not change schema semantics, seed data, migrations, store SQL behavior, route behavior, or live source/backlog truth in this card.

## Tests

```bash
node --check lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/foundation-db-seed-governance.js lib/foundation-core-seed.js lib/foundation-db-split-verifier.js lib/foundation-process-hardening-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-db-schema-seed-split-check.mjs
npm run process:foundation-db-schema-seed-split-check -- --json
npm run process:db-seed-check -- --json
npm run process:foundation-core-seed-split-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run process:code-quality-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-SCHEMA-SEED-SPLIT-001.json --closeoutKey=foundation-db-schema-seed-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: DB schema/bootstrap initialization buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when `lib/foundation-db.js` delegates stable exports, the schema/seed module owns `initFoundationDb`, the real initializer leaves watched live rows unchanged, and the real nightly audit no longer reports the DB monolith finding.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change table schemas, indexes, constraints, columns, migration strategy, route behavior, store SQL semantics, source extraction, auth, or hub behavior.
- Do not auto-sync seed rows into live backlog or source-contract truth.
- Do not mutate live backlog, sprint, decision, source, build-log, or closeout data from verifier/check paths except for explicitly approved card/sprint closeout writes outside the focused proof.
- Do not run Drive, Gmail, Slack, Missive, video, YouTube, Loom, Skool, myICOR, Canva, ClickUp, FUB, Google, OpenAI, Anthropic, Gemini, or paid-source APIs.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, hub feature work, Drive permissions mutation, request-access email, or `MEETING-VAULT-ACL-001` Phase B.
