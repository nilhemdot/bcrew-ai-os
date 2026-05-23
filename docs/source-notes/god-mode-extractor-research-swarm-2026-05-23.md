# God Mode Extractor Research Swarm

Date: 2026-05-23
Card: `GOD-MODE-EXTRACTOR-RESEARCH-SWARM-001`
Report artifact: `research:god-mode-extractor-research-swarm-001`

## Plain-English Decision

Do not scale creator extraction yet. The next build should be an Eyes V0 quality loop over 3-5 exact approved public YouTube videos.

The first Eyes V0 route should be Gemini video understanding over exact public YouTube URLs or approved media references, combined with transcript artifacts, description/resource links, and targeted screenshot/OCR evidence only when needed.

Browser automation and Browse/Hermes-style skills belong in the HANDS layer for navigation, course progress, and approved source interaction. They should not be used as a broad private/auth crawler.

## Source-Backed Findings

### Gemini API video understanding

- Source ID: `SRC-YOUTUBE-INTEL-001`
- Role: `EYES`
- Access: `public_docs`
- URL/path: https://ai.google.dev/gemini-api/docs/video-understanding
- Finding: Gemini can process video with audio and visual streams, can accept public YouTube URLs, emits timestamp-aware observations, and supports custom clipping/FPS for higher-detail moments.
- Transfer to AIOS: Use as Eyes V0 primary path for approved public YouTube videos before any screenshot-heavy browser loop.
- Caution: Default sampling is 1 FPS and can miss rapid visual changes; use clip/FPS only for targeted segments.

### Gemini Live API / realtime video

- Source ID: `SRC-YOUTUBE-INTEL-001`
- Role: `EYES_BRAIN`
- Access: `public_docs`
- URL/path: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live
- Finding: Gemini Live supports low-latency bidirectional text, audio, and video sessions with function calling and session memory.
- Transfer to AIOS: Use later for human-guided live screen sessions or operator co-watching; do not make it the first batch extractor path.
- Caution: Realtime sessions add privacy, session lifecycle, and cost complexity; batch video understanding is cleaner for V0.

### Browserbase Browse.sh browser skills

- Source ID: `SRC-GITHUB-BUILD-INTEL-001`
- Role: `HANDS`
- Access: `public_docs`
- URL/path: https://www.browserbase.com/blog/browse.sh
- Finding: Browse.sh turns repeat website navigation into reusable SKILL.md playbooks so agents do not rediscover the same selectors, endpoints, and gotchas every run.
- Transfer to AIOS: Use a skill/playbook layer for site-specific navigation, course progress, and approved link-follow workflows.
- Caution: Skills improve browser reliability; they do not replace source approvals, rights boundaries, or visual understanding.

### Browserbase skills documentation

- Source ID: `SRC-GITHUB-BUILD-INTEL-001`
- Role: `HANDS`
- Access: `public_docs`
- URL/path: https://docs.browserbase.com/integrations/skills/introduction
- Finding: Browserbase skills cover interactive browser automation, snapshots/screenshots, authentication workflows, fetch APIs, and scheduled/webhook functions.
- Transfer to AIOS: Model AIOS HANDS as governed skills: page fetch first, browser session when needed, screenshots as evidence, scheduled functions only after source packet approval.
- Caution: Auth workflows must stay explicit and approval-bound; never hide credential/profile mutation inside skills.

### Hermes Agent skills ecosystem

- Source ID: `SRC-GITHUB-BUILD-INTEL-001`
- Role: `HANDS_BRAIN`
- Access: `public_docs`
- URL/path: https://hermes-agent.nousresearch.com/docs/ko/user-guide/features/skills
- Finding: Hermes can search/install skills from official, skills.sh, well-known endpoints, GitHub, ClawHub, Claude marketplace repos, LobeHub, and browse.sh.
- Transfer to AIOS: Treat future extractor capabilities as registered skills with source/trust class and install/provenance metadata.
- Caution: Community skill catalogs are untrusted until scanned, pinned, and bounded by a source packet.

### Mark Kashef ClaudeClaw local package review

- Source ID: `SRC-GITHUB-BUILD-INTEL-001`
- Role: `BRAIN_RUNTIME`
- Access: `approved_local_private_review`
- URL/path: docs/source-notes/mark-claudeclaw-build-intel.md
- Finding: ClaudeClaw has useful provider adapter, mission queue, memory, kill switch, exfiltration guard, media-to-Gemini, and dashboard/Hive Mind patterns, but not a complete browser/video God Mode extractor.
- Transfer to AIOS: Transfer architecture patterns, not code: provider seam, mission queue, stuck-run recovery, tool policy, kill switches, media upload route, and Mission Control UX.
- Caution: Do not copy private package code into production paths or commit member-source details beyond approved summaries.

### Kia AI Automations Browserbase/Hermes signal

- Source ID: `SRC-CREATOR-WATCHLIST-001`
- Role: `HANDS`
- Access: `operator_supplied_public_note`
- URL/path: docs/source-notes/kia-ai-automations-build-intel.md
- Finding: Steve flagged Hermes Agent plus Browserbase Browse.sh as a signal that agents are moving toward reliable workers with reusable browser skills.
- Transfer to AIOS: Include browser skill catalogs in the God Mode HANDS roadmap and source-value leaderboard.
- Caution: Skool community crawling remains blocked until public/no-auth or member-source approval is proven.

