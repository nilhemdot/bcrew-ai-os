# FOUNDATION-MONOLITH-RISK-AUDIT-001 Plan

## What
Build the monolith and ownership-risk lane for the read-only nightly audit. V1 ranks the largest files, largest functions/routes, and safest future extraction boundaries without performing a refactor.

## Why
The Foundation codebase is becoming the trust layer. Large files like `foundation-db.js`, `foundation.js`, `foundation-verify.mjs`, `server.js`, and `foundation-build-log.js` slow audits and make future changes harder to reason about.

## Acceptance Criteria
- `FOUNDATION-MONOLITH-RISK-AUDIT-001` returns a pass/fail proof status from the focused command.
- The audit reports top files by LOC and bytes.
- The audit reports known largest functions/routes with line references and responsibility notes.
- Each monolith finding names why it matters, likely future seam, and proposed card.
- The audit is report-only and does not split files, move functions, or change imports.
- The proof validates monolith metrics through actual file reads.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- `lib/code-quality-nightly-audit.js` contains file-size and monolith-risk metrics.
- The morning report ranks extraction candidates without broad rewrite recommendations.
- The proof calls real metric functions and rejects synthetic small-file false positives.

## Details
V1 prioritizes report-first boundaries: verifier registry split, DB schema/seed split, current-state frontend extraction, hub payload extraction, process-check read-only mode, build-closeout registry extraction, Owners/FUB queue library extraction, and CSS surface split. Behavior proof calls the actual function path for file metrics, largest-surface ranking, API route summary payload construction, a report write/read round-trip, and a synthetic weak monolith fixture that stays below threshold. Gate decision tree: static LOC scan plus focused proof first, then full `process:foundation-ship` because the sprint touches process, verifier, job registry, package, and docs surfaces. The focused command stays fast, targeting under 2 minutes, so Steve and the operator team get useful seams without a broad rewrite.

## Risks
Risk is turning audit into a panic rewrite. Repair path is to keep all extraction work in proposed follow-up cards and return to sprint review. Risk is counting generated or archive files; repair path is to keep repo-code filters explicit and list false positives in the report.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not split `foundation-db.js`, `foundation.js`, `foundation-verify.mjs`, `server.js`, or CSS in this sprint. Do not build a new architecture.
