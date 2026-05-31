# ACTION-ROUTE-HARLAN-DIGEST-001 Plan

## Goal

Build the first no-send Harlan-ready digest packet for the Action Route Review Inbox so pending routed intelligence is visible without mutating routes, creating backlog cards, or sending Telegram while Steve is offline.

## Current Truth

- `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002` is the live P0 parent card for proving action routes resolve work instead of sitting as proposals.
- The Action Route Review Inbox is healthy and source-backed, but Harlan has no route-review digest packet for "N decisions waiting" style operator visibility.
- Live Harlan builder-event notifications are available for approved ship/checkpoint messages only. This card does not extend that live send authority.

## Scope

- Add `lib/action-route-harlan-digest.js` to turn an existing Action Route Review Inbox snapshot into a bounded Harlan-ready packet.
- Add `scripts/process-action-route-harlan-digest-check.mjs` as the focused proof.
- Add `process:action-route-harlan-digest-check` to `package.json`.
- Prove the packet uses the live `/api/foundation/action-route-review-inbox` source, counts pending/aged/stale/duplicate items, previews the top review items, and remains no-send/no-mutation.

## Acceptance

- `node --check lib/action-route-harlan-digest.js scripts/process-action-route-harlan-digest-check.mjs` passes.
- `npm run process:action-route-harlan-digest-check -- --json` passes.
- The focused proof rejects unsafe snapshots, bounds long item text, handles the empty-queue case, and validates the live Action Route Review Inbox source.
- The generated live packet has `sendsMessageNow=false`, `externalSent=false`, `mutatedRoutes=false`, and does not start Harlan runtime or reply parsing.
- `npm run foundation:verify -- --json-summary` passes before commit.

## Not Next

- Do not send Telegram, email, Slack, Agent Feedback, or any external message.
- Do not approve, apply, reject, snooze, or mutate action routes.
- Do not create backlog cards from Director or route recommendations.
- Do not start live extraction, auth-required browsing, source-session resume, login, download, purchase, posting, comments, model/provider calls, or Drive permission mutation.
- Do not build broader Harlan runtime, reply parsing, or external-action authority.

## Operator Value

Steve can wake up and see that the system can already package the route queue into a Harlan-ready, source-backed digest without crossing the unsafe live-action boundary. The next card can decide whether to approve a real Steve-only route notification or continue into one internal route approval/apply proof.
