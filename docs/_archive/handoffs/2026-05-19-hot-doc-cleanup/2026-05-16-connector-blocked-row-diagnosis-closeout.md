# Connector Blocked Row Diagnosis Closeout

Date: 2026-05-16
Card: `CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001`
Closeout key: `connector-blocked-row-diagnosis-v1`

## What Changed

- Diagnosed the remaining system-health connector blocked row as `google-workspace`.
- Traced the underlying row to `google-delegated-calendar`: readable credentials, but not scheduled as an atom-producing source yet.
- Reclassified that Calendar state as a non-blocking readiness note instead of a credential blocker.
- Kept the readiness note visible in the connector registry and connector uptime rollup.
- Updated system-health connector blocked findings so future true blockers name the connector and reason instead of surfacing as a hidden count.
- Updated operating reliability and system-health proofs for the current read-only `verification-runs` posture and shorter healthy reports.
- Regenerated `docs/_archive/handoffs/2026-05-30-doc-archive-move/system-health-2026-05-16.md` and `.json`.

## Result

System-health no longer hides a connector blocked count behind a vague status:

- `status`: healthy
- `riskCount`: 0
- `watchCount`: 0
- `connectorBlockedCount`: 0
- `scheduledJobWatchCount`: 0

Google Calendar's current state remains visible as readiness metadata: readable, not yet an atom-producing scheduled source. If a future credential/auth row is truly blocked, the health finding now names the connector group and plain-English reason.

## Proof

- `npm run process:connector-blocked-row-diagnosis-check -- --json`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=connector-uptime-monitor --actor=codex-connector-blocked-row-diagnosis --force`
- `npm run process:system-health-nightly-audit-check -- --json --write-report`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001 --planApprovalRef=docs/process/approvals/CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001.json --closeoutKey=connector-blocked-row-diagnosis-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001 --closeoutKey=connector-blocked-row-diagnosis-v1`
- `npm run process:foundation-ship -- --card=CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001 --planApprovalRef=docs/process/approvals/CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001.json --closeoutKey=connector-blocked-row-diagnosis-v1 --commitRef=HEAD`

## Known Limits

- This does not schedule Google Calendar as an atom-producing source.
- This does not change credentials, OAuth scopes, external provider data, hub features, Canva, OpenClaw voice, or paid-source auth.
- This does not auto-create backlog cards from connector health findings.

## Review Next

Pull the next no-auth Foundation source/connector card so health visibility turns into source readiness progress without waiting on paid-source auth.
