# FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001 Closeout

Card: `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`
Closeout key: `foundation-handoff-hot-doc-cleanup-v1`

## What Changed

- Archived 226 cold handoff artifacts dated through 2026-05-17 from `docs/handoffs` into `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/`.
- Preserved history with `git mv`; no closeout history was deleted.
- Updated exact moved-path references across repo truth.
- Added `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/MANIFEST.md` with old path, archived path, line count, and byte count.
- Kept May 18-19 working handoffs and the active May 19 sprint handoff hot.

## Proof

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

## Result

- `docArtifactRiskCount=0`
- `docArtifactReviewCount=0`
- `handoffFileCount=101`
- `recentHandoffFileCount=100`
- `handoffLineTotal=6620`

## Maintenance

- 2026-05-26: archived 39 additional cold handoff/report files under `docs/_archive/handoffs/2026-05-26-hot-doc-refresh/`.
- 2026-05-29: archived 12 cold May 18 source-maturity routing closeouts under `docs/_archive/handoffs/2026-05-29-hot-doc-refresh/` after the monthly hot-file count returned to the warning line.

## Not Done Here

- File-size watch rows remain for `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`.
- Final green semantics remain for `FOUNDATION-HEALTH-GREEN-LOCK-001`.
- No Value Builder, source, connector, extractor, or agent feature work was started.

## Next

Continue Foundation-only cleanup with `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`.
