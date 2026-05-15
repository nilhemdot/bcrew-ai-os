# Foundation Operating Reliability Sprint Sequence - 2026-05-14

## Why

Steve asked whether the next work is becoming many tiny fixes instead of a coherent system hardening plan.

Decision: this is one Foundation hardening program shipped in bounded sprints. Each card proves one operating boundary so the work does not turn into vague "review the whole codebase" churn.

Status update after sprint closeouts: Sprint A is closed, the Verification + Continued Cleanup sprint is already closed in live backlog under `foundation-verification-cleanup-v1`, the Ship-Gate Speed + Payload Cleanup sprint exposed a measured bottleneck, and the ClickUp verifier-drag sprint closed that bottleneck under `foundation-clickup-verify-health-boundary-v1`.

## Sprint A - Foundation Operating Reliability

Goal: make Foundation know what is healthy, degraded, stale, failed, running, manual-only, or paused before a ship gate or hub workflow discovers it the hard way.

Status: closed under `foundation-operating-reliability-v1`.

Closed cards:

1. `SOURCE-023` - add retry/backoff, health checks, and redacted errors to FUB, ClickUp, Slack, and remaining weaker connectors.
2. `CONNECTOR-UPTIME-MONITOR-001` - recurring read-only connector uptime/status monitor for ClickUp, FUB, Google, Slack, Missive, and KPI/Supabase.
3. `RUNTIME-ACTIVATION-001` slice - extend activation visibility so jobs/connectors/systems show active, scheduled, manual-only, stale, failed, paused, or retired.
4. `SYSTEM-HEALTH-AUDITOR-001` slice - turn the report-first code-quality audit into a morning health surface, still report-only and no auto-fixes.
5. `PLAN-STATE-RECONCILE-001` - reconcile current plan/state/docs/board wording after the hardening, performance, hub coordination, and source outage boundary work.

Hard rules:

- Open sprint in live DB visibly with all cards in Scoping first.
- Doctrine per card before Sprint Ready.
- Plan Critic score >= 9.8 per card.
- One card in Building Now at a time.
- Dogfood proof per card: recreate the failure mode and prove the system blocks it, fails closed, or reports degraded state.
- No feature work, hub UI work, paid-source extraction, Build Intel expansion, broad monolith refactor, autonomous dev, or auto-repair.

## Inserted Sprint - Foundation Ship-Gate Speed + Payload Cleanup

Reason inserted: after Sprint A and full diagnostics hardening, Steve challenged the slow closeout loop. The sprint measured the problem rather than guessing.

Status: closed under `foundation-ship-gate-speed-payload-cleanup-v1`.

Closed cards:

1. `SHIP-GATE-FAST-PREFLIGHT-001` - added a fast read-only preflight before `process:foundation-ship` enters expensive gates.
2. `FOUNDATION-VERIFY-TIMING-001` - added real verifier timing/profile output with a machine-readable `FOUNDATION_VERIFY_PROFILE` line.
3. `FOUNDATION-VERIFY-MODULE-SPLIT-002` - split the LLM auth audit verifier check into a focused module with dogfood proof.
4. `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001` - compacted heavy full Foundation Hub diagnostics sections and reduced full payload from about 4.82 MB to about 3.54 MB.
5. `SHIP-GATE-FRESHNESS-OWNERSHIP-001` - made freshness blockers show owner, manual posture, latest run, age, and repair command.

Important measured result:

- `process:foundation-ship` now fails stale LLM auth freshness in about 0.2 seconds before expensive gates.
- The full ship gate still takes about 94 seconds because `foundation:verify` takes about 92 seconds.
- The profile shows `health:clickup:verify` is the largest single drag at roughly 45 seconds, about half the gate time.

## Inserted Sprint - Foundation Verifier Drag + ClickUp Health Boundary

Goal: reduce the measured verifier bottleneck without weakening trust. ClickUp health should be fast, bounded, and reported as source health/degraded state when appropriate instead of consuming half the ship gate.

Placement: this sprint was inserted from the `foundation-ship-gate-speed-payload-cleanup-v1` timing profile. It did not replace the previously agreed verification/reviewer work; that work had already closed under `foundation-verification-cleanup-v1`. This sprint closed under `foundation-clickup-verify-health-boundary-v1`.

Closed cards:

1. `CLICKUP-VERIFY-FAST-PATH-001` - make `health:clickup:verify` bounded and fast enough for the ship gate while preserving required source-health proof.
2. `CLICKUP-VERIFY-PAYLOAD-CACHE-001` - reuse one bounded ClickUp read snapshot inside the verifier instead of making repeated expensive calls where safe.
3. `CLICKUP-DEGRADED-HEALTH-DOGFOOD-001` - dogfood ClickUp API timeout/500/rate-limit cases and prove verifier reports governed degraded source health instead of hanging or pretending health.
4. `FOUNDATION-VERIFY-SLOW-BUDGET-001` - add a verifier profile budget/report threshold so any future section crossing the agreed limit is named before the next sprint.

