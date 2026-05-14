# RECURRING-DEEP-AUDIT-001 Plan

## What

Put the senior-engineer deep audit on a recurring, manual-approval cadence.

V1 registers a report-only Foundation job and proof contract for a deep audit every 4-6 Foundation sprints. It does not run an autonomous reviewer, mutate code, mutate backlog, or auto-fix anything.

## Why

Steve thought we had a nightly deep code reviewer. What actually existed was a deterministic scanner plus one one-time deep audit. The missing system boundary is recurring senior-engineer review with file/line evidence and proposal-only routing.

The operator value is that Steve wakes up to meaningful review cadence instead of discovering rot only after the UI crawls or a verifier lies.

## Acceptance Criteria

- A `recurring-deep-audit` Foundation job is registered as manual, report-only, and unscheduled by default.
- The job contract specifies cadence trigger: every 4-6 closed Foundation sprints or explicit Steve approval.
- Output path pattern is `docs/handoffs/deep-audit-{date}.md`.
- Finding schema includes severity, file, line, issue, why it matters, fix-now vs backlog, and proposed card id.
- The proof shows the job cannot run as scheduled mutation work and cannot auto-create backlog cards.
- A sample report contract mirrors the 2026-05-13 deep audit shape without copying private chat or doing a live autonomous LLM audit.

## Definition Of Done

- Recurring audit behavior lives in a small module.
- `lib/foundation-jobs.js` registers the manual report-only job.
- Package script exposes a focused check for the audit contract.
- Current Sprint has doctrine and a durable Plan Critic pass row before implementation.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `lib/foundation-jobs.js`, scheduled mutation guard, code-quality nightly audit scanner, Current Sprint, Research Inbox proposal-only posture, approval integrity, and full Foundation ship gates.

Existing docs to reuse: `docs/handoffs/2026-05-13-deep-foundation-code-audit.md`, code-quality nightly audit artifacts, current plan/current state, and Foundation rebuild discipline in `AGENTS.md`.

Existing scripts to reuse: `process:code-quality-nightly-audit-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static proof alone is too weak; focused proof checks the real job registry, manual posture, report-only mutation boundary, output path contract, and sample finding schema; full proof is required because job registry, package scripts, verifier coverage, and closeout truth change. Blast radius is Foundation review cadence and process evidence.

Split plan: any touch to `scripts/foundation-verify.mjs` or closeout records is thin registration only. New recurring audit behavior lives in `lib/recurring-deep-audit.js` and `scripts/process-recurring-deep-audit-check.mjs`, outside the monoliths.

All proof scripts are read-only by default and have no `--apply` path. No-flag writes are blocked by design. Verifier/check behavior stays read-only, performs zero repairs, and fails closed instead of repairing live state.

## Risks

- Risk: this becomes autonomous dev or auto-backlog mutation.
  - Repair path: job remains manual/report-only, and proposed cards route to review only.
- Risk: deterministic scanner is confused with deep audit.
  - Repair path: docs and proof explicitly separate nightly scanner from 4-6 sprint senior-engineer deep audit.
- Risk: the cadence is too frequent and noisy.
  - Repair path: manual approval per run, and cadence trigger only recommends review.

## Tests

```bash
npm run process:recurring-deep-audit-check -- --json
npm run process:foundation-verification-cleanup-check -- --json --no-api
npm run process:code-quality-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=RECURRING-DEEP-AUDIT-001 --planApprovalRef=docs/process/approvals/RECURRING-DEEP-AUDIT-001.json --closeoutKey=foundation-verification-cleanup-v1 --commitRef=HEAD
```

Dogfood proof recreates the misunderstanding Steve flagged: a deterministic nightly scanner is not the same as a deep code audit. The proof must fail if the recurring deep audit is scheduled/autonomous, write-capable, or allowed to mutate backlog/code.

## Not Next

- Do not run a live full LLM audit in this card.
- Do not auto-create backlog cards.
- Do not auto-fix code.
- Do not build hub features or Build Intel extraction.
- Do not touch MEETING-VAULT-ACL-001 Phase B or Drive permissions.
