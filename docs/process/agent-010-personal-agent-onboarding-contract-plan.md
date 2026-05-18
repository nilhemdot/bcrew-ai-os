# AGENT-010 Personal Agent Onboarding Contract Plan

Card: `AGENT-010`

Closeout key: `personal-agent-onboarding-contract-v1`

## What

Produce the Foundation-owned personal-agent onboarding contract for Harlan and future human assistants.

This card defines:

- private profile schema
- privacy tiers and repo-truth boundary
- first useful source-backed read
- calibration interview flow
- daily nugget rules
- feedback and non-response loop
- allowed read-only source lookups
- update rules for profile changes
- proof that private profile values do not leak into repo truth

This card does not implement Harlan, launch live agent runtime, roll out team agents, run live extraction, call models/providers, send messages, mutate Drive, mutate external systems, or copy raw private profile values into repo truth.

## Why

Personal agents only become useful when they learn the human they serve and prove value. Operator value: Steve gets a concrete onboarding contract for Harlan and future assistants so builders do not create generic chatbots, feature dumps, or private-profile leaks.

Useful operator behavior unlocked: the next Harlan/runtime builder can onboard a human by showing one source-backed useful read, asking the right calibration questions, storing only private profile values in the private store, limiting daily nudges, and surfacing adoption risk instead of spamming. This improves quality and speed in the real workflow because Steve can approve a contract once and make future assistants inherit it.

## Acceptance Criteria

- `docs/agents/personal-agent-onboarding.md` is updated from scoped doctrine to contract v1.
- `lib/personal-agent-onboarding-contract.js` defines the onboarding contract, evaluator, and dogfood proof.
- Missing profile schema fails closed.
- Repo-stored or raw private profile values fail closed.
- Thin calibration flow fails closed.
- Daily nugget spam or default external send fails closed.
- Repeated non-response nudges fail closed.
- Unsafe write/source lookup and runtime launch attempts fail closed.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `AGENT-010` is a live done card under `personal-agent-onboarding-contract-v1`, Current Sprint points next to `ROLE-ASSISTANT-CONTRACTS-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is implemented, live personal-agent runtime is launched, private profile storage is built, daily nuggets are sent, or team assistants are rolled out.

## Risks

- Scope drift into Harlan implementation. Mitigation: V1 is contract/proof only.
- Private profile leakage. Mitigation: schema in repo, values in private profile store only; raw values fail closed.
- Generic chatbot onboarding. Mitigation: first useful read and calibration flow are mandatory.
- Notification spam. Mitigation: one daily nugget maximum, mute/redirect required, non-response pauses.
- Side-effect drift. Mitigation: sends, writes, extraction, Drive mutation, provider/model calls, and hidden subagents are blocked.

## Details

Existing work to reuse:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `old-system-agent-onboarding-harvest-v1`
- `docs/agents/personal-agent-onboarding.md`
- `docs/agents/old-system-agent-onboarding-harvest.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Scope boundaries:

- Tight V1 scope: contract, evaluator, dogfood, doc update, live card/current sprint truth, verifier coverage, closeout, and ship proof.
- Not next: Harlan UI, live agent runtime launch, private profile store implementation, live extraction, provider/model calls, external sends, external writes, Drive permission mutation, Agent Feedback auto-send, request-access emails, Meeting Vault Phase B, team-agent rollout, hidden subagents, or parallel builders.
- No raw private profile values in repo truth.

Behavior proof:

- `buildPersonalAgentOnboardingContractDogfoodProof()` round-trips the real `evaluatePersonalAgentOnboardingContract()` function path against healthy and broken fixtures.
- Broken fixtures remove the profile schema, store private profile values in repo truth, include raw private values, thin the calibration flow, spam daily nuggets, repeat non-response nudges, make source lookups unsafe, and attempt runtime/extraction/model/external-write/hidden-subagent side effects.
- The focused proof rejects substring-only proof as insufficient; string markers in docs/verifier wiring are supporting artifact checks only after the contract behavior fails closed.

Gate decision tree:

- Static gate: `node --check` for the contract module, core-governance review-marker verifier, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:agent-010-check -- --close-card --json` proves contract behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 agent-runtime governance card with verifier and Current Sprint blast radius.

## Tests

```bash
node --check lib/personal-agent-onboarding-contract.js lib/foundation-core-governance-verifier.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-010-check.mjs scripts/foundation-verify.mjs
npm run process:agent-010-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-010 --planApprovalRef=docs/process/approvals/AGENT-010.json --closeoutKey=personal-agent-onboarding-contract-v1 --commitRef=HEAD
```
