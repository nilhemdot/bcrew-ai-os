# Hub Work Coordination Closeout - 2026-05-14

Card: `HUB-001`
Closeout key: `hub-work-coordination-v1`
Sprint: `hub-work-coordination-2026-05-14`

## What Changed

Added a lightweight coordination rail for Sales/Ops/Strategy hub chats:

- `docs/process/hub-work-protocol.md`
- `docs/process/hub-file-ownership-matrix.json`
- `docs/process/hub-chat-prompt-template.md`
- `docs/process/hub-handoff-template.md`
- `lib/hub-work-check.js`
- `scripts/process-hub-work-check.mjs`
- `package.json` script `process:hub-work-check`

## Why It Matters

Hubs are product/workflow layers that tap Foundation. They are not Foundation itself. Steve can now work with Sales/Ops/Strategy hub chats while Foundation work continues, as long as those chats stay inside hub-owned files or stop and coordinate before touching shared/Foundation/process files.

## Dogfood Proof

`process:hub-work-check` validates real structured manifests and dogfoods the failure modes from the Sales GLS overlap:

- Sales hub-owned files pass.
- Ops hub-owned files pass.
- Uncoordinated Foundation files fail.
- Shared/package changes pass only with main-session coordination.
- Missing backlog card fails.
- Missing proof command fails.
- Missing handoff fails.
- Hub pushed before main session fails.
- Unknown files fail.

## Not Shipped

- No Sales Hub feature work.
- No Ops Hub feature work.
- No Strategy Hub feature work.
- No separate Hub Sprint board UI.
- No autonomous dev.
- No broad Foundation monolith cleanup.

## How To Use

Start hub chats with `docs/process/hub-chat-prompt-template.md`.

When a hub chat finishes, have it return the handoff from `docs/process/hub-handoff-template.md`, including the JSON manifest. Save the manifest and check it with:

```bash
npm run process:hub-work-check -- --manifest=<manifest.json> --json
```

The main session owns commit/push for anything that touches shared or Foundation/process files.
