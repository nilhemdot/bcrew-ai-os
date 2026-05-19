# Verifier Process Control Orchestration Split Closeout

Card: `VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-process-control-orchestration-split-v1`

## What Changed

Moved Process Control verifier orchestration input wiring from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-process-control-governance.js`.

The root verifier now delegates this domain through `evaluateFoundationVerifierProcessControlGovernanceOrchestration`, then pushes the returned checks.

## What It Proves

The Process Control verifier module still owns and proves:

- Connector Routing Truth sprint proof;
- process governance proof;
- readiness follow-up proof;
- guardrail closeout proof;
- control-loop proof;
- the existing Process Control governance dogfood failure classes;
- wrapper-compatible historical `VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001` proof;
- new `VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001` bundled-domain closeout proof.

## Boundaries

This did not change Process Control behavior, connector routing truth behavior, process governance behavior, readiness behavior, guardrail closeout behavior, control-loop behavior, connector auth, route behavior, DB write behavior, paid calls, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-verifier-process-control-governance.js
node --check scripts/process-verifier-process-control-orchestration-split-check.mjs
node --check scripts/process-verifier-process-control-governance-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-process-control-orchestration-split-check -- --json
npm run process:verifier-process-control-governance-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-control-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-process-control-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-process-control-orchestration-split-v1 --commitRef=HEAD
```

## Next

Pause and regroup with Steve before starting the next sprint. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
