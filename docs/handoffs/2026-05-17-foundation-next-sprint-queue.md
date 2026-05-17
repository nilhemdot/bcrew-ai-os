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

Live backlog card: `BACKLOG-SCRUM-MASTER-GROOMING-001`

Status: done under `backlog-scrum-master-grooming-v1`; pause before starting the next bundle.

Goal: make the live backlog build-ready and sprint-plannable before more Foundation/root/feature work.

Acceptance:

- Every non-done card is classified as build-ready, needs enrichment, duplicate/alias, stale/parked, blocked by Steve/auth/source access, or belongs inside a larger sprint bundle.
- Thin high-priority cards are enriched or explicitly classified blocked/stale/duplicate so they cannot be pulled as next work by accident.
- Duplicate/overlap cards are aliased to canonical live cards instead of duplicated.
- Done cards get a lightweight integrity scan and are not referenced as active/next work.
- Active/next sprint queues fail proof if they use a missing card, thin card, duplicate card without alias, stale/parked card, or done card as active work.
- This sprint ships under `backlog-scrum-master-grooming-v1`, then pauses.

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

6. Live backlog card: `BACKLOG-QUEUE-RECONCILE-001`
   Status: done under `backlog-queue-reconcile-v1`.

7. Live backlog card: `BACKLOG-SCRUM-MASTER-GROOMING-001`
   Status: done under `backlog-scrum-master-grooming-v1`.

## Size Standard

Foundation file-size standard is now live through `FILE-SIZE-ENGINEERING-STANDARD-001`:

- Preferred hand-written module target: 1,500 lines or less.
- Above 1,500 lines: watch.
- Above 3,000 lines: split/no-new-responsibility plan required before more additions.
- Above 10,000 lines: red/danger.
- Generated files, data records, closeout registries, report artifacts, and archives require explicit budgets.

## Next Sprint Bundles

The current grooming sprint owns the bundle proof. These are live backlog cards, not handoff-only labels.

### Bundle: foundation-operator-surface-truth

Order: 1

Live backlog cards:

- `FOUNDATION-SURFACE-UPDATES-001`
- `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001`

Outcome: make the Foundation command surface easier to inspect before more root or feature work.

### Bundle: foundation-control-and-access-surface

Order: 2

Live backlog cards:

- `SYSTEM-010`
- `FOUNDATION-USERS-001`

Outcome: make running systems, kill switches, decommission posture, and owner-only access visible before broader agent capability work.

### Bundle: source-contract-validation-layer

Order: 3

Live backlog cards:

- `SOURCE-001`
- `SOURCE-002`
- `SOURCE-003`
- `SOURCE-012`
- `SOURCE-ID-ARRAY-PROVENANCE-IMPLEMENTATION-001`

Outcome: revalidate core connectors and make source-contract/connectors/provenance boundaries visible as separate live layers.

### Bundle: security-access-hardening

Order: 4

Live backlog cards:

- `SECURITY-006`
- `SECURITY-PROVIDER-ROTATION-PROOF-001`
- `SECURITY-EDGE-001`
- `SECURITY-FILTERED-COMMS-ACCESS-001`

Outcome: close credential/provider proof, edge auth, and filtered shared-comms access risks before exposing wider surfaces. Some cards may still need Steve/provider/source-access action before build.

### Bundle: extraction-runtime-readiness

Order: 5

Live backlog cards:

- `EXTRACT-CURRENT-001`
- `EXTRACT-BACKFILL-001`
- `DRIVE-CONTENT-001`
- `EMAIL-ATTACHMENTS-001`
- `MEETING-VIDEO-001`
- `EXTRACTION-TEAM-001`

Outcome: plan current-day sync, historical backfill, Drive/Gmail/Missive attachments, meeting-video review, and supervised extraction as one coherent runtime slice.

Not next inside `BACKLOG-SCRUM-MASTER-GROOMING-001`:

- Do not start `FOUNDATION-SURFACE-UPDATES-001`.
- Do not start another under-3K split.
- Do not touch Harlan, Fal, voice, Canva, hub feature work, connector feature work, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets.

## Guardrail

Any future queue handoff must use one of these forms:

- `Live backlog card: <live backlog card id>`
- `Former queue label: <old queue label> -> <live backlog card id>`

The focused proof for `BACKLOG-QUEUE-RECONCILE-001` fails if a queue doc presents a handoff-only label as a card or references a missing live card without an explicit alias to a live backlog card.
