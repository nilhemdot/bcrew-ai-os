# DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET-001 Plan

## What

Expose a read-only Dev Hub Route Review Operator Packet that turns the waiting action-route pile into exact route-ID review rows grouped by suggested operator decision.

## Why

The Dev Hub now shows that 100+ routes are waiting, but Steve still needs a clean packet that says which route IDs need owner assignment, sensitive review, duplicate/stale handling, or oldest-first review. This card prepares the packet without approving, applying, rejecting, snoozing, rerouting, sending Harlan, or mutating destination records.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `routeReviewOperatorPacket`.
- `/dev` renders a Route Review Operator Packet panel with exact route IDs, review categories, suggested operator decisions, and mutation boundary.
- The packet reuses existing Dev Hub truth: Route Review Triage and Action Route Readback.
- Every row stays review-only with `status=review_only`, `routeMutatedNow=false`, `destinationMutatedNow=false`, and `appliedNow=false`.
- The readback creates zero route approvals, applies, rejects, snoozes, reroutes, destination writes, backlog writes, Scoper/Portfolio records, Harlan sends, model calls, extraction runs, connector probes, or external writes.
- The proof fails if any route row is marked mutated/applied, any mutation counter is non-zero, or the packet loses exact route IDs.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded review rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-route-review-operator-packet.js` as a compact projection over Route Review Triage and Action Route Readback.
- Wire `buildDevTeamHubV0Snapshot` to build `routeReviewOperatorPacket` after both contributing readbacks are available.
- Add `public/dev-route-review-operator-packet.js` and a `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-route-review-operator-packet-check.mjs` and `process:dev-hub-route-review-operator-packet-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Mutation drift: route review packet code must not call approve/apply/reject/snooze/reroute or destination writers.
- False authority risk: suggested operator decisions are not approval. Copy and validation must keep rows review-only.
- Payload risk: exact routes can become large. Keep rows bounded and preserve counts separately.
- Approval-bound work risk: real route changes still require exact route IDs and Steve approval in a separate mutation card.

## Tests

```bash
node --check lib/dev-hub-route-review-operator-packet.js scripts/process-dev-hub-route-review-operator-packet-check.mjs public/dev-route-review-operator-packet.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-route-review-operator-packet-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET-001 --planApprovalRef=docs/process/approvals/DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET-001.json --closeoutKey=dev-hub-route-review-operator-packet-v1 --commitRef=HEAD
```
