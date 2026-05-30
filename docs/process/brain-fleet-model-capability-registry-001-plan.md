# BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001 Plan

Closeout key: `brain-fleet-model-capability-registry-v1`

## What

Build the Brain Fleet model capability registry before any live Codex, Gemini, Claude, OpenClaw, or extractor route probes. V1 adds a read-only registry over existing `llm_credentials`, `llm_routes`, and `llm_route_probes` runtime truth so each Brain Fleet route exposes provider, model, speed mode, reasoning posture, video support, vision support, long-context support, quota posture, auth posture, known limitations, and allowed workloads.

This is capability truth only. It reuses the existing Brain Fleet no-auth route contract, Brain Fleet quota ledger, LLM router planning truth, credential registry, and LLM runtime store. It does not create a new router, credential registry, provider probe runner, quota store, provider adapter, extractor runtime, or dashboard UI.

## Why

Steve needs governed Build Intel extraction, but the system cannot safely probe or use subscription/API capacity while route capability is just operator memory or stale prose. OpenClaw, direct Codex, Gemini video, Claude Code review, and API fallback routes need to be distinguishable by what is known, what is unknown, and what still requires a bounded route proof.

Operator value: after this card, a future route card can say, "this route is Codex direct, speed Fast is probe-required, quota is unknown, auth is probe-required, and every attempt must write the Brain Fleet quota ledger," instead of guessing from model names or chat memory.

## Acceptance Criteria

- `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001` has a 9.8+ Plan Critic row and approval file.
- `lib/brain-fleet-model-capability-registry.js` builds a route capability registry from existing `llm_credentials`, `llm_routes`, and `llm_route_probes` only.
- Every route capability row records provider, model, workload, auth path, credential key, account label, speed mode, reasoning posture, video support, vision support, long-context support, quota posture, quota reset state if known, explicit unknown quota/reset state if not known, auth posture, known limitations, and allowed workloads.
- Unknown support, quota, auth, and model-speed truth is explicit as `unknown` or `probe_required`; missing truth fails the focused proof.
- The registry distinguishes OpenClaw adapter-scoped Codex 5.4 style routes, future direct Codex/Fast-style routes, Gemini video/long-context candidates, Claude Code review candidates, and API fallback routes without claiming unprobed availability.
- The focused proof dogfoods complete rows, missing speed rejection, missing support rejection, missing quota rejection, profile distinction, no LLM runtime source mutation, and no provider execution.
- Current Sprint advances to `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001` only after the registry proof closes.

## Details

Existing code reused:

- `lib/brain-fleet-foundation.js` remains the no-auth route-contract planner.
- `lib/brain-fleet-quota-ledger.js` remains the approved Brain Fleet call ledger boundary.
- `lib/llm-router.js` remains the route planner/provider-adapter boundary.
- `lib/foundation-llm-runtime-store.js` remains the `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` store.
- `lib/llm-credential-registry.js` remains credential policy truth.
- `llm_credentials.account_label`, `llm_credentials.quota_state`, `llm_credentials.allowed_workloads`, `llm_routes.model`, `llm_routes.status`, `llm_routes.policy_classification`, `llm_routes.risk_class`, and any existing `llm_route_probes.capability` remain the source facts.
- Current Sprint, live backlog, approval integrity, Plan Critic, process write guard, closeout registry, and `process:foundation-ship` remain the process control plane.

