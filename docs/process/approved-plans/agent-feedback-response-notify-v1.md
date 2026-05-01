# Approved Plan: AGENT-FEEDBACK-RESPONSE-NOTIFY-001

Closeout key: `agent-feedback-response-notify-v1`

Score: 9.8 approved by Steve.

## Scope

Build response notification only for Agent Onboarding Feedback.

When an agent submits 30/60/90 onboarding feedback:

1. Save the response in `agent_onboarding_feedback_responses`.
2. Attempt the ClickUp Completed/Score/Feedback writeback.
3. Send an internal notification after DB save and after the ClickUp writeback attempt.
4. If ClickUp writeback fails but DB save succeeds, still send the notification with repair status.

Recipients are internal oversight roles only:

- Steve
- Carson
- Ryan
- Georgia

## Hard Boundaries

- Do not send Georgia onboarding survey.
- Do not send any external survey email.
- Do not write ClickUp Requested.
- Do not enable live auto-send.
- Do not build Georgia live-send.
- Do not build Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or a new feature lane.

## Notification Content

The internal notification email includes:

- agent name
- milestone day
- score
- feedback text
- submitted timestamp
- ClickUp task/source reference
- whether ClickUp Completed/Score/Feedback writeback succeeded
- repair status when ClickUp writeback fails after DB save

The notification must not include the private feedback token.

## Privacy

Tracked proof uses roles/hashes only. No private tokens, raw emails, or feedback text in docs, verifier logs, build log, or broad API proof.

The real internal notification email may include the feedback text because it is sent only to the approved internal oversight team.

## Duplicate Protection

Duplicate notification protection is keyed by the saved feedback response ID in `agent_onboarding_feedback_response_notifications`.

If a response already has a sending or sent notification record, the system must not send another notification.

## Proof

Required proof:

- synthetic/local submission notification dry-run for ClickUp writeback success
- synthetic/local submission notification dry-run for ClickUp writeback repair path
- no real external survey send
- no Georgia onboarding survey
- no ClickUp Requested writeback
- process/verifier coverage
- closeout owns only `AGENT-FEEDBACK-RESPONSE-NOTIFY-001`

Proof commands:

- `npm run agent-feedback:response-notify -- --mode=dry-run --synthetic=true --clickUpWritebackStatus=succeeded`
- `npm run agent-feedback:response-notify -- --mode=dry-run --synthetic=true --clickUpWritebackStatus=failed`
- `npm run process:agent-feedback-response-notify-check`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-feedback-auto-send-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- live `/api/foundation-hub`
- live `/api/ops-hub`
- live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-RESPONSE-NOTIFY-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-RESPONSE-NOTIFY-001.json --closeoutKey=agent-feedback-response-notify-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-FEEDBACK-RESPONSE-NOTIFY-001` is done for v1 under `agent-feedback-response-notify-v1`. Agent Onboarding Feedback submissions now notify internal oversight roles Steve, Carson, Ryan, and Georgia after the response is saved and after the ClickUp Completed/Score/Feedback writeback attempt. The notification includes agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status `clickup_completed_writeback_failed`. Duplicate notification protection is keyed by response ID. Synthetic dry-run proof covers success and repair paths without sending Gmail. No Georgia onboarding survey, external survey email, ClickUp Requested writeback, or live auto-send happened. Tracked proof uses roles/hashes only and does not expose private tokens, raw emails, or feedback text. Closeout owns only `AGENT-FEEDBACK-RESPONSE-NOTIFY-001`.
