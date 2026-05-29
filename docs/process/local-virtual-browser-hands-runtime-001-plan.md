# LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001 Plan

Card: `LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001`

## Intent

Build the local browser/desktop Hands lane for God Mode source extraction without stealing Steve's Mac mini remote desktop and without making Browserbase the default architecture.

Plain English: AIOS needs a worker that can open a source in an isolated browser, see what is on the page, click/type/scroll only when the source policy allows it, stop when auth/MFA/paywall blocks it, and resume through the Source Session Broker/Harlan loop. Steve should still be able to use the Mac mini while that worker runs.

## Locked Truth From The May 28 Browserbase Argument

- Browserbase is paid for one month only and is a measured fallback/bakeoff, not the default path.
- The preferred path is local first:
  - deterministic/headless workers for normal public extraction
  - local virtual browser/desktop workers for interactive source Hands
  - Browserbase only after local proof shows a real gap
- The Mac mini remote desktop problem is real: a source worker must not pop up over Steve's working screen or depend on Steve manually driving the browser.
- The system must not use Steve's normal Chrome profile as the worker.
- Browser/model/token cost must be explicit before any API/hosted-browser run.

## Scope

1. Provide a local isolated browser Hands adapter.
2. Keep one isolated profile per source/account where sessions are needed.
3. Observe page state before action:
   - DOM text
   - links
   - buttons
   - forms
   - screenshots
   - page health
   - browser/restore/account chooser/auth/paywall state
4. Classify the next action before acting:
   - allowed safe navigation
   - needs source session
   - needs human auth/MFA
   - blocked by paid/private/member gate
   - blocked by unsafe form/download/action
   - fail closed
5. Click, type, or scroll only inside the exact source packet and SOP policy.
6. Stop before login, join, signup, submit, download, purchase, post, comment, message, account/profile mutation, credential mutation, payment, CAPTCHA, or private content unless a later exact packet explicitly permits that action.
7. Route auth/MFA/human verification through `SOURCE-SESSION-BROKER-001` and `HARLAN-AUTH-LIVE-DELIVERY-002`.
8. Record evidence and stop reasons in the source-browser evidence spine.
9. Run independently from Steve's visible working desktop where possible.
10. Decide, with proof, whether a true virtual-display/noVNC/remote worker layer is still needed after the isolated local browser slice.

## Current Built Slice

The first proof slice exists:

- `npm run source:local-browser-hands -- --url=<exact-source-url> --json`
- isolated Playwright source profiles
- no Browserbase
- no model calls
- no normal Chrome profile
- DOM/text/screenshot/page-health evidence
- one bounded safe anchor navigation when explicitly requested
- blocked risky actions before click
- fail-closed restore/blank/browser-control proof

Focused proof:

```bash
npm run process:local-virtual-browser-hands-runtime-check -- --json
```

This is useful, but it is not the full local virtual desktop/closed-loop God Mode browser worker.

## Remaining Work

- Prove one real free/community or auth-needed source through Source Session Broker using this local Hands adapter.
- Prove MyICOR Google SSO/account chooser detection without going down Start Free/signup.
- Prove the browser can recover from bad session state by using a clean isolated source profile, not Steve's normal Chrome.
- Prove Harlan Telegram live auth delivery and resume before claiming closed-loop MFA.
- Decide whether isolated Playwright is enough or whether the system needs a true virtual-display/noVNC worker so interactive browser windows never interrupt Steve.
- Add run-state readback in the Dev/source UI: running, idle, blocked, auth-needed, failed-closed, last run, next action.
- Keep Browserbase parked until local proof hits a concrete failure that a hosted browser can solve better.

## Dogfood Targets

- MyICOR Google SSO/account chooser.
- Free Skool/community page.
- Newsletter page.
- Browser restore/session prompt failure.
- Blank/control/browser-challenge page.

## Not Done Until

- The source browser can run ordinary public/free source work without Steve or Codex babysitting.
- Logged-in/session-needed sources use isolated source profiles and Source Session Broker.
- MFA/human verification sends a Harlan auth-needed message, waits for DONE, reverifies, and resumes or fails closed.
- The worker does not interrupt Steve's remote desktop.
- Browserbase is still a fallback choice with measured proof, not the core architecture.

## Not Allowed

- No broad Browserbase extraction.
- No uncapped API/model/browser loops.
- No normal Chrome profile.
- No raw secrets in chat, git, Postgres, logs, UI, or reports.
- No purchases, downloads, posting, commenting, messaging, profile/account changes, credential mutation, trading, banking, or external sends.
- No claim that Skool/MyICOR/paid/private extraction is done from the local proof slice alone.

