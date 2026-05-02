# Agent Feedback Live Reminders V1

## Card

`AGENT-FEEDBACK-LIVE-REMINDERS-001`

## Goal

Make Agent Onboarding Feedback reminder emails live so requested-but-not-completed 30/60/90 onboarding feedback continues through the existing reminder cadence.

## Scope

- Enable governed live reminder sends for feedback that has a successful initial Requested send and no completed response.
- Use the existing cadence: day 1, day 3, day 7, day 10, day 14, and day 17 after the initial Requested timestamp.
- Use the same approved send window as production initial sends: 8:30-10:00 AM America/Toronto.
- Fail closed before Gmail, ClickUp, or reminder ledger side effects outside the approved window.
- Use ClickUp Company Email only.
- BCC Steve, Carson, Ryan, and Georgia with To/BCC dedupe.
- Stop reminders after feedback is completed or ClickUp status is Completed, Skipped, or Blocked.
- Use `agent_onboarding_feedback_reminder_attempts` as the duplicate reminder slot ledger.
- Reminder send logic does not write ClickUp Requested; ClickUp Requested remains initial-send only.
- Expose live reminder enabled state, send window, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime Health and Ops.
- Prove Georgia Huntley Day 30 and Chris Chopite Day 30 do not receive duplicate initial sends and show their next reminder state from Requested timestamps.

## Hard Boundaries

- No new onboarding features.
- No unrelated hub work.
- No Strategy, Scoper, Agent, corpus, or broad Foundation cleanup.
- Do not force an off-cadence reminder just to create proof.
- Do not expose raw email addresses, private token URLs, raw tokens, or submitted feedback content in broad proof.

## Proof

- Live reminders are enabled or fail closed with exact reason.
- A controlled production reminder run proves the current state.
- If no reminder is due, proof shows deferred next-due state.
- An outside-window live run fails closed before Gmail, ClickUp, or reminder ledger writes.
- Duplicate reminder slot protection is proven.
- Completion/skipped/blocked stops are proven.
- `backlog:hygiene`, `foundation:verify`, dashboard serve, and worker serve pass from HEAD.

## Closeout

`AGENT-FEEDBACK-LIVE-REMINDERS-001` ships live reminders only under `agent-feedback-live-reminders-v1`. Reminder sends do not write ClickUp Requested. After ship, stop for Steve review before the systems visibility pass.
