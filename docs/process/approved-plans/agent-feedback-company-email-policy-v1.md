# Approved Plan: AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001

Closeout key: `agent-feedback-company-email-policy-v1`

Score: 9.8 approved by Steve.

## Goal

Make Agent Feedback live-system ready by applying one global recipient policy before the Steve full-loop test:

- request sends use ClickUp Company Email only
- test sends use ClickUp Company Email only
- auto-send candidates use ClickUp Company Email only
- reminder candidates use ClickUp Company Email only
- Personal Email is not used anywhere in Agent Feedback send eligibility

## Required Policy

- No legacy Personal Email blocker can appear in Agent Feedback checks.
- Contract Link remains warning-only and does not block send eligibility.
- BCC oversight remains Steve, Carson, Ryan, and Georgia.
- If the To recipient is also a BCC oversight role, dedupe that role from the actual BCC send list.
- Route-specific SEND approval supports any approved target, not Georgia only.
- Test allowlists support any named target, not Georgia only.
- Auto-send allowlists support named targets and production-all separately.
- Reminder path uses the same Company Email rule.
- Response notification remains active.

## Hard Boundaries

- No Gmail send.
- No ClickUp Requested writeback.
- No production auto-send.
- No Georgia live test.
- No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, broad onboarding redesign, or new feature lane.
- No raw email addresses, private token URLs, or feedback content in tracked docs, verifier logs, build log, or broad API proof.

## Required Proof

- Steve Zahnd Day-30 dry-run is eligible via Company Email.
- Georgia Day-30 dry-run is eligible via Company Email if checked, but Georgia is not the test target.
- A synthetic external agent uses Company Email and is eligible.
- No Personal Email blockers appear anywhere in send, auto-send, reminder, or policy checks.
- Send, auto-send, reminder, and response notification checks pass.
- `backlog:hygiene` passes.
- `foundation:verify` passes.
- Closeout owns only `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001`.

## Proof Commands

- `npm run agent-feedback:test-email -- --mode=dry-run --targetName="Steve Zahnd" --milestoneDay=30`
- `npm run agent-feedback:test-email -- --mode=dry-run --targetName=Georgia --milestoneDay=30`
- `npm run process:agent-feedback-company-email-policy-check`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-feedback-auto-send-check`
- `npm run process:agent-feedback-reminder-cadence-check`
- `npm run process:agent-feedback-response-notify-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- live `/api/foundation-hub`
- live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001.json --closeoutKey=agent-feedback-company-email-policy-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` is done for v1 under `agent-feedback-company-email-policy-v1`. Agent Feedback request sends, auto-send candidates, reminder candidates, and test sends now use ClickUp Company Email only. Personal Email is not used anywhere in Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. The route-specific approval validator supports any approved target, not Georgia only. Test allowlists and auto-send allowlists support any named target while production-all remains a separate approval mode. Proof shows Steve Zahnd Day-30 dry-run eligible via Company Email, Georgia Day-30 eligible via Company Email when checked but not the live test target, and a synthetic external agent eligible via Company Email. Send, auto-send, reminder, and response-notify checks passed. No Gmail send, no ClickUp Requested writeback, no production auto-send, no Georgia test, and no raw emails/tokens/feedback content in tracked proof. Closeout owns only `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001`. Next build is `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001`, then `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`.
