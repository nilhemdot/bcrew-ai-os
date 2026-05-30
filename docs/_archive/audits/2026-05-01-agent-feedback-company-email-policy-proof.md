# Agent Feedback Company Email Policy Proof

Card: `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001`

Closeout key: `agent-feedback-company-email-policy-v1`

Date: 2026-05-01

## Scope

This proof is metadata-only. It does not include raw email addresses, private feedback token URLs, or feedback content.

## Dry-Run Proof

Steve Zahnd Day-30:

- mode: dry-run
- expected action: would send when live approval exists
- recipientSource: company_email
- recipient field: Company Email
- eligibility: eligible
- BCC oversight roles: Steve, Carson, Ryan, Georgia
- To-recipient dedupe: Steve
- Contract Link: warning-only
- Gmail sent: no
- ClickUp Requested written: no

Georgia Day-30:

- mode: dry-run
- checked as policy regression proof only
- not the live test target
- recipientSource: company_email
- recipient field: Company Email
- eligibility: eligible
- Contract Link: warning-only
- Gmail sent: no
- ClickUp Requested written: no

Synthetic external agent:

- mode: synthetic metadata-only proof
- recipientSource: company_email
- recipient field: Company Email
- eligibility: eligible
- Personal Email blockers: none
- Gmail sent: no
- ClickUp Requested written: no

## Policy Assertions

- Request sends use Company Email only.
- Test sends use Company Email only.
- Auto-send candidates use Company Email only.
- Reminder candidates use Company Email only.
- Personal Email is not used for Agent Feedback send eligibility.
- Legacy Personal Email blockers are not allowed Agent Feedback blockers.
- Contract Link remains warning-only.
- Approval validator supports any approved target, not Georgia only.
- Test allowlist supports any named target.
- Auto-send allowlist supports named targets and production-all separately.
- BCC oversight remains Steve, Carson, Ryan, Georgia with To-recipient dedupe.
- Response notification remains active.

## Side Effects

- Gmail sent: no
- ClickUp Requested written: no
- Production auto-send enabled: no
- Georgia live test: no

## Required Commands

- `npm run agent-feedback:test-email -- --mode=dry-run --targetName="Steve Zahnd" --milestoneDay=30`
- `npm run agent-feedback:test-email -- --mode=dry-run --targetName=Georgia --milestoneDay=30`
- `npm run process:agent-feedback-company-email-policy-check`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-feedback-auto-send-check`
- `npm run process:agent-feedback-reminder-cadence-check`
- `npm run process:agent-feedback-response-notify-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
