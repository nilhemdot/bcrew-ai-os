# AGENT-CAPABILITY-REGISTRY-001 Plan

Card: `AGENT-CAPABILITY-REGISTRY-001`

Closeout key: `agent-capability-registry-v1`

## What

Create the focused, read-only Foundation registry contract that declares what each agent can claim it can do.

The V1 registry declares:

- agent identity, role, owner, purpose, and permission tier
- allowed tools and local/live source lookups
- source/system references
- read/write posture
- model route policy
- logging and transcript proof posture
- approval boundaries for writes, sends, model calls, live extraction, paid/auth jobs, and Drive mutations
- fallback behavior when capability proof is missing

This card does not launch Harlan, build UI, call models, run live extraction, send Agent Feedback, mutate Drive, or implement the reusable runtime template. It makes capability claims fail closed unless the registry has enough declared proof.

## Why

The live-answer preflight gate proves agents need fresh evidence before sounding current. The next risk is capability inflation: an agent can still sound like it can send, mutate, crawl, call a model, or read a private source without Foundation declaring that capability.

Steve should be able to ask what Harlan, Crewbert, or a future worker can do and get a capability answer backed by registry truth, not by model confidence or prompt memory.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth.
- `lib/agent-capability-registry.js` defines the registry contract, evaluator, and dogfood proof.
- Registry rows declare agent identity, tools, source refs, read/write posture, model route, logging, approval boundaries, and fallback behavior.
- Declared read-only capability claims pass.
- Missing tools fail closed.
- Missing source refs fail closed.
- Missing model route policy fails closed.
- Missing logging policy fails closed.
- Claim-only capability rows fail closed.
- Unknown capability claims fail closed.
- External-send/write/model/extraction claims fail closed unless explicitly approved; V1 keeps them disabled.
- Runtime launch, extraction, model call, external write, and hidden-subagent attempts fail closed.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `AGENT-CAPABILITY-REGISTRY-001` is a live done card under `agent-capability-registry-v1`, Current Sprint points next to `AGENT-TEMPLATE-RUNTIME-CONTRACT-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is rebuilt, live agents are launched, or the reusable runtime template exists.

## Risks

- Scope drift into live Harlan/runtime work. Mitigation: V1 is a read-only registry contract and proof only.
- Scope drift into enabling writes. Mitigation: mutating actions are disabled by default and must be represented as blocked/approval-required.
- Scope drift into the reusable template. Mitigation: template work remains `AGENT-TEMPLATE-RUNTIME-CONTRACT-001`.
- False confidence from partial rows. Mitigation: missing tools, source refs, model route, logging, approval boundary, and unknown claims fail closed.
- Over-heavy proof. Mitigation: focused proof stays under 5 minutes and full gates run only after focused proof is green.

## Details

Existing work to reuse:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-status-freshness-gate-v1`
- `SYS-AGENTS-001`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/personal-agent-onboarding.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Operator behavior:

- A current answer can say an agent can do something only when the registry declares the capability and action.
- Read-only capabilities can be declared as executable when the tools and source refs are present.
- Side-effect capabilities must be blocked/approval-required until an explicit approval path exists.
- Missing capability proof means the agent must say blocked, unavailable, or not declared.
- Operator value: Steve gets a real workflow answer to "can this agent do that?" before trusting Harlan, Crewbert, or a worker in a live workstream.
- Useful thing unlocked: safer speed and quality because capability claims are answered from Foundation registry truth instead of prompt confidence.

Gate decision tree:

- Static gate: `node --check` for the registry module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:agent-capability-registry-check -- --close-card --json` proves registry behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 runtime-governance card with verifier and Current Sprint blast radius.
- Regression path: if missing capability fields or unapproved side-effect claims stop failing closed, repair the evaluator or fixture before closeout.

Scope boundaries:

- Tight V1 scope: read-only registry contract, evaluator, dogfood, closeout, and verifier wiring.
- Not next: live runtime launches, feature UI, reusable runtime template implementation, live extraction, model/provider calls, external writes, Drive permission mutation, request-access emails, Meeting Vault Phase B, hidden subagents, or parallel builders.
- No Harlan UI or feature work.
- No live agent runtime launch.
- No reusable runtime template implementation.
- No live extraction.
- No provider/model call.
- No external send or mutation.
- No Google Drive permission mutation.
- No `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.
- No request-access emails.
- No hidden subagents or parallel builders.

File-size posture:

- New module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- `scripts/foundation-verify.mjs` adds only one bounded current-progress allowlist line and remains under 5,000 lines.

## Tests

```bash
node --check lib/agent-capability-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-capability-registry-check.mjs scripts/foundation-verify.mjs
npm run process:agent-capability-registry-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json --closeoutKey=agent-capability-registry-v1 --commitRef=HEAD
```
