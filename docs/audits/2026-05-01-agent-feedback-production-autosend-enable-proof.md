# Agent Feedback Production Auto-Send Enable Proof

Date: 2026-05-01
Card: `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`
Closeout: `agent-feedback-production-autosend-enable-v1`

## Result

The production auto-send is live for governed Agent Onboarding Feedback 30/60/90 initial requests.

Live guard:

- Runtime toggle: enabled.
- Approval source: `docs/process/approvals/agent-feedback-auto-send-live-approval.json`.
- Approval mode: `production-all`.
- Separate production card approval: present.
- Decision: `live_send_allowed`.
- Max sends per run: 25 by default, with controlled proof run capped at 5.
- Send schedule: 8:30 AM America/Toronto.
- Send window: 8:30-10:00 AM America/Toronto.
- Outside-window behavior: fail closed before Gmail or ClickUp side effects.

## Controlled Production Run

Command:

```sh
npm run agent-feedback:auto-send -- --mode=live --maxSends=5 --includeCandidates=false
```

Controlled production run ID: `agent-feedback-production-autosend-20260502012308`.

Persisted send ledger proof:

- Production send attempts created: 2.
- ClickUp Requested writebacks completed: 2.
- Repair/pending sent state: 0.
- Failed attempts: 0.
- Gmail succeeded before ClickUp Requested for each successful send.
- Broad proof is metadata-only: no raw emails, private token URLs, raw tokens, or feedback content.

Controlled recipients by milestone:

- Georgia Huntley, Day 30.
- Chris Chopite, Day 30.

## Duplicate-Send Probe

Command:

```sh
npm run agent-feedback:auto-send -- --mode=live --maxSends=5 --includeCandidates=false
```

Duplicate probe run ID: `agent-feedback-production-autosend-20260502012610`.

Result:

- New production send attempts: 0.
- Existing active attempts remained: 2.
- Duplicate blockers observed for already-requested milestones: `already_requested`, `duplicate_send_attempt_exists`.
- `attemptedSend` was false for already-requested duplicate candidates.

## Runtime/Ops Run

Command:

```sh
npm run foundation:job -- --job=agent-feedback-auto-send-readiness --force=true --actor=codex-production-autosend-proof-compact
```

Foundation job run: `job-agent-feedback-auto-send-readiness-20260502012845-qboaqn`.

Latest Runtime/Ops counts:

- Enabled state: enabled.
- Send window visible: 8:30-10:00 AM America/Toronto.
- Last run status: succeeded.
- Would send: 0.
- Sent/requested: 2.
- Skipped: 7.
- Blocked: 141.
- Warnings: 33.
- Repair: 0.
- Total candidates inspected: 150.

The latest forced Runtime/Ops run created no new production send attempts; the `sent/requested` count reflects the two already requested production sends.

## Outside-Window Guard

Post-run repair:

- The production job schedule is anchored to 8:30 AM America/Toronto.
- The live sender now checks the 8:30-10:00 AM America/Toronto send window before Gmail.
- Manual or forced live runs outside that window fail closed with `outside_approved_send_window`.
- The fail-closed path does not send Gmail, does not write ClickUp Requested, and does not create a new production send attempt.

Outside-window proof run:

- Command: `npm run agent-feedback:auto-send -- --mode=live --includeCandidates=false`.
- Run ID: `agent-feedback-production-autosend-20260502015806`.
- Local time at run: 21:58 America/Toronto.
- Result: `production-live-fail-closed`.
- Fail-closed reason: `outside_approved_send_window`.
- New production send attempts from that run: 0.
- Production send attempt ledger total stayed at 2, both `clickup_requested`.

## Reminders

Live reminders remain report-only. Reason: reminders are follow-up sends, not initial 30/60/90 requests, and need a separate explicit approval before Gmail reminder sends can run.

Reminder readiness still stops after completion through the existing response/reminder guard checks.

## Privacy

This proof is metadata-only. It intentionally excludes raw email addresses, private feedback token URLs, raw tokens, Gmail message IDs, Gmail thread IDs, and submitted feedback content.

## Closeout Scope

Closeout owns only `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`.
