# FOUNDATION-DB-MONOLITH-SPLIT-014 Plan

Status: approved for build
Card: `FOUNDATION-DB-MONOLITH-SPLIT-014`
Sprint: `foundation-db-agent-feedback-store-split-2026-05-16`
Closeout key: `foundation-agent-feedback-store-split-v1`

## What

Extract Agent Onboarding Feedback response, send-attempt, reminder-attempt, and response-notification DB behavior from `lib/foundation-db.js` into a focused `lib/foundation-agent-feedback-store.js` module.

`lib/foundation-db.js` keeps the existing public export names as thin delegates so current routes, Ops/Agent Feedback scripts, and verifiers keep importing from the same place.

## Why

`lib/foundation-db.js` remains above the architecture-risk line after the Drive/Meeting Vault split. Agent Feedback is a clean bounded domain because it owns one operational workflow ledger: feedback responses, initial send attempts, reminder attempts, and internal response notifications.

Root invariant: this card only moves existing DB behavior into a named store. It does not send Gmail, write ClickUp, change recipient policy, change reminder cadence, alter schema, or create new hub behavior.

Proof wording invariant: this is a no Gmail send and no ClickUp write split. Any live send/write behavior remains outside this card.

Operator value: Steve gets a smaller Foundation DB core and a named Agent Feedback DB store that can be reviewed independently before future Ops/Sales/Agent Feedback hub work builds on it.

## Acceptance Criteria

- `lib/foundation-agent-feedback-store.js` exports `createFoundationAgentFeedbackStore()` plus evaluator, dogfood, and synthetic behavior proof helpers for this split.
- `lib/foundation-db.js` imports the new store factory and wires it with `pool` and `withFoundationTransaction`.
- Existing public exports from `lib/foundation-db.js` remain available with unchanged names for feedback responses, send attempts, reminder attempts, and response notifications.
- `lib/foundation-db.js` no longer owns inline Agent Feedback row mappers or public Agent Feedback DB functions.
- The new store does not change table schema, route behavior, Gmail sending, ClickUp writeback, reminder policy, notification recipients, token policy, auth, source extraction, or hub UI.
- A synthetic behavior proof exercises the real store methods with fake pool/transaction behavior and proves response, send attempt, reminder attempt, and notification output shapes are preserved.
- Focused proof dogfoods the unsafe old pattern: old inline Agent Feedback DB ownership fails, missing module ownership fails, missing delegates fail, and split module ownership passes with a decreased `lib/foundation-db.js` line count.

## Definition Of Done

- Live backlog card `FOUNDATION-DB-MONOLITH-SPLIT-014` is present, in `done`, and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-agent-feedback-store-split-check -- --json`.
- `backlog:hygiene`, `foundation:verify`, `process:fanout-check`, `process:post-ship-fanout`, and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `foundation-agent-feedback-store-split-v1`.

Gate decision tree: static checks cover changed JS syntax, focused proof validates the store extraction and synthetic behavior, and the full Foundation ship gate is required because this touches `lib/foundation-db.js`, a new DB module, package scripts, verifier coverage, closeout records, and live sprint/backlog state.

## Details

Existing code to reuse: current Agent Feedback DB functions in `lib/foundation-db.js`, the store-factory split pattern from other Foundation DB store modules, approval integrity, Current Sprint stage gate, and Foundation ship gates.

Implementation shape: create `lib/foundation-agent-feedback-store.js` with a dependency-injected store factory. Move feedback response mappers, send-attempt mappers/functions, reminder-attempt mappers/functions, and response-notification mappers/functions into that module. Keep table schema/init SQL in `lib/foundation-db.js`. In `lib/foundation-db.js`, instantiate the store and re-export each public function as a delegate.

Architecture guardrail: this is the split/extraction plan for touching `lib/foundation-db.js`, which is over 5,000 lines. No new responsibility is added to the monolith. The new module owns the extracted responsibility and `lib/foundation-db.js` becomes a wiring/export surface for this domain.

Verifier/check posture: the focused proof is read-only. It may inspect source files, validate approval/current sprint/Plan Critic state, and run synthetic fake-pool behavior checks. It must not call live Gmail, ClickUp, FUB, Slack, Missive, Google, Canva, OpenAI, Anthropic, Gemini, Skool, myICOR, Loom, YouTube, or paid-source APIs. It must not send Gmail, write ClickUp, run source extraction, mutate live hub state, or mutate Agent Feedback production rows. For `scripts/process-foundation-agent-feedback-store-split-check.mjs`, any future live write path is read-only by default and requires explicit `--apply` posture. No-flag writes are blocked. For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

Speed boundary: the focused proof must stay under 10 seconds by avoiding live connectors, live scheduled jobs, DB writes, Gmail sends, ClickUp writes, source extraction, and hub UI. Full `foundation:verify` and `process:foundation-ship` still run before push because the change touches a core DB export surface.

## Risks

- Risk: Agent Feedback routes or scripts break because public imports change.
  - Repair path: keep `lib/foundation-db.js` public export names unchanged and run syntax/import plus full ship-gate proof before push.
- Risk: Response/send/reminder/notification row shapes change during the move.
  - Repair path: preserve existing SQL and dogfood with fake pool rows that prove returned objects still map the expected fields.
- Risk: Synthetic proof turns into substring theater.
  - Repair path: synthetic proof calls real store methods with fake pool/transaction behavior and verifies returned response, send-attempt, reminder, and notification objects.
- Risk: This drifts into Agent Feedback feature work.
  - Repair path: do not change Gmail send logic, ClickUp writeback, reminder cadence, notification recipients, token policy, routes, UI, auth, table schema, or hub behavior in this card.

## Tests

```bash
node --check lib/foundation-agent-feedback-store.js lib/foundation-db.js scripts/process-foundation-agent-feedback-store-split-check.mjs scripts/foundation-verify.mjs lib/foundation-db-split-verifier.js lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-agent-feedback-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-014 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-014.json --closeoutKey=foundation-agent-feedback-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe pattern this card addresses: Agent Feedback DB behavior buried inline in the DB monolith. The old inline shape must fail the focused evaluator; the split module shape must pass only when the module owns the behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies returned data shapes.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not change Agent Feedback table schema, indexes, constraints, columns, migrations, route behavior, Gmail send behavior, ClickUp writeback behavior, reminder cadence, response-notification recipient policy, token policy, or auth.
- Do not run Drive, Gmail, Slack, Missive, video, YouTube, Loom, Skool, myICOR, Canva, ClickUp, FUB, Google, OpenAI, Anthropic, Gemini, or paid-source APIs.
- Do not change connector health behavior, route selection, provider auth, model choice, secret names, cost caps, or live job execution.
- Do not touch Canva asset work, Marketing Video Lab, paid-source auth, Build Intel extraction implementation, hub feature work, Drive permissions mutation, request-access email, or Meeting Vault Phase B.
- Do not move sales listing storage, source-crawl target/item storage, intelligence job run storage, intelligence atom stores, action router stores, shared-comms storage, runtime/job storage, LLM runtime storage, user/access control, or unrelated Foundation stores in this card.
