# PILLAR-4-SYSTEM-CAPABILITIES-001 Closeout

Closeout key: `pillar-4-system-capabilities-v1`

## What Shipped

- Added `lib/pillar-4-system-capabilities.js` as the generated System Capabilities owner.
- Added `scripts/process-pillar-4-system-capabilities-check.mjs` as the focused proof and closeout gate.
- Generated `docs/system-capabilities.generated.json` and `docs/system-capabilities.generated.md`.
- Wired plan, approval, package script, closeout registry, and Current Sprint advancement to `PILLAR-5-AGENT-INVENTORY-001`.

## What It Does

The generator builds capability truth from existing live Foundation sources:

- source contracts
- source connectors
- grouped source systems
- Foundation surface/API map
- governed job definitions
- `/api/system-inventory` runtime skills/plugins/identity
- Foundation-up provider/tool capability registry
- agent capability registry

Every capability row needs source refs, proof refs, owner, status, and approval boundary.

## Boundaries

- Provider/tool runtime use remains blocked.
- Agent runtime use remains blocked.
- External mutation remains blocked.
- Runtime plugins are capabilities, not source-truth signoff.
- Private local memory stays metadata-only.
- No secret values are copied into generated artifacts.

## Proof

- `node --check lib/pillar-4-system-capabilities.js scripts/process-pillar-4-system-capabilities-check.mjs`
- `npm run process:pillar-4-system-capabilities-check -- --write-report --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=PILLAR-4-SYSTEM-CAPABILITIES-001 --planApprovalRef=docs/process/approvals/PILLAR-4-SYSTEM-CAPABILITIES-001.json --closeoutKey=pillar-4-system-capabilities-v1 --commitRef=HEAD`

## Next

Continue `PILLAR-5-AGENT-INVENTORY-001`.

Do not use this card to start agents, approve providers, launch workers, run extraction, or split Value Builder.
