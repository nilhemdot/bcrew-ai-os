# BRAIN-FLEET-FOUNDATION-001 Plan

## What
Build a thin V1 no-auth Brain Fleet contract/interface over the existing `llm_credentials` and `llm_routes` runtime truth. This card adds `lib/brain-fleet-foundation.js` and `process:brain-fleet-foundation-check` so extractor and future agent work can ask for provider-agnostic route contracts without calling providers, probing accounts, changing credentials, or rebuilding the existing LLM router.

This is the contract layer only. Brain Fleet V1 reads route/provider/model/account-label/policy truth, normalizes a request with an artifact reference, asks the existing `planLlmRoute` planner for route selection, and returns a contract that explicitly says provider execution is blocked until Harlan auth escalation, quota ledger, and model capability registry are shipped.

## Why
Steve needs the next useful workflow to move toward governed Build Intel extraction, but Foundation must remain green and no provider/auth work should happen before the control plane is ready. The operator value is a clear route contract that tells builders which model route would be used, which account label it maps to, and why it cannot execute yet. That prevents Brain Fleet from becoming a hidden subscription farm or a second router while still unblocking the next safe card.

## Acceptance Criteria
- `BRAIN-FLEET-FOUNDATION-001` exposes a provider-agnostic contract with workload, hub, route, provider, model, auth path, credential key, account label, quota posture, fallback route, readiness, stop conditions, and required follow-on cards.
- The implementation reuses existing code: `lib/llm-router.js` `planLlmRoute`, `lib/llm-credential-registry.js`, `lib/foundation-llm-runtime-store.js`, live backlog truth, Current Sprint, and the existing process proof/ship gate scripts.
- The contract reads existing `llm_credentials` and `llm_routes`; it does not create new credential or route storage.
- The no-auth boundary rejects raw prompt, message, transcript, or source content and requires an artifact ref.
- The proof proves real behavior with a synthetic planner and a live route plan; it is not substring-only proof.
- The focused proof verifies no live provider probes, no provider execution, no credential mutation, no source write, and no external write.
- Current Sprint advances to `HARLAN-AUTH-ESCALATION-LOOP-001` only after this card closes.

## Definition Of Done
- `lib/brain-fleet-foundation.js` contains the Brain Fleet contract, snapshot, route-plan wrapper, no-auth guards, and synthetic proof.
- `scripts/process-brain-fleet-foundation-check.mjs` validates approval integrity, Plan Critic, live LLM runtime snapshot, no-auth contract behavior, package script wiring, closeout registry wiring, and live Current Sprint truth.
- `docs/process/approvals/BRAIN-FLEET-FOUNDATION-001.json` validates at 9.8+ for this plan.
- `docs/handoffs/2026-05-20-brain-fleet-foundation-closeout.md` records the shipped boundary and next card.
- `package.json` exposes `process:brain-fleet-foundation-check`.
- Closeout registry and verifier coverage include `BRAIN-FLEET-FOUNDATION-001`.
- Proof commands pass: `node --check`, `npm run process:brain-fleet-foundation-check -- --close-card --json`, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

## Details
Reuse statement: this plan reuses existing code, existing docs, existing scripts, live backlog truth, and Current Sprint truth. It does not create a second router, second credential registry, second backlog, or second sprint command surface.

Existing code reused:
- `lib/llm-router.js` remains the route planner and provider adapter boundary. Brain Fleet calls `planLlmRoute`; it does not call `callLlm` or provider adapters.
- `lib/llm-credential-registry.js` remains the capacity-policy/credential policy evaluator.
- `lib/foundation-llm-runtime-store.js` remains the read path for `llm_credentials`, `llm_routes`, probes, and recent calls.
- `lib/llm-hub-capacity.js` remains capacity lane truth; the capability registry card can extend capability fields later.
- Current Sprint, live backlog, approval integrity, Plan Critic, process write guard, closeout registry, and foundation ship gate remain the process control plane.

Implementation behavior:
- Normalize a Brain Fleet request with `workload`, `hubKey`, `caller`, and `inputArtifactRef`.
- Reject raw prompt/content fields because this no-auth card should not handle live provider payloads.
- Build route contracts from existing route and credential rows, including account label but no secret values.
- Return `providerExecutionAllowed=false`, `liveProviderProbesAllowed=false`, and `canExecute=false` with stop conditions for Harlan auth, quota ledger, capability registry, and provider execution disabled.
- Keep writes behind the focused check only for backlog/Current Sprint closeout metadata when `--apply` or `--close-card` is explicitly supplied.
- No substring-only proof is accepted. The focused proof must call actual function paths for request normalization, route contract generation, synthetic planner behavior, raw-content rejection, live runtime snapshot mapping, and live route planning.

Not next:
- Do not run live provider probes.
- Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.
- Do not mutate credentials, provider config, route status, quota state, source systems, Drive permissions, email, Telegram, or public systems.
- Do not build Harlan auth escalation, quota ledger, model capability registry, OpenClaw demotion, extractor runtime proof, YouTube extraction, Strategy, or People from this card.

## Risks
- Risk: Brain Fleet duplicates the LLM router. Mitigation: the module must use `planLlmRoute` and credential registry truth; focused proof rejects direct runtime writes or provider execution.
- Risk: a contract-only card becomes a live probe card. Mitigation: raw prompt/content is rejected, provider execution is false, and follow-on cards are named as required stop conditions.
- Risk: closing the card leaves Current Sprint active-card gate unhealthy for Harlan. Mitigation: close-card refreshes the Harlan item with proof commands, not-next boundaries, and repo posture.
- Risk: proof passes while real LLM runtime tables are missing. Mitigation: focused proof reads the live LLM runtime snapshot and requires `llm_credentials` and `llm_routes` rows.
- Repair path: if proof fails, fail closed, leave or return `BRAIN-FLEET-FOUNDATION-001` as active, repair the specific invariant, and do not start Harlan auth or provider probes.

## Tests
Gate decision tree: static proof is insufficient because the blast radius includes live sprint truth and route-contract behavior. Focused proof is required for the actual function behavior, synthetic dogfood, and live LLM runtime snapshot. Full ship gate is required after the focused proof because this touches routing contracts, live sprint truth, closeout registry, package scripts, and verifier coverage. The focused proof stays fast and behavior-based; the full gate protects Foundation health.

Operator value: Steve gets a real workflow checkpoint that improves speed and quality before extraction starts. It unlocks the next safe card by making the route/model/account-label truth visible without pretending provider auth, quota, or capability controls are ready.

Commands:
- `node --check lib/brain-fleet-foundation.js scripts/process-brain-fleet-foundation-check.mjs`
- `npm run process:brain-fleet-foundation-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=BRAIN-FLEET-FOUNDATION-001 --planApprovalRef=docs/process/approvals/BRAIN-FLEET-FOUNDATION-001.json --closeoutKey=brain-fleet-foundation-v1 --commitRef=HEAD`
