# SYSTEM-010 Closeout

Closeout key: `system-010-process-control-v1`

## Summary

`SYSTEM-010` closes the top-level process-control blocker by accepting and proving the runtime/process-control layer shipped under `SYSTEM-010-GHOST-CLOSEOUT-001`.

The important operating rule is now explicit: blockers block unsafe actions, not the whole sprint. Existing governed safe work can continue, while unsafe stop/decommission/run-control paths fail closed.

## What Changed

- Added `lib/system-010-process-control.js` as the top-level proof wrapper.
- Added `scripts/process-system-010-check.mjs`.
- Reused the shipped `SYSTEM-010-GHOST-CLOSEOUT-001` runtime-control implementation and proof.
- Repaired stale proof assumptions in the old ghost/P0 reality/recent-build/follow-up checks so they recognize split route/verifier files and legitimate progression past `SYSTEM-010`.
- Updated runtime source-contract wording so it no longer says kill/decommission controls still need `SYSTEM-010` closeout.
- Registered this closeout.
- Closed `SYSTEM-010` in live backlog and Current Sprint.
- Promoted `SOURCE-012` as the next active Foundation card before extraction work.

## Proof

- `node --check lib/system-010-process-control.js scripts/process-system-010-check.mjs`
- `npm run process:system-010-check -- --apply --close-card --json`
- `npm run process:system-010-ghost-closeout-check -- --json`
- `npm run process:foundation-backlog-p0-reality-cleanup-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SYSTEM-010 --planApprovalRef=docs/process/approvals/SYSTEM-010.json --closeoutKey=system-010-process-control-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SYSTEM-010 --closeoutKey=system-010-process-control-v1`
- `npm run process:foundation-ship -- --card=SYSTEM-010 --planApprovalRef=docs/process/approvals/SYSTEM-010.json --closeoutKey=system-010-process-control-v1 --commitRef=HEAD`

## Known Limits

- This does not create a new runtime supervisor.
- This does not start source/extract/value work.
- This does not mutate credentials, Drive permissions, public exposure, provider config, or external systems.
- This does not send email/messages.

## Next

Continue Foundation-only with `SOURCE-012`.
