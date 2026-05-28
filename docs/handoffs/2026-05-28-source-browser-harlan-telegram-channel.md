# Source Browser Harlan Telegram Channel

Date: 2026-05-28
Closeout key: `source-browser-harlan-telegram-channel-v1`
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`

## Truth

Steve confirmed Harlan is on Telegram and agent communications should live there by default.

This slice locks the source-browser auth/operator escalation contract to Harlan on Telegram:

- `primaryChannel: telegram`
- `channels: [telegram]`
- source-browser human escalation lane: `harlan_telegram_operator_lane`
- Harlan auth escalation message label: `AUTH ESCALATION [TELEGRAM]`

## Boundary

This is channel routing and proof only.

It does not send Telegram messages, create a Telegram bot, send email, log in, solve 2FA, mutate credentials, run paid/private extraction, buy, download, post, comment, or message.

Live delivery remains a separate approval-bound build: `HARLAN-AUTH-LIVE-DELIVERY-002`.

## Files

- `lib/harlan-auth-escalation-loop.js`
- `lib/source-browser-agent-harness.js`
- `lib/source-god-mode-youtube-handoff.js`
- `lib/dev-source-run-readback.js`
- `scripts/process-harlan-auth-escalation-loop-check.mjs`
- `scripts/process-source-browser-agent-harness-check.mjs`
- `scripts/process-source-god-mode-youtube-handoff-check.mjs`
- `scripts/process-dev-team-hub-v0-check.mjs`
- `docs/agents/harlan-auth-escalation-loop.md`
- `docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-source-records.js`

## Next

Build the approved live-delivery slice only after Steve explicitly approves live Telegram send behavior and the exact Telegram bot/chat boundary.
