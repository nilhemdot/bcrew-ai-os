# DEV-HUB-NEXT-REPAIR-QUEUE-001 Plan

## What

Expose a read-only Dev Hub Next Repair Queue that turns the live pipeline readbacks into ranked, proposal-only repair cards: business source flow, action-route review, Scoper runtime, synthesis scope, auditor flow, and hygiene pressure.

## Why

Steve wants the Dev Hub to recommend the next builds from real intelligence without recreating the unsafe auto-build system. The existing panels now show the pipe; this card makes the next move explicit while keeping every mutation parked behind a separate approved card.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `nextRepairQueue`.
- `/dev` renders a Next Repairs panel with proposed repair rows, source proof, operator boundary, and no created-card claim.
- The readback reuses existing Dev Hub truth: Foundation Done, Business Sources, Route Review, Scoper Runtime, Synthesis Scope, Auditor Flow, and Intelligence Hygiene.
- The queue creates zero backlog cards, Scoper records, Portfolio records, route mutations, atom/fact/synthesis rows, Harlan sends, model calls, extraction runs, connector probes, or external writes.
- The proof fails if any proposed repair is marked auto-created, applied, promoted, or no longer proposal-only.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-next-repair-queue.js` as a compact projection over existing Dev Hub readbacks.
- Wire `buildDevTeamHubV0Snapshot` to build `nextRepairQueue` after the contributing readbacks are available.
- Add `public/dev-next-repair-queue.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-next-repair-queue-check.mjs` and `process:dev-hub-next-repair-queue-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Auto-build regression risk: proposed repairs could be mistaken for approved backlog cards. Every row must stay proposal-only with `autoCreated=false`.
- Mutation risk: this queue must never write atoms, facts, routes, backlog cards, Scoper cards, Portfolio records, Current Sprint overlays, Harlan messages, or external systems.
- Duplication risk: this should rank the next repair moves, not restate every existing panel. Keep rows bounded and use source proof from existing readbacks.
- Approval-bound work risk: Scoper scheduling, route apply, model-backed synthesis, extraction, connector sync, and source writes remain separate approved cards.

## Tests

```bash
node --check lib/dev-hub-next-repair-queue.js scripts/process-dev-hub-next-repair-queue-check.mjs public/dev-next-repair-queue.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-next-repair-queue-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-NEXT-REPAIR-QUEUE-001 --planApprovalRef=docs/process/approvals/DEV-HUB-NEXT-REPAIR-QUEUE-001.json --closeoutKey=dev-hub-next-repair-queue-v1 --commitRef=HEAD
```
