# Foundation Next Sprint Queue - 2026-05-17

Purpose: give the next builder a clean Foundation-only queue from live backlog truth. Handoff labels are not task truth unless they map to a live backlog card.

## Current Repo State

Proof-counter line counts after the May 17 Foundation cleanup:

- `scripts/foundation-verify.mjs`: 4,999
- `server.js`: 4,832
- `lib/foundation-db.js`: 4,736
- `public/foundation.js`: 2,998

Local visual sandbox/mockup assets remain intentionally excluded from status through `.git/info/exclude`; do not delete or commit them.

## Live Backlog Truth

### Active Sprint

Live backlog card: `BACKLOG-QUEUE-RECONCILE-001`

Goal: reconcile this queue, live backlog cards, process artifacts, and next-step truth before any more Foundation building.

Acceptance:

- Missing handoff labels are either mapped to existing live cards or created as live backlog cards.
- Future queue handoffs fail proof when they reference a missing live card without an explicit alias.
- This sprint ships under `backlog-queue-reconcile-v1`, then pauses.

### Completed Foundation Queue

1. Live backlog card: `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
   Former queue label: `SYSTEM-HEALTH-RED-TO-GREEN-001` -> `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
   Status: done. The May 17 red-to-green work shipped through the existing system-health card and `system-health-nightly-audit-v1`; do not create a duplicate card for the former label.

2. Live backlog card: `CRITICAL-FILES-UNDER-5K-001`
   Status: done under `critical-files-under-5k-v1`.

3. Live backlog card: `FILE-SIZE-ENGINEERING-STANDARD-001`
   Status: done under `file-size-engineering-standard-v1`.

4. Live backlog card: `CRITICAL-ROOTS-UNDER-3K-PHASE-1`
   Status: done under `critical-roots-under-3k-phase-1-v1`.

5. Live backlog card: `CONNECTOR-COMPLETION-SPRINT`
   Former queue label: `NO-AUTH-CONNECTOR-COMPLETION-001` -> `CONNECTOR-COMPLETION-SPRINT`
   Status: done under `connector-completion-prep-v1`. No-auth follow-up work already continued through live cards such as `SOURCE-CONTRACT-ID-RECONCILE-001` and `GCAL-ATOM-SCHEDULE-001`; do not create a duplicate card for the former label.

## Size Standard

Foundation file-size standard is now live through `FILE-SIZE-ENGINEERING-STANDARD-001`:

- Preferred hand-written module target: 1,500 lines or less.
- Above 1,500 lines: watch.
- Above 3,000 lines: split/no-new-responsibility plan required before more additions.
- Above 10,000 lines: red/danger.
- Generated files, data records, closeout registries, report artifacts, and archives require explicit budgets.

## Next Recommended Sprint

Recommended next live backlog card after this reconciliation ships: `FOUNDATION-SURFACE-UPDATES-001`.

Reason: Foundation now has the core health, size, and first root cleanup gates in place. The next useful operator slice is to make the Foundation surfaces easier to inspect from live backlog truth before another root split.

Not next inside `BACKLOG-QUEUE-RECONCILE-001`:

- Do not start `FOUNDATION-SURFACE-UPDATES-001`.
- Do not start another under-3K split.
- Do not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets.

## Guardrail

Any future queue handoff must use one of these forms:

- `Live backlog card: <live backlog card id>`
- `Former queue label: <old queue label> -> <live backlog card id>`

The focused proof for `BACKLOG-QUEUE-RECONCILE-001` fails if a queue doc presents a handoff-only label as a card or references a missing live card without an explicit alias to a live backlog card.
