# Hub Work Protocol

Hubs are product/workflow layers. Foundation is the substrate and control plane.

## Core Rule

Hub chats may build inside their declared hub ownership lane. They may read Foundation context, source contracts, APIs, and backlog truth, but they do not own Foundation/process files.

If a hub needs to touch a shared or Foundation-owned file, it stops and coordinates with the main session before coding further.

## Required Hub Plan

Before building, a hub chat must name:

- hub: `sales`, `ops`, `strategy`, `marketing`, or another approved hub key
- backlog card ID
- target files
- files it will not touch
- proof command
- expected handoff file or handoff text
- whether it needs shared files

## Allowed Pattern

1. Steve starts the hub chat with the prompt template.
2. Hub chat reads the relevant hub code and writes a short plan.
3. Main session reviews the plan if the change is durable, risky, or touches shared files.
4. Hub chat edits only declared files.
5. Hub chat runs focused proof.
6. Hub chat returns a handoff.
7. Main session reviews, runs `process:hub-work-check`, commits, ships, and pushes.

For a completed hub slice, the hub handoff should include a JSON manifest that can be saved and checked with:

```bash
npm run process:hub-work-check -- --manifest=<manifest.json> --json
```

## Stop-And-Coordinate Files

These files are not owned by any hub chat:

- `server.js`
- `package.json`
- `lib/foundation-*.js`
- `lib/process-*.js`
- `scripts/foundation-verify.mjs`
- `scripts/process-*.mjs`
- `docs/process/*`
- `docs/handoffs/*`
- `public/foundation*`
- `public/ops*` when the active hub is not Ops
- `public/sales*` when the active hub is not Sales

Touching one of these may still be legitimate, but it needs main-session coordination.

## What A Hub Can Do Freely

Within its owned files, a hub chat can:

- inspect code
- write a plan
- make scoped UI changes
- add hub-owned helper modules
- run hub proof commands
- produce a handoff

It should not commit or push unless the main session explicitly approves.

## Minimum Handoff

Every hub build handoff must include:

- card ID
- hub key
- changed files
- summary
- proof commands and output summary
- known limits
- whether any shared/Foundation files were touched
- whether the work is ready to commit or needs main-session review
