# Verifier Recent Builds Orchestration Split Closeout

Card: `VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001`
Closeout key: `verifier-recent-builds-orchestration-split-v1`

## What Changed

Moved Recent Builds closeout verifier orchestration from `scripts/foundation-verify.mjs` into `lib/foundation-recent-builds-verifier.js`.

The root verifier now delegates this domain through `evaluateFoundationRecentBuildsVerifierOrchestration`, then pushes the returned checks.

## What It Proves

The Recent Builds verifier module still owns and proves:

- closeout schema validation;
- build-log grouping and operator-readable closeout exposure;
- required historical closeout proof commands;
- required `whereItLives` metadata;
- dogfood rejection of missing proof commands, invalid closeout schema, and missing `whereItLives`;
- historical `VERIFIER-RECENT-BUILDS-CLOSEOUT-SPLIT-001` proof compatibility;
- new `VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001` closeout proof.

## Boundaries

This did not change Recent Builds UI, build-log route behavior, closeout schema behavior, app routes, DB behavior, source extraction, connector auth, paid calls, active sprint truth, or other verifier domains.

No active sprint overlay was replaced.

## Proof

```bash
node --check lib/foundation-recent-builds-verifier.js
node --check scripts/process-verifier-recent-builds-orchestration-split-check.mjs
node --check scripts/process-verifier-recent-builds-closeout-split-check.mjs
node --check scripts/foundation-verify.mjs
node --check lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-recent-builds-orchestration-split-check -- --json
npm run process:verifier-recent-builds-closeout-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-recent-builds-orchestration-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --closeoutKey=verifier-recent-builds-orchestration-split-v1
npm run process:foundation-ship -- --card=VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-RECENT-BUILDS-ORCHESTRATION-SPLIT-001.json --closeoutKey=verifier-recent-builds-orchestration-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth with the next coherent domain split. Under 5K remains the clean target, and line-count progress must not replace domain boundaries or dogfood proof.
