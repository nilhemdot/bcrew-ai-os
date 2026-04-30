# DAILY-EXEC-SUMMARY-001 Approved Plan

Approval score: 9.8/10  
Approved by: Steve  
Approved at: 2026-04-30T17:04:30Z  
Closeout key: `daily-exec-summary-v1`

## Goal

Create the daily executive summary layer: "On this date, here is where we started, what changed, what shipped, what remains, what we learned, and what is next."

## Scope

- Primary route: `/foundation#daily-summary`.
- New additive API: `/api/foundation/daily-summary?date=YYYY-MM-DD&days=7`.
- Use source-backed inputs only:
  - Recent Builds / build log
  - comprehensive changelog
  - current plan/current state
  - live backlog status
  - action review and research disposition summaries where already available
  - verifier/gate results where recorded in closeouts or ship proof
- Summaries are date-scoped and evidence-backed.
- Show shipped cards, major changes, open risks, lessons, and next build.
- Distinguish shipped today, still open, needs review, and next build.
- Support today and recent prior days when evidence exists.

## Hard Constraints

- Owns only `DAILY-EXEC-SUMMARY-001`.
- No generated narrative without evidence.
- Every summary section must carry evidence refs.
- No private/local file content copied.
- Existing `/api/foundation/build-log`, `/api/foundation/change-log`, and `/api/foundation/changes` must remain compatible.
- Do not build source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus work, research cleanup, Action Review applying, or a new feature lane.

## Date Behavior

- Default date is today in `America/Toronto`.
- `date=YYYY-MM-DD` selects one local calendar day.
- `days=7` returns the selected day plus recent prior days where evidence exists.
- Future dates fail closed or return an explicit no-evidence state.
- If no evidence exists for a date, the API/UI says no source-backed evidence was found; it must not invent a summary.

## Required Summary Sections

Each selected day must expose:

- where we started
- what changed
- what shipped
- what remains
- what we learned
- what is next
- proof/evidence refs

Every section must include evidence refs such as `commit:<sha>`, `closeout:<key>`, `card:<id>`, `proof:<command>`, `api:<route>`, or `doc:<path>`.

## Manual Review

Manual review for `/foundation#daily-summary` must prove desktop `1440x900` and mobile `390x844` pass for:

- selected date
- recent-day selector/list
- where we started
- what changed
- what shipped
- what remains
- what we learned
- what is next
- proof/evidence refs
- no horizontal overflow or overlapping text

## Proof Commands

- `npm run process:daily-exec-summary-check`
- `npm run process:change-log-comprehensive-check`
- `npm run process:recent-builds-billion-dollar-ui-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/daily-summary?date=2026-04-30&days=7"`
- `curl -s "http://localhost:3000/api/foundation/change-log?limit=100"`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=DAILY-EXEC-SUMMARY-001 --planApprovalRef=docs/process/approvals/DAILY-EXEC-SUMMARY-001.json --closeoutKey=daily-exec-summary-v1 --commitRef=HEAD`

## Closeout Draft

`DAILY-EXEC-SUMMARY-001` closes under `daily-exec-summary-v1` after the daily executive summary API, Foundation UI route, date-scoped evidence-backed summaries, focused process check, manual desktop/mobile review, backlog hygiene, foundation verify, live API proof, and canonical ship wrapper pass.

Closeout owns only `DAILY-EXEC-SUMMARY-001`.

Mentioned/context only: `CHANGE-LOG-COMPREHENSIVE-001`, `RECENT-BUILDS-BILLION-DOLLAR-UI-001`, and `SOURCE-LIFECYCLE-EXPANSION-001`.

Review-next: stop for review. Next expected card is `SOURCE-LIFECYCLE-EXPANSION-001`, unless Steve changes the order.
