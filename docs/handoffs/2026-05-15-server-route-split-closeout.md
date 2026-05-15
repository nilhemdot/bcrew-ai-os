# Foundation Server Route Split Closeout - 2026-05-15

Closeout key: `server-route-split-v1`
Sprint ID: `server-route-split-2026-05-15`
Card: `SERVER-ROUTE-SPLIT-001`

## What Shipped

Foundation operator read routes now live in a named route module:

```text
lib/foundation-operator-routes.js
```

V1 moved this bounded route cluster out of `server.js`:

- `GET /api/foundation/changes`
- `GET /api/foundation/change-log`
- `GET /api/foundation/daily-summary`
- `GET /api/foundation/build-log`
- `GET /api/foundation/backlog/:cardId`
- `GET /api/foundation/doc-updates`

`server.js` now delegates the cluster through `registerFoundationOperatorRoutes(app, deps)`. The moved routes keep the existing admin gate, no-store cache behavior where already present, error handling, query limits, and payload shape.

## Why It Matters

`server.js` was still absorbing Foundation route responsibility even after the first performance and payload cleanup passes. This split makes the operator route cluster easier to inspect, test, and change without pushing more responsibility into a 7,000+ line server file.

This is cleanup, not a feature. It reduces future blast radius for Foundation route work and dogfoods the rule that files over 5,000 lines need extraction plans instead of more inline additions.

## Files Changed

- `lib/foundation-operator-routes.js`
- `server.js`
- `scripts/process-server-route-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `lib/foundation-change-log.js`
- `lib/foundation-daily-exec-summary.js`
- `package.json`
- `docs/process/server-route-split-001-plan.md`
- `docs/process/approvals/SERVER-ROUTE-SPLIT-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-overnight-records.js`

## Proof

Focused proof:

```text
npm run process:server-route-split-check -- --json
```

Key measured output:

- `/api/foundation/changes?limit=1`: `31ms`, `3,417B`
- `/api/foundation/change-log?limit=1`: `198ms`, `19,162B`
- `/api/foundation/daily-summary?days=1`: `350ms`, `3,042B`
- `/api/foundation/build-log?limit=1`: `12ms`, `9,856B`
- `/api/foundation/doc-updates`: `1ms`, `17B`
- `/api/foundation/backlog/FOUNDATION-HUB-BACKLOG-CONTRACT-001`: `2ms`, `2,089B`
- Missing valid backlog card still returns `404`.
- Malformed backlog card ID still returns `400`.
- The focused proof script is read-only.
- The old inline route markers are absent from `server.js`.

Full closeout proof:

```text
node --check lib/foundation-operator-routes.js lib/foundation-change-log.js lib/foundation-daily-exec-summary.js scripts/process-server-route-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:server-route-split-check -- --json
npm run process:change-log-comprehensive-check
npm run process:daily-exec-summary-check
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SERVER-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/SERVER-ROUTE-SPLIT-001.json --closeoutKey=server-route-split-v1 --commitRef=HEAD
```

## Not Shipped

- No full `server.js` route split.
- No auth/session route changes.
- No Marketing Video Lab live route wiring.
- No hub feature work.
- No paid-source auth or Build Intel extraction.
- No broad Foundation frontend rewrite.

## Known Limits

The split reduced `server.js` from `7,819` to `7,687` lines, but `server.js` remains over the 5,000-line refactor threshold. Other monoliths also remain: `scripts/foundation-verify.mjs`, `public/foundation.js`, and `lib/foundation-db.js`.

## Next

Continue no-auth Foundation cleanup. Good next candidates:

- split another measured `server.js` route cluster
- split another verifier module
- split the next clean `lib/foundation-db.js` boundary
- switch a small Foundation UI consumer to the single-card backlog detail endpoint if it still pulls full diagnostics for expansion
