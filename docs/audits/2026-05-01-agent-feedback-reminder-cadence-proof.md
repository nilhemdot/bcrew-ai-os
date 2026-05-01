# Agent Feedback Reminder Cadence Proof

Card: `AGENT-FEEDBACK-REMINDER-CADENCE-001`

Closeout key: `agent-feedback-reminder-cadence-v1`

## Result

Reminder cadence readiness is built as dry-run/report-only.

No live reminder, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, or Gmail send is executed by this build.

## Cadence

- Day 1 after successful initial request
- Day 3 after successful initial request
- Day 7 after successful initial request
- Day 10 after successful initial request
- Day 14 after successful initial request
- Day 17 after successful initial request

Cap: 6 reminders or 30 days after initial request, whichever comes first.

## Synthetic Proof

Covered cases:

- successful initial Requested send creates pending reminder slots
- no successful initial request blocks reminder
- completed feedback stops reminder
- ClickUp Skipped status stops reminder
- ClickUp Blocked status stops reminder
- duplicate slot is protected by `clickup_task_id + milestone_day + reminder_slot_key`
- max cap stops further reminders
- initial Gmail success / ClickUp Requested repair state does not resend blindly

## Runtime/Ops Counts

The readiness surface exposes:

- pending reminders
- sent reminders
- blocked reminders
- skipped reminders
- maxed-out reminders
- repair states
- warning counts
- next reminder due dates

## Privacy

Tracked proof is metadata-only:

- roles/hashes only
- no raw email addresses
- no private token URLs
- no feedback content

The reminder template uses the same private feedback link flow. Token URL logging remains false.

## Commands

- `npm run agent-feedback:reminders -- --mode=dry-run`
- `npm run process:agent-feedback-reminder-cadence-check`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-feedback-auto-send-check`
- `npm run process:agent-feedback-response-notify-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-REMINDER-CADENCE-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-REMINDER-CADENCE-001.json --closeoutKey=agent-feedback-reminder-cadence-v1 --commitRef=HEAD`

## Closeout Ownership

The closeout owns only `AGENT-FEEDBACK-REMINDER-CADENCE-001`.

Context cards remain context only:

- `AGENT-FEEDBACK-SEND-001`
- `AGENT-FEEDBACK-AUTO-SEND-001`
- `AGENT-FEEDBACK-RESPONSE-NOTIFY-001`
- `AGENT-FEEDBACK-GEORGIA-SEND-001`
- `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`
