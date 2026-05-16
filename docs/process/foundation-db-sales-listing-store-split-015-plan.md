# FOUNDATION-DB-MONOLITH-SPLIT-015 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-015`
Sprint: `foundation-db-sales-listing-store-split-2026-05-16`
Closeout key: `foundation-sales-listing-store-split-v1`

## What

Extract Sales Listing assignment storage from `lib/foundation-db.js` into a focused `lib/foundation-sales-listing-store.js` module.

`lib/foundation-db.js` keeps the existing public export names as thin delegates: `listSalesListingAssignments`, `listSalesListingCases`, and `upsertSalesListingAssignment`.

## Why

`lib/foundation-db.js` is still just above the 5,000-line architecture-risk threshold after `FOUNDATION-DB-MONOLITH-SPLIT-014`. Sales Listing assignment storage is the cleanest remaining bounded domain because it owns the GLS case assignment ledger, case-history mapping, and assignment list/case upsert paths.

Root invariant: this card only moves existing DB behavior into a named store. It does not change Sales Hub behavior, ClickUp reads, ClickUp writes, route behavior, schema, listing status semantics, or case history meaning.

Proof wording invariant: this is a no ClickUp read and no ClickUp write split. Any live ClickUp inventory/sync behavior remains outside this card.

Operator value: Steve gets the Foundation DB monolith below the 5,000-line hard line and Sales Listing storage becomes reviewable as a named module before future Sales Hub work builds on it.

## Acceptance Criteria

- `lib/foundation-sales-listing-store.js` exports `createFoundationSalesListingStore()` plus evaluator, dogfood, and synthetic behavior proof helpers for this split.
- `lib/foundation-db.js` imports the new store factory and wires it with the existing pool handle.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for listing assignment reads, tracked case reads, and assignment upserts.
- `lib/foundation-db.js` no longer owns inline Sales Listing row mappers, case-history helpers, or public Sales Listing DB functions.
- `lib/foundation-db.js` is below 5,000 lines after the split.
- The new store does not change table schema, indexes, constraints, columns, route behavior, ClickUp reads, ClickUp writes, Sales Hub UI, listing inventory, listing sync cadence, source extraction, auth, or hub behavior.
- A synthetic behavior proof exercises the real store methods with fake pool behavior and proves create/update/list/case-history output shapes are preserved.
- Focused proof dogfoods the unsafe old pattern: old inline Sales Listing DB ownership fails, missing module ownership fails, missing delegates fail, weak split plans fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count under 5,000.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-015` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-sales-listing-store-split-check -- --json`.
- `process:verifier-foundation-db-split-module-check`, `backlog:hygiene`, `foundation:verify`, `process:fanout-check`, `process:post-ship-fanout`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-sales-listing-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the store extraction and synthetic behavior, the DB split verifier proves canonical coverage, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current Sales Listing DB functions in `lib/foundation-db.js`, the store-factory split pattern from other Foundation DB store modules, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Existing code specifically reused: `lib/sales-listing-inventory.js` and `lib/sales-listing-cases.js` already consume the stable `lib/foundation-db.js` Sales Listing exports, so those imports stay unchanged. `lib/foundation-agent-feedback-store.js`, `lib/foundation-drive-meeting-vault-store.js`, and `lib/foundation-source-crawl-store.js` provide the existing store-factory pattern for the extraction.

Existing docs reused: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `docs/process/foundation-db-agent-feedback-store-split-014-plan.md` already define the current cleanup sequence and no-live-connector split posture.

Existing scripts reused: `scripts/process-foundation-agent-feedback-store-split-check.mjs` and `scripts/process-verifier-foundation-db-split-module-check.mjs` provide the focused proof/current verifier pattern. The new proof script follows that existing structure instead of inventing a new gate.

Live backlog/current sprint truth reused: the live backlog owns `FOUNDATION-DB-MONOLITH-SPLIT-015`, and the Current Sprint overlay owns its stage, proof commands, and not-next boundaries before the build is called done.

Implementation shape: create `lib/foundation-sales-listing-store.js` with a dependency-injected store factory. Move the Sales Listing assignment mapper, case-history helpers, list functions, and upsert function into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which started above 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live Gmail, ClickUp, FUB, Slack, Missive, Google, Canva, OpenAI, Anthropic, Gemini, Skool, myICOR, Loom, YouTube, or paid-source APIs. It must not read ClickUp, write ClickUp, run listing sync, run source extraction, mutate live hub state, or mutate Sales Listing production rows. For `scripts/process-foundation-sales-listing-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live scheduled jobs, DB writes, ClickUp reads/writes, source extraction, and hub UI. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Sales Hub listing inventory breaks because public imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Assignment row or case-history shape changes during the move.
  - Repair path: preserve existing SQL and dogfood with fake pool rows that prove returned objects still map expected fields and case-history events.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool behavior and verifies returned create/update/list/case-history objects.
- Risk: This drifts into Sales Hub feature work.
  - Repair path: do not change ClickUp reads, ClickUp writes, listing sync, route behavior, UI, auth, schema, case status semantics, source extraction, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-sales-listing-store.js lib/foundation-db.js scripts/process-foundation-sales-listing-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js scripts/process-verifier-foundation-db-split-module-check.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-sales-listing-store-split-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-015 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-015.json --closeoutKey=foundation-sales-listing-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: Sales Listing DB behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, synthetic behavior verifies returned data shapes, and `lib/foundation-db.js` is below 5,000 lines.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Sales Listing table schema, indexes, constraints, columns, route behavior, ClickUp read behavior, ClickUp writeback behavior, listing sync cadence, case status semantics, Sales Hub UI, auth, or source extraction.
- Do not run Drive, Gmail, Slack, Missive, video, YouTube, Loom, Skool, myICOR, Canva, ClickUp, FUB, Google, OpenAI, Anthropic, Gemini, or paid-source APIs.
- Do not change connector health behavior, route selection, provider auth, model choice, secret names, cost caps, or live job execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, hub feature work, Drive permissions mutation, request-access email, or Meeting Vault Phase B.
- Do not move source-crawl target/item storage, intelligence job run storage, intelligence atom stores, action router stores, shared-comms storage, runtime/job storage, LLM runtime storage, Agent Feedback storage, user/access control, or unrelated Foundation stores in this card.
