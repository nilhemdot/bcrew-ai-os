# Foundation Operations Renderer Split Closeout

Date: 2026-05-15
Sprint: `frontend-operations-renderers-split-2026-05-15`
Card: `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`
Closeout key: `frontend-operations-renderers-split-v1`

## What Changed

Extracted the Foundation operations renderer cluster from `public/foundation.js` into `public/foundation-operations-renderers.js`.

The moved cluster owns:

- Runtime Health: `renderDataHealth`
- System Activity: `renderSystemActivity`
- Daily Summary: `renderDailySummary` and helpers
- Recent Work / Current Sprint build log: `renderBuildLog`, `renderCurrentSprintPanel`, and helpers

`public/foundation.html` now loads the browser scripts in this order:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-operations-renderers.js`
5. `foundation-router.js`

## Why It Matters

`public/foundation.js` was still over 15K lines after the first frontend split. Recent Work, Runtime Health, Daily Summary, and System Activity are the surfaces Steve uses to understand what happened overnight and decide what to review next. Moving them into a named module lowers frontend monolith risk without changing behavior.

## Proof

Focused proof:

```bash
npm run process:frontend-operations-renderers-split-check -- --json
```

Full ship proof:

```bash
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-OPERATIONS-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-OPERATIONS-RENDERERS-SPLIT-001.json --closeoutKey=frontend-operations-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the old failure shape: missing operations module, wrong script order, moved renderers still inside `public/foundation.js`, and router dispatch unable to reach moved renderer globals.

## Files

- `public/foundation-operations-renderers.js`
- `public/foundation.html`
- `public/foundation.js`
- `lib/foundation-frontend-operations-renderers-split.js`
- `scripts/process-frontend-operations-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-overnight-records.js`
- `lib/foundation-recent-builds-ui.js`
- `lib/foundation-daily-exec-summary.js`
- `lib/foundation-ui-menu-layout-polish.js`
- `scripts/process-foundation-sprint-system-check.mjs`
- `docs/process/frontend-operations-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-OPERATIONS-RENDERERS-SPLIT-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Known Limits

- This does not split every renderer out of `public/foundation.js`.
- This does not convert Foundation frontend scripts to ES modules.
- This does not redesign UI styling, change route semantics, or change API contracts.
- This does not wire Marketing Video Lab live routes or any hub feature work.

## Next

Continue no-auth Foundation cleanup: either split another frontend renderer cluster, carve another verifier proof module, split another DB/server seam, or measure the next hot route/payload budget.
