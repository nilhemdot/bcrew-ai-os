# ACTION-ROUTE-REVIEW-INBOX-001 Plan

Card: `ACTION-ROUTE-REVIEW-INBOX-001`

Closeout key: `action-route-review-inbox-v1`

## What

Create a read-only Action Route Review Inbox for proposed intelligence/action-route findings. The inbox shows each finding as a review item with type, owner, age, source refs, destination, and review state, and keeps route-derived backlog rows out of the default Backlog queue unless a specific card is explicitly focused.

## Why

Steve needs Backlog to mean committed/scoped work, not a mixed pile of proposed intelligence. Action Router findings are valuable, but they must be reviewed before they become sprintable backlog truth. This card makes the separation executable without deleting history or applying any action route.

## Acceptance Criteria

- Live backlog card `ACTION-ROUTE-REVIEW-INBOX-001` exists and moves through Current Sprint correctly.
- `lib/action-route-review-inbox.js` owns the review inbox contract, default-backlog separation helper, validation, and dogfood proof.
- Read-only `/api/foundation/action-route-review-inbox` returns review items with type, owner, age, source refs, destination, and review state.
- Foundation has a narrow Review Inbox page/route that fetches the dedicated inbox route on demand.
- Default `/api/foundation/backlog` excludes action-route-derived backlog rows from the normal queue while preserving counts, history, and focused-card access.
- Existing `/api/foundation/action-review` and review/apply behavior remain unchanged.
- Dogfood proves route-derived backlog rows move behind Review Inbox, normal backlog rows remain visible, focused action-route card loads still work, and missing type/owner/source/review-state items fail closed.
- No route promotion, apply, reject, snooze, duplicate linking, or dedupe/staleness workflow is built in this card.
- No live extraction, transcript fetch, screenshot capture, crawl, summarization, model call, provider probe, auth-required or paid run, external write, Drive permission mutation, Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work occurs.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.

## Definition Of Done

Done means the live card is closed under `action-route-review-inbox-v1`, the default backlog no longer mixes action-route-derived rows into normal work, Review Inbox exposes the proposed findings read-only, verifier coverage is live, closeout is registered, and the commit is pushed.

Done does not mean promotion workflow, duplicate/staleness handling, action route applying, or external writeback exists. Next card: `ACTION-ROUTE-PROMOTION-WORKFLOW-001`.

## Details

Existing work to reuse:

- Existing Action Review route and panel: `/api/foundation/action-review`, `buildFoundationActionReviewSnapshot()`, and `ACTION-REVIEW-APPLY-001`.
- Existing Action Router store/snapshot: `lib/intelligence-action-router.js`.
- Existing Foundation backlog list/detail routes and lazy-load architecture.
- Existing Foundation frontend route split files; do not add code to `public/foundation.js`.
- Existing build-lane scaffold, Plan Critic, Current Sprint metadata, closeout registry, and ship gate.

Implementation:

- Add `lib/action-route-review-inbox.js` for contract logic and dogfood proof.
- Add `/api/foundation/action-route-review-inbox` as a read-only route over existing Action Router and backlog truth.
- Add a small Foundation Review Inbox page using existing panel/card styles, without visual redesign.
- Update the default backlog list payload to separate action-route-derived backlog rows while keeping explicit card focus and detail reads available.
- Register the route in security posture, surface map, live API snapshot, verifier coverage, package script, closeout registry, current plan, and current state.

Gate decision tree:

- Gate level is full because this touches API route wiring, Backlog payload shape, frontend routing, security posture, verifier coverage, and process artifacts.
- Use the static syntax check first, then the focused proof `npm run process:action-route-review-inbox-check`, then full `foundation:verify`, then full `process:foundation-ship`.
- The blast radius is bounded to read-only route/page and Backlog list separation; no mutation route or external write is approved.
- The focused proof is the fast/proportional loop while iterating; it should run under 5 minutes and must be green before the final full ship gate.
- If the route cannot read action-router truth, leave the card open and repair the read path or route the blocker.
- If default backlog separation hides history or breaks focused-card reads, repair before closeout.

