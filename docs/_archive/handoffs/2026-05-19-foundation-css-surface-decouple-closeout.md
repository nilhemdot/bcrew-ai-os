# FOUNDATION-CSS-SURFACE-DECOUPLE-001 Closeout

Card: `FOUNDATION-CSS-SURFACE-DECOUPLE-001`
Closeout key: `foundation-css-surface-decouple-v1`

## What Changed

- Split Current State/System Inventory CSS from `public/styles-foundation-core.css` into `public/styles-foundation-current-state.css`.
- Split Build Log/Current Sprint/process-memory CSS from `public/styles-foundation-workflows.css` into `public/styles-foundation-build-log.css`.
- Kept `public/styles.css` as the stable root stylesheet manifest and preserved cascade order.
- Updated stylesheet proof metadata so the new modules remain covered by the existing manifest check.
- Added focused CSS surface proof with dogfood for missing imports, selectors drifting back into broad files, and unresolved audit routing.
- Routed the May 19 `foundation-dom-rebuild-risk` audit finding to this shipped proof.

## Why It Matters

The May 19 deep audit found that Foundation CSS surfaces were still broad enough to raise frontend drift risk. This closes that finding with an actual ownership split, not a classify-around-it watch row.

## Where It Lives

- `public/styles.css`
- `public/styles-foundation-core.css`
- `public/styles-foundation-current-state.css`
- `public/styles-foundation-build-log.css`
- `public/styles-foundation-workflows.css`
- `lib/foundation-stylesheet-monolith-split.js`
- `lib/foundation-css-surface-decouple.js`
- `scripts/process-foundation-css-surface-decouple-check.mjs`
- `lib/deep-audit-findings-closure-gate.js`
- `docs/process/foundation-css-surface-decouple-001-plan.md`
- `docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json`

## Proof Commands

```bash
node --check lib/foundation-css-surface-decouple.js scripts/process-foundation-css-surface-decouple-check.mjs
npm run process:stylesheet-monolith-split-check -- --json
npm run process:foundation-css-surface-decouple-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --closeoutKey=foundation-css-surface-decouple-v1
npm run process:foundation-ship -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --commitRef=HEAD
```

## Known Limits

- This does not redesign Foundation UI.
- This does not rewrite DOM renderers.
- This does not split every remaining CSS selector into final component-level files.
- This does not start source/value/extraction expansion.

## Review Next

Continue `DECISION-008`.