Existing docs reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/_archive/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md`
- `docs/_archive/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md`
- `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md`

Existing scripts reused:

- `scripts/process-brain-fleet-foundation-check.mjs`
- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `scripts/process-brain-fleet-quota-ledger-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship`

Live backlog truth reused:

- `BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001` is the active P0 card.
- `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001` is the next card.
- Strategy/People, broad extraction, and live provider probes remain parked by Current Sprint truth.

Implementation behavior:

- Build `buildBrainFleetRouteCapability()` for one normalized route row.
- Build `buildBrainFleetModelCapabilityRegistry()` for all live route rows.
- Build `validateBrainFleetRouteCapability()` so missing provider, model, speed mode, reasoning posture, video/vision/long-context support, quota posture/reset field, auth posture, known limitations list, allowed workloads, or evidence fails closed.
- Build `normalizeBrainFleetCapabilityQuota()` so quota/reset unknown is explicit and not omitted.
- Build `assertBrainFleetCapabilitySourcesUnchanged()` so focused proof can prove it did not mutate `llm_credentials`, `llm_routes`, or `llm_route_probes`.
- Mark all registry output as report-only: `providerExecutionAllowed=false`, `liveProviderProbesAllowed=false`, `writesCredentials=false`, `writesRoutes=false`, `writesRouteProbes=false`, and `writesSourceSystems=false`.
- Record OpenClaw, Claude Code, Gemini, and unknown support limitations as route capability truth without treating those limitations as failure or availability.

Behavior proof, not substring proof:

- The focused proof calls the actual function path: `buildBrainFleetRouteCapability()`, `buildBrainFleetModelCapabilityRegistry()`, `validateBrainFleetRouteCapability()`, `normalizeBrainFleetCapabilityQuota()`, and `assertBrainFleetCapabilitySourcesUnchanged()`.
- The proof reads the live LLM runtime snapshot, builds the registry, and verifies that every live route has complete capability truth.
- Dogfood rejects weak behavior: missing speed mode, missing support posture, missing quota posture/reset field, source mutation, and provider execution.
- Source checks may support the proof, but card closeout depends on real function behavior and live read-only registry output.

## Not Next

- Do not run live provider probes.
- Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.
- Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.
- Do not mutate credentials, OAuth tokens, browser profiles, provider config, `llm_credentials`, `llm_routes`, `llm_route_probes`, source systems, email, Telegram, or public systems.
- Do not start direct Codex probe implementation, Gemini video probe implementation, Claude route probe implementation, OpenClaw adapter demotion, extractor proof, YouTube runtime proof, broad Skool/MyICOR/Loom crawl, Strategy, or People work from this card.
- Do not claim Codex 5.5, Fast mode, Gemini video, Gemini long-context, Claude Code, OpenClaw, quota, or auth availability as proven unless a later bounded route card records that proof through the Harlan auth-needed flow and Brain Fleet quota ledger.
- Do not hide auth, quota, rate-limit, provider, missing-capability, or source-mutation failures by classification. Green means raw green.

## Risks

- Risk: capability registry turns into live provider probing. Mitigation: module and proof are read-only and reject `fetch`, `spawn`, model calls, route-probe writes, credential writes, and route writes.
- Risk: model names imply support that has not been proved. Mitigation: unprobed support is `probe_required` or `unknown`, not `supported`.
- Risk: OpenClaw limitations become Foundation architecture. Mitigation: the registry records OpenClaw as adapter-scoped and hands direct Codex proof to the next card.
- Risk: unknown quota/auth truth disappears. Mitigation: unknown quota reset and auth posture are explicit fields and missing fields fail the validator.
- Risk: future adapters bypass capability truth or the quota ledger. Mitigation: later route cards must use this registry output plus the Brain Fleet quota ledger before provider execution.
- Repair path: if focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, or `process:foundation-ship` fails, keep this card active, repair the exact failing invariant, and do not start the direct Codex route.

## Tests

The focused proof must simulate:

- a complete OpenClaw adapter-scoped route profile
- a future direct Codex/Fast-style route profile without claiming unprobed availability
- a Gemini video/vision/long-context candidate profile marked probe-required
- a Claude Code review candidate profile marked experimental/probe-required
- an API fallback route profile with quota/auth truth
- missing speed mode rejection
- missing support posture rejection
- missing quota posture/reset rejection
- no `llm_credentials`, `llm_routes`, or `llm_route_probes` mutation
- no provider execution and no live provider probes

Gate decision tree: this is a P0 Foundation runtime/governance card with runtime route interpretation, live sprint truth, closeout registry, package script, and verifier coverage. It needs static syntax checks, focused behavior proof, live read-only registry proof, System Health, repeated-failure gate, backlog hygiene, full `foundation:verify`, and `process:foundation-ship`.

Speed boundary: the focused check is fast and proportional, designed to run under 2 minutes by default because it reads live LLM runtime rows and uses synthetic behavior only. The heavier checks stay in the final Foundation ship gate.

Operator value: this unlocks bounded Codex/Gemini/Claude/OpenClaw route proofs with clear capability expectations and stop conditions. Steve can see what the system believes before it spends capacity or starts Build Intel extraction.

## Proof Commands

```bash
node --check lib/brain-fleet-model-capability-registry.js scripts/process-brain-fleet-model-capability-registry-check.mjs
npm run process:brain-fleet-model-capability-registry-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001.json --closeoutKey=brain-fleet-model-capability-registry-v1 --commitRef=HEAD
```

## Definition Of Done

- Brain Fleet model capability registry module and process proof pass.
- Live read-only proof shows every live LLM route has capability truth for provider, model, speed mode, reasoning posture, video/vision/long-context support, quota posture, auth posture, limitations, and allowed workloads.
- No provider probes, provider/model calls, credential mutation, route mutation, route-probe mutation, source writes, external writes, or extractor runtime work occur.
- Live backlog row and Current Sprint truth are reconciled.
- Closeout registry and verifier coverage include the card.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` are green.
- Main is clean and pushed before the next card proceeds.
