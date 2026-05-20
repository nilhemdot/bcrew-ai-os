# SLICE-001 Trusted Assistant Loop Plan

Card: `SLICE-001`

Closeout key: `trusted-assistant-loop-v1`

## What

Define and prove the first trusted assistant loop before wider connector, extraction, source, or agent expansion.

This card creates:

- `lib/trusted-assistant-loop.js` contract, evaluator, and dogfood proof
- `scripts/process-slice-001-check.mjs` focused proof and live Current Sprint/backlog closeout path
- `docs/agents/trusted-assistant-loop.md` operator contract
- verifier coverage and closeout registry wiring
- plan, approval, closeout, and ship proof

This card does not launch Harlan runtime, build Harlan UI, call providers/models, run live extraction, send messages, mutate Drive permissions, mutate credentials, add source access, perform paid/browser-auth work, or store raw private memory/profile values in repo truth.

## Why

The system fails if it widens before one assistant loop is genuinely trustworthy. Steve should not have to babysit every future assistant and connector boundary by memory.

Useful operator behavior unlocked: the next builder can tell whether an assistant loop is allowed to answer, degraded, or blocked; which sources it may read; which actions it may only draft; and when an unsafe action must be parked while safe sprint work continues.

For Steve's real workflow, this means Harlan can eventually answer "what is true, what changed, what is blocked, and what should happen next" without Steve translating internal system state or policing every permission boundary. It improves speed and quality because the assistant must show evidence, confidence, freshness, and approval blockers before it sounds certain.

## Acceptance Criteria

- Required source prerequisites are explicit: strategy docs, Gmail, Calendar, Drive, Foundation live truth, and private/local memory boundary.
- Required loop inputs are explicit and read-only.
- Allowed actions separate read-only answers, draft-only next actions, proposal-only routes, and approval-bound writes.
- Output contract requires answer, evidence, blocked actions, and next action.
- Current claims require evidence; memory-only current claims fail closed.
- Approval-bound blockers park the unsafe action and continue safe work.
- Missing source/input, private-memory repo leak, unsafe default write, runtime/model/extraction side effect, broad backfill, stop-whole-sprint, and missing-output fixtures fail closed.
- Current Sprint remains on the existing sprint and advances to `MARKETING-VIDEO-LAB-LIVE-SAFETY-001` after closeout.
- `backlog:hygiene`, repeated-failure gate, System Health, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `SLICE-001` is a live done card under `trusted-assistant-loop-v1`, Current Sprint points next to `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is live, team assistants are live, provider/model calls are approved, external writes are approved, Drive permission mutation is approved, or broad private extraction is approved.

## Risks

- Scope drift into a live agent launch. Mitigation: V1 is contract/proof only.
- Hidden private-memory leakage. Mitigation: repo stores schema and boundaries only; raw values fail closed.
- Approval-bound actions stopping the whole sprint. Mitigation: blockers block unsafe actions, not all safe work.
- Source widening. Mitigation: only declared read-only/current/archive sources are allowed; broad backfill and new source access fail closed.
- Thin proof. Mitigation: dogfood uses the real evaluator and rejects broken fixtures before string/doc checks matter.

## Details

Existing work to reuse:

- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `personal-agent-onboarding-contract-v1`
- `role-assistant-contracts-v1`
- `harlan-project-registry-v1`
- `harlan-operator-loop-v1`
- `SOURCE-CONTRACT-VALIDATION-LAYER-001`
- System Health, repeated-failure gate, Current Sprint metadata guard, Plan Critic, closeout registry, and Foundation ship gate

Scope boundaries:

- Tight V1 scope: contract, evaluator, dogfood proof, doc, live backlog/current sprint readback, verifier coverage, closeout, and ship proof.
- Not next: Harlan UI, live runtime, voice/avatar, provider/model calls, live extraction, broad private backfill, sends, external writes, Drive permission mutation, Calendar writes, credential mutation, source-access changes, Meeting Vault Phase B, paid/provider/browser-auth work, hidden subagents, or parallel builders.
- The exact not-next guard is required: `Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.`

Behavior proof:

- `buildTrustedAssistantLoopDogfoodProof()` runs the real `evaluateTrustedAssistantLoopContract()` function path.
- The black-box process path is `npm run process:slice-001-check -- --close-card --json`, which validates the contract function, live backlog rows, Current Sprint API truth, Plan Critic row, approval integrity, closeout registry, and shipped docs.
- Broken fixtures remove source prerequisites, remove inputs, allow memory-only current claims, leak private memory into repo truth, enable external sends by default, launch runtime/model/extraction/write side effects, allow broad backfill, stop the whole sprint for one approval-bound action, and omit output sections.
- No substring-only proof is accepted; substring-only proof is rejected. Doc text and string markers are supporting artifact checks only after the real function/process behavior fails closed on broken fixtures.

Gate decision tree:

- Static gate: `node --check` for the new module, focused proof script, and runtime verifier syntax.
- Focused gate: `npm run process:slice-001-check -- --close-card --json`.
- Health gates: System Health and repeated-failure gate must be healthy.
- Full gate: `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` because this is P0 agent-runtime governance.

## Tests

```bash
node --check lib/trusted-assistant-loop.js lib/foundation-runtime-reliability-verifier.js scripts/process-slice-001-check.mjs
npm run process:slice-001-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SLICE-001 --planApprovalRef=docs/process/approvals/SLICE-001.json --closeoutKey=trusted-assistant-loop-v1 --commitRef=HEAD
```
