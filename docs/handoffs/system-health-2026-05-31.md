# System Health - 2026-05-31

Status: risk

Foundation has red workflow/system-health findings that block green. Do not treat classified rows as fixed.

## Summary

- Unclassified risk findings: 0
- Unclassified watch findings: 0
- Blocking classified risk/watch rows: 2/1
- Raw risk/watch before classification: 2/3
- Classified risk/watch rows: 2/2
- Scheduled job red: 2
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
| red | Admin Deal Backlog Inspection | none | no | Admin Deal Backlog Inspection latest run is failed. |
| red | Conditional Deal Forecast Sync | none | no | Conditional Deal Forecast Sync latest run is failed. |

## Audit Fleet

- Status: healthy
- Job: nightly-audit-fleet at 03:05 America/Toronto
- Lanes: 8
- Hardcoded truth lane: present

## Findings

- P1 Admin Deal Backlog Inspection is risk: Admin Deal Backlog Inspection latest run is failed. Next: invalid_grant: No valid verifier for issuer: crewbert-delegation@crewbert.iam.gserviceaccount.com Classified: approval_bound_operational_write_lane; owner: Steve; repair: ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001; threshold: Blocks sprint if rerun outside the Admin Deal policy/source contract, if required for the active card, or if it remains failed after an approved safe rerun.
- P1 Conditional Deal Forecast Sync is risk: Conditional Deal Forecast Sync latest run is failed. Next:     at async googleFetch (file:///Users/bensoncrew/bcrew-ai-os/lib/google-delegated.js:280:25)
    at async googleJsonFetch (file:///Users/bensoncrew/bcrew-ai-os/lib/google-delegated.js:317:20)
    at async readGoogleSheetsCachedJson (file:///Users/bensoncrew/bcrew-ai-os/lib/google-sheets-cache.js:246:13) Classified: approval_bound_business_source_read_lane; owner: Steve; repair: ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001; threshold: Blocks green while the job remains failed and unrerouted; blocks any Sales/Ops/business-source card that depends on conditional deal forecast freshness until an approved read-only preflight or credential repair succeeds.
- P1 One or more connectors are degraded: ClickUp, Follow Up Boss, Google Workspace Next: Use source-health details before changing hub behavior. Classified: watch_threshold; owner: Foundation Process; repair: CONNECTOR-UPTIME-MONITOR-001; threshold: Blocks the sprint if any connector is down, blocked without owner, or required for the active card and still degraded after a safe preflight.
- P1 Foundation jobs have recent failures: admin-deal-backlog-review, conditional-deal-review-readonly Next: Review latest run error before treating the system as green. Classified: job_ledger_routed; owner: Foundation Process; repair: FOUNDATION-VERIFY-HEALTH-REPAIR-001; threshold: Becomes sprint-blocking when an unclassified repeated job failure appears, or when an approved safe rerun fails again without a live repair card.

## Posture

- Report only: true
- Auto-fixes: false
- Backlog mutation: false
- Source-system mutation: false
