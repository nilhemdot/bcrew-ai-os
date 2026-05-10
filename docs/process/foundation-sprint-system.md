# FOUNDATION-SPRINT-SYSTEM-001 Current Sprint System

Status: implemented v1 under `foundation-sprint-system-v1`

## Purpose

Current Sprint is an execution-control overlay on live backlog, not a second backlog.

It exists to show the active Foundation sprint goal, active blocker, ordered sprint cards, stage, definition of done, proof commands, readiness blocker, existing-work/doctrine check, returned reason, and not-next boundaries.

## V1 Stages

- `scoping` - Scoping
- `sprint_ready` - Sprint Ready
- `building_now` - Building Now
- `done_this_sprint` - Done This Sprint
- `returned` - Returned

`Sprint Ready` and `Building Now` require a completed existing-work/doctrine check. Returned requires a returned reason. Unknown stages fail closed.

## Existing-Work/Doctrine Check

Sprint Ready requires:

- existing code/docs/scripts
- existing policy/doctrine
- what is reused
- what is not rebuilt
- exact gap
- over-broad risk
- ready owner and timestamp

This prevents a sprint card from becoming loose UI/product work when a smaller Foundation control gap is the actual approved scope.

## Data Model

V1 uses additive tables:

- `foundation_sprints`
- `foundation_sprint_items`

Sprint items store only sprint-specific fields and reference `backlog_items.id`. They do not duplicate backlog title, lane, priority, owner, summary, or closeout truth.

## Surface

Current Sprint renders at the top of Recent Work. Done cards naturally appear in the Recent Work closeout feed below.

The compact panel is intentionally not a Foundation menu redesign, sprint analytics build, or broad UI polish pass.

## Boundaries

- Do not work `MEETING-VAULT-ACL-001` Phase B from this card.
- Do not mutate Google Drive permissions.
- Do not send request-access emails.
- Do not start Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, filtered comms access, public access, sprint view, or broad UI polish.

## Follow-Ups

- `FOUNDATION-SURFACE-UPDATES-001` remains the broader UI/surface polish card.
- `FOUNDATION-DONE-VELOCITY-001` remains the honest done-velocity graph follow-up unless reliable data is cheap.
- `MEETING-VAULT-ACL-001` remains scoped/blocking until Phase A proves every file safe or a separately approved Phase B applies, rechecks, and records rollback proof.

## Proof

- `npm run process:foundation-sprint-system-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-SYSTEM-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-SYSTEM-001.json --closeoutKey=foundation-sprint-system-v1 --commitRef=HEAD`
