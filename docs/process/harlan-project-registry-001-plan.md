# HARLAN-PROJECT-REGISTRY-001 Harlan Project Registry Plan

Card: `HARLAN-PROJECT-REGISTRY-001`

Related card: `SYSTEM-011`

Closeout key: `harlan-project-registry-v1`

## What

Produce the Foundation-owned Harlan project registry contract before Harlan runtime work expands.

This card defines the first registered systems:

- `bcrew-ai-os`
- `foundation-dashboard-api`
- `old-bcrew-buddy-reference`
- `google-workspace-delegated`
- `future-harlan-home`

Each registry row specifies local path/repo/API, auth mode, allowed reads, allowed writes, approval boundaries, escalation owner, source contracts, and current capability status.

This card does not implement Harlan, launch live agent runtime, create or move `~/.agents/harlan`, run live extraction, call models/providers, send messages, mutate Drive, mutate external systems, or grant new authority.

## Why

Harlan is cross-project by nature. Without a project registry, his reach becomes hidden human memory: Steve or a builder has to remember which repo, dashboard, API, connector, folder, and auth path is safe. That creates slow, low-quality real workflow because every assistant answer risks either overclaiming access or blocking without a clear reason.

Useful operator behavior unlocked: Steve can ask whether Harlan can reach something and get a source-backed answer: registered/readable, registered but blocked, planned only, or not registered. This unlocks speed and quality in the real workflow because Harlan can say exactly what he can read, what needs approval, who owns the escalation, and why an unknown system is blocked.

## Acceptance Criteria

- `docs/agents/harlan-project-registry.md` exists and defines the initial registry.
- `docs/agents/harlan.md` and `docs/rebuild/agent-architecture.md` point to the registry.
- `lib/harlan-project-registry.js` defines the registry contract, evaluator, and dogfood proof.
- Missing required systems fail closed.
- Missing auth mode, source contracts, or escalation owner fail closed.
- Unknown systems defaulting to allow fail closed.
- Unapproved writes and default-enabled mutating actions fail closed.
- Runtime launch, live extraction, provider/model calls, external writes, new authority grants, and hidden subagents fail closed.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `SYSTEM-011` is linked to this closeout as the generic project-registry concept this concrete card implements.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `HARLAN-PROJECT-REGISTRY-001` is a live done card under `harlan-project-registry-v1`, `SYSTEM-011` is linked or closed under the same closeout when live truth confirms the concept is satisfied, Current Sprint points next to `HARLAN-OPERATOR-LOOP-V1-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is implemented, Harlan has moved homes, live runtime is launched, live extraction is run, Google Workspace access is granted, private profile storage runtime is built, or outbound messages are sent.

## Risks

- Scope drift into Harlan implementation. Mitigation: V1 is registry/proof only.
- Hidden authority. Mitigation: registry rows never grant writes; mutating actions stay disabled and approval-required.
- Connector/auth overclaiming. Mitigation: Google Workspace is blocked pending source/user approval.
- Old-system truth leakage. Mitigation: old BCrew-Buddy is evidence only and cannot become active truth by registry entry.
- Side-effect drift. Mitigation: sends, writes, extraction, Drive mutation, provider/model calls, and hidden subagents are blocked.

## Details

Existing work to reuse:

- `role-assistant-contracts-v1`
- `personal-agent-onboarding-contract-v1`
- `agent-capability-registry-v1`
- `agent-template-runtime-contract-v1`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/harlan.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Scope boundaries:

- Tight V1 scope: registry contract, evaluator, dogfood, doc links, live card/current sprint truth, verifier coverage, closeout, and ship proof.
- Not next: Harlan UI, live agent runtime launch, creating/moving Harlan home, live extraction, provider/model calls, external sends, external writes, Drive permission mutation, Agent Feedback auto-send, Google Workspace mutation, private profile storage runtime, hidden subagents, or parallel builders.
- No secrets, tokens, raw private profile values, or private transcripts in repo truth.

Behavior proof:

- `buildHarlanProjectRegistryDogfoodProof()` round-trips the real `evaluateHarlanProjectRegistry()` function path against healthy and broken fixtures.
- Broken fixtures remove required systems, remove auth mode, add unapproved writes, allow unknown systems, remove escalation, remove source contracts, and attempt runtime/extraction/model/external-write/hidden-subagent/new-authority side effects.
- The focused proof rejects substring-only proof as insufficient; string markers in docs/verifier wiring are supporting artifact checks only after contract behavior fails closed.

Gate decision tree:

- Static gate: `node --check` for the registry module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:harlan-project-registry-check -- --close-card --json` proves registry behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 Harlan/runtime governance card with verifier and Current Sprint blast radius.

Speed budget:

- The focused proof is thin and deterministic; it should stay fast enough to run by default before the heavier full ship gate.
- The focused check should complete under 2 minutes on the local Foundation workspace unless the database is unavailable.

## Tests

```bash
node --check lib/harlan-project-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-harlan-project-registry-check.mjs scripts/foundation-verify.mjs
npm run process:harlan-project-registry-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=HARLAN-PROJECT-REGISTRY-001 --planApprovalRef=docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json --closeoutKey=harlan-project-registry-v1 --commitRef=HEAD
```
