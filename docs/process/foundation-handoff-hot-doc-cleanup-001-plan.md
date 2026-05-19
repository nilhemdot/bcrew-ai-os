# FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 Plan

## What

Remove the hot-doc bloat rows from Foundation System Health by moving cold handoff artifacts out of `docs/handoffs` and into the existing archive surface.

This card does not delete history. It keeps current working handoffs hot, preserves older closeouts in `docs/_archive/handoffs/`, and updates exact references where paths moved.

## Why

After endpoint metrics were repaired, System Health still carried two doc artifact findings:

- `doc_artifact_handoff_monthly_file_budget`
- `doc_artifact_handoff_directory_line_budget`

Those rows were real cleanup debt. `docs/handoffs` had hundreds of recent files and more than twenty thousand lines, so current builders had to scan through old closeouts and generated reports while trying to find today’s operating truth.

## Acceptance Criteria

- Cold handoffs through May 17, 2026 are archived outside the hot `docs/handoffs` scan path.
- May 18-19 working handoffs remain hot.
- No useful closeout history is deleted.
- Exact path references are updated when files move.
- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/MANIFEST.md` records the archive move.
- Direct doc artifact guard reports:
  - `handoffFileCount <= 220`
  - `recentHandoffFileCount <= 220`
  - `handoffLineTotal < 20000`
  - `riskCount = 0`
  - `reviewCount = 0`
- System Health reports:
  - `docArtifactRiskCount = 0`
  - `docArtifactReviewCount = 0`
- Current Sprint advances only to `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001` after focused proof passes.

## Definition Of Done

- The archive manifest exists and points to archived files that exist.
- Old hot paths from the manifest no longer exist under `docs/handoffs`.
- Current hot handoffs, including the May 19 sprint and closeout files, remain in `docs/handoffs`.
- `scripts/process-foundation-handoff-hot-doc-cleanup-check.mjs` proves approval, Plan Critic, live backlog/current sprint truth, archive manifest integrity, doc artifact row removal, package script, closeout registry, verifier coverage, and no external-write path.
- `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001` is closed in live backlog and Current Sprint after focused proof passes.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Root invariant: the hot handoff surface is healthy only when the actual `buildDocArtifactBloatSnapshot()` and System Health rollup no longer produce doc artifact risk/review rows.

The card uses `git mv` archival, not deletion. Older handoffs dated through 2026-05-17 move to `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/`, and the manifest records every old/new path pair. Current May 18-19 handoffs stay in `docs/handoffs`.

The behavioral proof path is an actual function path plus process/API route proof, not markers:

- `buildDocArtifactBloatSnapshot({ repoRoot })` checks the real file scan used by health.
- `process:system-health-nightly-audit-check -- --json` checks the same health rollup Steve sees.
- `validatePlanApprovalFile()` checks the approved plan hash and approval digest.
- `getActiveFoundationCurrentSprint()` and `getBacklogItemsByIds()` check live sprint/backlog truth.
- `getFoundationBuildCloseouts()` checks the closeout registry.
- The dogfood standard rejects weak substring-only proof; a string marker is not enough to close this P0 card.

## Reuse Existing Work

- Existing code reused: `lib/doc-artifact-bloat-guard.js`
- Existing scripts reused: `scripts/process-doc-artifact-bloat-guard-check.mjs` and `scripts/process-system-health-nightly-audit-check.mjs`
- Existing docs reused: `docs/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md`, current May 19 handoffs, and the existing archive surface under `docs/_archive/handoffs/`
- Live backlog truth reused: live Backlog row for `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`
- Current Sprint truth reused: active blocker and next-card progression in the live Current Sprint overlay

## Operator Value

Steve and builders should not have to sort through old generated reports to find current Foundation truth. The hot handoff surface should contain current working handoffs, while old closeout detail remains recoverable in the archive.

## Archive Strategy

V1 archive move:

- Move handoffs dated through `2026-05-17` from `docs/handoffs` into `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/`.
- Keep `README.md`, `INDEX.md`, May 18 closeouts, May 19 closeouts, the current sprint handoff, and the latest May 19 nightly audit artifacts hot.
- Update exact references from old hot paths to archived paths.
- Store a manifest with old path, archived path, line count, and byte count.

## Rollback Or Repair Path

If proof fails:

- If a moved file is still required hot, move it back with `git mv` and update references.
- If an old path reference remains in executable truth, update it to the archived path.
- If doc artifact rows remain, archive additional cold files or summarize oversized reports.
- If `foundation:verify` or ship fails, leave the card executing and repair the failing gate before push.

## Behavioral Proof

The proof must exercise the real health path, not only check for files:

- Build a direct doc artifact snapshot with `buildDocArtifactBloatSnapshot()`.
- Run `process:system-health-nightly-audit-check -- --json`.
- Assert doc artifact risk/review counts are zero.
- Parse the archive manifest and prove archived files exist while old hot paths do not.
- Prove current May 19 working handoffs remain hot.
- Reject classification-only closure. The rows must disappear from System Health.

## Tight Scope And Not Next

Tight V1 scope:

- archive cold handoffs
- update moved-path references
- close this one Current Sprint card

Not next:

- Do not delete closeout history.
- Do not archive current May 18-19 working handoffs.
- Do not classify doc artifact rows instead of removing them.
- Do not start file-size splitting inside this card.
- Do not start source/value/agent work.
- Do not mutate Drive permissions, send email, send Agent Feedback, or perform external writes.
- Do not launch parallel builders.

## Gate Decision Tree

Gate level: full.

Decision tree:

- Static checks are not enough because the card moves many repo artifacts and updates live sprint truth.
- Focused proof is required to exercise the doc artifact guard and System Health path.
- Full gate is required before ship because the blast radius includes closeout registry, verifier coverage, Current Sprint truth, and archived historical references.

## Risks

- Risk: useful closeout history is lost.
  - Response: archive with `git mv`, keep a manifest, and update exact references.
- Risk: the card becomes classification-around-it.
  - Response: close proof requires doc artifact risk/review counts to be zero.
- Risk: archived paths break closeout proof references.
  - Response: exact path references are updated and full `foundation:verify` must pass.
- Risk: this turns into file-size cleanup.
  - Response: file-size rows remain for `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`.

## Speed Bound

The focused proof should run under 2 minutes because it reads local files, parses the archive manifest, and runs the existing System Health process check. Full `foundation:verify` and `process:foundation-ship` remain ship gates only.

## Tests

```bash
node --check scripts/process-foundation-handoff-hot-doc-cleanup-check.mjs
npm run process:foundation-handoff-hot-doc-cleanup-check -- --apply --close-card --json
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.json --closeoutKey=foundation-handoff-hot-doc-cleanup-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 --closeoutKey=foundation-handoff-hot-doc-cleanup-v1
npm run process:foundation-ship -- --card=FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001.json --closeoutKey=foundation-handoff-hot-doc-cleanup-v1 --commitRef=HEAD
```

## Next

After this closes, continue Foundation-only cleanup with `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`.
