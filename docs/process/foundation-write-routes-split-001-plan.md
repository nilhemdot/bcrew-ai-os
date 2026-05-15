# FOUNDATION-WRITE-ROUTES-SPLIT-001 Plan

## Card

`FOUNDATION-WRITE-ROUTES-SPLIT-001` - Split Foundation write routes out of `server.js` with write-boundary proof.

## Goal

Extract the bounded Foundation write route cluster from `server.js` into `lib/foundation-write-routes.js`:

- `POST /api/foundation/jobs/:jobKey/control`
- `POST /api/foundation/job-runs/:runId/stop`
- `POST /api/foundation/jobs/:jobKey/decommission`
- `POST /api/foundation/backlog`
- `PATCH /api/foundation/backlog/:id`
- `POST /api/foundation/decisions`
- `PATCH /api/foundation/decisions/:id`
- `POST /api/foundation/questions`
- `PATCH /api/foundation/questions/:id`
- `POST /api/foundation/doc-updates`
- `POST /api/foundation/doc-updates/:id/approve`
- `POST /api/foundation/doc-updates/:id/reject`
- `POST /api/foundation/doc-updates/:id/apply`

Behavior stays unchanged. `server.js` becomes a thin registrar call. This is a monolith split and write-boundary proof card, not a Foundation feature card.

## Existing Work Check

Existing code to reuse: the current inline route bodies in `server.js`, `sendApiError`, `requireAdminToken`, `getRequestActor`, field validators, doc helpers, runtime process control helpers, Foundation DB write helpers, and prior registrar modules.

Existing docs to reuse: `docs/process/auth-routes-split-001-plan.md`, `docs/process/hub-read-routes-split-001-plan.md`, `docs/process/strategy-shared-comms-routes-split-001-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.

Existing scripts to reuse: previous route split focused proof shape, `backlog:hygiene`, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

Existing policy: write paths are higher risk than read paths. Proof must use safe invalid writes that fail before mutation, not live creates/updates.

## Acceptance

- `lib/foundation-write-routes.js` owns all moved Foundation write route strings.
- `server.js` delegates through `registerFoundationWriteRoutes(app, deps)` and no longer owns the moved route handlers inline.
- Sales routes, Agent Feedback routes, Strategy/shared-comms routes, read-only hub routes, and app page routes stay in their current owners.
- Focused proof live-probes safe invalid write paths and proves they fail before mutation: invalid backlog create/update, invalid decision create/update, invalid question create/update, invalid doc update create, missing doc-update approve/reject/apply, job-control decommission misuse, missing job-run stop, and missing job decommission.
- Dogfood proof rejects missing module, old inline server ownership, missing registrar, weak proof, missing safe invalid POST/PATCH probes, and accidental movement of Sales or Agent Feedback routes.
- `server.js` line count decreases from the pre-card baseline of about `5,447` and targets under `5,000`.
- Current Sprint, live backlog, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name this card and `foundation-write-routes-split-v1`.

## Gate Decision

This is a full-risk Foundation runtime change because it moves live mutation routes and touches `server.js`, a new route module, focused proof, package scripts, canonical verifier coverage, closeout records, and rebuild docs.

Run:

```bash
node --check lib/foundation-write-routes.js scripts/process-foundation-write-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-write-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-WRITE-ROUTES-SPLIT-001.json --closeoutKey=foundation-write-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --closeoutKey=foundation-write-routes-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-WRITE-ROUTES-SPLIT-001.json --closeoutKey=foundation-write-routes-split-v1 --commitRef=HEAD
```

## Risks

- Risk: moving mutation routes changes access posture.
  - Response: keep `requireAdminToken` on every moved route and dogfood safe invalid write calls.
- Risk: focused proof mutates live state.
  - Response: proof only calls invalid/missing-resource paths that return `400`, `404`, or `409` before approved helper mutations.
- Risk: doc-update apply path is especially dangerous because it writes files and commits.
  - Response: do not call a valid apply. Probe only missing/invalid paths and keep route body unchanged.
- Risk: route split hides old Strategy proof assumptions.
  - Response: update verifier ownership checks so previous Strategy split remains true while the new Foundation write module owns moved writes.

## Not Next

- No Sales route movement.
- No Agent Feedback route movement.
- No Marketing Video Lab route wiring.
- No hub UI work.
- No source extraction or paid-source auth.
- No doc-update behavior redesign.
- No broad server rewrite beyond this route cluster.
