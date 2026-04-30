# CHANGE-LOG-COMPREHENSIVE-001 Approved Plan

Approval score: 9.8/10  
Approved by: Steve  
Approved at: 2026-04-30T16:31:16Z  
Closeout key: `change-log-comprehensive-v1`

## Goal

Create the comprehensive Foundation changelog layer so system changes are visible by changed surface and type, not only as shipped-build closeouts in Recent Work.

## Scope

- Primary route: `/foundation#system-activity`.
- New additive API: `/api/foundation/change-log?limit=100`.
- Preserve `/api/foundation/changes` backward-compatible shape.
- Use existing source-backed evidence: build-log closeouts, git changed-file evidence, and DB `change_events`.
- Backfill only from real evidence. Do not invent fake history.
- Keep Recent Work as the shipped-build review surface.

## Required Change Types

The changelog must classify meaningful Foundation changes into:

- backlog/card changes
- build closeouts
- docs/current-plan/current-state updates
- system inventory changes
- source contract/config changes
- verifier/gate/process changes
- UI/operator surface changes
- runtime/status/job changes
- backlog/action/review/decision changes
- extraction/intelligence changes

## Hard Gates

`npm run process:change-log-comprehensive-check` must prove:

- 40+ changelog entries total, or all available evidence if fewer exists.
- 20+ verified closeout-backed entries.
- entries from at least 8 of the 10 required change types, unless a type has no real evidence.
- latest 5 Recent Builds represented.
- latest `CHANGE-LOG-COMPREHENSIVE-001` closeout represented after ship.
- zero ownership/context smearing.
- no silent missing categories.
- `/api/foundation/changes keeps its existing shape`.
- `/api/foundation/change-log` is additive only.
- no private/local file content copied into changelog entries.

If a required type is absent, the check must show why:

- no matching closeout
- no matching `change_event`
- no matching changed-file evidence

## UI Acceptance

Manual review for `/foundation#system-activity` must prove:

- recent highlights visible
- by-surface grouping visible
- by-type grouping visible
- raw evidence feed visible
- evidence refs inspectable
- ownership/context separation visible
- desktop 1440x900 pass with no horizontal overflow or overlapping text
- mobile 390x844 pass with no horizontal overflow or overlapping text

## Privacy Boundary

Private/local docs may appear only as metadata/classification if already allowed. The changelog must not copy, quote, summarize, or expose private/local file content.

## Not In Scope

- No Daily Exec Summary.
- No source lifecycle expansion.
- No Strategy, Scoper, Agent Factory, corpus work, research cleanup, or new feature lane.
- No broad Recent Work redesign beyond linking/context if needed.

## Proof Commands

- `npm run process:change-log-comprehensive-check`
- `npm run process:recent-builds-billion-dollar-ui-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/change-log?limit=100"`
- `curl -s "http://localhost:3000/api/foundation/changes?limit=20"`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=CHANGE-LOG-COMPREHENSIVE-001 --planApprovalRef=docs/process/approvals/CHANGE-LOG-COMPREHENSIVE-001.json --closeoutKey=change-log-comprehensive-v1 --commitRef=HEAD`

## Closeout Draft

`CHANGE-LOG-COMPREHENSIVE-001` closes under `change-log-comprehensive-v1` after the API, System Activity UI, focused process check, manual review artifact, backlog hygiene, foundation verify, live API proof, and canonical ship wrapper pass.

Closeout owns only `CHANGE-LOG-COMPREHENSIVE-001`.

Review-next: stop for review. Next expected card is `DAILY-EXEC-SUMMARY-001`, unless Steve changes the order.
