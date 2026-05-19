# CRITICAL-ROOTS-UNDER-3K-PHASE-1 Closeout

Status: shipped with focused proof; final full-gate proof is recorded by `process:foundation-ship`.

## What Changed
- Split `public/foundation.js` from 4,909 lines to under 3,000 lines.
- Added `public/foundation-doc-markdown-renderers.js` for shared markdown/source-card/BHAG/Agent Engine document rendering.
- Added `public/foundation-strategy-renderers.js` for Strategy Packet, strategy docs, and Rebuild Plan command-order panels.
- Added `public/foundation-home-renderers.js` for the legacy Foundation home sequence and renderer.
- Updated Foundation HTML script order and verifier predicates so shared helpers are proven at the bundle level instead of assumed to live in the root.

## Proof
- `node --check public/foundation.js public/foundation-doc-markdown-renderers.js public/foundation-strategy-renderers.js public/foundation-home-renderers.js public/foundation-current-state-renderers.js lib/foundation-frontend-current-state-renderers-split.js lib/foundation-source-trust-verifier.js scripts/foundation-verify.mjs scripts/process-critical-roots-under-3k-check.mjs`
- `npm run process:critical-roots-under-3k-check -- --json`
- `npm run foundation:verify -- --failures-only`
- `npm run foundation:verify`
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-1 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-1.json --closeoutKey=critical-roots-under-3k-phase-1-v1 --commitRef=HEAD`

## Remaining Roots
- `scripts/foundation-verify.mjs` remains above 3,000 lines.
- `server.js` remains above 3,000 lines.
- `lib/foundation-db.js` remains above 3,000 lines.
- `public/foundation.js` is below 3,000 lines for this phase.

## Not Done
- This does not split another root.
- This does not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve local mockup assets.
- This does not resolve handoff queue labels that are not live backlog truth.

## Next
Pause before another root split. The next sprint starts with `BACKLOG-QUEUE-RECONCILE-001`, then Foundation surface/root cleanup continues from repo and live backlog truth.
