# MODEL-ROUTING-001 Closeout

Generated: 2026-05-20T10:59:04.849Z

## Summary

MODEL-ROUTING-001 is closed under `model-routing-v1`.

What changed:

- Updated `docs/rebuild/current-runtime-map.md` as the canonical model/runtime doctrine.
- Separated human/subscription/live-operator capacity from system runtime.
- Kept exact model IDs out of durable doctrine; model IDs belong in route config, provider probes, or checked provider docs.
- Added workload-class routing rules for classification, embeddings, extraction, synthesis, Scoper deep runs, coding, audits, high-stakes work, and video/vision.
- Required cost owner/cap, route key, auth path, probe status, fallback/parked state, privacy/tier boundary, source IDs, and stop controls.
- Preserved park-and-continue: blocked route actions do not stop the whole sprint.
- Repaired verifier truth paths exposed by the ship gate: historical hard-checkpoint closeout lookup now uses the closeout registry fallback, the strategic-intel follow-up verifier accepts `MODEL-ROUTING-001` after verified closeout instead of only while scoped, and the focused model-routing proof accepts safe post-closeout readback.

## Proof

- Plan Critic: status=pass score=10/10 gate=full findings=no findings
- Focused proof: healthy (0 failed checks)
- Final verifier support proof: `foundation:verify -- --json-summary` passes 518/518 after the closeout fallback and model-routing done-state repairs.

## Proof Commands

- `npm run process:model-routing-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1`
- `npm run process:fanout-check -- --card=MODEL-ROUTING-001 --closeoutKey=model-routing-v1`
- `npm run process:foundation-ship -- --card=MODEL-ROUTING-001 --planApprovalRef=docs/process/approvals/MODEL-ROUTING-001.json --closeoutKey=model-routing-v1 --commitRef=HEAD`

## Not Next

- No provider calls, browser automation, paid/provider access, credential mutation, provider config mutation, Drive permission mutation, external writes, or new source access.
- No Claude/Gemini/OpenClaw adapter implementation in this card.
- No automatic approval of subscription/native routes for scheduled jobs.

## Next

Continue with LLM-ROUTER-001 by scoping the bounded router migration/workload proof before marking it Building Now.
