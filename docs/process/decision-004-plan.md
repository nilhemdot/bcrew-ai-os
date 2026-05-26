# DECISION-004 Plan - Pending Decision Review And Lock-In

## What

Build the first pending decision review and lock-in workflow. The card adds a source-backed review snapshot for proposed decisions and decision-destination Action Router routes, then wires fail-closed lock validation into the existing decision store.

The V1 scope is intentionally tight:

- Review proposed decisions and decision routes.
- Block weak `locked` updates at `foundation-decision-store.updateDecision()`.
- Require source reference, owner, confirmer, participants, context, and evidence notes for lock-in.
- Keep all output internal and human-controlled.

## Why

`GOV-001` made structured governance outputs visible, and `ACTION-ROUTER-001` can route synthesized items into decision-shaped destinations. The missing safety layer is lock-in. Without this card, a route, script, or operator action can promote a weak proposed decision into locked operating truth without enough provenance.

Steve needs the system to make real decisions easier to review while still preventing fake certainty.

Operator value: Steve can open the decision ledger, see which proposed decisions and routed decision signals need human review, and trust that a record cannot become locked truth until the real workflow has source proof and a named owner.

## Acceptance Criteria

- Proposed decisions can be summarized without being locked or applied.
- Decision-destination Action Router routes appear in a pending review snapshot with source-backed counts.
- Weak lock-in attempts fail with explicit blockers.
- Strong lock-in attempts pass only when source reference, owner, confirmer, participants, context, and evidence notes are present.
- Superseded decisions cannot be locked again.
- Existing non-locking decision updates still work.
- Current Sprint advances to `DECISION-005` only after focused proof and full gates.

## Definition Of Done

- `lib/decision-004-pending-review.js` provides the review snapshot, lock-readiness checks, dogfood proof, and closeout renderer.
- `lib/foundation-decision-store.js` uses the lock validator before any `locked` status update.
- `scripts/process-decision-004-check.mjs` validates approval, Plan Critic, live snapshot, dogfood behavior, closeout registry, package script, backlog, and Current Sprint.
- `docs/process/approvals/DECISION-004.json` validates under approval-integrity.
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-decision-004-pending-decision-review-closeout.md` is written by the close-card proof.
- Backlog marks `DECISION-004` done and keeps `DECISION-005` live as the next blocker.

## Details

Existing work reused:

- `GOV-001` governance accountability packet.
- `ACTION-ROUTER-001` decision/backlog/question routing.
- `MEMORY-005` decision temporal truth semantics.
- Existing `decisions` table, Foundation decision store, Foundation write route, and Decisions UI.
- Existing code: `lib/foundation-decision-store.js`, `server.js`, `public/foundation.js`, `lib/intelligence-action-router.js`, and `lib/gov-001-governance-accountability.js`.
- Existing docs: `docs/process/gov-001-governance-accountability-plan.md`, `docs/process/approvals/GOV-001.json`, and the Current Sprint record.
- Existing scripts: `scripts/process-gov-001-check.mjs`, `scripts/process-memory-005-check.mjs`, and the `process:foundation-ship` gate pattern.
- Live backlog truth: `DECISION-004` is active and `DECISION-005` is the next scoped decision-provenance card.

Exact gap:

- Existing surfaces show decision-shaped work, but lock-in was not protected by a provenance gate.

Implementation path:

- Add a DECISION-004 module with normalizers, pending review snapshot, lock-readiness validation, dogfood proof, evaluator, and closeout renderer.
- Hook `validateDecisionLockInput()` into `updateDecision()`.
- Add a focused process check with `--close-card` write guard.
- Add closeout registry and package script coverage.

Root invariant and root cause:

- Root cause: the system had proposed decision records but no single store-level lock-in invariant.
- Root invariant: a `locked` decision is durable operating truth and must always be backed by source/provenance/owner evidence.
- The proof uses actual function behavior and live DB/API-backed snapshots. No substring-only proof is accepted for lock-in behavior.

Not next:

- Do not auto-lock, auto-apply, auto-reject, or send decisions.
- Do not build `DECISION-005` deeper meeting/thread/session provenance in this card.
- Do not create a new decision table or rebuild Action Router.
- Do not mutate external systems, Drive permissions, credentials, provider config, source systems, or private extraction.

Gate decision tree:

- Static gate: `node --check` covers the module, process script, and decision store syntax.
- Focused gate: `process:decision-004-check` covers Plan Critic, approval, live DB snapshot, dogfood lock behavior, package script, closeout registry, backlog, and Current Sprint.
- Full gate: because this touches the decision store and Foundation ship truth, `foundation:verify` and `process:foundation-ship` are required before push.
- Blast radius: decision write behavior changes only for `status=locked`; proposed/non-locking edits stay allowed.
- Speed bound: the focused proof must stay thin and under 2 minutes so it is used by default; full ship runs only at card close.

## Risks

- A too-loose guard would create false locked truth. The dogfood proof must show weak lock-in fails.
- A too-strict guard could block legitimate non-locking edits. The dogfood proof must show proposed updates remain allowed.
- The card could drift into an autonomous governance workflow. The module stays read-only except for the explicit decision-store lock validation.
- Current Sprint could get ahead of repo truth. Close-card proof must update backlog/sprint only after all focused checks pass.

Repair path:

- If focused proof fails, do not close the card; repair the failing behavior and rerun the focused gate.
- If lock validation blocks a legitimate non-locking edit, fix the validator to fail closed only for `status=locked`.
- If locked-update behavior regresses after ship, revert the DECISION-004 module, process script, registry entry, package script, and decision-store hook, then reopen DECISION-004 or create a follow-up repair card.
- If any workflow must be approval-bound, park that specific action and continue safe sprint work; do not bypass the lock guard.

## Tests

- `node --check lib/decision-004-pending-review.js scripts/process-decision-004-check.mjs lib/foundation-decision-store.js`
- `npm run process:decision-004-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=DECISION-004 --planApprovalRef=docs/process/approvals/DECISION-004.json --closeoutKey=decision-004-pending-decision-review-v1 --commitRef=HEAD`
