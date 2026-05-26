# Build Opportunity Promotion Gate Preflight

Date: 2026-05-26

Card: `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

Closeout key: `build-opportunity-promotion-gate-preflight-v1`

Status: preflight built, not closed.

## What Changed

- Added `lib/build-opportunity-promotion-gate.js`.
- Added `scripts/process-build-opportunity-promotion-gate-check.mjs`.
- Added `docs/process/build-opportunity-promotion-gate-001-plan.md`.
- Added `docs/process/approvals/BUILD-OPPORTUNITY-PROMOTION-GATE-001.json`.
- Added closeout registry row `build-opportunity-promotion-gate-preflight-v1`.
- Added package script `process:build-opportunity-promotion-gate-check`.

## Contract Now Proved

- Source-backed opportunities without explicit Steve approval return `approval_required`.
- Approved opportunities produce no-write backlog-card proposals.
- Approved existing-card enrichments produce no-write attachment proposals.
- Duplicate opportunities are blocked from creating another card and must attach or be logged.
- Stale evidence is blocked until refreshed.
- Runtime/source side-effect flags fail closed.
- Reject, duplicate, and stale decisions keep an evidence packet and review reason.
- Raw Director recommendations cannot skip Scoper/raw evidence into the promotion gate.

## Still Not Wired

- No live Backlog apply/write path.
- No sprint mutation path.
- No approval JSON for closing `BUILD-OPPORTUNITY-PROMOTION-GATE-001`.
- No Skool, MyICOR, paid, private, auth, click, form, download, purchase, provider, model, or extraction run.

## Proof Run

```bash
node --check lib/build-opportunity-promotion-gate.js
node --check scripts/process-build-opportunity-promotion-gate-check.mjs
node --check lib/foundation-build-closeout-overnight-records.js
npm run process:build-opportunity-promotion-gate-check -- --json
npm run process:dev-build-scoper-check -- --json
npm run process:build-portfolio-scrum-master-check -- --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Proof results:

- Focused promotion gate: healthy.
- Scoper: healthy.
- Portfolio: healthy.
- Code Quality no-write audit: healthy.
- Doc bloat guard: healthy.
- System Health: healthy.
- Backlog hygiene: healthy, 849 cards, 0 findings.
- Foundation verify: 519/519.

## Morning Next

Steve should review whether the apply/write path should be built next. Until then, this gate is intentionally proposal-only, approval-bound, and not marked done.
