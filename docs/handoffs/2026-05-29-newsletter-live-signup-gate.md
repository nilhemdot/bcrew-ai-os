# Newsletter Live Signup Gate Checkpoint

Date: 2026-05-29
Card: `SOURCE-SESSION-BROKER-001`
Closeout key: `creator-newsletter-live-signup-gate-v1`

## What Changed

The newsletter intake runner now has a real live-signup gate instead of stopping at "external signup requires a future lane." Dry-run is still the default. A live external submit requires all of these flags together:

- `--apply`
- `--allow-external-signup`
- `--standing-policy-approved`
- `--confirmation-readback-required`

It also requires an approved AIOS source account and a safe email-only newsletter form.

## Current Truth

- No real external newsletter signup was run from this checkpoint.
- The proof uses fake fetch fixtures for the live path.
- Successful live-path output is `pending_confirmation`, not subscribed.
- The packet now says Gmail `SRC-GMAIL-001` confirmation readback is required before subscribed status can be claimed.
- Issue extraction, creator scoring, recurring monitoring, and unsubscribe/park are still follow-on work.

## Proof

- `node --check lib/creator-newsletter-intake-runner.js scripts/run-creator-newsletter-intake.mjs scripts/process-creator-newsletter-intake-runner-check.mjs lib/foundation-build-closeout-source-records.js`
- `npm run process:creator-newsletter-intake-runner-check -- --json`

## Next

When Steve is awake, pick one low-risk creator newsletter URL, run the live flags on that exact source, then build confirmation email readback before recurring newsletter extraction or creator source-stack scoring claims the source is subscribed.
