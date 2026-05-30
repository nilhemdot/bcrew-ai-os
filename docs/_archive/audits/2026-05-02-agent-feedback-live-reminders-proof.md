# Agent Feedback Live Reminders Proof

Card: `AGENT-FEEDBACK-LIVE-REMINDERS-001`  
Closeout: `agent-feedback-live-reminders-v1`  
Proof date: 2026-05-02

## Live State

- Live reminders enabled: yes
- Approval source: `docs/process/approvals/agent-feedback-live-reminders-approval.json`
- Send window: 8:30-10:00 AM America/Toronto
- Cadence: day 1, day 3, day 7, day 10, day 14, day 17 after initial Requested send
- Recipient rule: ClickUp Company Email only
- Internal oversight: BCC Steve, Carson, Ryan, Georgia with To/BCC dedupe
- ClickUp Requested writeback on reminders: no
- Duplicate reminder ledger: `agent_onboarding_feedback_reminder_attempts` by task + milestone + reminder slot

## Controlled Run

Command:

```bash
npm run agent-feedback:reminders -- --mode=live --includeCandidates=false
```

Result:

- Mode: `production-live-reminders`
- Status: healthy
- Send window open: yes
- Pending reminders: 0
- Sent reminders: 0
- Blocked reminders: 147
- Skipped reminders: 3
- Repair states: 0
- Next reminder due dates: `2026-05-03T00:00:00.000Z`
- Georgia Huntley Day-30: skipped, not due, next reminder `2026-05-03T00:00:00.000Z`
- Chris Chopite Day-30: skipped, not due, next reminder `2026-05-03T00:00:00.000Z`

No reminder was due in the controlled run, so no reminder email was sent.

Foundation job wrapper:

```bash
npm run foundation:job -- --job=agent-feedback-reminder-readiness --force=true --actor=codex-live-reminders-proof
```

Result:

- Job: `agent-feedback-reminder-readiness`
- Command: `npm run agent-feedback:reminders -- --mode=live --includeCandidates=false`
- Status: succeeded
- Sent reminders: 0
- Repair states: 0

## Outside-Window Guard

Outside-window fail-closed proof:

Command:

```bash
npm run agent-feedback:reminders -- --mode=live --includeCandidates=false --now=2026-05-02T02:00:00.000Z
```

Result:

- Mode: `production-live-reminders-fail-closed`
- Exit code: 1
- Fail-closed reason: `outside_approved_send_window`
- Gmail sent: 0
- ClickUp Requested writes: 0
- Reminder ledger writes: 0

## Deferred State

Dry-run/readiness command:

```bash
npm run agent-feedback:reminders -- --mode=dry-run --includeCandidates=true
```

Result:

- Live reminders enabled: yes
- Candidates inspected: 150
- Tasks inspected: 50
- Pending reminders: 0
- Sent reminders: 0
- Blocked reminders: 147
- Skipped reminders: 3
- Maxed-out reminders: 0
- Repair states: 0
- `nextReminderDueDates`: `2026-05-03T00:00:00.000Z` for Georgia Huntley Day-30 and Chris Chopite Day-30

## Duplicate Protection

- Georgia Huntley Day-30 has one protected Requested initial attempt.
- Chris Chopite Day-30 has one protected Requested initial attempt.
- Duplicate initial sends are blocked by `agent_onboarding_feedback_send_attempts`.
- Duplicate reminder slots are blocked by `agent_onboarding_feedback_reminder_attempts`.
- Current reminder attempt count after the controlled run: 0 total, 0 sent, 0 repair.

## Stop Rules

Synthetic and runtime readiness proof shows:

- No reminder before a successful initial Requested send.
- Completed feedback stops reminders.
- ClickUp `Skipped` stops reminders.
- ClickUp `Blocked` stops reminders.
- Max cap is 6 reminders or 30 days after initial Requested send.

## Privacy

No raw emails, token URLs, raw tokens, or feedback content are included in this proof. Broad proof uses roles, counts, timestamps, hashes, and state labels only.
