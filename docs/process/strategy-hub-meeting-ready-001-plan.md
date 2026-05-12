# STRATEGY-HUB-MEETING-READY-001 Plan

Status: approved for v1 under `strategy-hub-meeting-ready-v1`
Card: `STRATEGY-HUB-MEETING-READY-001`
Date: 2026-05-12

## What

Build one owner-only Strategy meeting packet that turns the existing Strategy Hub source snapshots and Action Router records into a meeting-readable workflow.

V1 adds a source-backed meeting packet to `/api/strategic-execution/v2` and renders it in Strategy Hub. It does not create a new advisor, Scoper, Director, agent, or marketing pipeline. The packet must consume existing goal truth, operating truth, retrieval status, and Strategy-qualified action routes, then show the owner what to discuss, what evidence supports it, and what review actions are available.

## Why

The audit consensus was that Foundation was proving process better than product behavior. This card is the first product proof after the proof-gate cleanup: an owner should be able to open Strategy Hub before a meeting and see the current production, capacity, recruiting, cash, and strategy-review pressure without translating internal IDs.

The operator value is a live meeting surface: Steve can use it to run one ownership discussion instead of reading docs, raw route records, and separate source panels.

## Acceptance Criteria

- `lib/strategy-hub-meeting-ready.js` builds a meeting packet from goal truth, operating truth, retrieval, and Action Router input.
- The packet produces at least four pressure cards, at least five agenda items, a route-review summary, a proof summary, and concrete operator actions.
- Strategy review items are filtered to routes explicitly marked for Strategy Hub or the strategy review surface; operational routes stay hidden and counted.
- The behavior proof rejects substring-only or string-match proof as closeout; it must call the real function path in `buildStrategyMeetingReadySnapshot` with synthetic source and route data, including a changed-value round-trip variant that proves the packet is not hardcoded.
- `/api/strategic-execution/v2` includes `meetingReady` in live and fallback payloads.
- Strategy Hub renders a Meeting Packet section and an overview preview that use `meetingReady` rather than re-deriving hardcoded copy.
- `scripts/process-strategy-hub-meeting-ready-check.mjs` validates the 9.8 approval, dogfoods Plan Critic against this plan, runs the packet proof, checks live backlog/current sprint state, and emits `STRATEGY_HUB_MEETING_READY_SUMMARY`.
- Plan Critic returns pass with score 9.8 or higher for this `STRATEGY-HUB-MEETING-READY-001` plan before closeout.
- Current Sprint moves `STRATEGY-HUB-MEETING-READY-001` to Done This Sprint and advances the active blocker to `AVATAR-IMPORT-001`.
- Current plan, current state, Recent Work, package scripts, and `foundation:verify` all name `strategy-hub-meeting-ready-v1`.

## Definition Of Done

- The packet fails proof if it loses source-backed pressure cards, agenda items, route filtering, hidden operational route accounting, or proof summary source IDs.
- The packet fails proof if a changed synthetic production/capacity value does not change the meeting packet output.
- The UI includes a meeting packet surface that shows agenda, pressure cards, review queue, source proof, and next actions in plain English.
- The API remains owner-only through the existing Strategy route posture; this card does not broaden access.
- The card is closed in the live backlog with proof commands and closeout trail.

## Details

Reuse existing work:

- `getStrategyGoalTruthSnapshot` for current goal pace, capacity, and recruiting truth.
- `getStrategyOperatingTruthSnapshot` for finance, owners, FUB, and KPI operating source cards.
- `getActionRouterSnapshot` for Strategy-qualified routes, source proof, owners, and review status.
- `getIntelligenceRetrievalSnapshot` and `npm run intelligence:retrieval-eval` for retrieval proof context.
- `public/strategic-execution.js` and `public/strategic-execution.html` for the current Strategy Hub surface.
- `lib/foundation-current-sprint.js`, live Backlog, and Current Sprint as task truth.
- `scripts/foundation-verify.mjs` as canonical verifier coverage.

Gate decision for this card: full.

Reason: this card changes a protected server API payload, a public hub UI, package scripts, live backlog seed, Current Sprint, Recent Work, and canonical verifier coverage. The focused proof should stay fast, but closeout needs the full Foundation ship gate because the blast radius includes product behavior and Foundation command truth.

Behavior proof shape:

- The packet builder is a pure function that accepts source snapshots and routes.
- The API behavior path is `/api/strategic-execution/v2` -> `buildStrategyHubV2Payload` -> `buildStrategyMeetingReadySnapshot` -> `meetingReady`.
- Synthetic proof calls the builder with source-backed goal, finance, owners, KPI, retrieval, and route fixtures.
- A second synthetic variant changes live values and must produce changed packet output.
- The route proof includes one Strategy route and one operational route; the operational route must be hidden from the meeting packet and counted as hidden operational work.
- Substring-only proof is rejected for this card; source markers can only support the behavior proof, not replace it, and a weak plan that relies on `currentState.includes('strategy-hub-meeting-ready-v1')` would return revise.

## Risks

- Risk: the card becomes broad Strategy Hub polish.
  - Repair path: V1 is only the meeting packet transform, API field, UI section, and proof. Scoper, advisor chat, Directors, and route generation stay out of scope.
- Risk: the packet becomes another process artifact.
  - Repair path: the proof calls the packet builder with changed source values and fails if output does not change.
- Risk: the UI still feels like route administration instead of a meeting surface.
  - Repair path: overview preview and Meeting Packet section lead with agenda, pressure, source proof, and next actions; raw route controls remain in Route Review.
- Risk: live source APIs are temporarily degraded.
  - Repair path: `/api/strategic-execution/v2` keeps the existing last-known-good fallback path and includes the latest saved meeting packet when fallback is active.

## Tests

```bash
npm run process:strategy-hub-meeting-ready-check -- --json=true
npm run intelligence:retrieval-eval
npm run process:foundation-done-test -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=STRATEGY-HUB-MEETING-READY-001 --planApprovalRef=docs/process/approvals/STRATEGY-HUB-MEETING-READY-001.json --closeoutKey=strategy-hub-meeting-ready-v1 --commitRef=HEAD
```

The focused proof must call behavior, not only markers:

- `buildStrategyMeetingReadySnapshot`
- `buildSyntheticStrategyHubMeetingReadyProof`
- Strategy route filtering with a hidden operational-route fixture
- changed-value synthetic variant
- live Current Sprint stage and active blocker checks
- live Backlog lane check
- approval-integrity check

## Not Next

- Do not build Scoper, Directors, Agent Factory, advisor chat, or the old Master Director.
- Do not create a new strategy database schema.
- Do not open Strategy Hub to non-Tier-1 users.
- Do not build avatar import in this card.
- Do not start Telegram bots, Marketing pipeline, Brand Guardian, Reply Parser, Watching Items, or old-system parity work.
- Do not mutate Google Drive permissions or restart historical Meeting Vault cleanup.
