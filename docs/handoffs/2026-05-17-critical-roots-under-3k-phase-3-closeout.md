# CRITICAL-ROOTS-UNDER-3K-PHASE-3 Closeout

## Summary
Shipped the Phase 3 critical-root split by extracting the server document strategy surface from `server.js` into `lib/server-document-strategy-surface.js`.

`server.js` now remains the route/orchestration root while the extracted module owns markdown document allowlisting, document metadata, strategy PDF generation, heading replacement/diff helpers, hash/git helpers, and the split evaluator/dogfood proof.

## Line Counts
- `server.js`: 4,831 before -> 3,872 after by `wc -l`.
- `lib/server-document-strategy-surface.js`: 1,147 lines by `wc -l`, under the 1,500-line hand-written module budget.
- Remaining critical roots above 3,000: `scripts/foundation-verify.mjs`, `server.js`, and `lib/foundation-db.js`.

## What Changed
- Added `lib/server-document-strategy-surface.js`.
- Updated `server.js` to import and instantiate `createServerDocumentStrategySurface`.
- Removed inline server ownership of the moved document/PDF helper functions.
- Added focused proof `scripts/process-critical-roots-under-3k-phase-3-check.mjs`.
- Added package script `process:critical-roots-under-3k-phase-3-check`.
- Added live backlog/process artifacts for `CRITICAL-ROOTS-UNDER-3K-PHASE-3`, approval file, verifier coverage, and closeout registry record `critical-roots-under-3k-phase-3-v1`.
- Added a narrow verifier active-sprint progression allowance for `CRITICAL-ROOTS-UNDER-3K-PHASE-3`.

## Proof
- `node --check server.js lib/server-document-strategy-surface.js scripts/foundation-verify.mjs scripts/process-critical-roots-under-3k-phase-3-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-size-records.js`
- `npm run process:critical-roots-under-3k-phase-3-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --failures-only`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-3 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-3.json --closeoutKey=critical-roots-under-3k-phase-3-v1 --commitRef=HEAD`

Focused proof passed and verifies:
- the extracted module is called directly for markdown/doc/PDF/git helper behavior;
- the old root no longer defines the moved domain;
- synthetic bad fixtures fail closed for unchanged root count, oversized module, root-owned PDF builder, missing PDF builder, arbitrary line movement, and missing package script;
- no Harlan/Fal/voice/mockup paths are touched.

Backlog hygiene passed with 623 cards scanned and 0 findings.

## Known Limits
- This does not put every critical root below 3,000 lines.
- This does not change route behavior, DB schema, connector auth, hub feature work, UI polish, Harlan/Fal/voice/Canva work, Agent Feedback send jobs, or Steve local mockup assets.
- This does not start another sprint.

## Recommended Next
Another critical-root split is still valuable only if the next boundary is similarly cohesive and larger than a tiny extraction. If the next boundary is not obvious, move to `SOURCE-CONTRACT-VALIDATION-LAYER` next because source contracts and connector/extractor readiness are the higher strategic Foundation tightness issues after this split.
