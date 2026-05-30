# System Health Red Row Repair Closeout

Date: 2026-05-16
Card: `SYSTEM-HEALTH-RED-ROW-REPAIR-001`
Closeout key: `system-health-red-row-repair-v1`

## What Changed

- Opened `SYSTEM-HEALTH-RED-ROW-REPAIR-001` as the immediate follow-up to the first system-health visibility report.
- Made Foundation job stale-run cleanup budget-aware: active runs are reaped from each job's `maxRuntimeSeconds` plus grace instead of one flat multi-hour timeout.
- Changed video content extraction crawl item keys to compact hash-backed keys so long Skool redirect URLs with identical prefixes cannot collide.
- Changed connector/runtime health classification so old manual job failures stay visible but do not poison current connector health or runtime failure counts.
- Re-ran the real failed jobs that were red in the system-health report:
  - `foundation-verify` succeeded.
  - `video-content-extract-bite` succeeded with 5 inspected, 5 skipped, 0 failures.
  - `meeting-notes-sync-current` succeeded with 7 inspected, 5 net-new archived artifacts, 0 crawl failures.
  - `slack-extract-latest` succeeded with 1 candidate upserted.
- Regenerated `docs/_archive/handoffs/2026-05-30-doc-archive-move/system-health-2026-05-16.md` and `.json`.

## Result

System-health risk is no longer hidden or stale:

- `riskCount`: 0
- `scheduledJobRiskCount`: 0
- `connectorDownCount`: 0
- `connectorDegradedCount`: 0
- Remaining watch item: `verification-runs`, intentionally blocked because it is a mutating process check and must stay blocked until split into read-only proof plus explicit apply posture.

## Proof

- `npm run process:system-health-red-row-repair-check -- --json`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=video-content-extract-bite --actor=codex-system-health-red-row-repair --force`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=foundation-verify --actor=codex-system-health-red-row-repair --force`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=meeting-notes-sync-current --actor=codex-system-health-red-row-repair --force`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=slack-extract-latest --actor=codex-system-health-red-row-repair --force`
- `npm run process:system-health-nightly-audit-check -- --json --write-report`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SYSTEM-HEALTH-RED-ROW-REPAIR-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-RED-ROW-REPAIR-001.json --closeoutKey=system-health-red-row-repair-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SYSTEM-HEALTH-RED-ROW-REPAIR-001 --closeoutKey=system-health-red-row-repair-v1`
- `npm run process:foundation-ship -- --card=SYSTEM-HEALTH-RED-ROW-REPAIR-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-RED-ROW-REPAIR-001.json --closeoutKey=system-health-red-row-repair-v1 --commitRef=HEAD`

## Known Limits

- `verification-runs` remains a deliberate watch item, not a repaired job. It needs a separate card to split the mutating verification-run process into read-only proof plus explicit apply lane.
- This did not build new extraction capability, hub features, Canva, OpenClaw voice, or paid-source auth.
- This did not remove old failed manual job records. It changed health classification so they remain visible without falsely degrading current connector/runtime health.

## Review Next

Next Foundation card should be `VERIFICATION-RUNS-READONLY-SPLIT-001`: split the blocked `verification-runs` process into a scheduled read-only proof and a separate explicit apply lane, then the system-health report can move from watch to healthy without weakening write boundaries.
