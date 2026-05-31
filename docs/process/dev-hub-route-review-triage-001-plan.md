# DEV-HUB-ROUTE-REVIEW-TRIAGE-001 Plan

## What

Expose a read-only Dev Hub Route Review Triage panel that groups action-route review pressure into operator buckets: ready-for-confirmed-apply, owner required, sensitive review, duplicate/stale, and oldest routes.

## Why

The system has over 100 route review items. Showing a raw waiting count is not enough; Steve needs the queue organized without recreating the old unsafe auto-apply or auto-build pattern.

## Acceptance Criteria

- `/api/foundation/dev-team-hub` includes `routeReviewTriage`.
- `/dev` renders a Route Review Triage panel with summary counts, triage buckets, and bounded route queues.
- The readback reuses existing truth from the Action Route Review Inbox and Apply Safety Preflight.
- The readback never approves, applies, rejects, snoozes, reroutes, mutates destinations, sends Harlan, or creates backlog/Scoper/Portfolio records.
- The proof fails if any route can be auto-applied or if the readback performs a route/destination/external mutation.

## Definition Of Done

- A focused process check validates dogfood fixtures, live readback, UI wiring, bounded payloads, closeout registry, verifier coverage, and no mutation path.
- `process:dev-team-hub-v0-check` validates the Dev Hub payload and renderer still work.
- `process:process-check-readonly-mode-check` remains green.
- `foundation:verify` remains green.
- The live backlog card is closed only through the guarded focused proof.
- The closeout is registered with exact card and closeout metadata.

## Details

- Create `lib/dev-hub-route-review-triage.js` as a compact projection over the existing review inbox and apply safety preflight.
- Wire `buildDevTeamHubV0Snapshot` to build `routeReviewTriage` from the Foundation action router snapshot and backlog items.
- Add `public/dev-route-review-triage.js` and a small `/dev` panel that listens to existing `devhub:snapshot` events.
- Add standalone CSS to avoid growing `public/dev.css`.
- Add `scripts/process-dev-hub-route-review-triage-check.mjs` and `process:dev-hub-route-review-triage-check`.
- Register closeout and verifier coverage card ID.

## Risks

- Auto-clear risk: triage buckets could look like permission to mutate. The panel must stay proposal-only and no-auto-clear.
- Sensitive route risk: customer, money, auth, people, or external-system routes require human review and must not be hidden in generic cleanup.
- Payload risk: Dev Hub is already large. Keep route queues bounded and keep full action history in the existing review inbox.

## Tests

```bash
node --check lib/dev-hub-route-review-triage.js scripts/process-dev-hub-route-review-triage-check.mjs public/dev-route-review-triage.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs
npm run process:dev-hub-route-review-triage-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-ROUTE-REVIEW-TRIAGE-001 --planApprovalRef=docs/process/approvals/DEV-HUB-ROUTE-REVIEW-TRIAGE-001.json --closeoutKey=dev-hub-route-review-triage-v1 --commitRef=HEAD
```
