# DECISION-004 Closeout - Pending Decision Review

Generated: 2026-05-20T09:54:37.213Z
Closeout key: decision-004-pending-decision-review-v1

## What Shipped

- Added a pending decision review snapshot for proposed decisions and decision-destination Action Router routes.
- Added backend lock-in validation so decisions cannot be marked locked without source reference, owner, confirmer, participants, context, and evidence notes.
- Kept the workflow internal and human-controlled: no auto-lock, no auto-apply, no external writes, no source expansion.
- Repaired the read-only lessons-loop scheduled proof so its own failed run can prove recovery when it is the only repeated-failure blocker, instead of deadlocking the health gate.
- Advanced Current Sprint to DECISION-005 only after focused proof and full Foundation gates.

## Proof

- Focused DECISION-004 proof status: healthy
- Proposed decisions reviewed: 1
- Lock-ready decisions: 0
- Blocked lock-ins: 1
- Decision routes reviewed: 9
- Dogfood: pass

## Where It Lives

- `lib/decision-004-pending-review.js`
- `lib/foundation-decision-store.js`
- `scripts/process-foundation-lessons-learned-loop-check.mjs`
- `scripts/process-decision-004-check.mjs`
- `docs/process/decision-004-plan.md`
- `docs/process/approvals/DECISION-004.json`
- Foundation > Decisions / existing decision update route

## Known Limits

- This does not approve, reject, or lock a real business decision by itself.
- This does not build DECISION-005's deeper meeting/thread/session provenance model.
- This does not create external tasks, send messages, mutate Drive permissions, or run extraction.

## Review Next

Continue DECISION-005. Lock-in now fails closed without basic provenance; the next slice can deepen direct-versus-backfilled provenance and meeting/session/thread linkage.
