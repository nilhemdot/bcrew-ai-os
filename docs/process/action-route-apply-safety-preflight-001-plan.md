# ACTION-ROUTE-APPLY-SAFETY-PREFLIGHT-001 Plan

## Goal

Add a read-only safety preflight before live action-route approval/apply work so the route queue can be classified without silently writing decisions, backlog items, open questions, or external messages while Steve is offline.

## Current Truth

- `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002` remains the live P0 parent card for proving action routes resolve work instead of sitting in the queue.
- The apply CLI can approve and apply a route only with an explicit route-id echo and explicit approver, but live apply writes internal destination records.
- Tonight's guardrail blocks auto-promotion of Director, Scoper, Portfolio, or route recommendations into backlog while Steve sleeps.

## Scope

- Add `lib/action-route-apply-safety-preflight.js` to classify Action Route Review Inbox items into ready, operator-review-required, blocked, or already-resolved states.
- Add `scripts/process-action-route-apply-safety-preflight-check.mjs` as the focused proof and guarded child-card writer.
- Add `process:action-route-apply-safety-preflight-check` to `package.json`.
- Prove the preflight reads the live `/api/foundation/action-route-review-inbox` source, keeps `autoApplyAllowed=false`, and attempts no route, destination, backlog, approval, or external mutation.

## Acceptance

- `node --check lib/action-route-apply-safety-preflight.js scripts/process-action-route-apply-safety-preflight-check.mjs` passes.
- `npm run process:action-route-apply-safety-preflight-check -- --json` passes.
- Dogfood covers an approved internal route, pending route, needs-owner route, sensitive route, already-applied route, and fail-closed unsafe snapshot.
- The live preflight validates, reports route readiness counts, and keeps `autoApplyAllowed=false`, `routeMutationAttempted=false`, and `destinationMutationAttempted=false`.
- The focused proof verifies the existing apply CLI still requires `--confirmApprovedRouteApply=<same route id>` and an explicit `--approvedBy`.
- `npm run foundation:verify -- --json-summary` passes before commit.

## Not Next

- Do not approve, apply, reject, snooze, reroute, or mutate live action routes.
- Do not create backlog cards from Director, Scoper, Portfolio, or route recommendations.
- Do not send Telegram, email, Slack, Agent Feedback, or any external message.
- Do not start live extraction, auth-required browsing, source-session resume, login, download, purchase, posting, comments, model/provider calls, or Drive permission mutation.
- Do not build broader Harlan runtime, reply parsing, external-action authority, or auto-build behavior.

## Operator Value

Steve wakes up to a route queue that is safer and more legible: the system can say what is ready, what needs review, what is blocked, and why, without pretending a live apply is safe when it would create internal work records from recommendations.
