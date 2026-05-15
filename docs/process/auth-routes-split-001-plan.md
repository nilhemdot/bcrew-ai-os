# AUTH-ROUTES-SPLIT-001 Plan

## What

Extract the auth/session setup route cluster from `server.js` into `lib/auth-routes.js`.

V1 moves only the existing registration responsibility:

- security headers middleware,
- API request logging middleware,
- JSON body parser setup,
- request access-context attachment middleware,
- `GET /login`,
- `POST /api/auth/login`,
- `POST /api/auth/google`,
- `GET /api/auth/session`,
- `POST /api/auth/logout`,
- direct `.html` route redirects,
- static public asset middleware.

Behavior stays the same. `server.js` becomes a thin wrapper that calls `registerAuthRoutes(app, deps)`.

## Why

`server.js` remains above the 5,000-line architecture-risk line and still owns high-blast-radius auth/session setup inline. Auth is not a place to do casual cleanup. A narrow route-registration split reduces server risk while preserving login/session behavior.

This unlocks useful operator behavior for Steve and the team: Foundation and hub pages keep loading the same way, login/session posture is proven, and future auth changes have one named owner instead of hiding in the server monolith.

## Acceptance Criteria

- New module `lib/auth-routes.js` registers the bounded auth/session/static route cluster.
- `server.js` imports `registerAuthRoutes` and delegates the cluster through a thin wrapper only.
- Auth provider behavior, cookie behavior, Google token behavior, redirect behavior, local-dev session behavior, and static asset behavior remain unchanged.
- Focused proof calls live routes for `/login`, `/api/auth/session`, `/api/auth/logout`, `/api/auth/login`, direct HTML redirects, and a static asset.
- Focused proof dogfoods the old failure mode by proving the moved route handlers no longer live inline in `server.js`.
- Reject substring-only proof. Source-marker checks are supplemental only; live route behavior must pass.
- Route budget: moved auth/session/static probes must return under 2 seconds each and under 1MB each.
- Current Sprint, live backlog, Plan Critic run, approval, closeout, and verifier coverage all name this card and closeout key.

## Definition Of Done

- `AUTH-ROUTES-SPLIT-001` is live in backlog and closed under `auth-routes-split-v1`.
- `docs/process/auth-routes-split-001-plan.md` and `docs/process/approvals/AUTH-ROUTES-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+.
- `lib/auth-routes.js` owns the extracted route cluster.
- `scripts/process-auth-routes-split-check.mjs` passes and proves live route behavior plus the split boundary.
- `server.js` line count decreases and does not gain new auth business logic.
- Full `process:foundation-ship` passes before push.

## Details

Existing code to reuse:

- current auth/session route bodies in `server.js`
- `lib/app-auth.js`
- `sendApiError`
- `attachRequestAccessContext`
- `getRequestAuthUser`
- `getLocalDevUser`
- existing direct HTML redirect map
- existing public static asset setup

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `AGENTS.md`, and prior route split plans including `docs/process/app-page-routes-split-001-plan.md`.

Existing scripts to reuse: route split proof patterns from `scripts/process-app-page-routes-split-check.mjs`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Live backlog and Current Sprint truth to reuse: `AUTH-ROUTES-SPLIT-001` is the active blocker after `NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001` closed. The proof reads live backlog, Current Sprint, and Plan Critic rows before accepting the split.

Behavior proof is not substring-only proof. The focused proof calls real HTTP routes, performs an actual route behavior round-trip, checks response status/content/cache/cookie posture, and then uses source checks only as a boundary assertion. A string marker without route behavior is weak evidence and must fail closed.

Gate decision tree: this is a full-risk Foundation runtime change because it touches `server.js`, auth/session route registration, static serving order, package scripts, verifier coverage, closeout records, and Current Sprint truth. Static syntax checks and a focused proof run first. Full `process:foundation-ship` is required before push.

Speed target: focused proof stays thin and fast, under 2 minutes, so auth route safety can be checked without waiting for the full ship gate every edit.

## Risks

- Risk: middleware order changes and breaks auth/static/page behavior.
  - Response: keep the registrar call in the exact original location and live-probe `/login`, `/api/auth/session`, direct HTML redirects, and a static file.
- Risk: Google auth behavior changes.
  - Response: move the existing token verification logic unchanged; do not replace providers or change allowed-user rules.
- Risk: local-dev session behavior changes.
  - Response: focused proof checks `/api/auth/session` on local server still returns a usable local-dev session posture.
- Risk: proof becomes substring theater.
  - Response: live HTTP route probes are required, and source checks cannot pass without route behavior.
- Risk: full ship gate fails after the focused proof passes.
  - Repair path: leave the card in Building Now, fix the failing boundary, rerun focused proof, then rerun full `process:foundation-ship`.

## Tests

```bash
node --check lib/auth-routes.js scripts/process-auth-routes-split-check.mjs server.js
npm run process:auth-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=AUTH-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AUTH-ROUTES-SPLIT-001.json --closeoutKey=auth-routes-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by checking the old inline auth/session route cluster in `server.js` is gone while live auth/session/static routes remain healthy. Substring-only proof is rejected: the focused proof calls actual routes and fails closed if the route calls do not pass.

## Not Next

- Do not rewrite auth providers.
- Do not change session secret, cookie semantics, Google OAuth configuration, allowed users, or route access policy.
- Do not wire Marketing Video Lab live routes.
- Do not build hub UI or Sales/Ops/Marketing features.
- Do not split every server route in this card.
- Do not change Foundation write routes, shared communications routes, or Agent Feedback behavior.
