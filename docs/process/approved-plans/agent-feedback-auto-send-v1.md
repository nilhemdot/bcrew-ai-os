# AGENT-FEEDBACK-AUTO-SEND-001 Approved Plan

Approval score: 9.8
Closeout key: `agent-feedback-auto-send-v1`
Owned card: `AGENT-FEEDBACK-AUTO-SEND-001`

## Goal

Turn the proven Agent Onboarding Feedback send path into governed auto-send readiness for eligible 30/60/90 feedback requests without running broad live auto-send.

## Scope

- Daily scheduled scan of the ClickUp Agent Roster.
- Detect eligible 30/60/90 milestones.
- Keep default runtime dry-run/report-only.
- Use Company Email for internal/team recipients.
- Use Personal Email for external agents.
- Apply BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default.
- Dedupe BCC if the recipient is also in the oversight list.
- Treat Contract Link as warning metadata only, not a send blocker.
- Preserve duplicate-send protection.
- Preserve Gmail-before-ClickUp Requested sequencing.
- Expose Runtime Health/Ops counts for would-send, sent, skipped, blocked, warning, and repair states.
- Keep proof metadata-only: source IDs, task hashes, field names/hashes, roles, counts, status, blocker/warning keys, and run/config decisions.

## Two-Key Live-Send Control

Live sends require both controls:

1. Runtime toggle: `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true`.
2. Approved mode/allowlist artifact or config.

Default mode is dry-run/report-only. This means `default dry-run/report-only` is the approved starting state.

Hard gates:

- Toggle alone cannot send.
- Exact control phrase: toggle alone cannot send.
- Allowlist alone cannot send.
- Test-only mode can only permit explicitly allowlisted candidates such as Georgia/day 30 after separate approval.
- Production-all mode is impossible without a separate production approval artifact.
- Exact control phrase: production-all mode is impossible without a separate production approval artifact.
- No broad automatic send happens in this build.
- Georgia real send can only happen after separate approval through the test-only allowlist path or exact SEND APPROVED route.

## Acceptance

- Georgia Day-30 is discovered as `would_send` in dry-run.
- Default dry-run/report-only mode cannot send.
- `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true` alone cannot send.
- Approved allowlist alone cannot send.
- Both toggle and approved allowlist are required before a test-only live send can be permitted.
- Production-all cannot be enabled without a separate approval artifact.
- Runtime Health and Ops expose would-send, sent, skipped, blocked, warning, and repair counts.
- Duplicate-send protection remains enforced.
- Gmail-before-Requested sequencing remains enforced.
- If Gmail succeeds but ClickUp Requested writeback fails, repair state is recorded and Gmail is not resent.
- No Gmail send happens during this readiness build.
- No ClickUp Requested writeback happens during this readiness build.
- No raw emails, token URLs, or feedback content appear in tracked docs, verifier logs, build log, or broad API JSON.
- Closeout owns only `AGENT-FEEDBACK-AUTO-SEND-001`.

## Not Scope

- No broad live auto-send.
- No Gmail send unless a separate exact approval exists.
- No ClickUp Requested writeback unless Gmail succeeds.
- No recipient-resolution build.
- No quarterly roster review build.
- No broad onboarding redesign.
- No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane.

## Proof Commands

- `npm run agent-feedback:auto-send -- --mode=dry-run`
- `npm run process:agent-feedback-auto-send-check`
- `npm run process:agent-feedback-send-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- Live `/api/foundation-hub`
- Live `/api/ops-hub`
- Live `/api/foundation/build-log?limit=5`
- `npm run process:foundation-ship -- --card=AGENT-FEEDBACK-AUTO-SEND-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-AUTO-SEND-001.json --closeoutKey=agent-feedback-auto-send-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-FEEDBACK-AUTO-SEND-001` ships auto-send readiness only. It adds the dry-run/report scanner, two-key live-send controls, Runtime Health/Ops counts, duplicate and sequencing proof, privacy checks, and repair-state handling. It does not send Gmail, write ClickUp Requested, or approve broad production auto-send. Next decision: whether to approve test-only Georgia/day-30 live-send mode.
