# LLM Hub Capacity Closeout

Date: 2026-05-17

Card: `LLM-HUB-CAPACITY-001`

Closeout key: `llm-hub-capacity-v1`

## Summary

Built the V1 model-capacity lane policy for Foundation. The existing LLM runtime snapshot now reports named capacity lanes with owner, workload, provider/auth path, credential, primary route, fallback, budget/cap, pacing, account window, stop control, and status.

## What Changed

- Added `lib/llm-hub-capacity.js`.
- Added `scripts/process-llm-hub-capacity-check.mjs`.
- Added package script `process:llm-hub-capacity-check`.
- Extended `getLlmRuntimeSnapshot()` with `capacity`, `capacityLaneCount`, `capacityGreenLanes`, `capacityYellowLanes`, and `capacityRedLanes`.
- Updated the Foundation Runtime LLM panel to show capacity lanes before raw route rows.
- Added plan and approval artifacts:
  - `docs/process/llm-hub-capacity-001-plan.md`
  - `docs/process/approvals/LLM-HUB-CAPACITY-001.json`

## Proof

Focused proof:

```bash
node --check lib/llm-hub-capacity.js scripts/process-llm-hub-capacity-check.mjs lib/foundation-llm-runtime-store.js public/foundation-runtime-renderers.js
npm run process:llm-hub-capacity-check -- --json
```

Full ship proof:

```bash
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=LLM-HUB-CAPACITY-001 --planApprovalRef=docs/process/approvals/LLM-HUB-CAPACITY-001.json --closeoutKey=llm-hub-capacity-v1 --commitRef=HEAD
```

## Dogfood

The focused proof calls the real evaluator and proves weak capacity lanes fail when they are missing:

- owner
- budget/cap
- stop control
- primary route
- credential
- fallback for non-fallback lanes

## Live Capacity Result

The live snapshot currently reports:

- 7 named capacity lanes
- 5 ready lanes
- 2 review lanes
- 0 blocked lanes

The two review lanes are expected because Claude Code subscription lanes remain experimental/probe-required until a later auth/probe card promotes them. This closeout does not pretend those lanes are fully green.

## Boundaries

- No live OpenClaw, Claude Code, OpenAI, Anthropic, Gemini, Fal, Canva, or ElevenLabs calls ran.
- No secrets were printed or committed.
- No credentials or routes were inserted or modified.
- No Harlan terminal runtime, Fal image iteration, voice wiring, Canva routes, Marketing Video Lab routes, or hub features were built.
- No external auth, paid-source extraction, Skool, myICOR, Loom, or Drive permission work was touched.

## Next

Natural follow-up is `LLM-CREDENTIAL-REGISTRY-001`: extend the registry/dashboard route policy with the capacity fields now proven by this V1 view, then run a fresh `LLM-AUTH-AUDIT-001` probe only when Steve is ready for provider/runtime validation.
