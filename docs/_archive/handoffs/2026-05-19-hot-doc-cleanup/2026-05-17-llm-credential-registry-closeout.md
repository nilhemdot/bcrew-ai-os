# LLM Credential Registry Closeout

Date: 2026-05-17
Card: `LLM-CREDENTIAL-REGISTRY-001`
Closeout key: `llm-credential-registry-v1`

## What Shipped

- Added `lib/llm-credential-registry.js` as the DB-backed capacity-policy evaluator for `llm_credentials` and `llm_routes`.
- Added `scripts/process-llm-credential-registry-check.mjs` as the focused proof and guarded `--apply` sync.
- Extended the LLM runtime snapshot with `credentialRegistry` summary/rows.
- Updated the Foundation Runtime LLM panel to show registry policy counts, owner, fallback, stop-control, and latest probe context.
- Added package and verifier coverage so the card is not a false-green orphan.
- Synced capacity policy metadata into live DB registry rows for every lane-backed credential and route.

## Proof

- `node --check lib/llm-credential-registry.js scripts/process-llm-credential-registry-check.mjs lib/foundation-llm-runtime-store.js public/foundation-runtime-renderers.js scripts/foundation-verify.mjs`
- `npm run process:llm-credential-registry-check -- --json --apply`
- `npm run process:llm-credential-registry-check -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=LLM-CREDENTIAL-REGISTRY-001 --planApprovalRef=docs/process/approvals/LLM-CREDENTIAL-REGISTRY-001.json --closeoutKey=llm-credential-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=LLM-CREDENTIAL-REGISTRY-001 --closeoutKey=llm-credential-registry-v1`
- `npm run process:foundation-ship -- --card=LLM-CREDENTIAL-REGISTRY-001 --planApprovalRef=docs/process/approvals/LLM-CREDENTIAL-REGISTRY-001.json --closeoutKey=llm-credential-registry-v1 --commitRef=HEAD`

Focused proof result:

- 5/5 lane-backed credential policies complete.
- 7/7 lane-backed route policies complete.
- 0 registry findings.
- Dogfood rejected missing metadata, missing owner/stop-control/budget, and secret-shaped policy values.

## Boundaries

- No live model calls.
- No provider spend.
- No secrets printed, added, rotated, or committed.
- No Harlan terminal runtime, Fal image iteration, voice wiring, Canva, Marketing Video Lab, hub feature, Skool, myICOR, Loom, Drive ACL, or MEETING-VAULT Phase B work.

## Known Limits

- This does not prove any provider can perform live work. It proves the registry now carries policy ownership and guardrails for existing capacity lanes.
- Two credentials and three routes remain unmapped because they are not lane-backed in `LLM-HUB-CAPACITY-001`; they are intentionally visible but not required for this card.
- Claude Code subscription lanes remain review/warning where their status/policy is still experimental or probe-required.

## Next

Stop for Steve regroup per latest instruction. Good candidate topics for regroup: whether to continue model/runtime usability work, return to connector completion, or prioritize the Harlan/Fal/voice lane after explicit approval.
