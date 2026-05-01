# Agent Feedback Auto-Send Readiness Proof

Card: `AGENT-FEEDBACK-AUTO-SEND-001`
Closeout key: `agent-feedback-auto-send-v1`
Mode: dry-run/report-only

## Readiness Scope

- Scanner: ClickUp Agent Roster, 30/60/90 milestones.
- Default mode: dry-run/report-only.
- Live-send controls: `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true` plus approved mode/allowlist artifact.
- Production-all: requires separate approval artifact.
- Runtime surfaces: Runtime Health and Ops.

## Georgia Day-30 Dry-Run

- Target label: Georgia.
- Milestone: day 30.
- Expected action: `would_send`.
- Recipient source: `company_email`.
- Recipient field proof: field name/hash and present/valid booleans only.
- BCC/internal oversight roles: Steve, Carson, Ryan, Georgia.
- Georgia dedupe: required when Georgia is also To.
- Contract Link: warning metadata only.
- Gmail sent: no.
- ClickUp Requested written: no.

## Two-Key Guard Proof

- Default dry-run/report-only cannot send.
- Runtime toggle alone cannot send.
- Approved allowlist alone cannot send.
- Toggle plus approved test-only allowlist is required before a test-only live send can be permitted.
- Production-all cannot send without a separate approval artifact.
- No broad automatic send happens in this build.

## Runtime Counts

Runtime Health/Ops must expose these counters:

- `wouldSend`
- `sent`
- `skipped`
- `blocked`
- `warning`
- `repair`

## Sequencing And Repair

- Gmail must succeed before ClickUp Requested writeback.
- Duplicate-send ledger key remains `clickup_task_id + milestone_day`.
- Protected statuses remain `sending`, `sent`, and `clickup_requested`.
- If Gmail succeeds but ClickUp Requested writeback fails, the attempt stays in `sent` repair state with `resendAllowed: false`.

## Privacy Boundary

Allowed proof:

- source IDs
- task ID hashes
- agent name hashes
- field names and field-name hashes
- present/valid booleans
- role names
- status/blocker/warning keys
- run counts
- approval-mode decisions

Not allowed:

- raw email addresses
- private feedback token URLs
- feedback content
- raw ClickUp personal fields
- broad API JSON with private recipient data

Manual artifact check: this file is metadata-only and intentionally contains no raw email addresses, token URLs, or feedback content.
