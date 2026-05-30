# Source Browser Fallback Recovery Policy

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-fallback-recovery-policy-v1`

## What Changed

Browser fallback plans now include a bounded recovery policy.

When the Source Browser Agent hits a blank page, browser-control surface, Cloudflare-style challenge, or interstitial, it does not loop forever and does not claim extraction succeeded. It now records:

- the fallback route
- whether a source session is required
- the first recovery step
- max automatic attempts
- stop-before boundaries
- operator-assistant/texting escalation as the last resort
- `sendsMessageNow=false` until a separate notification runner is approved

## Current Rule

The extractor should try to unstick itself first:

1. Relaunch clean isolated browser state or retry the exact source URL.
2. Use a source-specific isolated session when the source family requires it.
3. Route to hosted/browser-agent fallback when local clean retry still cannot read real source content.
4. Escalate to the operator assistant/texting lane only after bounded retries fail, auth/2FA is required, or the run cannot prove real source content.

## Boundaries

This slice does not send texts, solve CAPTCHAs, bypass challenges, log in, sign up, buy, download, post, message, mutate credentials, use the normal Chrome profile, or claim hosted-browser fallback execution exists.

## Proof

- `node --check lib/source-browser-agent-harness.js lib/source-god-mode-youtube-handoff.js lib/dev-source-run-readback.js scripts/process-source-browser-agent-harness-check.mjs scripts/process-source-god-mode-youtube-handoff-check.mjs scripts/process-dev-team-hub-v0-check.mjs public/dev.js`
- `npm run process:source-browser-agent-harness-check -- --json`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`

## Next

The next real execution layer is the approved fallback executor: clean isolated retry, source-session resume, hosted/browser-agent fallback if needed, then operator-assistant notification only when the system cannot safely continue alone.
