# Action Route Review Inbox Closeout

Card: `ACTION-ROUTE-REVIEW-INBOX-001`

Closeout key: `action-route-review-inbox-v1`

## What Shipped

Added a read-only Action Route Review Inbox for proposed intelligence/action-route findings. The inbox exposes review items with type, owner, age, source refs, destination, and review state, and default Backlog no longer mixes action-route-derived rows into the normal work queue.

This did not run live extraction, transcript fetches, screenshots, crawl, summarization, model calls, provider probes, paid/auth runs, external writes, action-route promotion/apply/reject/snooze mutations, Drive permission mutation, or live Agent Feedback auto-send.

## Where It Lives

- `lib/action-route-review-inbox.js`
- `/api/foundation/action-route-review-inbox`
- `public/foundation-action-route-review-inbox-renderers.js`
- `Foundation > Review queues > Review Inbox`
- `lib/foundation-backlog-detail.js`
- `scripts/process-action-route-review-inbox-check.mjs`
- `lib/foundation-verifier-control-loop.js`
- `docs/process/action-route-review-inbox-001-plan.md`
- `docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json`

## Proof

- `node --check lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-review-inbox-check.mjs scripts/foundation-verify.mjs`
- `npm run process:action-route-review-inbox-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=ACTION-ROUTE-REVIEW-INBOX-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json --closeoutKey=action-route-review-inbox-v1 --commitRef=HEAD`

## Dogfood

- Action-route records become Review Inbox items with type, owner, age, source refs, destination, and review state.
- Route-derived backlog rows are hidden from default Backlog and listed in Review Inbox.
- Normal backlog rows remain visible.
- Focused card loads can still retrieve separated action-route backlog rows.
- Missing type, owner, source refs, or review state fails closed.

## Current Status

`ACTION-ROUTE-REVIEW-INBOX-001` is done for v1 once this closeout ships.

Next card in `FOUNDATION-KB-ACTION-REVIEW-SPRINT-001`: `ACTION-ROUTE-PROMOTION-WORKFLOW-001`.
