# Verifier Canva Client Orchestration Split Closeout

Card: `VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-canva-client-orchestration-split-v1`

## What Changed

Moved Canva client verifier orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-canva-client-verifier.js`.

The root verifier now delegates this domain through `evaluateFoundationCanvaClientVerifierOrchestration`, then pushes the returned checks.

## What It Proves

The Canva client module still owns and proves:

- governed read-only Canva client access;
- refresh-token and OAuth bootstrap guardrails;
- official Canva Connect read-plan evidence;
- no upload, export, design creation, or write-wrapper exposure;
- dogfood rejection of missing refresh token, missing rotation-safe bootstrap, exposed write wrapper, and missing official read-plan evidence;
- historical `VERIFIER-CANVA-CLIENT-SPLIT-MODULE-001` closeout proof;
- new `VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001` closeout proof.

## Boundaries

This did not change Canva client behavior, rotate tokens, call Canva APIs, add Canva writes, build asset library sync, wire Marketing Video Lab, change route behavior, change source extraction, change active sprint truth, or move other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-canva-client-verifier.js
node --check scripts/process-verifier-canva-client-orchestration-split-check.mjs
node --check scripts/process-verifier-canva-client-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-canva-client-orchestration-split-check -- --json
npm run process:verifier-canva-client-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-canva-client-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-canva-client-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-CANVA-CLIENT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-canva-client-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
