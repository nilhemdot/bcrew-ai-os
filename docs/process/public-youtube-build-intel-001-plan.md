# PUBLIC-YOUTUBE-BUILD-INTEL-001 Plan

## What

Build the selector that turns already-archived public YouTube transcript context into governed Build Intel inputs.

## Why

Steve clarified the YouTube sources are primarily for implementation guidance, not marketing material. We already have `video_transcript` artifacts in the archive. This card makes those artifacts usable before investing in new discovery/auth work.

## Acceptance Criteria

- `PUBLIC-YOUTUBE-BUILD-INTEL-001` has a Plan Critic pass row with score at least 9.8 before build.
- The selector reads actual archive context through a DB-backed function path.
- Selection is based on Build Intel signals such as AI team setup, agents, workflows, folder structure, prompts, memory, dashboards, or implementation process.
- The selector reports skipped/blocked classes instead of silently treating all transcripts as useful.
- The proof proves at least one selected artifact and at least one skipped artifact or skipped reason.
- No external network, paid auth, new crawl, or atom creation occurs.

## Definition Of Done

- A reusable Build Intel extraction module exposes selected public transcript inputs.
- Focused proof validates selected artifact count, source anchors, content-use boundary, and no side effects.
- The backlog card and sprint item close under `build-intel-extraction-implementation-v1`.

## Details

Existing code to reuse: `searchSharedCommunicationArtifactsForContext`, `lib/build-intel-watchlist.js`, `lib/multimodal-extractor-contract.js`, `lib/implementation-intelligence.js`, Current Sprint helpers, and Foundation verifier helpers. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the Build Intel direction capture, and this plan. Existing scripts to reuse: `process:build-intel-extraction-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog and Current Sprint truth to reuse: `PUBLIC-YOUTUBE-BUILD-INTEL-001`, `YOUTUBE-SCOUT-001`, `MULTIMODAL-EXTRACTOR-001`, and `PUBLIC-YOUTUBE-PREFLIGHT-001`.

The root invariant is: selected artifacts are inputs for implementation intelligence only and are not treated as permission to bulk crawl, scrape, screenshot, or ingest paid/private content. The behavior proof must call the actual function path and API route through a black-box round trip over DB-backed transcript artifacts. Substring-only proof is rejected, and a synthetic weak case must fail if the selector reports a selected artifact from metadata-only input.

Gate decision tree: static proof is insufficient because selection must prove DB/API behavior; focused proof is `npm run process:build-intel-extraction-check -- --json`; full proof is required at sprint close with `npm run foundation:verify` and `process:foundation-ship` because the blast radius includes Foundation API and verifier behavior. The focused proof should stay fast, targeting under 2 minutes.

## Risks

- A selector could become too broad and include unrelated marketing or real-estate content. Mitigation: require Build Intel keyword/theme signal and expose skipped reasons.
- A selector could become too narrow and miss useful videos. Mitigation: V1 starts with conservative patterns and leaves broad discovery to the next sprint.
- Public transcript use can drift into quoting too much source content. Mitigation: brief/proposals paraphrase and cite source anchors instead of reproducing transcript text.
- Repair path: if selection is empty, overbroad, or not DB-backed, leave/reopen the card and mark the snapshot `risk` rather than fabricating observations.
- Operator value: Steve and the team get a useful thing for the real workflow: public builder-video signal improves implementation quality and unlocks faster card enrichment from existing archive truth instead of another contract-only sprint.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not search the public web for new videos.
- Do not use paid/private credentials.
- Do not store transcript excerpts in backlog cards.
- Do not create intelligence atoms from videos.
