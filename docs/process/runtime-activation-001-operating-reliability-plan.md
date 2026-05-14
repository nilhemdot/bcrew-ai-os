# RUNTIME-ACTIVATION-001 Plan

## What

Add the Operating Reliability slice of the Foundation runtime activation registry: a normalized view of which jobs and connectors are scheduled, manual, paused, blocked, due, stale, failed, healthy, degraded, or down.

V1 uses existing job definitions and connector uptime status. It does not build a new scheduler, start or stop jobs, or mutate runtime state.

## Why

Steve keeps asking whether the system is actually running. Foundation needs to answer that directly. If a job is manual-only, stale, blocked by a mutation guard, or due, it should be visible before Steve finds it while working in a hub.

This is the connective tissue that lets hub chats work in parallel: hubs can depend on Foundation status instead of guessing.

## Acceptance Criteria

- Runtime activation snapshot includes every Foundation job definition.
- Each job has runtimeMode, scheduleStatus, due/stale/blocked flags, mutation posture, source IDs, owner lane, and next action.
- Connector activation states are included from connector uptime monitor output.
- Scheduled mutating process checks are shown as blocked, not silently trusted.
- Manual-only jobs explain why they are manual.
- Dogfood proof simulates scheduled healthy, manual, paused, blocked, stale, and due jobs.

## Definition Of Done

- Runtime activation builder is deterministic and read-only.
- Foundation Hub full diagnostics include runtime activation without adding work to the summary route.
- Focused proof validates runtime state vocabulary and scheduled mutation guard behavior.
- Current Sprint doctrine is populated and the card has a durable Plan Critic pass.
- Full ship gate passes before push.

## Details

Reuse:

- `getFoundationJobDefinitions()` and `getFoundationJobRuntime()` from `lib/foundation-jobs.js`.
- Scheduled mutation guard from `validateFoundationJobSchedulePosture()`.
- Connector uptime output from `lib/connector-uptime-monitor.js`.
- Existing runtime control snapshot from `lib/runtime-process-control.js`.

Gate decision for this card: full.

Decision tree: static proof is too weak because runtime state behavior changes; focused proof is required through the actual runtime activation function path; full proof is required because the blast radius touches Foundation Hub diagnostics, package scripts, job definitions, and verifier/process proof. Any touch to `server.js` must be a thin payload composition only with no new responsibility in that large file. Any touch to `scripts/foundation-verify.mjs` must be a thin registration/check only with no new responsibility in the large verifier file. Durable runtime activation behavior lives in the new module boundary outside the monolith.

Existing docs to reuse: the two-sprint scope handoff, hardening closeouts, and Current Sprint doctrine. Existing scripts to reuse: `process:foundation-operating-reliability-check`, `process:plan-critic-architectural-rules-check`, `foundation:verify`, and `process:foundation-ship`. Live backlog and Current Sprint truth remain the source for card stage and proof status.

Operator behavior unlocked: Steve and the team can answer what is running, stale, failed, paused, blocked, or manual before a real workflow depends on it. This improves speed and quality because hub work can check Foundation runtime status instead of guessing.

The focused proof command must be fast, proportional, and target under 2 minutes so it is safe to run before each ship.

## Risks

- Risk: runtime activation becomes a scheduler.
  - Repair path: V1 is read-only; control actions stay in existing job control routes.
- Risk: status vocabulary conflicts with connector uptime.
  - Repair path: centralize vocabulary and reuse connector uptime normalization.
- Risk: stale status is noisy.
  - Repair path: base stale thresholds on schedule interval and max runtime, not arbitrary dated text.

## Tests

```bash
npm run process:foundation-operating-reliability-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=RUNTIME-ACTIVATION-001 --planApprovalRef=docs/process/approvals/RUNTIME-ACTIVATION-001.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

Focused dogfood must recreate job states that previously got confused: scheduled mutating check must be blocked, manual audit job must stay manual, and stale/due jobs must be reported without mutating anything.

The proof command must call real functions and reject substring-only proof. A string marker cannot prove runtime activation behavior.

## Not Next

- Do not start, stop, or schedule jobs from this card.
- Do not build a new worker.
- Do not add hub features.
- Do not convert manual deep audit into autonomous dev.
