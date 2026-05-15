# FRONTEND-MONOLITH-SPLIT-001 Closeout

Date: 2026-05-15
Closeout key: `frontend-monolith-split-v1`
Sprint: `frontend-monolith-split-2026-05-15`

## Verdict

Accepted for v1. Foundation frontend monolith cleanup now has three named browser seams for nav config, data/cache helpers, and router/init behavior.

## What Changed

- Added `public/foundation-nav-config.js` for section labels, doc paths, breadcrumb parents, and command-order group config.
- Added `public/foundation-data.js` for Foundation read helpers, mutation helpers, admin token handling, and cache invalidation.
- Added `public/foundation-router.js` for hash parsing, section focus, nav state, route dispatch, mobile nav init, and page init.
- Updated `public/foundation.html` to load the split scripts in dependency order:
  1. `/foundation-nav-config.js`
  2. `/foundation-data.js`
  3. `/foundation.js`
  4. `/foundation-router.js`
- Left the heavy renderers in `public/foundation.js` for this slice.
- Added `lib/foundation-frontend-monolith-split.js` and `scripts/process-frontend-monolith-split-check.mjs` as the focused proof.
- Added verifier coverage so the split remains repo truth after closeout.

## Why It Matters

`public/foundation.js` was about 16K lines. That is an actively risky frontend ownership surface. This split creates smaller seams without changing route semantics, API contracts, CSS, or renderer behavior. Future Foundation UI work can now touch data/cache or routing behavior without adding more code to the frontend monolith.

## Dogfood Proof

The focused proof recreates the failure modes this split is meant to prevent:

- Missing split scripts are rejected.
- Wrong script order is rejected.
- Route dispatch must call the expected renderer functions.
- Repeated hub reads must use cache.
- `clearFoundationCaches()` must invalidate cache.
- Successful mutation helpers must clear cache.
- `/foundation` and the split scripts must serve under local budget.
- Combined split JS bytes must stay within the 5% growth budget.

Measured focused proof:

- `public/foundation.js` lines: `16,061 -> 15,306`
- `/foundation`: `200`, `30.8ms`, `7,096B`
- `/foundation-nav-config.js`: `200`, `3.0ms`, `8,135B`
- `/foundation-data.js`: `200`, `1.5ms`, `11,993B`
- `/foundation.js`: `200`, `5.1ms`, `587,886B`
- `/foundation-router.js`: `200`, `1.2ms`, `5,221B`
- Combined split JS bytes: `613,235B`, within the 5% growth budget from the `613,000B` baseline.

## Proof Commands

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-router.js scripts/process-frontend-monolith-split-check.mjs lib/foundation-frontend-monolith-split.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:frontend-monolith-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-MONOLITH-SPLIT-001.json --closeoutKey=frontend-monolith-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not split every renderer out of `public/foundation.js`.
- This does not introduce a frontend build system or ES modules.
- This does not redesign Foundation UI styling.
- This does not change Foundation API contracts.
- This does not wire Marketing Video Lab live routes.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue no-auth Foundation cleanup. Good next work: split another frontend renderer cluster, carve another verifier proof module, split another DB/server seam, or measure the next route/payload budget.
