# SOURCE-016 Marketing Measurement Source Contracts Closeout

Card: `SOURCE-016`

Closeout key: `marketing-measurement-source-contracts-v1`

Status: shipped.

## What Changed

Closed the no-auth source-contract prep slice of `SOURCE-016`.

GA4, Google Search Console, and Google Business Profile are now first-class Foundation source contracts:

- `SRC-GA4-001`
- `SRC-GSC-001`
- `SRC-GBP-001`

They are registered as source identities and available-pending connector rows, but remain blocked from extraction until property/account/location boundaries, auth posture, allowed reads, and cost/spend rules are approved.

## Proof

- Source contract registry sync: `npm run source-contract-registry:sync -- --apply --actor=codex-source-016-marketing-measurement --json`
- Focused proof: `npm run process:source-016-marketing-measurement-source-contracts-check -- --close-card --json`
- Backlog hygiene: `npm run backlog:hygiene -- --json`
- Full verifier: `npm run foundation:verify` passed 484/484 after refreshing the local dashboard/worker runtime so served source APIs exposed the same 42 source contracts and 16 connectors as repo truth.
- Ship gate: `npm run process:foundation-ship -- --card=SOURCE-016 --planApprovalRef=docs/process/approvals/SOURCE-016.json --closeoutKey=marketing-measurement-source-contracts-v1 --commitRef=HEAD`

## Dogfood

The focused proof rejects:

- missing GA4/GSC/GBP source contracts
- missing available-pending connector rows
- active extraction targets for the new auth-required sources

It also proves Google Ads, Meta, and SocialPilot were not silently marked complete by this card.

## Boundaries

No live extraction, extraction target creation, GA4/GSC/GBP/Google Ads/Meta/SocialPilot provider call, OAuth repair, auth-required or paid run, external write, model call, screenshot capture, transcript fetch, crawl, Drive permission mutation, live Agent Feedback auto-send, Harlan/Fal/voice/Canva/OpenHuman work, Marketing Hub production, or broad UI redesign was introduced.

## Files

- `lib/source-contracts-marketing.js`
- `lib/source-contracts.js`
- `lib/source-contract-validation-layer.js`
- `lib/source-lifecycle-completion.js`
- `lib/source-connector-matrix.js`
- `lib/marketing-measurement-source-contracts.js`
- `lib/foundation-source-contract-verifier.js`
- `lib/foundation-build-closeout-source-records.js`
- `lib/foundation-build-closeout-records.js`
- `scripts/process-source-016-marketing-measurement-source-contracts-check.mjs`
- `scripts/process-source-connector-matrix-check.mjs`
- `package.json`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`
- `docs/process/source-016-marketing-measurement-source-contracts-plan.md`
- `docs/process/approvals/SOURCE-016.json`

## Next

Continue the safe Foundation overnight queue from repo truth. Prefer the next no-auth source/connector gap or source-contract/extraction-readiness cleanup. If the next source card needs auth-required access, paid spend, live extraction, or external writes, mark it blocked with owner/action and move to the next safe Foundation-up card.
