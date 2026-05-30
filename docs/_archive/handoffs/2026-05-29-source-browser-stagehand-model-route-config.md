# Source Browser Stagehand Model Route Config

Date: 2026-05-29
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-stagehand-model-route-config-v1`

## What Changed

The nightly deep audit found one real P2 finding: `scripts/process-source-browser-runtime-cost-guardrails-check.mjs` owned an exact Stagehand proof model literal instead of reading model truth from the LLM router/config owner.

This slice repairs that drift:

- `lib/llm-router.js` now owns the proof-sized Stagehand/OpenAI route as `foundation-agent-stagehand-openai-proof`.
- `lib/source-agentic-browser-runtime.js` exports the Stagehand proof model from that route.
- `scripts/process-source-browser-runtime-cost-guardrails-check.mjs` imports the route-derived model instead of carrying exact runtime model literals.
- The focused LLM runtime config audit reports zero active `LLM-RUNTIME-CONFIG-AUDIT-001` findings.

## Why It Matters

The source-browser stack needs clear cost and model ownership before broad browser-agent work. If a process check owns a model name, the router can drift while guardrails still look green.

## Proof

```bash
node --check lib/llm-router.js lib/source-agentic-browser-runtime.js scripts/process-source-browser-runtime-cost-guardrails-check.mjs lib/foundation-build-closeout-source-records.js
npm run process:source-browser-runtime-cost-guardrails-check -- --json
npm run process:llm-runtime-config-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Done

This does not run a live browser, Stagehand session, Browserbase session, source extraction, login, signup, download, purchase, post, comment, message, paid/private extraction, or Scoper promotion.

Next source-browser work is still the real bounded source-session/free-community proof, MyICOR connector/auth proof, and source-specific worker hardening.
