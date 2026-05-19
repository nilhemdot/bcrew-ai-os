# Foundation Build Closeout Registry Split Closeout

Date: 2026-05-15
Card: `FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001`
Closeout key: `foundation-build-closeout-registry-split-v1`

## What Changed

- Added `lib/foundation-build-closeout-control-plane-records.js`.
- Moved the recent Foundation/control-plane closeout slice out of `lib/foundation-build-closeout-records.js`.
- Kept the root closeout registry as an aggregator with a thin `controlPlaneCloseoutRecords` import/spread.
- Updated build-log source discovery so moved closeout records remain visible to source-based fallback checks.
- Added `lib/foundation-build-closeout-registry-split.js` and `scripts/process-foundation-build-closeout-registry-split-check.mjs` for dogfood proof.

## Why It Matters

The closeout registry is now load-bearing for Recent Builds, sprint review, and ship-gate truth. The previous ship gate proved that missing closeout visibility can block a real ship. Keeping the registry below the 5,000-line guardrail makes it easier to review and reduces the chance that cleanup work silently drops historical closeout context.

## Proof

Required proof:

- `node --check lib/foundation-build-closeout-control-plane-records.js lib/foundation-build-closeout-registry-split.js scripts/process-foundation-build-closeout-registry-split-check.mjs lib/foundation-build-closeout-records.js lib/foundation-build-log-source.js scripts/foundation-verify.mjs`
- `npm run process:foundation-build-closeout-registry-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001.json --closeoutKey=foundation-build-closeout-registry-split-v1`
- `npm run process:fanout-check -- --card=FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 --closeoutKey=foundation-build-closeout-registry-split-v1`
- `npm run process:post-ship-fanout -- --card=FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 --closeoutKey=foundation-build-closeout-registry-split-v1 --commitRef=HEAD`
- `npm run process:foundation-ship -- --card=FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BUILD-CLOSEOUT-REGISTRY-SPLIT-001.json --closeoutKey=foundation-build-closeout-registry-split-v1 --commitRef=HEAD`

## Dogfood Requirement

The focused proof must:

- accept the healthy split,
- reject a synthetic registry missing a moved closeout record,
- reject an oversized root registry,
- reject a missing `FOUNDATION-SWEEP-001` build-log visibility fixture.

## Known Limits

- This does not split the overnight closeout registry module.
- This does not reduce `scripts/foundation-verify.mjs` or `lib/foundation-db.js`.
- This does not change build-log route behavior beyond source discovery for split registry modules.
- This does not build Canva, Marketing, Build Intel, hub feature work, paid-source auth, `MEETING-VAULT-ACL-001` Phase B, or Drive permission mutation.

## Next

After sprint review, continue the Foundation cleanup ladder: verifier monolith split work, then Foundation DB split work, unless a ship gate exposes a higher-risk blocker first.
