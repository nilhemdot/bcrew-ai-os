# YouTube Creator Catch-Up Readback Limit Closeout

Card: `YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001`
Parent card: `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001`
Closeout: `youtube-creator-catchup-readback-limit-v1`

## What Changed

- Raised the source-crawl item readback cap used by YouTube creator catch-up planning from 200 to 1000.
- Added a focused dogfood check that counts the live `youtube-creator-daily-watch` target rows and fails if tracked metadata stays capped at 200 when the target has more rows.
- Exposed the target row count in the catch-up proof output so future builders can distinguish missing metadata from a readback cap.

## Live State

The governed public metadata job has saved more than 200 public YouTube rows. The catch-up readback now sees the full live set instead of the first 200 rows.

This does not complete creator catch-up. Remaining gaps are real video/audio/visual watch gaps or source lookup gaps, not the old readback ceiling.

## Proof

```bash
node --check lib/foundation-source-crawl-store.js scripts/process-youtube-creator-god-mode-catchup-check.mjs scripts/process-dev-team-hub-v0-check.mjs
npm run process:youtube-creator-god-mode-catchup-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run backlog:seed-drift -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001 --planApprovalRef=docs/process/approvals/YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001.json --closeoutKey=youtube-creator-catchup-readback-limit-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001 --closeoutKey=youtube-creator-catchup-readback-limit-v1
npm run process:foundation-ship -- --card=YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001 --planApprovalRef=docs/process/approvals/YOUTUBE-CREATOR-CATCHUP-READBACK-LIMIT-001.json --closeoutKey=youtube-creator-catchup-readback-limit-v1 --commitRef=HEAD
```

## Guardrails

- No live Gemini/API extraction.
- No browser crawl, Skool/MyICOR/private/auth source, paid source, comment extraction, downloads, forms, purchases, source-system writes, backlog writes from the proof, or external writes.
- Parent catch-up remains open.

## Next

Continue `YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001` with scheduler dry-run review and a Steve-approved live-bounded budget when Steve is awake.
