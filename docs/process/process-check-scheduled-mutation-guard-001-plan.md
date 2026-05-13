# PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001 Plan

## What

Block scheduled Foundation health/report jobs from invoking mutating check scripts unless the job is explicitly classified as mutating and disabled from unattended schedules.

## Why

The deep audit found a scheduled health job path that can run a process check with backlog/sprint writes. Scheduled jobs should not close cards, move sprints, or mutate source truth while Steve is not watching.

## Acceptance Criteria

- Foundation job definitions carry a mutation posture such as `read_only`, `report_only`, or `mutating`.
- Scheduled/unattended jobs cannot target commands that are classified as mutating.
- Existing risky scheduled check paths are made safe, disabled, or moved behind explicit mutating posture.
- A dogfood proof attempts to register or run a scheduled mutating check and proves the registry blocks it.
- `PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Job registry exposes mutation posture for relevant Foundation jobs.
- A focused proof validates safe read-only/report-only jobs and rejects a synthetic mutating scheduled job.
- Foundation verifier covers the scheduling mutation boundary.
- Sprint item closes only after dogfood proof and ship gates pass.

## Details

Existing code to reuse: `lib/foundation-jobs.js`, worker job selection code, process-check scripts, `scripts/process-verification-runs-check.mjs`, and the new process posture guard from this sprint if available. Existing docs to reuse: deep audit, runtime safety plan, AGENTS.md, and current rebuild docs. Existing scripts to reuse: `process:runtime-safety-hardening-check`, `foundation:verify`, and ship gates.

This is a scheduler/registry guard, not a rewrite of the worker. Keep V1 bounded to classifying and blocking unsafe unattended jobs.

The dogfood proof must exercise black-box behavior through the actual Foundation job registry validation path and a synthetic scheduled mutating-check job. No substring-only proof is acceptable.

Gate decision: focused proof for registry classification and block behavior, then full `process:foundation-ship` if `lib/foundation-jobs.js` or worker-visible job definitions change. Operator value: Steve can leave scheduled health/report jobs running without worrying they will close cards or move sprint state unattended. Speed bound: the focused proof should target under 2 minutes by testing registry objects directly rather than waiting for worker loops.

## Risks

- Mutating job classification could be incomplete. Repair path: fail closed for unknown posture on scheduled jobs.
- Existing health jobs may need manual-only status after this change. That is acceptable; manual-only is safer than hidden mutation.
- A static scan alone is insufficient. Dogfood must call registry validation.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001 --planApprovalRef=docs/process/approvals/PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not build a new scheduler.
- Do not enable new schedules.
- Do not close or move backlog cards from scheduled jobs.
- Do not broaden into external source extraction.
