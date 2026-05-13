# CODEBASE-HARDCODE-AUDIT-001 Plan

## What
Build the hardcoded live-truth lane inside the Foundation Code Quality + Nightly Audit Sprint. V1 detects source counts, card counts, dated sprint IDs, active blocker strings, current-state summaries, hardcoded years, and stale exact baselines in code and process files.

## Why
Steve needs Foundation code to stop recreating old-system drift. The useful operator value is a morning report that shows where code may be competing with live Postgres, APIs, source contracts, or sprint records before those strings become trusted control-plane truth.

## Acceptance Criteria
- `CODEBASE-HARDCODE-AUDIT-001` returns a pass/fail proof status from the focused command.
- The audit calls a deterministic scanner over real repo files and returns file/line references.
- The scanner rejects substring-only marker proof by also running a synthetic hardcoded-live-truth case through the same detector path.
- Findings are classified as bug, drift risk, performance risk, or refactor candidate with severity and proposed owner/card.
- Findings are report-only and do not edit code, move cards, create backlog rows, or mutate sprint state.
- Proof command is `npm run process:code-quality-nightly-audit-check -- --json`.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, and Plan Critic truth are reused.
- `lib/code-quality-nightly-audit.js` contains the hardcoded-truth detector.
- The generated report includes `CODEBASE-HARDCODE-AUDIT-001` findings and false-positive notes.
- The proof checks actual function behavior and report output, not just source markers.

## Details
Reuse existing Foundation process patterns: `plan_critic_runs`, `foundation_sprints`, `foundation_sprint_items`, build-log closeouts, and the ship gate. The root invariant is that live operational truth must be derived from live-backed records or clearly labeled historical baselines. Behavior proof calls the actual function path `buildCodeQualityNightlyAudit`, the detector function path for hardcoded truth, a report write/read round-trip, and a synthetic weak plan with hardcoded live truth. Gate decision tree: static repo scan plus focused proof command first, then full `process:foundation-ship` because the blast radius touches package scripts, verifier coverage, docs, job registry, and build-log closeout. The focused command stays fast, targeting under 2 minutes, so Steve and the operator team can use it by default.

## Risks
Risk is false-positive noise. Repair path is to mark a finding as historical/fixture in the report, tune the detector, or open a targeted follow-up card after Steve review. Risk is also accidental mutation; repair path is fail closed if the audit command changes DB lane counts or writes anywhere except the approved report path.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not fix detected hardcoded strings in this sprint. Do not split UI or verifier files here. Do not auto-create backlog cards from findings. Do not open product or hub work.
