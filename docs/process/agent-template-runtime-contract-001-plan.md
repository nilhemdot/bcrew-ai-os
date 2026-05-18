# AGENT-TEMPLATE-RUNTIME-CONTRACT-001 Plan

Card: `AGENT-TEMPLATE-RUNTIME-CONTRACT-001`

Closeout key: `agent-template-runtime-contract-v1`

## What

Create the focused, reusable Foundation runtime template contract that every future AIOS agent must satisfy before runtime or feature work expands.

The V1 template declares:

- identity, role, owner, and purpose
- permission tier
- source access
- memory scope and private-profile boundary
- tool permissions
- model route and cost policy
- approval posture
- live-answer preflight reference
- capability registry reference
- action routing and direct-apply boundary
- logging and transcript proof
- failure visibility
- onboarding/profile contract
- decommission path

This card does not launch Harlan, build UI, call models, run live extraction, harvest old BCrew-Buddy evidence, send Agent Feedback, mutate Drive, or create live runtime agents. It creates the reusable template contract and dogfood proof only.

## Why

The live-answer preflight and capability registry gates prove agents need fresh source proof and declared capabilities. The next risk is agent sprawl: each new assistant or worker could be rebuilt from a different prompt, with different privacy, permission, logging, failure, and decommission behavior.

Operator value: Steve gets a real workflow answer to "is this agent safe to create or run?" before trusting Harlan, Crewbert, role assistants, or extraction workers. The useful thing unlocked is safer speed and quality because future agent builds inherit one enforceable Foundation template instead of prompt-only conventions.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth.
- `lib/agent-template-runtime-contract.js` defines the template contract, evaluator, and dogfood proof.
- Valid Harlan, Crewbert, and extraction-worker template examples pass.
- Missing identity/owner/role/purpose fails closed.
- Missing source access fails closed.
- Missing memory scope/private-profile boundary fails closed.
- Missing tool permissions fails closed.
- Missing model route/cost policy fails closed.
- Missing approval posture fails closed.
- Missing live-answer preflight reference fails closed.
- Missing capability registry reference fails closed.
- Missing action routing fails closed.
- Missing logging or failure visibility fails closed.
- Missing onboarding/profile contract or decommission path fails closed.
- Prompt-only templates fail closed.
- Runtime launch, extraction, model call, external write, and hidden-subagent attempts fail closed.
- Runtime reliability verifier coverage and done-card coverage are wired.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` is a live done card under `agent-template-runtime-contract-v1`, Current Sprint points next to `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is rebuilt, live agents are launched, or old BCrew-Buddy onboarding evidence has been harvested.

## Risks

- Scope drift into live Harlan/runtime work. Mitigation: V1 is a reusable template contract and proof only.
- Scope drift into old-system harvest. Mitigation: old-system evidence work remains `OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001`.
- Scope drift into live extraction workers. Mitigation: extraction-worker template is an approval-bound example only; no live extraction starts.
- False confidence from prompt-only templates. Mitigation: prompt-only template fixtures fail closed.
- Over-heavy proof. Mitigation: focused proof stays under 5 minutes and full gates run only after focused proof is green.

## Details

Existing work to reuse:

- `foundation-agent-usefulness-runtime-gates-v1`
- `agent-live-answer-preflight-gate-v1`
- `agent-capability-registry-v1`
- `agent-status-freshness-gate-v1`
- `SYS-AGENTS-001`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/personal-agent-onboarding.md`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Operator behavior:

- A future agent can be scoped only when it has a complete template row.
- If identity, owner, source, memory, tool, route, approval, preflight, capability, logging, failure, onboarding, or decommission proof is missing, the agent must be blocked before runtime work.
- Side-effect and extraction worker behavior remains approval-bound and disabled by default.
- Missing template proof means the agent is not safe to run.

Scope boundaries:

- Tight V1 scope: reusable template contract, evaluator, dogfood, closeout, and verifier wiring.
- Not next: Harlan UI, live runtime launches, old BCrew-Buddy harvest, live extraction, model/provider calls, external writes, Drive permission mutation, request-access emails, Meeting Vault Phase B, hidden subagents, or parallel builders.
- No Harlan UI or feature work.
- No live agent runtime launch.
- No old-system BCrew-Buddy onboarding harvest.
- No live extraction.
- No provider/model call.
- No external send or mutation.
- No Google Drive permission mutation.
- No `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.
- No request-access emails.
- No hidden subagents or parallel builders.

Gate decision tree:

- Static gate: `node --check` for the template module, runtime verifier wiring, focused proof script, and root verifier syntax.
- Focused gate: `npm run process:agent-template-runtime-contract-check -- --close-card --json` proves template behavior and live backlog/current sprint readback.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 runtime-governance card with verifier and Current Sprint blast radius.
- Regression path: if missing-template or prompt-only fixtures stop failing closed, repair the evaluator or fixture before closeout.

File-size posture:

- New module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- `scripts/foundation-verify.mjs` must remain under 5,000 lines by updating the current-progress allowlist without adding root-file growth.

## Tests

```bash
node --check lib/agent-template-runtime-contract.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-template-runtime-contract-check.mjs scripts/foundation-verify.mjs
npm run process:agent-template-runtime-contract-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AGENT-TEMPLATE-RUNTIME-CONTRACT-001 --planApprovalRef=docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json --closeoutKey=agent-template-runtime-contract-v1 --commitRef=HEAD
```
