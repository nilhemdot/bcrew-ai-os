# EXTRACTION-TO-KB-ATOM-PIPELINE-001 Closeout

Closeout key: `extraction-to-kb-atom-pipeline-v1`

## What Changed

Defined the proposal-only routing contract from extractor artifact envelopes into KB draft, atom, synthesis fact, review inbox, and action-route candidates.

## What It Does

Valid artifacts must carry source ID, citation, freshness, privacy tier, permission class, and contradiction status. The pipeline reuses the KB compiler quality gate and emits only candidate objects that require approval before persistence.

## Proof

- `node --check lib/extraction-to-kb-atom-pipeline.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-to-kb-atom-pipeline-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-to-kb-atom-pipeline-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --closeoutKey=extraction-to-kb-atom-pipeline-v1`
- `npm run process:foundation-ship -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --commitRef=HEAD`

## Dogfood

Rejects missing source ID, missing citation, stale artifact freshness, unresolved contradiction, private/paid source without approval, live extraction/model side effects, and direct output writes.

## Limits

No live extraction, transcript fetch, screenshots/keyframes, downloads, model calls, private-source access, KB/atom/fact/action/review writes, backlog mutation, external writes, hidden subagents, or parallel extraction workers.

## Next

Continue `EXTRACTION-PARALLEL-WORKER-PROTOCOL-001`. Do not launch extraction workers until that protocol is separately planned, approved, and proven.
