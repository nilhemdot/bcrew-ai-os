# Source Browser Fallback Plan

Date: 2026-05-28

Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`

Closeout key: `source-browser-fallback-plan-v1`

## What Changed

- Source Browser Agent page-health failures now attach a structured `fallbackPlan`.
- Browser challenge/interstitial pages get a specific route: source-specific session first when needed, then hosted/browser-agent fallback if the challenge remains.
- Blank, browser-control, and empty states remain failed-closed with clean isolated relaunch instructions.
- The plan explicitly forbids normal Chrome profile use, form submits, unapproved login, purchases, downloads, posting/messaging, and credential mutation.

## Why It Matters

The prior harness stopped safely, but the next move was plain text. The agent now preserves the continuation as data that downstream queues and UI can use.

This moves the God Mode browser agent closer to closed-loop operation: when a page blocks the local browser, the system knows what kind of fallback is needed instead of losing that work in a generic failure.

## Proof

- `node --check lib/source-browser-agent-harness.js scripts/process-source-browser-agent-harness-check.mjs`
- `npm run process:source-browser-agent-harness-check -- --json`

## Boundaries

- No challenge solving, CAPTCHA bypass, login, signup, purchase, download, post, message, credential mutation, normal Chrome profile, or external write.
- This is the fallback decision layer, not the hosted/browser runtime itself.
- The next runtime build is to execute approved fallback plans through source-session broker and a read-only hosted/browser fallback when local clean sessions fail.
