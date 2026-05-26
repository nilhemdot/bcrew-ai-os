# Source-Family God Mode Extractors V1 Closeout

Card: `SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001`
Closeout: `source-family-god-mode-extractors-v1`

## What Changed

- Added `lib/source-family-god-mode-extractors.js` as the read-only source-family maturity layer.
- Added `scripts/process-source-family-god-mode-extractors-check.mjs` as the focused proof.
- Added `sourceFamilyGodModeMaturity` to the Dev Hub payload.
- Updated `/dev` so the God Mode parity matrix shows freshness, latest successful run, and next best action.

## What It Does

Every required source family now has owner, access boundary, capability level, model/brain route, cadence, latest-success field, freshness state, blockers, next card, next best action, and false-God-Mode evaluation.

The layer sits on top of the existing parity matrix and synthesis freshness watermarks. It makes partial, blocked, planned, waiting, operator-excluded, and no-live-success states visible instead of hiding them behind a generic live label.

## Proof

```bash
node --check lib/source-family-god-mode-extractors.js scripts/process-source-family-god-mode-extractors-check.mjs lib/dev-team-hub.js public/dev.js
npm run process:source-family-god-mode-extractors-check -- --json
npm run process:god-mode-extractor-parity-gate-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:ship-check -- --card=SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001 --planApprovalRef=docs/process/approvals/SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001.json --closeoutKey=source-family-god-mode-extractors-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001 --closeoutKey=source-family-god-mode-extractors-v1
npm run process:foundation-ship -- --card=SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001 --planApprovalRef=docs/process/approvals/SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001.json --closeoutKey=source-family-god-mode-extractors-v1 --commitRef=HEAD
```

## Guardrails

- No extractor run, crawler, login, form, download, purchase, comment read, external write, or destination-ledger write.
- No paid/private/auth source family is approved by this closeout.
- No source family is claimed full God Mode today.
- YouTube comments remain operator-excluded.

## Next

Use the matrix to choose continuation cards: public YouTube catch-up and resource packets, first real approved public/resource Hands packets, GitHub worker scoping, and Steve-approved Skool/MyICOR source packets when Steve is awake.
