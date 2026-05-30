# System Health - 2026-05-30

Status: risk

Foundation has red workflow/system-health findings that block green. Do not treat classified rows as fixed.

## Summary

- Unclassified risk findings: 4
- Unclassified watch findings: 2
- Raw risk/watch before classification: 4/3
- Classified risk/watch rows: 1/2
- Scheduled job red: 4
- Scheduled job yellow: 0
- Audit fleet: healthy (8 lanes)
- Connector down/degraded/blocked: 0/3/0
- Endpoint risk/review: 0/0
- Doc/report bloat risk/review: 0/0
- File-size risk/watch: 0/0
- Build-lane repeated failures red/yellow: 0/0
- Source contracts: 43

## Red / Yellow Scheduled Jobs

| Status | Job | Last success | Due | Detail |
| --- | --- | --- | --- | --- |
| red | Connector Uptime Monitor | none | no | Connector Uptime Monitor latest run is failed. |
| red | Public YouTube Creator Daily Watch | none | no | Public YouTube Creator Daily Watch latest run is failed. |
| red | Admin Deal Backlog Inspection | none | no | Admin Deal Backlog Inspection latest run is failed. |
| red | Meeting Transcript Extraction Backlog | none | no | Meeting Transcript Extraction Backlog latest run is failed. |

## Audit Fleet

- Status: healthy
- Job: nightly-audit-fleet at 03:05 America/Toronto
- Lanes: 8
- Hardcoded truth lane: present

## Findings

- P0 Connector Uptime Monitor is risk: Connector Uptime Monitor latest run is failed. Next: Exited with code 1
- P0 Public YouTube Creator Daily Watch is risk: Public YouTube Creator Daily Watch latest run is failed. Next: Marked failed by stale active-run reaper.
- P1 Admin Deal Backlog Inspection is risk: Admin Deal Backlog Inspection latest run is failed. Next: Marked failed by stale active-run reaper.
- P1 Meeting Transcript Extraction Backlog is risk: Meeting Transcript Extraction Backlog latest run is failed. Next: SRC-MEETINGS-001:meeting:ops stand up 2026 05 29 08 44 edt:meeting_transcript: extraction failed -> OpenAI router fallback returned no output text. Classified: approval_bound_backfill_lane; owner: Steve; repair: EXTRACT-BACKFILL-001; threshold: Blocks sprint only if the job is rerun outside EXTRACT-BACKFILL-001 posture or remains failed after an approved safe rerun.
- P1 One or more connectors are degraded: ClickUp, Follow Up Boss, Google Workspace Next: Use source-health details before changing hub behavior. Classified: watch_threshold; owner: Foundation Process; repair: CONNECTOR-UPTIME-MONITOR-001; threshold: Blocks the sprint if any connector is down, blocked without owner, or required for the active card and still degraded after a safe preflight.
- P1 Foundation jobs have recent failures: connector-uptime-monitor, youtube-creator-daily-watch, meeting-transcripts-extract-backlog, admin-deal-backlog-review Next: Review latest run error before treating the system as green. Classified: job_ledger_routed; owner: Foundation Process; repair: EXTRACT-CURRENT-001; threshold: Becomes sprint-blocking when an unclassified repeated job failure appears, or when an approved safe rerun fails again without a live repair card.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
