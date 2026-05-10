# FOUNDATION-SPRINT-CADENCE-001 Sprint Cadence Plan

Status: approved at 9.8 by Steve on 2026-05-10. Implementation is allowed only inside this plan.

Card: `FOUNDATION-SPRINT-CADENCE-001`

## Current Truth

- `FOUNDATION-SPRINT-SYSTEM-001` is shipped and owns the Current Sprint overlay on live backlog truth.
- `FOUNDATION-SPRINT-CADENCE-001` is the next process card.
- `MEETING-VAULT-ACL-001` is returned/blocking.
- No Google Drive permission mutation is approved.
- Phase B request-access emails and Drive ACL changes remain out of scope.

## Goal

Make the top of Recent Work / Current Sprint usable as Steve's sprint command view.

The panel must show:

- executive sprint summary;
- sprint goal;
- current status;
- next card;
- current blocker;
- exit criteria;
- stage buckets: Scoping, Sprint Ready, Building Now, Returned, Done This Sprint;
- card definition of done;
- proof commands;
- returned reason;
- next action.

## Files To Inspect

- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `lib/foundation-build-log.js`
- `server.js`
- `public/foundation.js`
- `public/styles.css`
- `scripts/process-foundation-sprint-system-check.mjs`
- `scripts/foundation-verify.mjs`
- `scripts/process-foundation-ship.mjs`
- `docs/process/foundation-sprint-system.md`
- `docs/handoffs/2026-05-10-foundation-sprint-capture.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Likely Files To Touch

- `lib/foundation-current-sprint.js`
  - Add cadence constants, exit criteria, next-card/current-blocker summary, and command-view metadata.
- `public/foundation.js`
  - Render the command view at the top of Recent Work.
- `public/styles.css`
  - Replace skinny column cards with a readable board or compact row layout.
- `scripts/process-foundation-sprint-cadence-check.mjs`
  - Add focused proof for the cadence contract.
- `package.json`
  - Add `process:foundation-sprint-cadence-check`.
- `scripts/foundation-verify.mjs`
  - Add structural coverage.
- `docs/process/foundation-sprint-cadence.md`
  - Record the implemented operating contract.
- `docs/process/approvals/FOUNDATION-SPRINT-CADENCE-001.json`
  - Record the 9.8 approval.
- `lib/foundation-build-log.js`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`
  - Add closeout evidence if proof passes.

## Acceptance Criteria

- Current Sprint remains an overlay on live backlog truth, not a second backlog.
- The command view shows executive summary, goal, status, next card, blocker, exit criteria, all five stages, definition of done, proof commands, returned reason, and next action.
- Layout is readable: no skinny five-column board that wraps words vertically.
- `FOUNDATION-SPRINT-SYSTEM-001` remains done this sprint.
- `FOUNDATION-SPRINT-CADENCE-001` can close only if the command-view proof passes.
- `MEETING-VAULT-ACL-001` remains returned/blocking until its separate approval path resumes.
- No Drive permission mutation or request-access email occurs.

## Rollback / Fail Closed

If the cadence payload cannot be proven, leave `FOUNDATION-SPRINT-CADENCE-001` scoped/building and keep the existing Current Sprint overlay visible. If the command layout cannot prove the required fields, the focused script and `foundation:verify` must fail. If a route or script detects Drive mutation approval drift, the card fails closed and the next action is to restore the no-mutation boundary before returning to Meeting Vault.

## Proof Commands

- `npm run process:foundation-sprint-cadence-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-SPRINT-CADENCE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SPRINT-CADENCE-001.json --closeoutKey=foundation-sprint-cadence-v1 --commitRef=HEAD`

## Not Next

- No `MEETING-VAULT-ACL-001` Phase B.
- No Google Drive permission mutations.
- No request-access emails.
- No Strategy, Sales expansion, Agent Feedback expansion, Scoper, Agent Factory, broad corpus, video mining, researcher, public access, broad sprint analytics, or broad UI polish.
