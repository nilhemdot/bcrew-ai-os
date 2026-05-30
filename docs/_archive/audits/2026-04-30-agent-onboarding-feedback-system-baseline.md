# Agent Onboarding Feedback System Baseline

Baseline source: 1460190

Card: `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`

Closeout key: `agent-onboarding-feedback-system-v1`

## Baseline Counts

- Grouped systems before: 12
- Existing grouped systems preserved target: 12
- Grouped systems after target: 13
- Agent Onboarding empty before build: yes
- `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`: scoped
- `AGENT-FEEDBACK-SEND-001`: scoped
- FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001: missing

## Empty Service Groups Before Build

- Recruiting
- Marketing - Clients
- Agent Onboarding
- Client Onboarding
- Closing / Deals
- Finance
- People / Retention

## Source-Backed System Evidence

- Source of truth: ClickUp Agent Roster
- Runtime/Ops proof: `agent-roster-review`
- Review queue proof: `/api/owners/review-queue`
- Current form: `/agent-feedback` private token link
- Current response table: `agent_onboarding_feedback_responses`
- Current writeback after approved feedback submission: Onboarding NPS 30/60/90 Status, Score, Feedback fields
- Production send path: not built
- ClickUp Requested writeback from send: not built

## Known Test Cases

- Georgia metadata proof: due, day 30, due date 2026-04-28, safe task/source ID class present
- Chris metadata proof: no due item surfaced

## Privacy

- No private feedback tokens, feedback content, or personal email addresses recorded.
- The Georgia/Chris baseline uses metadata only: due/not due, milestone, due date, and safe task/source ID class.
