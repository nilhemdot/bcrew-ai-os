# Extraction Runtime Readiness Closeout

Card: `EXTRACTION-RUNTIME-READINESS-001`

Closeout key: `extraction-runtime-readiness-v1`

Branch: `foundation/system-health-red-to-green-001`

## What Changed

- Added the Foundation-owned extraction runtime readiness contract in `lib/extraction-runtime-readiness.js`.
- Added the read-only `/api/foundation/extraction-runtime-readiness` route.
- Wired readiness into the existing extraction-runtime verifier and `foundation:verify`.
- Added focused proof, plan, approval, and closeout registry coverage.
- Repaired the extraction-runtime verifier dogfood fixture so the new readiness check is represented in synthetic healthy and failure cases.
- Tightened the focused proof so Current Sprint overlay metadata must be healthy before this card can close.

## What It Does

The readiness layer validates source/auth posture, extractor queue item shape, runtime/cost caps, evidence envelopes, run health, and proposal-only output before future extractor packets can build on the runtime.

## Why It Matters

Future Build Intel and source packets need a safe Foundation-owned runway. This card keeps auth-required, paid, or atom-promoting extraction from slipping in through a queue/spec sprint.

## Proof

- `node --check lib/extraction-runtime-readiness.js lib/foundation-extraction-runtime-verifier.js lib/foundation-runtime-read-routes.js scripts/process-extraction-runtime-readiness-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-runtime-readiness-check -- --close-card --json` - passed 22/22; route 17,851 bytes / 90ms; 13 targets; 1 blocked queue item; 12 runnable queue items; 0 running live extraction runs.
- `npm run backlog:hygiene -- --json` - healthy; 651 cards; 0 findings.
- `npm run foundation:verify` - passed 474/474.
- `npm run process:foundation-ship -- --card=EXTRACTION-RUNTIME-READINESS-001 --planApprovalRef=docs/process/approvals/EXTRACTION-RUNTIME-READINESS-001.json --closeoutKey=extraction-runtime-readiness-v1 --commitRef=HEAD`

Focused proof covers valid no-auth queue readiness, source/auth failures, auth-required active target rejection, missing cost caps, paid/private unapproved target rejection, malformed evidence envelope rejection, Research Inbox/proposed-atom proposal-only output, narrow API route payload, healthy Current Sprint overlay metadata, and no running live extraction started by this sprint.

## Known Limits

- This does not run live extraction.
- This does not approve auth-required or paid extraction.
- This does not perform OAuth, connector auth, Drive permission mutation, Agent Feedback auto-send, atom promotion, or backlog mutation from extracted content.
- Existing scheduled extraction lanes remain governed by their existing source contracts and runtime controls; this card adds the readiness gate for future queue/spec work.

## Review Next

Continue to `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001` as queued/pending approval only unless a Foundation budget or readiness gate turns red.
