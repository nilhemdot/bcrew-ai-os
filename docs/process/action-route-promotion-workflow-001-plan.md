# ACTION-ROUTE-PROMOTION-WORKFLOW-001 Plan

Card: `ACTION-ROUTE-PROMOTION-WORKFLOW-001`

Closeout key: `action-route-promotion-workflow-v1`

## What

Add the governed workflow for Action Route Review Inbox items so proposed findings can be confirmed, answered, assigned, promoted, marked duplicate, rejected, snoozed, or linked to an existing card without becoming another noisy backlog pile.

## Why

`ACTION-ROUTE-REVIEW-INBOX-001` separated proposed intelligence from committed Backlog work. The next operator gap is closure: review items need safe, auditable actions that preserve source evidence, prevent duplicate backlog creation, and keep internal workflow writes separate from external side effects.

## Acceptance Criteria

- Live backlog card `ACTION-ROUTE-PROMOTION-WORKFLOW-001` exists and moves through Current Sprint correctly.
- Required scaffold metadata is complete before `building_now`.
- `lib/action-route-promotion-workflow.js` owns the action contract, validators, duplicate detection, metadata shape, and dogfood proof.
- Review Inbox items expose available workflow actions and a narrow internal POST route.
- Supported actions are `confirm_decision`, `answer_question`, `assign_owner`, `promote_to_backlog`, `duplicate`, `reject`, `snooze`, and `link_existing_card`.
- Source refs/evidence are preserved in workflow metadata.
- `promote_to_backlog` fails closed if a backlog card already references the same action route.
- `assign_owner`, `answer_question`, `duplicate`, `reject`, `snooze`, and `link_existing_card` require the needed owner, answer, reason, duration, or linked card.
- The route refuses live extraction, auth-required/paid runs, provider/model calls, external writes, Drive mutation, and Agent Feedback auto-send.
- The page adds functional workflow controls without broad visual UI redesign.
- Existing Strategy Hub action-route review behavior remains unchanged.
- Focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship` pass.

## Definition Of Done

Done means the Review Inbox has an internal governed workflow path, the live card is closed under `action-route-promotion-workflow-v1`, duplicate backlog promotion is blocked, workflow state is source-backed and visible, closeout is registered, and the commit is pushed.

Done does not mean dedupe/staleness policy is complete, live extraction runs, connector/auth work starts, external systems are written, or Harlan/Fal/voice/Canva/OpenHuman feature work exists. Next card: `ACTION-ROUTE-DEDUP-STALENESS-GUARD-001`.

## Details

Existing work to reuse:

- `ACTION-ROUTE-REVIEW-INBOX-001` read model and Foundation page.
- `lib/intelligence-action-router.js` route approval, apply, reject, and reroute functions.
- `recordActionRouteCuration()` metadata capture.
- Build-lane scaffold, Current Sprint metadata guard, Plan Critic, failure telemetry, closeout registry, and ship gate.

Implementation:

- Add `lib/action-route-promotion-workflow.js`.
- Extend Review Inbox snapshots with available workflow actions and workflow metadata.
- Add `POST /api/foundation/action-route-review-inbox/:routeId/workflow`.
- Keep all writes internal to Foundation DB state and route metadata.
- Add small page controls using the existing Review Inbox card layout.
- Register security posture, package script, verifier coverage, closeout registry, current plan, and current state.

Gate decision tree:

- Gate decision tree uses static gate first, focused gate second, and full gate for the final ship because the blast radius includes an admin-gated route, internal DB workflow writes, security posture, frontend controls, and verifier coverage.
- Use `node --check` as the static gate and the focused proof while iterating.
- Run full `foundation:verify` only when focused proof is green or when repairing a full-verifier failure.
- Run full `process:foundation-ship` before push.
- Route proof budget: the workflow POST route is an owner-only internal route that should return under 1.5 seconds and under 700 KB; if a manual route timing check is needed, use `curl --max-time 5` against `/api/foundation/action-route-review-inbox/:routeId/workflow` with a safe validation failure or synthetic route fixture, not live extraction.

Operator value and speed:

- Useful operator behavior: Steve can turn a proposed Action Route item into a reviewed decision, answered question, owner assignment, backlog card, duplicate, reject, snooze, or existing-card link without letting the normal Backlog fill with unreviewed noise.
- This unlocks a real workflow for faster review quality: proposed intelligence gets a reason, owner, action, or closure state instead of showing up again as the same unresolved item.
- The loop stays fast and proportional: focused proof should stay under 5 minutes, then one full `process:foundation-ship` closes the card.

Shared-file and size plan:

- Requested shared files are `server.js`, `lib/foundation-db.js`, `lib/security-access.js`, `lib/strategy-shared-comms-routes.js`, `scripts/foundation-verify.mjs`, `public/foundation-data.js`, and `public/foundation-action-route-review-inbox-renderers.js`.
- Main session approved this active Foundation sprint scope and owns the shared-file coordination. This is not side or hub work; if another hub/side builder needs these same shared files, it must return to main session coordination before commit, push, merge, or ship.
- Split plan / no-new-responsibility plan: `lib/action-route-promotion-workflow.js` is the new module boundary for workflow validation, duplicate detection, metadata shape, and dogfood proof.
- The new workflow module owns the domain; shared files only register routes, dependencies, UI calls, or verifier coverage.
- `server.js`, `lib/foundation-db.js`, and `scripts/foundation-verify.mjs` are over the preferred hand-written budget, so they get only thin import/dependency/metadata/coverage wiring and no new product responsibility.
- Keep `scripts/foundation-verify.mjs` under 5,000 lines.
- Keep new hand-written module and focused proof under 1,500 lines each.
- Explicit file-size budget: approval JSON is a governed data record under 5 KB, closeout/report artifact is under 12 KB, and the plan artifact is under 12 KB.

Read/write posture:

- This card permits internal Foundation DB workflow writes from the new admin-gated route.
- It does not permit extraction, auth-required or paid runs, model/provider calls, Gmail/ClickUp/Drive/external writes, Drive permission mutation, or Agent Feedback auto-send.
- The focused proof does not apply live action routes; it dogfoods synthetic validation and source-shape wiring.

## Risks

- Risk: duplicate backlog creation.
  - Mitigation: promotion fails if an existing backlog row references the same action route.
- Risk: review actions lose evidence.
  - Mitigation: workflow metadata stores route ID, destination, source refs, reviewer, action, target card, and destination record.
- Risk: mutation route drifts into external writes.
  - Mitigation: validator rejects unsafe side-effect flags and proof scans for external-write/runtime tokens.
- Risk: broad UI redesign.
  - Mitigation: use existing card layout and lightweight buttons/prompts only.
- Risk: proof fails or behavior regresses.
  - Repair path: fail closed, keep the card open, use the focused proof failure to repair the exact route/validator/UI wiring, and reopen or revise the plan if duplicate prevention, source evidence, or no-external-write posture cannot be preserved.

Not next:

- No dedupe/staleness guard.
- No live extraction.
- No transcript fetches, screenshots, crawl, summarization, model calls, or provider probes.
- No auth-required or paid runs.
- No external writes.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad visual UI redesign.
- No Drive permission mutation.
- No live Agent Feedback auto-send.

## Tests

Focused loop:

```bash
node --check lib/action-route-promotion-workflow.js lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-promotion-workflow-check.mjs scripts/foundation-verify.mjs
npm run process:action-route-promotion-workflow-check -- --apply --stage=scoping --json
npm run process:action-route-promotion-workflow-check -- --apply --stage=sprint_ready --json
npm run process:action-route-promotion-workflow-check -- --apply --stage=building_now --json
```

Final gate:

```bash
npm run process:action-route-promotion-workflow-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=ACTION-ROUTE-PROMOTION-WORKFLOW-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json --closeoutKey=action-route-promotion-workflow-v1 --commitRef=HEAD
```
