# LLM-AUTH-AUDIT-001 Plan

## What

Run and record a fresh LLM auth/route audit after local Codex/OpenClaw changes, then classify which GPT, Claude, subscription, and direct API paths are usable, blocked, fallback-only, or not configured.

## Why

Configured model routes are not capacity until real probes prove them. The operator value is that scheduled intelligence jobs and future hub workloads use current route truth instead of stale assumptions.

## Acceptance Criteria

- `LLM-AUTH-AUDIT-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- `llm-auth-audit` job runs through the Foundation job ledger.
- Probe results are recorded in existing LLM route/probe/call tables where available.
- GPT/OpenClaw/Codex path status is current.
- Claude Code / Claude Agent SDK route status is current or explicitly blocked.
- Direct API fallback remains guarded and is not silently enabled.
- The proof command `npm run process:llm-auth-audit-check -- --json` reads the route/probe state and rejects stale or missing required status.

## Definition Of Done

- Runtime Health / Foundation LLM state can explain usable and blocked model routes.
- The closeout records which route families are usable without copying secrets.
- No new model spending path is opened outside router policy.

## Details

Reuse existing code in `llm_credentials`, `llm_routes`, `llm_route_probes`, `llm_calls`, `lib/llm-router.js`, and `scripts/audit-llm-auth-paths.mjs`. Reuse existing docs in current runtime map, existing scripts in the Foundation job runner, live backlog truth, and Current Sprint overlay behavior. Prefer the existing Foundation job runner so the audit is visible in job history.

The behavior proof uses actual function path job/probe/readback behavior, DB readback, and route status behavior through the Foundation job/API route where available, and it rejects weak marker-only proof. Gate decision tree: static, focused, or full is chosen by blast radius; if this only runs jobs and records DB state, focused proof is enough, but if route logic changes, use full `process:foundation-ship`.

This gives Steve useful operator value: a real workflow for model capacity decisions, faster debugging, and higher-quality scheduled intelligence jobs because route truth is current. The V1 is thin and proportional: run the existing audit and one fast readback check, not build a new adapter.

## Risks

- Risk: unexpected paid API calls. Mitigation: preserve direct API fallback guard and use existing bounded probes only.
- Risk: route claims stale immediately. Mitigation: record timestamp and status, not permanent truth.
- Risk: tool auth is interactive. Mitigation: mark blocked or manual if a non-interactive proof cannot run.
- Repair path: fail closed, mark routes blocked/manual, reopen `LLM-AUTH-AUDIT-001`, and do not enable new model workloads until proof is current.

## Tests

- `npm run foundation:job -- --job=llm-auth-audit`
- `npm run process:llm-auth-audit-check -- --json`
- `npm run backlog:hygiene -- --json`

## Not Next

Do not build a new Claude adapter unless the audit proves the path and a separate card pulls it. Do not open direct OpenAI/Anthropic/Gemini API spending, hub capacity allocation, agent swarms, product workflows, MEETING-VAULT-ACL-001 Phase B, or Drive permissions mutation.
