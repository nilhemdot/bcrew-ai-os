# Source Browser Fallback Batch Planner

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-fallback-batch-planner-v1`

## What Changed

- Added a `retryBatch` readback under browser-challenge fallback review.
- Added `source:browser-fallback-batch`.
- Fallback batches now select bounded clean-isolated retry rows from the full challenge queue.
- Batch selection spreads across hosts first so one host does not consume the whole retry batch.
- Dev page now shows clean retry readiness, selected rows, and source-session blockers in the fallback section.

## Boundary

This is a batch planner and dry-run-first runner for the existing fallback executor.

It does not auto-run hosted browsers, solve CAPTCHA, bypass challenges, use normal Chrome, log in, sign up, buy, download, post, comment, message, mutate credentials, send Telegram, or promote Scoper work.

## Proof

- `node --check lib/source-god-mode-youtube-handoff.js public/dev.js scripts/run-source-browser-fallback-batch.mjs scripts/process-source-browser-fallback-executor-check.mjs scripts/process-source-god-mode-youtube-handoff-check.mjs`
- `npm run process:source-browser-fallback-executor-check -- --json`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run source:browser-fallback-batch -- --json --max-runs=5`

## Live Readback

Dry run found 78 fallback rows, 71 clean retry-ready rows, 7 source-session-required rows, and selected a bounded first batch of 5 rows.

## Next

Run a tiny approved clean retry batch, inspect whether real source content is recovered, then decide whether hosted/browser fallback is actually needed. Source-session rows still wait on Skool/newsletter/MyICOR credential/session proof.
