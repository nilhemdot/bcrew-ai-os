# BUILD-LOG-API-CACHE-AND-SLIM-001 Plan

## What

Close the P2 deep-audit finding that the Foundation Build Log API shells out to git on every request and returns duplicated build objects in both `groups` and `builds`.

Closeout key: `build-log-api-cache-and-slim-v1`.

This is a tight API/renderer repair. It keeps the existing Build Log route and Recent Work UI behavior, but makes the route use a bounded process-local cache and makes grouped payloads reference top-level builds by key.

Not next:

- Do not redesign Recent Work or Daily Summary.
- Do not rewrite the build-log closeout registry or static closeout history.
- Do not remove the top-level `builds` list needed by existing consumers.
- Do not change git history, backlog data, source data, Drive permissions, credentials, providers, or private extraction.
- Do not start Value Builder or source/value expansion before the audit-control cleanup queue is done.

## Why

Steve asked for audit findings to become real fixes. The May 19 deep audit called out request-time git work and duplicate serialized payloads as growing operator drag. Recent Work is a command surface, so it should not pay unbounded history/enrichment cost on every browser refresh or return the same build objects twice.

## Definition Of Done

- `/api/foundation/build-log` delegates payload building through a bounded cache helper.
- The helper normalizes limits, caches recent build-log reads for a short TTL, and emits slim `groups[].systemGroups[].buildRefs`.
- `public/foundation-operations-renderers.js` resolves `buildRefs` through the top-level `builds` list while preserving compatibility with older `systemGroup.builds` payloads.
- The nightly code-quality audit no longer proposes `BUILD-LOG-API-CACHE-AND-SLIM-001` when cache/slim proof passes.
- The old failure mode is dogfooded: inline route payloads without cache, duplicated group builds, or missing frontend ref resolution fail closed.
- `BUILD-LOG-API-CACHE-AND-SLIM-001` closes and Current Sprint advances to `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`.

## Acceptance Criteria

- `npm run process:build-log-api-cache-and-slim-check -- --close-card --json` reports healthy.
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch` reports healthy and does not propose `BUILD-LOG-API-CACHE-AND-SLIM-001`.
- Live route proof shows `/api/foundation/build-log?limit=60` returns HTTP 200 under the payload budget with `groups` using `buildRefs`.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, and ship gate pass.

## Details

Root invariant: the Build Log API cleanup is fixed only when request-time work is bounded by the route-level cache and grouped payloads stop duplicating build objects. The proof must use the actual route module, actual frontend renderer module, the actual nightly audit function path, and live Current Sprint/backlog behavior.

The V1 code path:

- Add `lib/foundation-build-log-api-cache.js` with cache/slim payload helpers, source evaluator, and dogfood fixtures.
- Update `lib/foundation-operator-routes.js` so the route calls `readFoundationBuildLogApiPayload()` through a process-local cache.
- Update `public/foundation-operations-renderers.js` so Recent Work renders slim build refs while staying backward-compatible.
- Update `lib/code-quality-nightly-audit.js` so the old build-log finding is suppressed only when cache/slim proof passes.
- Add `scripts/process-build-log-api-cache-and-slim-check.mjs` as the focused proof and closeout writer.

## Reuse Existing Work

Existing code:

- `lib/foundation-operator-routes.js`
- `lib/foundation-build-log.js`
- `public/foundation-operations-renderers.js`
- `lib/code-quality-nightly-audit.js`
- `lib/deep-audit-findings-closure-gate.js`
- `lib/current-sprint-active-card-gate.js`
- `lib/process-write-guard.js`

Existing docs:

- `docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/process/deep-audit-findings-closure-gate-001-plan.md`
- `docs/process/foundation-client-current-state-extract-001-plan.md`

Existing scripts:

- `process:code-quality-nightly-audit-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `foundation:verify`
- `process:foundation-ship`

Existing policy:

- Audit findings become live backlog truth or shipped proof.
- Green means raw green; classification is not repair.
- Current Sprint is the executable command surface.
- Blockers block unsafe actions, not the whole sprint.

## Operator Value

Steve gets a faster and safer Recent Work path: the first Build Log request can do the bounded git/enrichment read, then repeated operator refreshes reuse cached payloads for a short window. The payload still carries all top-level builds, but grouped views reference those builds instead of duplicating them.

## Speed Bound

The focused gate must stay under 2 minutes locally. It reads route/frontend/audit files, live backlog/Current Sprint rows, and runs the code-quality audit with endpoint fetches skipped. It does not run browser auth, provider calls, external fetches, private extraction, or a full deep audit.

## Risks

- Risk: stale Build Log data hides a just-shipped card.
  - Mitigation: short TTL only, `cache` metadata in the response, and ship/fanout gates still verify served code/current commit after card closeout.
- Risk: slim grouped payload breaks Recent Work.
  - Mitigation: frontend keeps backward compatibility for `systemGroup.builds` and resolves `buildRefs` through top-level `builds`.
- Risk: the nightly audit hides a real performance issue.
  - Mitigation: suppress only when source evaluator proves cache/slim wiring and dogfood rejects the old inline shape.
- Risk: card grows into a build-log rewrite.
  - Mitigation: no closeout-registry migration, no UI redesign, no API consumer removal, no broad mechanical rewrite.

## Tests

- Static: `node --check lib/foundation-build-log-api-cache.js scripts/process-build-log-api-cache-and-slim-check.mjs`.
- Focused: `npm run process:build-log-api-cache-and-slim-check -- --close-card --json`.
- Audit dogfood: `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`.
- Live route: `curl -fsS "http://localhost:3000/api/foundation/build-log?limit=60"`.
- Full: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

## Gate Decision Tree

Blast radius is full because this card changes a Foundation operator API route, frontend rendering compatibility, nightly audit detector behavior, Current Sprint truth, and live backlog closeout.

Use static syntax first, then focused behavior proof, then full Foundation gates:

- static: module/script syntax
- focused: cache/slim helper, source evaluator, audit detector suppression, payload dogfood, and live sprint closeout
- full: `foundation:verify` and `process:foundation-ship`

## Gate Decision

Full Foundation gate. This card closes a P2 deep-audit finding and changes operator API behavior.
