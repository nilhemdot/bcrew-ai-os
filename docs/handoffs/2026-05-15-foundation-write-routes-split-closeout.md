# Foundation Write Routes Split Closeout - 2026-05-15

## Summary

`FOUNDATION-WRITE-ROUTES-SPLIT-001` is closed under `foundation-write-routes-split-v1`.

Commit subject for Recent Builds matching: `Split Foundation write routes`.

## What Changed

- Extracted direct Foundation mutation routes from `server.js` into `lib/foundation-write-routes.js`.
- `server.js` now delegates through `registerFoundationWriteRoutes(app, deps)`.
- Moved routes:
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
- Left Sales routes, Agent Feedback routes, Intelligence evidence routes, Strategy/shared-comms routes, hub read routes, and app page routes in their existing owners.

## Why It Matters

This finishes the highest-risk server split in the sprint: Foundation write routes are now isolated in one module with focused write-boundary proof. `server.js` drops below the 5,000-line architecture-risk threshold for the first time in this cleanup run.

## Proof

Focused proof:

```bash
npm run process:foundation-write-routes-split-check -- --json
```

Result:

- `ok: true`
- `server.js`: `5447 -> 4928` lines
- dogfood rejects:
  - missing module
  - old inline server ownership
  - missing registrar
  - moved out-of-scope routes
  - weak proof without safe invalid write probes
- safe invalid write probes returned expected `400` / `404` errors before mutation.
- live row-count fingerprints were unchanged:
  - `backlog_items`: `493 -> 493`
  - `decisions`: `7 -> 7`
  - `foundation_job_controls`: `2 -> 2`
  - `open_questions`: `5 -> 5`
  - `pending_doc_updates`: `0 -> 0`

Full ship proof to run before push:

```bash
node --check lib/foundation-write-routes.js scripts/process-foundation-write-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-write-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-WRITE-ROUTES-SPLIT-001.json --closeoutKey=foundation-write-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --closeoutKey=foundation-write-routes-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-WRITE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-WRITE-ROUTES-SPLIT-001.json --closeoutKey=foundation-write-routes-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not move Sales routes.
- This does not move Agent Feedback routes.
- This does not wire Marketing Video Lab live routes.
- This does not redesign Foundation write semantics.
- This does not split the remaining `scripts/foundation-verify.mjs` or `lib/foundation-db.js` monoliths.

## Next

Continue Server Monolith Closeout with `AGENT-FEEDBACK-ROUTES-SPLIT-001` if Steve remains unavailable. Otherwise stop for sprint review.
