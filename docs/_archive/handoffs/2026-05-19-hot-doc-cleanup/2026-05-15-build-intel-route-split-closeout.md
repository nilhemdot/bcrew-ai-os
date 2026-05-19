# Foundation Build Intel Route Split Closeout - 2026-05-15

Closeout key: `build-intel-route-split-v1`  
Sprint ID: `build-intel-route-split-2026-05-15`  
Card: `BUILD-INTEL-ROUTE-SPLIT-001`

## What Shipped

Foundation Build Intel read routes now live in a named route module:

```text
lib/foundation-build-intel-routes.js
```

V1 moved this bounded route cluster out of `server.js`:

- `GET /api/foundation/build-intel-watchlist`
- `GET /api/foundation/multimodal-extractor-contract`
- `GET /api/foundation/research-inbox-contract`
- `GET /api/foundation/control-compression`
- `GET /api/foundation/implementation-intelligence`
- `GET /api/foundation/build-intel-extraction`
- `GET /api/foundation/gstack-build-intel`

`server.js` now delegates the cluster through `registerFoundationBuildIntelRoutes(app, deps)`. The moved routes keep existing admin gating, error handling, payload shapes, and query behavior.

## Why It Matters

`server.js` remains over the 5,000-line architecture threshold. Build Intel already had clear backend modules, but the read endpoints that expose those modules were still inline in the server monolith.

This split keeps Build Intel visibility maintainable without opening the whole server file. Future changes to builder watchlists, Research Inbox contracts, implementation intelligence, or GStack Build Intel can be reviewed in one route module instead of being mixed with auth, hub, and runtime routes.

## Files Changed

- `lib/foundation-build-intel-routes.js`
- `server.js`
- `scripts/process-build-intel-route-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `lib/foundation-build-closeout-overnight-records.js`
- `docs/process/build-intel-route-split-001-plan.md`
- `docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Focused proof:

```text
npm run process:build-intel-route-split-check -- --json
```

Measured route output:

- `/api/foundation/build-intel-watchlist`: `26ms`, `20,021B`
- `/api/foundation/multimodal-extractor-contract`: `3ms`, `1,345B`
- `/api/foundation/research-inbox-contract`: `1ms`, `711B`
- `/api/foundation/control-compression`: `363ms`, `32,704B`
- `/api/foundation/implementation-intelligence`: `339ms`, `73,968B`
- `/api/foundation/build-intel-extraction`: `314ms`, `22,329B`
- `/api/foundation/gstack-build-intel`: `26ms`, `33,955B`

The focused proof also proves:

- all moved live routes return success
- every moved route stays under the 5s / 2.5 MB route budget
- expected payload shapes remain compatible
- the old inline route markers are absent from `server.js`
- the focused proof script is read-only

Full closeout proof:

```text
node --check lib/foundation-build-intel-routes.js scripts/process-build-intel-route-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:build-intel-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-INTEL-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json --closeoutKey=build-intel-route-split-v1 --commitRef=HEAD
```

## Not Shipped

- No full `server.js` route split.
- No auth/session route changes.
- No write-route movement.
- No Marketing Video Lab live route wiring.
- No hub feature work.
- No new Build Intel extraction, YouTube crawl, paid-source auth, atoms, screenshots, OCR, or Research Inbox mutation.
- No Meeting Vault Phase B or Drive permission mutation.

## Known Limits

The split reduced the server route monolith but did not solve the remaining large files:

- `server.js` remains over 5,000 lines.
- `scripts/foundation-verify.mjs` remains a verifier monolith.
- `public/foundation.js` remains a frontend monolith.
- `lib/foundation-db.js` remains a database/store monolith.

## Next

Continue no-auth Foundation cleanup. Good next candidates:

- split another measured `server.js` route cluster
- carve another verifier module
- split a small `lib/foundation-db.js` store boundary
- reduce `public/foundation.js` by extracting one UI controller
