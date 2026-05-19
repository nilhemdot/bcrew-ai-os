# Verifier Runtime Reliability Orchestration Split Closeout

Card: `VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-runtime-reliability-orchestration-split-v1`

## What Changed

Moved runtime-reliability orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-runtime-reliability-verifier.js`.

The root verifier now delegates this domain through `evaluateFoundationRuntimeReliabilityVerifierOrchestration`, then reuses the returned `runtimeReliabilityVerifier` and `planCriticArchitecturalRulesProof` values for downstream assurance.

## What It Proves

The runtime-reliability module still owns and proves:

- source outage boundary and operating reliability;
- Plan Critic architecture rules;
- Foundation Hub summary/full diagnostics performance budgets;
- ship preflight and ClickUp verifier health;
- Runtime Supervisor, worker reliability, first jobs, and Runtime Health command-read proof;
- dogfood rejection of missing outage boundaries, missing operating status, missing Runtime Supervisor proof, missing Runtime Health command read, missing Plan Critic dogfood, oversized payloads, missing ship preflight wiring, and missing ClickUp slow-budget proof;
- historical `VERIFIER-RUNTIME-RELIABILITY-SPLIT-001` closeout proof;
- new `VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001` closeout proof.

## Boundaries

This did not change runtime behavior, process supervisor behavior, worker behavior, source extraction jobs, paid calls, route behavior, hub features, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-runtime-reliability-verifier.js
node --check scripts/process-verifier-runtime-reliability-orchestration-split-check.mjs
node --check scripts/process-verifier-runtime-reliability-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-runtime-reliability-orchestration-split-check -- --json
npm run process:verifier-runtime-reliability-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-runtime-reliability-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-runtime-reliability-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
