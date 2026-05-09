# SYSTEM-010-GHOST-CLOSEOUT-001 Runtime/Process Control Plan

Status: approved at 9.8 by Steve on 2026-05-09. Implementation is authorized only within this plan.

Card: `SYSTEM-010-GHOST-CLOSEOUT-001`

Current truth:

- `SECURITY-002` is shipped.
- `FOUNDATION-DONE-TEST-001` is shipped.
- `npm run process:foundation-done-test -- --report-only` reports `not_ready`.
- The runtime/process-control leg is blocked by `SYSTEM-010-GHOST-CLOSEOUT-001`.
- Do not start Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus/video mining, UI polish, or the future researcher/self-improvement agent.

## Goal

Close the runtime/process-control gap that blocks Foundation readiness: Foundation must show what is running, what can keep running, what can spend, what is stale, how to stop or decommission it, and why stale or ghost jobs cannot keep running silently.

This card is not a broad platform rewrite. It is the smallest governed runtime-control slice that can make the `FOUNDATION-DONE-TEST-001` runtime/process leg pass honestly.

## Current Runtime Model

Existing pieces:

- `lib/foundation-jobs.js` defines Foundation jobs, schedules, runtime modes, max runtime, budget class, command, args, and source IDs.
- `scripts/foundation-worker.mjs` runs due scheduled jobs, records worker startup commit, catches per-job failures, and reaps stale `foundation_job_runs`, `source_crawl_target_runs`, and `llm_calls`.
- `scripts/run-foundation-job.mjs` creates and finishes `foundation_job_runs`, captures output tail, enforces max runtime, and attempts POSIX process-group kill on timeout.
- `lib/foundation-db.js` owns `foundation_job_runs`, `foundation_job_controls`, `foundation_runtime_status`, `source_crawl_target_runs`, `source_crawl_items`, `llm_calls`, runtime snapshots, stale-run reapers, and job control updates.
- `server.js` exposes `GET /api/foundation/jobs`, `POST /api/foundation/jobs/:jobKey/control`, `GET /api/foundation-hub`, `GET /api/foundation/llm-runtime`, and `GET /api/foundation/extraction-control`.
- `public/foundation.js` renders Runtime Health, served-code trust, worker-code trust, Foundation jobs, LLM runtime, and extraction control. It can pause/resume job schedules through the existing control route.
- `scripts/foundation-verify.mjs` already checks dashboard served code, worker startup code, stale-run cleanup, LLM runtime, extraction control, and current `SYSTEM-010` scoped state.

Current gaps:

- No single active-process view across running job runs, leased source-crawl runs/items, planned/started LLM calls, dashboard/worker process metadata, and job controls.
- Pause/resume mostly controls future scheduling; it does not prove an active child process can be stopped safely.
- `foundation_job_controls.runtime_mode` supports `scheduled`, `manual`, and `paused`; it does not support a durable `decommissioned` state.
- Job runner timeout kill uses POSIX process-group semantics with a fallback child kill; ownership, process tree, and stale child proof are not explicit.
- Auto-restart-on-push is not an explicit status. Served-code and worker-code trust catch stale code, but the system does not clearly say whether restart is automatic, manual, or missing.
- Cost/process risk is spread across `llm_calls`, route cost caps, job budgets, and extraction runs; there is no operator-grade risk rollup for ghost-process closeout.
- There is no focused `process:system-010-ghost-closeout-check` proof script.

## Files And Routes To Inspect

Inspect before implementation:

