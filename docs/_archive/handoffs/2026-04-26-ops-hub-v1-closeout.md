# 2026-04-26 Ops Hub v1 closeout

Created: 2026-04-26 00:33 EDT

## Current state

- AIOS public URL is live at `https://bcrewaios.ngrok.app`.
- Google login is live for Benson Crew accounts.
- Ops Hub is live at `https://bcrewaios.ngrok.app/ops`.
- Repo is on `main`; latest pushed commit before this handoff was `f3c02a0 Add Ops helper field references`.
- `foundation:verify` passed `58/58` after the Ops helper field-reference update.
- Dashboard was restarted and local `/ops` is serving `ops.js?v=20260425z`.

## Email sent

Steve asked to send the Ops Hub v1 email after accidentally clearing the draft.

Sent via Gmail on 2026-04-26:

- To: Carson Campbell, Clare Manalo, Georgia Huntley
- CC: Steve Zahnd
- Subject: `AIOS Ops Hub v1 is live`
- Message ID: `19dc8106a80dd671`

The email covered:

- Ops Hub v1 login URL.
- V1 expectations and feedback loop.
- How to work cards.
- Exact Owners Dashboard, ClickUp, Conditional, and FUB field names AIOS may flag.
- Instructions not to delete/hide/reorganize ClickUp fields yet.
- AIOS Help button can answer exact-field questions such as NPS, Google review, deal data, FUB, split deal, and conditional cleanup.

## Ops Hub v1 locked tonight

- Overview page copy is simplified for normal Ops users.
- Inbox cards are readable and filterable by work lane.
- Admin deal review is one full review covering:
  - Owners deal data
  - split-deal rules
  - FUB / CRM parity
  - ClickUp Deal Data Entry follow-through
  - Internal Agent Onboarding
  - Internal Agent Deal
  - Client NPS
  - Google Review
- Conditional forecast is rebuilt from ClickUp Deal Data Entry.
- Mutual-release conditional tasks are excluded.
- Column `N` on the generated conditional sheet is the re-check action: `Review This Conditional`.
- Agent onboarding / roster review is live as an Ops lane.
- Public access is Google-login gated.
- Ops users see Ops only; Steve sees all hubs.

## Current Ops queue snapshot

At closeout:

- Total open Ops items: `19`
- Admin: `3`
- Conditional: `7`
- FUB drift: `0`
- Owners list drift: `0`
- Agent onboarding / roster: `9`

## Important design decisions

- Owners Admin package is closed for v1. Remaining historical cleanup is Ops inbox work, not a Foundation source-package blocker.
- `DATA-007`, `DATA-008`, and `DATA-009` are handled by Admin inspection / Ops cleanup findings for v1.
- Source-field fixes remain human-owned.
- Scheduled writeback only writes AI status/action/findings.
- No automatic source-field writeback until an explicit approval-gated apply lane exists.
- Ops helper is not LLM-powered yet. It is a read-only, rule-based/source-backed helper using current Ops queue data and locked field rules.

## Latest relevant commits

- `f3c02a0` Add Ops helper field references
- `dbfd702` Tighten Ops helper lane answers
- `3c9297b` Add Ops Hub helper chat
- `b239589` Close Owners Admin package for v1
- `43d0684` Add AIOS public tunnel LaunchAgent
- `a0d7925` Use Google login for AIOS access
- `99ec6c1` Add basic AIOS login gate

## Start here tomorrow

1. Check whether Carson, Clare, or Georgia replied to the v1 email.
2. Review their questions and capture confusing helper prompts as improvement examples.
3. Inspect Ops Hub as Steve:
   - `https://bcrewaios.ngrok.app/ops`
   - confirm helper answers exact-field questions cleanly.
4. Decide whether to continue Current State review after the closed Owners Admin package or pause for Ops feedback.
5. If continuing Current State, resume at the next open package after Owners Admin.

## Known follow-ups

- Build a proper feedback/question capture log for Ops helper questions.
- Eventually replace the rule-based helper with a governed LLM assistant only after privacy/security boundaries are ready.
- Add assignment and approval-gated apply/writeback lanes later, not now.
- Do a ClickUp field cleanup walkthrough manually with Carson and Clare before hiding/deleting anything.