Acceptance:

- Dogfood proof recreated slow ClickUp/vendor failure modes.
- `foundation:verify --profile=true` shows ClickUp no longer dominates the gate: `health:clickup:verify` measured 2.733 seconds in the final profile proof.
- No verifier checks were skipped or weakened.
- No ClickUp writes, source mutations, hub feature work, Build Intel, paid-source auth, or broad refactor were added.

## Sprint B - Foundation Verification And Continued Cleanup

Goal: verify the recently shipped gates are not theater, keep shrinking dangerous files, and put senior-engineer review on an explicit cadence.

Status: closed under `foundation-verification-cleanup-v1`. These cards did not silently drop; they are done in live backlog. Future cleanup work should build on their proofs rather than recreating them.

Closed cards:

1. `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001` - regression-test architectural Plan Critic rules against large-file additions, no-apply check-script writes, verifier live-state mutation, missing proof, and missing performance budgets.
2. `HUB-PERF-VERIFICATION-001` - remeasure default `/api/foundation-hub` and explicit `/api/foundation-hub?view=full` against the 70.244s / 4.63 MB baseline and record current budget truth.
3. `MONOLITH-SPLIT-CONTINUE-001` - continue measured monolith splits for `lib/foundation-db.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, and `server.js` without broad behavior changes.
4. `RECURRING-DEEP-AUDIT-001` - add a manual-approval recurring senior-engineer deep audit every 4-6 sprints, modeled on `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`.

Important correction: do not promise all monoliths will be under 5,000 lines in one sprint. That would encourage unsafe rewrites. Each cleanup sprint should split one or two coherent seams, prove no behavior changed, and reduce the largest-risk files measurably.

Reviewer-system upgrade: Steve clarified that a manual 4-6 sprint deep audit is too weak for the rebuild quality bar. Live backlog now has `NIGHTLY-DEEP-AUDIT-UPGRADE-001` as the successor card. It should not rewrite the completed `RECURRING-DEEP-AUDIT-001`; it should upgrade the audit system into a scheduled report-only nightly reviewer with deterministic backend/frontend scanning, incremental LLM senior-engineer review on changed/high-risk code, frontend/backend workflow smoke or replay gap checks, performance/debt trend deltas, and diff-only morning output. Dogfood proof must show it would have caught the 2026-05-13 findings: 70s API, self-repairing verifier, write-capable checks, hardcoded live truth/source counts, and 10K+ line monoliths.

## Recurring Cadence

Alternate the next Foundation work:

- Theme sprint: reliability, source health, runtime activation, connector hardening.
- Cleanup sprint: monolith splits, performance budgets, gate regression proofs, reviewer cadence.

This prevents the system from getting wider without getting smaller.

## Current Measured Next

After `foundation-clickup-verify-health-boundary-v1`, the next measured cleanup target is full Foundation Hub diagnostics and Ops Hub response time:

- `fetch:/api/foundation-hub?view=full` measured about 7.7 seconds.
- `fetch:/api/ops-hub` measured about 6.9 seconds.
- `health:clickup:verify` is no longer the dominant verifier drag.

Next sprint should be a bounded speed cleanup against those measured routes, followed by continued monolith splits.

The reviewer-system follow-up is also queued: `NIGHTLY-DEEP-AUDIT-UPGRADE-001` should land in the next cleanup cycle or alongside the speed cleanup if capacity allows. It is report-only and proposal-only; it must not auto-fix code or auto-create backlog rows.

## Hub Parallel Work

Hub work may proceed in parallel using `HUB-001` protocol:

- hub chat plans first,
- hub-owned files only,
- no commit or push,
- stop and coordinate for `server.js`, `package.json`, `lib/foundation-*`, `scripts/process-*`, `scripts/foundation-verify.mjs`, `docs/process/*`, `docs/handoffs/*`, auth/security/source-contract files, or Foundation DB work,
- main session reviews the hub handoff and runs `process:hub-work-check` before commit.

Sales Hub is the safest parallel lane. Ops Hub can plan in parallel but should coordinate before edits because it commonly touches ClickUp/agent shared files.

## Existing Work Not Duplicated

`PLAN-CRITIC-ARCHITECTURAL-RULES-001` and `FOUNDATION-PERFORMANCE-001` already closed with focused dogfood and performance proof in live backlog. Sprint B keeps them honest with regression and fresh measurement rather than pretending those cards never existed.

## Not Next

- Skool/myICOR paid extraction.
- Marketing content production.
- Department Director / Master Director agents.
- Base44-style personal superagent work.
- Broad rewrite.
- Autonomous dev.
- Hub product expansion inside Foundation reliability sprint.