- `lib/foundation-jobs.js`
- `lib/foundation-db.js`
- `scripts/foundation-worker.mjs`
- `scripts/run-foundation-job.mjs`
- `scripts/foundation-verify.mjs`
- `scripts/process-foundation-done-test.mjs`
- `lib/foundation-readiness-gates.js`
- `lib/llm-router.js`
- `lib/llm-spend-policy.js`
- `scripts/run-extraction-target.mjs`
- `server.js`
- `public/foundation.js`
- `public/foundation.html`
- `package.json`
- `docs/process/foundation-done-test.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- LaunchAgents:
  - `/Users/bensoncrew/Library/LaunchAgents/ai.bcrew.dashboard.plist`
  - `/Users/bensoncrew/Library/LaunchAgents/ai.bcrew.foundation-worker.plist`

Current routes to inspect:

- `GET /api/foundation-hub`
- `GET /api/foundation/jobs`
- `POST /api/foundation/jobs/:jobKey/control`
- `GET /api/foundation/llm-runtime`
- `GET /api/foundation/extraction-control`

Likely new or changed routes:

- `GET /api/foundation/active-processes`
- `POST /api/foundation/job-runs/:runId/stop`
- `POST /api/foundation/jobs/:jobKey/decommission`
- Existing `POST /api/foundation/jobs/:jobKey/control` extended only if that stays cleaner than adding a decommission route.

## Likely Files To Touch

Implementation should be centralized before route/UI edits:

- Add `lib/runtime-process-control.js`
  - Builds the active-process snapshot.
  - Classifies runtime/process risk.
  - Owns stop/decommission guardrails.
  - Owns process-tree kill helpers and ownership checks.
  - Produces stable proof output for scripts and routes.
- Update `lib/foundation-db.js`
  - Add/extend schema for active process metadata needed to stop safely.
  - Add `decommissioned` runtime mode or an equivalent fail-closed control state.
  - Add read helpers for active job runs, source-crawl leases, LLM calls, dashboard/worker runtime status, and control state.
  - Add write helpers for stop/decommission events and fail-closed schedule blocking.
- Update `scripts/run-foundation-job.mjs`
  - Persist child PID/process-group metadata for active runs.
  - Use a platform-aware process-tree stop helper.
  - Record timeout/stop/dead-man state in run metadata.
- Update `scripts/foundation-worker.mjs`
  - Continue stale-run reaping.
  - Refuse decommissioned jobs.
  - Record worker liveness/heartbeat in runtime status.
  - Make stale or stopped runs visible in the active-process snapshot.
- Update `server.js`
  - Add admin-gated active-process/stop/decommission routes.
  - Keep stop/decommission routes fail-closed for unknown run IDs, missing process ownership, stale code, or non-admin actors.
- Update `public/foundation.js`
  - Runtime Health gets an active-process/status panel and stop/decommission controls only where the server says the action is safe.
  - This is functional safety UI, not visual polish.
- Add `scripts/process-system-010-ghost-closeout-check.mjs`
  - Focused proof for active process view, dead-man checks, stop/decommission guardrails, stale/ghost prevention, and cost/process risk output.
- Update `package.json`
  - Add `process:system-010-ghost-closeout-check`.
- Update `scripts/foundation-verify.mjs`
  - Verify the new process script, API route, central runtime-control layer, decommission fail-closed behavior, active-process output shape, and readiness-gate integration.
- Update `lib/foundation-readiness-gates.js`
  - Make the runtime/process leg pass only when `SYSTEM-010-GHOST-CLOSEOUT-001` is done with closeout proof.
- After approval and implementation only:
  - `docs/process/system-010-ghost-closeout.md`
  - `docs/process/approvals/SYSTEM-010-GHOST-CLOSEOUT-001.json`
  - `lib/foundation-build-log.js`
  - `docs/rebuild/current-plan.md`
  - `docs/rebuild/current-state.md`

## Build Sequence

1. Central runtime registry/helper first:
   - Add a central active-process/control layer in `lib/runtime-process-control.js`.
   - Do not start by scattering route edits.
2. Read-only active-process snapshot:
   - Include dashboard, worker, running/queued Foundation jobs, leased source-crawl target runs, leased items, planned/started LLM calls, and control states.
   - Output stable summary counts and risk flags.
3. Dead-man/liveness:
   - Define max age per active class.
   - Treat missing heartbeat, stale run, expired lease, or timeout-expired LLM call as risk or failed/stopped.
   - Reuse existing stale reapers where valid; add missing proof for what remains active.
4. Pause/stop/decommission controls:
   - Pause blocks future scheduling.
   - Stop attempts to terminate one active run/process safely and records the result.
   - Decommission blocks future scheduled/manual runs unless a later explicit force path is approved.
5. Process-tree safety:
   - Stop only owned child processes recorded by the runner.
   - Use platform-aware process-tree termination.
   - Fail closed when PID/process ownership is missing or ambiguous.
6. Auto-restart-on-push status:
   - Report whether restart is automatic, manual-required, stale, or unknown for dashboard and worker.
   - Foundation does not claim auto-restart if it is not installed.
   - Served-code and worker-code checks must still fail when code is stale.
7. Cost/process risk:
   - Roll up active LLM calls, recent estimated cost, route cost caps, job budget classes, active source-crawl runs, and stale process risk.
   - No raw secrets or sensitive source content in output.
8. Focused proof script:
   - Build synthetic and live-safe checks before closeout.
   - Prove stale/ghost jobs cannot remain silent.
9. Verifier/readiness integration:
   - `foundation:verify` covers the new layer.
   - `process:foundation-done-test -- --report-only` no longer names `SYSTEM-010-GHOST-CLOSEOUT-001` once this card is actually done, while other blockers can remain.

## Acceptance Criteria

The card is done only when all are true:

- Active process view exists and is admin-gated.
- Active process view includes:
  - dashboard runtime status
  - worker runtime status
  - active/queued Foundation job runs
  - active source-crawl target runs
  - leased source-crawl items where relevant
  - planned/started LLM calls
  - job controls and runtime mode
  - restart status for dashboard and worker
  - cost/process risk summary
- Dead-man/liveness checks classify stale active work in plain English.
- Stale or ghost work cannot stay silently green:
  - stale Foundation job runs are failed or called out
  - stale source-crawl runs are failed or called out
  - stale LLM calls are failed or called out
  - active runs beyond max runtime are visible
- Pause blocks future scheduled work.
- Stop can terminate a controlled proof process and records success/failure.
- Stop fails closed for unknown run ID, missing PID, unowned process, stale server code, or unsafe actor.
- Decommission prevents a job from being scheduled or manually run through normal paths.
- Auto-restart-on-push status is explicit as `automatic`, `manual_restart_required`, `stale`, or `unknown`; no copy claims automatic restart unless proven.
- Cost/process risk summary includes active call count, planned/started call count, estimated cost where known, route cost-cap risk, and job budget classes.
- Runtime Health exposes the control state without hiding blockers.
- `SYSTEM-010-GHOST-CLOSEOUT-001` remains the only owned closeout card for this slice; other blocker cards remain open unless separately approved.
- Foundation readiness can remain `not_ready` because of other blockers, but it must not continue to fail the runtime/process leg because of SYSTEM-010.

## Proof Commands

Minimum proof after implementation:

```bash
node --check lib/runtime-process-control.js
node --check scripts/process-system-010-ghost-closeout-check.mjs
node --check scripts/run-foundation-job.mjs
node --check scripts/foundation-worker.mjs
node --check scripts/foundation-verify.mjs
npm run process:system-010-ghost-closeout-check
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SYSTEM-010-GHOST-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/SYSTEM-010-GHOST-CLOSEOUT-001.json --closeoutKey=system-010-ghost-closeout-v1 --commitRef=HEAD
```

The focused proof script must include at least:

- live active-process snapshot shape check
- synthetic stale Foundation job run check
- synthetic stale LLM call check
- synthetic stale source-crawl run check
- pause fail-closed check
- decommission fail-closed check
- controlled stop/kill proof using a harmless owned fixture process
- unsafe stop denial for unknown/unowned process
- cost/process risk output check
- no-secret/no-sensitive-content output check

## Rollback And Fail-Closed Behavior

- If active-process read fails, Runtime Health and the proof script return risk/fail, not healthy.
- If stop cannot prove process ownership, it refuses to kill.
- If process-tree kill is unsupported on the platform, it marks the action unsafe/unavailable and leaves the run visible as risk.
- If a job is decommissioned, normal scheduler and manual runner paths refuse it.
- If a job is paused, scheduler does not pick it up.
- If dashboard/worker served code is stale, mutation routes for stop/decommission refuse action until restart proof is green.
- If LLM cost/cap data is missing for active calls, output marks cost risk unknown instead of assuming safe.
- Rollback is to remove/disable the new stop/decommission mutation routes and leave read-only active-process visibility plus existing pause/reaper behavior intact.

## Not Next

Do not build in this card:

- Strategy Hub work
- Sales expansion
- Agent Feedback expansion
- Scoper
- Agent Factory
- broad corpus or video mining
- YouTube scout expansion
- creator watchlist implementation
- multimodal extractor implementation
- researcher/self-improvement agent
- UI polish beyond necessary Runtime Health safety controls
- provider credential rotation work
- meeting raw Drive ACL/vault work
