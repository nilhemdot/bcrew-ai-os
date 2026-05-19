# Foundation Agent Feedback Store Split Closeout

Date: 2026-05-16
Card: `FOUNDATION-DB-MONOLITH-SPLIT-014`
Sprint: `foundation-db-agent-feedback-store-split-2026-05-16`
Closeout key: `foundation-agent-feedback-store-split-v1`

## What Changed

- Added `lib/foundation-agent-feedback-store.js` as the focused Agent Feedback DB store.
- Moved Agent Onboarding Feedback response, send-attempt, reminder-attempt, and response-notification DB behavior out of `lib/foundation-db.js`.
- Kept the existing `lib/foundation-db.js` public export names as stable delegates.
- Added focused proof, Plan Critic approval, DB split verifier coverage, and root verifier source wiring.

## What It Does

Agent Feedback storage can now be reviewed and tested as a named Foundation DB module while existing routes and scripts keep importing the same public functions from `lib/foundation-db.js`.

## Why It Matters

`lib/foundation-db.js` remains over the 5,000-line architecture-risk threshold. This card removes a clean live-workflow ledger from the DB monolith without changing Gmail sends, ClickUp writeback, reminder cadence, notification recipients, token policy, auth, routes, UI, or schema.

## Proof

Planned proof:

```bash
node --check lib/foundation-agent-feedback-store.js lib/foundation-db.js lib/foundation-db-split-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-agent-feedback-store-split-check.mjs scripts/process-verifier-foundation-db-split-module-check.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-agent-feedback-store-split-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-014 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-014.json --closeoutKey=foundation-agent-feedback-store-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old pattern: Agent Feedback DB behavior buried inline in `lib/foundation-db.js`. The old inline shape fails; the split shape passes only when the focused store owns behavior, `foundation-db.js` delegates stable exports, and synthetic behavior verifies the returned response/send/reminder/notification shapes.

## Not Changed

- No Gmail send.
- No ClickUp writeback.
- No Agent Feedback reminder cadence, recipient policy, token policy, auth, route, UI, or schema change.
- No source extraction, paid-source auth, Canva, Marketing Video Lab, Build Intel extraction, hub feature work, Drive permission mutation, request-access email, or Meeting Vault Phase B.

## Next

Continue no-auth Foundation cleanup. The next likely DB-monolith slice is Sales Listing storage, because `lib/foundation-db.js` is still just above the 5,000-line risk threshold after this split.
