# CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001 Plan

## What

Build the bounded Claude Code / Agent SDK local route proof after Gemini and before OpenClaw adapter boundary work. This is a Brain Fleet route-readiness card, not extractor runtime, not cloud review, and not a scheduled automation approval.

## Why

Foundation needs to know whether Claude Code is usable as a governed code-review brain before Build Intel extraction scales. Earlier router work defined fail-closed Claude candidate routes, but Brain Fleet still needs ledgered truth: auth source, selected model, SDK posture, quota/reset posture, route-probe evidence, and stop conditions.

## Operator Value

Useful operator behavior: Steve can see whether Claude Code is usable for governed local code-review work, what account/model/quota posture it used, why it stopped, and whether extractor v1 can keep moving without waiting on Claude.

This unlocks a real workflow: Foundation can choose or skip Claude for code-review jobs based on proved route truth instead of chat memory, while preserving speed and quality for the Build Intel run.

## Acceptance Criteria

- The focused process proof validates approval integrity, Plan Critic, live backlog/current sprint truth, package script wiring, closeout registry wiring, synthetic dogfood, and runtime writeback.
- A live close-card proof writes a Brain Fleet ledger row before the bounded Claude provider call.
- The live close-card proof records a route-probe row for `claude-code-local-max` / `foundation-agent-claude-code`.
- The proof records local auth source, selected model, Agent SDK posture, policy posture, allowed workloads, quota/reset posture, failure reason, and stop condition.
- Auth-needed failures route through Harlan dry-run auth-needed flow with no external messages.
- Credential fingerprints prove no Claude auth/config mutation.
- Ambiguous subscription or Agent SDK posture is recorded as experimental; do not block extractor v1 on Claude ambiguity.
- Current Sprint advances to `OPENCLAW-ADAPTER-BOUNDARY-001`.

## Definition Of Done

Done means:

- `claude-code-local-max` and `foundation-agent-claude-code` remain represented in LLM runtime truth.
- A bounded local Claude Code route proof runs through Brain Fleet quota ledger before provider execution.
- The proof uses Claude Code non-interactive print mode with JSON output, one turn, tools disabled, and session persistence disabled.
- The proof records local auth source, selected model, policy posture, Agent SDK posture, allowed workloads, quota/reset posture if known, failure reason, and stop condition.
- Auth-needed routes through Harlan auth-needed flow and sends no external messages.
- Credential fingerprint checks prove no Claude auth/config mutation.
- If subscription or Agent SDK posture is ambiguous, the route is marked experimental and extractor v1 is not blocked on Claude.
- Current Sprint advances to `OPENCLAW-ADAPTER-BOUNDARY-001`.
- Foundation ship gates pass raw green.

## Details

## Evidence Sources

- Anthropic Claude Code CLI reference: https://docs.anthropic.com/en/docs/claude-code/cli-usage
- Anthropic Claude Code SDK docs: https://docs.anthropic.com/s/claude-code-sdk
- Existing LLM router route keys in `lib/llm-router.js`
- Brain Fleet quota ledger in `lib/brain-fleet-quota-ledger.js`
- Harlan auth-needed flow in `lib/harlan-auth-escalation-loop.js`

- Add `lib/claude-code-review-brain-route.js` for route constants, credential/route builders, CLI status collection, bounded `claude -p` proof, Harlan auth-needed handling, credential fingerprint proof, synthetic dogfood, runtime metadata, and evaluator.
- Add `scripts/process-claude-code-review-brain-route-check.mjs` as the focused process proof and close-card live-state updater.
- Add `process:claude-code-review-brain-route-check`.
- Update `lib/llm-router.js` default Claude credential/route metadata so the model capability registry sees Claude as an experimental local code-review route, not a product backend.
- Register closeout/verifier coverage and update current plan/state truth.
- Reuse existing code/docs/scripts/backlog truth:
  - `lib/llm-router.js`
  - `lib/brain-fleet-quota-ledger.js`
  - `lib/brain-fleet-model-capability-registry.js`
  - `lib/harlan-auth-escalation-loop.js`
  - `scripts/audit-llm-auth-paths.mjs`
  - `scripts/process-gemini-video-brain-route-check.mjs`
  - `docs/rebuild/current-plan.md`
  - `docs/rebuild/current-state.md`
- Behavior proof is through function/process paths: `runClaudeCodeReviewBrainRouteProof`, `recordBrainFleetLedgerCall`, `finishBrainFleetLedgerCall`, `recordLlmRouteProbe`, `runHarlanAuthEscalationScenario`, `validatePlanApprovalFile`, and Current Sprint readback. Substring checks are supporting wiring checks only.

## Risks

- Risk: Claude Code route proof mutates local auth/session state. Mitigation: use `--no-session-persistence`, tools disabled, scratch cwd, and credential fingerprint comparison.
- Risk: Claude provider/auth/quota fails. Mitigation: write ledger truth first, classify stop condition, route auth-needed through Harlan, and keep route experimental.
- Risk: Agent SDK posture is ambiguous. Mitigation: record SDK package posture and CLI print-mode contract explicitly; do not block extractor v1 on Claude ambiguity.
- Risk: This drifts into cloud review, background agents, or extraction. Mitigation: focused proof rejects broad scope, current sprint handoff remains OpenClaw adapter boundary, and no external writes are allowed.
- Rollback/repair: if proof fails or behavior regresses, leave the card executing, keep `OPENCLAW-ADAPTER-BOUNDARY-001` in scoping, preserve the ledger/probe failure evidence, and repair the exact failing route/credential/proof path before continuing.

## Tests

- `node --check lib/claude-code-review-brain-route.js lib/llm-router.js scripts/process-claude-code-review-brain-route-check.mjs`
- `npm run process:claude-code-review-brain-route-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001 --planApprovalRef=docs/process/approvals/CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001.json --closeoutKey=claude-code-review-brain-route-v1 --commitRef=HEAD`

## Gate Decision Tree

Gate choice: full.

Decision tree: static is too thin because live runtime truth changes; focused alone is too narrow because this card writes ledger/probe rows and sprint truth; full is proportional to the blast radius.

Use the full gate because this card touches LLM route truth, live `llm_calls`, live `llm_route_probes`, Current Sprint, closeout registry, and verifier coverage, and runs one bounded provider call. The focused proof is expected to stay fast enough for closeout by using one one-turn Claude probe plus local DB/API checks.

## Boundaries

- Do not use Claude Code as a generic backend API or scheduled extractor route.
- Do not run extractor proof, broad source crawls, Skool, MyICOR, Loom, or YouTube runtime work.
- Do not run Claude ultrareview, cloud review, background agents, browser automation, MCP writes, or external tools.
- Do not mutate Google Drive permissions, source systems, browser profiles, Claude auth files, provider config, or public exposure settings.
- Do not send emails, Telegram, Slack, public posts, Drive writes, or other external writes.
- Do not hide auth, quota, rate-limit, provider, ledger, SDK, or credential-mutation ambiguity by classification.
- Do not block extractor v1 on Claude Code / Agent SDK ambiguity; record experimental truth and continue to OpenClaw adapter boundary when gates are green.
