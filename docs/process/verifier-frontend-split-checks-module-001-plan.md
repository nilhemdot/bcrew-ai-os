# VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 Plan

## What

Extract the frontend split verifier checks from `scripts/foundation-verify.mjs` into a focused module.

V1 moves the verifier logic for the already-shipped frontend split cards:

- `FRONTEND-MONOLITH-SPLIT-001`
- `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`
- `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`
- `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001`
- `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001`
- `FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001`
- `FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001`
- `FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001`
- `FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001`

The canonical verifier must still emit the same ID-named PASS/FAIL rows, but detailed card, closeout, script-order, source ownership, route-owner, current-plan/current-state, and sprint-stage predicates move into `lib/foundation-frontend-split-verifier.js`.

## Why

`scripts/foundation-verify.mjs` is still over 15,000 lines. The frontend split sprint brought `public/foundation.js` below 5,000 lines, but it also left a large repeated verifier block in the trusted gate. That is the same rot pattern Steve called out: every cleanup can make the verifier itself harder to trust if proof logic keeps landing inline.

This card keeps the verifier honest while shrinking it. It is cleanup, not a feature.

## Acceptance Criteria

- New module `lib/foundation-frontend-split-verifier.js` owns frontend split verifier evaluation.
- `scripts/foundation-verify.mjs` delegates frontend split checks to that module instead of keeping the nine inline blocks.
- The canonical verifier still prints the same nine ID-named frontend split PASS/FAIL rows.
- A focused proof script `scripts/process-verifier-frontend-split-checks-module-check.mjs` dogfoods the module.
- Dogfood recreates old failure classes: missing split module source, old inline renderer still present in `public/foundation.js`, missing closeout ownership, and wrong script order must fail.
- The proof rejects substring-only theatre: delegation is not accepted unless synthetic failures fail and live verifier still passes.
- Line-count delta is recorded for `scripts/foundation-verify.mjs` before/after the split.
- Live backlog, Current Sprint, plan approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001` and `verifier-frontend-split-checks-module-v1`.

## Definition Of Done

- `VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001` is closed under `verifier-frontend-split-checks-module-v1`.
- `docs/process/verifier-frontend-split-checks-module-001-plan.md` and `docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/foundation-frontend-split-verifier.js` owns frontend split verifier behavior.
- `scripts/process-verifier-frontend-split-checks-module-check.mjs` passes and proves the module accepts healthy live fixtures while rejecting old failure fixtures.
- `scripts/foundation-verify.mjs` loses the frontend split inline blocks and delegates through `evaluateFoundationFrontendSplitVerifier`.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the nine frontend split checks currently near the bottom of `scripts/foundation-verify.mjs`, frontend split proof helpers in `lib/foundation-frontend-*.js`, `getFoundationBuildCloseouts()`, current plan/state checks, and active sprint stage helper.

Existing docs to reuse: frontend split closeouts from 2026-05-15, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `AGENTS.md` monolith rules.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the focused frontend split proof scripts as evidence inputs.

Split plan: this card touches `scripts/foundation-verify.mjs`, a file over 5,000 lines, but only to remove a coherent inline block and add a thin module call. New responsibility goes into `lib/foundation-frontend-split-verifier.js`. No UI behavior, no route behavior, no source extraction, no hub feature work, and no write path goes into verifier/check code.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. The verifier addition is read-only coverage only; if delegation or frontend split proof regresses, it fails closed instead of repairing state.

Gate decision tree: static proof is insufficient because this changes canonical verifier structure. Focused proof is required with `npm run process:verifier-frontend-split-checks-module-check -- --json`, which exercises module dogfood and verifies the canonical verifier delegates. Full proof is required because this touches `scripts/foundation-verify.mjs`, package scripts, live Current Sprint, and build closeouts.

## Risks

- Risk: the module changes check semantics and hides a frontend split regression.
  - Response path: focused dogfood includes failing fixtures for missing module source, old inline renderer source, missing closeout ownership, and wrong script order.
- Risk: the verifier still grows because constants remain in the monolith.
  - Response path: the inline frontend split check bodies move out now; remaining import/source-read cleanup can be a later bounded card if still useful.
- Risk: this becomes a broad verifier rewrite.
  - Response path: only the nine frontend split checks move. No unrelated verifier checks are refactored in this card.
- Risk: proof becomes substring theatre.
  - Repair path: dogfood must prove the module rejects bad fixtures, and full `foundation:verify` must pass after delegation.

## Tests

```bash
node --check lib/foundation-frontend-split-verifier.js scripts/process-verifier-frontend-split-checks-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-frontend-split-checks-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json --closeoutKey=verifier-frontend-split-checks-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad fixtures that an inline verifier edit could accidentally miss during future cleanup. Substring-only proof is rejected: the focused proof must demonstrate real pass/fail behavior from the module.

## Not Next

- Do not rewrite the whole verifier.
- Do not split `lib/foundation-db.js`, `server.js`, or another frontend renderer in this card.
- Do not touch auth/session routes.
- Do not wire Marketing Video Lab live routes.
- Do not build hub features or Sales/Ops/Marketing UI.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
