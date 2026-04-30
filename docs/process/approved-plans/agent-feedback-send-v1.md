# AGENT-FEEDBACK-SEND-001 Approved Plan

Approved by Steve on 2026-04-30 with score 9.8/10.

Closeout key: `agent-feedback-send-v1`

Owned card: `AGENT-FEEDBACK-SEND-001`

## Goal

Build the production-controlled send-path infrastructure for 30/60/90 Agent Onboarding Feedback requests, prove it through dry-run metadata, and stop before any real send.

## Current Truth

- `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1.
- `SYS-AGENT-ONBOARDING-FEEDBACK-001` is visible as a partial Agent Onboarding system.
- Georgia has not received a survey.
- `AGENT-FEEDBACK-SEND-001` is the send-path infrastructure card.
- Real send still requires Steve's exact route-specific `SEND APPROVED`.

## Stage 1: Build and prove dry-run/send infrastructure

Build:

- eligibility checks for Real Start Date, due window, Personal Email, Contract Link, milestone feedback fields, existing status, and duplicate-send attempts
- dry-run mode
- duplicate protection with a send-attempt ledger
- Gmail send path wiring
- Requested writeback sequencing
- privacy checks
- verifier coverage
- Georgia metadata-only dry-run proof

Dry-run must produce a metadata-only preview for Georgia:

- milestone/day
- due status
- recipient roles
- CC roles
- token hash
- ClickUp Requested writeback plan
- blockers if any

No real Gmail send and no ClickUp Requested writeback in Stage 1.

## Stage 2: Real Georgia test send

Stage 2 is not executed in this build.

After Stage 1 dry-run proof, stop and ask Steve for exact route-specific `SEND APPROVED`.

Real send requires explicit approval naming:

- Georgia
- milestone/day
- recipient rule
- CC roles: Steve, Carson, Ryan, Georgia only if not duplicate
- one-send limit

If approval is not given, the card may close only as send path built and dry-run proven, real send pending approval. The approved-send work must remain scoped under a follow-up card.

If approval is given later, send exactly one email, capture Gmail message/thread proof, then write ClickUp Requested.

## Source Of Truth

- ClickUp Agent Roster
- `/api/owners/review-queue`
- `agent_onboarding_feedback_responses`
- `agent_onboarding_feedback_send_attempts`
- Gmail delegated send path for the later approved send

## Eligibility Rules

Do not send when:

- Real Start Date is missing or unreadable
- milestone is not due
- milestone window is expired
- Personal Email is missing or invalid
- Contract Link is missing
- required Onboarding NPS status, score, or feedback fields are missing
- status is already requested/completed/skipped/blocked
- an active send attempt exists for the same ClickUp task and milestone day

Georgia metadata-only dry-run proof must show the current due status and blockers if any.

Known test cases:

- Georgia: Real Start Date 2026-03-29; Day-30 due 2026-04-28.
- Chris: must not fire until Real Start Date is set/readable.

## Recipient And CC Rules

- Recipient rule: ClickUp Personal Email.
- CC roles requested: Steve, Carson, Ryan, and Georgia.
- If Georgia is the To recipient, she must not also be duplicated in CC.
- Stage 2 requires approved addresses for every applied CC role.
- Sender/from-name and reply-to behavior must be explicit.

## Production Send Behavior

The send function may exist after Stage 1, but it must remain hard-gated.

It may only run after route-specific `SEND APPROVED` names Georgia, milestone/day, recipient rule, CC roles, and one-send limit.

## ClickUp Writeback Behavior

- Mark ClickUp Onboarding NPS milestone Status = Requested only after Gmail send succeeds.
- Do not write Requested during dry-run.
- Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields.
- Feedback response remains stored in `agent_onboarding_feedback_responses`.

## Duplicate Protection

- Use `agent_onboarding_feedback_send_attempts`.
- Protect the active key `clickup_task_id + milestone_day`.
- Active statuses: sending, sent, clickup_requested.
- Failed attempts do not block a later approved retry.

## Privacy

- Do not expose raw email addresses, token URLs, or feedback content in tracked proof.
- Private feedback link tokens must not appear in tracked docs, verifier logs, build log, or broad API JSON.
- Dry-run proof may include source IDs/classes, task/list hashes, recipient roles, CC roles, token hash, status, blocker reason, and side-effect booleans.
- No private feedback content is broadly exposed outside approved owner/review surfaces.

## Acceptance

- Dry-run command returns metadata-only Georgia proof.
- Dry-run records no Gmail send and no ClickUp Requested writeback.
- Gmail send path is wired but hard-gated by route-specific approval.
- ClickUp Requested writeback helper exists and is sequenced after Gmail success.
- Duplicate-send protection is backed by the send-attempt ledger.
- Private token URLs, raw email addresses, and feedback content do not appear in tracked proof.
- `SYS-AGENT-ONBOARDING-FEEDBACK-001` remains `implementationState: partial`.
- `AGENT-FEEDBACK-GEORGIA-SEND-001` is scoped as the Stage 2 follow-up.
- Closeout owns only `AGENT-FEEDBACK-SEND-001`.

## Proof Commands

- `npm run agent-feedback:test-email -- --mode=dry-run --targetName=Georgia --milestoneDay=30`
- `npm run process:agent-feedback-send-check`
- `npm run process:agent-onboarding-feedback-system-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s http://localhost:3000/api/source-of-truth`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-SEND-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-SEND-001.json --closeoutKey=agent-feedback-send-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-FEEDBACK-SEND-001` is done for Stage 1 under `agent-feedback-send-v1`. It builds and proves eligibility checks, dry-run metadata preview, duplicate-send protection, Gmail send wiring, ClickUp Requested writeback sequencing, privacy checks, verifier coverage, and Georgia metadata-only dry-run proof. It does not send Gmail, write ClickUp Requested, send Georgia a survey, execute Stage 2, expose raw email addresses, expose token URLs, or expose feedback content. `AGENT-FEEDBACK-GEORGIA-SEND-001` remains scoped for the later route-specific approved send.

## Known Limits

- Georgia is due for Day-30 but current source metadata may still block a real send until Personal Email, Contract Link, and approved CC address configuration are present.
- No real send happened in this build.
- No ClickUp Requested writeback happened in this build.
- The Agent Onboarding Feedback system remains partial until a route-specific approved send completes.

## Next Step

Stop for review. Real send requires Steve's exact `SEND APPROVED` with Georgia, milestone/day, recipient rule, CC roles, and one-send limit.
