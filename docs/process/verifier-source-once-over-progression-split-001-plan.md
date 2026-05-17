# VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 Plan

Card: `VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001`

## What

Move only the Source Once-Over / strategy-feature progression verifier domain out of `scripts/foundation-verify.mjs` and into `lib/foundation-verifier-source-once-over-progression.js`.

V1 starts at `STRATEGY-HUB-MEETING-READY-001` and ends at `FOUNDATION-UI-COMPLETE-001`. It includes Strategy meeting packet, Avatar import, Auto Deploy rollback, source maturity grid, source extraction coverage, source coverage closeout, marketing source map, brand stack, tier behavioral completion, verification runs, per-user changelog, restricted decision queue, and Foundation UI Complete checks.

`scripts/foundation-verify.mjs` remains the orchestrator: it collects live data, imports the focused module, passes the existing verifier inputs through one evaluator call, and pushes returned checks into the canonical check list.

## Why

The verifier root is below the 10K emergency threshold, but the real clean target is under 5K. This sprint reduces the remaining monolith by a real domain boundary instead of moving an arbitrary tail for line count.

Operator value: Steve can keep trusting `foundation:verify` in the real builder workflow while the root shrinks, because the Source Once-Over progression proof still checks the same live backlog, approval, build-log, route, UI, sprint-state, and synthetic behavior conditions through a named module boundary. This unlocks better Foundation quality and speed: future builder chats can inspect one focused module instead of wading through another thousand inline verifier lines.

## Acceptance Criteria

- `lib/foundation-verifier-source-once-over-progression.js` owns the Source Once-Over progression evaluator and dogfood proof.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationVerifierSourceOnceOverProgression({ ... })` and no longer contains the old inline Source Once-Over build-log exact predicates.
- The focused proof calls the real `buildFoundationVerifierSourceOnceOverProgressionDogfoodProof()` function path.
- The focused proof must reject substring-only proof; marker checks can support artifact wiring, but they cannot be the behavior proof.
- Dogfood proof recreates the failure class and rejects hidden Strategy meeting, Avatar import, source coverage, marketing/brand, verification/decision, Foundation UI Complete, and old-inline-predicate failures.
- `scripts/process-verifier-source-once-over-progression-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 9,984 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-source-once-over-progression-split-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing Source Once-Over card constants and synthetic proof builders in `lib/strategy-hub-meeting-ready.js`, `lib/marketing-avatar-registry.js`, `lib/auto-deploy-rollback.js`, `lib/source-maturity-grid.js`, `lib/source-extraction-coverage.js`, `lib/source-coverage-closeout.js`, `lib/marketing-source-map.js`, `lib/brand-stack.js`, `lib/tier-behavioral-completion.js`, `lib/verification-runs.js`, `lib/per-user-changelog.js`, `lib/decision-restricted-queue.js`, and `lib/foundation-ui-complete.js`.
- Existing root verifier data collection and live payload fetches in `scripts/foundation-verify.mjs`.
- Existing closeout validation and Recent Builds metadata pattern in `lib/foundation-build-closeout-tightening-records.js`.
- Existing read-only verifier split proof pattern from the Phase G, readiness blocker, and sprint-gate split scripts.

Root invariant:

- The verifier must prove shipped Source Once-Over card behavior through actual artifact, closeout, live backlog, DB, route, UI, and function-path evidence.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.

Not next:

- No connector auth, source extraction job, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of Source Once-Over checks.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No Connector Routing Truth, process governance, runtime reliability, process hardening, or source-contract extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact verifier split failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving a large block can accidentally drop one input from the root-to-module handoff; `foundation:verify` and the focused proof catch that by executing the real evaluator.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-verifier-source-once-over-progression.js scripts/process-verifier-source-once-over-progression-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-once-over-progression-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-source-once-over-progression-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --closeoutKey=verifier-source-once-over-progression-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-source-once-over-progression-split-v1 --commitRef=HEAD
```
