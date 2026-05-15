# App Page Routes Split Closeout - 2026-05-15

Card: `APP-PAGE-ROUTES-SPLIT-001`
Closeout key: `app-page-routes-split-v1`
Sprint: `app-page-routes-split-2026-05-15`
Status: closing under Foundation ship gate

## What Changed

Extracted the app page and fallback route cluster from `server.js` into `lib/app-page-routes.js`:

- `GET /doc`
- `GET /foundation`
- `GET /foundation/export/strategy`
- `GET /strategic-execution`
- `GET /sales`
- `GET /ops`
- `GET /agent-feedback`
- `app.use('/api', ...)` API 404 fallback
- `GET /`
- `GET *`

`server.js` now delegates through `registerAppPageRoutes(app, deps)`. The Strategy PDF export route remains in `server.js`:

- `GET /foundation/export/strategy.pdf`

## Why It Matters

This keeps the operator and hub entry pages loading while reducing the server monolith. The slice is deliberately no-auth and no-feature: it moves page route ownership, proves page/API fallback shape and route budgets, and avoids Marketing Video Lab, hub UI, source extraction, auth, or PDF export behavior changes.

## Dogfood Proof

The focused proof recreates the route-split failure modes and rejects them:

- missing app page route module
- old inline server page route remaining in `server.js`
- missing registrar call from `server.js`
- missing API 404 fallback
- moved Strategy PDF export route

Latest focused route measurements:

- `/doc`: HTTP 200, `28ms`, `1,556B`, HTML
- `/foundation`: HTTP 200, `2ms`, `7,685B`, HTML
- `/foundation/export/strategy`: HTTP 200, `2ms`, `773B`, HTML
- `/strategic-execution`: HTTP 200, `1ms`, `2,726B`, HTML
- `/sales`: HTTP 200, `1ms`, `2,478B`, HTML
- `/ops`: HTTP 200, `2ms`, `2,976B`, HTML
- `/agent-feedback`: HTTP 200, `1ms`, `1,351B`, HTML
- `/`: HTTP 200, `1ms`, `5,243B`, HTML
- `/definitely-missing-app-page-route`: HTTP 200, `1ms`, `5,243B`, HTML fallback
- `/api/definitely-missing-app-page-route`: HTTP 404, `1ms`, `70B`, JSON fallback

`server.js` line count dropped from `6,779` to `6,734` lines for this slice.

## Proof Commands

```bash
node --check lib/app-page-routes.js scripts/process-app-page-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:app-page-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=APP-PAGE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/APP-PAGE-ROUTES-SPLIT-001.json --closeoutKey=app-page-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=APP-PAGE-ROUTES-SPLIT-001 --closeoutKey=app-page-routes-split-v1
npm run process:foundation-ship -- --card=APP-PAGE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/APP-PAGE-ROUTES-SPLIT-001.json --closeoutKey=app-page-routes-split-v1 --commitRef=HEAD
```

## Not Done

- This does not move or change `GET /foundation/export/strategy.pdf`.
- This does not change auth/session behavior.
- This does not redesign `/foundation`, `/sales`, `/ops`, Strategy, docs, or Agent Feedback UI.
- This does not wire Marketing Video Lab or any hub feature.
- This does not add source extraction, paid-source auth, or Build Intel extraction.
- This does not mutate Google Drive permissions or run `MEETING-VAULT-ACL-001 Phase B`.
- This does not finish the remaining `server.js`, `scripts/foundation-verify.mjs`, or `lib/foundation-db.js` monolith cleanup.

## Next

Stop at sprint review unless Steve remains unavailable. If continuing overnight, only take another bounded no-auth Foundation cleanup card with a fresh plan, Plan Critic pass, and dogfood proof.
