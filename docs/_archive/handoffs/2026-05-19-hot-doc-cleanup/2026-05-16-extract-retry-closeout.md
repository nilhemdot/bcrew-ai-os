# EXTRACT-RETRY-001 Closeout

Date: 2026-05-16
Sprint: `extract-retry-2026-05-16`
Closeout key: `extract-retry-v1`
Status: Verified

## Summary

`EXTRACT-RETRY-001` makes failed-item retry support honest.

Before this card, `buildExtractionNextSafeCommand()` advertised `--retryFailed=true` retry commands for Drive, video, and email attachment targets even though those target runners do not have target-specific failed-item retry implementations. V1 now advertises a retry command only for `meetings-current-day`, the one target with a proven failed-item retry path. Unsupported Drive/video/email corpus targets return a blocked message instead of a fake command.

Meeting retry mode also now loads rows through `getRetryableSourceCrawlItems()` so blocked, waiting, and exhausted failed rows are excluded before retry.

## What Changed

- Added shared retry target truth in `lib/extraction-run-hardening.js`.
- Changed `buildExtractionNextSafeCommand()` to return `npm run extraction:retry-failed -- --target=meetings-current-day --dryRun=true` only for supported retry targets.
- Removed fake Drive/video/email attachment next-safe retry commands.
- Made `lib/extraction-run-hardening-execution.js` import/re-export the shared supported-target list.
- Changed `scripts/sync-meeting-notes-archive.mjs` retry mode to call `getRetryableSourceCrawlItems()`.
- Added `lib/extract-retry.js` with constants, source evaluation, support matrix, and dogfood proof.
- Added `scripts/process-extract-retry-check.mjs` as the read-only focused proof.
- Added thin `EXTRACT-RETRY-001` coverage to `lib/foundation-extraction-runtime-verifier.js`.
- Wired `scripts/process-verifier-extraction-runtime-split-module-check.mjs` and `scripts/foundation-verify.mjs` to pass the new retry sources into the verifier module.
- Added `process:extract-retry-check`.
- Updated rebuild plan/state and Recent Builds closeout registry.

## Dogfood Proof

The focused dogfood recreates the original failure mode:

- `meetings-current-day` gets a reviewed no-write retry dry-run command.
- `drive-content-extract-backfill` blocks because no target-specific retry runner exists.
- `video-content-extract-backfill` blocks because no target-specific retry runner exists.
- `email-attachments-backfill` blocks because no target-specific retry runner exists.
- The executor support list and next-safe command support list agree.
- Live no-write dry-run reports healthy and `executed=false`.
- `foundation:verify` passed 404/404 after dashboard restart loaded the new closeout registry.

## Proof Commands

```sh
node --check lib/extract-retry.js lib/extraction-run-hardening.js lib/extraction-run-hardening-execution.js scripts/sync-meeting-notes-archive.mjs scripts/process-extract-retry-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:extract-retry-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=EXTRACT-RETRY-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETRY-001.json --closeoutKey=extract-retry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=EXTRACT-RETRY-001 --closeoutKey=extract-retry-v1
npm run process:foundation-ship -- --card=EXTRACT-RETRY-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETRY-001.json --closeoutKey=extract-retry-v1 --commitRef=HEAD
```

## Boundaries

Not included:

- No live extraction.
- No new target-specific retry implementation for Drive/video/email.
- No scheduled retry job.
- No connector auth or paid-source auth.
- No Skool, myICOR, YouTube, Loom, or Build Intel extraction.
- No hub feature work.
- No Marketing Video Lab route wiring.
- No Canva asset mutation.
- No Drive permission mutation, request-access emails, or `MEETING-VAULT-ACL-001 Phase B`.

## Next

Continue the no-auth Foundation cleanup queue. If staying in source automation, the next cards should be target-specific retry runners only when Runtime Health shows enough real failed rows to justify them. Otherwise continue verifier/store cleanup before resuming Build Intel extraction.
