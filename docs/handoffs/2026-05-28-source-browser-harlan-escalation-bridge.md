# Source Browser Harlan Escalation Bridge

Date: 2026-05-28
Card: `SOURCE-BROWSER-AGENTIC-RUNTIME-001`
Closeout key: `source-browser-harlan-escalation-bridge-v1`

## What Changed

Source Browser Agent fallback plans now prepare a Harlan auth-escalation draft when a source run gets stuck.

This applies to browser challenge, blank/control page, and auth-needed source-browser plans. The run still tries bounded self-recovery first. If it cannot safely continue, the plan now carries:

- Harlan auth escalation card ID
- auth-needed event context
- notification text/metadata
- final dry-run status
- `waitsForDoneToken: DONE`
- `sendsMessageNow: false`
- proof that no text, email, external message, credential mutation, purchase, download, post, or signup happens from the proof path

## Current Rule

The source-browser agent should not stall silently.

1. Try the approved self-recovery route first.
2. Stop before unsafe actions.
3. Prepare the Harlan/operator escalation packet when auth, 2FA, browser challenge, or unrecoverable source state blocks the run.
4. Wait for the future approved notification runner before sending anything.

## Boundaries

This slice does not send texts, emails, or messages. It does not solve CAPTCHA, bypass challenges, log in, sign up, buy, download, post, comment, message, mutate credentials, or use Steve's normal Chrome profile.

It is a bridge from stuck source-browser state to the existing Harlan dry-run contract so the next runner has the right packet instead of inventing a separate texting path.

## Proof

- `node --check lib/source-browser-agent-harness.js lib/source-god-mode-youtube-handoff.js lib/dev-source-run-readback.js scripts/process-source-browser-agent-harness-check.mjs scripts/process-source-god-mode-youtube-handoff-check.mjs scripts/process-dev-team-hub-v0-check.mjs public/dev.js`
- `npm run process:source-browser-agent-harness-check -- --json`
- `npm run process:source-god-mode-youtube-handoff-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`

## Next

Build the actual approved recovery executor: clean isolated retry, source-session resume, hosted/browser-agent fallback when local recovery fails, then Harlan/operator notification only after bounded recovery cannot continue safely.
