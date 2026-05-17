# VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001 Plan

Card: `VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001`

## What

Move only the extraction-runtime orchestration layer out of `scripts/foundation-verify.mjs` and into `lib/foundation-extraction-runtime-verifier.js`.

V1 covers the root verifier handoff that calls the existing extraction-runtime verifier, pushes its checks, proves the historical extraction-runtime module split remains closed, and keeps the dogfood proof for worker reaping, quota, Drive extraction support, LLM provenance, extract-retire, and extract-retry failures in the module. It does not move surface trust, operator budget, hub safety, process hardening, process trust, connector auth, route budgets, source UI checks, frontend assurance, or unrelated verifier domains.

`scripts/foundation-verify.mjs` remains the orchestrator. It gathers the same live payloads, Foundation Hub payload, source text, and runtime gaps, calls `evaluateFoundationExtractionRuntimeVerifierOrchestration({ ... })`, and pushes returned checks into the canonical check list. The existing `activeFoundationSprintForExtractionRuntime` lookup stays in the root because downstream verifier domains still use it.

## Why

The verifier is still above the under-5K clean target. This sprint removes a real extraction-runtime orchestration domain from the root verifier instead of moving arbitrary tail code.

Operator value: Steve keeps proof that worker failure handling, stale run/call reaping, extraction target control, source crawl ledger truth, Drive/Gmail/video extraction support, shared-comms LLM provenance, and extraction retry/retire governance did not weaken while the root verifier gets smaller.

## Acceptance Criteria

- `lib/foundation-extraction-runtime-verifier.js` owns `evaluateFoundationExtractionRuntimeVerifierOrchestration()`.
- `scripts/foundation-verify.mjs` delegates through `evaluateFoundationExtractionRuntimeVerifierOrchestration({ ... })` and no longer owns the extraction-runtime module call, historical split self-check, or dogfood call inline.
- The focused proof calls the real `buildFoundationExtractionRuntimeVerifierDogfoodProof()` path.
- Dogfood proof recreates the failure class and rejects missing worker reapers, corpus quota controls, Drive extraction support, LLM provenance, extract-retire coverage, and extract-retry coverage.
- `scripts/process-verifier-extraction-runtime-orchestration-split-check.mjs` is read-only and verifies approval, backlog truth, ownership, Plan Critic/closeout truth, package script registration, line-count decrease, module ownership, historical proof compatibility, and root delegation.
- No active sprint overlay replacement.
- No arbitrary tail extraction.
- `scripts/foundation-verify.mjs` line count decreases from the JS-counted baseline of 6,490 and keeps moving toward the under-5K clean target.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in `executing` or `done`.
- Active or historical ownership exists without replacing the active overlay.
- Focused proof script passes with `npm run process:verifier-extraction-runtime-orchestration-split-check -- --json`.
- The historical focused proof still passes with `npm run process:verifier-extraction-runtime-split-module-check -- --json`.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:ship-check` passes for this card and closeout key.
- Full `npm run process:foundation-ship` passes before commit/push.

## Details

Reuse existing repo truth:

- Existing extraction-runtime evaluator and dogfood proof in `lib/foundation-extraction-runtime-verifier.js`.
- Existing extraction-runtime checks and historical self-check in `scripts/foundation-verify.mjs`.
- Existing Foundation Hub payloads, source reads, runtime gap queries, package script map, approval integrity, and build closeout registry.
- Existing focused verifier split proof pattern from the intelligence-spine, process-hardening, and core-governance orchestration splits.
- Existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/`, and `docs/handoffs/`.
- Foundation main session owns this active sprint scope. Any connector-auth, source extraction, Harlan, Canva, Fal, voice, paid call, email send, or hub feature work must stop-and-coordinate through main session approval before touching shared Foundation files, committing, pushing, or shipping.

Root invariant:

- The verifier must prove extraction runtime through actual live backlog cards, current plan/state, approval files, package scripts, source text, build closeouts, runtime gap queries, and dogfood proof.
- This split must not make the active sprint or current blocker into an escape hatch, bypass, or force-pass condition.
- The synthetic dogfood case must fail closed when the underlying invariant is broken, even if a root substring or old inline predicate still exists.
- The module boundary must preserve behavior; it is not a place to loosen worker reaping, source crawl ledger proof, target runner controls, extraction quota missions, Drive/Gmail/video extraction support, shared-comms LLM provenance, stale LLM call handling, extraction retry, extraction retire, or closeout enforcement.

Not next:

- No connector auth, source extraction job changes, paid call, email send, Canva, Fal, ElevenLabs, voice, or Harlan runtime work.
- No behavior rewrite of extraction runtime, surface trust, process hardening, process trust, runtime reliability, structural assurance, or Plan Critic scoring.
- No DB seed overwrite or live-state verifier mutation.
- No replacement of the active sprint overlay.
- No route split, connector split, source extraction implementation, or arbitrary tail extraction in this sprint.

Rollback or repair path:

- If focused proof or `foundation:verify` fails, keep the module boundary but repair the exact failing assertion or input handoff.
- If the module boundary itself is wrong, revert only this sprint's root delegation/module/doc additions before commit.
- Do not weaken checks into substring-only proof to make the split pass.

Gate decision:

- Gate decision tree uses static, focused, and full based on blast radius.
- Full gate is required because `scripts/foundation-verify.mjs`, `package.json`, and protected Foundation process docs change.
- Focused proof runs first to catch the exact extraction-runtime orchestration failure mode quickly.
- Static syntax checks cover the changed code files.
- Full `process:foundation-ship` remains the final gate and keeps runtime proof bounded to the standard ship path.

## Risks

- Moving this orchestration can accidentally drop an extraction-runtime check, Foundation Hub handoff, runtime gap handoff, or closeout proof; `foundation:verify` and the focused proof catch that by executing the real module path.
- The proof still contains artifact marker checks, so it must explicitly reject substring-only proof and keep behavior proof anchored in dogfood plus real `foundation:verify`.
- The verifier remains above the under-5K clean target after this sprint; the next sprint must pick another coherent domain from repo truth.
- The gate must stay fast and proportional: focused proof should run in well under 2 minutes, and the full gate should use the existing standard ship path rather than a custom heavy process.

## Tests

```bash
node --check lib/foundation-extraction-runtime-verifier.js
node --check scripts/process-verifier-extraction-runtime-orchestration-split-check.mjs
node --check scripts/process-verifier-extraction-runtime-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-extraction-runtime-orchestration-split-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-extraction-runtime-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:foundation-ship -- --card=VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-EXTRACTION-RUNTIME-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-extraction-runtime-orchestration-split-v1 --commitRef=HEAD
```
