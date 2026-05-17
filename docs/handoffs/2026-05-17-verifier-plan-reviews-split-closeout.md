# VERIFIER-PLAN-REVIEWS-SPLIT-001 Closeout

Date: 2026-05-17
Card: `VERIFIER-PLAN-REVIEWS-SPLIT-001`
Closeout key: `verifier-plan-reviews-split-v1`

## What Changed

Extracted repeated Plan Critic review construction from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-plan-reviews.js`.

## What It Does

The canonical verifier now delegates the 14 historical plan-review setup calls to a focused helper and keeps the same downstream review variable names and verifier predicates.

## Why It Matters

The verifier is still above the monolith danger threshold. This removes another coherent setup block from the root file without changing behavior, making the trust layer easier to inspect and harder to grow by accident.

## Where It Lives

- `lib/foundation-verifier-plan-reviews.js`
- `scripts/foundation-verify.mjs`
- `scripts/process-verifier-plan-reviews-split-check.mjs`
- `package.json`
- `docs/process/verifier-plan-reviews-split-001-plan.md`
- `docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json`
- `docs/handoffs/2026-05-17-verifier-plan-reviews-split-closeout.md`

## Proof Commands

- `node --check lib/foundation-verifier-plan-reviews.js scripts/process-verifier-plan-reviews-split-check.mjs scripts/foundation-verify.mjs`
- `npm run process:verifier-plan-reviews-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-PLAN-REVIEWS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json --closeoutKey=verifier-plan-reviews-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-PLAN-REVIEWS-SPLIT-001 --closeoutKey=verifier-plan-reviews-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-PLAN-REVIEWS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json --closeoutKey=verifier-plan-reviews-split-v1 --commitRef=HEAD`

## Proof Status

Focused proof calls the actual helper, verifies weak synthetic plan-review fixtures are rejected, confirms the root verifier delegates through `buildFoundationVerifierPlanReviews`, and confirms `scripts/foundation-verify.mjs` line count decreased from 12,628 to the post-split count.

## Known Limits

- This does not split the whole verifier.
- This does not move the large source-once-over ensure blocks yet.
- This does not change Plan Critic scoring, app routes, source contracts, or verifier behavior.
- This does not build connectors, source extraction, hub features, Canva, Fal, ElevenLabs, or Harlan terminal/runtime work.

## Review Next

Continue `VERIFIER-MONOLITH-FINAL-CLOSEOUT-001` with the next coherent verifier proof-domain split, prioritizing a larger source-once-over or current-sprint process block once this small split ships cleanly.
