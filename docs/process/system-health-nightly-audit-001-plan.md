# SYSTEM-HEALTH-NIGHTLY-AUDIT-001 Plan

Card: `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
Sprint: `foundation-system-health-visibility-2026-05-16`
Closeout key: `system-health-nightly-audit-v1`

## What

Build a report-only system health rollup that audits Foundation jobs, scheduled run freshness, connectors, endpoint budgets, the nightly code auditor, verifier health, source extraction visibility, and current sprint state into one morning report.

## Why

Steve had to ask whether the nightly auditor ran. That means the system had telemetry, but not accountability. A configured job is not truth. A successful fresh run is truth. This card makes stale, failed, blocked, missing, or hidden Foundation systems visible without Steve manually querying ledgers.

Operator value: Steve gets one morning health artifact and one API payload surface that answers the real workflow question: "What broke, what silently stopped running, what is stale, and what do I do first?" The useful thing this unlocks is faster, higher-quality operator decisions before Steve trusts green checks, starts hub work, or lets long-running Codex work continue.

## Acceptance Criteria

- `lib/foundation-system-health.js` builds a deterministic read-only health snapshot from existing Foundation job, connector, endpoint, audit, source, and sprint surfaces.
- The snapshot classifies scheduled jobs by last successful run age, due/overdue state, failed/latest state, blocked schedule state, manual/paused state, and plain-English next action.
- The rollup includes at least: scheduled jobs, nightly deep audit freshness, Foundation verifier job state, connector uptime, endpoint budgets, current sprint state, source/extraction signal, and report-only posture.
- A scheduled report-only job `system-health-nightly-audit` exists and runs after the nightly deep audit window.
- The job writes `docs/handoffs/system-health-{YYYY-MM-DD}.md` and `.json` only when explicitly called with `--write-report`; the scheduler job uses that flag and still remains report-only.
- The report is diff-oriented and concise: red/yellow status first, green summary second, no giant raw ledger dump.
- Dogfood proof recreates the exact failure class: a job is scheduled but has no fresh successful run after its due window. The snapshot must mark it red.
- Focused proof is read-only by default except explicit report artifact writing behind `--write-report`.

## Definition Of Done

- `SYSTEM-HEALTH-NIGHTLY-AUDIT-001` closes under `system-health-nightly-audit-v1`.
- This plan and `docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json` validate.
- A durable Plan Critic pass row exists at `9.8+`.
- `npm run process:system-health-nightly-audit-check -- --json` passes without writing.
- `npm run process:system-health-nightly-audit-check -- --json --write-report` writes the system-health report.
- `foundation:verify` includes the system-health proof and fails closed if the proof disappears.
- Full Foundation ship gate passes before push.

## Details

Root invariant: nothing important is green because it is configured. It is green only if it ran, responded, or reported fresh healthy evidence inside its expected window.

Existing code to reuse:

- `lib/foundation-runtime-job-store.js` for job definitions, latest runs, and runtime status.
- `lib/foundation-jobs.js` for scheduler semantics and schedule guards.
- `lib/nightly-audit-run-proof.js` for the specific nightly auditor freshness rule.
- `lib/connector-uptime-monitor.js` for connector, runtime activation, and morning health snapshots.
- `lib/foundation-endpoint-budgets.js` for hot route budgets.
- `lib/foundation-current-sprint.js` for sprint status.
- `lib/source-contracts.js` and `getFoundationSnapshot()` for source/extraction context.

Existing docs to reuse:

- `docs/handoffs/2026-05-16-foundation-cleanup-arc-closeout.md`.
- `docs/process/nightly-audit-run-proof-001-plan.md`.
- `docs/process/nightly-audit-scheduler-due-fix-001-plan.md`.

Existing scripts to reuse:

- `npm run process:nightly-audit-run-proof-check -- --json`.
- `npm run process:foundation-operating-reliability-check -- --json`.
- `npm run foundation:verify -- --json-summary`.
- `npm run process:foundation-ship`.

Gate decision tree: static syntax checks, focused system-health proof, report-write proof, backlog hygiene, `foundation:verify`, then full ship gate because the blast radius changes what "Foundation healthy" means.

Large-file split/extraction plan: do not add logic to `server.js`, `lib/foundation-db.js`, or the verifier monolith. The new behavior lives in `lib/foundation-system-health.js`; any verifier touch is thin delegation only.

Focused proof: synthetic fixtures must include fresh scheduled success, overdue missing latest run, latest failed run, stale prior success, blocked scheduled job, manual job, connector risk, endpoint risk, and a clean healthy case. Substring-only proof is rejected.

Rollback / repair path: if the dogfood proof fails, keep the card in Building Now, do not close the sprint, and revise `lib/foundation-system-health.js` until stale scheduled jobs fail red and fresh successful runs pass green through the real function path. If the live report is noisy or hides a red item, keep the report-write path disabled, leave the job manual, and reopen the snapshot classification before scheduling. If verifier coverage regresses, remove the new scheduled job definition from `lib/foundation-jobs.js` and keep the visible failure in backlog rather than shipping another false-green health layer.

## Risks

- Risk: the report gets noisy and Steve stops reading it.
  - Response: red/yellow rows first, green rows summarized, raw data in JSON only.
- Risk: scheduled report writing is mistaken for mutation.
  - Response: job posture is `report_only`; no backlog, sprint, source-system, provider, or external writes.
- Risk: local machine downtime creates red health.
  - Response: that is valid. The report should say the machine or job did not run, not silently green.

## Tests

```bash
node --check lib/foundation-system-health.js scripts/process-system-health-nightly-audit-check.mjs scripts/foundation-verify.mjs
npm run process:system-health-nightly-audit-check -- --json
npm run process:system-health-nightly-audit-check -- --json --write-report
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SYSTEM-HEALTH-NIGHTLY-AUDIT-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json --closeoutKey=system-health-nightly-audit-v1 --commitRef=HEAD
```

## Not Next

- Do not auto-fix failed jobs.
- Do not auto-create backlog cards from health findings.
- Do not add hub features, Canva, Marketing Video Lab, paid-source auth, or Build Intel extraction.
- Do not change OpenClaw voice wiring from this Foundation card.
