# FOUNDATION-DB-STORE-SPLIT-001 Plan

## What

Split the Current Sprint store and mutation guard seam out of `lib/foundation-db.js` into a dedicated module while keeping the existing public exports from `lib/foundation-db.js` stable.

## Why

`lib/foundation-db.js` is still about 19.6K lines. That file now contains schema setup, seed data, source reads, backlog writes, Current Sprint mutation rules, dogfood proof, and many unrelated stores. The last cleanup proved one safe split pattern on the build log. This card applies that pattern to one Foundation DB seam that is already guarded and heavily used: Current Sprint state.

## Acceptance Criteria

- A dedicated Current Sprint store module owns sprint row mapping, sprint item mapping, Plan Critic run mapping, mutation option normalization, item diffing, mutation guard errors, Current Sprint reads, Plan Critic run reads, overlay upserts, and the Current Sprint mutation dogfood proof.
- `lib/foundation-db.js` keeps the existing public exports by wiring through the dedicated store module; existing callers do not need import changes.
- `lib/foundation-db.js` line count decreases and no longer defines the extracted Current Sprint helper functions inline.
- The focused proof calls the actual exported Current Sprint read, Plan Critic read, overlay mutation, and dogfood proof paths.
- Dogfood proof recreates or simulates the original broad Current Sprint mutation failure mode: unsafe no-apply write, missing expected previous active sprint id, missing item replacement approval, and rollback-scoped explicit replacement.
- The proof rejects substring-only validation as sufficient and fails if the new module is just a marker file.

## Definition Of Done

- Live sprint item moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps.
- Plan Critic pass row exists at 9.8 or higher before implementation.
- `lib/foundation-current-sprint-store.js` exists and owns the extracted Current Sprint store behavior.
- `npm run process:foundation-db-store-split-check -- --json` passes.
- `npm run backlog:hygiene -- --json`, `npm run foundation:verify`, and full `process:foundation-ship` pass before push.
- Closeout records the exact next recommended monolith slice and stops at sprint review.

## Details

Reuse existing code, existing docs, existing scripts, and live backlog / Current Sprint truth instead of rewriting behavior:

- `lib/foundation-db.js` for the existing pool, transaction wrapper, change-event writer, backlog row mapper, and public export boundary.
- Existing Current Sprint functions: `getActiveFoundationCurrentSprint`, `getPlanCriticRunsByCardIds`, `upsertFoundationCurrentSprintOverlay`, and `buildCurrentSprintMutationGuardsDogfoodProof`.
- Existing dogfood invariant from `CURRENT-SPRINT-MUTATION-GUARDS-001`.
- Existing proof style from `scripts/process-foundation-build-log-monolith-slice-check.mjs` and `scripts/process-runtime-safety-hardening-check.mjs`.
- Existing approval validation and Plan Critic rows.

Gate decision tree: this is a full gate because the blast radius touches `lib/foundation-db.js`, Current Sprint write behavior, package scripts, and canonical `foundation:verify` coverage. The proportional proof shape is a fast focused proof first (`process:foundation-db-store-split-check`), then `backlog:hygiene`, `foundation:verify`, and final `process:foundation-ship`.

Operator value: this unlocks better quality for Steve's real workflow. The Foundation sprint board becomes easier to trust because the Current Sprint store is isolated behind a smaller module instead of buried inside a 19K-line file. That makes future sprint/hub parallel work safer, faster to review, and less likely to hide another write-boundary bug.

Speed bound: the focused proof should stay under 2 minutes and the full gate remains the final ship gate only. This is not another heavy broad audit; it is a thin store split with one behavior proof.

Implementation shape: create a store factory such as `createFoundationCurrentSprintStore({ pool, withFoundationTransaction, insertChangeEvent, mapBacklogRow })`. `lib/foundation-db.js` imports that factory, creates the store once near the existing helper boundary, and re-exports the same public functions. Keep DB connection ownership in `foundation-db.js`; move only the Current Sprint store behavior and guard logic.

## Risks

- This touches the Foundation DB public API. Keep public exports stable and run the full gate.
- Current Sprint mutation is a write path. The dogfood proof must prove unsafe writes still fail closed and rollback-scoped explicit writes do not persist.
- A broad refactor of `foundation-db.js` would be too risky. This card only moves the Current Sprint store seam.
- Some legacy proofs scan `foundation-db.js` for source markers. If needed, update those proofs to follow the new module instead of weakening the checks.

## Tests

- `npm run process:foundation-db-store-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-DB-STORE-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-STORE-SPLIT-001.json --closeoutKey=foundation-db-store-split-v1 --commitRef=HEAD`

## Not Next

- Do not change Sales Hub, Ops Hub, GLS, or FUB behavior.
- Do not build Build Intel extraction, paid auth, screenshots, OCR, or Research Inbox work.
- Do not split schema bootstrap, seed repair, `public/foundation.js`, `server.js`, or the whole verifier in this card.
- Do not use a new database abstraction or migrate away from Postgres.
- Do not create autonomous dev behavior or auto-open the next sprint.
