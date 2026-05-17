# BACKLOG-QUEUE-RECONCILE-001 Closeout

Date: 2026-05-17
Closeout key: `backlog-queue-reconcile-v1`

## Outcome

The Foundation next-sprint queue now names live backlog truth instead of handoff-only labels.

- Created live backlog card: `BACKLOG-QUEUE-RECONCILE-001`
- Mapped former queue label `SYSTEM-HEALTH-RED-TO-GREEN-001` to existing live card `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
- Confirmed `CRITICAL-ROOTS-UNDER-3K-PHASE-1` already exists as a done live backlog card
- Mapped former queue label `NO-AUTH-CONNECTOR-COMPLETION-001` to existing live card `CONNECTOR-COMPLETION-SPRINT`
- Updated `docs/handoffs/2026-05-17-foundation-next-sprint-queue.md` so queue entries use `Live backlog card:` lines and explicit `Former queue label:` aliases

## Guardrail

Added `scripts/process-backlog-queue-reconcile-check.mjs` and `process:backlog-queue-reconcile-check`.

The focused proof fails if a queue document references a missing backlog card without an explicit alias to a live card. Dogfood fixtures prove:

- a handoff-only `Card:` line fails closed
- an explicit alias to a live backlog card passes
- an alias to a missing live card fails closed

Also repaired the historical sprint-gate verifier boundary exposed by this closeout: a completed Current Sprint review/rollover state is valid only when both the repo-side Current Sprint status and served Foundation Hub API are healthy. That keeps the sprint paused without requiring stale "active blocker advanced to X" wording.

## Proof

- `node --check scripts/process-backlog-queue-reconcile-check.mjs lib/foundation-build-closeout-control-plane-records.js lib/foundation-verify-coverage-card-ids.js lib/foundation-current-sprint-verifier.js lib/foundation-verifier-sprint-gate-progression.js`
- `npm run process:backlog-queue-reconcile-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BACKLOG-QUEUE-RECONCILE-001 --planApprovalRef=docs/process/approvals/BACKLOG-QUEUE-RECONCILE-001.json --closeoutKey=backlog-queue-reconcile-v1 --commitRef=HEAD`

## Not Done

- Did not start `FOUNDATION-SURFACE-UPDATES-001`
- Did not start another under-3K root split
- Did not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets

## Next

Pause after ship. Recommended next live backlog sprint: `FOUNDATION-SURFACE-UPDATES-001`.
