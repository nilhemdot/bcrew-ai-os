# OPENCLAW-ADAPTER-BOUNDARY-001 Plan

## What

Demote OpenClaw to adapter-only status after Claude route proof and before extractor proof. This is a Foundation routing/doctrine boundary card, not an OpenClaw gateway repair, not a provider probe, and not extractor runtime work.

## Why

Foundation needs Brain Fleet to own provider/model/speed/capacity decisions. OpenClaw can stay useful where it is proven, but its model-selection and gateway limits must not define the AIOS architecture.

Correct stack:

```text
Foundation OS -> Brain Fleet / LLM Router -> Provider Adapters -> Agents / Workers
```

OpenClaw belongs in the provider adapter layer.

## Operator Value

Steve gets clear route truth: OpenClaw is still available as a local subscription gateway adapter, but extractor and agent architecture will not be shaped around OpenClaw limitations. If OpenClaw is selected later, it must be selected through Brain Fleet ledger, fallback, and source approval rules.

## Acceptance Criteria

- The focused proof validates approval integrity, Plan Critic, package wiring, closeout registry wiring, synthetic dogfood, live LLM route metadata, live backlog/current sprint truth, and no credential mutation.
- OpenClaw credential truth remains represented, but the proof does not mutate credential rows or local OpenClaw config.
- All core OpenClaw routes are labeled adapter-only with `architectureRole=provider_adapter`, `architectureOwner=false`, and `coreDependencyAllowed=false`.
- Every core OpenClaw route has a same-workload non-OpenClaw fallback route.
- Core workloads retain non-OpenClaw route alternatives.
- Non-OpenClaw routes do not fall back into OpenClaw.
- The proof does not run an OpenClaw provider/model probe, call a model, run extraction, mutate external systems, or send external messages.
- Current Sprint advances to `EXTRACTOR-BRAIN-FLEET-PROOF-001` only after raw-green Foundation gates pass.

## Definition Of Done

Done means:

- `lib/openclaw-adapter-boundary.js` owns the adapter-boundary metadata, evaluator, route-update helper, and synthetic dogfood.
- `lib/llm-router.js` default OpenClaw credential/route metadata marks OpenClaw as adapter-only, not the Foundation architecture owner.
- Live `llm_routes` OpenClaw core rows are updated with adapter-only metadata and non-OpenClaw fallback truth.
- OpenClaw credential row is unchanged by the proof.
- A focused proof rejects missing fallback, OpenClaw-as-architecture-owner, only-OpenClaw workload, and reverse-fallback-into-OpenClaw failures.
- Current plan/state record that `OPENCLAW-ADAPTER-BOUNDARY-001` is closed and `EXTRACTOR-BRAIN-FLEET-PROOF-001` is next.
- Foundation ship gates pass raw green.

## Details

Reuse existing code and truth:

- `lib/llm-router.js`
- `lib/brain-fleet-model-capability-registry.js`
- `lib/foundation-llm-runtime-store.js`
- `docs/_archive/handoffs/2026-05-20-orchestrator-brain-fleet-extractor-checkpoint.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Add:

- `lib/openclaw-adapter-boundary.js`
- `scripts/process-openclaw-adapter-boundary-check.mjs`
- `process:openclaw-adapter-boundary-check`
- closeout/verifier coverage and current plan/state updates

Behavior proof is through actual function/process paths: `buildOpenClawAdapterRouteUpdates`, `evaluateOpenClawAdapterBoundary`, `buildSyntheticOpenClawAdapterBoundaryProof`, `upsertLlmRoute`, `getLlmRuntimeSnapshot`, credential row comparison, `validatePlanApprovalFile`, Plan Critic evaluation, and Current Sprint readback. The proof performs a live DB round-trip for route metadata only, then evaluates returned route objects and fallback graph behavior. Substring-only proof is rejected; source-marker checks are supporting wiring checks only after the route-update function path, synthetic dogfood, DB readback, and Current Sprint process path pass.

No provider probe is allowed on this card. The runtime mutation is limited to `llm_routes` metadata for OpenClaw adapter route rows and Current Sprint/backlog closeout truth.

## Risks

- Risk: OpenClaw stays silently treated as the default architecture because it has low priority route rows. Mitigation: mark OpenClaw adapter-only, require non-OpenClaw fallback truth, and dogfood hard-dependency failures.
- Risk: This drifts into OpenClaw gateway troubleshooting or model probing. Mitigation: script proof rejects provider-call terms and only calls `upsertLlmRoute`.
- Risk: Credential/config mutation sneaks in. Mitigation: no `upsertLlmCredential`, no OpenClaw config writes, and credential row comparison proves unchanged.
- Risk: Extractor proof starts too early. Mitigation: Current Sprint only advances after the focused proof and raw-green gates; this card itself does no extraction.
- Rollback/repair: if route metadata or gates fail, leave the card executing, keep extractor proof scoped, preserve exact failing check output, and repair the route/fallback/proof path before continuing.

## Tests

- `node --check lib/openclaw-adapter-boundary.js lib/llm-router.js scripts/process-openclaw-adapter-boundary-check.mjs`
- `npm run process:openclaw-adapter-boundary-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=OPENCLAW-ADAPTER-BOUNDARY-001 --planApprovalRef=docs/process/approvals/OPENCLAW-ADAPTER-BOUNDARY-001.json --closeoutKey=openclaw-adapter-boundary-v1 --commitRef=HEAD`

## Gate Decision Tree

Gate choice: full.

Decision tree: static is too thin because live `llm_routes` metadata changes; focused alone is too narrow because this card changes Current Sprint truth and verifier coverage; full is proportional because Foundation must stay raw green before extractor proof.

## Boundaries

- Do not make OpenClaw the Foundation architecture owner or a required core dependency.
- Do not run OpenClaw provider/model probes, live extraction, browser automation, broad crawls, Strategy, or People work.
- Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.
- Do not mutate credentials, OAuth tokens, browser profiles, provider config, source systems, Drive permissions, or public exposure settings.
- Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.
- Do not hide OpenClaw model, auth, quota, route, fallback, or hard-dependency ambiguity by classification.
