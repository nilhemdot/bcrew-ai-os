# FOUNDATION-JOB-MUTATION-ALLOWLIST-001 Plan

Status: approved for build
Card: `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`
Sprint: `foundation-job-mutation-allowlist-2026-05-15`
Closeout key: `foundation-job-mutation-allowlist-v1`

## What

Add an explicit mutation allowlist for enabled scheduled Foundation jobs.

V1 makes each scheduled job prove its intended mutation posture through a keyed allowlist row before the worker can trust it. The allowlist distinguishes read-only/report-only health work, internal operational write jobs, external send jobs, and intentionally blocked mutating process checks. It adds a read-only focused proof, exposes allowlist status on runtime job rows, adds thin verifier coverage, and closes `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`.

## Why

The scheduled mutation guard already blocks unknown or mutating process-check jobs, but the 2026-05-14 nightly audit still found a broader job/script ambiguity: a scheduled job can look harmless because posture is inferred from command shape or job type. That is not tight enough for unattended work.

The correct invariant is simple: scheduled jobs must have explicit reviewable posture. If a job is scheduled and no allowlist row exists, it fails closed. If the allowlist says report-only and the job becomes mutating, it fails closed. If a known mutating process check remains scheduled, it stays visible as intentionally blocked rather than silently runnable.

Useful operator behavior: Steve and the team can open runtime/source health and see which jobs are safe to run unattended, which jobs are report-only, which jobs intentionally write internal operating data, which jobs can send externally, and which jobs are blocked with a plain-English reason. This unlocks better speed and quality in the real workflow because the morning report and ship gate show job posture before Steve has to debug "why did this random scheduled job mutate state?"

## Acceptance Criteria

- Every enabled scheduled Foundation job has an explicit allowlist row or an explicit blocked row.
- Scheduled jobs with allowlist/posture mismatches are blocked.
- Scheduled unknown jobs without allowlist rows are blocked.
- Scheduled read-only and report-only allowlisted jobs pass.
- Scheduled operational-write and external-write jobs pass only when their allowlist row matches the job key and posture.
- The runtime/job surfaces expose mutation posture and allowlist status plainly enough for the morning health view to show why a job is allowed or blocked.
- The focused proof is read-only by default and does not mutate backlog, Current Sprint, jobs, source truth, files, or external systems.

## Definition Of Done

- `docs/process/approvals/FOUNDATION-JOB-MUTATION-ALLOWLIST-001.json` exists and validates at score `>= 9.8`.
- `npm run process:foundation-job-mutation-allowlist-check -- --json` passes.
- Dogfood proof recreates the audit failure mode: a scheduled job with no allowlist and a scheduled job whose command posture no longer matches its allowlist are both blocked.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=FOUNDATION-JOB-MUTATION-ALLOWLIST-001 --planApprovalRef=docs/process/approvals/FOUNDATION-JOB-MUTATION-ALLOWLIST-001.json --closeoutKey=foundation-job-mutation-allowlist-v1 --commitRef=HEAD` passes before push.
- Live backlog card is `done`, Current Sprint shows the card in `done_this_sprint`, and closeout key `foundation-job-mutation-allowlist-v1` is in the build-log registry.

## Details

Implementation path:

1. Add `lib/foundation-job-mutation-allowlist.js` with constants, keyed allowlist policy, scheduled-job report builder, and dogfood fixtures.
2. Update `lib/foundation-jobs.js` so `validateFoundationJobSchedulePosture()` fails closed when a scheduled job has no allowlist row, a posture mismatch, or an explicit blocked allowlist decision.
3. Preserve the existing process-check mutation guard and layer the allowlist on top of it.
4. Expose `mutationAllowlist` on runtime job rows and compact Foundation Hub job payloads.
5. Add `scripts/process-foundation-job-mutation-allowlist-check.mjs` as the focused read-only proof.
6. Add package script `process:foundation-job-mutation-allowlist-check`.
7. Add thin verifier coverage that calls the focused module/report and checks the package script.
8. Add closeout record and update current rebuild docs.

Existing work reused:

- Existing code: `lib/foundation-jobs.js`, `scripts/foundation-worker.mjs`, `scripts/run-foundation-job.mjs`, `lib/connector-uptime-monitor.js`, and `lib/foundation-hub-summary-payload.js`.
- Existing docs: `docs/handoffs/nightly-deep-audit-2026-05-14.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `scripts/foundation-verify.mjs`, `scripts/process-foundation-operating-reliability-check.mjs`, and the existing process proof script pattern.
- Existing guardrail: `PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001` and `buildScheduledMutationGuardDogfoodProof()`.
- Existing audit/backlog truth: live backlog card `FOUNDATION-JOB-MUTATION-ALLOWLIST-001` and Current Sprint DB state.
- Existing proof commands: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and runtime activation/source-health checks.

Split plan for oversized files: `scripts/foundation-verify.mjs` receives only thin import/delegation coverage. New policy and proof logic live in `lib/foundation-job-mutation-allowlist.js` and the focused process script.

Gate decision tree: static syntax checks cover changed JS/JSON, focused proof uses `npm run process:foundation-job-mutation-allowlist-check -- --json` against the actual function path, and full ship gate is required because this changes scheduled-job runtime safety, verifier coverage, package scripts, docs, Current Sprint truth, and Recent Builds closeout.

The focused check script is read-only by default. It must not include `updateBacklogItem`, `createBacklogItem`, `upsertFoundationCurrentSprintOverlay`, SQL `INSERT/UPDATE/DELETE`, or `fs.writeFile`; if a future version needs writes it must add explicit `--apply` posture and separate approval.

## Risks

- Risk: Over-broad allowlist blocks legitimate scheduled extraction/sync jobs.
  - Repair path: allowlist rows include `operational_write` and `external_write` where scheduled behavior is intentional; the check reports blocked rows with plain-English reasons.
- Risk: The allowlist becomes a rubber stamp.
  - Repair path: dogfood forces mismatch and missing-row fixtures to fail closed, and scheduled jobs must match key, runtime mode, and posture.
- Risk: A mutating process check gets relabeled as report-only.
  - Repair path: the existing process-check guard remains active after allowlist evaluation and blocks mutating/unknown process-check schedules.
- Risk: The verifier monolith grows again.
  - Repair path: verifier receives only thin coverage; policy logic stays in the focused module.

## Tests

Run in order:

```bash
node --check lib/foundation-job-mutation-allowlist.js lib/foundation-jobs.js lib/connector-uptime-monitor.js lib/foundation-hub-summary-payload.js scripts/process-foundation-job-mutation-allowlist-check.mjs scripts/foundation-verify.mjs
npm run process:foundation-job-mutation-allowlist-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-JOB-MUTATION-ALLOWLIST-001 --planApprovalRef=docs/process/approvals/FOUNDATION-JOB-MUTATION-ALLOWLIST-001.json --closeoutKey=foundation-job-mutation-allowlist-v1 --commitRef=HEAD
```

Not next: scheduler behavior rewrite, new scheduled jobs, source extraction expansion, hub UI, Marketing Video Lab wiring, Build Intel extraction, paid-source auth, Meeting Vault Phase B, Drive permission mutation, or DB seed split.
