# FOUNDATION-FULL-DIAGNOSTICS-PERF-001 Plan

## What

Make `/api/foundation-hub?view=full` materially faster by bounding optional Agent Feedback / ClickUp readiness panels inside the full diagnostics route.

V1 keeps the full diagnostic payload available for Runtime Health, but slow ClickUp-backed panels now fail soft as degraded source health instead of holding the route open for 60-80 seconds.

## Why

The prior cleanup sprint measured the default Foundation Hub route as fast, but full diagnostics still took about 62-75 seconds and roughly 4.8 MB. Profiling showed the core Foundation snapshot is not the culprit; `buildAgentFeedbackAutoSendReadiness()` alone took about 82 seconds.

Steve and the team need Runtime Health to be usable while source-specific panels still tell the truth. The useful operator value this unlocks is speed with quality: Steve can open Runtime Health during real workflow reviews and immediately see whether Foundation is healthy or ClickUp is degraded, instead of waiting a minute and guessing whether the whole system is broken.

## Acceptance Criteria

- Full diagnostics returns in under 15 seconds during live proof.
- Full diagnostics payload stays under 5.5 MB.
- Agent Feedback Auto-Send, Production Dry-Run, and Reminder diagnostics run behind a bounded deadline.
- Slow Agent Feedback / ClickUp diagnostics return explicit degraded `sourceHealth` with `runtime_diagnostic_timeout`.
- The source outage boundary says external source failures do not block core Foundation APIs.
- The route keeps Runtime Health keys: `sharedCommunicationSynthesis`, `extractionControl`, `llmRuntime`, `driveCorpusInventory`, `foundationOperatingReliability`, and `foundationHubFullDiagnostics`.

## Definition Of Done

- Bounded Agent Feedback diagnostic behavior lives outside `server.js`.
- ClickUp reads support request timeout and page-cap options.
- Agent Feedback readiness builders accept an injected roster snapshot getter so the route can share one bounded roster read.
- Focused proof dogfoods a synthetic slow builder and proves it fails soft quickly.
- Current Sprint has complete doctrine and durable Plan Critic pass rows before build.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `/api/foundation-hub?view=full`, `lib/foundation-hub-performance.js`, `lib/foundation-hub-performance-verification.js`, `lib/clickup.js`, Agent Feedback readiness builders, source outage boundary patterns, current sprint store, Plan Critic architectural rules, and full Foundation ship gates.

Existing docs to reuse: `docs/handoffs/2026-05-14-foundation-verification-cleanup-closeout.md`, `docs/handoffs/2026-05-14-foundation-hub-performance-baseline.md`, and the 2026-05-13 deep audit finding that named the slow Foundation Hub route.

Existing scripts to reuse: `process:foundation-verification-cleanup-check`, `process:foundation-performance-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static checks are insufficient because this touches server runtime behavior and an external-source failure boundary. The focused proof must call the real module path and a live route when available. Full proof is required because the blast radius touches API behavior, package scripts, verifier-visible payloads, and source-health truth.

Split plan: do not add this behavior directly to `server.js`, which is already over 5K lines. New full-diagnostic behavior belongs in `lib/foundation-hub-full-diagnostics.js`. Server changes should be thin delegation only.

## Risks

- Risk: the fallback hides a real ClickUp outage.
  - Repair path: fallback explicitly marks source health degraded with `runtime_diagnostic_timeout` and keeps `sourceOutageBoundary` degraded.
- Risk: background ClickUp work continues after the route responds.
  - Repair path: ClickUp requests now support timeout options, and the shared roster getter uses bounded request timeouts.
- Risk: Runtime Health loses detail.
  - Repair path: preserve existing Runtime Health payload keys and only degrade the optional Agent Feedback panel when it exceeds the full-diagnostics budget.

## Tests

```bash
npm run process:foundation-full-diagnostics-perf-check -- --json
npm run process:foundation-full-diagnostics-perf-check -- --json --no-api
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-HUB-FULL-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-FULL-ROUTE-SPLIT-001.json --closeoutKey=foundation-full-diagnostics-perf-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure by injecting slow Agent Feedback builders and proves full diagnostics returns degraded source health inside the bounded deadline instead of waiting for the slow panel.

## Not Next

- Do not build hub features.
- Do not change ClickUp source truth or mutate ClickUp.
- Do not remove Agent Feedback panels.
- Do not split all of `server.js`, `foundation-db.js`, `foundation-verify.mjs`, or `public/foundation.js`.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, or Drive permission mutation.
