# LLM-RUNTIME-CONFIG-AUDIT-001 Plan

## What

Repair the runtime model/config hardcode audit so it distinguishes exact provider model literals from source IDs, card IDs, credential classes, route keys, and detector fixtures.

## Why

The overnight Code Quality audit correctly routed hardcoded runtime policy into `LLM-RUNTIME-CONFIG-AUDIT-001`, but the first detector was too broad. It treated names like `CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001`, `MATT-POCOCK-CLAUDE-FOLDER-EVAL-001`, and `llm-claude-code` as exact provider models. That noise hides the real risk Steve wanted surfaced: active runtime code silently choosing provider models outside LLM router/config ownership.

## Acceptance Criteria

- Exact provider model literals outside approved runtime ownership still fail the detector.
- Claude Code/card/source/credential/route identifiers do not produce runtime-model findings.
- Gemini pricing/model economics have one provider-pricing owner instead of duplicate process-check tables.
- Code Quality Nightly Audit consumes the shared classifier and has a synthetic dogfood proof for real literals, ID false positives, and owner exemptions.
- A focused proof proves the real Code Quality audit has zero active `LLM-RUNTIME-CONFIG-AUDIT-001` rows after repair.
- No provider calls, credential changes, live extraction runs, private/auth source access, or auto backlog mutation run for this repair.

## Proof

```bash
node --check lib/llm-provider-pricing.js lib/llm-runtime-model-literal-policy.js lib/code-quality-nightly-audit.js scripts/process-llm-runtime-config-audit-check.mjs scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:llm-runtime-config-audit-check -- --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:youtube-god-mode-autonomous-watch-scheduler-check -- --json --mode=dry-run --skip-post-refresh
npm run process:dev-team-hub-v0-check -- --json
npm run process:nightly-deep-audit-upgrade-check -- --json --write-report --endpointTimeoutMs=8000 --no-runLlmReview
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not change live LLM route priority, credentials, provider policy, or model selection.
- Do not run Gemini/OpenAI/Claude provider calls for this repair.
- Do not run Skool, MyICOR, private/auth, form, download, purchase, or source-worker flows while Steve is asleep.
- Do not mark broader model-routing policy complete from this classifier cleanup alone.
