# AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 Approved Plan

Approved by Steve on 2026-04-30 with score 9.8/10.

Closeout key: `agent-onboarding-feedback-system-v1`

Owned card: `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`

## Goal

Make Agent Onboarding Feedback visible as a real Foundation/Ops system before any production email send path is built.

## Scope

- Add `SYS-AGENT-ONBOARDING-FEEDBACK-001` to `/api/source-of-truth` `groupedSystems`.
- Route it to service area `Agent Onboarding`.
- Keep Sales and Recruiting as separate service groups.
- Preserve the existing 12 grouped systems.
- Create/scope `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` if missing.
- Keep `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` context/mentioned only for this closeout.
- Keep `AGENT-FEEDBACK-SEND-001` scoped.

## Required System Context

- System name: Agent Onboarding Feedback
- Operating area: Agent Onboarding
- Source of truth: ClickUp Agent Roster
- Trigger: Real Start Date + day 30/60/90 milestones
- Current queue: Agent Roster review / Ops review queue
- Current form: /agent-feedback private token link
- Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields
- Current statuses: not due, due, requested, completed, skipped, blocked, expired window
- Current blockers: missing Real Start Date, missing Personal Email, missing Contract Link, expired send window, missing/invalid feedback fields
- Proof surfaces: Ops Hub Agent Roster queue, /api/owners/review-queue, ClickUp task metadata, feedback response DB table `agent_onboarding_feedback_responses`, Gmail send proof once send path exists
- Known test cases: Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists; Chris: does not fire until Real Start Date is set/readable

## Hard Gates

- `SYS-AGENT-ONBOARDING-FEEDBACK-001` must be marked `implementationState: partial` unless/until `AGENT-FEEDBACK-SEND-001` ships.
- Before: 12 grouped systems.
- After: 13 grouped systems.
- Existing 12 grouped systems must be preserved.
- Agent Onboarding Feedback must be added exactly once as the 13th system.
- `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` may be created/scoped but remains context/mentioned only.
- Build log `backlogIds` must own only `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`.
- No Gmail send.
- No ClickUp Requested writeback.
- No Georgia survey.
- No production email path.
- No `AGENT-FEEDBACK-SEND-001` build.
- No AGENT-FEEDBACK-SEND-001 build.
- No broad Systems regrouping.
- No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane.

## Privacy

- No private feedback tokens.
- No private feedback content.
- No personal email addresses.
- private feedback links stay private.
- no private feedback content broadly exposed.
- feedback content remains visible only in approved owner/review surfaces.
- Do not copy private feedback tokens, feedback content, or personal email addresses into tracked docs, verifier logs, build log, or manual proof.
- Georgia/Chris proof is metadata-only: due/not due, milestone, blocker reason, and task/source IDs where safe.

## Acceptance

- `/api/source-of-truth` exposes 13 grouped systems.
- `SYS-AGENT-ONBOARDING-FEEDBACK-001` has primary serviceArea `Agent Onboarding`.
- `SYS-AGENT-ONBOARDING-FEEDBACK-001` has implementationState `partial`.
- Agent Onboarding service group is no longer empty.
- Existing 12 grouped systems are still present.
- `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` exists in live backlog and seed as scoped, not done.
- `AGENT-FEEDBACK-SEND-001` remains scoped.
- `/api/owners/review-queue` proves the Agent Roster queue and metadata-only Georgia/Chris test cases.
- `/api/ops-hub` proves the Agent Roster review job metadata.
- Manual desktop and mobile review passes for `/foundation#systems` and `/ops`.
- Closeout owns only `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`.

## Proof Commands

- `npm run process:agent-onboarding-feedback-system-check`
- `npm run process:foundation-systems-service-grouping-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/source-of-truth`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s http://localhost:3000/api/owners/review-queue`
- `curl -s http://localhost:3000/api/ops-hub`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 --planApprovalRef=docs/process/approvals/AGENT-ONBOARDING-FEEDBACK-SYSTEM-001.json --closeoutKey=agent-onboarding-feedback-system-v1 --commitRef=HEAD`

## Closeout Draft

`AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1 under `agent-onboarding-feedback-system-v1`. It adds `SYS-AGENT-ONBOARDING-FEEDBACK-001` as the 13th grouped system, preserves the existing 12 grouped systems, maps the system to Agent Onboarding, marks it partial until the send path ships, creates/scopes `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` as context only, keeps `AGENT-FEEDBACK-SEND-001` scoped, and records Georgia/Chris proof as metadata only. No Gmail send, ClickUp Requested writeback, Georgia survey, production send path, broad Systems regrouping, Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane happened.

## Risks / Limits

- This is visibility/control only. It does not send feedback requests.
- The system remains partial until `AGENT-FEEDBACK-SEND-001` ships.
- Empty service groups remain real audit signals; they are captured by `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001`, not filled with fake systems.
- Private feedback content is not exposed broadly.

## Next Step

Stop for review. Next expected card is `AGENT-FEEDBACK-SEND-001` unless Steve pulls `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` forward first.
