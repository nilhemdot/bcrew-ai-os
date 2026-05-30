# DATA-002 Source Trust Scoring Closeout

Closeout key: `data-002-source-trust-scoring-v1`

## What Changed

- Added `lib/data-002-source-trust-scoring.js`.
- Added `scripts/process-data-002-check.mjs` and package script `process:data-002-check`.
- Enriched `/api/source-of-truth` with `sourceTrustScoring`, per-contract `trustScore`, and per-source-layer-row `trustScore`.
- Updated Data Sources rendering so source cards show trust score, decision state, and next trigger.
- Completed the GOD-mode extraction sprint after the final approved card and opened `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19` with `MEMORY-003` as the active blocker so Current Sprint truth does not go missing between sprints.

## What It Does

Every source contract now gets a 0-100 trust score with component scores for:

- source trust
- connector health
- freshness
- completeness
- schema health

The score produces a plain-English decision state:

- `decision_safe`
- `usable_with_review`
- `review_required`
- `not_decision_safe`

## Why It Matters

Connector access is not source trust. A source can be readable or connected while still being stale, unsigned, incomplete, schema-risky, or blocked. The score makes that visible before extraction, synthesis, Strategy Hub, or future agents consume the source as evidence.

## Where It Lives

- `lib/data-002-source-trust-scoring.js`
- `lib/source-of-truth-payload.js`
- `public/foundation-source-registry-renderers.js`
- `scripts/process-data-002-check.mjs`
- `docs/process/data-002-source-trust-scoring-plan.md`
- `docs/process/approvals/DATA-002.json`
- `docs/_archive/handoffs/2026-05-19-data-002-source-trust-scoring-closeout.md`
- `package.json` script `process:data-002-check`

## Proof Commands

- `node --check lib/data-002-source-trust-scoring.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js scripts/process-data-002-check.mjs`
- `npm run process:data-002-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DATA-002 --planApprovalRef=docs/process/approvals/DATA-002.json --closeoutKey=data-002-source-trust-scoring-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DATA-002 --closeoutKey=data-002-source-trust-scoring-v1`
- `npm run process:foundation-ship -- --card=DATA-002 --planApprovalRef=docs/process/approvals/DATA-002.json --closeoutKey=data-002-source-trust-scoring-v1 --commitRef=HEAD`

## Known Limits

- No extraction.
- No source sync.
- No browser session.
- No model/provider call.
- No screenshots, OCR, transcription, or broad crawl.
- No source-data mutation.
- No Drive permission mutation.
- No credential or provider config mutation.
- No atom, vector, KB, synthesis, action-route, or backlog writes from source content.
- No Value Builder split.

## Review Next

Start `MEMORY-003` in `FOUNDATION-GOLD-CAPTURE-AND-CAPABILITY-2026-05-19`: capture full conversations in a browsable archive with fidelity classes, privacy/redaction rules, linked decisions/backlog items, and promotion paths so the useful gold from long chats is not lost.
