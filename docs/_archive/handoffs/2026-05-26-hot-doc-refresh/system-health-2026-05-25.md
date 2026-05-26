# System Health - 2026-05-25

Status: risk

Foundation has red workflow/system-health findings that block green. Do not treat classified rows as fixed.

## Summary

- Unclassified risk findings: 2
- Unclassified watch findings: 1
- Raw risk/watch before classification: 2/3
- Classified risk/watch rows: 0/3
- Scheduled job red: 2
- Scheduled job yellow: 0
- Connector down/degraded/blocked: 0/0/0
- Endpoint risk/review: 0/0
- Doc/report bloat risk/review: 0/2
- File-size risk/watch: 0/0
- Build-lane repeated failures red/yellow: 0/0
- Source contracts: 43

## Red / Yellow Scheduled Jobs

| Status | Job | Last success | Due | Detail |
| --- | --- | --- | --- | --- |
| red | Foundation Lessons Learned Loop | none | no | Foundation Lessons Learned Loop latest run is failed. |
| red | Foundation Verifier | none | no | Foundation Verifier latest run is failed. |

## Findings

- P0 Foundation Lessons Learned Loop is risk: Foundation Lessons Learned Loop latest run is failed. Next: Exited with code 1
- P0 Foundation Verifier is risk: Foundation Verifier latest run is failed. Next: FAIL RUNTIME-SUPERVISOR-001 exposes dashboard/worker service supervision without claiming auto-restart -> lane=done dogfood=pass serviceStatus=risk services=2
FAIL VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 extracts runtime reliability verifier checks into a focused module -> lane=done dogfood=pass reliabilityChecks=25/26 lines=15623->4998
FAIL VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 moves runtime reliability orchestration into the focused module -> lane=done dogfood=pass reliabilityChecks=25/26 lines=6388->4998
- P1 Foundation jobs have recent failures: foundation-verify, foundation-lessons-learned-loop Next: Review latest run error before treating the system as green. Classified: job_ledger_routed; owner: Foundation Process; repair: EXTRACT-CURRENT-001; threshold: Becomes sprint-blocking when an unclassified repeated job failure appears, or when an approved safe rerun fails again without a live repair card.
- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 26171 line(s); budget is 20000/35000 warn/risk. Next: Archive cold detail or replace repeated large reports with monthly summaries. Classified: routed_to_next_card; owner: Foundation Process; repair: FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001; threshold: Blocks source/extraction activation if the hot-doc row stays over budget after FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.
- P1 docs/handoffs is accumulating too many hot files: docs/handoffs has 234 file(s) modified in the last 31 days; budget is 220/320. Next: Roll old handoffs into a monthly closeout summary and keep only current working handoffs hot. Classified: routed_to_next_card; owner: Foundation Process; repair: FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001; threshold: Blocks source/extraction activation if the hot-doc row stays over budget after FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
