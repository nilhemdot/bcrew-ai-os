# FOUNDATION-VERIFY-REGISTRY-SPLIT-001 Plan

## What

Build the narrow V1 card `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`.

V1 converts the stale nightly-audit `foundation-verify-monolith` finding into a real verifier registry boundary. The root verifier stays as an orchestration script under the 5,000-line clean target. The nested module-assurance and backend-split structural dependencies move out of `scripts/foundation-verify.mjs` and live with `lib/foundation-verifier-structural-assurance-core.js`. A new registry proof in `lib/foundation-verify-registry-split.js` names the required verifier split domains and proves the root only delegates to those domains.

## Why

The May 18 nightly audit still proposes `FOUNDATION-VERIFY-REGISTRY-SPLIT-001` because `scripts/foundation-verify.mjs` matches the old large execution surface pattern. Repo truth has moved: prior verifier splits already reduced the root to roughly 4,975 lines, but the audit detector still hard-flags it by pattern instead of checking whether the root is under budget and registered.

Operator value: Steve should see a real remaining verifier-monolith risk when it exists, not a stale P0 after the root is below budget and split domains are explicit. This keeps Foundation audit priority useful while preserving the real builder workflow and the full verifier gate.

## Acceptance Criteria

- `scripts/foundation-verify.mjs` remains below 5,000 lines.
- `scripts/foundation-verify.mjs` no longer imports or passes the nested module-assurance/backend-split structural dependency constants and function handles.
- `lib/foundation-verifier-structural-assurance-core.js` owns those nested structural dependencies.
- `lib/foundation-verify-registry-split.js` contains a unique registry of required verifier split domains and a focused evaluator.
- The nightly code-quality audit no longer hard-flags `foundation-verify-monolith` when the root is under 5,000 lines and the registry split exists.
- Dogfood proof recreates the failure class and rejects an oversized root, missing registry domain, duplicate registry domain, nested root ownership, and stale audit hard-flag behavior.
- Live backlog, Plan Critic, approval, closeout, package script, coverage, and focused proof all name `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`.

## Definition Of Done

- Plan approval validates at 9.8 or higher.
- Live backlog card exists in executing or done and closes under `foundation-verify-registry-split-v1`.
- Focused proof passes: `npm run process:foundation-verify-registry-split-check -- --json`.
- Existing structural split proof still passes: `npm run process:verifier-structural-assurance-core-split-check -- --json`.
- Backlog hygiene passes.
- `foundation:verify` passes.
- Full `process:foundation-ship` passes before push.
- Proof command for `FOUNDATION-VERIFY-REGISTRY-SPLIT-001` must pass with a Plan Critic score of 9.8 or higher and no revise finding: `npm run process:foundation-verify-registry-split-check -- --json`.

## Details

Existing code to reuse:

- `lib/foundation-verifier-structural-assurance-core.js` already owns the structural assurance wrapper.
- `lib/foundation-verifier-module-assurance.js` already runs the verifier check-of-checks layer.
- `lib/code-quality-nightly-audit.js` already owns the `foundation-verify-monolith` detector.
- `lib/foundation-verify-coverage-card-ids.js` is already included by `foundation:verify` coverage source.
- `lib/foundation-build-closeout-tightening-records.js` already houses verifier monolith cleanup closeouts.

Existing docs/scripts/backlog truth to reuse:

- Existing verifier split plans and closeouts from May 15 to May 17.
- Live backlog truth for the completed `VERIFIER-MODULE-ASSURANCE-SPLIT-001` and `VERIFIER-STRUCTURAL-ASSURANCE-CORE-SPLIT-001` cards.
- Existing `process:verifier-structural-assurance-core-split-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Root invariant: a resolved Foundation verifier root is not "any script with `main()`"; it is a root under 5,000 lines, with split domains registered, nested structural dependencies owned outside the root, and the nightly audit behavior proving it does not hard-flag a resolved root. Substring checks can support artifact wiring, but the proof must call the real registry evaluator and the real nightly audit function path; substring-only proof is rejected.

Not next:

- No arbitrary tail extraction.
- No broad verifier rewrite.
- No change to verifier scoring semantics.
- No active sprint overlay replacement outside this card's live backlog ownership.
- No source extraction, connector auth, paid calls, external writes, Drive permission mutation, Agent Feedback auto-send, Harlan, Fal, Canva feature work, voice work, or UI redesign.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Drive permissions mutation.

## Risks

- Moving structural dependency imports could drop a required input. The existing structural split proof and full `foundation:verify` must catch that.
- The nightly audit fix could silence a real monolith risk. The detector only suppresses the `foundation-verify` finding when the root is under 5,000 lines and the registry split exists.
- The registry could become another stale list. The focused proof rejects missing and duplicate required domains, and the verifier module assurance layer runs it during `foundation:verify`.
- If proof fails, repair the exact missing dependency, registry entry, or audit detector branch. If the boundary is wrong, revert only this card's registry/root-dependency changes and reopen the card.

## Tests

Gate decision tree:

- Static gate: `node --check` for the changed verifier, registry, audit, and focused proof files.
- Focused gate: `process:foundation-verify-registry-split-check` and the existing structural assurance split check.
- Full gate: required because this touches `foundation:verify`, the nightly audit detector, package scripts, closeout registry, and done-card verifier coverage.
- Speed bound: the focused proof should run in under 2 minutes; the full ship gate uses the standard bounded Foundation ship path.

Commands:

```bash
node --check lib/foundation-verify-registry-split.js lib/foundation-verifier-structural-assurance-core.js lib/foundation-verifier-module-assurance.js lib/code-quality-nightly-audit.js scripts/foundation-verify.mjs scripts/process-foundation-verify-registry-split-check.mjs
npm run process:foundation-verify-registry-split-check -- --json
npm run process:verifier-structural-assurance-core-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-REGISTRY-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-REGISTRY-SPLIT-001.json --closeoutKey=foundation-verify-registry-split-v1 --commitRef=HEAD
```
