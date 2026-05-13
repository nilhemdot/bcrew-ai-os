# Build Intel Extraction Implementation Sprint Plan

## What

Run a no-auth Foundation sprint that consumes existing public YouTube transcript artifacts, extracts implementation lessons, routes those lessons to proposal-only Research Inbox items, and generates the first Build Intel brief.

## Why

The previous Build Intel sprints created the creator watchlist, multimodal extractor contract, Research Inbox gate, Internal Scoper, builder lesson linker, and public YouTube preflight. Steve correctly pushed that the system should now use the data it already has. This sprint is the first implementation layer: real transcript input, bounded extraction, proposal output, no paid-source or autonomous-dev drift.

## Acceptance Criteria

- The sprint is visible in live DB before scoping starts, with all five cards in Scoping.
- Every card has complete doctrine and one `plan_critic_runs` pass row with score at least 9.8 before build starts.
- The implementation consumes at least one existing `shared_communication_artifacts` `video_transcript` row as public Build Intel input.
- The multimodal envelope validates against `MULTIMODAL-EXTRACTOR-001` while clearly stating this V1 uses transcript evidence and does not claim screenshots/keyframes.
- Extracted observations become Research Inbox proposals with `proposalOnly=true`, `writesBacklog=false`, and `autoCreateBacklogCard=false`.
- The Build Intel brief exists as a generated handoff and an API-backed Foundation snapshot.
- The proof compares backlog lane/count state before and after extraction and fails if proposals mutate backlog.

## Definition Of Done

- All five cards close in live backlog under closeout key `build-intel-extraction-implementation-v1`.
- `npm run process:build-intel-extraction-check -- --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify` passes.
- `process:foundation-ship` passes after dashboard and worker serve the shipping commit.

## Details

Existing code to reuse: `lib/build-intel-watchlist.js`, `lib/multimodal-extractor-contract.js`, `lib/research-inbox.js`, `lib/implementation-intelligence.js`, `searchSharedCommunicationArtifactsForContext`, Current Sprint helpers, and Foundation verifier patterns.

Existing database truth to reuse: `shared_communication_artifacts`, live `backlog_items`, `foundation_sprints`, `foundation_sprint_items`, and `plan_critic_runs`.

Existing docs to reuse: this plan, the five per-card plans, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the Build Intel direction capture, and the Implementation Intelligence closeout.

The root invariant is: Build Intel can consume public transcript artifacts and produce useful implementation proposals without pretending paid/private extraction happened, without bulk crawling, and without auto-mutating backlog. The check must prove behavior through actual function paths and DB-backed artifacts, not substring-only markers.

Gate decision: full Foundation gate, because this touches API surface, verifier coverage, live backlog closeout, and generated handoff output. The focused proof should run first and be fast enough for default use.

## Risks

- Existing transcripts may not be from the exact 23-creator watchlist. Mitigation: V1 consumes public video artifacts tagged as Steve/manual/build-intel source and labels watchlist URL discovery as a follow-up.
- Transcript-only extraction can miss on-screen implementation details. Mitigation: each envelope explicitly marks visual evidence as not captured and names screenshots/keyframes as next authorized implementation work.
- Proposal output can accidentally become backlog mutation. Mitigation: reuse `RESEARCH-INBOX-001` validation, compare before/after backlog counts, and fail closed on auto-create/auto-move.
- A brief can become a daily digest/director replacement. Mitigation: generated sprint handoff only; no scheduled automation or Director agent.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=YOUTUBE-SCOUT-001 --planApprovalRef=docs/process/approvals/YOUTUBE-SCOUT-001.json --closeoutKey=build-intel-extraction-implementation-v1 --commitRef=HEAD`

## Not Next

- Do not connect Skool, myICOR, Loom, or paid/private sources.
- Do not run broad YouTube crawling, browser screenshot capture, or new public web search.
- Do not create intelligence atoms from videos in this sprint.
- Do not auto-create, auto-close, or auto-move backlog cards from extracted lessons.
- Do not build Directors, Master Director, hubs, marketing content production, Reply/Watching Loop, Telegram bots, or scheduled daily digest automation.
