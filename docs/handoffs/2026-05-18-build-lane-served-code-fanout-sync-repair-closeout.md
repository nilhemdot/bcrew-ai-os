# Build Lane Served-Code Fanout Sync Repair Closeout

Card: `BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001`

Closeout key: `build-lane-served-code-fanout-sync-repair-v1`

## What Changed

- Restarted the local supervised dashboard and Foundation worker with the existing worker scheduled-job pause marker so both runtime surfaces serve repo `HEAD`.
- Patched `scripts/process-fanout-check.mjs` so stale dashboard served code still fails, but dependent Recent Builds checks are reported as `SKIP` until served code matches `HEAD`.
- Added focused proof coverage for the fanout root-cause behavior and live served build-log visibility.

## Proof

- `node --check scripts/process-fanout-check.mjs scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs`
- `npm run process:build-lane-served-code-fanout-sync-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json --closeoutKey=build-lane-served-code-fanout-sync-repair-v1 --commitRef=HEAD`

## Dogfood

- Synthetic stale served-code fanout produces one telemetry event for `dashboard served commit matches repo HEAD`.
- Skipped Recent Builds checks do not create extra build-lane failure events.
- Representative historical fanout closeouts are visible through `/api/foundation/build-log` once served code is current.

## Boundaries

No hidden subagents, parallel builder launch, live extraction, auth-required or paid run, provider/model probe, external write, Drive permission mutation, Agent Feedback auto-send, Harlan/Fal/voice/Canva/OpenHuman feature work, or Foundation UI redesign ran in this card.

## Next

Continue `BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001` from repo truth unless a fresher Foundation blocker appears.