### AIOS multimodal extractor contract

- Source ID: `SRC-YOUTUBE-INTEL-001`
- Role: `POLICY`
- Access: `repo_truth`
- URL/path: docs/process/multimodal-extractor-001-plan.md
- Finding: AIOS already requires source type, rights/access class, evidence levels, route/cost, source anchors, observations, recommendation, confidence, and no auto backlog mutation.
- Transfer to AIOS: Eyes V0 must emit this envelope, then compare output quality before scale-up.
- Caution: Do not bypass the contract just because video understanding is available.

### Old-system research team harvest

- Source ID: `SRC-GITHUB-BUILD-INTEL-001`
- Role: `PROCESS`
- Access: `repo_truth`
- URL/path: docs/handoffs/2026-05-19-old-system-research-team-harvest-closeout.md
- Finding: The good old-system pattern was source scan, scored finding, synthesis, review/routing, and owner-bound action; the bad pattern was agent sprawl and unsafe browser/auth scripts.
- Transfer to AIOS: God Mode must produce scored findings and review routes, not raw report piles.
- Caution: Do not revive ungoverned old agents.

## Ranked Architecture Options

### 1. Batch Eyes V0: Gemini video understanding plus transcript, description links, and targeted visual/OCR fallback

- Recommendation: `build_next`
- Why: Best fit for the next card: uses approved public YouTube inputs, adds real visual/audio understanding, preserves timestamps/provenance, and avoids building a fragile live browser watcher first.
- Risks: provider quota/cost; fast screen changes can be missed at default FPS; public/private YouTube boundary must stay explicit

### 2. HANDS skill layer: Playwright/Browserbase/Browse-style repeatable site playbooks

- Recommendation: `design_parallel_boundary`
- Why: Needed for Skool/course/community navigation and resource pages, but only after source packets define login, progress, and action boundaries.
- Risks: auth drift; credential/profile mutation; skill trust and stale selectors

### 3. Live Eyes: Gemini Live screen/video co-watching

- Recommendation: `park_for_operator_assisted_v1`
- Why: Promising for human-guided sessions and real-time course walkthroughs, but heavier than needed for first public YouTube comparison.
- Risks: session privacy; stream lifecycle; latency/cost; harder reproducibility

### 4. Bulk screenshot every two seconds

- Recommendation: `reject_as_default`
- Why: Creates noisy artifacts, storage/cost pressure, privacy risk, and brittle interpretation. Use targeted keyframes/OCR only when video model or chapter evidence says visual detail matters.
- Risks: artifact bloat; weak source anchors; token waste; copyright/privacy exposure

## Recommended Eyes V0

- Name: Eyes V0 quality loop
- Scope: 3-5 approved public YouTube videos only
- Primary route: Gemini video understanding over exact public YouTube URL or approved media file reference
- Comparison: current transcript/description mode vs transcript + description/resource links + video visual/audio observations + targeted OCR/keyframes

Steps:

1. Lock exact public video URLs and source IDs.
2. Run current baseline extraction: transcript artifact, visible title/metadata, description/resource links, current recommendations.
3. Run Gemini video understanding with a prompt requiring timestamped visual/audio observations, visible code/tool/workflow moments, and uncertainty flags.
4. Use custom clipping/FPS only for moments where code, diagrams, or fast screen changes matter.
5. Capture targeted browser screenshots/OCR only for specific timestamp/page evidence, never broad screenshot loops by default.
6. Emit multimodal extractor envelope with source anchors, route/cost, evidence levels, recommendation, confidence, and no auto backlog mutation.
7. Score recommendation quality against baseline and decide whether to loop, expand, or stop.

Output fields:

- `sourceId`
- `sourceUrl`
- `videoId`
- `evidenceLevels`
- `timestampedObservations`
- `visibleWorkflowMoments`
- `visibleCodeOrTooling`
- `resourceLinks`
- `recommendationCandidates`
- `qualityDeltaVsBaseline`
- `routeProvider`
- `model`
- `estimatedCostUsd`
- `approvalRequiredItems`
- `skipReason`

Quality rubric:

- Did EYES find implementation details missing from the transcript?
- Did EYES identify tools, code, UI steps, diagrams, or workflows with timestamps?
- Did recommendations become more specific, buildable, and source-backed?
- Did the run preserve rights/access/source boundaries?
- Was cost/latency acceptable for a 3-5 video loop?

## Productization Opportunities

- Standalone extractor product: approved source packet, Eyes/HANDS/BRAIN run, timestamped evidence, recommendation quality score, and approval queue.
- Creator/source value leaderboard: rank sources by useful recommendations adopted into AIOS, not by raw video volume.
- Reusable skill registry: save site-specific HANDS playbooks once they prove reliable and safe.

## Hard Boundaries

- Do not extract Mark last-50 or other creator latest-20 through weak transcript-only/current mode.
- Do not build the Eyes runtime in this research card.
- Do not crawl private, paid, auth, Skool, Discord, Reddit login-only, comments, member, or course sources without exact approval.
- Do not copy private ClaudeClaw package code into AIOS production paths.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not create backlog cards automatically from research findings.
- Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this card.

## Research Hash

`cbe8a8bcfdfbe5e8236fb7e5552229bfcfd1166697262f701e3b35e261c8243d`
