# FOUNDATION-DB-MONOLITH-SPLIT-013 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-013`
Sprint: `foundation-db-drive-meeting-vault-store-split-2026-05-16`
Closeout key: `foundation-drive-meeting-vault-store-split-v1`

## What

Extract Drive Access preflight and Meeting Vault proof storage from `lib/foundation-db.js` into a focused `lib/foundation-drive-meeting-vault-store.js` module.

V1 moves only existing proof/readiness storage and read models:

- Meeting raw Drive candidate listing for Meeting Vault review inputs.
- Drive Access preflight run/item recording and latest-run reads.
- Meeting Vault ACL audit recording and latest-audit reads.
- Meeting Vault auto-enforcement run/item/legacy-exception recording and latest-run/exception reads.

`lib/foundation-db.js` keeps the existing export names as thin delegates so current scripts, verifiers, worker code, and routes keep importing from the same place.

## Why

`lib/foundation-db.js` is still above the architecture-risk line at about 6,149 lines. Drive Access and Meeting Vault proof storage is a clean bounded domain because it owns report-only ledgers and readiness proof for file-access work, not the broad Foundation DB contract.

Root invariant: this card stores and reads proof rows only. SQL intent, output shapes, exported function names, and existing caller behavior must remain unchanged. This is a no Drive permission mutation split.

Operator value: Steve gets a smaller Foundation DB core and a named Drive/Meeting Vault proof store that can be reviewed independently before any future Drive Access, Meeting Vault, or source-health work depends on it.

## Acceptance Criteria

- `lib/foundation-drive-meeting-vault-store.js` exports `createFoundationDriveMeetingVaultStore()` plus evaluator and dogfood helpers for this split.
- `lib/foundation-db.js` imports the new store factory and wires it with `pool`, `withFoundationTransaction`, `insertChangeEvent`, `stableLedgerId`, and source-crawl item row mapping.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for Meeting raw Drive candidates, Drive Access preflight runs, Meeting Vault ACL audits, auto-enforcement runs, and legacy exceptions.
- `lib/foundation-db.js` no longer owns inline Drive Access / Meeting Vault proof mappers or public proof-storage functions.
- The new store does not change schema, permissions, Drive mutation behavior, request-access emails, Meeting Vault Phase B, connector auth, or live Google/Drive calls.
- A synthetic behavior proof exercises the real module function path with fake pool/transaction behavior and proves candidate listing, run recording, latest-run reads, audit recording, auto-enforcement recording, and legacy exception reads preserve their returned data shapes.
- Focused proof dogfoods the unsafe old pattern: old inline proof-storage ownership in `foundation-db.js` fails, missing module ownership fails, missing delegates fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-013` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-drive-meeting-vault-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, `process:fanout-check`, `process:post-ship-fanout`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-drive-meeting-vault-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the proof-store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current Drive Access / Meeting Vault proof functions in `lib/foundation-db.js`, the store-factory split pattern from `lib/foundation-source-crawl-store.js`, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-drive-meeting-vault-store.js` with a dependency-injected store factory. Move the Meeting candidate read, Drive Access run mappers/record/latest functions, Meeting Vault ACL audit mappers/record/latest functions, Meeting Vault auto-enforcement mappers/record/latest functions, and legacy-exception reads into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof script is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live Google Drive, Gmail, Slack, Missive, ClickUp, FUB, Skool, myICOR, Loom, YouTube, Canva, OpenAI, Anthropic, Gemini, or paid-source APIs. It must not mutate Drive permissions, send request-access emails, run Meeting Vault Phase B, run source extraction, or mutate live hub state. For `scripts/process-foundation-drive-meeting-vault-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live scheduled jobs, Drive API calls, Meeting Vault enforcement, source extraction, and DB writes. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Drive Access or Meeting Vault scripts break because public imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Proof rows or counters map differently during the move.
  - Repair path: preserve existing SQL and dogfood with fake pool rows that prove candidate listing, Drive preflight run mapping, ACL audit mapping, auto-enforcement mapping, and legacy exception mapping still work.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool/transaction behavior and verifies returned candidate, run, audit, enforcement, and exception objects.
- Risk: This drifts into Drive permission mutation, Meeting Vault Phase B, Canva, Build Intel, source extraction, or hub feature work.
  - Repair path: do not change Drive/Meeting Vault apply scripts, auth, source schedules, credentials, routes, UI surfaces, table schema, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-drive-meeting-vault-store.js lib/foundation-db.js scripts/process-foundation-drive-meeting-vault-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-drive-meeting-vault-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-013 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-013.json --closeoutKey=foundation-drive-meeting-vault-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: Drive Access and Meeting Vault proof behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies returned data shapes.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Drive Access or Meeting Vault table schema, indexes, constraints, columns, migrations, policies, permission mutations, request-access emails, or apply scripts.
- Do not run Drive, Gmail, Slack, Missive, video, YouTube, Loom, Skool, myICOR, Canva, ClickUp, FUB, Google, OpenAI, Anthropic, Gemini, or paid-source APIs.
- Do not change connector health behavior, route selection, provider auth, model choice, secret names, cost caps, or live job execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, hub feature work, Drive permissions mutation, request-access email, or Meeting Vault Phase B.
- Do not move source-crawl target/item storage, intelligence job run storage, intelligence atom stores, action router stores, shared-comms storage, runtime/job storage, LLM runtime storage, agent feedback storage, user/access control, sales listing storage, or unrelated Foundation stores in this card.
