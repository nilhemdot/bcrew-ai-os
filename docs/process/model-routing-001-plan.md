# MODEL-ROUTING-001 Plan

## What

Update the canonical runtime doctrine for model routing in `docs/rebuild/current-runtime-map.md` and add a focused proof that keeps the doctrine honest. This is a narrow doctrine/proof card, not a provider integration card.

## Why

Steve has multiple model access paths: official APIs, local builder sessions, subscription-native tools, OpenClaw routes, and future agent adapters. Without one policy, the system can drift into hidden spend, stale model IDs, subscription-farm thinking, or high-stakes work using an unprobed route. The useful operator value is simple: Steve and Foundation Builder should know which brain class belongs to which job before Scoper, agents, Strategy, People, and extractor workloads expand. This lets the operator see whether a route is allowed, parked, or approval-bound without chasing chat claims.

## Acceptance Criteria

- `docs/rebuild/current-runtime-map.md` remains the canonical runtime/model doctrine and no competing model-routing doctrine is created.
- The doctrine separates human/subscription/live-operator capacity from system runtime.
- The doctrine says exact model IDs belong in route configuration, probes, and provider capability records, not durable planning prose.
- The doctrine defines workload classes for classification/tagging, embeddings, extraction helpers, synthesis, Scoper deep tool use, coding/review, heartbeats/audits, high-stakes scopes, and video/vision extraction.
- The doctrine requires cost owner/cap, route key, auth path class, probe status, fallback/parked state, privacy/tier boundary, source IDs, and stop control for every route.
- The doctrine preserves the rule that official APIs and governed adapters are the default for production/customer-facing automated workloads.
- Subscription/native routes remain internal capacity lanes only when allowed, probed, logged, and policy-classified.
- The proof rejects stale exact-model hardcoding in the runtime doctrine and dogfoods missing workload/cost/privacy controls.

## Definition Of Done

- `MODEL-ROUTING-001` has a Plan Critic pass row at 9.8+.
- `docs/rebuild/current-runtime-map.md` contains the canonical model-routing doctrine.
- `npm run process:model-routing-check -- --json` is healthy.
- Current Sprint truth for this card has complete existing-work/doctrine fields and no future card is marked sprint-ready before its own Plan Critic pass.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- The card is done in live backlog and Current Sprint advances to the next safe card.

## Details

Existing code reused:

- `lib/llm-router.js`
- `lib/llm-credential-registry.js`
- `lib/llm-hub-capacity.js`
- `lib/process-plan-critic.js`
- Current Sprint/live backlog stores

Existing docs reused:

- `docs/rebuild/current-runtime-map.md`
- `docs/process/llm-hub-capacity-001-plan.md`
- `docs/process/llm-credential-registry-001-plan.md`
- `docs/process/foundation-gate-decision-tree.md`

Existing scripts reused:

- `npm run process:llm-hub-capacity-check`
- `npm run process:llm-credential-registry-check`
- `npm run process:plan-critic-check`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1`
- `npm run process:fanout-check -- --card=MODEL-ROUTING-001 --closeoutKey=model-routing-v1`
- `npm run process:foundation-ship -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1 --commitRef=HEAD`

Existing policy reused:

- Green means raw green.
- Repeated failures repair or route before normal progression.
- Blockers block unsafe actions, not the whole sprint.
- No external writes, sends, Drive permission mutation, credential mutation, provider config mutation, paid/browser-auth, public exposure, or new source access from this card.
- Model/provider capability registration does not approve runtime use.

Root invariant: model routing doctrine is healthy only when the canonical runtime map tells future builders what the route decision must consider, without pretending a stale model name or subscription login is a production route approval.

The focused proof uses the actual function path `evaluateModelRoutingDoctrine()` over the runtime map and route/capacity definitions, then `buildModelRoutingDoctrineDogfoodProof()` runs synthetic bad doctrine fixtures through the same evaluator. It rejects substring-only comfort by requiring the bad fixtures to fail the real behavior path:

- stale exact model ID hardcoding
- missing workload class coverage
- missing cost owner/cap
- missing privacy/tier boundary
- subscription route presented as product backend approval

Gate decision tree: this card changes canonical doctrine, a focused process check, package script wiring, closeout registry, approval, and live sprint truth. Static proof is too weak because the failure mode is policy drift. Focused proof is required first. Full final ship is required because Current Sprint, System Health, and closeout truth are protected Foundation surfaces.

The focused gate is fast and proportional: it reads local docs/code only, calls no providers, starts no jobs, and should complete under two minutes before the heavier final gates.

## Risks

- The card could drift into LLM router implementation or provider access.
- The doctrine could hardcode exact model names that age out quickly.
- The proof could become marker-only and fail to catch actual bad doctrine.
- Updating Current Sprint truth could create another false-red if future cards are promoted before Plan Critic pass rows exist.

Repair path: fail closed, keep unsafe route/provider work parked, demote unready sprint cards back to scoping, update the doctrine/proof, and rerun focused proof before shipping. If a provider route needs live probing, create or use the next router card; do not smuggle it into this doctrine card.

## Tests

- `node --check lib/model-routing-doctrine.js scripts/process-model-routing-check.mjs`
- `npm run process:model-routing-check -- --json`
- `npm run process:model-routing-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1 --commitRef=HEAD`

## Not Next

- Do not add Claude Code / Claude Agent SDK adapter implementation.
- Do not call OpenAI, Anthropic, Gemini, OpenClaw, browser automation, or paid/provider routes.
- Do not mutate credentials, keys, provider config, Drive permissions, source systems, or external destinations.
- Do not approve scheduled workloads on subscription/native routes just because the route exists.
- Do not build Scoper, Strategy, People, Harlan, Crewbert, or a broad agent runtime from this card.
- Do not create a second model-routing doctrine outside the canonical runtime map.

## Operator Value

Steve gets one current runtime map that answers which model/runtime class handles cheap tags, embeddings, extraction, synthesis, deep Scoper work, coding review, audits, high-stakes judgment, and video/vision. That is useful because the operator can inspect route posture without relying on stale model names or hidden subscription assumptions. It unlocks faster and higher-quality sprint decisions because the system can park unsafe routes and keep working on safe cards.
