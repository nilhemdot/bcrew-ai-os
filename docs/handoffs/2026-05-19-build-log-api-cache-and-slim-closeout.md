# BUILD-LOG-API-CACHE-AND-SLIM-001 Closeout

Date: 2026-05-19
Card: `BUILD-LOG-API-CACHE-AND-SLIM-001`
Closeout key: `build-log-api-cache-and-slim-v1`

## What Shipped

- Added a bounded Build Log API cache/slim payload helper.
- Updated `/api/foundation/build-log` to build payloads through the cache helper instead of inlining the response shape in the route.
- Slimmed grouped Build Log payloads by emitting `buildRefs` in `groups` and keeping full build objects only in the top-level `builds` list.
- Updated Recent Work rendering to resolve `buildRefs` through a top-level build index while preserving compatibility with older `systemGroup.builds` payloads.
- Updated the nightly code-quality audit so it stops proposing `BUILD-LOG-API-CACHE-AND-SLIM-001` only when the cache/slim proof passes.
- Updated the May 19 deep-audit route for `build-log-request-time-git-and-duplication` from scoped to done with this closeout key.
- Closed the card and advanced Current Sprint to `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`.

## Proof

- `node --check lib/foundation-build-log-api-cache.js scripts/process-build-log-api-cache-and-slim-check.mjs`
- `npm run process:build-log-api-cache-and-slim-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `curl -fsS "http://localhost:3000/api/foundation/build-log?limit=60"`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=BUILD-LOG-API-CACHE-AND-SLIM-001 --planApprovalRef=docs/process/approvals/BUILD-LOG-API-CACHE-AND-SLIM-001.json --closeoutKey=build-log-api-cache-and-slim-v1 --commitRef=HEAD`

## Key Result

The Build Log API still returns the same top-level build data needed by existing consumers, but grouped Recent Work data references those builds by key instead of duplicating full build records. Repeated route reads are bounded by a short process-local cache, and the response exposes cache metadata for operator/debug visibility.

The old failure mode is now dogfooded:

- no-cache inline route payload fails
- missing frontend `buildRefs` resolver fails
- missing cache/slim helper proof fails
- duplicated `systemGroup.builds`-only payload shape is no longer the required API shape

## Not Shipped

- No Recent Work redesign.
- No Daily Summary redesign.
- No build-log closeout history rewrite.
- No source/value expansion.
- No private/provider/Drive permission/credential mutation.

## Next

Continue `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`.
