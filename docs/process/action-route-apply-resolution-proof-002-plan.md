# ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002 Plan

Card: `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002`

Closeout key: `action-route-apply-resolution-proof-synthetic-v1`

## What

Prove the Action Router can move a source-backed route from `pending` to `approved` to `applied` and create an internal destination record, without applying any live recommendation while Steve is asleep.

## Why

The system already builds routed decisions with owners and source proof, but most remain pending. Before a live apply is allowed, the Foundation needs proof that the actual approve/apply code path works, preserves evidence, creates the destination record, and can be tested without promoting real recommendations.

## Acceptance Criteria

- `ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002` closes under this plan and closeout key.
- The proof seeds one synthetic verified synthesized item and one synthetic pending action route inside a single database transaction.
- The proof calls the real Action Router approve and apply functions, not a mocked state flip.
- The route reaches `approved`, then `applied`, and the internal backlog destination row exists inside the transaction.
- The route keeps owner, source IDs, evidence refs, and verified synthesis metadata.
- The transaction rolls back and proves synthetic route, destination, run, item, and route change-event rows are gone afterward.
- No live pending route is approved, applied, rejected, snoozed, rerouted, or promoted.
- No external write, send, source sync, extraction, model/provider call, login, paid/private source action, Browserbase action, Harlan runtime action, or Agent Feedback action runs.
- Focused proof, `foundation:verify`, ship-check, fanout-check, and `process:foundation-ship` pass before push.

## Definition Of Done

Done means one rollback-only synthetic route proves the real internal Action Router approval/apply path and leaves no synthetic residue. It does not mean live routes can be applied unattended.

Next safe slice: show apply-safety states and route digest counts in the Dev Hub or Review Inbox so Steve can pick a real route later.

## Implementation

- Add `lib/action-route-apply-resolution-proof.js`.
- Add `scripts/process-action-route-apply-resolution-proof-check.mjs`.
- Add package script `process:action-route-apply-resolution-proof-check`.
- Add closeout registry coverage and verifier coverage card ID.
- Use the existing `createIntelligenceActionRouterStore()` with a transaction-scoped client so the real approve/apply functions run against real DB tables.
- Roll the transaction back before the proof returns and verify all synthetic IDs are absent.

## Read/Write Posture

This card permits internal DB writes only inside a rollback-only synthetic transaction and a guarded close-card backlog update. It does not permit live route apply.

No live route approval or apply.
No live extraction, source sync, transcript fetch, crawl, summarization, or model call.
No external write, Telegram send, email send, Slack send, Agent Feedback send, or public message.
No backlog, decision, or question creation from live Director, Scoper, Portfolio, or route recommendations.
No login, MFA, paid/private source work, Browserbase, source-session resume, or external-action authority.

## Risks

- Risk: synthetic proof leaves residue.
  - Mitigation: proof rolls back and then verifies every synthetic run/item/route/destination/change-event count is zero.
- Risk: proof silently mocks the apply path.
  - Mitigation: the proof calls the real store approve/apply functions with a transaction-scoped client.
- Risk: this is mistaken as approval to apply real recommendations.
  - Mitigation: closeout states live apply remains separate operator approval work.

## Tests

```bash
node --check lib/action-route-apply-resolution-proof.js scripts/process-action-route-apply-resolution-proof-check.mjs
npm run process:action-route-apply-resolution-proof-check -- --close-card --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002.json --closeoutKey=action-route-apply-resolution-proof-synthetic-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002 --closeoutKey=action-route-apply-resolution-proof-synthetic-v1
npm run process:foundation-ship -- --card=ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002.json --closeoutKey=action-route-apply-resolution-proof-synthetic-v1 --commitRef=HEAD
```
