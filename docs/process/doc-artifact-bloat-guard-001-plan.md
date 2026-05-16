# DOC-ARTIFACT-BLOAT-GUARD-001 / NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001 Plan

Cards:

- `DOC-ARTIFACT-BLOAT-GUARD-001`
- `NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001`

Sprint: `doc-artifact-bloat-guard-2026-05-16`
Closeout key: `doc-artifact-bloat-guard-v1`

## What

Build a bounded, report-only doc/report bloat guard so Foundation handoffs, process plans, approval files, and nightly audit outputs cannot become the next monolith problem.

This is a narrow V1 guard. It scans existing doc artifact classes, applies explicit budgets, reports red/yellow findings into the nightly deep audit and system-health rollup, and provides one focused proof command. It does not archive, delete, summarize, or rewrite any artifacts automatically.

## Why

Steve called out the same pattern that created the code monoliths: if handoffs, reports, and approval JSONs grow without a boundary, the docs layer becomes another giant pile that future agents stop reading. The useful operator value is simple: Steve should see doc/report bloat as a system-health finding before it becomes another hidden debt pile.

The nightly auditor also needs a budget for its own output. A report that finds problems but creates a massive unreadable artifact every night is not a mature review loop. The report must stay diff-oriented and visible without mutating backlog or docs.

This unlocks a real workflow for Steve and the team: morning health can show whether the review loop is staying readable, which protects speed and quality without making Steve manually inspect artifact sizes.

## Acceptance Criteria

- `lib/doc-artifact-bloat-guard.js` defines explicit budgets for handoff markdown, process markdown, approval JSON, nightly audit markdown/JSON, system-health JSON, and `docs/handoffs/` directory growth.
- `scripts/process-doc-artifact-bloat-guard-check.mjs` is read-only by default and validates both cards through one focused proof path.
- Dogfood proof recreates the exact failure mode: oversized nightly markdown, oversized nightly JSON, and oversized process docs fail red, while diff-sized reports stay green.
- Nightly deep audit output includes a doc/report bloat section with red/yellow counts and top findings.
- System health includes the same doc/report bloat rollup so it is visible without Steve asking for a separate report.
- Current live docs can be watch/risk if they exceed budgets; the guard must report honestly and must not auto-fix, auto-archive, auto-create backlog, or delete files.
- Both cards have v2 approval files, durable Plan Critic pass rows, current sprint stage progression, focused proof, and full ship gate.

## Definition Of Done

- Plan Critic score is at least 9.8 for both cards before build proceeds.
- Current Sprint moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps.
- The focused proof calls actual function paths: `buildDocArtifactBloatGuardDogfoodProof()`, `buildDocArtifactBloatSnapshot()`, approval integrity, and the package script.
- The proof rejects substring-only verification. Source text checks are limited to the check script write-boundary guard and are not accepted as the behavior proof.
- Full Foundation ship gate passes before push.
- Closeout records that both cards closed under `doc-artifact-bloat-guard-v1`.

## Details

Implementation surfaces:

- Reuse existing code, existing docs, existing scripts, live backlog truth, Current Sprint, approval integrity, nightly deep audit, and system-health surfaces.
- Add `lib/doc-artifact-bloat-guard.js` as the single scanner/evaluator module.
- Add `scripts/process-doc-artifact-bloat-guard-check.mjs` as the focused proof script and `process:doc-artifact-bloat-guard-check` in `package.json`.
- Wire the scanner into `lib/nightly-deep-audit-upgrade.js` so each nightly report audits its own artifact size.
- Wire the scanner into `lib/foundation-system-health.js` and `lib/hub-read-routes.js` so system health and the Foundation Hub show doc/report bloat posture.

Behavior proof:

- The dogfood proof feeds synthetic records into the actual evaluator. The old failure shape is a nightly audit markdown report over 1,800 lines, a nightly JSON report over 250 KB, and a process plan over 1,300 lines. Those must become red findings.
- The healthy fixture uses diff-sized reports and must remain green.
- The live scan is allowed to report yellow/red if current artifacts are over budget; the card is done when that risk is visible and non-mutating, not when the report is cosmetically green.
- Gate decision tree: static checks for syntax, focused process proof for the bloat invariant, and full ship gate because this touches system health, nightly audit, package scripts, server route dependencies, and closeout truth.

## Risks

- Risk: the bloat guard becomes another noisy report nobody reads.
  - Guard: surface only summary counts and top findings in system health; keep detailed records in JSON.
- Risk: the guard auto-deletes or rewrites useful context.
  - Guard: V1 is report-only. No archive, delete, summary, backlog mutation, or source-system writes.
- Risk: budgets are too strict for first-run historical artifacts.
  - Guard: honest watch/red is acceptable; repair path is a later archive/summary sprint, not weakening the detector.
- Risk: adding health logic slows `/api/foundation-hub`.
  - Guard: focused proof stays fast and full ship gate catches endpoint budget drift.

## Tests

```bash
node --check lib/doc-artifact-bloat-guard.js
node --check scripts/process-doc-artifact-bloat-guard-check.mjs
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:nightly-deep-audit-upgrade-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DOC-ARTIFACT-BLOAT-GUARD-001 --planApprovalRef=docs/process/approvals/DOC-ARTIFACT-BLOAT-GUARD-001.json --closeoutKey=doc-artifact-bloat-guard-v1 --commitRef=HEAD
```

## Not Next

- No automatic archive, deletion, compaction, or rewrite of existing handoffs.
- No auto backlog card creation from bloat findings.
- No marketing, hub feature work, Canva, Fal, Harlan voice/runtime work, or Build Intel extraction.
- No broad docs migration or history rewrite.
- No external provider calls.

## Repair Path

If the guard flags current historical reports as too large, leave the red/yellow findings visible and scope a separate archive/summary sprint. If the guard slows the Foundation Hub, remove the hub integration temporarily and keep the nightly/system-health report path while profiling the scanner. If budgets prove too low, adjust them only with a dogfood fixture that still catches the oversized nightly report failure.
