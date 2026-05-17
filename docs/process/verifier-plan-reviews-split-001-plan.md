# VERIFIER-PLAN-REVIEWS-SPLIT-001 Plan

## What

Extract the historical Plan Critic review construction block from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-plan-reviews.js`.

This is a verifier monolith cleanup slice only. The canonical verifier keeps the same review variables and the same PASS/FAIL predicates, but the repeated `evaluatePlanCriticPlan` construction for source-once-over and security/strategy cards moves behind one focused helper.

## Why

`scripts/foundation-verify.mjs` is still over the active-danger threshold. It grew because every new proof added more inline verifier setup. The plan-review construction block was not domain behavior; it was repeated setup. Keeping it inline makes the verifier harder to inspect and easier to grow by accident.

The useful operator value is that Steve can trust the verifier as a maintained proof surface instead of another giant file that quietly grows back past the danger line. This card is active sprint scope and main session owns the shared Foundation files it changes.

## Acceptance Criteria

- `lib/foundation-verifier-plan-reviews.js` owns the repeated `evaluatePlanCriticPlan` setup for the 14 historical plan-review variables.
- `scripts/foundation-verify.mjs` delegates to `buildFoundationVerifierPlanReviews` and no longer constructs `securityBehaviorPlanReview` inline.
- The canonical verifier still uses the same review variables in the same downstream checks.
- `scripts/process-verifier-plan-reviews-split-check.mjs` proves the helper exists, the root verifier delegates, weak synthetic plan-review fixtures are rejected, and root verifier line count decreased.
- Dogfood proof recreates the failure class: weak plans that only add to the verifier and claim `node --check` proof must not pass.
- Substring-only proof is rejected; the focused proof calls the actual helper and inspects real Plan Critic statuses.
- No route behavior, source extraction, hub UI, Canva, Fal, voice, paid-source auth, or feature work.

## Definition Of Done

- Live backlog has `VERIFIER-PLAN-REVIEWS-SPLIT-001` in done under `verifier-plan-reviews-split-v1`.
- `docs/process/verifier-plan-reviews-split-001-plan.md` and `docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a pass row at 9.8+ for this plan.
- Focused proof passes: `npm run process:verifier-plan-reviews-split-check -- --json`.
- Full proof passes: `npm run foundation:verify -- --json-summary`.
- Full ship gate passes before push.

## Details

Existing code to reuse: the repeated plan-review construction block in `scripts/foundation-verify.mjs`, the `evaluatePlanCriticPlan` function in `lib/process-plan-critic.js`, the focused verifier split proof script pattern, and the Foundation ship/fanout gates.

Split plan: move setup only. Do not change Plan Critic scoring, review inputs, downstream verifier checks, or acceptance thresholds. The root verifier will import `buildFoundationVerifierPlanReviews`, pass live backlog cards plus plan-source text, and keep the existing review variable names by destructuring the helper result.

Verifier/check posture: the focused proof script is read-only. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, raw backlog SQL writes, foundation sprint writes, or filesystem writes.

Dogfood proof recreates the failure class by feeding the helper weak synthetic plan text for all 14 review slots. The proof fails if any weak review returns `pass`, because that would mean the extracted helper is rubber-stamping the same kind of theater Plan Critic exists to block.

Gate decision tree: static checks (`node --check`) run first; the focused proof script then validates the split behavior and dogfood failure mode; `foundation:verify` and `process:foundation-ship` remain the full gate before push. The focused proof is fast and speed-bounded under 2 minutes because it reads local files, approval metadata, backlog/card state, and the actual helper output only. It does not call external providers or run broad extraction.

## Risks

- Risk: extracted helper changes changed-file lists and accidentally weakens Plan Critic review.
  - Response path: keep the moved changed-file lists byte-for-byte equivalent and rely on full `foundation:verify` downstream checks.
- Risk: this becomes a broad verifier rewrite.
  - Response path: only the plan-review construction moves. No ensure blocks or domain checks move in this card.
- Risk: proof becomes substring theater.
  - Response path: focused proof calls the helper and verifies weak synthetic plans fail.
- Risk: proof fails or the split regresses behavior.
  - Response path: stop, revert only this card's extraction if needed, restore the inline block from git history, rerun focused proof, and do not ship until `foundation:verify` and `process:foundation-ship` pass.

## Tests

```bash
node --check lib/foundation-verifier-plan-reviews.js scripts/process-verifier-plan-reviews-split-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-plan-reviews-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-PLAN-REVIEWS-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PLAN-REVIEWS-SPLIT-001.json --closeoutKey=verifier-plan-reviews-split-v1 --commitRef=HEAD
```

## Not Next

- Do not split the whole verifier in this card.
- Do not build connectors or source extraction.
- Do not touch Marketing/Sales/Ops hub features.
- Do not wire Canva, Fal, ElevenLabs, Harlan terminal work, or Marketing Video Lab.
- Do not change source contracts, app routes, auth, DB schema, or package dependencies.
