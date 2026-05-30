# Public Community Bridge Handoff Routing

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `youtube-public-community-bridge-handoff-v1`

## What Changed

YouTube-discovered free-community links now split into the correct next step:

- normal non-Skool public bridge pages run through bounded `source:god-mode` as `public_community_bridge`
- signup/login/join/action surfaces park before any form/auth work unless a clean public community host can be resolved without submitting or joining
- clean public community starts resolved from action URLs run only as bounded public bridge reads
- direct invite links such as Discord invites park until a source-specific community runner exists
- Skool about/community rows still wait for Source Session Broker readiness before the 20-day community SOP can run
- browser challenges and interstitial wrapper pages fail closed instead of becoming empty successful source evidence, including saved runs that previously looked `succeeded`

## Why

The previous queue treated too many free-community-adjacent pages as if they all needed a Skool/session runner. That hid safe public bridge reads and made the system look more blocked than it really was.

This keeps Steve's principle intact: free public pages should move, but private/session/action surfaces should stop.

## Proof

- `node --check lib/source-god-mode-youtube-handoff.js scripts/process-source-god-mode-youtube-handoff-check.mjs scripts/process-dev-team-hub-v0-check.mjs public/dev.js`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:source-god-mode-extractor-runtime-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`

Focused proof verifies:

- `community.youreverydayai.com/sign_up` resolves to `https://community.youreverydayai.com/` for a safe public bridge read while preserving the original signup URL as evidence
- `jonocatliff.com/skool` runs as a bounded public community bridge read
- `discord.gg/...` parks as a direct non-Skool community invite
- `skool.com/chase-ai-community/about` still waits on Source Session Broker
- `Just a moment...` / browser challenge pages fail closed as `browser_challenge_not_source_content`
- saved browser-challenge runs are reclassified as `previous_source_run_browser_challenge_needs_fallback`, not counted as completed source evidence

Live Dev Hub readback after the patch and governed bridge runs:

- 0 public/free source rows ready
- 538 parked rows
- 621 already persisted rows
- 78 saved browser-challenge rows parked for fallback/repair
- 2 free-community bridge rows read; the challenged community bridge is parked for fallback instead of counted as read
- 273 source-session prep rows
- 0 raw-secret rows

## Boundary

This does not join communities, create accounts, log in, submit forms, post/comment/message, download files, purchase, mutate credentials, or claim 20-day community extraction.

The next real unlock is still Source Session Broker plus the free-community runner against an approved/session-ready source.
