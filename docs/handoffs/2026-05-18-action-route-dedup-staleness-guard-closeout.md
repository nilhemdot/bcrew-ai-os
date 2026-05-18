# Action Route Dedupe And Staleness Guard Closeout

Card: `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`

Closeout key: `action-route-dedup-staleness-guard-v1`

Status: shipped.

## What Changed

Added a Foundation-owned duplicate and staleness guard to the Action Route Review Inbox.

The Review Inbox now carries:

- duplicate cluster metadata for repeated unresolved findings
- informational links when a route and route-derived backlog row represent the same work
- stale watch at 3 days and stale risk at 7 days
- next actions for every stale item and duplicate cluster
- per-item `dedupeKey`, duplicate cluster IDs, and staleness status

History is preserved. The guard does not delete, hide, auto-reject, auto-snooze, extract, call models, or write external systems.

## Proof

- Focused proof: `npm run process:action-route-dedup-staleness-guard-check -- --close-card --json`
- Backlog hygiene: `npm run backlog:hygiene -- --json`
- Full verifier: `npm run foundation:verify`
- Ship gate: `npm run process:foundation-ship -- --card=ACTION-ROUTE-DEDUP-STALENESS-GUARD-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json --closeoutKey=action-route-dedup-staleness-guard-v1 --commitRef=HEAD`

## Dogfood

The focused proof simulates:

- repeated unresolved action-route findings
- route/backlog linked duplicates that should remain informational
- stale yellow watch items
- stale red risk items
- malformed stale output missing next action

The proof passes only when duplicates are grouped without data loss and stale rows carry closure next actions.

## Boundaries

No live extraction, transcript fetch, screenshot capture, crawl, summarization, model call, provider probe, auth-required or paid run, external write, Drive permission mutation, Agent Feedback auto-send, Harlan/Fal/voice/Canva/OpenHuman feature work, broad UI redesign, auto-delete, auto-hide, auto-reject, or auto-snooze was introduced.

## Files

- `lib/action-route-dedup-staleness-guard.js`
- `lib/action-route-review-inbox.js`
- `lib/foundation-verifier-control-loop.js`
- `public/foundation-action-route-review-inbox-renderers.js`
- `scripts/process-action-route-dedup-staleness-guard-check.mjs`
- `lib/foundation-build-closeout-action-route-records.js`
- `docs/process/action-route-dedup-staleness-guard-001-plan.md`
- `docs/process/approvals/ACTION-ROUTE-DEDUP-STALENESS-GUARD-001.json`

## Next

Continue safe Foundation-up work from repo truth. Prefer no-auth source/connector completion, source-contract/extraction-readiness gaps, or safe Foundation cleanup if connector/source work needs Steve approval.
