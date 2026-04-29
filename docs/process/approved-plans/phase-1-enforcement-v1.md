# Phase 1 Enforcement Approved Plan

Approved by: Steve
Approved at: 2026-04-29T22:24:00Z
Plan score: 9.8/10

## Cards

- `APPROVAL-FILE-INTEGRITY-001`
- `BUILD-LOG-BACKLOG-ID-FIX-001`
- `CLOSEOUT-BACKFILL-001`
- `PRE-COMMIT-HOOK-INSTALL-001`

## Scope

Build Phase 1 enforcement only. Do not start Phase G Track 2, UI polish, Strategy, Scoper, Agent Factory, or corpus expansion.

## Protected Foundation Paths

`PRE-COMMIT-HOOK-INSTALL-001` protects:

- `docs/rebuild/**`
- `docs/process/**`
- `docs/audits/**`
- `docs/handoffs/**`
- `lib/foundation-*.js`
- `lib/doctrine-propagation.js`
- `lib/backlog-hygiene.js`
- `lib/process-*.js` if present
- `scripts/foundation-verify.mjs`
- `scripts/process-*.mjs`
- `scripts/*backlog*.mjs`
- `scripts/*doctrine*.mjs`
- `package.json`
- `public/foundation*.html`
- `public/foundation*.js`
- `public/ops*.html`
- `public/ops*.js`

Pre-commit runs lightweight static/syntax checks only. Pre-push checks whether protected Foundation paths changed and requires ship proof or explicit bypass. Full `foundation:verify` does not run on every tiny commit. `process:foundation-ship` remains the canonical full gate.

## Execution

1. Bootstrap approval integrity with current approval files, this approved-plan snapshot, SHA-256 hash, then v2 approval schema fields: `approvedPlanRef`, `approvedPlanSha256`, `approvalSchemaVersion`, `approvedRepoHead`, `approvalDigest`, and explicit `bootstrapFromLegacy: true` for this transition only.
2. Fix build-log ownership so closeout-owned backlog IDs come only from explicit closeout records; incidental mentions are context, not ownership.
3. Snapshot and backfill or exception the 13 closeout-proof targets: `MEMORY-001`, `SCHEMA-001`, `DECISION-001`, `DECISION-002`, `DECISION-003`, `DATA-018`, `DATA-019`, `DATA-020`, `GOVERNANCE-IMPORTRANGE-001`, `UX-003`, `SYSTEM-009`, `SOURCE-004`, `SOURCE-005`.
4. Add repo-managed `.githooks/`, installer command, `core.hooksPath` proof, hook docs, bypass reason, and follow-up-card requirement.

## Closeout And Gates

Use shared closeout key `phase-1-enforcement-v1` only if each card's proof ownership stays exact.

Run `npm run process:foundation-ship` once per card unless the wrapper is explicitly upgraded and verified to support multi-card invocation. Shared closeout key is allowed only if each card's proof ownership stays exact.

Required proof:

- `npm run foundation:verify`
- `npm run backlog:hygiene`
- approval tamper/stale-plan failure proof
- hook install plus `core.hooksPath` proof
- synthetic and live `/api/foundation/build-log` proof that multi-closeout ownership is clean and collapsed same-commit UX still works
- manual artifact check
- restart dashboard/worker if served code changes
- verify served commits equal HEAD
- push
- closeout with next step

## Not Next

- Phase G Track 2
- UI polish
- Strategy
- Scoper
- Agent Factory
- corpus expansion
