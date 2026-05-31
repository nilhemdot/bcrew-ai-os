# DEV-HUB-ROUTE-BLOCKER-PREFLIGHT-001 Plan

## What

Expose a read-only Dev Hub Route Blocker Preflight that turns auto-clear blockers into exact owner-required and sensitive-review route rows.

## Why

The Route Auto-Clear Preflight proved there are 80 duplicate/stale routes, but the first bounded rows are blocked by owner and sensitive-review gates. The Dev Hub needs to show why cleanup is parked and what human decision is needed next without assigning owners or mutating routes.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `routeBlockerPreflight`.
- `/dev` renders a Route Blocker Preflight panel with exact route IDs, blocker type, suggested decision lane, source-proof counts, and mutation boundary.
- The preflight reuses existing Dev Hub truth: Route Auto-Clear Preflight and Route Review Triage.
- Every row stays approval-bound with `status=approval_required`, `approvalRequired=true`, `ownerAssignedNow=false`, `sensitiveReviewedNow=false`, and `routeMutatedNow=false`.
- The readback creates zero owner assignments, sensitive-review completions, route approvals, applies, rejects, snoozes, reroutes, destination writes, backlog writes, Scoper/Portfolio records, Harlan sends, model calls, extraction runs, connector probes, or external writes.
- The proof fails if any row is assigned, reviewed, mutated, externally sent, or loses exact route IDs.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, bounded rows, UI wiring, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-route-blocker-preflight.js` as a compact projection over Route Auto-Clear Preflight and Route Review Triage.
- Wire `buildDevTeamHubV0Snapshot` to build `routeBlockerPreflight` after `routeAutoClearPreflight`.
- Add `public/dev-route-blocker-preflight.js` and a `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-route-blocker-preflight-check.mjs` and `process:dev-hub-route-blocker-preflight-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Mutation drift: blocker code must not assign owners or call route mutation paths.
- False authority risk: suggested decision lane is not approval. Copy and validation must keep every row approval-bound.
- Sensitive-route risk: people, money, auth, customer, or external-system rows must stay human-review-only.
- Payload risk: route rows can become large. Keep rows bounded and preserve counts separately.

## Tests

```bash
node --check lib/dev-hub-route-blocker-preflight.js scripts/process-dev-hub-route-blocker-preflight-check.mjs public/dev-route-blocker-preflight.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-route-blocker-preflight-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-ROUTE-BLOCKER-PREFLIGHT-001 --planApprovalRef=docs/process/approvals/DEV-HUB-ROUTE-BLOCKER-PREFLIGHT-001.json --closeoutKey=dev-hub-route-blocker-preflight-v1 --commitRef=HEAD
```
