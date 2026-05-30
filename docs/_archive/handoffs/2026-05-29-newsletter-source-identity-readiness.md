# Newsletter Source Identity Readiness Checkpoint

Date: 2026-05-29
Card: `SOURCE-SESSION-BROKER-001`
Closeout key: `newsletter-source-identity-readiness-v1`

## What Changed

Creator newsletter readiness no longer asks for a fake `creator-newsletters / ai@bensoncrew.ca` password. The source identity is the delegated `ai@bensoncrew.ca` Google mailbox under `SRC-GMAIL-001`, and the readiness surface now shows that mailbox as available metadata.

## Why

Newsletter signup and monitoring should use the AIOS source mailbox, not a separate stored password unless a specific source later requires one. The previous readback made the system look blocked on a credential Steve should not need to provide.

## Current Truth

- Newsletter dry-run intake remains available.
- Newsletter source identity is now `delegated_mailbox_ready`.
- Live newsletter form submission is still not automatic from this slice.
- The only missing required credential in source-session readiness is now the myICOR MCP OAuth token.

## Proof

- `node --check lib/source-session-readiness-readback.js scripts/process-source-session-readiness-check.mjs`
- `npm run process:source-session-readiness-check -- --json`
- `npm run process:dev-team-hub-v0-check -- --json`

## Next

Build the live newsletter signup/inbox lane separately: external submit under the standing newsletter policy, confirmation email readback, issue extraction, source-stack scoring, and unsubscribe/park for low-value newsletters.
