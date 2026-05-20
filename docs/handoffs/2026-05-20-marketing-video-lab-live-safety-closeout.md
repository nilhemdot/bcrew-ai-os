# MARKETING-VIDEO-LAB-LIVE-SAFETY-001 Closeout

Card: `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`

Closeout key: `marketing-video-lab-live-safety-v1`

Date: 2026-05-20

## What Changed

- Added backend live-safety primitives for Marketing Video Lab.
- Added an atomic mock submit lock so duplicate same-intent submissions cannot both enter running state.
- Added live asset URL validation that rejects placeholder/sample/mock/local/private/non-HTTPS URLs.
- Added focused proof and Current Sprint closeout wiring.
- Added done-card verifier coverage for `MARKETING-VIDEO-LAB-LIVE-SAFETY-001`.
- Kept the existing dry-run lab intact and no-spend.

## What It Does

The safety layer proves two failure classes before any route wiring:

- concurrent mock submit allows exactly one running job and rejects the duplicate with `duplicate_running_job`;
- live validation rejects fake or unsafe asset URLs before a future provider submission could spend money.

## Why It Matters

The Marketing Video Lab can become a real tool later, but not while duplicate submit or fake-asset bugs could burn paid video credits or create misleading review outputs. This card proves no provider spend before route integration.

## Proof

```bash
node --check lib/marketing-video-lab.js scripts/process-marketing-video-lab-check.mjs scripts/process-marketing-video-lab-live-safety-check.mjs
npm run process:marketing-video-lab-check -- --json
npm run process:marketing-video-lab-live-safety-check -- --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --closeoutKey=marketing-video-lab-live-safety-v1
npm run process:foundation-ship -- --card=MARKETING-VIDEO-LAB-LIVE-SAFETY-001 --planApprovalRef=docs/process/approvals/MARKETING-VIDEO-LAB-LIVE-SAFETY-001.json --closeoutKey=marketing-video-lab-live-safety-v1 --commitRef=HEAD
```

## Boundaries

This does not run live provider video generation, call Google/FAL/Canva APIs, spend provider budget, wire routes, build Marketing Hub UI, mutate credentials, change provider config, add source access, send messages, mutate Drive permissions, or do paid/browser-auth work.

## Next

Continue `STRATEGY-004` unless System Health, repeated-failure gate, foundation:verify, main sync, or destructive data risk blocks safe work.
