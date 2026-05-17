# Verifier Source Trust Orchestration Split Closeout

Card: `VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-source-trust-orchestration-split-v1`

## What Changed

Moved source-trust orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-source-trust-verifier.js`.

The root verifier now delegates this domain through `evaluateFoundationSourceTrustVerifierOrchestration`, then reuses the returned `sourceTrustVerifier` object for downstream structural assurance.

## What It Proves

The source-trust module still owns and proves:

- source contract, connector, grouped source system, and KPI health coverage;
- card/source reference trust and Phase C visibility proof;
- Data Sources, System Inventory, identity metadata, and current-state/source-registry source-trust rows;
- dogfood rejection of missing connector health, stale KPI health, missing reference trust, and substring-only Phase C coverage;
- historical `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001` closeout proof;
- new `VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001` closeout proof.

## Boundaries

This did not change source contract behavior, connectors, source extraction jobs, paid calls, route behavior, hub features, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-source-trust-verifier.js
node --check scripts/process-verifier-source-trust-orchestration-split-check.mjs
node --check scripts/process-verifier-source-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-trust-orchestration-split-check -- --json
npm run process:verifier-source-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-trust-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-trust-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-trust-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
