# FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `frontend-fub-lead-source-renderers-split-2026-05-15`
Closeout key: `frontend-fub-lead-source-renderers-split-v1`
Card: `FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001`

## What Changed

Extracted the Foundation FUB lead-source taxonomy renderer cluster from `public/foundation.js` into `public/foundation-fub-lead-source-renderers.js`.

The new module owns the FUB source group view state, taxonomy order, FUB source tag helpers, drift bucket renderers, Owners lead-source governance panel, FUB source rule editor, and `renderFubLeadSourceManagerPanel()`. The existing Source APIs route still calls the same global renderers, so route behavior is unchanged.

`public/foundation.js` dropped from about `8,388` lines to `7,710` lines.

## Proof

Focused proof:

```bash
npm run process:frontend-fub-lead-source-renderers-split-check -- --json
```

Result:

- 14/14 checks passed
- `/foundation` returned `200` in about `31.1ms` with `7,531B`
- `/foundation-fub-lead-source-renderers.js` returned `200` with `27,456B`
- VM proof confirmed FUB tag helpers, source group order, drift panel, and manager render from synthetic data
- VM proof confirmed initial render does not call live mutation
- dogfood rejected missing/wrong FUB module script order
- `public/foundation.js` line count dropped below 7,750

Full ship commands:

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-fub-lead-source-renderers-split-check.mjs lib/foundation-frontend-fub-lead-source-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-fub-lead-source-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001.json --closeoutKey=frontend-fub-lead-source-renderers-split-v1 --commitRef=HEAD
```

## Files

- `public/foundation-fub-lead-source-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-fub-lead-source-renderers-split.js`
- `scripts/process-frontend-fub-lead-source-renderers-split-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- split frontend source readers in `lib/` and `scripts/process-foundation-sprint-*.mjs`
- `docs/process/frontend-fub-lead-source-renderers-split-001-plan.md`
- `docs/process/approvals/FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Not Included

- no FUB API route changes
- no live FUB refresh proof
- no source taxonomy writes
- no FUB source rule changes
- no Source APIs route ownership split
- no hub feature work or Marketing Video Lab live wiring
- no paid-source auth, source extraction, Drive permission mutation, or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup if Steve is still unavailable. Good next work: split another route-local frontend renderer cluster, carve another verifier proof module, split another DB/server seam, or measure the next hot route/payload budget.
