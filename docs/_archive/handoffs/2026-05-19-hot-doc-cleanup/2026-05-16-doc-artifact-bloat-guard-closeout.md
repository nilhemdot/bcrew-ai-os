# Doc Artifact Bloat Guard Closeout

Closeout key: `doc-artifact-bloat-guard-v1`
Cards: `DOC-ARTIFACT-BLOAT-GUARD-001`, `NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001`
Sprint: `doc-artifact-bloat-guard-2026-05-16`

## What Shipped

- Added `lib/doc-artifact-bloat-guard.js` with explicit budgets for handoffs, process docs, approval JSON, nightly audit reports, system-health JSON, and hot `docs/handoffs/` directory growth.
- Added `scripts/process-doc-artifact-bloat-guard-check.mjs` plus `process:doc-artifact-bloat-guard-check`.
- Wired doc/report bloat into nightly deep audit output.
- Wired the same rollup into Foundation system health and the full Foundation Hub path.
- Preserved report-only posture: no archive, delete, rewrite, backlog mutation, source-system mutation, or provider spend.

## Proof

- `npm run process:doc-artifact-bloat-guard-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:nightly-deep-audit-upgrade-check -- --json`
- `npm run process:ship-check -- --card=DOC-ARTIFACT-BLOAT-GUARD-001 --planApprovalRef=docs/process/approvals/DOC-ARTIFACT-BLOAT-GUARD-001.json --closeoutKey=doc-artifact-bloat-guard-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DOC-ARTIFACT-BLOAT-GUARD-001 --closeoutKey=doc-artifact-bloat-guard-v1`

Dogfood result: synthetic oversized nightly markdown, oversized nightly JSON, and oversized process docs go red; diff-sized reports stay green.

Live scan result: current artifacts are visible and report-only. `docs/handoffs/` is yellow because hot-doc total lines are above the watch budget, which is the intended signal Steve asked for.

## Not Next

- No automatic doc archive or rewrite.
- No auto backlog creation from bloat findings.
- No hub feature work, Canva/Fal/Harlan work, Build Intel extraction, or provider spend.

## Next

If the yellow `docs/handoffs/` budget grows into red, scope a dedicated doc archive/monthly-summary sprint. Otherwise continue the Foundation no-auth queue.
