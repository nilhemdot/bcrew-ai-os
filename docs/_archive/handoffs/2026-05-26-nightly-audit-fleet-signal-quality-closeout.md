# Nightly Audit Fleet Signal Quality Closeout

Closeout key: `nightly-audit-fleet-signal-quality-v1`
Card: `NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001`

## What Changed

The audit fleet runtime scan now separates real active drift from evidence-only and proof-fixture text.

V1 signal quality added:

- shared exact model literal classifier reuse
- shared process-write and report-output classifier reuse
- owned-signal classification for backlog seed, closeout registry, verifier coverage, and audit dogfood fixture literals
- active regression preservation for unowned model literals, unguarded report writers, and YouTube comment drift

## Boundaries

This remains report-only and read-only. It does not auto-fix findings, auto-create backlog cards, browse, extract, run providers, log into sources, mutate credentials, or write external systems.

## Proof

```bash
node --check lib/nightly-audit-fleet-runtime-scan.js scripts/process-nightly-audit-fleet-signal-quality-check.mjs scripts/process-nightly-audit-fleet-runtime-scan-check.mjs scripts/process-nightly-audit-fleet-check.mjs
npm run process:nightly-audit-fleet-signal-quality-check -- --json
npm run process:nightly-audit-fleet-runtime-scan-check -- --json
npm run process:nightly-audit-fleet-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001.json --closeoutKey=nightly-audit-fleet-signal-quality-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001 --closeoutKey=nightly-audit-fleet-signal-quality-v1
npm run process:foundation-ship -- --card=NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-FLEET-SIGNAL-QUALITY-001.json --closeoutKey=nightly-audit-fleet-signal-quality-v1 --commitRef=HEAD
```

## Known Limits

V1 improves the existing deterministic runtime-scan lanes only. Code-quality, synthesis/director, source freshness, and UI/brand remain explicit packet-only lane statuses until focused scanners are built.
