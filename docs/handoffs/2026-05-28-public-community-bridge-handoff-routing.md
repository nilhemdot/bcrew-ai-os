# Public Community Bridge Handoff Routing

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `youtube-public-community-bridge-handoff-v1`

## What Changed

YouTube-discovered free-community links now split into the correct next step:

- normal non-Skool public bridge pages run through bounded `source:god-mode` as `public_community_bridge`
- signup/login/join/action surfaces park before any form/auth work
- direct invite links such as Discord invites park until a source-specific community runner exists
- Skool about/community rows still wait for Source Session Broker readiness before the 20-day community SOP can run

## Why

The previous queue treated too many free-community-adjacent pages as if they all needed a Skool/session runner. That hid safe public bridge reads and made the system look more blocked than it really was.

This keeps Steve's principle intact: free public pages should move, but private/session/action surfaces should stop.

## Proof

- `node --check lib/source-god-mode-youtube-handoff.js scripts/process-source-god-mode-youtube-handoff-check.mjs scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`

Focused proof verifies:

- `community.youreverydayai.com/sign_up` parks as a form/auth/action surface
- `jonocatliff.com/skool` runs as a bounded public community bridge read
- `discord.gg/...` parks as a direct non-Skool community invite
- `skool.com/chase-ai-community/about` still waits on Source Session Broker

Live Dev Hub readback after the patch and governed bridge run:

- 0 public/free source rows ready
- 461 parked rows
- 698 already persisted rows
- 2 free-community bridge rows read
- 274 source-session prep rows
- 0 raw-secret rows

## Boundary

This does not join communities, create accounts, log in, submit forms, post/comment/message, download files, purchase, mutate credentials, or claim 20-day community extraction.

The next real unlock is still Source Session Broker plus the free-community runner against an approved/session-ready source.
