# Agent Feedback Steve Full-Loop Test V1

Card: `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001`
Closeout key: `agent-feedback-steve-full-loop-test-v1`

## Scope

Run one controlled live Agent Onboarding Feedback loop for Steve Zahnd Day-30 only:

- send the request to ClickUp Company Email
- use BCC oversight roles Steve, Carson, Ryan, and Georgia, with Steve deduped from actual BCC
- write ClickUp Requested only after Gmail succeeds
- submit one controlled form response
- save the DB response
- write ClickUp Completed, Score, and Feedback
- send the internal response notification
- prove reminders stop after completion
- prove a duplicate resend is blocked before Gmail or ClickUp side effects

## Not In Scope

- production-all auto-send
- Georgia as the live feedback-request target
- any other roster recipient
- live reminder sending
- unrelated Foundation Hub or gate-speed work
- raw email addresses, private token URLs, or feedback text in tracked proof

## Implementation Plan

1. Add a Steve-only full-loop command with dry-run and approved live-send modes.
2. Reuse the existing request send, ClickUp Requested writeback, feedback form save, ClickUp Completed/Score/Feedback writeback, response notification, reminder readiness, and duplicate-send ledger.
3. Keep raw token and email addresses process-local only. Persist proof with hashes, roles, Gmail IDs, ClickUp status names, and booleans only.
4. Leave auto-send disabled and production-all scoped for a later card.

## Acceptance Criteria

- Steve Zahnd Day-30 dry-run is eligible through Company Email.
- The live test sends exactly one initial request and records Gmail message/thread proof.
- ClickUp Requested is written only after Gmail succeeds.
- One controlled response is saved in `agent_onboarding_feedback_responses`.
- ClickUp Completed, Score, and Feedback writeback succeeds.
- Internal response notification sends to oversight roles.
- Reminder readiness reports Steve stopped because feedback is completed.
- A second send attempt is blocked by duplicate/closed-state protection before side effects.
- `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` remains scoped next.

## Verifier Plan

- `npm run agent-feedback:steve-full-loop-test -- --mode=dry-run`
- `npm run agent-feedback:steve-full-loop-test -- --mode=send --approvalRef=docs/process/approvals/AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001.json`
- `npm run process:agent-feedback-steve-full-loop-test-check`
- compatibility checks for send, auto-send, reminders, response notification, and Company Email policy
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- canonical `process:foundation-ship`

## Closeout Plan

Update the live backlog card, build log, current plan, current state, source-contract summary, and proof artifact. The closeout owns only `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001`; production auto-send and Georgia-send cards remain context only.

## Risk Notes

This is an external side-effect card. The live command requires a route-specific approval file, one-send limit, Steve-only target, Company Email rule, BCC oversight roles, and explicit production/Georgia disablement. If Gmail succeeds but a later write fails, the send attempt remains non-resendable and the proof must show repair state instead of retrying.
