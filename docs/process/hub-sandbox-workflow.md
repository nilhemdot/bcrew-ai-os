# Hub Sandbox Workflow

This workflow lets Steve work with Sales, Ops, Marketing, or Strategy hub chats while a Foundation sprint is running.

## Rules

1. Hub chats start with a plan and a hub-owned file list.
2. Hub chats may edit hub-owned files and hub-owned fixtures only.
3. Hub chats may run their focused proof commands.
4. Hub chats do not commit or push.
5. If a hub needs a shared file, it writes a review request and stops.
6. The main Foundation session reviews shared-file requests and performs the integration if approved.

## Hub-Owned Examples

- Sales: `public/sales.js`, `lib/sales-*.js`, `fixtures/hubs/sales/*`
- Ops: `public/ops.js`, `lib/ops-*.js`, `fixtures/hubs/ops/*`
- Marketing: `public/marketing.js`, `lib/marketing-*.js`, `docs/marketing/*`, `fixtures/hubs/marketing/*`
- Strategy: `public/strategy*.js`, `lib/strategy-*.js`, `fixtures/hubs/strategy/*`

## Shared Stop Lines

These files require main-session review:

- `server.js`
- `package.json`
- `package-lock.json`
- `lib/foundation-db.js`
- `lib/security-access.js`
- `lib/app-auth.js`
- `scripts/process-*.mjs`
- `docs/process/*`
- `docs/handoffs/*`

## Handoff Shape

A hub handoff must include:

- hub key
- backlog card ID
- changed files
- proof commands run
- whether it committed or pushed
- requested shared files, if any
- human-readable review request

The hub-work gate rejects missing proof, unknown files, shared files without main-session coordination, committed work without approval, and any pushed hub work.
