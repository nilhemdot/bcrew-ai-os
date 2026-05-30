# Extractor Hands Production Runner V1 Closeout

Card: `EXTRACTOR-HANDS-PRODUCTION-RUNNER-001`
Closeout: `extractor-hands-production-runner-v1`

## What Changed

- Added `lib/extractor-hands-production-runner.js`.
- Added `scripts/process-extractor-hands-production-runner-check.mjs`.
- Added guarded Build Intel API routes:
  - `/api/foundation/dev-team-hub/source-packet-hands-run`
  - `/api/foundation/dev-team-hub/source-packet-hands-queue`
- Added Dev Data Pool queue/status visibility for bounded Hands.
- Updated God Mode parity and current sprint truth so public/resource-link Hands is production-queue ready without claiming full source-family God Mode.

## What It Does

V1 turns the bounded Hands proof into a production-safe runner path:

`approved source-packet decision + explicit Hands policy -> bounded Hands runner -> completed_bounded_hands_evidence_ready -> source-packet Hands queue/status -> source_crawl_items row -> intelligence_report_artifacts proof row`

The runner reuses `lib/extractor-hands-browser-runtime.js`, keeps approval separate from execution, and persists only governed Foundation evidence/status rows.

## Proof

```bash
node --check lib/extractor-hands-production-runner.js scripts/process-extractor-hands-production-runner-check.mjs lib/foundation-build-intel-routes.js lib/dev-team-hub.js public/dev.js lib/god-mode-extractor-parity-gate.js lib/source-packet-approval-decision-ledger.js
npm run process:extractor-hands-production-runner-check -- --json
npm run process:extractor-hands-browser-runtime-check -- --json
npm run process:source-packet-worker-runner-check -- --json
npm run process:god-mode-extractor-parity-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:ship-check -- --card=EXTRACTOR-HANDS-PRODUCTION-RUNNER-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-HANDS-PRODUCTION-RUNNER-001.json --closeoutKey=extractor-hands-production-runner-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=EXTRACTOR-HANDS-PRODUCTION-RUNNER-001 --closeoutKey=extractor-hands-production-runner-v1
npm run process:foundation-ship -- --card=EXTRACTOR-HANDS-PRODUCTION-RUNNER-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-HANDS-PRODUCTION-RUNNER-001.json --closeoutKey=extractor-hands-production-runner-v1 --commitRef=HEAD
```

## Known Limits

- This does not log in.
- This does not approve Skool, MyICOR, paid, private, member, course, community, form, download, purchase, opt-in, posting, commenting, messaging, or external-write flows.
- This does not auto-create backlog cards or destination writes.
- This does not make public/resource-link Hands equal full God Mode for every source family.
- Live Playwright Hands still requires explicit `allowLive=true`; proof stays synthetic/no-network by default.

## Next

Continue `GOD-MODE-EXTRACTOR-PARITY-GATE-001` and source-specific Skool/MyICOR packet/session cards before any private/auth Hands run.
