# NIGHTLY-AUDIT-REPORT-001 Plan

## What
Build the V1 code-quality morning report for `SYSTEM-HEALTH-AUDITOR-001`. The report combines hardcoded truth, API performance, frontend performance, monolith risk, verifier assumptions, and sprint-state mutation findings into proposed backlog fixes.

## Why
Steve wants the system tight without returning to a 100-agent mess. The operator value is one concise morning report that ranks deterministic findings and proposed cards so Steve plus Codex can decide the next hardening sprint.

## Acceptance Criteria
- `NIGHTLY-AUDIT-REPORT-001` returns a pass/fail proof status from the focused command.
- A single command runs the audit and writes `docs/handoffs/2026-05-13-code-quality-nightly-audit-report.md`.
- The command is deterministic code first. It may be summarized later by an LLM, but detection does not depend on an LLM.
- The command proves a synthetic hardcoded-live-truth case and a synthetic slow-endpoint/performance-risk case.
- The report includes severity, file references, why it matters, proposed owner/card, false-positive notes, and no-auto-mutation boundaries.
- Foundation job registry exposes a manual unscheduled audit lane. Schedule stays disabled until Steve approves report quality.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, Foundation jobs, build-log closeout, and verifier coverage are reused.
- `lib/code-quality-nightly-audit.js` and `scripts/process-code-quality-nightly-audit-check.mjs` exist.
- `package.json` exposes `process:code-quality-nightly-audit-check`.
- `foundation:verify` covers the audit loop, report, manual job lane, and read-only/proposal-only contract.
- Full `process:foundation-ship` passes before push.

## Details
The V1 report is code-first and proposal-only. It can write the report artifact, but it cannot edit source files, move backlog cards, open sprints, apply action routes, or schedule itself. Behavior proof calls the actual function path `buildCodeQualityNightlyAudit`, endpoint metric classification, hardcoded-truth detection, mutation scanning, report rendering, a write/read round-trip, and synthetic weak fixtures. Gate decision tree: static scan plus focused proof first, then full `process:foundation-ship` because the blast radius touches package scripts, job registry, verifier coverage, build-log closeout, rebuild docs, process docs, and handoff output. The focused proof stays fast, targeting under 2 minutes by limiting endpoint fetch timeouts and scan scope, so Steve and the operator team can use the morning report before choosing a hardening sprint.

## Risks
Risk is creating a noisy report that Steve will not use. Repair path is to keep only ranked high-signal findings in the morning report and list false-positive notes. Risk is accidentally turning report generation into an actor. Repair path is fail closed if DB lane counts change or any finding proposes direct mutation.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not auto-fix findings. Do not auto-create backlog cards. Do not schedule the job. Do not build a cleanup executor. Do not open the next sprint automatically.