Operator value and speed:

- Steve gets a real workflow improvement: Backlog stays for committed/scoped work, while proposed action-route intelligence moves to a review inbox with owner, age, type, source refs, destination, and review state.
- This unlocks better quality and speed because proposed intelligence can be reviewed without polluting sprint planning.
- The first load stays thin: the Backlog route reports Review Inbox counts and route, while the Review Inbox details load on demand through the narrow route.

Shared-file and size plan:

- Main-session approved coordination owns this Foundation route integration; requestedSharedFiles are `package.json`, `server.js`, `lib/security-access.js`, `lib/strategy-shared-comms-routes.js`, `lib/foundation-backlog-detail.js`, `scripts/foundation-verify.mjs`, docs/process artifacts, and related route/frontend registration files.
- No side/hub chat commits or pushes are part of this card; any side or hub work touching these shared files must return to main session before commit, push, merge, or ship.
- Split plan: new responsibility lives in `lib/action-route-review-inbox.js` and `public/foundation-action-route-review-inbox-renderers.js`; `server.js`, `scripts/foundation-verify.mjs`, `lib/security-access.js`, `lib/strategy-shared-comms-routes.js`, `lib/foundation-backlog-detail.js`, and closeout/verifier registries stay thin wrappers or registrations with no new responsibility added to the monolith/root verifier.
- The API route performance budget is a narrow read-only operator route under 1.5 seconds and under 700 KB; the full ship gate and live API snapshot keep payload budget pressure visible.

Shared files:

- This card intentionally touches `package.json`, `server.js`, `lib/security-access.js`, `lib/strategy-shared-comms-routes.js`, `lib/foundation-backlog-detail.js`, `scripts/foundation-verify.mjs`, `docs/process/*`, and route/frontend registration files because the work is Foundation review-inbox plumbing. It does not touch Harlan/Fal/voice/Canva/OpenHuman feature work.

File-size and artifact budget:

- New hand-written module target: under 1,500 lines.
- New focused proof script target: under 1,500 lines.
- Keep `public/foundation.js` unchanged because it is already near the 3,000-line guardrail.
- Keep `scripts/foundation-verify.mjs` under 5,000 lines; add only bounded live API/verifier wiring.
- Approval JSON budget: under 5 KB.
- Plan and closeout artifacts: under 12 KB each.

Read/write posture:

- The inbox route and frontend are read-only.
- Live backlog, Plan Critic, and Current Sprint writes happen only through the focused proof with explicit `--apply` or `--close-card`.
- No action-route mutation is approved in this card.

## Risks

- Risk: hiding a real backlog card.
  - Mitigation: only action-route-derived rows are separated, focused-card loads still work, and the review inbox lists separated IDs.
- Risk: accidentally building promotion/apply workflow.
  - Mitigation: this card is read-only; promotion workflow is the next card.
- Risk: UI redesign drift.
  - Mitigation: use existing Foundation panel/card styles and add only the narrow route/page.
- Risk: verifier root line count regresses.
  - Mitigation: keep root changes minimal and validate line count.

Not next:

- No route promotion workflow.
- No duplicate/staleness guard.
- No live extraction.
- No model calls or provider probes.
- No auth-required or paid runs.
- No external writes.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad visual UI redesign.
- No Drive permission mutation.
- No live Agent Feedback auto-send.

## Tests

Focused loop:

```bash
node --check lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-review-inbox-check.mjs scripts/foundation-verify.mjs
npm run process:action-route-review-inbox-check -- --apply --stage=scoping --json
npm run process:action-route-review-inbox-check -- --apply --stage=sprint_ready --json
npm run process:action-route-review-inbox-check -- --apply --stage=building_now --json
```

Final gate:

```bash
npm run process:action-route-review-inbox-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=ACTION-ROUTE-REVIEW-INBOX-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json --closeoutKey=action-route-review-inbox-v1 --commitRef=HEAD
```
