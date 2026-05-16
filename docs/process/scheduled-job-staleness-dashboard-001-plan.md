# SCHEDULED-JOB-STALENESS-DASHBOARD-001 Plan

Card: `SCHEDULED-JOB-STALENESS-DASHBOARD-001`
Sprint: `foundation-system-health-visibility-2026-05-16`
Closeout key: `scheduled-job-staleness-dashboard-v1`

## What

Expose scheduled job staleness on the Foundation runtime surface so missed jobs are visible at first glance.

## Why

The nightly auditor missed runs and Steve had to ask for the report. That is a dashboard failure. The Foundation runtime view must show when scheduled jobs last succeeded, how old the evidence is, whether they are overdue, and what to do next.

Operator value: Steve opens the Foundation page and immediately sees red/yellow/green system health instead of needing Codex to inspect a job ledger.

This unlocks faster, higher-quality operator behavior in the real workflow: Steve can decide whether to keep building, pause for repair, or trust the current sprint without asking another agent to check hidden job state.

## Acceptance Criteria

- `/api/foundation-hub?mode=full` includes `foundationSystemHealth`.
- The Runtime Health command panel includes a system-health attention item when scheduled jobs, endpoints, connectors, or the nightly auditor are stale/risk.
- The Runtime Health detail page renders a `System Health Rollup` panel with red/yellow scheduled jobs first.
- The panel shows last successful run, latest run status, due/overdue state, age, and next action.
- Manual/paused/decommissioned jobs do not create false red status unless they are P0 expected scheduled jobs.
- Dogfood proof proves overdue scheduled job staleness appears as red while fresh scheduled success appears green.
- No `server.js` route work; use the existing hub read-route module.

## Definition Of Done

- `SCHEDULED-JOB-STALENESS-DASHBOARD-001` closes under `scheduled-job-staleness-dashboard-v1`.
- This plan and `docs/process/approvals/SCHEDULED-JOB-STALENESS-DASHBOARD-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- Focused proof verifies the API payload source, frontend renderer, and dogfood status classification.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse:

- `lib/hub-read-routes.js` for the full Foundation Hub payload.
- `public/foundation-runtime-renderers.js` for Runtime Health command/detail rendering.
- `public/foundation-operations-renderers.js` for the runtime diagnostics layout.
- `lib/foundation-system-health.js` from `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`.

Existing docs to reuse:

- `docs/process/system-health-nightly-audit-001-plan.md`.
- `docs/handoffs/2026-05-16-foundation-cleanup-arc-closeout.md`.

Existing scripts to reuse:

- `npm run process:system-health-nightly-audit-check -- --json`.
- `npm run foundation:verify -- --json-summary`.
- `npm run process:foundation-ship`.

Gate decision tree: static syntax checks first, focused API/UI proof second, then full Foundation ship gate because operator visibility is a Foundation command surface.

Large-file split/extraction plan: do not add to `server.js`. Keep UI changes focused inside the existing runtime/operations renderer modules, both below the active danger line.

Focused proof: a synthetic stale job must create a red status and a runtime attention item; a fresh scheduled success must create green status. The proof must call the real classification function and inspect the actual hub payload builder and renderer modules for exported behavior, not screenshots or text-presence claims.

Speed bound: the focused proof must stay fast and under 2 minutes, and it must avoid browser automation unless a later UI walkthrough explicitly needs it. The full ship gate remains the final check because this is a Foundation command surface.

Rollback / repair path: if stale scheduled jobs do not render red, keep the card in Building Now and revise the classification/renderer until the dogfood fixture appears in the API payload and Runtime Health panel. If the UI becomes noisy, keep the API payload but hide the panel behind the existing diagnostics detail until the summary rules are fixed. If the hub payload exceeds budget or route performance regresses, remove `foundationSystemHealth` from the full payload and keep the card open rather than shipping another slow or false-green surface.

## Risks

- Risk: dashboard becomes noisy.
  - Response: show red/yellow jobs first; summarize healthy rows.
- Risk: manual jobs look broken.
  - Response: manual/paused jobs are gray unless policy marks them as expected scheduled.

## Tests

```bash
node --check lib/foundation-system-health.js scripts/process-system-health-nightly-audit-check.mjs public/foundation-runtime-renderers.js public/foundation-operations-renderers.js
npm run process:system-health-nightly-audit-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SCHEDULED-JOB-STALENESS-DASHBOARD-001 --planApprovalRef=docs/process/approvals/SCHEDULED-JOB-STALENESS-DASHBOARD-001.json --closeoutKey=scheduled-job-staleness-dashboard-v1 --commitRef=HEAD
```

## Not Next

- Do not build a new dashboard framework.
- Do not build OpenClaw/Harlan UI here.
- Do not build hub features, paid-source extraction, or marketing workflows.
