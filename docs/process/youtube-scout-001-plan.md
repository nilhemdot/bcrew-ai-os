# YOUTUBE-SCOUT-001 Plan

## What

Close the first no-auth YouTube Scout implementation slice by consuming existing public YouTube transcript artifacts as Build Intel input and proving the path does not require paid auth or live crawling.

## Why

The old system had a YouTube scout concept, but the new Foundation only had preflight and contracts. Steve wants builder videos to improve how we implement existing Foundation ideas. This card turns the scout from preflight into a bounded consumption path using artifacts already in the archive.

## Acceptance Criteria

- `YOUTUBE-SCOUT-001` has a Plan Critic pass row with score at least 9.8 before build.
- The scout path selects at least one existing public `video_transcript` artifact from `shared_communication_artifacts`.
- The selected artifact is treated as Build Intel only, not marketing content.
- The path does not call Skool, myICOR, Loom, paid/private sessions, new web search, or broad YouTube crawling.
- The snapshot exposes how many artifacts were considered, selected, and blocked/skipped.
- The card closes only after focused proof, backlog hygiene, verifier coverage, and ship gate pass.

## Definition Of Done

- Foundation API exposes a Build Intel extraction snapshot containing YouTube scout selected artifacts.
- The proof shows `paidAuthUsed=false`, `newExternalCrawlStarted=false`, and `atomsCreated=0`.
- The backlog card and sprint item close under `build-intel-extraction-implementation-v1`.

## Details

Existing code to reuse: `lib/build-intel-watchlist.js`, `lib/implementation-intelligence.js`, `searchSharedCommunicationArtifactsForContext`, `lib/foundation-current-sprint.js`, and Foundation verifier helpers. Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the Build Intel direction capture, and this plan. Existing scripts to reuse: `process:build-intel-extraction-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog and Current Sprint truth to reuse: `YOUTUBE-SCOUT-001`, `CREATOR-WATCHLIST-001`, `PUBLIC-YOUTUBE-PREFLIGHT-001`, and the active sprint overlay.

The root invariant is: YouTube Scout V1 consumes known archive truth and does not pretend channel discovery or latest-video extraction is solved. The behavior proof must call the actual function path and API route through a black-box round trip over DB-backed transcript artifacts. Substring-only proof is rejected, and a synthetic weak case must fail if the selector reports extraction while no transcript artifact exists. Channel URL lookup and current public-video discovery stay as explicit next work.

Gate decision tree: static proof is insufficient because this adds API/verifier behavior; focused proof is `npm run process:build-intel-extraction-check -- --json`; full proof is required at sprint close with `npm run foundation:verify` and `process:foundation-ship` because the blast radius includes server/API and verifier coverage. The focused proof should stay fast, targeting under 2 minutes, so it is used by default before the full gate.

## Risks

- Archive artifacts may be public-video transcripts but not exact watchlist rows. Mitigation: select only artifacts with build/AI/team/agent/workflow signal and expose the source reason.
- Over-scoping into current YouTube discovery could require browsing/latest search and more decisions. Mitigation: no new web search or crawling in this sprint.
- Closing the scout can imply the whole creator watchlist is extracting. Mitigation: status note names this as V1 existing-artifact consumption only.
- Repair path: if the selector cannot prove real artifact consumption or falsely claims latest-video discovery, leave/reopen the card, mark the Build Intel snapshot `risk`, and keep the next sprint blocked on explicit URL/discovery work.
- Operator value: Steve and the team get a useful thing for the real workflow: Build Intel starts improving implementation quality and unlocks faster sprint decisions while he is in meetings, without waiting on auth decisions or creating another loose research pile.

## Tests

- `npm run process:build-intel-extraction-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not discover latest uploads.
- Do not connect paid/private creator sources.
- Do not capture browser screenshots.
- Do not create atoms or mutate backlog automatically.
