# LLM-ROUTER-001 Plan

## What

Finish the next bounded policy-aware LLM router migration slice. Add a fail-closed Claude Code CLI adapter contract, add an explicit deep-audit senior-review workload family, move the nightly deep-audit senior review off generic `synthesis` routing, and prove the route selection path without making a provider call.

## Why

Foundation now depends on real deep audits, source/extraction synthesis, and future Scoper/agent work. If those workloads use hidden model calls, generic workload labels, or subscription routes without policy gates, the system can burn money, leak private context, or pretend an unprobed route is production-safe. The useful operator value is a router that can say: this workload is allowed, blocked, parked, or dry-run logged, with provider/auth-path proof.

## Acceptance Criteria

- `LLM-ROUTER-001` has a Plan Critic pass row at 9.8+ before build/closeout.
- `lib/llm-router.js` exposes an explicit `deep_audit_senior_review` workload family.
- The router defines OpenClaw, Claude Code, and OpenAI fallback route posture for that workload.
- Claude Code execution is fail-closed unless route policy, credential policy, and `LLM_CLAUDE_CODE_ALLOW_EXECUTION=true` all agree.
- The local Claude CLI command contract uses non-interactive flags and stdin prompt transport; proof reads only local CLI help.
- `lib/nightly-deep-audit-upgrade.js` plans and calls through the bounded deep-audit senior-review workload instead of generic `synthesis`.
- Focused proof logs a dry-run route selection for the bounded workload without calling a provider.
- No external writes, sends, Drive permission changes, credential/provider config mutation, paid/browser-auth, public exposure, new source access, or broad private extraction happen in this card.

## Definition Of Done

- `npm run process:llm-router-check -- --json` is healthy.
- `npm run process:llm-router-check -- --close-card --json` is healthy and records local route truth/dry-run proof.
- Current Sprint shows `LLM-ROUTER-001` done and leaves the next card in `scoping` until its own plan exists.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- Main is clean and pushed.

## Details

Existing code reused:

- `lib/llm-router.js`
- `lib/nightly-deep-audit-upgrade.js`
- `scripts/audit-llm-auth-paths.mjs`
- `lib/process-plan-critic.js`
- Current Sprint/live backlog stores

Existing docs reused:

- `docs/rebuild/current-runtime-map.md`
- `docs/process/model-routing-001-plan.md`
- `docs/process/foundation-deep-auditor-real-loop-001-plan.md`

Existing scripts reused:

- `scripts/audit-llm-auth-paths.mjs`
- `scripts/process-foundation-deep-auditor-real-loop-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=LLM-ROUTER-001 --planApprovalRef=docs/process/approvals/LLM-ROUTER-001.json --closeoutKey=llm-router-v1`
- `npm run process:fanout-check -- --card=LLM-ROUTER-001 --closeoutKey=llm-router-v1`
- `npm run process:foundation-ship -- --card=LLM-ROUTER-001 --planApprovalRef=docs/process/approvals/LLM-ROUTER-001.json --closeoutKey=llm-router-v1 --commitRef=HEAD`

Existing policy reused:

- Green means raw green.
- Repeated failures repair or route before normal progression.
- Blockers block unsafe actions, not the whole sprint.
- Official APIs and governed adapters are the default for production/customer-facing automated workloads.
- Subscription/native routes are internal capacity only after they are allowed, probed, logged, and policy-classified.

Root invariant: the router may expose candidate capacity, but a provider call only happens when the route is runnable by policy and execution is explicitly enabled. A dry-run route record is proof of routing posture, not proof that a model reviewed anything.

The focused proof path is function/process based:

- `evaluateLlmRouterMigration()` checks the router, nightly deep-audit workload, closeout registry, local Claude CLI command flags, and fail-closed dogfood.
- `process:llm-router-check -- --close-card --json` seeds/updates only local router route truth for the bounded workload, logs one dry-run route selection, closes the card, and writes the closeout.
- `process:foundation-ship` proves the closeout, fanout, and verifier paths after commit.

No substring-only proof is accepted. Marker checks only identify the files to inspect; the behavior proof must go through the actual function path and real process route:

- `buildClaudeAdapterDogfoodProof()` creates synthetic route/credential/env cases and proves the adapter stays blocked until every approval condition is true.
- `evaluateClaudeCodeCliHelp()` reads the local CLI help contract and proves the non-interactive command shape without sending a prompt.
- `callLlm({ workload: deep_audit_senior_review, dryRun: true })` creates a local `llm_calls` dry-run record, proving DB/API route logging without provider execution.
- `buildFoundationCurrentSprintStatus()` reads live Current Sprint and backlog truth after sync/close so the card cannot pass by hiding stage drift.

Gate decision tree: this card has runtime-policy blast radius, so static checks are not enough. Focused proof is required before closeout, and full gates are required at final ship. `process:llm-router-check` is the focused gate, `foundation:verify` is the full verifier gate, and `process:foundation-ship` is the full ship gate. The focused gate is fast and proportional: it reads local files, local CLI help, and local DB route truth only, makes no provider calls, and should complete under 2 minutes.

Operator value: Steve gets useful real workflow behavior, not just process artifacts. Deep audits can show which route would handle senior review, whether that route is approved, why it is blocked, and what safe next action remains. That improves speed and quality because the builder can park an unsafe provider action while continuing safe Foundation work.

## Risks

- The card could accidentally call a provider while trying to prove the adapter.
- The card could treat Claude Code CLI availability as scheduled automation approval.
- Generic `synthesis` routing could hide deep-audit cost/privacy rules.
- Updating route truth could overwrite existing credential posture.
- Future cards could be promoted to sprint-ready before their own Plan Critic pass.

Repair path: fail closed, keep provider calls parked, restore any unintended route posture, keep unsafe actions blocked, demote unready sprint cards back to `scoping`, and rerun focused proof before shipping.

## Tests

- `node --check lib/llm-router.js lib/llm-router-migration.js scripts/process-llm-router-check.mjs`
- `npm run process:llm-router-check -- --json`
- `npm run process:llm-router-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=LLM-ROUTER-001 --planApprovalRef=docs/process/approvals/LLM-ROUTER-001.json --closeoutKey=llm-router-v1 --commitRef=HEAD`

## Not Next

- Do not execute Claude Code, OpenAI, Anthropic, Gemini, OpenClaw, browser automation, or paid/provider routes from this card.
- Do not mutate credentials, keys, provider config, Drive permissions, source systems, or external destinations.
- Do not approve scheduled workloads on subscription/native routes just because the route exists.
- Do not build Scoper, Strategy, People, Harlan, Crewbert, or a broad agent runtime from this card.
- Do not start new extraction/source expansion from this card.

## Operator Value

Steve gets an LLM router that can carry real deep-audit and future agent workloads without hidden provider calls. The system can inspect route posture, record dry-run proof, and keep working when a route is blocked instead of freezing the whole sprint.
