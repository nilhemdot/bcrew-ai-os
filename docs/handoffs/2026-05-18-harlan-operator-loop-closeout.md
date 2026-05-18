# HARLAN-OPERATOR-LOOP-V1-001 Closeout

Card: `HARLAN-OPERATOR-LOOP-V1-001`
Closeout key: `harlan-operator-loop-v1`
Date: 2026-05-18

## What Changed

Added Harlan's first read-only Foundation operator loop contract and focused proof.

## What It Does

The loop defines how Harlan answers Steve's current Foundation operator questions from declared sources:

- what is true right now
- what changed
- what is broken
- what is blocked
- who owns it
- what happens next

Every current section requires fresh source evidence and declared source refs.

## Why It Matters

Harlan's first useful loop now has an enforceable shape before any runtime, voice, UI, or external-write expansion. He cannot sound current from memory or hidden worker output.

## Where It Lives

- `lib/harlan-operator-loop.js`
- `scripts/process-harlan-operator-loop-check.mjs`
- `docs/agents/harlan-operator-loop.md`
- `docs/agents/harlan.md`
- `lib/foundation-runtime-reliability-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-agent-runtime-records.js`
- `docs/process/harlan-operator-loop-v1-001-plan.md`
- `docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

- `node --check lib/harlan-operator-loop.js lib/foundation-runtime-reliability-verifier.js scripts/process-harlan-operator-loop-check.mjs scripts/foundation-verify.mjs`
- `npm run process:harlan-operator-loop-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --closeoutKey=harlan-operator-loop-v1`
- `npm run process:foundation-ship -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --commitRef=HEAD`

## Known Limits

This does not implement Harlan's live runtime, UI, voice, avatar, private profile storage, Telegram behavior, provider/model calls, live extraction, external Harlan home, or external-write authority.

## Next

Continue with `BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001` unless repo truth surfaces a higher P0 repair.
