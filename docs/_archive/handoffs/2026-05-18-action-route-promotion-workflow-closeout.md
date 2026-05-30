# Action Route Promotion Workflow Closeout

Card: `ACTION-ROUTE-PROMOTION-WORKFLOW-001`

Closeout key: `action-route-promotion-workflow-v1`

## What Shipped

Added the governed internal workflow path for Action Route Review Inbox items. Review items can now expose actions to confirm decisions, answer questions, assign owners, promote to backlog, mark duplicates, reject, snooze, and link existing cards.

The workflow preserves source refs in route metadata, blocks duplicate backlog promotion when an existing backlog row already references the same action route, and keeps the new route admin-gated and internal to Foundation.

This did not run live extraction, transcript fetches, screenshots, crawl, summarization, model calls, provider probes, paid/auth-required runs, external writes, Drive permission mutation, live Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work.

## Where It Lives

- `lib/action-route-promotion-workflow.js`
- `POST /api/foundation/action-route-review-inbox/:routeId/workflow`
- `lib/action-route-review-inbox.js`
- `public/foundation-action-route-review-inbox-renderers.js`
- `public/foundation-data.js`
- `scripts/process-action-route-promotion-workflow-check.mjs`
- `docs/process/action-route-promotion-workflow-001-plan.md`
- `docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json`

## Proof

- `node --check lib/action-route-promotion-workflow.js lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-promotion-workflow-check.mjs scripts/foundation-verify.mjs`
- `npm run process:action-route-promotion-workflow-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=ACTION-ROUTE-PROMOTION-WORKFLOW-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json --closeoutKey=action-route-promotion-workflow-v1 --commitRef=HEAD`

## Dogfood

- Valid backlog promotion passes when no existing backlog row references the action route.
- Duplicate backlog promotion fails before a new backlog row can be created.
- Owner assignment fails without a concrete owner.
- Question answering fails without an answer.
- Reject fails without a reason.
- Duplicate/link actions fail without a target card.
- Snooze requires a duration or reason.
- Unsafe extraction/auth/paid/external-write flags fail closed.
- Workflow metadata preserves route ID, destination, reviewer, source refs, action, and no-external-write posture.

## Current Status

`ACTION-ROUTE-PROMOTION-WORKFLOW-001` is done for v1 once this closeout ships.

Next card in `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`: `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`.
