# FOUNDATION-DB-MONOLITH-SPLIT-002 Plan

## What

Extract the decision, open-question, and pending-doc-update store behavior from `lib/foundation-db.js` into a focused `lib/foundation-decision-store.js` module without changing the public DB API.

V1 moves the decision/open-question/doc-update row mappers, decision traceability/review snapshot helpers, decision category/id/list normalization, supersession helper, and public decision/doc-update write/read functions into a store factory. `lib/foundation-db.js` keeps pool ownership, transactions, schema/init, source crawl, intelligence, shared communications, and existing public export names by delegating to the new store.

## Why

`lib/foundation-db.js` is still about 18.8K lines after the first DB split. This domain is a natural next boundary because it owns Foundation decision truth, open questions, pending doc proposal lifecycle, and doc-update write state. Keeping that behavior inside the DB monolith makes future governance and doc-update changes riskier than they need to be.

The operator value is practical: Steve can keep using decisions, questions, and doc proposal flows while future changes land in a named module instead of expanding the high-risk DB file. This continues the Foundation cleanup path without touching hub feature work or paid-source auth.

## Acceptance Criteria

- `lib/foundation-decision-store.js` owns the extracted decision/open-question/pending-doc-update behavior and exports a store factory.
- `lib/foundation-db.js` delegates the existing public exports without changing caller imports.
- Decision category and supersedes validation still rejects unsupported categories, duplicate/self supersedes IDs, and invalid pending doc-update state transitions.
- The pending doc-update lifecycle still requires valid transitions for approve/reject/fail/apply and still records change-event metadata.
- `lib/foundation-db.js` line count decreases from the pre-split baseline.
- Focused proof is read-only and uses dogfood fixtures to prove the old unsplit/weak behavior fails and the split module preserves invariants.

## Definition Of Done

- The live backlog card is in `done` and Current Sprint shows this card as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:foundation-decision-store-split-check -- --json`.
- `foundation:verify` and the full Foundation ship gate pass before push.
- Closeout and Recent Builds identify `foundation-decision-store-split-v1`.

## Details

Existing code to reuse: `createDecision`, `updateDecision`, `createOpenQuestion`, `updateOpenQuestion`, `listPendingDocUpdates`, `getPendingDocUpdate`, `createPendingDocUpdate`, `approvePendingDocUpdate`, `rejectPendingDocUpdate`, `markPendingDocUpdateFailed`, `markPendingDocUpdateApplied`, `buildDecisionTraceabilitySnapshot`, `buildDecisionReviewSnapshot`, `insertChangeEvent`, `withFoundationTransaction`, `getNextPrefixedId`, and `mapChangeEventRow`.

Existing patterns to reuse: `lib/foundation-backlog-store.js`, `scripts/process-foundation-backlog-store-split-check.mjs`, AGENTS.md Foundation Rebuild Discipline, and the deep-audit monolith findings.

Implementation shape: create `createFoundationDecisionStore({ pool, withFoundationTransaction, insertChangeEvent, getNextPrefixedId, mapChangeEventRow, canonicalDecisionCategories })`. Keep DB connection ownership, schema, general change-event querying, source-contract audits, and unrelated stores in `foundation-db.js`. Only move the decision/question/doc-update store boundary.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call live mutators, write files, or update sprint/backlog state. It should inspect code, validate live state, and run pure dogfood fixtures only.

Gate decision tree: static proof alone is too weak because this touches Foundation decision write behavior. Focused proof covers the module boundary and lifecycle dogfood cases and should stay fast, proportional, and under 2 minutes. Full Foundation ship gate is required because `lib/foundation-db.js`, package scripts, verifier coverage, closeout records, and rebuild docs change.

## Risks

- Risk: callers import decision/doc-update functions from `lib/foundation-db.js` and break if exports change.
  - Repair path: keep wrapper exports with the same names and run existing process gates.
- Risk: splitting weakens decision category/supersedes validation.
  - Repair path: dogfood unsupported category rejection, self-supersedes filtering, and duplicate ID normalization.
- Risk: splitting weakens pending doc-update transition guards.
  - Repair path: dogfood invalid transition rejection for approve/apply/fail paths.
- Risk: this becomes a broad DB refactor.
  - Repair path: no schema changes, no source crawl/job/intelligence/shared-comms/sales/hub movement, no public API changes.

## Tests

```bash
node --check lib/foundation-decision-store.js scripts/process-foundation-decision-store-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-decision-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-002 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-002.json --closeoutKey=foundation-decision-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe patterns this store owns: unsupported decision categories, duplicate/self supersedes IDs, invalid pending doc-update status transitions, missing store delegation, and missing change-event metadata terms.

## Not Next

- Do not split all of `lib/foundation-db.js`.
- Do not move schema init, source crawl, job runtime, intelligence, shared communications, sales, FUB, or hub behavior.
- Do not change decision, open-question, or pending-doc-update schema.
- Do not touch hub UI or Marketing Video Lab live wiring.
- Do not run paid-source auth.
- Do not run MEETING-VAULT-ACL-001 Phase B.
- Do not mutate Drive permissions.
- Do not send request-access emails.
