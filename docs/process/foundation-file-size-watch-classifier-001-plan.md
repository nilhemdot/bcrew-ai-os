# FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001 Plan

## What

Clear the remaining Foundation file-size health debt without a risky rewrite.

The card targets a fresh file-size slate for System Health: `fileSizeRiskCount=0` and `fileSizeWatchCount=0`. Rows that remain above the preferred 1,500-line budget must be managed, visible, non-blocking rows with owner, reason, threshold, next trigger, and automatic stale escalation.

## Why

After endpoint metrics and hot handoffs were repaired, System Health was healthy but still carried four raw file-size watch rows:

- `scripts/foundation-verify.mjs` at 4,995 lines before this card
- `public/foundation.js` at 2,997 lines before this card
- `lib/foundation-db.js` at 2,260 lines before this card
- `server.js` at 2,022 lines before this card

Steve's rule is that yellow cannot be invisible, ownerless, or permanent. The system should handle yellow automatically, escalate stale or threshold-crossing rows, and block red/risk rows without waiting for Steve to notice.

## Acceptance Criteria

- `scripts/foundation-verify.mjs` delegates a coherent verifier slice and stays below the 5,000-line split-now threshold.
- `public/foundation.js`, `lib/foundation-db.js`, and `server.js` either stay below their action thresholds or have evidence-backed managed-watch dispositions.
- The file-size model is reusable for future rows:
  - unmanaged files above the preferred budget surface active watch findings
  - files at or above 5,000 lines surface risk/split-now findings
  - managed watch rows require owner, reason, threshold, next trigger, next action, and review date
  - stale managed watch rows escalate back to active watch
- System Health reports `fileSizeRiskCount=0`, `fileSizeWatchCount=0`, `rawRiskCount=0`, and `rawWatchCount=0`, while still exposing managed file-size rows.
- Current Sprint moves to `FOUNDATION-HEALTH-GREEN-LOCK-001` only after focused proof passes.

## Definition Of Done

- `lib/foundation-file-size-standard.js` owns the reusable escalation model.
- `scripts/foundation-verify.mjs` delegates progression blocker logic into `lib/foundation-verifier-progression-helpers.js`.
- `scripts/process-foundation-file-size-watch-classifier-check.mjs` proves line counts, managed rows, stale escalation, split-now escalation, System Health clean slate, package script, closeout registry, verifier coverage, live backlog, and Current Sprint state.
- `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001` is closed in live backlog and Current Sprint after focused proof passes.
- `backlog:hygiene`, repeated-failure gate, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

The card does not try to push every central file below 1,500 lines in one risky pass. It separates active health debt from managed architecture watch:

- Green: no active file-size risk/watch rows.
- Managed watch: visible, owner-backed, threshold-backed, non-blocking, and review-date backed.
- Active watch: unmanaged, stale, or over a blocking threshold.
- Risk: split-now or danger threshold crossed; normal progression blocks.

File-specific disposition:

- `scripts/foundation-verify.mjs`: split/delegate now. This card extracts progression blocker logic and blocks future growth at 5,000 lines or any new verifier-domain behavior added directly to the root.
- `public/foundation.js`: managed near-3k shell only if it stays under 3,000 lines and new UI behavior goes into renderer modules.
- `lib/foundation-db.js`: managed core DB shell only if it stays under 3,000 lines and new domains go into store modules.
- `server.js`: managed route mount shell only if it stays under 3,000 lines and route behavior goes into route modules.

## Reuse Existing Work

This extends the existing `FILE-SIZE-ENGINEERING-STANDARD-001` implementation. It reuses:

- `lib/foundation-file-size-standard.js`
- `lib/foundation-system-health.js`
- `lib/foundation-ship-preflight.js`
- `scripts/process-file-size-engineering-standard-check.mjs`
- live backlog and Current Sprint truth
- existing critical-root split closeouts and file-size doctrine

## Existing Work Reused

Existing code:

- `lib/foundation-file-size-standard.js`
- `lib/foundation-system-health.js`
- `lib/foundation-ship-preflight.js`
- `scripts/foundation-verify.mjs`
- `lib/foundation-verify-coverage-card-ids.js`
- `lib/foundation-build-closeout-size-records.js`

Existing scripts:

- `scripts/process-file-size-engineering-standard-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-foundation-ship-preflight.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

Existing docs and backlog truth:

- `docs/process/file-size-engineering-standard-001-plan.md`
- `docs/process/approvals/FILE-SIZE-ENGINEERING-STANDARD-001.json`
- live backlog card `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`
- live next card `FOUNDATION-HEALTH-GREEN-LOCK-001`
- live Current Sprint active blocker
- closeouts for `CRITICAL-FILES-UNDER-5K-001`, `FILE-SIZE-ENGINEERING-STANDARD-001`, endpoint cleanup, and handoff cleanup

## Operator Value

Steve gets a clean Foundation health slate without losing architecture visibility. Yellow remains visible and automated, but it no longer makes the system look broken when it has owner, threshold, and next action. Red still blocks.

Real operator behavior:

- System Health shows active file-size risk/watch as zero only when no unmanaged, stale, or threshold-crossing file-size row remains.
- Managed file-size rows still show owner, threshold, next trigger, next action, and blocking state.
- Future unmanaged/stale/yellow rows reappear automatically without Steve manually noticing.
- Current Sprint shows whether file-size debt is blocking or non-blocking before green-lock work begins.

## Speed And File-Size Budget

- Focused proof should run fast, under 2 minutes on the local machine.
- New proof script stays under 700 lines.
- New verifier helper module stays under 200 lines.
- Plan, approval, and closeout report artifacts stay under 3,000 lines each.
- No generated payload is added.
- `scripts/foundation-verify.mjs` must stay below 5,000 lines after this card.
- `public/foundation.js`, `lib/foundation-db.js`, and `server.js` must stay below 3,000 lines unless Steve explicitly approves a sprint exception.

## Rollback Or Repair Path

If focused proof fails, do not close the card or advance Current Sprint. Repair path:

- If verifier line count reaches 5,000 or higher, extract another verifier domain before closeout.
- If `public/foundation.js` crosses 3,000, extract a renderer slice or ask Steve for an explicit sprint exception.
- If any managed row is missing owner, reason, threshold, next trigger, next action, or review date, fail the proof.
- If stale escalation fails, keep file-size watch active until the escalation model is fixed.
- If System Health still reports active file-size risk/watch rows, fix the row or keep this card active.

## Behavioral Proof

The proof must exercise real behavior, not only source markers:

- Run `buildFoundationFileSizeStandardStatus()` against the real repo.
- Run dogfood with unmanaged, stale, managed, and split-now fixtures.
- Run `process:system-health-nightly-audit-check -- --json` and verify active file-size counts are zero.
- Show before/after line counts for the four watched files.
- Prove managed rows remain visible in System Health with blocking/non-blocking state.
- Prove the focused card can close live backlog and Current Sprint only after Plan Critic and approval pass.

## Tight Scope And Not Next

Tight V1 scope:

- one verifier helper extraction
- reusable file-size escalation model
- focused proof and card closeout
- Current Sprint advance to green lock

Not next:

- Do not split every root file in one pass.
- Do not do broad mechanical rewrites.
- Do not add new responsibility to near-limit files.
- Do not start source/value/agent work.
- Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.
- Do not launch parallel builders.

## Gate Decision Tree

Gate level: full.

Decision tree:

- Static checks are not enough because this changes System Health rollup semantics and Current Sprint truth.
- Focused proof is required to dogfood unmanaged/stale/split-now escalation and live System Health clean slate.
- Full `foundation:verify` and `process:foundation-ship` are required because the card touches shared verifier, System Health, package scripts, closeout registry, and sprint state.

## Risks

- Risk: classification hides architecture debt.
  - Response: managed watch rows stay visible with owners, thresholds, next triggers, and stale escalation.
- Risk: verifier split breaks `foundation:verify`.
  - Response: extract a small pure helper and run full verifier before ship.
- Risk: 3k/5k policy becomes current-row-only.
  - Response: dogfood future unmanaged and stale rows, not just the four current files.
- Risk: the card turns into a giant split sprint.
  - Response: split the obvious near-5k verifier slice first, then classify only with hard thresholds where low-risk splits are not justified.

## Tests

- `node --check lib/foundation-file-size-standard.js lib/foundation-system-health.js lib/foundation-verifier-progression-helpers.js scripts/foundation-verify.mjs scripts/process-foundation-file-size-watch-classifier-check.mjs`
- `npm run process:foundation-file-size-watch-classifier-check -- --apply --close-card --json`
- `npm run process:file-size-engineering-standard-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001.json --closeoutKey=foundation-file-size-watch-classifier-v1 --commitRef=HEAD`
