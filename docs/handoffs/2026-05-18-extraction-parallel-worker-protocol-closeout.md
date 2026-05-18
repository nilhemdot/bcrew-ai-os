# EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 Closeout

Closeout key: `extraction-parallel-worker-protocol-v1`

## What Changed

Defined the visible parallel extraction worker protocol before any extraction worker can run.

## What It Does

The protocol requires each future worker to have a visible chat, dedicated worktree, dedicated branch, unique source packet, queue item, permission class, artifact root, artifact manifest, file ownership, quality gate, wrap report, and stop conditions.

## Proof

- `node --check lib/extraction-parallel-worker-protocol.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-parallel-worker-protocol-check.mjs scripts/foundation-verify.mjs`
- `npm run process:extraction-parallel-worker-protocol-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --closeoutKey=extraction-parallel-worker-protocol-v1`
- `npm run process:foundation-ship -- --card=EXTRACTION-PARALLEL-WORKER-PROTOCOL-001 --planApprovalRef=docs/process/approvals/EXTRACTION-PARALLEL-WORKER-PROTOCOL-001.json --closeoutKey=extraction-parallel-worker-protocol-v1 --commitRef=HEAD`

## Dogfood

Rejects duplicate source packets, overlapping artifact paths, private source without approval, launched worker/live extraction, missing quality gate, missing wrap report, direct downstream writes, hidden subagent, and shared-file commit without lock.

## Limits

No extraction worker launch, live extraction, public web lookup, source crawl, transcript fetch, screenshot/keyframe capture, download, model call, private auth, downstream writes, external writes, hidden subagents, or invisible workers.

## Next

Continue `MYICOR-EXTRACTION-PREFLIGHT-001` as source-auth preflight only. Do not run live MyICOR extraction or use private access without explicit approval.
