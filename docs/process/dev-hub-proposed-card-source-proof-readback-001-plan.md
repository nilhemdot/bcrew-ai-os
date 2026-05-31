# DEV-HUB-PROPOSED-CARD-SOURCE-PROOF-READBACK-001 Plan

## What

Expose a read-only Dev Hub source-proof readback for proposed-card approval rows.

This links each approval row back to its Build Portfolio group and Scoper candidate proof so Steve can see the raw atom/hit trail and source lineage before approving a card.

## Why

The approval preflight gives Steve exact draft IDs to approve, but approval rows should not be trusted just because they are tidy. Each proposed card needs source proof visible in the same Dev Hub flow: Portfolio group, candidate rows, raw atom IDs, raw hit IDs, source trace status, and lineage count.

## Acceptance Criteria

- Reads only existing Dev Hub readbacks:
  - `buildPortfolioReadback`
  - `morningProposedCardsReadback`
  - `proposedCardApprovalPreflight`
- Produces one source-proof row per proposed-card approval row.
- Each proof row includes:
  - proposed card ID
  - approval item ID
  - Portfolio group ID
  - Portfolio rank, score, decision, and lane
  - candidate proof rows
  - raw atom IDs and raw hit IDs
  - source trace and Scoper status
  - source-lineage count and preview
  - approval phrase and approval gate state
- Focused proof fails if raw atom/hit trace is missing, if source lineage disappears, or if any row claims card creation/build authorization.
- Dev Hub renders the packet from snapshot events through standalone JS/CSS.

## Not Next

- Do not create backlog cards.
- Do not write approval records.
- Do not mutate Scoper, Portfolio, routes, destinations, Current Sprint, decisions, or open questions.
- Do not send Harlan or external notifications.
- Do not run extraction, connector probes, browser sessions, model calls, or external writes.
- Do not authorize implementation or auto-build from source-proof rows.

## Proof

- `node --check lib/dev-hub-proposed-card-source-proof-readback.js scripts/process-dev-hub-proposed-card-source-proof-readback-check.mjs public/dev-proposed-card-source-proof-readback.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-hub-proposed-card-source-proof-readback-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:process-check-readonly-mode-check -- --json`
- `npm run foundation:verify -- --json-summary`
