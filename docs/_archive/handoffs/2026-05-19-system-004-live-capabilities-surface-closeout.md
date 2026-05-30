# SYSTEM-004 Closeout

Closeout key: `system-004-live-capabilities-surface-v1`

## What Shipped

- Added `lib/system-004-capabilities-surface.js` as the compact live capability-surface owner.
- Added `capabilitySurface` to `/api/system-inventory`.
- Updated `public/foundation-system-inventory-renderers.js` so Skills, Plugins/MCPs, and Agents pages render generated Pillar 4/5 truth.
- Added `scripts/process-system-004-capabilities-surface-check.mjs` as the focused proof and closeout gate.
- Wired plan, approval, package script, closeout registry, and Current Sprint advancement to `LEGACY-SYSTEM-AUDIT-001`.

## What It Does

`/api/system-inventory` now includes a compact `capabilitySurface` derived from:

- `docs/system-capabilities.generated.json`
- `docs/agents/agent-inventory.generated.json`
- current runtime skill/plugin inventory already returned by `/api/system-inventory`

The existing System Inventory capability pages use that payload to show generated capability rows, current guarded agents, old-system agent evidence, governed jobs, and blocked provider/tool capability boundaries.

## Boundaries

- Provider/tool runtime use remains blocked.
- Agent runtime use remains blocked.
- Old-system agents remain evidence only.
- No old-system code or prompts are imported.
- No workers, scouts, model calls, extraction, external writes, source-system mutation, credential mutation, or Drive permission mutation are approved.
- Value Builder split remains blocked.

## Proof

- `node --check lib/system-004-capabilities-surface.js scripts/process-system-004-capabilities-surface-check.mjs public/foundation-system-inventory-renderers.js server.js`
- `npm run process:system-004-capabilities-surface-check -- --close-card --json`
- `curl -fsS http://localhost:3000/api/system-inventory`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SYSTEM-004 --planApprovalRef=docs/process/approvals/SYSTEM-004.json --closeoutKey=system-004-live-capabilities-surface-v1 --commitRef=HEAD`

## Next

Continue `LEGACY-SYSTEM-AUDIT-001`.

Do not use this card to approve provider/tool runtime, start agents, import old code, run extraction, or split Value Builder.
