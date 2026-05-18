# YOUTUBE-BUILD-INTEL-BATCH-001 Plan

## What

Prepare a governed public YouTube Build Intel batch spec for the last 20 relevant public videos per approved creator/channel, without running discovery, transcript extraction, screenshots/keyframes, model calls, or downstream writes.

## Why

Steve wants current agent-building and AIOS implementation content to become source-backed intelligence, not random manual watching. The extractor team needs a queue contract first: which public channels are in scope, how many videos may be considered later, what evidence would be needed, which private surfaces are blocked, and what approval is still required before runtime work starts.

## Acceptance Criteria

- `YOUTUBE-BUILD-INTEL-BATCH-001` has a Plan Critic pass row with score at least 9.8 before closeout.
- Queue specs are built from the existing creator watchlist and `SRC-YOUTUBE-INTEL-001`, not from a live web crawl.
- Each queue spec is capped at the last 20 public videos per channel, or one known public-video seed when only a video URL exists.
- Each queue spec records transcript, keyframe, screenshot, budget, downstream route, and runtime approval posture.
- Private, paid, community, course, Skool, MyICOR, Loom, and authorized-browser surfaces remain blocked.
- Dogfood proves live extraction, over-limit batches, unblocked private sources, and invalid queue specs fail closed.
- Full ship gate passes.

## Definition Of Done

- A reusable module exposes public YouTube Build Intel queue specs and fail-closed validation.
- A focused proof validates source-backed queue specs, source-auth boundaries, last-20 caps, no side effects, Plan Critic, current sprint truth, closeout registry, and verifier coverage.
- The live backlog card closes under `youtube-build-intel-batch-v1`.
- Current Plan and Current State name the closeout and next card.
- No live extraction, public web lookup, transcript fetch, screenshot/keyframe capture, model call, Research Inbox write, KB draft, atom creation, action route creation, external write, or hidden subagent occurs.

## Details

Existing code to reuse: `lib/build-intel-watchlist.js`, `lib/course-source-auth-boundary.js`, `lib/build-intel-extraction-implementation.js`, `lib/multimodal-extractor-contract.js`, Current Sprint helpers, Plan Critic, and verifier modules. Existing docs to reuse: current plan, current state, the Build Intel creator watchlist expansion closeout, and the course source-auth boundary closeout. Existing scripts to reuse: `process:build-intel-creator-watchlist-expansion-check`, `process:course-source-auth-boundary-check`, `backlog:hygiene`, and `foundation:verify`. Existing live backlog truth to reuse: `YOUTUBE-BUILD-INTEL-BATCH-001`, `EXTRACTION-TEAM-001`, `COURSE-SOURCE-AUTH-BOUNDARY-001`, and `EXTRACTION-TO-KB-ATOM-PIPELINE-001`.

Behavior proof must call the real queue-spec builder and validator, not substring checks. The proof must reject a synthetic live-extraction side effect, a synthetic over-20 batch, a synthetic private-source unblocking, and an invalid public queue spec. Static proof is insufficient because the value is the generated queue shape and fail-closed behavior. Focused proof is `npm run process:youtube-build-intel-batch-check -- --json`; full proof is `process:foundation-ship` because the card touches backlog truth, Current Sprint, closeout registry, and verifier coverage.

Useful operator behavior: Steve can open the next extractor planning step and see exactly which public creator channels are safe queue candidates, how many videos a later approved run could touch, what evidence would be needed, and why private/community/course surfaces are still blocked. This turns "go watch these builders" into a governed queue Steve can approve or reject.

Speed and explicit file-size budget: the focused proof should stay under 2 minutes and under 1,500 lines each for the module and process script. The approval json stays under 50 lines as a compact data record. The handoff stays under 100 lines as a compact report artifact. No generated report artifact may grow without a split/archive plan.

## Risks

- Queue prep could drift into live YouTube discovery. Mitigation: this card reads existing watchlist refs only and dogfoods public lookup as a side effect.
- Public creator work could accidentally include paid/community surfaces. Mitigation: the queue spec uses public YouTube refs only and checks the source-auth boundary keeps private rows blocked.
- The last-20 batch could silently expand. Mitigation: queue validation fails if `maxVideos` exceeds 20.
- The card could create unusable specs without downstream routing. Mitigation: each spec records a blocked downstream route and points to `EXTRACTION-TO-KB-ATOM-PIPELINE-001`.
- Repair path: if public refs are missing or unsafe variants pass, keep/reopen the card and fix the watchlist/source-auth boundary instead of running extraction manually.

## Tests

- `node --check lib/youtube-build-intel-batch.js lib/foundation-intelligence-audit-verifier.js scripts/process-youtube-build-intel-batch-check.mjs scripts/foundation-verify.mjs`
- `npm run process:youtube-build-intel-batch-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=YOUTUBE-BUILD-INTEL-BATCH-001 --planApprovalRef=docs/process/approvals/YOUTUBE-BUILD-INTEL-BATCH-001.json --closeoutKey=youtube-build-intel-batch-v1 --commitRef=HEAD`

## Not Next

- Do not run live extraction.
- Do not search YouTube or the public web.
- Do not fetch transcripts, capture screenshots/keyframes, download video, summarize content, run vision, or call a model.
- Do not use paid/private/community/course auth, Skool, MyICOR, Loom, or an authorized browser session.
- Do not write Research Inbox rows, KB drafts, atoms, action routes, or backlog content from extracted material.
- Do not mutate Drive, Gmail, ClickUp, Slack, Agent Feedback, or external systems.
- Do not launch hidden subagents or parallel builders.
