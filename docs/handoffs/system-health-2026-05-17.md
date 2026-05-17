# System Health - 2026-05-17

Status: risk

Foundation has red system-health findings. Do not treat every surface as green.

## Summary

- Risk findings: 2
- Watch findings: 3
- Scheduled job red: 2
- Scheduled job yellow: 1
- Connector down/degraded/blocked: 0/1/0
- Endpoint risk/review: 0/0
- Doc/report bloat risk/review: 0/1
- Source contracts: 39

## Red / Yellow Scheduled Jobs

| Status | Job | Last success | Due | Detail |
| --- | --- | --- | --- | --- |
| red | System Health Nightly Audit | none | no | System Health Nightly Audit latest run is running. |
| red | Meeting Transcript Extraction Backlog | none | no | Meeting Transcript Extraction Backlog latest run is failed. |
| yellow | Agent Onboarding / Roster Inspection | 2026-05-17T01:14:20.501Z | yes | Agent Onboarding / Roster Inspection is due now and still inside the grace window. |

## Findings

- P0 System Health Nightly Audit is risk: System Health Nightly Audit latest run is running. Next: Open the job run and fix the failure before trusting this surface.
- P1 Meeting Transcript Extraction Backlog is risk: Meeting Transcript Extraction Backlog latest run is failed. Next: Marked failed by stale active-run reaper.
- P1 Agent Onboarding / Roster Inspection is watch: Agent Onboarding / Roster Inspection is due now and still inside the grace window. Next: Let the worker pick it up or run it manually if the worker is stopped.
- P1 One or more connectors are degraded: Google Workspace Next: Use source-health details before changing hub behavior.
- P1 Foundation jobs have recent failures: meeting-transcripts-extract-backlog Next: Review latest run error before treating the system as green.
- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 26339 line(s); budget is 20000/35000 warn/risk. Next: Archive cold detail or replace repeated large reports with monthly summaries.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
