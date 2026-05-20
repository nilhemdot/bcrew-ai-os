# CODEX-DIRECT-SUBSCRIPTION-ROUTE-001 Closeout

Date: 2026-05-20
Closeout key: `codex-direct-subscription-route-v1`
Next card: `GEMINI-VIDEO-BRAIN-ROUTE-001`

## What Shipped

Direct Codex subscription route v1 adds a bounded local Codex CLI route separate from OpenClaw.

The route records:

- credential `codex-direct-chatgpt-local`
- route `foundation-agent-codex-direct`
- account label `local Codex ChatGPT login`
- primary model `gpt-5.5`
- fallback model `gpt-5.4-mini`
- Fast/priority availability from the Codex model catalog
- auth/reachability status from `codex doctor --json`
- quota/reset posture as explicit unknown because Codex CLI does not expose quota/reset truth
- Brain Fleet ledger truth for the bounded probe
- `llm_route_probes` evidence for the direct Codex route

The route remains `experimental` and local-tooling-only. It is not promoted to a generic backend API, scheduled extractor route, Strategy route, People route, or autonomous runtime route.

## Where It Lives

- `lib/codex-direct-subscription-route.js`
- `lib/llm-router.js`
- `scripts/process-codex-direct-subscription-route-check.mjs`
- `docs/process/codex-direct-subscription-route-001-plan.md`
- `docs/process/approvals/CODEX-DIRECT-SUBSCRIPTION-ROUTE-001.json`
- `docs/handoffs/2026-05-20-codex-direct-subscription-route-closeout.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-model-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `scripts/foundation-verify.mjs`
- `package.json`
- `lib/foundation-operator-routes.js`
- `lib/hub-read-routes.js`
- `server.js`

## Proof Boundary

This card ran one bounded local Codex CLI provider probe only through the close-card proof.

It did not:

- use direct Codex as a generic backend API
- send email, Telegram, Slack, Drive writes, public posts, or other external writes
- mutate credentials, OAuth tokens, browser profiles, Codex auth files, provider config, source systems, or public exposure settings
- run extraction, broad Skool/MyICOR/Loom crawl, YouTube runtime proof, Gemini, Claude, OpenClaw adapter boundary, Strategy, or People work

## Proof Commands

```bash
node --check lib/codex-direct-subscription-route.js lib/llm-router.js scripts/process-codex-direct-subscription-route-check.mjs
npm run process:foundation-full-diagnostics-perf-check -- --json
npm run process:foundation-hub-full-payload-reduce-check -- --json
npm run process:daily-exec-summary-check -- --json
npm run process:codex-direct-subscription-route-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CODEX-DIRECT-SUBSCRIPTION-ROUTE-001 --planApprovalRef=docs/process/approvals/CODEX-DIRECT-SUBSCRIPTION-ROUTE-001.json --closeoutKey=codex-direct-subscription-route-v1 --commitRef=HEAD
```

## Final Verify Repair

The first post-commit ship attempt exposed two real verifier/budget issues before push:

- full diagnostics payload was 11 KB over the 4.2 MB budget because the full route still carried an un-compacted Current Sprint object
- the April 30 daily executive summary fell below the latest-five representation check because the historical day had moved beyond the internal 500-commit git window

The closeout keeps raw green by compacting Current Sprint in the full diagnostics payload and widening only the internal daily-summary build-log read to 1000 commits. The public `/api/foundation/build-log` cap stays unchanged.

## Handoff

Continue `GEMINI-VIDEO-BRAIN-ROUTE-001`.

Gemini route work must use Brain Fleet quota ledger truth, must use Harlan auth-needed flow if auth is required, must not broad-extract sources, and must not start extractor proof until the bounded route proof is green.
