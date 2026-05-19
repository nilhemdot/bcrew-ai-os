# FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `frontend-current-state-renderers-split-2026-05-15`
Closeout key: `frontend-current-state-renderers-split-v1`
Card: `FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001`

## What Changed

Extracted the Foundation Overview / Current State renderer cluster from `public/foundation.js` into `public/foundation-current-state-renderers.js`.

The new module owns Current State source links/stamps, backlog cells, closeout boards, maturity level guide, package detail tables, surface tables, Foundation truth/execution panels, Owners review queue panel, and `renderCurrentState()`.

`public/foundation.js` dropped from about `7,710` lines to `6,348` lines.

## Proof

Focused proof:

```bash
npm run process:frontend-current-state-renderers-split-check -- --json
```

Result:

- 14/14 checks passed
- `/foundation` returned `200` in about `25.8ms` with `7,606B`
- `/foundation-current-state-renderers.js` returned `200` with `56,586B`
- VM proof confirmed route globals, Current State source links, backlog cell rendering, surface table rendering, and synthetic route render
- Dogfood rejected missing/wrong Current State module script order
- `public/foundation.js` line count dropped below 6,500

Full ship commands:

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-current-state-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-current-state-renderers-split-check.mjs lib/foundation-frontend-current-state-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-current-state-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001.json --closeoutKey=frontend-current-state-renderers-split-v1 --commitRef=HEAD
```

## Files

- `public/foundation-current-state-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-current-state-renderers-split.js`
- `scripts/process-frontend-current-state-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- Split frontend source readers in `lib/` and `scripts/process-foundation-sprint-*.mjs`
- `docs/process/frontend-current-state-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Not Included

- No Foundation Overview UX redesign
- No Foundation Hub/source-of-truth/API contract changes
- No Backlog, Decisions, Open Questions, Data Sources, or strategy-doc split
- No hub feature work or Marketing Video Lab live wiring
- No paid-source auth, source extraction, Drive permission mutation, or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup if Steve is still unavailable. Good next work: split another route-local frontend renderer cluster, carve another verifier proof module, split another DB/server seam, or measure the next hot route/payload budget.
