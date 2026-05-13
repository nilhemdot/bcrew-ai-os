# MULTIMODAL-EXTRACTOR-001 Plan

## What

Define the governed multimodal extractor contract that future YouTube, Skool, myICOR, Loom, Drive video, screenshots, and web-demo workers must produce before they can create atoms or proposals. This is a narrow V1 contract card, not an extraction implementation.

## Why

Steve is right that builders show the important stuff on screen, but the old system failed by jumping from desire to messy agents and ungoverned extraction. The contract has to define what was said, shown, clicked, demonstrated, and implied, while also recording source rights, route/cost provenance, evidence level, skip reasons, and whether the finding is adopt/adapt/ignore for AIOS.

## Acceptance Criteria

- A reusable contract module defines supported input types, evidence levels, source access classes, required output fields, and policy decisions.
- Public YouTube policy defaults to official/permitted discovery plus Gemini/video-understanding routes before browser screenshots.
- Authorized paid/private sources require account/session preflight, content-use boundary, and screenshot/keyframe storage policy before extraction.
- The contract requires timestamps/page anchors, source links, transcript/text evidence, visual observations where allowed, route/cost metadata, confidence, skip reasons, and Build Intel recommendation fields.
- The contract names the next implementation sprint without starting extraction.
- Plan Critic has a pass row with score at least 9.8 before build.

## Definition Of Done

- The extractor contract can validate sample extraction envelopes for transcript-only, public-video visual, and authorized-browser-session cases.
- Focused proof rejects missing rights class, missing route/cost metadata, screenshot storage without policy, and auto-backlog mutation.
- The backlog card closes only after focused proof, backlog hygiene, and Foundation verifier pass.

## Details

Existing code to reuse: video content extraction target boundaries, source crawl ledger concepts, LLM route/provenance doctrine, source contracts for `SRC-VIDEO-001`, `SRC-YOUTUBE-INTEL-001`, `SRC-SKOOL-001`, `SRC-LOOM-001`, and `SRC-MYICRO-001`, and Foundation verifier patterns. Existing docs to reuse: `docs/source-notes/video-link-inventory.md`, `docs/source-notes/skool-corpus.md`, `docs/source-notes/myicro-training.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and `docs/handoffs/2026-05-13-build-intel-direction-capture.md`.

Existing scripts to reuse: the focused Build Intel intake proof, `backlog:hygiene`, and `foundation:verify`. Existing live backlog truth to reuse: `MULTIMODAL-EXTRACTOR-001`, `WEB-GODMODE-001`, `YOUTUBE-SCOUT-001`, `MYICRO-TRAINING-001`, `SKOOL-001`, and `LOOM-001`.

The root invariant is: GOD-mode extraction readiness requires a governed output contract and policy decisions before crawling. The black-box proof should call validator functions, round-trip sample envelopes through allowed and rejected cases, and verify public YouTube, authorized paid/private, and transcript-only behavior. No substring-only proof is acceptable.

Gate decision: focused proof for the contract and full Foundation verify because the contract becomes shared extraction doctrine. Blast radius is validation/contract code and docs only; no external source is touched.

Repair path: if proof fails or the contract allows screenshot/keyframe storage without a content-use policy, return the card and block extraction implementation cards from using the contract. If a source class is ambiguous, fail closed as `requires_steve_access_decision`.

Operator value: Steve gets a clean "how AIOS watches/reads builder material" contract that preserves the on-screen workflow value without turning public YouTube or paid courses into ungoverned browser scraping.

Speed bound: the focused proof targets under 2 minutes with synthetic envelopes only; it does not call external video, browser, or model APIs.

## Risks

- Contract overreach could become implementation. Mitigation: no network extraction, no login flow, no atoms, no screenshots in this card.
- Public-video policy could become too timid. Mitigation: the contract permits richer visual understanding through approved video/model routes and explicit screenshot policy; it only blocks default bulk browser scraping.
- Paid-source extraction could bypass rights boundaries. Mitigation: required access class and content-use fields fail validation when absent.

## Tests

- `npm run process:build-intel-intake-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not build the YouTube scout worker.
- Do not connect Skool, myICOR, Loom, Zoom, or Drive videos.
- Do not store screenshots/keyframes.
- Do not generate intelligence atoms or Build Scoper proposals.
- Do not start broad extraction, crawl paid sources, or change provider spending policy.
