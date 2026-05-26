# System Health - 2026-05-24

Status: watch

Foundation has yellow workflow/system-health findings that block green until repaired or explicitly excepted in sprint truth.

## Summary

- Unclassified risk findings: 0
- Unclassified watch findings: 0
- Raw risk/watch before classification: 0/2
- Classified risk/watch rows: 0/2
- Scheduled job red: 0
- Scheduled job yellow: 0
- Connector down/degraded/blocked: 0/0/0
- Endpoint risk/review: 0/0
- Doc/report bloat risk/review: 0/2
- File-size risk/watch: 0/0
- Build-lane repeated failures red/yellow: 0/0
- Source contracts: 43

## Red / Yellow Scheduled Jobs

_None._

## Findings

- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 21363 line(s); budget is 20000/35000 warn/risk. Next: Archive cold detail or replace repeated large reports with monthly summaries. Classified: routed_to_next_card; owner: Foundation Process; repair: FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001; threshold: Blocks source/extraction activation if the hot-doc row stays over budget after FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.
- P1 docs/handoffs is accumulating too many hot files: docs/handoffs has 221 file(s) modified in the last 31 days; budget is 220/320. Next: Roll old handoffs into a monthly closeout summary and keep only current working handoffs hot. Classified: routed_to_next_card; owner: Foundation Process; repair: FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001; threshold: Blocks source/extraction activation if the hot-doc row stays over budget after FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
