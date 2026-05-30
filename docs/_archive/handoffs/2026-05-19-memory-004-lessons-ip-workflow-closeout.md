# MEMORY-004 Lessons And IP Workflow Closeout

Card: `MEMORY-004`
Closeout key: `memory-004-lessons-ip-workflow-v1`

## What Changed

- Added a deterministic lessons/IP workflow on top of the `MEMORY-003` conversation archive.
- Generated `docs/conversation-archive/LESSONS-IP-MANIFEST.json`.
- Generated `docs/conversation-archive/LESSONS-IP-README.md`.
- Added focused proof for source-linked lesson, timeline, reusable asset, and quote/clip review lanes.
- Wired closeout, approval, package script, verifier coverage, and Current Sprint advancement.

## What It Does

The workflow converts archived conversation metadata into source-linked work queues:

- lesson candidate lanes
- implementation timeline milestones
- case study candidates
- training asset candidates
- sales or marketing proof candidates
- quote/clip review candidates

Every generated output carries archive source IDs and redaction posture. No raw private transcript text, quote text, local memory content, external model output, source-system write, or public send is produced by this card.

## Why It Matters

Steve wanted the gold from long chats and old-system research not to be lost. `MEMORY-003` preserved the archive. `MEMORY-004` makes it usable by routing that archive into reusable lessons and IP candidates without asking someone to reread every conversation manually.

## Proof

- `node --check lib/memory-004-lessons-ip.js scripts/process-memory-004-lessons-ip-check.mjs`
- `npm run process:memory-004-lessons-ip-check -- --write-report --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=MEMORY-004 --planApprovalRef=docs/process/approvals/MEMORY-004.json --closeoutKey=memory-004-lessons-ip-workflow-v1 --commitRef=HEAD`

## Known Limits

- This does not produce polished content.
- This does not store raw quotes or transcript excerpts.
- This does not upload private conversations to external providers.
- This does not read local-only `memory/`, `MEMORY.md`, `USER.md`, raw chat databases, tokens, or private runtime state.
- This does not mutate source systems, Drive permissions, credentials, provider config, external destinations, or public surfaces.

## Review Next

Continue `PILLAR-4-SYSTEM-CAPABILITIES-001`: generate live System Capabilities from actual route, job, connector, skill, and source truth.
