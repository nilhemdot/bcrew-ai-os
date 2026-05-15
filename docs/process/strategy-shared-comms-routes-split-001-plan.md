# STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 Plan

## What

Split the Strategy/shared-communications route cluster out of `server.js` into `lib/strategy-shared-comms-routes.js`.

The moved routes are:

- `GET /api/shared-communications/archive`
- `GET /api/shared-communications/coverage`
- `GET /api/shared-communications/candidates`
- `GET /api/shared-communications/synthesis`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-backlog`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-decision`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-question`
- `POST /api/shared-communications/candidates/:candidateKey/:action`
- `GET /api/strategic-execution/prework-coverage`
- `GET /api/strategic-execution/goal-truth`
- `GET /api/strategic-execution/operating-truth`
- `GET /api/strategic-execution/v2`
- `GET /api/strategic-execution/action-routes`
- `POST /api/strategic-execution/action-routes/:routeId/review`
- `POST /api/strategic-execution/advisor`
- `GET /api/foundation/action-review`
- `POST /api/foundation/action-review/:routeId/review`

## Why

`server.js` is still over the 5,000-line danger threshold and this cluster mixes strategy reads, shared communications review flows, and action-review POST handlers inside the main server file. Moving this domain to a focused registrar reduces blast radius without changing behavior, auth posture, payload contracts, or write semantics.

Steve needs speed with quality. The useful operator value is a real workflow where Strategy Hub, Action Review, and Shared Communications review can keep working while future Foundation write-route cleanup happens in a smaller, easier-to-review server surface. This unlocks safer hub building for Steve, Nick, and the team because a Strategy/shared-comms change is less likely to break Sales/Ops/Foundation reads by accident.

## Acceptance Criteria

- `server.js` delegates the cluster through `registerStrategySharedCommsRoutes(app, deps)`.
- `lib/strategy-shared-comms-routes.js` owns every moved route string and helper in this card.
- `server.js` no longer owns the moved route handler strings.
- Direct Foundation write routes, Sales routes, Agent Feedback routes, and `/api/intelligence/evidence` stay in `server.js`.
- The focused proof live-probes the moved read routes and verifies payload shape.
- The focused proof exercises guarded POST paths with safe invalid fixtures so no destination records are created.
- Dogfood proof rejects missing module, old inline route ownership, missing registrar, accidental movement of direct Foundation write routes, and weak proof.
- `server.js` line count decreases from the pre-card baseline of `6,115`.

## Definition Of Done

- Plan approval file validates at 9.8+ and a durable Plan Critic pass row exists.
- Current Sprint has the card in `building_now` or `done_this_sprint`.
- Package script `process:strategy-shared-comms-routes-split-check` exists.
- `foundation:verify` includes ID-named coverage for the split and reads moved route ownership from the new module.
- Current plan, current state, Recent Work closeout, and closeout handoff all name `strategy-shared-comms-routes-split-v1`.
- Full Foundation ship gate passes after dashboard and worker restart.

## Details

Reuse the existing registrar pattern from `lib/auth-routes.js`, `lib/foundation-runtime-read-routes.js`, and `lib/hub-read-routes.js`. The new module accepts dependencies from `server.js`; it does not create a new Express app, auth layer, database access layer, or router framework.

The route split is behavior-preserving. The Strategy Hub v2 fallback snapshot behavior, shared communication candidate apply behavior, action-route review behavior, Foundation action-review behavior, no-store headers, and error codes should remain unchanged.

The proof script is read-only except for safe invalid POST probes that must fail before mutation. It must not apply shared communications candidates, approve real action routes, create backlog cards, create decisions, create questions, or mutate sprint/backlog state.

The focused proof must stay fast enough to run by default: target under two minutes for `process:strategy-shared-comms-routes-split-check`, with route probe budgets of 15 seconds and 2 MB per moved read surface. Full ship still runs because this changes `server.js`, verifier coverage, package scripts, and closeout truth.

## Risks

- Risk: moving shared candidate apply routes could accidentally change write behavior.
  - Repair path: keep the handlers byte-for-byte equivalent where practical and prove guarded invalid POSTs fail before mutation.
- Risk: verifier checks still look only in `server.js` and false-fail after the split.
  - Repair path: update verifier ownership checks to read a combined route-source string for this domain.
- Risk: this card drifts into direct Foundation write-route extraction.
  - Repair path: direct `/api/foundation/backlog`, `/api/foundation/decisions`, `/api/foundation/questions`, and doc-update write routes remain in `server.js` for `FOUNDATION-WRITE-ROUTES-SPLIT-001`.

## Tests

```bash
node --check lib/strategy-shared-comms-routes.js scripts/process-strategy-shared-comms-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:strategy-shared-comms-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001.json --closeoutKey=strategy-shared-comms-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 --closeoutKey=strategy-shared-comms-routes-split-v1
npm run process:foundation-ship -- --card=STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001.json --closeoutKey=strategy-shared-comms-routes-split-v1 --commitRef=HEAD
```

## Not Next

- No hub UI changes.
- No Marketing Video Lab wiring.
- No paid-source auth or Build Intel extraction.
- No direct Foundation write route extraction.
- No direct Foundation backlog/decision/question/doc-update route extraction.
- No Sales route movement.
- No Agent Feedback route movement.
- No `/api/intelligence/evidence` movement.
- No broad server rewrite.
