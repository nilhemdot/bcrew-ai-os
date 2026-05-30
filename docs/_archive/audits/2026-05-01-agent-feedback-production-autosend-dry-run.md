# Agent Feedback Production Auto-Send Dry-Run

Card: `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`
Stage: `stage-1-production-dry-run-report`
Closeout key: `agent-feedback-production-autosend-dry-run-v1`
Mode: production dry-run report only

## Scope

Stage 1 scans the full ClickUp Agent Roster across day 30, day 60, and day 90 onboarding feedback milestones. The report uses current production rules:

- Real Start Date plus milestone day.
- Company Email only.
- Contract Link is warning-only.
- Current ClickUp Onboarding NPS 30/60/90 Status.
- Send window.
- Duplicate-send ledger.
- Response and reminder state.

## Candidate Metadata

Each candidate row is metadata-only and includes:

- agent name
- milestone
- due date/window
- ClickUp NPS status
- Company Email present/valid boolean
- Contract Link warning
- duplicate ledger state
- response/reminder state
- classification
- blocker/warning keys

Allowed classifications:

- `would_send`
- `already_requested`
- `completed`
- `outside_window`
- `blocked`
- `skipped`
- `warning`

`warning` is still reviewable as potentially sendable because Contract Link is warning-only.

## Hard No

- No Gmail sends.
- No ClickUp Requested writeback.
- No env toggle.
- No production approval artifact.
- No Georgia special send.
- No roster sends.
- No production enablement.

## Proof Commands

- `npm run agent-feedback:production-dry-run`
- `npm run process:agent-feedback-production-autosend-dry-run-check`
- `npm run process:agent-feedback-real-user-submit-repair-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- live `/api/foundation/agent-feedback-production-dry-run?includeCandidates=false`
- live `/api/ops/agent-feedback-production-dry-run?includeCandidates=false`

## Stage Result

Dry-run command run: `npm run agent-feedback:production-dry-run -- --forceRefresh=true`

Generated at: `2026-05-01T16:15:01.477Z`

Roster tasks inspected: `50`

Milestone candidates inspected: `150`

Classification counts:

- `would_send`: 1
- `warning`: 1
- `already_requested`: 0
- `completed`: 1
- `outside_window`: 6
- `blocked`: 141
- `skipped`: 0

Sendable if production were enabled:

- Georgia Huntley, day 30, classification `warning`, warning key `missing_contract_link`
- Chris Chopite, day 30, classification `would_send`, warning keys none

Production auto-send remains disabled and `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` remains scoped/stage-complete only, not fully done.

Steve reviews the would-send list before any production enablement.

This file intentionally contains no raw email addresses, private feedback token URLs, or feedback content.
