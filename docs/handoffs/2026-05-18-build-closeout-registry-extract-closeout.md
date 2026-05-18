# BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 Closeout

Closeout key: `build-closeout-registry-extract-v1`

## What Changed

- Split large build closeout registry record groups into focused modules.
- Reduced `lib/foundation-build-closeout-records.js` to import/spread orchestration.
- Reduced `lib/foundation-build-closeout-overnight-records.js` below the 3,000-line architecture-risk threshold.
- Kept `getFoundationBuildCloseouts()` as the public behavior surface.

## Proof

Run:

```bash
node --check lib/build-closeout-registry-extract.js scripts/process-build-closeout-registry-extract-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-records.js lib/foundation-build-closeout-overnight-records.js lib/foundation-build-closeout-size-records.js
npm run process:build-closeout-registry-extract-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-REGISTRY-EXTRACT-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-REGISTRY-EXTRACT-001.json --closeoutKey=build-closeout-registry-extract-v1 --commitRef=HEAD
```

## Not Next

- Does not redesign Recent Builds.
- Does not change closeout matching/enrichment behavior.
- Does not delete or rewrite closeout records.
- Does not run live extraction, provider probes, external writes, Drive mutation, Gmail/ClickUp sends, or Agent Feedback auto-send.

## Next

Continue root-file cleanup from repo truth, then move to `FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001`.
