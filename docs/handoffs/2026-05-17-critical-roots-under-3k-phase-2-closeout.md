# CRITICAL-ROOTS-UNDER-3K-PHASE-2 Closeout

Status: shipped.

## What Shipped
- Split the Foundation verifier live API snapshot loading responsibility out of `scripts/foundation-verify.mjs`.
- Added `lib/foundation-verify-live-api-snapshot.js` to own read-only API/source-truth snapshot loading, local-doc guard probes, derived extraction-control arrays, and split dogfood proof.
- Added focused proof `scripts/process-critical-roots-under-3k-phase-2-check.mjs`.
- Added live backlog/process artifacts for `CRITICAL-ROOTS-UNDER-3K-PHASE-2`, approval file, verifier coverage, and closeout registry record `critical-roots-under-3k-phase-2-v1`.

## File Sizes
- `scripts/foundation-verify.mjs`: 4,998 before, 4,941 after by `wc -l` after active-sprint allowlist registration. The focused proof's text split counter reports 4,942.
- `lib/foundation-verify-live-api-snapshot.js`: 259 by `wc -l`; 260 by proof script text split; under the 1,500-line hand-written module budget.
- `server.js`: unchanged at 4,831 by `wc -l`.
- `lib/foundation-db.js`: unchanged at 4,735 by `wc -l`.
- `public/foundation.js`: unchanged at 2,997 by `wc -l`.

## Proof
- Runtime after restart was repaired without rerunning `agent-feedback-auto-send-readiness`: stale Postgres `postmaster.pid` was moved aside, `postgresql@17` and `ai.bcrew.dashboard` were restored, and `ai.bcrew.foundation-worker` was restored only after the job ledger showed the Agent Feedback auto-send job was not due and its latest run remained the failed 2026-05-17 08:30 run.
- `node --check scripts/foundation-verify.mjs lib/foundation-verify-live-api-snapshot.js scripts/process-critical-roots-under-3k-phase-2-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-size-records.js`
- `npm run process:critical-roots-under-3k-phase-2-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify` passed 445/445.
- `npm run process:foundation-ship -- --card=CRITICAL-ROOTS-UNDER-3K-PHASE-2 --planApprovalRef=docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-2.json --closeoutKey=critical-roots-under-3k-phase-2-v1 --commitRef=HEAD`

## Not Next
- Do not start `FOUNDATION-SURFACE-UPDATES-001`.
- Do not start another root split until Steve starts the next sprint.
- Do not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve local mockup assets.

## Recommendation
After this sprint ships, the next sprint should be chosen from repo truth. Current recommendation is another critical-root split if Steve wants to keep file-size pressure highest; otherwise choose `SOURCE-CONTRACT-VALIDATION-LAYER` before extractor runtime if source contracts are the priority.
