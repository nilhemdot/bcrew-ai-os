# Verification Runs Read-Only Split Closeout

Date: 2026-05-16
Card: `VERIFICATION-RUNS-READONLY-SPLIT-001`
Closeout key: `verification-runs-readonly-split-v1`

## What Changed

- Made `scripts/process-verification-runs-check.mjs` read-only by default.
- Kept the old historical closeout writeback path available only with explicit `--apply`.
- Changed the scheduled `verification-runs` Foundation job posture to `read_only`.
- Changed the scheduled job mutation allowlist so `verification-runs` is allowed only as `allowed_scheduled_read_only`.
- Updated process-hardening verifier expectations so synthetic mutating/unknown checks still fail closed while the real `verification-runs` job is no longer blocked.
- Added focused dogfood proof for the exact failure mode: running the default verification check does not change watched backlog/current-sprint fingerprints.
- Re-ran the real `verification-runs` Foundation job successfully.
- Regenerated system-health output; the old `verification-runs` scheduled-job red row is gone.

## Result

The system-health report no longer shows `verification-runs` as red or blocked. Current status is `watch` only because one connector group is blocked by manual/auth/source posture; that is now visible as a plain finding instead of a hidden count.

## Proof

- `npm run process:verification-runs-check -- --json=true`
- `npm run process:verification-runs-readonly-split-check -- --json`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=verification-runs --actor=codex-verification-runs-readonly-split --force`
- `npm run process:system-health-nightly-audit-check -- --json --write-report`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFICATION-RUNS-READONLY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFICATION-RUNS-READONLY-SPLIT-001.json --closeoutKey=verification-runs-readonly-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFICATION-RUNS-READONLY-SPLIT-001 --closeoutKey=verification-runs-readonly-split-v1`
- `npm run process:foundation-ship -- --card=VERIFICATION-RUNS-READONLY-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFICATION-RUNS-READONLY-SPLIT-001.json --closeoutKey=verification-runs-readonly-split-v1 --commitRef=HEAD`

## Known Limits

- This does not auto-expire research cards, synthesized findings, or action routes.
- This does not build Reply/Watching, hubs, Canva, OpenClaw voice, or paid-source extraction.
- System health is not fully green yet because one connector group remains blocked; this sprint made that visible and separate from `verification-runs`.

## Review Next

Pull the next no-auth Foundation reliability card. Good candidates are connector blocked-row diagnosis or connector completion prep, depending on what the next system-health report surfaces after this ship.
