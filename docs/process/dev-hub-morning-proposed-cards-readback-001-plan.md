# DEV-HUB-MORNING-PROPOSED-CARDS-READBACK-001 Plan

## What

Expose a read-only Dev Hub packet that turns Build Portfolio groups into draft morning proposed-card packets.

This does not create backlog cards. It gives Steve a clean review surface for "these are the exact build cards the system would suggest from last night's source-backed Portfolio groups" with source lineage, proposed priority, proof requirements, risks, not-next boundaries, and approval status.

## Why

The Dev Hub now shows that Scoper-ready source-traced candidates can merge into ranked portfolio groups. The next operator need is a morning review packet: Steve should wake up to a small set of card-shaped proposals that are ready to approve, edit, or reject, without the system silently promoting anything into backlog or sprint execution.

## Acceptance Criteria

- Reads `buildPortfolioReadback` from the Dev Hub payload; does not query a second Portfolio truth layer.
- Produces one proposed-card packet per proposal-only portfolio group.
- Each proposed card includes:
  - stable draft ID
  - portfolio group ID
  - portfolio rank and score
  - title
  - proposed lane and priority
  - summary
  - why it matters
  - acceptance criteria
  - definition of done
  - proof plan
  - risks
  - not-next boundaries
  - source-lineage preview
  - approval status
- Every proposed card remains `draft_requires_steve_approval`.
- Focused proof fails if any proposed card claims it was created, promoted, opened in Current Sprint, sent through Harlan, or authorized for build.
- Dev Hub renders the packet from snapshot events through standalone JS/CSS.

## Not Next

- Do not create backlog cards.
- Do not mutate Scoper or Portfolio records.
- Do not open Current Sprint work.
- Do not send Harlan or external notifications.
- Do not run extraction, connector probes, browser sessions, model calls, or external writes.
- Do not auto-build or authorize implementation from proposed-card packets.

## Proof

- `node --check lib/dev-hub-morning-proposed-cards-readback.js scripts/process-dev-hub-morning-proposed-cards-readback-check.mjs public/dev-morning-proposed-cards-readback.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-hub-morning-proposed-cards-readback-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:process-check-readonly-mode-check -- --json`
- `npm run foundation:verify -- --json-summary`

