# Verifier Source Once-Over Orchestration Split Closeout

Card: `VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-source-once-over-orchestration-split-v1`

## What Changed

Moved Source Once-Over verifier orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-source-once-over-progression.js`.

The root verifier now delegates this domain through `evaluateFoundationVerifierSourceOnceOverProgressionOrchestration`, then pushes the returned checks.

## What It Proves

The Source Once-Over verifier module still owns and proves:

- Source Once-Over progression checks for the shipped source follow-up cards;
- strategy hub meeting-ready, avatar import, brand stack, marketing source map, per-user changelog, tier behavioral completion, and auto-deploy rollback proof wiring;
- source coverage, source extraction coverage, source maturity grid, source coverage closeout, and verification run completion proof wiring;
- the existing Source Once-Over progression dogfood failure classes;
- wrapper-compatible historical `VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001` proof;
- new `VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001` bundled-domain closeout proof.

## Boundaries

This did not change Source Once-Over card statuses outside this split card, source coverage behavior, source extraction behavior, source maturity behavior, verification run behavior, connector auth, route behavior, DB write behavior, paid calls, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-verifier-source-once-over-progression.js
node --check scripts/process-verifier-source-once-over-orchestration-split-check.mjs
node --check scripts/process-verifier-source-once-over-progression-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-once-over-orchestration-split-check -- --json
npm run process:verifier-source-once-over-progression-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-once-over-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-source-once-over-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-source-once-over-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
