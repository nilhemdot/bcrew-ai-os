# FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 Approved Plan

Approved by: Steve
Score: 9.8/10
Approved at: 2026-04-30
Closeout key: `foundation-systems-service-grouping-v1`

## Goal

Group the Foundation Systems page by the business/service area each system serves.

Owned card:

- `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`

Route and data source:

- Route: `/foundation#systems`
- Data source: `/api/source-of-truth` `groupedSystems`
- API changes: additive only

## Required Service Groups

- Foundation / Control Plane
- Strategy / Leadership
- Sales
- Recruiting
- Marketing - Clients
- Marketing - Agents
- Agent Onboarding
- Client Onboarding
- Closing / Deals
- Finance
- Operations
- Source Intelligence / Extraction
- People / Retention
- Review Queues / Accountability

## Scope

- Classify existing grouped systems only.
- Add one valid primary `serviceArea` to every grouped system.
- Add `secondaryServiceAreas` where a system serves more than one business/service area.
- Keep `secondaryServiceAreas` within the approved group list and never duplicate primary `serviceArea`.
- Show all approved service groups on `/foundation#systems`.
- Show empty groups as `No mapped systems yet.`
- Label partial or planned systems clearly while keeping technical metadata reachable.
- Keep existing source contracts, connectors, runtime jobs, backlog cards, source notes, and action links visible.

## Hard Rules

- Sales and Recruiting must be separate.
- No combined Sales/Recruiting bucket.
- Do not invent fake systems.
- Unclassified systems must fail the check.
- No Gmail send.
- No ClickUp Requested writeback.
- No Agent Onboarding Feedback system build.
- No AGENT-FEEDBACK-SEND-001.
- No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane.

## Acceptance Criteria

- `/foundation#systems` renders systems grouped by the 14 approved service groups.
- All 12 existing grouped systems appear exactly once as a primary service-area assignment.
- Every existing grouped system has one valid primary `serviceArea`.
- Every `secondaryServiceAreas` entry is valid and does not duplicate primary.
- `Sales` and `Recruiting` are separate groups.
- No combined Sales/Recruiting bucket exists.
- Partial or planned systems are labeled visibly.
- Technical metadata remains reachable inside each system card.
- `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` remains scoped.
- `AGENT-FEEDBACK-SEND-001` remains scoped.
- Closeout owns only `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`.

## Proof Commands

- `npm run process:foundation-systems-service-grouping-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/source-of-truth`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SYSTEMS-SERVICE-GROUPING-001.json --closeoutKey=foundation-systems-service-grouping-v1 --commitRef=HEAD`

## Manual Proof

Manual proof must inspect `/foundation#systems` at:

- desktop 1440x900
- mobile 390x844

Manual proof must record pass/fail for:

- no horizontal overflow
- no overlapping text
- service groups visible
- system cards readable
- technical metadata still reachable

## Closeout Draft

`FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` closes under `foundation-systems-service-grouping-v1` after the route groups existing systems by service area, all service-area metadata passes the focused process check, backlog hygiene passes, `foundation:verify` passes, live API proof passes, manual desktop/mobile proof passes, and the canonical ship wrapper passes.

Closeout owns only `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`.

After ship, stop for review. Next expected card is `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`.
