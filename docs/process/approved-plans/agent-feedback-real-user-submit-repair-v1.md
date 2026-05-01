# Agent Feedback Real User Submit Repair V1

Card: `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`
Closeout key: `agent-feedback-real-user-submit-repair-v1`

## Scope

Repair the Steve Zahnd Day-30 full-loop test so the live emailed token is submitted by Steve in the browser, not consumed by a script.

- split Steve full-loop command modes into send-only/manual-user and synthetic-submit proof
- prevent synthetic-submit mode from consuming a live emailed token
- show a clear already-submitted message for used feedback links
- preserve and supersede the previous script-consumed Steve Day-30 artifacts
- send one fresh Steve Day-30 email through Company Email
- write ClickUp Requested only after Gmail succeeds
- wait for Steve to submit from the real emailed browser link
- verify DB response, ClickUp Completed/Score/Feedback writeback, internal notification, reminder stop, duplicate resend protection, and BCC role proof

## Not In Scope

- production auto-send enablement
- Georgia as the feedback-request target
- any other roster send
- live reminder sending
- clearing ClickUp score or feedback unless separately approved
- deleting previous test evidence
- raw email addresses, private token URLs, raw tokens, or feedback text in tracked proof

## Implementation Plan

1. Add a repair command with `send-only`, `status`, and `synthetic-submit` modes.
2. Mark the previous Steve Day-30 script response and active send attempt as superseded with repair metadata, preserving evidence.
3. Allow the approved repair send to bypass only the old `already_closed` state caused by the script-consumed test, then create a fresh send attempt and write ClickUp Requested after Gmail succeeds.
4. Update `/agent-feedback` session and submit errors so used links show `This feedback link has already been submitted.`
5. Add a repair process check that stays red until Steve’s real browser response exists and all post-submit effects are proven.

## Acceptance Criteria

- Real Steve browser submission succeeds.
- The fresh emailed token is not consumed before Steve uses it.
- Duplicate submit gives a clear already-submitted message.
- DB response exists from real browser submission, not from the script.
- ClickUp Completed/Score/Feedback writeback succeeds.
- Internal response notification sends to Steve, Carson, Ryan, and Georgia.
- Reminder readiness stops because feedback is completed.
- Duplicate resend is blocked before side effects.
- Production auto-send remains disabled and scoped.
- No Georgia send and no other roster send.
- Closeout owns only `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`.

## Verifier Plan

- `npm run agent-feedback:real-user-submit-repair -- --mode=synthetic-submit`
- `npm run agent-feedback:real-user-submit-repair -- --mode=send-only --approvalRef=docs/process/approvals/AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.json`
- Steve submits the actual emailed browser link.
- `npm run process:agent-feedback-real-user-submit-repair-check -- --includeDuplicateProbe`
- `npm run process:agent-feedback-steve-full-loop-test-check`
- `npm run process:agent-feedback-company-email-policy-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify` if it completes; if it times out, record the timeout and do not bypass without explicit reason.
- ship and fanout checks
- live Foundation Hub and build-log proof

## Closeout Plan

Do not close the card until Steve’s real browser submission is observed. Update backlog, current plan/state, source-contract summary, proof artifact, build log, and verifier coverage. The closeout owns only `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`; production auto-send remains a later card.
