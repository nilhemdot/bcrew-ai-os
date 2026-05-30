# Missing-Card Capture Audit - 2026-05-02

Purpose: capture Foundation work that was discussed in specs, audits, handoffs, source notes, memory, or sprint planning but was not clearly owned by a live backlog card.

Boundary: this audit creates/updates backlog truth only. It is not approval to implement the cards out of order.

## Trigger

After `SECURITY-002` shipped, Steve asked whether the meeting-note privacy system also removed access to raw Google meeting notes. The answer was no: `SECURITY-002` protects AIOS responses, but it does not change original Google Drive file permissions.

That exposed a broader drift risk: important work had been discussed in long chats and specs but not always promoted into backlog cards.

## Newly Captured Cards

- `MEETING-VAULT-ACL-001` - owner-preserving raw Google Drive meeting-note ACL enforcement.
- `SECURITY-FILTERED-COMMS-ACCESS-001` - real-data filtered shared-comms/intelligence summaries for approved non-Tier-1 users.
- `SECURITY-EDGE-001` - edge auth/tunnel hardening before broader external exposure.
- `SECURITY-PROVIDER-ROTATION-PROOF-001` - provider-side proof for exposed or retired credentials.
- `DRIVE-ACCESS-REQUEST-001` - delegated Drive access-request and ACL repair preflight.
- `FOUNDATION-DONE-TEST-001` - explicit Foundation readiness exit gate.
- `SYSTEM-010-GHOST-CLOSEOUT-001` - dead-man, autorestart, kill/decommission, active-process, and cost-control closeout.
- `SOURCE-LIFECYCLE-COMPLETION-001` - source lifecycle completion/revalidation gate.
- `EXTRACT-RUN-HARDENING-001` - extraction run ID, retry/backoff, partial failure, stale lease, cursor, and bounded backfill hardening.
- `SYNTHESIS-VERIFY-001` - evidence verification gate for synthesized claims before Strategy or scout consumption.
- `MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001` - future meeting transcript capture and gap handling.
- `PROCESS-ACK-STATES-001` - governed acknowledged-state handling for accepted gaps and pauses.
- `VERIFIER-INCREMENTAL-COVERAGE-001` - incremental/card-scoped verifier path.

## Merged Or Already Covered

- Foundation command-center work stays under `FOUNDATION-SURFACE-UPDATES-001` and `RUNTIME-HEALTH-SIMPLIFY-001`.
- Broad runtime doctrine stays under `SYSTEM-010`, with `SYSTEM-010-GHOST-CLOSEOUT-001` now capturing the remaining proof split.
- Existing extraction cards stay valid, but `EXTRACT-RUN-HARDENING-001` must reconcile and sequence them before implementation.
- Existing meeting source work under `SOURCE-018` stays valid for meeting-note readability and archive state. It does not own raw Drive ACL stripping.
- Existing `SECURITY-002` stays closed for app-side v1. It does not own raw vault moves, public edge exposure, or real-data filtered summary access.

## Parked Findings

These came up in the scout pass but were not promoted as immediate P0 Foundation gates in this capture because they either overlap existing cards or are downstream hub/source work:

- `EMAIL-TEAM-DELEGATION-001`
- `SLACK-CHANNEL-ROLLOUT-001`
- `CLICKUP-ROSTER-FIELD-CLEANUP-001`
- `SOURCE-REVIEWS-ASI-001`
- `STRATEGY-ROUTE-RESOLUTION-001`
- `STRATEGY-METRIC-READERS-001`
- `SALES-GLS-IMPACT-SNAPSHOTS-001`
- `MEETING-SCOUT-001`

If any parked item becomes sprint-critical, promote it through a normal 9.8 plan instead of building from this audit note.

## Updated Sprint Meaning

SECURITY-002 is done. The next sprint is still Foundation-first.

Recommended order after this capture:

1. Review and accept the missing-card capture.
2. Pull `FOUNDATION-DONE-TEST-001` to define the exit gate.
3. Pull the next Foundation gate from the accepted order, likely `SYSTEM-010-GHOST-CLOSEOUT-001` or `MEETING-VAULT-ACL-001` depending Steve's risk call.
4. Keep Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus expansion, and UI polish frozen unless Steve explicitly overrides the plan.

