# DEV-HUB-PROPOSED-CARD-APPROVAL-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub approval preflight over Morning Proposed Cards.

This turns each draft proposed card into an exact approval row with the approval phrase, source Portfolio group, source-lineage proof, required fields, and mutation boundary. It does not create the backlog card or authorize implementation.

## Why

Morning Proposed Cards made the system's build recommendations visible. The next operator need is the handoff between "draft exists" and "Steve approves a card": the Dev Hub should show the exact card creation choices without silently creating backlog work, opening Current Sprint, or starting a build.

## Acceptance Criteria

- Reads `morningProposedCardsReadback` only; does not create a second proposed-card truth layer.
- Produces one approval preflight row per draft proposed card.
- Each approval row includes:
  - stable approval item ID
  - draft proposed card ID
  - Portfolio group ID
  - title, owner, lane, priority, rank, and score
  - source-lineage count and preview
  - exact approval phrase
  - required approval fields
  - proof, acceptance, and not-next excerpts
  - proposed mutation after approval
- Every approval row stays `approval_required` and `awaiting_steve_exact_approval`.
- Focused proof fails if any row or summary claims card creation, backlog writes, sprint opening, build authorization, route mutation, Harlan send, extraction, model calls, browser sessions, connector probes, or external writes.
- Dev Hub renders the packet from snapshot events through standalone JS/CSS.

## Not Next

- Do not create backlog cards.
- Do not write approval records.
- Do not mutate Scoper, Portfolio, routes, destinations, Current Sprint, decisions, or open questions.
- Do not send Harlan or external notifications.
- Do not run extraction, connector probes, browser sessions, model calls, or external writes.
- Do not authorize implementation or auto-build from the preflight packet.

## Proof

- `node --check lib/dev-hub-proposed-card-approval-preflight.js scripts/process-dev-hub-proposed-card-approval-preflight-check.mjs public/dev-proposed-card-approval-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-hub-proposed-card-approval-preflight-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:process-check-readonly-mode-check -- --json`
- `npm run foundation:verify -- --json-summary`
