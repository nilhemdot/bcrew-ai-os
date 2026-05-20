# FOUNDATION-USERS-001 Plan

## What

Build a tight owner-only Foundation user access panel so Steve can manage AIOS users without editing `.env`.

V1 scope:

- DB-backed list/add/update/disable for rows in `users`.
- Visible role, tier, user type, meeting-sync flag, Google-login eligibility, password-fallback presence, and recent audit events.
- Runtime auth sync from active DB human users into the existing allow-list, preserving existing default/env auth users.
- Owner-only API routes and Foundation UI page at `#user-access`.
- Password-fallback hashes are accepted and stored, but never returned to browser/API output.

Not next:

- No external sends, emails, public posts, provider calls, credential rotation, Drive permission changes, or public exposure changes.
- No broad auth/tier redesign, subject-person redaction work, shared-comms opening, Strategy/People surface expansion, or role-assistant launch.
- No destructive delete path.
- No raw password or hash display.

## Why

Steve needs a useful operator behavior: add or disable an AIOS user, set their role/tier, see whether Google login/password fallback is available, and audit who changed access. The current state hides too much in `.env`, defaults, and DB metadata, which is not good enough before Strategy, People, or role assistants expand.

## Acceptance Criteria

- Owner-only `GET /api/foundation/users/admin` returns users, login-method posture, and recent access audit events.
- Owner-only `POST /api/foundation/users/admin` can add/update a user with role/tier and optional password fallback.
- Owner-only `PATCH /api/foundation/users/admin/:email` can soft-disable or re-enable a user.
- Non-owner access to these routes fails closed through `lib/security-access.js`.
- Active DB human users can be loaded into the auth runtime allow-list without removing existing default/env users.
- API/UI output does not contain raw passwords or password hashes.
- A synthetic local proof user can be created and disabled with audit events.
- Foundation UI exposes the panel through `#user-access`.

## Definition Of Done

- Focused proof is healthy.
- Synthetic add/disable audit proof is recorded locally.
- Backlog card is closed with `foundation-users-v1`.
- Current Sprint advances to `DECISION-007`.
- System Health is healthy.
- Repeated-failure gate is healthy.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- main is clean and pushed.

## Details

Existing work reused:

- `users` table and `change_events` ledger.
- `lib/app-auth.js` session cookie, password hashing, Google login allow-list behavior, and default users.
- `lib/auth-routes.js` auth route registration.
- `lib/security-access.js` route posture and owner-tier authorization.
- Foundation dashboard renderer patterns and `foundationRead` admin-token forwarding.
- `SECURITY-002` route/tier doctrine remains the broader security boundary.

Implementation shape:

- `lib/foundation-user-admin.js` owns validation, snapshot shaping, login-method posture, mutation helpers, and dogfood proof.
- `users.metadata.role` stores the role because the current `users` table has no role column.
- `users.metadata.auth.passwordHash` stores optional password fallback; API/UI only expose enabled/not-set state.
- `lib/auth-routes.js` refreshes DB-backed runtime auth users before session checks.
- `lib/foundation-source-routes.js` exposes owner-only list/upsert/update routes.
- `public/foundation-users-renderers.js` renders the operator panel.

Behavior proof must use function/API/process paths, not just substring checks:

- `buildFoundationUsersDogfoodProof()` proves snapshots hide hashes and validation rejects bad roles.
- `authorizeRouteAccess()` proves a non-owner cannot mutate user access.
- `--close-card` creates and disables a synthetic proof user and checks it is disabled in live DB truth.

## Risks

- Auth work can drift into broad security redesign.
  - Repair path: keep V1 route-local and owner-only; broader SECURITY-002 work stays separate.
- Password fallback can leak secret material.
  - Repair path: fail proof if hash-like values appear in snapshot/API shape.
- DB runtime auth sync could accidentally remove default/env users.
  - Repair path: merge runtime users on top of default/env users instead of replacing them.
- User mutation can become destructive.
  - Repair path: only soft-disable; no delete endpoint.
- Route exposure can broaden access.
  - Repair path: explicit owner-only posture and non-owner dogfood.

## Tests

Gate decision tree: static checks are not enough for auth/user access. The card uses focused proof first, then full `foundation:verify` and `process:foundation-ship` because the blast radius touches auth/runtime access, Foundation API routes, UI, schema constraint, and verifier truth.

Commands:

- `node --check lib/foundation-user-admin.js lib/app-auth.js lib/auth-routes.js lib/foundation-source-routes.js public/foundation-users-renderers.js scripts/process-foundation-users-check.mjs`
- `npm run process:foundation-users-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-USERS-001 --planApprovalRef=docs/process/approvals/FOUNDATION-USERS-001.json --closeoutKey=foundation-users-v1 --commitRef=HEAD`

Speed budget: focused proof should be fast and stay under 2 minutes so it can run by default; full gates run only at closeout/ship.
