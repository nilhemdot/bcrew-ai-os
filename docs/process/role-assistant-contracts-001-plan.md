# ROLE-ASSISTANT-CONTRACTS-001 Role Assistant Contracts Plan

Card: `ROLE-ASSISTANT-CONTRACTS-001`

Closeout key: `role-assistant-contracts-v1`

## What

Produce the Foundation-owned role assistant contract catalog before Harlan, team assistants, specialist workers, or extraction workers expand.

This card defines role examples for:

- Steve / Harlan
- Sales Leadership Assistant
- Ops Assistant
- Marketing Assistant
- Agent KPI Coach
- Extraction Worker

Each role contract specifies what the assistant sees, what it does, which sources it trusts, who it escalates to, which actions require approval, how status reports must look, what failure modes are visible, and what the first useful output should be.

This card does not build Harlan, launch role assistants, run live extraction, call models/providers, send messages, mutate Drive, mutate external systems, grant project reach, or create private profile storage runtime.

## Why

The previous agent cards created shared gates, a capability registry, a reusable runtime template, an onboarding harvest, and `AGENT-010` personal-agent onboarding. The next risk is that future builders treat those as generic "agent rules" and skip the role-specific contract that tells each assistant what it can see, do, escalate, and block.

Operator value: Steve gets concrete contracts for the assistant shapes he is likely to approve next, so Harlan and future team/specialist assistants do not drift into hidden authority, overlapping ownership, memory-only current claims, private-context leakage, or unapproved sends/writes.

Useful operator behavior unlocked: a later builder can pick a role, check its visibility/source/action/approval contract, and know whether the next card is safe contract work, a blocked approval request, or runtime implementation that needs explicit approval. This unlocks speed and quality in the real workflow because Steve can see why an assistant is allowed to answer, why it must block, and which owner gets the escalation.

## Acceptance Criteria

- `docs/agents/role-assistant-contracts.md` exists and defines the six role examples.
- `docs/agents/README.md` and `docs/rebuild/agent-architecture.md` point to the role contract catalog.
- `lib/role-assistant-contracts.js` defines the contract, evaluator, and dogfood proof.
- Missing role examples fail closed.
- Missing trusted sources, runtime-gate refs, or escalation owners fail closed.
- Memory-only current claims fail closed.
- Unapproved writes and default-enabled mutating actions fail closed.
- Raw private values in repo contract examples fail closed.
- Runtime launch, live extraction, provider/model calls, external writes, new authority grants, and hidden subagents fail closed.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `ROLE-ASSISTANT-CONTRACTS-001` is a live done card under `role-assistant-contracts-v1`, Current Sprint points next to `HARLAN-PROJECT-REGISTRY-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is implemented, role assistants are launched, live extraction is run, project reach is granted, private profile storage runtime is built, or outbound messages are sent.

## Risks

- Scope drift into Harlan or team-assistant runtime. Mitigation: V1 is contract/proof only.
- Hidden authority. Mitigation: role contracts do not grant project reach or external-write authority.
- Private context leakage. Mitigation: schema/examples only in repo truth; raw private values fail closed.
- Memory-only current answers. Mitigation: every role requires live-answer preflight and source-backed business claims.
- Side-effect drift. Mitigation: sends, writes, extraction, Drive mutation, provider/model calls, and hidden subagents are blocked.

## Details

Existing work to reuse:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `old-system-agent-onboarding-harvest-v1`
- `personal-agent-onboarding-contract-v1`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/personal-agent-onboarding.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Scope boundaries:

- Tight V1 scope: role contract catalog, evaluator, dogfood, doc links, live card/current sprint truth, verifier coverage, closeout, and ship proof.
- Not next: Harlan UI, live agent runtime launch, project registry implementation, live extraction, provider/model calls, external sends, external writes, Drive permission mutation, Agent Feedback auto-send, private profile storage runtime, daily nuggets, team rollout, hidden subagents, or parallel builders.
- No raw private profile values or business-private values in repo truth.

Behavior proof:

- `buildRoleAssistantContractsDogfoodProof()` round-trips the real `evaluateRoleAssistantContracts()` function path against healthy and broken fixtures.
- Broken fixtures remove a required role, remove trusted sources, add an unapproved write, allow hidden subagents, allow memory-only current claims, remove escalation, remove runtime-gate refs, include raw private values, and attempt runtime/extraction/model/external-write/hidden-subagent/new-authority side effects.
- The focused proof rejects substring-only proof as insufficient; string markers in docs/verifier wiring are supporting artifact checks only after contract behavior fails closed.

Gate decision tree:

- Static gate: `node --check` for the role contract module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:role-assistant-contracts-check -- --close-card --json` proves contract behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 agent-runtime governance card with verifier and Current Sprint blast radius.

Speed budget:

- The focused proof is thin and deterministic; it should stay fast enough to run by default before the heavier full ship gate.
- The focused check should complete under 2 minutes on the local Foundation workspace unless the database is unavailable.

## Tests

```bash
node --check lib/role-assistant-contracts.js lib/foundation-runtime-reliability-verifier.js scripts/process-role-assistant-contracts-check.mjs scripts/foundation-verify.mjs
npm run process:role-assistant-contracts-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=ROLE-ASSISTANT-CONTRACTS-001 --planApprovalRef=docs/process/approvals/ROLE-ASSISTANT-CONTRACTS-001.json --closeoutKey=role-assistant-contracts-v1 --commitRef=HEAD
```
