# AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 Approved Plan

Approval score: 9.8
Closeout key: `agent-feedback-production-autosend-enable-v1`
Owned card: `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`

## Goal

Enable governed production auto-send for Agent Onboarding Feedback 30/60/90 requests.

## Scope

- Use ClickUp Agent Roster as source truth.
- Send only eligible 30/60/90 onboarding feedback requests inside the send window.
- Use ClickUp Company Email only.
- BCC Steve, Carson, Ryan, and Georgia.
- Deduplicate To/BCC recipients.
- Write ClickUp Requested only after Gmail succeeds.
- Use the send-attempt ledger to block duplicate sends.
- If Gmail succeeds and ClickUp Requested writeback fails, record repair state and do not resend.
- Show enabled state, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime/Ops.
- Mark Agent Onboarding Feedback live in Foundation Systems/source truth after enablement.
- Keep broad proof metadata-only: no raw emails, private token URLs, raw tokens, or feedback content.

## Reminder Decision

Live reminders stay report-only in this card.

Reason: this card enables initial 30/60/90 production requests. Reminder emails are follow-up sends and need their own approval before they can start contacting people repeatedly. Reminder readiness still proves stop-after-completion, duplicate slot protection, max caps, repair states, and next-due counts.

## Hard Gates

- Runtime toggle must be `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true`.
- Approved production config must be present at `docs/process/approvals/agent-feedback-auto-send-live-approval.json`.
- Production-all must reference this approved card.
- Gmail must succeed before ClickUp Requested writeback.
- A protected send-attempt ledger row blocks repeats.
- A Gmail-success/ClickUp-failure repair row remains non-resendable.

## Acceptance

- Production auto-send is live or fails closed with exact reason.
- One controlled production run proves exactly what happened.
- No duplicate sends.
- ClickUp Requested writes only after Gmail success.
- Submitted feedback path still saves to DB and writes Completed/Score/Feedback to ClickUp.
- Internal response notification still works.
- Reminder stop after completion still works.
- Runtime/Ops show enabled state, last run, next run, and counts.
- Foundation Systems/source truth shows Agent Onboarding Feedback live.
- `backlog:hygiene`, `foundation:verify`, dashboard serve, and worker serve pass.

## Not Scope

- No unrelated hub work.
- No new onboarding feature expansion.
- No Strategy, Scoper, Agent, or corpus work.
- No broad Foundation cleanup.
- No live reminder sends.

## Proof Commands

- `npm run agent-feedback:production-dry-run -- --includeCandidates=false --forceRefresh=true`
- `npm run agent-feedback:auto-send -- --mode=live --maxSends=5`
- `npm run foundation:job -- --job=agent-feedback-auto-send-readiness --force=true --actor=codex-production-autosend-proof`
- `npm run process:agent-feedback-production-autosend-enable-check`
- `npm run process:agent-feedback-real-user-submit-repair-check -- --includeDuplicateProbe`
- `npm run process:agent-feedback-response-notify-check`
- `npm run process:agent-feedback-reminder-cadence-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Closeout Draft

`AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` ships production initial feedback auto-send. It keeps reminders report-only, records metadata-only proof, and stops for Steve review before any next work.
