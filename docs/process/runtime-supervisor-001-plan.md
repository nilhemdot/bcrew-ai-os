# RUNTIME-SUPERVISOR-001 Plan

## What

Ship the next narrow Mac Mini runtime-supervisor slice for `RUNTIME-SUPERVISOR-001`. Add a service-supervision snapshot for the dashboard and Foundation worker that is visible through the existing Runtime Process Control surface. The snapshot must show LaunchAgent label/status/pid, recorded runtime status, pid match, repo-head code trust, log paths, heartbeat age, restart command, and restart-on-push posture.

This is a visibility and proof slice on top of existing runtime controls. It does not install a new auto-restart-on-push mechanism, rewrite the scheduler, add new jobs, start source extraction, or create autonomous agent behavior.

## Why

The old system failure mode was silent runtime drift: processes could keep running after people thought they were dead, stale code could be served, and nobody had one operator surface that said what was alive, stale, stopped, or safe to restart. Foundation already has job controls and served-code proof, but `RUNTIME-SUPERVISOR-001` still needs a tighter dead-man/service view before more hub or extraction work depends on the runtime.

This card keeps Foundation honest by turning dashboard/worker supervision into source-backed runtime truth instead of another note buried in chat or docs.

The operator value is simple: Steve can open Runtime Health and know whether the dashboard and worker are actually alive on the Mac Mini, whether they match repo `HEAD`, which PID LaunchAgent owns, which log file to inspect, and which restart command to run. That unlocks safer overnight work, faster recovery, and higher-quality sprint reviews without asking Steve to reason from terminal fragments.

## Acceptance Criteria

- `/api/foundation-hub` exposes `runtimeProcessControl.serviceSupervisor` with exactly the two supervised services: dashboard and Foundation worker.
- Each service reports its LaunchAgent label, pid/status, runtime-record status, recorded process id, commit match against repo `HEAD`, pid match, log paths, restart command, heartbeat/captured age, and plain-English operator action.
- Runtime Health renders a `Supervised services` card group using that payload.
- Dogfood proof rejects missing LaunchAgent status, pid mismatch, stale running commit, and stale heartbeat/captured-at metadata.
- The focused proof script is read-only and validates live API payload, dogfood failures, Plan Critic pass, Current Sprint stage, closeout registration when done, and explicit not-next boundaries.
- `server.js` stays under 5,000 lines; this card adds only thin snapshot wiring and no new broad route logic.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/runtime-process-control.js` owns the service-supervision builder and dogfood proof.
- `server.js` passes LaunchAgent status metadata into the existing runtime-process-control snapshot without adding new routes.
- `public/foundation-runtime-renderers.js` renders the supervised-service status in Runtime Health.
- `lib/foundation-runtime-reliability-verifier.js` includes `RUNTIME-SUPERVISOR-001` verifier coverage for the new behavior.
- `scripts/process-runtime-supervisor-check.mjs` passes against the live dashboard.
- Backlog, Current Sprint, current plan/state docs, Recent Builds closeout, and ship proof all agree.

## Details

Reuse existing code instead of rebuilding:

- `lib/runtime-process-control.js` already owns stop/decommission decisions, liveness, restart-on-push reporting, and cost/process risk.
- `server.js` already captures dashboard runtime metadata and worker runtime status.
- `scripts/foundation-verify.mjs` already knows how to inspect LaunchAgent status for verifier proof.
- `public/foundation-runtime-renderers.js` already renders Runtime Process Control.
- `ops/launchagents/ai.bcrew.dashboard.plist` and `ops/launchagents/ai.bcrew.foundation-worker.plist` already define labels, log paths, and restart commands.

Implementation shape:

- Add service definitions for dashboard and worker with label, log paths, restart command, required runtime key, and stale-capture budget.
- Add `buildSupervisedServiceSnapshot`, `buildRuntimeServiceSupervisorSnapshot`, and `buildRuntimeSupervisorDogfoodProof` in `lib/runtime-process-control.js`.
- Add a small LaunchAgent status helper in `server.js` and pass `{ dashboard, foundation-worker }` status into `buildRuntimeProcessControlSnapshot`.
- Add `runtimeProcessControl.serviceSupervisor` to the existing payload and render it inside `renderRuntimeProcessControlPanel`.
- Add focused proof and verifier coverage.
- Route/API performance budget: this touches existing `/api/foundation-hub` payload shape only. Focused proof must call the live route and keep default `/api/foundation-hub` under `2s` and `800 KB`; `process:foundation-ship` then runs the full live verifier. No new route or full-diagnostics payload expansion is allowed.
- Gate decision: static syntax checks for changed JS, focused behavior proof through `process:runtime-supervisor-check`, and full Foundation ship gate because this touches `server.js`, runtime trust, and `package.json`.

## Risks

- **False green risk:** A service can have a runtime row but no matching LaunchAgent pid. Dogfood must prove pid mismatch fails.
- **Stale-code risk:** Runtime metadata can exist but point at an older commit. Dogfood must prove stale commit fails.
- **Stale heartbeat risk:** A service can be running but not recently captured. The snapshot must show captured age and fail stale metadata in dogfood.
- **Server monolith risk:** `server.js` is under 5,000 lines but close. Keep server edits to thin dependency wiring only.
- **Operator-action risk:** Do not claim auto-restart-on-push is automatic until a later hook or WatchPaths proof exists.
- **Repair path:** if live LaunchAgent proof fails, stop the sprint and run the printed `launchctl kickstart -k ...` repair command before continuing. If pid/commit/captured-at proof still fails after restart, leave `RUNTIME-SUPERVISOR-001` in Building Now or Returned with the failure detail instead of patching the verifier around it.
- **Rollback path:** if the new payload makes Runtime Health or `/api/foundation-hub` slower or unstable, revert the renderer/API wiring for this card and keep the dogfood/proof script as a failing evidence artifact for the next smaller slice.

## Tests

```sh
node --check lib/runtime-process-control.js server.js public/foundation-runtime-renderers.js lib/foundation-runtime-reliability-verifier.js scripts/process-runtime-supervisor-check.mjs
npm run process:runtime-supervisor-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=RUNTIME-SUPERVISOR-001 --planApprovalRef=docs/process/approvals/RUNTIME-SUPERVISOR-001.json --closeoutKey=runtime-supervisor-v1 --commitRef=HEAD
```

Not next: no hub feature work, no Marketing Video Lab wiring, no Canva asset-library behavior, no paid-source auth, no source extraction, no Build Intel extraction, no autonomous live agent actions, no new scheduler framework, no auto-restart-on-push install, no Meeting Vault Phase B, and no Drive permission mutation.
