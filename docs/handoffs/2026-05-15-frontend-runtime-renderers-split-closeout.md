# Foundation Runtime Renderer Split Closeout

Date: 2026-05-15
Sprint ID: `frontend-runtime-renderers-split-2026-05-15`
Closeout key: `frontend-runtime-renderers-split-v1`
Card: `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`

## Verdict

Closed for v1.

The Foundation runtime diagnostics renderer cluster was split out of `public/foundation.js` into `public/foundation-runtime-renderers.js` without changing Foundation route semantics, CSS, API contracts, or hub behavior.

## What Changed

- Added `public/foundation-runtime-renderers.js`.
- Loaded it in `public/foundation.html` after `foundation.js` and before `foundation-operations-renderers.js`.
- Kept `public/foundation-operations-renderers.js` as the owner of the `renderDataHealth()` Runtime Health route.
- Updated split-source reviewer/proof readers so checks scan the full browser bundle, not only `public/foundation.js`.
- Added focused proof constants in `lib/foundation-frontend-runtime-renderers-split.js`.
- Added `scripts/process-frontend-runtime-renderers-split-check.mjs`.
- Registered `process:frontend-runtime-renderers-split-check`.
- Added verifier coverage for the split and closeout.

## Dogfood Proof

The focused proof recreates the failure modes this split could introduce:

- missing runtime renderer script is rejected
- wrong runtime renderer script order is rejected
- moved renderer functions must be absent from `public/foundation.js`
- moved renderer functions must exist in `public/foundation-runtime-renderers.js`
- `renderDataHealth()` must still live in `public/foundation-operations-renderers.js`
- Runtime Health dispatch must reach moved runtime renderer globals in a VM-backed browser proof
- `/foundation` and all split scripts must serve under budget

Measured focused proof:

- `public/foundation.js`: about `14,206` lines to about `12,718` lines
- `public/foundation-runtime-renderers.js`: about `1,489` lines
- combined browser script bytes: `613,308` / `613,308` baseline
- `/foundation`: under the `2,000ms` route budget in focused proof

## Proof Commands

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-runtime-renderers-split-check.mjs lib/foundation-frontend-runtime-renderers-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-runtime-renderers-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-RUNTIME-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-RUNTIME-RENDERERS-SPLIT-001.json --closeoutKey=frontend-runtime-renderers-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not split every remaining renderer out of `public/foundation.js`.
- This does not introduce a frontend build system or ES modules.
- This does not redesign Foundation UI.
- This does not change Foundation API contracts.
- This does not wire Marketing Video Lab live routes.
- This does not build hub feature work, paid-source auth, Build Intel extraction, Drive permission mutation, or Meeting Vault Phase B.

## Review Next

Continue no-auth Foundation cleanup if Steve is unavailable. Good next candidates:

- split another source-lifecycle or strategy renderer cluster
- carve another verifier proof module
- split another DB/server seam
- measure the next hot route/payload budget
