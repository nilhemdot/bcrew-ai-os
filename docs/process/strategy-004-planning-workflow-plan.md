# STRATEGY-004 - Strategy Planning Workflow

## What

Build the v1 AI-assisted Strategy planning workflow as a deterministic, source-backed Strategy Hub surface.

The workflow adds a Planning Workflow section to Strategy Hub v2 and a `planningWorkflow` payload to `/api/strategic-execution/v2`. It converts existing source-to-gap pressure, Strategy Action Router records, Strategic Intelligence issues, Scoper outputs, and retrieval status into four review queues:

- priority candidates
- carry-forward candidates
- stop candidates
- missing-data gaps

Every item must include owner, next action, and provenance refs. This is not the old Strategy Advisor chat.

## Why

Steve needs planning support that tells him what to prioritize, carry forward, stop, or fill with missing data. The system already has source-to-gap truth, Strategy review records, strategic issues, and Scoper outputs, but those pieces are still separate.

This card turns that existing evidence into a usable planning workflow without creating unsupported recommendations, external writes, provider calls, or auto-applied decisions.

## Acceptance Criteria

- Strategy Hub v2 API includes a `planningWorkflow` object.
- Strategy Hub UI has a Planning Workflow navigation item and visible section.
- The workflow has priority, carry-forward, stop, and missing-data queues.
- Every planning item has owner, next action, and source/issue/route/scoper/proof provenance.
- Operational Action Router rows stay hidden unless explicitly Strategy Hub eligible.
- Unsupported source-less recommendations fail focused proof.
- Changed source values affect the workflow readout.
- No provider/model calls, browser automation, extraction, external writes, sent messages, credential mutation, Drive permission mutation, backlog auto-creation, or decision auto-apply occur.

## Definition Of Done

- `lib/strategy-planning-workflow.js` owns the deterministic builder, evidence reader, evaluator, and dogfood proof.
- `/api/strategic-execution/v2` returns `planningWorkflow`.
- `public/strategic-execution.html` and `public/strategic-execution.js` render the Planning Workflow section.
- `scripts/process-strategy-004-check.mjs` validates approval, Plan Critic, live backlog, Current Sprint truth, dogfood behavior, live workflow evaluation, UI/API wiring, verifier coverage, closeout registry, and read-only proof posture.
- Current Sprint marks `STRATEGY-004` done and advances active blocker to `STRATEGY-009`.
- Full closeout gates pass and main is clean/pushed.

## Details

Existing work reused:

- `lib/strategy-shared-comms-routes.js` already owns Strategy Hub v2 API routing.
- `lib/strategy-hub-meeting-ready.js` already turns source-to-gap pressure and Strategy routes into an ownership meeting packet.
- `lib/strategic-intel-loop.js` already owns `intelligence_strategic_issues`.
- `lib/intel-scoper.js` already owns `intelligence_scoper_outputs`.
- `lib/intelligence-action-router.js` already owns Strategy-qualified action routes.
- `public/strategic-execution.js` already renders Strategy Hub v2 source-to-gap, meeting packet, and route review sections.
- Existing docs reused: `docs/process/strategy-hub-meeting-ready-001-plan.md`, `docs/process/strategic-intel-001-plan.md`, `docs/process/decision-008-plan.md`, and `docs/process/intel-scoper-001-plan.md`.
- Existing scripts reused: `process:strategy-hub-meeting-ready-check`, `process:strategic-intel-check`, `process:decision-008-check`, `process:intel-scoper-check`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth are reused: `STRATEGY-004` is the active blocker and `STRATEGY-009` is the next Strategy UX cleanup card.

The new workflow is a read-only planning layer. It does not write back to Action Router, decisions, backlog, source systems, providers, or external services. The only process writes are the standard card closeout updates when the focused proof runs with `--close-card`.

The dogfood proof must prove behavior, not substrings:

- accepts a source-backed planning fixture with pressure cards, Strategy route, strategic issues, and Scoper outputs
- rejects an unsupported recommendation with no provenance
- proves changed source values change the workflow readout
- proves an operational route is hidden from planning candidates

Operator value: Steve gets a real workflow for quarterly planning instead of another dashboard dump. The useful product behavior is seeing which source-backed items should be decided, carried forward, stopped, or filled with better evidence before the next planning conversation. This unlocks better planning quality without adding an autonomous advisor.

Gate decision: full gate. The blast radius touches Strategy Hub API, frontend rendering, a new DB read helper, Current Sprint truth, and closeout proof. The focused `process:strategy-004-check` stays fast and proportional by reading bounded rows and synthetic fixtures; it should run under two minutes by default, then full `foundation:verify` and `process:foundation-ship` close the card.

## Risks

- Risk: the workflow becomes another unsupported advisor feed. Repair path: fail focused proof unless every item has provenance, owner, and next action.
- Risk: operational Action Router rows leak into Strategy planning. Repair path: route filtering dogfood rejects operational routes.
- Risk: UI work drifts into Strategy Package redesign. Repair path: keep this card to the planning section only and leave broader UX cleanup to `STRATEGY-009`.
- Risk: payload/query work slows the Strategy route. Repair path: limit evidence reads and keep the helper read-only with bounded table limits.

## Tests

- `node --check lib/strategy-planning-workflow.js lib/strategy-shared-comms-routes.js public/strategic-execution.js scripts/process-strategy-004-check.mjs`
- `npm run process:strategy-004-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=STRATEGY-004 --planApprovalRef=docs/process/approvals/STRATEGY-004.json --closeoutKey=strategy-004-planning-workflow-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=STRATEGY-004 --closeoutKey=strategy-004-planning-workflow-v1`
- `npm run process:foundation-ship -- --card=STRATEGY-004 --planApprovalRef=docs/process/approvals/STRATEGY-004.json --closeoutKey=strategy-004-planning-workflow-v1 --commitRef=HEAD`

## Not Next

- No old Strategy Advisor chat.
- No LLM/provider/browser/auth/private extraction lanes.
- No external writes, sends, credential mutation, provider config change, Drive permission mutation, or paid/browser-auth work.
- No auto-created backlog cards or auto-applied decisions.
- No broad Strategy Package redesign; that is `STRATEGY-009`.
- No source/extract/value expansion outside this card.
