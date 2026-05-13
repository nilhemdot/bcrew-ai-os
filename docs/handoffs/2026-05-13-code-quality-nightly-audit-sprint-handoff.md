# Code Quality + Nightly Audit Sprint Handoff - 2026-05-13

## Decision

Code tightness, frontend speed, hardcoded live truth removal, and recurring quality audits are Foundation work. Do not treat them as optional polish or defer them behind hub/product work.

Steve's concern is valid: a Foundation that hardcodes live truth or ships a slow control panel recreates the old drift problem. The correct next move is not a full rebuild and not 100 autonomous agents. The correct next move is a code-first audit/quality sprint that makes these risks visible, repeatable, and eventually nightly.

## Current Evidence

- `SRC-GITHUB-BUILD-INTEL-001` exposed stale hardcoded source-count assumptions after the GStack sprint. The repair was made, but the pattern needs a broader scan.
- `lib/foundation-db.js` is about 19k lines, `public/foundation.js` about 16k lines, `scripts/foundation-verify.mjs` about 13k lines, and `server.js` about 7.6k lines. These are monolith risk surfaces.
- The existing recurring-audit idea exists but is not operating:
  - `CLEANUP-004` is `research`: recurring read-only code-review and drift-audit pass.
  - `SYSTEM-HEALTH-AUDITOR-001` is `scoped` P2 but wrongly deferred behind later agent gates.
  - `CLEANUP-003` is `parked`: Foundation code review and hardening pass.
  - `BACKLOG-HYGIENE-001` is done but audits backlog/process health, not code quality or frontend performance.
  - `BROWSER-QA-PROOF-001` is done but defines QA expectations, not a nightly frontend audit.

## Sprint Name

Foundation Code Quality + Nightly Audit Sprint

## Sprint Goal

Create a deterministic, read-only codebase and frontend audit lane that finds hardcoded live truth, slow Foundation surfaces, monolith risk, verifier brittleness, and process mutation risk, then produces a morning review report with proposed backlog cards. No auto-fixes, no autonomous mutation, no feature work.

## Pull Or Promote These Cards

Use existing cards where possible before creating new IDs:

1. `CLEANUP-004` - promote from research to scoped/executing as the parent recurring audit card.
2. `SYSTEM-HEALTH-AUDITOR-001` - reframe as code-first read-only nightly auditor, not agent-first and not blocked by future Scoper/agent work.
3. `CLEANUP-003` - pull as the code-hardening review parent if needed, but do not start broad refactors inside the first audit sprint.
4. `BROWSER-QA-PROOF-001` - already done; use its expectations as doctrine for frontend audit checks.

Create child cards only if missing:

1. `CODEBASE-HARDCODE-AUDIT-001` - deterministic scan for hardcoded live truth: source counts, card counts, sprint IDs, closeout assumptions, dates, active blockers, and stale exact-match baselines.
2. `FOUNDATION-API-PERF-AUDIT-001` - endpoint timing and payload-size audit for Foundation APIs, especially `/api/foundation-hub`.
3. `FOUNDATION-FRONTEND-PERF-AUDIT-001` - frontend load/render audit for Foundation pages, including bundle size, route render time, nonblank checks, and heavy DOM/render paths.
4. `FOUNDATION-MONOLITH-RISK-AUDIT-001` - file/module size and ownership report for `foundation-db.js`, `foundation.js`, `foundation-verify.mjs`, `server.js`, and other large files.
5. `VERIFIER-ASSUMPTION-REGISTRY-001` - classify verifier assumptions as live-derived, minimum threshold, fixed historical baseline, or closeout invariant; fail hidden magic numbers.
6. `SPRINT-STATE-MUTATION-AUDIT-001` - find scripts/jobs that can reopen old sprints or mutate Current Sprint/backlog unexpectedly.
7. `NIGHTLY-AUDIT-REPORT-001` - produce one morning report from all audit checks: top bugs, performance issues, hardcoded truth, proposed backlog cards, and false-positive notes.

## Specific Endpoint Coverage

The API performance audit should measure at least:

- `/api/foundation-hub`
- `/api/source-of-truth`
- `/api/foundation/source-lifecycle`
- `/api/foundation/build-log`
- `/api/foundation/gstack-build-intel`

For each endpoint, record status, latency, payload size, timeout behavior, and likely hotspot category: snapshot load, repeated DB query, payload bloat, slow serialization, frontend overfetch, or unknown.

## Definition Of Done

- A single command runs the audit locally and writes a report under `docs/handoffs/` or a DB-backed report table.
- Audit checks are deterministic code first. An LLM may summarize/rank findings later, but detection must not depend on an LLM.
- The report includes file references, severity, why it matters, suggested owner/card, and whether the finding is a bug, performance risk, drift risk, or refactor candidate.
- The audit is read-only and proposal-only. It does not edit files, move backlog cards, open sprints, or mutate production/source systems.
- Foundation job registry has a manual or scheduled lane for the audit, with schedule disabled until Steve approves the first report quality.
- Verifier/process proof ensures the audit catches at least one synthetic hardcoded-live-truth case and one synthetic slow-endpoint/performance-risk case.
- The monolith report ranks extraction/refactor boundaries but does not perform a large refactor.
- The sprint closeout names the next sprint explicitly: targeted hardening if severe issues are found, otherwise Build Intel Extraction Implementation.

## Process Rules

- Open the sprint visibly in DB with all cards in Scoping.
- Write doctrine for each card before build.
- Plan Critic must pass at `>= 9.8` before any card moves to Sprint Ready.
- Move cards through real stage progression with timestamps.
- Build one card at a time.
- Run focused proof plus the full protected ship gate before push.

## Not Next

- Do not rebuild the whole system.
- Do not run 100 subagents.
- Do not auto-fix or auto-commit audit findings.
- Do not open hub/product/agent work from this sprint.
- Do not build Base44-style Superagent UI yet.
- Do not broaden Skool/myICOR/YouTube/auth work inside this sprint.
- Do not split monolith files blindly before the audit names exact seams and tests.

## Fresh Chat Recommendation

Use a fresh chat if this is going to be a multi-hour code audit sprint. The current chat has enough context to plan it, but a fresh chat is better for a long read-only audit with several focused explorers.

If using subagents, use 6-8 read-only explorers max. More than that creates noise and duplicate findings.

Suggested read-only explorer lanes:

- API performance
- Frontend performance
- Hardcoded live truth
- Verifier/process-check assumptions
- DB/query/snapshot loading
- Sprint-state mutation
- Monolith/refactor boundaries
- Security/privacy drift

Explorers report findings only. The main session owns doctrine, process state, implementation, proof, and final closeout.
