# FOUNDATION-DB-MONOLITH-SPLIT-011 Closeout

Date: 2026-05-16
Closeout key: `foundation-runtime-job-store-split-v1`
Sprint: `foundation-db-runtime-job-store-split-2026-05-16`

## What Changed

Moved Foundation runtime status, job controls, job schedule index, job run snapshot/lookup, job run metadata update, job run creation/finish/stop, and stale job-run reaper behavior out of `lib/foundation-db.js` and into `lib/foundation-runtime-job-store.js`.

`lib/foundation-db.js` now keeps the existing public runtime/job exports as delegates:

- `getFoundationJobScheduleIndex`
- `getFoundationJobControl`
- `recordFoundationRuntimeStatus`
- `getFoundationRuntimeStatus`
- `getFoundationJobRunSnapshot`
- `getFoundationJobRunById`
- `updateFoundationJobControl`
- `updateFoundationJobRunMetadata`
- `createFoundationJobRun`
- `finishFoundationJobRun`
- `markFoundationJobRunStopped`
- `markStaleFoundationJobRuns`

This reduced `lib/foundation-db.js` from the previous split baseline of about 8,892 lines to about 8,271 lines without changing job definitions, schedule policy, worker behavior, schema, source extraction, connector auth, or hub behavior.

## Dogfood Proof

Focused proof rejects:

- missing dedicated runtime/job module ownership
- old inline runtime/job ownership in `lib/foundation-db.js`
- missing public delegate wiring
- weak split plans that do not document the architecture-rule split posture

Synthetic fake-pool behavior proof preserves:

- runtime status write and lookup mapping
- job control update validation and mapping
- job schedule index shape
- job run snapshot mapping
- `createFoundationJobRun()` and `finishFoundationJobRun()` mapping
- stale Foundation job-run reaper updates

## Proof Commands

```bash
node --check lib/foundation-runtime-job-store.js lib/foundation-db.js lib/foundation-db-split-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-runtime-job-store-split-check.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-runtime-job-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-011 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-011.json --closeoutKey=foundation-runtime-job-store-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-011 --closeoutKey=foundation-runtime-job-store-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-011 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-011.json --closeoutKey=foundation-runtime-job-store-split-v1 --commitRef=HEAD
```

## Boundaries

This was Foundation monolith cleanup only.

Not changed:

- no Foundation job definition changes
- no schedule policy changes
- no worker process-control behavior changes
- no source extraction or source crawl changes
- no connector credential or paid-source auth changes
- no schema changes
- no hub feature work
- no Canva asset work
- no Marketing Video Lab live route wiring
- no Drive permission mutation
- no `MEETING-VAULT-ACL-001` Phase B
- no request-access email

## Next

Continue no-auth Foundation cleanup. `lib/foundation-db.js` remains above the 5,000-line danger threshold, so the next safe work should be another bounded store split with stable delegates and fake-pool behavior proof, or a verifier split if the DB store boundary is riskier than the next verifier domain.
