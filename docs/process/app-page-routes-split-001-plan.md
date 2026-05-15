# APP-PAGE-ROUTES-SPLIT-001 Plan

## What

Extract the app page and fallback route cluster from `server.js` into `lib/app-page-routes.js`:

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

`server.js` will keep the Strategy PDF export route in place and delegate page/fallback routes through `registerAppPageRoutes(app, deps)`.

This is a narrow server monolith split. It does not change page access roles, auth, PDF export behavior, hub behavior, API route payloads, or business logic.

## Why

Steve asked for Foundation to keep getting tighter without spending the whole night on risky feature work. The useful operator behavior is that Steve, Sales, Ops, Strategy, docs, and Agent Feedback entry pages keep loading exactly as before while the server route owner gets smaller and easier to review. This directly protects a real workflow and product behavior: if catch-all ordering, page access, or API 404 fallback breaks, Steve feels it immediately as "the app is broken." The slice unlocks cleaner future route work with speed and quality because the focused proof checks those exact operator entry points, not just file strings.

`server.js` is still over 6,700 lines, and page/fallback route registration is bounded, low-risk, and easy to prove with live HTTP probes. Moving it out reduces review load for future server work while preserving the exact pages Steve and the team use.

Existing work reused:

- Existing code: `requirePageAccess()`, `getRequestAuthUser()`, `getLocalDevUser()`, `sendApiError()`, `path.join()`, and the existing public HTML files.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, prior server route split closeouts, and AGENTS.md Foundation rebuild discipline.
- Existing scripts: prior route split focused proof patterns, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Existing policy: Plan Critic architecture rules, dogfood proof, no broad server rewrite, and no verifier/check live-state mutation.

## Acceptance Criteria

- `APP-PAGE-ROUTES-SPLIT-001` is closed under `app-page-routes-split-v1`.
- `lib/app-page-routes.js` exports `registerAppPageRoutes(app, deps)` and owns the page/fallback route strings.
- `server.js` delegates through `registerAppPageRoutes(app, deps)` and no longer owns the moved inline page/fallback route handlers.
- The Strategy PDF export route stays in `server.js`:
  - `GET /foundation/export/strategy.pdf`
- Dogfood proof rejects missing module, old inline server page route, missing registrar, and missing API 404 fallback.
- Focused proof probes the moved routes with live GET requests and validates expected status/content class.
- `server.js` line count decreases.
- For server.js route or API work, the plan includes a performance budget: each moved page/fallback route probe must complete under 5 seconds and return under 1 MB.

## Definition Of Done

- The live backlog card is `done`, the Current Sprint item is `done_this_sprint`, and Recent Builds exposes `app-page-routes-split-v1`.
- Plan approval validates at 9.8+ and the durable Plan Critic row passes with architecture rules enabled.
- Focused proof command passes:

```bash
npm run process:app-page-routes-split-check -- --json
```

- Full proof commands pass:

```bash
node --check lib/app-page-routes.js scripts/process-app-page-routes-split-check.mjs server.js scripts/foundation-verify.mjs
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=APP-PAGE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/APP-PAGE-ROUTES-SPLIT-001.json --closeoutKey=app-page-routes-split-v1 --commitRef=HEAD
```

## Details

Implementation:

1. Add `lib/app-page-routes.js`.
2. Move the page/fallback route handlers into `registerAppPageRoutes(app, deps)`.
3. Inject `requirePageAccess`, `sendApiError`, `getRequestAuthUser`, `getLocalDevUser`, and `publicDir` from `server.js`.
4. Keep `GET /foundation/export/strategy.pdf` in `server.js`.
5. Register the new module at the same location where the page/fallback route cluster currently lives, after API routes and before startup.
6. Add `scripts/process-app-page-routes-split-check.mjs`.
7. Add package script `process:app-page-routes-split-check`.
8. Add verifier/Recent Builds/current-plan/current-state coverage.

Route budgets:

- Each moved route probe must complete under 5 seconds.
- Each moved route probe must return under 1 MB.
- The focused proof records status, `durationMs`, bytes, and content type for each route.
- Focused proof target: under 30 seconds.
- Focused proof must stay fast and under 1 minute so it can run by default during server cleanup.
- Full ship target: under the existing 300 second Foundation ship budget.

Gate decision tree:

- Static checks are required for syntax.
- Focused route proof is required because this changes route ownership and catch-all ordering.
- Full `foundation:verify` and `process:foundation-ship` are required because `server.js`, package scripts, verifier coverage, docs, and closeout records are affected.
- For `scripts/process-app-page-routes-split-check.mjs` and `scripts/foundation-verify.mjs`, any live write path is read-only by default and requires explicit `--apply` posture. This slice adds no live write path.

## Risks

- Risk: catch-all ordering changes and swallows API 404 behavior. Repair path: focused proof fails unless `/api/definitely-missing-app-page-route` still returns JSON 404.
- Risk: page access roles change. Repair path: route registration keeps the same `requirePageAccess()` calls and focused proof checks the moved route strings.
- Risk: Strategy PDF export is accidentally moved. Repair path: dogfood and verifier require `.pdf` to remain in `server.js`.
- Risk: the slice grows into page redesign or hub feature work. Repair path: stop at route registration and backlog anything else.

## Tests

```bash
node --check lib/app-page-routes.js scripts/process-app-page-routes-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:app-page-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=APP-PAGE-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/APP-PAGE-ROUTES-SPLIT-001.json --closeoutKey=app-page-routes-split-v1 --commitRef=HEAD
```

## Not Next

- Do not move or change `GET /foundation/export/strategy.pdf`.
- Do not change auth/session behavior.
- Do not redesign `/foundation`, `/sales`, `/ops`, Strategy, docs, or Agent Feedback UI.
- Do not wire Marketing Video Lab or any hub feature.
- Do not add source extraction, paid-source auth, or Build Intel extraction.
- Do not mutate Google Drive permissions, run `MEETING-VAULT-ACL-001 Phase B`, or send request-access emails.
- Do not start a broad `server.js` rewrite.
