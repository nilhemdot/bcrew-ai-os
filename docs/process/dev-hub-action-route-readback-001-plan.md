# DEV-HUB-ACTION-ROUTE-READBACK-001 Plan

## Card

- `DEV-HUB-ACTION-ROUTE-READBACK-001`
- Title: Expose action-route readback in Dev Hub
- Closeout key: `dev-hub-action-route-readback-v1`

## Problem

The Action Router can produce owner/reason-backed routes, and the synthetic proof now shows the approve/apply path can resolve work. The Dev Hub still does not make the route queue obvious enough for Steve: waiting routes, Harlan digest readiness, and apply-safety state can remain hidden outside the Dev build loop.

## Scope

Add a read-only Dev Hub action-route readback that consumes existing Foundation action-route artifacts:

- Action Route Review Inbox snapshot.
- Harlan digest dry-run packet.
- Action-route apply-safety preflight.
- Live Action Router pending/approved/applied/rejected counts.
- Bounded top review and apply-safety rows.

## Definition Of Done

- `/api/foundation/dev-team-hub` includes `actionRouteReadback`.
- `/dev` renders a visible Action Routes panel with waiting, ready-for-confirmed-apply, operator-review, blocked, and applied counts.
- The panel shows Harlan digest preview and apply-safety rows without sending, approving, applying, rejecting, snoozing, or mutating routes.
- Focused proof validates dogfood, live readback, UI wiring, payload bounds, closeout registry, verifier coverage, and no route/external/model/extraction mutation path.
- `foundation:verify` remains green.

## Guardrails

- No live extraction.
- No model/provider call.
- No Harlan/Telegram/email/Slack send.
- No route approve/apply/reject/snooze/reroute.
- No destination/backlog/decision/open-question mutation from the readback path.
- No auto-promotion of Director, Scoper, Portfolio, or route recommendations.
- Live route apply remains a separate Steve-approved action with exact route ID confirmation.

## Proof Commands

```bash
node --check lib/dev-hub-action-route-readback.js scripts/process-dev-hub-action-route-readback-check.mjs public/dev-action-route-readback.js
npm run process:dev-hub-action-route-readback-check -- --close-card --json
npm run process:dev-team-hub-v0-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DEV-HUB-ACTION-ROUTE-READBACK-001 --planApprovalRef=docs/process/approvals/DEV-HUB-ACTION-ROUTE-READBACK-001.json --closeoutKey=dev-hub-action-route-readback-v1 --commitRef=HEAD
```
