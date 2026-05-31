# DEV-HUB-ROUTE-AUTOCLEAR-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub Route Auto-Clear Preflight that names exact duplicate/stale route IDs and the approval-bound disposition they could take later.

## Why

The route review pile is organized, but it still needs a safer cleanup lens before any route action is considered. Steve asked for the intelligence pipe to self-clean without repeating the old mistake of automatic building or unsafe promotion. This card prepares cleanup candidates and blockers without clearing anything.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `routeAutoClearPreflight`.
- `/dev` renders a Route Auto-Clear Preflight panel with exact route IDs, source-proof counts, clear readiness, proposed disposition, and mutation boundary.
- The preflight reuses existing Dev Hub truth: Route Review Triage, Route Review Operator Packet, and Action Route Readback.
- Every row stays approval-bound with `status=approval_required`, `approvalRequired=true`, `safeToAutoClearNow=false`, and `routeMutatedNow=false`.
- Duplicate/stale rows are proposed candidates only; owner-required and sensitive rows are explicitly blocked from auto-clear.
- The readback creates zero route approvals, applies, rejects, snoozes, reroutes, destination writes, backlog writes, Scoper/Portfolio records, Harlan sends, model calls, extraction runs, connector probes, or external writes.
- The proof fails if any row is marked auto-cleared, rejected, snoozed, applied, mutated, safe-to-clear-now, or loses exact route IDs.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-route-autoclear-preflight.js` as a compact projection over Route Review Triage, Route Review Operator Packet, and Action Route Readback.
- Wire `buildDevTeamHubV0Snapshot` to build `routeAutoClearPreflight` after the contributing route readbacks are available.
- Add `public/dev-route-autoclear-preflight.js` and a `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-route-autoclear-preflight-check.mjs` and `process:dev-hub-route-autoclear-preflight-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Mutation drift: preflight code must not call approve/apply/reject/snooze/reroute or destination writers.
- False authority risk: a clear candidate is not approval. Copy and validation must keep every row approval-bound.
- Sensitive-route risk: people, money, auth, customer, or external-system rows must stay human-review-only.
- Payload risk: route rows can become large. Keep rows bounded and preserve counts separately.

## Tests

```bash
node --check lib/dev-hub-route-autoclear-preflight.js scripts/process-dev-hub-route-autoclear-preflight-check.mjs public/dev-route-autoclear-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-route-autoclear-preflight-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-ROUTE-AUTOCLEAR-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-ROUTE-AUTOCLEAR-PREFLIGHT-001.json --closeoutKey=dev-hub-route-autoclear-preflight-v1 --commitRef=HEAD
```
