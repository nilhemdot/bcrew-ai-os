# FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `frontend-system-inventory-renderers-split-2026-05-15`
Closeout key: `frontend-system-inventory-renderers-split-v1`
Card: `FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001`

## What Changed

Extracted the Foundation Systems and System Inventory renderer cluster from `public/foundation.js` into `public/foundation-system-inventory-renderers.js`.

The new module owns the Foundation Systems route, service-area system cards, System Inventory Current Docs route, Archive / History route, Skills / Plugins / Agents capability routes, capability catalog, and inventory category constants. `foundation-router.js` keeps the same route calls through stable global route owner names.

`public/foundation.js` dropped from about `9,774` lines to about `8,388` lines, continuing the frontend monolith cleanup below the 10K danger threshold and toward the 5K refactor target.

## Proof

Focused proof:

```bash
npm run process:frontend-system-inventory-renderers-split-check -- --json
```

Result:

- 14/14 checks passed
- `/foundation` returned `200` in `30.3ms` with `7,454B`
- `/foundation-system-inventory-renderers.js` returned `200` with `51,986B`
- VM proof confirmed Systems helper behavior and service-area grouping
- VM proof confirmed System Inventory doc splitting and capability card rendering
- route globals remained available for `foundation-router.js`
- dogfood rejected missing/wrong system-inventory-module script order
- `public/foundation.js` line count dropped below 9K

Full ship commands:

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-system-inventory-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-system-inventory-renderers-split-check.mjs lib/foundation-frontend-system-inventory-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-system-inventory-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001.json --closeoutKey=frontend-system-inventory-renderers-split-v1 --commitRef=HEAD
```

## Files

- `public/foundation-system-inventory-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-system-inventory-renderers-split.js`
- `scripts/process-frontend-system-inventory-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- split frontend source readers in `lib/` and `scripts/process-foundation-sprint-*.mjs`
- `docs/process/frontend-system-inventory-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Not Included

- no Systems or System Inventory UI redesign
- no Foundation API contract change
- no FUB lead-source manager, Backlog, Decisions, Open Questions, Daily Summary, Build Log, or Current State split in this slice
- no capability semantic change or Agent Registry work
- no hub feature work or Marketing Video Lab live wiring
- no paid-source auth, source extraction, Drive permission mutation, or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup if Steve is still unavailable. Good next work: split the FUB source manager renderers, carve another verifier proof module, split another DB/server seam, or measure the next hot route/payload budget.
