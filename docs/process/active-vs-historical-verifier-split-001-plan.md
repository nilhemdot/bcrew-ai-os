# ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001 Plan

Status: approved for build
Card: `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
Sprint: `active-vs-historical-verifier-split-2026-05-15`
Closeout key: `active-vs-historical-verifier-split-v1`

## What

Add a focused verifier helper that separates active live-truth assertions from historical closeout assertions, then migrate one verifier reliability cluster to that helper as proof.

V1 creates a small module for two explicit modes:

- `active_live_truth`: current operational truth must match the current live value and fails closed when stale.
- `historical_closeout`: old shipped work is proven by live done-lane backlog truth plus its matching verified closeout, without requiring the old sprint to still be active.

The verifier receives thin delegated coverage only. The actual behavior proof lives in the helper and focused process script.

## Why

The 2026-05-14 nightly audit found verifier checks that mixed active truth with historical closeout proof. That pattern creates false blockers after sprint rollover and encourages dangerous hardcoded exceptions. The fix is not another bypass. The fix is an explicit boundary: active assertions fail on stale live state, and historical assertions use immutable closeout evidence.

Root invariant: an active verifier assertion must prove the current live value still matches live truth, while a historical verifier assertion must prove the live Backlog card is done and the matching verified closeout exists. The check should prove that stale active truth fails closed, and that old sprint proof does not depend on the old sprint still being active.

Useful operator behavior: Steve can trust that a green verifier means current live truth is still current, while old closeouts remain valid proof after the active sprint moves on. This unlocks faster Foundation work because the ship gate stops confusing stale active state with valid historical evidence.

## Acceptance Criteria

- A new focused helper exposes active live-truth evaluation and historical closeout evaluation as separate function paths.
- Active live-truth dogfood fails when the current value is stale, even if a verified historical closeout exists.
- Historical closeout dogfood passes when a card is done and the matching verified closeout exists.
- Historical closeout dogfood fails when the card is not done, the closeout is missing, or the closeout key is wrong.
- One verifier cluster delegates to the helper instead of adding another inline `activeSprintAtOrPast` style bypass.
- The focused proof script is read-only and does not mutate backlog, Current Sprint, files, source truth, or external systems.

## Definition Of Done

- `docs/process/approvals/ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001.json` exists and validates at score `>= 9.8`.
- `npm run process:active-vs-historical-verifier-split-check -- --json` passes.
- Dogfood proof recreates the audit failure mode: stale active live truth fails closed even when historical closeout evidence exists.
- Dogfood proof also proves historical closeout evidence passes only when the live card is done and the closeout is verified.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001 --planApprovalRef=docs/process/approvals/ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001.json --closeoutKey=active-vs-historical-verifier-split-v1 --commitRef=HEAD` passes before push.
- Live backlog card is `done`, Current Sprint shows the card in `done_this_sprint`, and closeout key `active-vs-historical-verifier-split-v1` is in the build-log registry.

## Details

Implementation path:

1. Add `lib/foundation-active-historical-verifier.js` with constants, active assertion evaluation, historical closeout evaluation, and synthetic dogfood proof.
2. Add `scripts/process-active-vs-historical-verifier-split-check.mjs` as the read-only focused proof.
3. Register `process:active-vs-historical-verifier-split-check` in `package.json`.
4. Add thin `scripts/foundation-verify.mjs` coverage that calls the helper dogfood proof and validates the package script and live card state.
5. Add closeout record and update rebuild docs/current sprint truth.

Existing work reused:

- Existing code: `lib/foundation-verifier-sprint-proof.js`, `lib/sprint-check-historical-mode.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-db.js`.
- Existing docs: `docs/handoffs/nightly-deep-audit-2026-05-14.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/process-sprint-check-historical-mode-check.mjs`, `scripts/process-live-truth-verify-decouple-check.mjs`, and the current focused process proof pattern.
- Existing policy: `SPRINT-CHECK-HISTORICAL-MODE-001` keeps focused sprint checks valid after rollover, and `LIVE-TRUTH-VERIFY-DECOUPLE-001` labels historical/bootstrap current-sprint literals.
- Existing audit/backlog truth: live backlog card `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`, Current Sprint DB state, and the nightly audit finding `active-vs-historical-verifier-mixing`.

Split plan for oversized files: `scripts/foundation-verify.mjs` receives only thin import/delegation coverage. New proof behavior lives in `lib/foundation-active-historical-verifier.js` and the focused script.

Actual function path: proof calls `evaluateActiveLiveTruthAssertion()`, `evaluateHistoricalCloseoutAssertion()`, and `buildActiveVsHistoricalVerifierSplitDogfoodProof()` directly. Substring-only proof is rejected; source markers can only support the behavior proof.

Gate decision tree: static syntax checks cover changed JS/JSON, focused proof validates the real helper behavior, and the full ship gate is required because this changes verifier trust, package scripts, docs, Current Sprint truth, and Recent Builds closeout.

## Risks

- Risk: The new helper becomes another broad bypass.
  - Repair path: active live-truth evaluation never accepts historical closeout evidence; the dogfood proof explicitly shows stale active truth fails even with a verified closeout present.
- Risk: Historical proof becomes too loose.
  - Repair path: historical mode requires live done-lane backlog truth and the matching verified closeout key/backlog ID.
- Risk: The verifier monolith grows again.
  - Repair path: verifier receives only thin coverage; behavior stays in the focused module.
- Risk: This expands into broad verifier cleanup.
  - Repair path: V1 migrates one verifier reliability cluster only. Further migration needs separate cards.

## Tests

Run in order:

```bash
node --check lib/foundation-active-historical-verifier.js scripts/process-active-vs-historical-verifier-split-check.mjs scripts/foundation-verify.mjs
npm run process:active-vs-historical-verifier-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001 --planApprovalRef=docs/process/approvals/ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001.json --closeoutKey=active-vs-historical-verifier-split-v1 --commitRef=HEAD
```

Not next: broad verifier rewrite, adding or expanding `activeSprintAtOrPast` bypasses, migrating every historical check, DB seed split, hub UI, Marketing Video Lab wiring, Build Intel extraction, paid-source auth, Meeting Vault Phase B, or Drive permission mutation.
