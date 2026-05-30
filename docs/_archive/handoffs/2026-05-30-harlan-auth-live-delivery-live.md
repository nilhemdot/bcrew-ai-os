# Harlan Auth Live Delivery Live

Status: live notification slice accepted for `HARLAN-AUTH-LIVE-DELIVERY-002`.

Steve approved the exact boundary:

- Bot: `@harlan_bcrew_bot`
- Recipient: Steve-only chat `8758547582`
- Scope: notifications only
- Token source: `HARLAN_TELEGRAM_BOT_TOKEN_REF=openclaw://channels.telegram.botToken`
- Chat ref: `HARLAN_TELEGRAM_STEVE_CHAT_ID_REF=8758547582`

What changed:

- `lib/harlan-auth-live-delivery.js` now owns the live-approved contract, OpenClaw token resolver, centralized Telegram sender, dedupe ledger, and builder-event notification function.
- `scripts/harlan-builder-event.mjs` provides the reusable npm runner for dry-run or live builder notifications.
- `scripts/process-foundation-ship.mjs` calls the Harlan notifier on ship success and ship failure.
- Proof paths still keep packet previews no-send; injected sender dogfood proves the live path without calling Telegram from the focused proof.

Boundaries:

- notifications only
- no non-Steve recipients
- no raw bot token in repo truth or proof output
- fail closed on missing config, wrong boundary, dedupe, or Telegram send error
- no reply parsing, source-session resume, login, signup, extraction, posting, downloads, credential mutation, or broader Harlan runtime authority

Acceptance:

- `npm run process:harlan-auth-live-delivery-check -- --json`
- `npm run harlan:builder-event -- --dry-run --eventType=foundation_ship_passed --card=HARLAN-AUTH-LIVE-DELIVERY-002 --status=proof`
- one real builder event sent through the npm runner, not manual curl
