# CRITICAL-FILES-UNDER-5K-001 Plan

Card: `CRITICAL-FILES-UNDER-5K-001`
Closeout key: `critical-files-under-5k-v1`

## What

Finish the emergency critical-file cleanup threshold by reducing `scripts/foundation-verify.mjs` below 5,000 lines while confirming `server.js`, `lib/foundation-db.js`, and `public/foundation.js` remain below 5,000.

## Why

The root verifier was the last critical source file above the 5,000-line hard-problem threshold. Leaving it there would make every later Foundation change riskier, slower to review, and easier to break with substring-only proof.

Useful operator behavior: Steve can look at the Foundation queue and know the system is no longer carrying an over-5,000-line critical root before authorizing the next sprint. Future builders get a smaller root verifier, clear module ownership, and a proof path that still catches real unsafe direct-model-host behavior instead of trusting line-count movement.

## Acceptance Criteria

- `scripts/foundation-verify.mjs` is below 5,000 lines.
- `server.js`, `lib/foundation-db.js`, and `public/foundation.js` remain below 5,000 lines.
- The verifier split is domain-based, not an arbitrary tail cut.
- Focused proof recreates a real unsafe direct-model-host failure and proves the extracted verifier runtime support still fails closed.
- Plan Critic architectural rules remain healthy after the split.
- `foundation:verify`, `backlog:hygiene`, and the full Foundation ship gate pass before push.

## Definition Of Done

- Live Backlog contains `CRITICAL-FILES-UNDER-5K-001` as done with `critical-files-under-5k-v1` closeout proof.
- Plan approval exists at `docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json` and validates against this approved plan.
- Closeout registry exposes `critical-files-under-5k-v1` through `getFoundationBuildCloseouts()`.
- ID-named verifier coverage includes `CRITICAL-FILES-UNDER-5K-001`.
- The closeout handoff records before/after line counts, proof commands, not-next boundaries, and next queued sprint.
- Full `process:foundation-ship` passes before commit and push.

## Details

Implementation shape:

- Move shipped-card coverage ID registries into `lib/foundation-verify-coverage-card-ids.js`.
- Move verifier CLI/runtime support, timing/profile helpers, health-script runners, repo/runtime probes, and direct model host audit logic into `lib/foundation-verify-runtime-support.js`.
- Add `lib/foundation-verify-coverage-source.js` so historical status builders can verify coverage against the root verifier plus extracted coverage IDs.
- Keep `scripts/foundation-verify.mjs` as orchestration only and include extracted support modules in source-proof bundles where the verifier checks moved implementation evidence.

Existing work to reuse:

- Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth instead of rebuilding the Foundation process layer.
- `scripts/foundation-verify.mjs` root orchestration and existing verifier timing/profile behavior.
- Existing shipped-card coverage constants from the root verifier.
- Existing direct model host audit logic and allowlist behavior.
- Existing historical status builders: `lib/foundation-followup-card-capture.js`, `lib/foundation-systems-service-grouping.js`, and `lib/system-registration-sweep.js`.
- Existing Foundation ship gates: `foundation:verify`, `backlog:hygiene`, `process:plan-critic-architectural-rules-check`, `process:foundation-ship`, `process:ship-check`, `process:fanout-check`, and `process:post-ship-fanout`.
- Existing closeout registry path through `lib/foundation-build-closeout-records.js` and `lib/foundation-build-log-source.js`.
- Existing live Backlog truth in `backlog_items` and durable Plan Critic rows in `plan_critic_runs`.

Gate decision tree: this card is a full-gate change. It touches the canonical Foundation verifier, live backlog truth, process approvals, closeout registry truth, and verifier coverage, so static or focused-only proof is not enough. The focused dogfood runs first; the final gate is `npm run process:foundation-ship -- --card=CRITICAL-FILES-UNDER-5K-001 --planApprovalRef=docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json --closeoutKey=critical-files-under-5k-v1 --commitRef=HEAD`.

Behavior proof rule: no substring-only proof. The focused dogfood must accept clean/adapter-owned host references and reject an unsafe direct model host reference.

Speed budget: keep the focused dogfood fast and under 1 minute locally. The full ship wrapper should remain inside the existing 5-minute Foundation target; if it runs over target but passes, profile the slow step before the next gate-performance pass.

## Risks

- Risk: moving coverage constants causes historical done-card checks to go red.
  - Repair path: status builders read the verifier coverage source bundle instead of assuming every coverage literal remains in the root verifier.
- Risk: moving runtime support hides profile/timing implementation evidence from runtime-reliability checks.
  - Repair path: include the runtime-support module in the verifier source bundle used for internal proof.
- Risk: line-count pressure leads to arbitrary splitting.
  - Repair path: keep the split by responsibility: coverage IDs, runtime support, and source aggregation.

## Tests

```text
node --check scripts/foundation-verify.mjs
node --check lib/foundation-verify-coverage-card-ids.js
node --check lib/foundation-verify-runtime-support.js
node --check lib/foundation-verify-coverage-source.js
node --check lib/foundation-followup-card-capture.js
node --check lib/foundation-systems-service-grouping.js
node --check lib/system-registration-sweep.js
node --input-type=module -e "import { buildFoundationVerifyRuntimeSupportDogfoodProof } from './lib/foundation-verify-runtime-support.js'; const proof = buildFoundationVerifyRuntimeSupportDogfoodProof(); console.log(JSON.stringify({ ok: proof.ok, invariant: proof.dogfoodInvariant, rejected: proof.rejected }, null, 2)); if (!proof.ok) process.exit(1)"
npm run process:plan-critic-architectural-rules-check
npm run foundation:verify -- --failures-only
npm run foundation:verify
npm run backlog:hygiene -- --json
npm run process:foundation-ship -- --card=CRITICAL-FILES-UNDER-5K-001 --planApprovalRef=docs/process/approvals/CRITICAL-FILES-UNDER-5K-001.json --closeoutKey=critical-files-under-5k-v1 --commitRef=HEAD
```

## Not Next

Do not touch Harlan, Fal, voice, Canva feature work, hub feature work, connector auth, Agent Feedback send jobs, DB schema, route behavior, or Foundation value work in this card.
