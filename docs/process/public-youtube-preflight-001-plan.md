# PUBLIC-YOUTUBE-PREFLIGHT-001 Plan

## What

Prepare a public YouTube implementation-intel preflight using the creator watchlist and multimodal extractor contract without crawling videos.

## Why

Public YouTube can help Steve implement existing Foundation ideas, but extraction should start only after the system separates public-permitted candidates from paid/auth-required sources and proves the evidence policy.

## Acceptance Criteria

- Preflight reads the existing creator watchlist and identifies public YouTube candidates.
- Paid/auth-required sources are blocked with explicit reason and follow-up cards.
- Preflight builds valid multimodal envelopes for public YouTube sample candidates using transcript/visual-policy fields without starting extraction.
- Preflight reports `extractionStarted: false`, `atomsCreated: 0`, and `paidAuthRequired: false` for the no-auth sprint.
- `PUBLIC-YOUTUBE-PREFLIGHT-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Public YouTube preflight functions are reusable by the later Build Intel Extraction Implementation Sprint.
- Focused proof validates public sample envelopes, paid-source blocking, and no-extraction behavior.
- Current plan/state name the next sprint as the place where real public YouTube extraction can begin.

## Existing Work To Reuse

Reuse `lib/build-intel-watchlist.js`, `lib/multimodal-extractor-contract.js`, `YOUTUBE-SCOUT-001`, `MULTIMODAL-EXTRACTOR-001`, `RESEARCH-INBOX-001`, source contracts, and extraction-control boundaries.

## Details

Existing code to reuse: creator watchlist snapshot, multimodal extraction envelope validation, Research Inbox proposal fields, source contracts, extraction-control source boundaries, and the focused `process:implementation-intelligence-check` script. Existing docs to reuse: this plan, sprint plan, Build Intel intake plans, build-intel direction capture, current plan/current state, and source registry notes. Existing scripts to reuse: `process:implementation-intelligence-check`, `backlog:hygiene`, and `foundation:verify`. Existing backlog truth to reuse: `YOUTUBE-SCOUT-001`, `CREATOR-WATCHLIST-001`, `MULTIMODAL-EXTRACTOR-001`, `PUBLIC-YOUTUBE-PREFLIGHT-001`, `MYICRO-TRAINING-001`, `LOOM-001`, and `SKOOL-001`.

V1 is bounded to no-crawl preflight. The black-box behavior proof must call the actual preflight function path over the creator watchlist and a synthetic weak plan/blocked paid candidate, inspect public YouTube candidate counts, paid/auth blocked counts, a valid multimodal public YouTube envelope, and explicit `extractionStarted: false`, `atomsCreated: 0`, `screenshotsCaptured: 0`, and `paidAuthUsed: false`. No substring-only proof is acceptable.

## Root Invariant

Preflight is not extraction. It prepares allowed candidates and policy envelopes; it does not fetch videos, screenshots, transcripts, atoms, or paid private content.

## Risks

- It could be mistaken for completed YouTube scout work. Mitigation: card name and output say preflight/no-crawl only.
- Public platform policies can change. Mitigation: use public-permitted/official-first language and leave actual extraction to a later guarded sprint.

## Gate Decision

Gate decision tree: static gate is not enough because this validates Build Intel preflight behavior, focused gate proves watchlist and envelope behavior, and full gate runs with the sprint because the blast radius touches shared Build Intel surfaces and verifier coverage. The focused gate must run in under 2 minutes and inspect the real watchlist and multimodal validator outputs; `process:foundation-ship` remains required before push.

## Repair Path

If an envelope violates the multimodal contract or paid source is incorrectly allowed, block the candidate and rerun proof before closeout.

## Operator Value

Operator value: Steve gets a useful real workflow that makes public YouTube ready for the next implementation sprint without requiring paid/private access approval while he is in meetings. This unlocks implementation speed and source quality without rushing auth decisions.

## Tests

- `npm run process:implementation-intelligence-check -- --card=PUBLIC-YOUTUBE-PREFLIGHT-001 --json`
- `npm run foundation:verify`

## Not Next

- Do not crawl YouTube.
- Do not call Gemini, YouTube APIs, Playwright, or OCR.
- Do not connect Skool/myICOR/Loom.
- Do not create atoms, screenshots, transcripts, or backlog cards.
