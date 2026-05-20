# BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001 Closeout

Date: 2026-05-20
Closeout key: `brain-fleet-model-capability-registry-v1`
Next card: `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`

## What Shipped

Brain Fleet model capability registry v1 records read-only route capability truth from existing LLM runtime tables before live route probes.

The registry records, per route:

- provider, model, workload, hub, route key, auth path, credential key, and account label
- speed mode
- reasoning posture
- video, vision, and long-context support posture
- quota posture, remaining/reset/window if known, and explicit unknown quota/reset truth if not known
- auth posture
- known limitations
- allowed workloads
- source evidence from `llm_routes`, `llm_credentials`, and existing `llm_route_probes`

## Where It Lives

- `lib/brain-fleet-model-capability-registry.js`
- `scripts/process-brain-fleet-model-capability-registry-check.mjs`
- `docs/process/brain-fleet-model-capability-registry-001-plan.md`
- `docs/process/approvals/BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001.json`
- `docs/handoffs/2026-05-20-brain-fleet-model-capability-registry-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-model-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`
- `package.json`

## Proof Boundary

This card is registry/proof only:

- no live provider probes
- no provider/model calls
- no OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor execution
- no credential, OAuth token, browser profile, provider config, `llm_credentials`, `llm_routes`, or `llm_route_probes` mutation
- no source-system, Drive-permission, email, Telegram, public-system, Strategy, People, or extractor runtime work

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

## Handoff

Continue `CODEX-DIRECT-SUBSCRIPTION-ROUTE-001`.

Direct Codex route work must use Harlan auth-needed flow if auth is required, must ledger every probe attempt through Brain Fleet quota ledger truth, and must not perform external writes.
