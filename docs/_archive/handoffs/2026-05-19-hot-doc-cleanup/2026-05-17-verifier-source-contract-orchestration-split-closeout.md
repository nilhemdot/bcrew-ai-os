# Verifier Source Contract Orchestration Split Closeout

Card: `VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-source-contract-orchestration-split-v1`

## What Changed

Moved Source Contract verifier orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-source-contract-verifier.js`.

The root verifier now delegates this domain through `evaluateFoundationSourceContractVerifierOrchestration`, then pushes the returned checks.

## What It Proves

The Source Contract verifier module still owns and proves:

- Owners, Finance, and Freedom signed-off source contract boundaries;
- source registry and current-state documentation boundaries;
- live DB source-contract registry proof;
- source-contract registry dogfood proof;
- scalar source-ID FK migration proof;
- array-backed source provenance design proof;
- historical `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` proof compatibility;
- new `VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001` closeout proof.

## Boundaries

This did not change source contract statuses, live source registry schema, source-ID FK schema, array provenance schema, source extraction, connector auth, route behavior, DB write behavior, paid calls, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-source-contract-verifier.js
node --check scripts/process-verifier-source-contract-orchestration-split-check.mjs
node --check scripts/process-verifier-source-contracts-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-contract-orchestration-split-check -- --json
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-contract-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-contract-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-CONTRACT-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-contract-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
