# FOUNDATION-DB-MONOLITH-SPLIT-010 Closeout

Date: 2026-05-16
Closeout key: `foundation-llm-runtime-store-split-v1`
Sprint: `foundation-db-llm-runtime-store-split-2026-05-16`

## What Changed

Moved LLM credential, route, probe, call, runtime snapshot, stale-call read, and stale-call reaper behavior out of `lib/foundation-db.js` and into `lib/foundation-llm-runtime-store.js`.

`lib/foundation-db.js` now keeps the existing public LLM runtime exports as delegates:

- `upsertLlmCredential`
- `upsertLlmRoute`
- `recordLlmRouteProbe`
- `createLlmCall`
- `finishLlmCall`
- `getLlmRuntimeSnapshot`
- `getStaleLlmCalls`
- `markStaleLlmCalls`

This reduced `lib/foundation-db.js` from the previous split baseline of about 9,409 lines to about 8,893 lines without changing schema, routing policy, provider auth, or live model behavior.

## Dogfood Proof

Focused proof rejects:

- missing dedicated LLM runtime module ownership
- old inline LLM runtime ownership in `lib/foundation-db.js`
- missing public delegate wiring
- weak split plans that do not document the architecture-rule split posture

Synthetic fake-pool behavior proof preserves:

- runtime snapshot counts
- credential, route, probe, and call row mapping
- `createLlmCall()` and `finishLlmCall()` mapping
- stale planned/started LLM call reads
- stale LLM call reaper updates

The extraction-runtime verifier was also updated to follow the new module boundary for the stale LLM reaper string, instead of forcing that proof back into `foundation-db.js`.

## Proof Commands

```bash
node --check lib/foundation-llm-runtime-store.js lib/foundation-db.js lib/foundation-db-split-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-llm-runtime-store-split-check.mjs lib/foundation-build-closeout-overnight-records.js lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs
npm run process:foundation-llm-runtime-store-split-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-010 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-010.json --closeoutKey=foundation-llm-runtime-store-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-010 --closeoutKey=foundation-llm-runtime-store-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-010 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-010.json --closeoutKey=foundation-llm-runtime-store-split-v1 --commitRef=HEAD
```

## Boundaries

This was Foundation monolith cleanup only.

Not changed:

- no LLM routing policy changes
- no provider auth changes
- no live model calls
- no schema changes
- no source extraction
- no hub feature work
- no Canva asset work
- no paid-source auth
- no Build Intel extraction
- no Drive permissions mutation
- no `MEETING-VAULT-ACL-001` Phase B
- no request-access email

## Next

Continue no-auth Foundation cleanup. `lib/foundation-db.js` remains above the 5,000-line danger threshold, so the next safe work should be another bounded store split with stable delegates and fake-pool behavior proof.
