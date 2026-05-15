# VERIFIER-MONOLITH-SPLIT-CONTINUE-001 Plan

## What

Extract the route-split verifier checks from `scripts/foundation-verify.mjs` into a focused module.

V1 moves the verifier logic for these already-shipped route split cards:

- `SERVER-ROUTE-SPLIT-001`
- `SOURCE-ROUTE-SPLIT-001`
- `BUILD-INTEL-ROUTE-SPLIT-001`

The canonical verifier still emits the same three ID-named checks, but the detailed card, closeout, module ownership, old-inline-marker, route payload, current-plan/current-state, and sprint-stage predicates live in `lib/foundation-route-split-verifier.js`.

## Why

`scripts/foundation-verify.mjs` is almost 15,000 lines and grew again during the operator/source/Build Intel route splits. That is the rot pattern Steve called out: every good cleanup adds another inline verifier block, so the verifier itself becomes harder to trust and harder to change.

This is cleanup, not a feature. The operator value is a smaller and clearer verifier boundary: future route-split proof can reuse one module instead of adding another 100-line inline block to the canonical verifier. It unlocks safer Foundation cleanup because the full verifier remains the source of truth while focused behavior lives in modules with dogfood proof.

## Acceptance Criteria

- New module `lib/foundation-route-split-verifier.js` owns the route-split verifier definitions and evaluation logic.
- `scripts/foundation-verify.mjs` imports and delegates to that module instead of keeping the three route-split checks inline.
- The canonical verifier still prints the same three route split PASS/FAIL rows for server, source/control, and Build Intel route splits.
- A focused proof script `scripts/process-verifier-route-split-module-check.mjs` dogfoods the module with passing and failing fixtures.
- Dogfood recreates the old failure classes: inline route markers still present, missing module route marker, wrong payload/closeout, and missing closeout ownership must fail.
- The proof rejects substring-only theatre: module delegation is not accepted unless synthetic failures actually fail and live verifier still passes.
- Line-count delta is recorded for `scripts/foundation-verify.mjs` before/after the split.
- Live backlog, Current Sprint, plan approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-MONOLITH-SPLIT-CONTINUE-001` and `verifier-route-split-module-v1`.

## Definition Of Done

- `VERIFIER-MONOLITH-SPLIT-CONTINUE-001` is closed under `verifier-route-split-module-v1`.
- `docs/process/verifier-monolith-split-continue-001-plan.md` and `docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/foundation-route-split-verifier.js` owns route split verifier behavior.
- `scripts/process-verifier-route-split-module-check.mjs` passes and proves the module accepts healthy fixtures while rejecting old failure fixtures.
- `scripts/foundation-verify.mjs` loses the route-split inline blocks and delegates through `evaluateFoundationRouteSplitVerifier`.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the three route split checks currently near the bottom of `scripts/foundation-verify.mjs`, `lib/foundation-route-budget-verifier.js` module pattern, `scripts/process-foundation-ship-gate-tightening-check.mjs` module dogfood pattern, `getFoundationBuildCloseouts()`, route module sources, focused route split scripts, and current plan/state checks.

Existing docs to reuse: route split closeouts for operator/source/Build Intel, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `AGENTS.md` monolith rules, and the existing scoped backlog card.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and focused route split proof scripts as evidence inputs.

Split plan: this card touches `scripts/foundation-verify.mjs`, a file over 5,000 lines, but only to remove a coherent inline block and add a thin module call. New responsibility goes into `lib/foundation-route-split-verifier.js`. No new route behavior, no new source extraction, no hub feature work, and no write path goes into verifier/check code.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. The verifier addition is read-only coverage only; if delegation or route split proof regresses, it fails closed instead of repairing state.

Gate decision tree: static proof is insufficient because this changes canonical verifier structure. Focused proof is required with `npm run process:verifier-route-split-module-check -- --json`, which exercises module dogfood and verifies the canonical verifier delegates. Full proof is required because this touches `scripts/foundation-verify.mjs`, package scripts, live Current Sprint, and build closeouts.

## Risks

- Risk: the module changes check semantics and hides a route split regression.
  - Response path: focused dogfood includes failing fixtures for old inline route markers, missing module route markers, missing closeout ownership, and wrong payload fields.
- Risk: the verifier still grows because constants remain in the monolith.
  - Response path: route split definitions move with the evaluation module; `foundation-verify.mjs` keeps only source reads and a delegation call.
- Risk: this becomes a broad verifier rewrite.
  - Response path: only the three route-split checks move. No unrelated verifier checks are refactored in this card.
- Risk: proof becomes substring theatre.
  - Repair path: dogfood must prove the module rejects bad fixtures, and full `foundation:verify` must pass after delegation.

## Tests

```bash
node --check lib/foundation-route-split-verifier.js scripts/process-verifier-route-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-route-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-001 --planApprovalRef=docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-001.json --closeoutKey=verifier-route-split-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad fixtures that the old inline verifier could accidentally miss during future edits. Substring-only proof is rejected: the focused proof must demonstrate real pass/fail behavior from the module.

## Not Next

- Do not rewrite the whole verifier.
- Do not split `lib/foundation-db.js` or `public/foundation.js` in this card.
- Do not split every remaining `server.js` route.
- Do not touch auth/session routes.
- Do not wire Marketing Video Lab live routes.
- Do not build hub features or Sales/Ops/Marketing UI.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
