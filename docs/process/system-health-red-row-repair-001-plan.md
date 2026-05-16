# SYSTEM-HEALTH-RED-ROW-REPAIR-001 Plan

Card: `SYSTEM-HEALTH-RED-ROW-REPAIR-001`
Sprint: `system-health-red-row-repair-2026-05-16`
Closeout key: `system-health-red-row-repair-v1`

## What

Repair the first red rows exposed by the new Foundation system-health report instead of letting the report become another dashboard Steve has to manually police.

## Why

Steve found the missed nightly audit. The system did not surface it loudly enough before he asked. The next reliability bar is not "we have a health report." It is "red rows get repaired, parked with a reason, or made impossible to miss." This card closes the immediate hidden-failure loop from the 2026-05-16 system-health report.

Operator value: Steve can open the Foundation health surface and see real current risk instead of stale failed job records, old manual failures, or avoidable duplicate-key extraction bugs.

## Acceptance Criteria

- Foundation worker stale-run cleanup uses each job's `maxRuntimeSeconds` plus bounded grace instead of one global multi-hour timeout.
- Dogfood proof proves the stale active-run reaper honors a short per-job runtime budget.
- Video content extraction uses compact hash-backed crawl item keys so two long Skool redirect URLs with the same prefix cannot collide.
- Dogfood proof recreates that exact long-URL collision class and proves distinct keys.
- Connector uptime keeps old manual job failures visible but does not let them poison current connector health forever.
- Dogfood proof recreates a manual failed Slack job with healthy credentials/probe and proves connector health stays healthy while the failed manual job remains visible.
- The regenerated system-health report is current after the fixes, with remaining red rows either repaired or explicitly explainable.

## Definition Of Done

- `SYSTEM-HEALTH-RED-ROW-REPAIR-001` closes under `system-health-red-row-repair-v1`.
- This plan and `docs/process/approvals/SYSTEM-HEALTH-RED-ROW-REPAIR-001.json` validate.
- `npm run process:system-health-red-row-repair-check -- --json` passes.
- `npm run process:system-health-nightly-audit-check -- --json --write-report` regenerates the morning health report.
- `npm run foundation:verify -- --json-summary` passes.
- Full Foundation ship gate passes before push.

## Details

Root invariant: a red row is a real work item. If it is stale telemetry, fix the telemetry. If it is a real runtime bug, fix the bug. If it is an old/manual failure, keep it visible without making current scheduled health false-red.

Existing code to reuse:

- `lib/foundation-runtime-job-store.js` stale active-run reaper.
- `scripts/foundation-worker.mjs` stale-run cleanup call.
- `scripts/extract-video-content.mjs` video extraction item key generation.
- `lib/connector-uptime-monitor.js` connector health rollup.
- `lib/foundation-system-health.js` health report and staleness dogfood.

Gate decision tree: focused dogfood first, then regenerate system-health, then `foundation:verify`, then ship gate. If any red row remains, the closeout must name whether it is repaired, expected/manual, or still active work.

Large-file split/extraction plan: do not expand the verifier monolith for this card. Keep behavior in the existing focused modules and add only a small focused process check.

Rollback / repair path: if the stale-run threshold is too aggressive, increase grace seconds in one place and keep the dogfood threshold explicit. If hashed video keys collide or break exact upserts, revert only the key helper and use the existing `(target_key, external_id)` unique path. If connector health hides an attended scheduled failure, revert the manual-job filter and refine it to check `runtimeMode` and `scheduleStatus` together.

## Not Next

- Do not build new source extraction.
- Do not add hub features, Canva, Marketing Video Lab, OpenClaw voice, or paid-source auth.
- Do not rewrite Foundation jobs, verifier, or connector registry broadly.
- Do not auto-create backlog cards from health findings.
