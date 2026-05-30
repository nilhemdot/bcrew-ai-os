# BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 Plan

## What

Close `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001` as the proposal-only review queue for Build Intel extraction outputs.

This card does not crawl new sources, access paid/private content, run browser auth, call OCR/vision/transcription providers, or mutate backlog/atoms from extracted content. It takes the existing governed Build Intel extraction snapshot and turns its observations into daily review items with source anchors, evidence levels, applicability, related backlog cards, recommendations, promote/archive decisions, and approval boundaries.

## Why

Steve wants the old-system research/scout value without old-system report sprawl. Build Intel extraction already has transcript observations and Research Inbox proposal rows, but the outputs still need a durable review queue so learning does not die in reports or transcript piles.

The right behavior is:

- bounded extraction outputs become reviewable items
- every item has evidence/provenance and a decision state
- promote/archive/request-more-evidence options are explicit
- paid/private sources are parked as approval-bound instead of hidden
- nothing auto-writes backlog, atoms, KB, vectors, action routes, or external systems
- Current Sprint advances to `SOURCE-019`

## Acceptance Criteria

- Reuses the existing Build Intel extraction implementation snapshot as upstream input.
- Builds at least one public-ready review item from existing public transcript evidence.
- Parks approval-bound Build Intel sources with source-specific approval language.
- Each review item includes:
  - source ID/title/URL
  - evidence levels and evidence links
  - insight type
  - BCrew applicability
  - related backlog cards
  - recommendation
  - decision state
  - allowed promote/archive/request-more-evidence/block decisions
  - approval/source boundary
- Dogfood rejects:
  - missing source anchor
  - private/paid item marked as promotable
  - raw transcript/content body leakage
  - automatic backlog/atom/KB/external writes
- Current Sprint marks the card done and advances to `SOURCE-019`.

## Definition Of Done

- `process:build-intel-daily-extraction-review-check` passes with `--close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `build-intel-daily-extraction-review-v1`.
- Main is clean and pushed.

## Details

The card adds:

- `lib/build-intel-daily-extraction-review.js` for review item construction, validation, summary, and dogfood.
- `scripts/process-build-intel-daily-extraction-review-check.mjs` for focused proof, backlog/Current Sprint updates, and closeout validation.
- `docs/process/build-intel-daily-extraction-review-001-plan.md`
- `docs/process/approvals/BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001.json`
- `docs/_archive/handoffs/2026-05-19-build-intel-daily-extraction-review-closeout.md`

## Reuse Existing Work

Existing code to reuse:

- `lib/build-intel-extraction-implementation.js`
- `lib/research-inbox.js`
- `lib/multimodal-extractor-contract.js`
- `lib/build-intel-watchlist.js`
- `searchSharedCommunicationArtifactsForContext`
- Current Sprint helpers
- Foundation verifier and ship-gate helpers

Existing docs to reuse:

- `docs/process/build-intel-extraction-implementation-2026-05-13-plan.md`
- `docs/_archive/handoffs/2026-05-19-drive-worker-governed-closeout.md`
- `docs/_archive/handoffs/2026-05-19-old-system-research-team-harvest-closeout.md`
- `docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md`

Existing scripts to reuse:

- `scripts/process-build-intel-extraction-check.mjs`
- `scripts/process-drive-worker-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`

Live backlog and Current Sprint truth to reuse:

- active card `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`
- prior card `DRIVE-WORKER-001`
- next card `SOURCE-019`
- active sprint `FOUNDATION-GODMODE-EXTRACTION-2026-05-19`

## Operator Value

Steve gets a daily Build Intel review queue instead of scattered reports. Each item says what source taught us, what evidence backs it, how useful it may be for BCrew, what card it might enrich, and whether to promote, archive, or request more evidence.

This turns creator/training extraction into a controlled learning loop without pretending that private or paid sources are already approved.

## Not Next

- no automatic backlog mutation
- no atom, KB, vector, action-route, or external writes
- no new public crawl
- no paid/private Skool, Loom, Mycro/myICOR, browser-auth, screenshot, OCR, keyframe, model, or transcription work
- no raw transcript/content body copied into the review queue

Behavior proof:

- `buildBuildIntelDailyExtractionReviewSnapshot()` must be ready from existing Build Intel extraction output.
- `validateBuildIntelReviewItem()` must require source/proof/decision fields and reject unsafe writes/private promotions/content leakage.
- Dogfood must recreate the missing-source, private-promotion, raw-content, and auto-write failures.
- Current Sprint proof must show `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001` done and `SOURCE-019` as active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, Build Intel review proof, and Foundation ship proof are touched.
- focused proof is required for the Build Intel daily review queue and Current Sprint update
- full `foundation:verify` is required
- `process:foundation-ship` is required
- live extraction/provider/private-source work is explicitly not allowed

## Risks

- Risk: the queue becomes another passive report. Mitigation: every item has decision states and allowed promote/archive/request-more-evidence actions.
- Risk: Build Intel review quietly mutates backlog or atoms. Mitigation: validators and dogfood require proposal-only/no-write fields.
- Risk: private/paid sources are treated as ready. Mitigation: paid/private source items must be `blocked_approval`.
- Risk: raw transcript text leaks into review items. Mitigation: validators reject raw transcript/content body keys.

Rollback / Repair path:

If proof fails, leave `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001` executing and repair the focused queue contract. If upstream extraction is stale or missing, park the queue and repair the upstream Build Intel extraction snapshot before proceeding. If private/source-specific approval is required, park that source and continue the next safe sprint card.

## Speed Bounded

The focused proof reads the existing Build Intel transcript search, current backlog/sprint state, package metadata, closeout registry, and at most the bounded existing extraction snapshot. It does not crawl, fetch videos, download media, call providers, or write downstream intelligence records.

The focused proof must stay fast enough to use by default before every ship gate, targeting under 2 minutes locally. Full `foundation:verify` and `process:foundation-ship` remain final protected-path gates, not repeated inner-loop scans.

## Tests

- `node --check lib/build-intel-daily-extraction-review.js scripts/process-build-intel-daily-extraction-review-check.mjs`
- `npm run process:build-intel-daily-extraction-review-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001.json --closeoutKey=build-intel-daily-extraction-review-v1 --commitRef=HEAD`
