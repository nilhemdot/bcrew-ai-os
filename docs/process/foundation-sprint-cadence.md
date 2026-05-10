# FOUNDATION-SPRINT-CADENCE-001 Sprint Cadence

Status: implemented v1 under `foundation-sprint-cadence-v1`

## Purpose

The Current Sprint panel is Steve's sprint command view. It is still an overlay on live backlog truth, not a second backlog.

## Command View Contract

The top of Recent Work must show:

- executive sprint summary
- sprint goal
- current status
- next card
- current blocker
- exit criteria
- Scoping / Sprint Ready / Building Now / Returned / Done This Sprint
- card definition of done
- proof commands
- returned reason
- next action

## Layout Rule

Do not use skinny five-column sprint cards that force words to wrap vertically. Use a readable board or compact row layout so Steve can scan the sprint quickly.

## Current Sprint Truth

- `FOUNDATION-SPRINT-SYSTEM-001` is done this sprint.
- `FOUNDATION-SPRINT-CADENCE-001` adds the command-view cadence layer.
- `MEETING-VAULT-ACL-001` moves into Scoping as the next visible work while remaining the active Foundation blocker.
- No Drive permission mutation is approved.

## Boundaries

- No `MEETING-VAULT-ACL-001` Phase B.
- No Google Drive permission mutations.
- No request-access emails.
- No broad Foundation UI polish, Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, public access, or broad sprint analytics.

## Proof

- `npm run process:foundation-sprint-cadence-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-CADENCE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-CADENCE-001.json --closeoutKey=foundation-sprint-cadence-v1 --commitRef=HEAD`
