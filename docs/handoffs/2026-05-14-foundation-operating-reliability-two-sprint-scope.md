# Foundation Operating Reliability Two-Sprint Scope - 2026-05-14

## Why

Steve asked whether the next work is becoming many tiny fixes instead of a coherent system hardening plan.

Decision: this is one Foundation hardening program shipped in bounded sprints. Each card proves one operating boundary so the work does not turn into vague "review the whole codebase" churn.

## Sprint A - Foundation Operating Reliability

Goal: make Foundation know what is healthy, degraded, stale, failed, running, manual-only, or paused before a ship gate or hub workflow discovers it the hard way.

Candidate cards:

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

## Sprint B - Foundation Verification And Continued Cleanup

Goal: verify the recently shipped gates are not theater, keep shrinking dangerous files, and put senior-engineer review on an explicit cadence.

Candidate cards:

1. `PLAN-CRITIC-ARCH-RULES-DOGFOOD-001` - regression-test architectural Plan Critic rules against large-file additions, no-apply check-script writes, verifier live-state mutation, missing proof, and missing performance budgets.
2. `HUB-PERF-VERIFICATION-001` - remeasure default `/api/foundation-hub` and explicit `/api/foundation-hub?view=full` against the 70.244s / 4.63 MB baseline and record current budget truth.
3. `MONOLITH-SPLIT-CONTINUE-001` - continue measured monolith splits for `lib/foundation-db.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, and `server.js` without broad behavior changes.
4. `RECURRING-DEEP-AUDIT-001` - add a manual-approval recurring senior-engineer deep audit every 4-6 sprints, modeled on `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`.

Important correction: do not promise all monoliths will be under 5,000 lines in one sprint. That would encourage unsafe rewrites. Each cleanup sprint should split one or two coherent seams, prove no behavior changed, and reduce the largest-risk files measurably.

## Recurring Cadence

Alternate the next Foundation work:

- Theme sprint: reliability, source health, runtime activation, connector hardening.
- Cleanup sprint: monolith splits, performance budgets, gate regression proofs, reviewer cadence.

This prevents the system from getting wider without getting smaller.

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
