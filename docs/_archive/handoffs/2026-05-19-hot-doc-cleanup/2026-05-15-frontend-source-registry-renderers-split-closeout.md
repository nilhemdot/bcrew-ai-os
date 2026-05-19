# FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `frontend-source-registry-renderers-split-2026-05-15`
Closeout key: `frontend-source-registry-renderers-split-v1`
Card: `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001`

## What Changed

Extracted the Foundation Data Sources / Source Registry renderer cluster from `public/foundation.js` into `public/foundation-source-registry-renderers.js`.

The new module owns source contract cards, grouped source systems, connector cards, Data Sources purpose/hero panels, KPI / Supabase health renderers, and the source operator notes drawer. `public/foundation.js` keeps route ownership through `renderSourceRegistry(section)`.

`public/foundation.js` dropped from about `11,223` lines to about `9,775` lines, which moves the frontend monolith below the 10K-line actively-dangerous threshold for this slice.

## Proof

Focused proof:

```bash
npm run process:frontend-source-registry-renderers-split-check -- --json
```

Result:

- 14/14 checks passed
- `/foundation` returned `200` in `30.3ms` with `7,376B`
- `/foundation-source-registry-renderers.js` returned `200` with `55,416B`
- VM proof confirmed Data Sources dispatch reaches moved renderer globals
- VM proof confirmed Source Lifecycle can still call shared source helpers
- dogfood rejected missing/wrong source-registry-module script order
- `public/foundation.js` line count dropped below 10K

Full ship commands:

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-source-registry-renderers-split-check.mjs lib/foundation-frontend-source-registry-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-source-registry-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001.json --closeoutKey=frontend-source-registry-renderers-split-v1 --commitRef=HEAD
```

## Files

- `public/foundation-source-registry-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-source-registry-renderers-split.js`
- `scripts/process-frontend-source-registry-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- split frontend source readers in `lib/` and `scripts/process-foundation-sprint-*.mjs`
- `docs/process/frontend-source-registry-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Not Included

- no Data Sources UI redesign
- no Foundation API contract change
- no FUB lead-source manager or System Inventory split in this slice
- no hub feature work or Marketing Video Lab live wiring
- no paid-source auth, source extraction, Drive permission mutation, or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup if Steve is still unavailable. Good next work: split System Inventory or FUB source manager renderers, carve another verifier proof module, split another DB/server seam, or measure the next hot route/payload budget.
