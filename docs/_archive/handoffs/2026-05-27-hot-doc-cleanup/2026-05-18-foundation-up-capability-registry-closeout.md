# FOUNDATION-UP-CAPABILITY-REGISTRY-001 Closeout

Closeout key: `foundation-up-capability-registry-v1`

## What Changed

Created the Foundation-up provider/tool capability registry for Fal, ElevenLabs, Canva, and terminal workers.

## What It Does

Each capability row records provider/tool kind, owner, env refs by name only, permission class, cost policy, audit log, callable path, proof command, approval boundary, and blocked agent binding status before any agent or worker can claim/use the tool.

## Proof

- `node --check lib/foundation-up-capability-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-foundation-up-capability-registry-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-up-capability-registry-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --closeoutKey=foundation-up-capability-registry-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --commitRef=HEAD`

## Dogfood

Rejects missing env refs, missing audit logs, premature provider approval, hidden workers, destructive terminal command allowlists, live side effects, and secret leaks.

## Limits

No provider calls, paid spend, model/media generation, Canva writes/exports/uploads/designs, terminal worker launch, hidden subagents, agent runtime authority grants, external writes, live extraction, or secret storage.

## Next

Continue `MEMORY-002` from repo truth as safe scope/preflight only unless local runtime approval and proof already exist.
