# Source Browser Fallback Retry Resume Readback

Date: 2026-05-29
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-fallback-retry-resume-readback-v1`

## What Changed

The source-browser handoff queue now reads both ledgers that matter:

- `source-god-mode-youtube-handoff-runs`
- `source-browser-agent-runs`

That matters because fallback clean retries are persisted in `source-browser-agent-runs`, not the original YouTube handoff ledger.

Before this repair, a clean retry could fail closed on a browser challenge, get persisted correctly, and still be selected again by the fallback batch planner because the planner only remembered the older handoff challenge row.

Now the queue aliases source-browser-agent retry rows back to the original YouTube handoff row ID and URL. If the clean retry already failed closed on a browser challenge with no unsafe side effects, the row is parked as:

`previous_clean_retry_hosted_fallback_required`

Plain English: do not run the same clean local retry again. Route it to approved hosted/browser fallback or operator escalation.

## Why It Matters

The extractor has to keep moving without getting stuck in loops. Browser-challenge rows are not extraction success, but they also should not be retried forever through the same failed path.

This repair gives the system memory for that state:

- old challenge row found
- clean isolated retry attempted
- retry still saw challenge/interstitial
- unsafe side effects are false
- row stays parked for next-level fallback

## Where It Lives

- `lib/source-god-mode-youtube-handoff.js`
  - reads newer run items first
  - aliases source-browser-agent retry row IDs to original handoff row IDs
  - detects browser challenge blockers from `blockers`, `fallbackPlan`, and `sourceBrowserAgentPlan`
  - marks clean-retry failures as hosted/browser fallback required
- `scripts/run-source-god-mode-youtube-handoff.mjs`
  - includes `source-browser-agent-runs` in queue readback
- `scripts/run-source-browser-fallback-batch.mjs`
  - includes `source-browser-agent-runs` before selecting retry rows
- `lib/foundation-build-intel-routes.js`
  - Dev Hub API includes both ledgers in YouTube source-browser readback
- `scripts/process-dev-team-hub-v0-check.mjs`
  - live Dev Hub proof includes both ledgers
- `scripts/process-source-god-mode-youtube-handoff-check.mjs`
  - dogfood fixture recreates the retry-loop bug and proves it stays parked

## Proof

Commands run:

- `node --check lib/source-god-mode-youtube-handoff.js scripts/run-source-god-mode-youtube-handoff.mjs scripts/run-source-browser-fallback-batch.mjs lib/foundation-build-intel-routes.js scripts/process-dev-team-hub-v0-check.mjs scripts/process-source-god-mode-youtube-handoff-check.mjs`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:source-browser-fallback-executor-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run source:browser-fallback-batch -- --json --max-runs=5`
- `npm run source:youtube-handoff -- --json --max-runs=10`
- `git diff --check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

Live readback after repair:

- handoff evidence rows: 1,265
- queued rows: 1,186
- already-run rows: 644
- parked rows: 542
- browser-challenge fallback rows: 70
- normal handoff runnable rows: 0
- fallback clean-retry-ready rows: 63
- source-session-required fallback rows: 7

The fallback dry run selected the next five rows instead of repeating the five rows already safely parked by the earlier clean retry.

## Not Done

This does not build hosted/browser fallback, solve CAPTCHA, bypass challenges, use normal Chrome, log in, sign up, buy, download, post, comment, message, mutate credentials, send Telegram, or promote Scoper cards.

Next real unlocks remain:

- hosted/browser fallback bakeoff or local equivalent for rows that fail clean retry
- Source Session Broker readiness for Skool/newsletter/MyICOR/session-bound rows
- Harlan live Telegram delivery only after approval
