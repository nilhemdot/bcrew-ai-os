# CLICKUP-VERIFY-PAYLOAD-CACHE-001 Plan

## What

Add an in-run ClickUp verification snapshot cache so one `clickup:verify` run does not repeat the same expensive list, field, or task reads when checking a configured list.

## Why

The current bottleneck is vendor read latency. Steve needs the Foundation verifier to prove ClickUp health once per run and reuse that bounded snapshot inside the same process instead of paying repeated reads or hiding which source boundary is slow.

## Acceptance Criteria

- The ClickUp source verifier has a per-run snapshot cache keyed by list id.
- Cached snapshots include source-health metadata and never outlive the process run.
- Degraded snapshots are cached as degraded, not converted to healthy.
- The dogfood proof proves duplicate list requests reuse one snapshot.
- No durable cache or stale cross-run cache is introduced.

## Definition Of Done

- Focused proof recreates duplicate list verification and proves call count stays bounded.
- Focused proof recreates a degraded snapshot and proves the degraded state is preserved when reused.
- The focused proof calls the actual function path in the source verifier module, exercises dogfood duplicate-list and degraded-cache behavior, and rejects substring-only proof.
- `CLICKUP-VERIFY-PAYLOAD-CACHE-001` has a durable Plan Critic pass row with score at least 9.8 before build.
- Proof command `npm run process:clickup-verify-health-boundary-check -- --json` returns pass/revise-style checks and stays fast under 2 minutes for normal runs.
- Current Sprint doctrine and Plan Critic rows are populated.
- Full ship gate passes before push.

## Details

Reuse existing code: `lib/clickup.js`, the new ClickUp source verifier module from this sprint, `scripts/clickup-source-verify.mjs`, and `scripts/process-clickup-verify-health-boundary-check.mjs`. Reuse existing docs, existing scripts, live backlog, and Current Sprint truth from the Foundation Verifier Drag + ClickUp Health Boundary sprint.

Gate decision: focused plus full. The cache is process-local and read-only, but it supports a load-bearing source-health proof consumed by `foundation:verify`, so final ship still uses full Foundation ship. The useful operator behavior for Steve and the team is a faster, quality-preserving gate that does not make people bypass source-health checks.

## Risks

- Risk: cache hides a failed read. Repair path: failed/degraded snapshots remain degraded and carry owner/repair context.
- Risk: cache becomes cross-run truth. Repair path: V1 cache is local to one verifier invocation only.
- Risk: this becomes a generic caching framework. Repair path: keep it inside the ClickUp source verifier module for this sprint.
- Risk: the proof becomes marker-based. Repair path: fail closed unless the dogfood proof calls the real function path and rejects substring-only proof.

## Tests

- Static: `node --check lib/clickup-source-verifier.js scripts/clickup-source-verify.mjs scripts/process-clickup-verify-health-boundary-check.mjs`
- Focused: `npm run process:clickup-verify-health-boundary-check -- --json`
- Profile: `npm run process:foundation-verify-profile-check -- --json`
- Full: `npm run process:foundation-ship -- --card=FOUNDATION-VERIFY-SLOW-BUDGET-001 --planApprovalRef=docs/process/approvals/FOUNDATION-VERIFY-SLOW-BUDGET-001.json --closeoutKey=foundation-clickup-verify-health-boundary-v1 --commitRef=HEAD`

## Not Next

- Do not add Redis, files, or durable ClickUp caches.
- Do not cache writes.
- Do not claim stale data is fresh.
- Do not build hub product behavior.
