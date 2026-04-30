# FOUNDATION-FOLLOWUP-CARD-CAPTURE-001 Approved Plan

Approved by: Steve
Score: 9.8/10
Approved at: 2026-04-30
Closeout key: `foundation-followup-card-capture-v1`

## Goal

Create and scope the three missing follow-up cards that were discovered during review of `SOURCE-LIFECYCLE-EXPANSION-001`, then stop for review before any feature work starts.

Owned card:

- `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001`

Cards to create as scoped follow-ups:

1. `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`
2. `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`
3. `AGENT-FEEDBACK-SEND-001`

`PEOPLE-006` stays related/context only.

## Required Card Context

### FOUNDATION-SYSTEMS-SERVICE-GROUPING-001

The card must scope Systems page grouping by business/service area.

Required groups:

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

Hard rule:

- Sales and Recruiting must stay separate.
- No combined Sales/Recruiting bucket.
- Systems touching both must have primary + secondary service area.

### AGENT-ONBOARDING-FEEDBACK-SYSTEM-001

The card must scope the system visibility layer for:

- System name: Agent Onboarding Feedback
- Operating area: Agent Onboarding
- Source of truth: ClickUp Agent Roster
- Trigger: Real Start Date + day 30/60/90
- Current queue: Agent Roster review / Ops review queue
- Current form: /agent-feedback private token link
- Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields
- Current statuses: not due, due, requested, completed, skipped, blocked, expired window
- Current blockers: missing Real Start Date, missing Personal Email, missing Contract Link, expired send window, missing/invalid feedback fields
- Proof surfaces: Ops Hub Agent Roster queue, /api/owners/review-queue, ClickUp task, feedback response DB table, Gmail send proof once send path exists
- Privacy boundary: private feedback links, no private feedback content broadly exposed, feedback content visible only in approved owner/review surfaces
- Known test case: Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists
- Known test case: Chris: does not fire until Real Start Date is set/readable

### AGENT-FEEDBACK-SEND-001

The card must scope the production send path for 30/60/90 onboarding feedback.

Required boundaries:

- Dry-run first.
- No real send without Steve's route-specific approval.
- Georgia test target.
- To: Georgia's personal email from ClickUp unless Steve gives a different email.
- CC: Steve, Carson, Ryan, Georgia if desired.
- Capture Gmail message/thread ID.
- Mark Requested in ClickUp only after Gmail send succeeds.
- Duplicate send protection.
- No send if Personal Email missing.
- No send if milestone window expired.
- Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields.
- Feedback response is stored in the agent_onboarding_feedback_responses table with task ID, agent name, milestone day, token hash, score, feedback, and submitted timestamp.
- Feedback content is not broadly exposed outside approved owner/review surfaces.

## Acceptance Criteria

- `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` exists and closes this capture build only.
- The three new cards exist in live backlog and repo seed.
- The three new cards remain scoped, not done.
- Each new card contains the required deep context above.
- Current plan and current state show the build order:
  1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001
  2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001
  3. AGENT-FEEDBACK-SEND-001
- `PEOPLE-006` remains related/context only.
- The process check and `foundation:verify` prove the context and ordering.

## Hard Constraints

- No Gmail send.
- No ClickUp Requested writeback.
- No Systems grouping implementation.
- No feature work.
- No Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup.

## Proof Commands

- `npm run process:foundation-followup-card-capture-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=FOUNDATION-FOLLOWUP-CARD-CAPTURE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FOLLOWUP-CARD-CAPTURE-001.json --closeoutKey=foundation-followup-card-capture-v1 --commitRef=HEAD`

## Closeout Draft

`FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` closes under `foundation-followup-card-capture-v1` after the owner card and three scoped follow-up cards exist in live backlog/seed, the plan/state build order is recorded, the focused process check passes, backlog hygiene passes, foundation verify passes, and the canonical ship wrapper passes.

Closeout owns only `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001`.

After ship, stop for review. Next expected build order is:

1. `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`
2. `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`
3. `AGENT-FEEDBACK-SEND-001`
