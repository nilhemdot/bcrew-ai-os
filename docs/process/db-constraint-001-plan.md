# DB-CONSTRAINT-001 Plan

## What

Close the second `DB-CONSTRAINT-001` slice by making pending doc-update apply semantics match normal locked-decision semantics.

When a pending doc update is applied and it links to a decision, that decision is locked. If the linked decision has `supersedesIds`, applying the doc update must also mark those superseded decisions as `superseded` and write the same kind of change-event proof that normal `updateDecision(... status: locked ...)` writes.

## Why

Foundation decisions and pending doc updates are live governance truth. The current apply path locks the linked decision, but it does not apply the decision's supersession list. That creates a hidden stale-truth risk: an old decision can remain `locked` even after a newer doc-applied decision says it supersedes it.

The operator value is concrete: when Steve approves and applies a doc update that carries a replacement decision, Foundation should make the current decision state obvious without requiring a second manual decision update.

## Acceptance Criteria

- `markPendingDocUpdateApplied()` locks the linked decision and applies that decision's normalized `supersedes_ids`.
- Superseded decisions get `status='superseded'`, `updated_at`, and `decision_superseded` change events through the existing decision-store helper.
- The `decision_locked` change event for doc-update apply includes the doc update ID and applied supersession metadata.
- If a linked decision has no supersedes IDs, apply behavior remains unchanged.
- Pending doc-update lifecycle guards stay intact: only `approved` or `failed` updates can apply.
- Source-ID validation remains verifier-backed for now; this card does not add broad foreign keys.
- Focused dogfood proof simulates the old failure: applying a doc update linked to a superseding decision must supersede the older decision.
- Proof script is read-only with no live table mutations, no raw SQL writes, and no `--apply` path.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/foundation-decision-store.js` owns the behavior change without moving unrelated DB code back into `lib/foundation-db.js`.
- `lib/db-constraint-hardening.js` owns constants, source evaluation, and a fake-client dogfood proof.
- `scripts/process-db-constraint-check.mjs` validates backlog/current sprint/approval/Plan Critic, source shape, dogfood proof, read-only posture, package script, and rebuild docs.
- `package.json` exposes `process:db-constraint-check`.
- `lib/foundation-core-governance-verifier.js` includes thin DB-CONSTRAINT coverage without adding broad root-verifier logic.
- `scripts/process-verifier-core-governance-split-module-check.mjs` and `scripts/foundation-verify.mjs` pass the new source inputs into the core-governance verifier.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-db-constraint-closeout.md` exists.
- Recent Builds closeout registry includes `db-constraint-doc-update-supersedes-v1`.
- Backlog, Current Sprint, focused proof, `foundation:verify`, and `process:foundation-ship` agree.

## Details

Existing code, docs, scripts, and live backlog truth to reuse:

- `lib/foundation-decision-store.js`
- `lib/foundation-core-governance-verifier.js`
- `scripts/process-verifier-core-governance-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `docs/handoffs/2026-05-15-foundation-decision-store-split-closeout.md`
- live backlog card `DB-CONSTRAINT-001`

Implementation shape:

- Add one focused helper inside the decision store for doc-update-linked decision lock/supersession.
- Reuse the existing `markSupersededDecisions()` helper instead of duplicating decision supersession SQL.
- Keep source-ID referential integrity as a verifier-backed contract for this card. Do not add Postgres FKs across all source-reference tables in this slice.
- Dogfood through a fake transaction client that exercises `markPendingDocUpdateApplied()` and proves old decisions are superseded.

Split/extraction plan:

- New proof logic goes in `lib/db-constraint-hardening.js` and `scripts/process-db-constraint-check.mjs`.
- Existing behavior changes stay in `lib/foundation-decision-store.js`.
- Core-governance verifier receives only thin source/dogfood coverage.
- Root verifier only passes source text into the existing core-governance verifier module.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Focused gate: `npm run process:db-constraint-check -- --json`.
- Regression gate: `npm run process:verifier-core-governance-split-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=DB-CONSTRAINT-001 --planApprovalRef=docs/process/approvals/DB-CONSTRAINT-001.json --closeoutKey=db-constraint-doc-update-supersedes-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-db-constraint-check.mjs` is read-only by default and has no `--apply` path.
- It must not call backlog/current-sprint write helpers, raw SQL mutation against live tables, live source connectors, paid APIs, source extraction, or `fs.writeFile`.

Speed budget:

- Focused proof should run under 10 seconds.
- Core-governance verifier split proof should remain under 10 seconds.
- Full ship gate stays under the existing 300 second budget.

## Risks

- **False current-truth risk:** a doc-applied replacement decision could lock without superseding the older decision. Mitigation: dogfood applies a linked doc update and fails unless the older decision becomes `superseded`.
- **Overreach risk:** source-ID integrity can drift into a broad schema migration. Mitigation: this card explicitly keeps source IDs verifier-backed and records the FK question as a later decision.
- **Regression risk:** doc update apply behavior is tied to file writes and commits in the route layer. Mitigation: this card changes only the store behavior after route apply succeeds; it does not touch file-write routing.
- **False green risk:** source marker checks could pass without behavior. Mitigation: the focused proof calls `markPendingDocUpdateApplied()` through `createFoundationDecisionStore()` with a fake client and inspects resulting decision states and events.
- **Rollback path:** restore the previous linked-decision lock block in `markPendingDocUpdateApplied()`, remove the focused proof module/script, and remove the core-governance verifier coverage.

## Tests

```sh
node --check lib/foundation-decision-store.js lib/db-constraint-hardening.js scripts/process-db-constraint-check.mjs lib/foundation-core-governance-verifier.js scripts/process-verifier-core-governance-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:db-constraint-check -- --json
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DB-CONSTRAINT-001 --planApprovalRef=docs/process/approvals/DB-CONSTRAINT-001.json --closeoutKey=db-constraint-doc-update-supersedes-v1 --commitRef=HEAD
```

Not next: no route/file-write redesign, no broad source-ID foreign-key migration, no live doc update apply, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no paid-source auth, no source extraction, no Drive permission mutation, and no Meeting Vault Phase B.
