# VERIFIER-ASSUMPTION-REGISTRY-001 Plan

## What
Build the verifier-assumption lane for the read-only nightly audit. V1 classifies magic numbers and exact baselines as live-derived, minimum threshold, fixed historical baseline, closeout invariant, or suspect hidden assumption.

## Why
Verifier confidence depends on knowing what each assumption means. A raw `36`, `9.8`, dated sprint ID, expected commit, or KPI count can be valid doctrine, valid historical evidence, or stale live truth.

## Acceptance Criteria
- `VERIFIER-ASSUMPTION-REGISTRY-001` returns a pass/fail proof status from the focused command.
- The audit reports assumption findings with file/line references and classifications.
- Minimum thresholds such as Plan Critic 9.8 are separated from suspect live-count baselines.
- Synthetic hidden-assumption proof is detected through the same classifier path as real files.
- Findings propose follow-up cards instead of changing verifier logic.
- The report explains false-positive handling for historical closeouts and fixture baselines.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, and Plan Critic truth are reused.
- `lib/code-quality-nightly-audit.js` contains assumption classification output.
- The morning report includes `VERIFIER-ASSUMPTION-REGISTRY-001` findings.
- The proof calls actual classification functions and does not accept source markers alone.

## Details
The V1 registry names assumptions surfaced by explorers: process checks with side effects, dynamic sprint proof mutation, current sprint seed constants, historical sprint order checks, active-versus-historical verifier helpers, duplicated 9.8 literals, exact source counts, KPI UI copy counts, avatar baselines, and GStack inspected commit baselines. Behavior proof calls the actual function path for assumption classification, API route report payload construction, a report write/read round-trip, and a synthetic weak hidden-assumption fixture. Gate decision tree: static verifier scan plus focused proof first, then full `process:foundation-ship` because verifier coverage and process closeout are touched. The focused command stays fast, targeting under 2 minutes, so Steve and the operator team can review assumptions before trusting another sprint.

## Risks
Risk is flattening every literal into a bug. Repair path is to classify assumptions precisely and keep accepted historical baselines out of the top bug list. Risk is weakening verifier pressure; repair path is to keep every suspect assumption as a proposed follow-up, not a silent suppression.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not rewrite `foundation:verify` in this sprint. Do not change approval thresholds. Do not demote real verifier failures to warnings.
