# FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 Plan

Card: `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001`

Closeout key: `foundation-agent-usefulness-runtime-gates-v1`

## What

Create the Foundation-owned runtime gate bundle that makes agent usefulness code-enforced before Harlan, Crewbert, role assistants, or specialist workers expand.

The bundle covers:

- live-answer preflight
- capability registry
- action permission contract
- stale-data warning
- source-backed status claim guard
- failure visibility
- prompt-only rule rejection

This card does not build the Harlan UI, launch live agent runtime work, implement the full capability registry, or implement the full agent template. It creates the executable umbrella contract and proof so the child cards can build from a fail-closed baseline.

## Why

The Planck incident and Harlan planning exposed the same operating risk: agents can sound confident from stale memory, hidden work, or prompt-only rules while the real repo/runtime state says something else.

Steve's preferred operating model is visible, source-backed, and supervised. Agents should not claim current status, capability, or action readiness unless runtime proof exists. This gate makes "useful" mean enforced behavior: live checks, declared capabilities, permission posture, stale-data wording, visible blockers, and explicit approval for hidden workers or side effects.

## Acceptance Criteria

- Live backlog card is enriched and moved through Current Sprint truth.
- `lib/foundation-agent-usefulness-runtime-gates.js` defines the gate bundle, evaluator, and dogfood proof.
- The bundle includes live-answer preflight, capability registry, action permission contract, stale-data warning, source-backed status claim guard, failure visibility, and prompt-only rule rejection.
- Dogfood rejects prompt-only gate bundles.
- Dogfood rejects stale memory answers that sound current.
- Dogfood rejects undeclared capability claims.
- Dogfood rejects external writes or side effects without approval.
- Dogfood rejects stale data without visible warning.
- Dogfood rejects hidden workers without explicit approval.
- Dogfood rejects hidden failures.
- `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001`, `AGENT-CAPABILITY-REGISTRY-001`, and `AGENT-TEMPLATE-RUNTIME-CONTRACT-001` remain live child cards.
- `AGENT-STATUS-FRESHNESS-GATE-001` and `PARALLEL-BUILDER-OPERATING-SYSTEM-001` are treated as prerequisites.
- Focused proof is registered in `package.json`.
- Runtime reliability verifier coverage proves the behavior path.
- Closeout registry and handoff are present.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.

## Definition Of Done

Done means `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001` is a live done card under `foundation-agent-usefulness-runtime-gates-v1`, Current Sprint points next to `AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001`, focused proof and full ship gates pass, and the commit is pushed.

Done does not mean Harlan is rebuilt, the capability registry is complete, or live agent/runtime work has launched.

## Details

Existing work to reuse:

- `lib/agent-status-freshness-gate.js`
- `lib/aios-runtime-portability-gate.js`
- `docs/rebuild/agent-architecture.md`
- `docs/agents/personal-agent-onboarding.md`
- `docs/agents/harlan.md`
- `PARALLEL-BUILDER-OPERATING-SYSTEM-001`
- Current Sprint metadata guards, Plan Critic, closeout registry, and Foundation ship gates

Operator value:

- Steve gets product behavior he can trust: an agent must show fresh evidence before saying something is current, show declared capability before claiming it can help, block or ask for approval before side effects, and surface the visible blocker when it cannot act.
- The real workflow unlock is speed and quality without Steve manually translating stale memory, missing tools, hidden workers, or vague "I can do that" claims.

Behavior proof:

- Healthy synthetic current-status answer passes only when it has a fresh live Foundation/API evidence stamp, declared read capability, read-only permission posture, source-backed status guard, and visible failure posture.
- Prompt-only component proof fails closed.
- Memory-only current answer fails closed.
- Capability claim without registry evidence fails closed.
- External write without approval fails closed.
- Stale live source without warning fails closed.
- Hidden worker without explicit approval fails closed.
- Required failure that is not visible fails closed.

Gate decision tree:

- Static gate: `node --check` for the new module, runtime verifier wiring, and focused proof script.
- Focused gate: `npm run process:foundation-agent-usefulness-runtime-gates-check -- --close-card --json` for the behavior contract, live backlog/Current Sprint readback, closeout registry, and dogfood failures.
- Full gate: `npm run foundation:verify -- --json-summary` and `process:foundation-ship` because this is a P0 Foundation runtime-governance card with verifier and live backlog blast radius.
- Speed bound: the focused gate should stay under 5 minutes and remain thin enough to use by default; expensive full gates run only after focused proof is green.
- Regression path: if a dogfood fixture starts passing when it should fail, stop the card, repair the evaluator or fixture, and do not close the card or weaken the gate.

Scope boundaries:

- No Harlan UI or feature work.
- No live agent runtime launch.
- No live extraction.
- No auth-required or paid run.
- No provider/model probe or call.
- No external sends or mutations.
- No Google Drive permission mutation.
- No Agent Feedback auto-send.
- No hidden subagents or parallel builders.
- No `MEETING-VAULT-ACL-001` Phase B or historical Meeting Vault cleanup.

File-size posture:

- New module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- `scripts/foundation-verify.mjs` is near the 5,000-line guardrail, so this card adds only one bounded current-progress allowlist line and keeps the file under 5,000 lines.
- Runtime verifier wiring stays bounded and behavior-driven.

Read/write posture:

- Focused proof writes live backlog, Plan Critic, and Current Sprint only when invoked with `--apply` or `--close-card`.
- Verifier/check paths do not seed, repair, or hide live agent/runtime state.
- No proof path may launch extraction, call providers/models, send externally, mutate Drive permissions, run Agent Feedback auto-send, or spawn hidden workers.

## Risks

- Scope drift into Harlan product work. Mitigation: the card is a gate bundle only.
- Scope drift into capability registry implementation. Mitigation: keep child cards scoped and prove mapping only.
- False confidence from prompt-only rules. Mitigation: dogfood rejects prompt-only gate components.
- Hidden-worker confusion. Mitigation: hidden workers fail closed unless explicit approval is present.
- Root verifier bloat. Mitigation: no `scripts/foundation-verify.mjs` line additions.

## Tests

Use the focused loop first:

```bash
node --check lib/foundation-agent-usefulness-runtime-gates.js lib/foundation-runtime-reliability-verifier.js scripts/process-foundation-agent-usefulness-runtime-gates-check.mjs scripts/foundation-verify.mjs
npm run process:foundation-agent-usefulness-runtime-gates-check -- --apply --stage=scoping --json
npm run process:foundation-agent-usefulness-runtime-gates-check -- --apply --stage=sprint_ready --json
npm run process:foundation-agent-usefulness-runtime-gates-check -- --apply --stage=building_now --json
```

Final proof:

```bash
npm run process:foundation-agent-usefulness-runtime-gates-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json --closeoutKey=foundation-agent-usefulness-runtime-gates-v1 --commitRef=HEAD
```
