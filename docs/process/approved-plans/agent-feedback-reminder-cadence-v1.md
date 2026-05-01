# Approved Plan: AGENT-FEEDBACK-REMINDER-CADENCE-001

Closeout key: `agent-feedback-reminder-cadence-v1`

Score: 9.8 approved by Steve.

## Scope

Build reminder cadence readiness only for Agent Onboarding Feedback.

Reminder schedule:

- Day 1 after successful initial request
- Day 3 after successful initial request
- Day 7 after successful initial request
- Day 10 after successful initial request
- Day 14 after successful initial request
- Day 17 after successful initial request

Reminder cap:

- 6 reminders, or
- 30 days after initial request,
- whichever comes first.

## Hard Boundaries

- Do not send reminders live.
- Do not send Georgia.
- Do not send Steve test.
- Do not enable production auto-send.
- Do not write ClickUp Requested.
- Do not build broad onboarding redesign.
- Do not build Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or a new feature lane.

## Eligibility Rules

- No reminder before a successful initial request exists in `agent_onboarding_feedback_send_attempts` with status `clickup_requested`.
- No reminder if feedback is completed.
- No reminder if ClickUp status is Completed, Skipped, or Blocked.
- No reminder if max reminder cap is reached.
- No duplicate reminders for the same task, milestone, and cadence slot.
- If Gmail succeeds but ledger/writeback proof fails in a future live path, record repair state and do not resend blindly.

## Recipient And Privacy Rules

Reminder readiness uses the same recipient source rules as the approved send path:

- internal/team recipient -> Company Email
- external agent recipient -> Personal Email
- internal oversight BCC roles -> Steve, Carson, Ryan, Georgia
- dedupe BCC if recipient is also an oversight recipient

Tracked proof is metadata only:

- roles and hashes only
- no raw email addresses
- no private token URLs
- no feedback content

The reminder email template uses the same private feedback link flow, but this build does not send live Gmail and does not log the token URL.

## Runtime/Ops Visibility

Runtime Health and Ops must expose:

- pending reminders
- sent reminders
- blocked reminders
- skipped reminders
- maxed-out reminders
- repair states
- warning counts
- next reminder due dates

## Proof

Required proof:

- synthetic reminder schedule proof
- synthetic completed/skipped/blocked stop proof
- duplicate reminder protection proof
- dry-run reminder report
- metadata-only proof
- process/verifier coverage
- closeout owns only `AGENT-FEEDBACK-REMINDER-CADENCE-001`

Proof commands:

- `npm run agent-feedback:reminders -- --mode=dry-run`
- `npm run process:agent-feedback-reminder-cadence-check`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-feedback-auto-send-check`
- `npm run process:agent-feedback-response-notify-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- live `/api/foundation-hub`
- live `/api/ops-hub`
- live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-REMINDER-CADENCE-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-REMINDER-CADENCE-001.json --closeoutKey=agent-feedback-reminder-cadence-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-FEEDBACK-REMINDER-CADENCE-001` is done for readiness under `agent-feedback-reminder-cadence-v1`. Agent Onboarding Feedback now has dry-run reminder cadence readiness for day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial request, capped at 6 reminders or 30 days. No reminder can run before a successful initial Requested send exists. Reminders stop on completed/skipped/blocked status, protect duplicate task/milestone/slot sends through `agent_onboarding_feedback_reminder_attempts`, and surface pending/sent/skipped/blocked/maxed-out/repair counts plus next-due dates in Runtime Health and Ops. No live reminder, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, or Gmail send happened. Tracked proof is roles/hashes only and does not expose raw emails, token URLs, or feedback content. Closeout owns only `AGENT-FEEDBACK-REMINDER-CADENCE-001`. Stop for review; next expected step is Steve full-loop test planning.
