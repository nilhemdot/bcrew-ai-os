# Foundation Follow-Up Card Capture

Captured: 2026-04-30
Owner card: FOUNDATION-FOLLOWUP-CARD-CAPTURE-001
Closeout key: foundation-followup-card-capture-v1
Baseline commit: ae68ceb

## Reason

Independent review accepted `SOURCE-LIFECYCLE-EXPANSION-001` and found no blocking implementation issues. The planning gap was that three follow-up cards discussed during review were not yet in the live backlog. This capture build creates those cards with full context before any more building.

## Created Scoped Cards

1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001
2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001
3. AGENT-FEEDBACK-SEND-001

`PEOPLE-006` remains related/context only. It is broader historical context for Agent Roster 30/60/90 automation and is not treated as the owner for this capture build or the future send-path build.

## Required Next Build Order

1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001
2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001
3. AGENT-FEEDBACK-SEND-001

## Required Context Checks

### FOUNDATION-SYSTEMS-SERVICE-GROUPING-001

The card includes all required service areas:

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

It explicitly says Sales and Recruiting must stay separate, there is no combined Sales/Recruiting bucket, and systems touching both must carry primary + secondary service area.

### AGENT-ONBOARDING-FEEDBACK-SYSTEM-001

The card includes the required system context:

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
- Known test cases: Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists; Chris: does not fire until Real Start Date is set/readable

### AGENT-FEEDBACK-SEND-001

The card includes the required send boundaries:

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

## Non-Scope Confirmation

- No Gmail send.
- No ClickUp Requested writeback.
- No Systems grouping implementation.
- No feature work.
- No Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup.

## Proof

Required proof commands:

- `npm run process:foundation-followup-card-capture-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=FOUNDATION-FOLLOWUP-CARD-CAPTURE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-FOLLOWUP-CARD-CAPTURE-001.json --closeoutKey=foundation-followup-card-capture-v1 --commitRef=HEAD`
