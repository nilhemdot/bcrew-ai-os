# FOUNDATION-FRONTEND-PERF-AUDIT-001 Plan

## What
Build the frontend performance and browser-QA lane for the read-only nightly audit. V1 scans Foundation frontend assets, route render risks, DOM rebuild risks, route race risks, asset size, cache headers, and browser proof gaps.

## Why
Steve needs the Foundation UI to be fast enough to use as the command surface. A slow or stale frontend can make correct backend truth feel unreliable.

## Acceptance Criteria
- `FOUNDATION-FRONTEND-PERF-AUDIT-001` returns a pass/fail proof status from the focused command.
- The audit records raw and gzip asset sizes for `public/foundation.js`, `public/styles.css`, and core Foundation HTML.
- The audit detects uncached JS/CSS/HTML static serving, large render functions, heavy DOM creation, route race risk, overfetch, and current-state hardcoded truth.
- Browser-QA doctrine from `BROWSER-QA-PROOF-001` is reflected as proposed route checks, not executed as an auto-fix.
- Findings include route or panel, severity, file references, why it matters, and proposed owner/card.
- The audit does not change UI code or styles.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, and `BROWSER-QA-PROOF-001` doctrine are reused.
- `lib/code-quality-nightly-audit.js` contains frontend asset and route-risk detectors.
- The report includes a route matrix proposal for Foundation browser proof.
- The proof calls actual detector functions and synthetic route-risk behavior.

## Details
The V1 detector names the frontend choke points without repairing them: full `/api/foundation-hub` dependency, large no-store assets, async route overwrite risk, backlog/source filter DOM churn, Source Lifecycle synchronous render, hardcoded `renderCurrentState()` truth, Runtime Health payload bloat, and overflow proof gaps. Behavior proof calls the actual function path for asset metrics, frontend risk detection, browser-QA route matrix generation, a report write/read round-trip, and a synthetic weak frontend fixture. Gate decision tree: static frontend scan plus focused proof first, then full `process:foundation-ship` because verifier and process wiring are touched. The focused command stays fast, targeting under 2 minutes, so Steve and the operator team get a practical report instead of a slow UI test suite.

## Risks
Risk is confusing audit findings with permission to refactor the UI. Repair path is to leave all UI changes as proposed cards only. Risk is missing runtime browser-only issues; repair path is a follow-up browser proof sprint after Steve accepts this report quality.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not bundle, cache, redesign, split, or rewrite the frontend in this sprint. Do not run broad Playwright work unless a later frontend proof card is approved.
