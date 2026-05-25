# GOD-MODE-EXTRACTOR-PARITY-GATE-001 Plan

## What

Define and enforce what "God Mode Extractor" actually means before more source intelligence is treated as complete.

Plain English: the current YouTube runner is strong video/audio/visual extraction, but it is not full God Mode yet. Full God Mode means the extractor can read, watch, hear, inspect links, capture allowed public comments, use browser hands where approved, preserve evidence, and feed the synthesis/router/Director without making Steve chase context manually.

## Why

Steve's correction is right: if extraction is the system's intelligence intake, it cannot be half-built and then treated as the foundation for Scoper/build decisions.

The system has already watched hundreds of videos through Gemini video/audio/visual analysis. That is valuable, but the name "God Mode" has drifted. The current lane still blocks comments, browser navigation, logged-in/community/course sources, and approved link follow-up. Those gaps must be explicit and fixed before calling extraction complete.

## God Mode Definition

An extractor is God Mode only when it can prove the source-appropriate version of:

- **Eyes:** visual/video/screenshot evidence with timestamps or locations
- **Ears:** audio/transcript/spoken-context understanding
- **Hands:** governed browser or source interaction where approved
- **Reading:** page text, descriptions, docs, comments, posts, resources, and transcripts where allowed
- **Brain:** dedupe, synthesize, score, route, and explain source-backed value
- **Evidence:** every useful claim links back to a source, artifact, timestamp, URL, comment sample hash, or report
- **Boundaries:** paid/private/auth/member/course/comment limits are enforced by source packet, not by memory
- **Output:** findings feed Foundation pool, source grading, Director, and hub views without auto-creating build cards

## Acceptance Criteria

- The UI and docs stop calling the current public YouTube video/audio/visual lane "full God Mode" unless it has the full source-appropriate capability set.
- A capability matrix exists for each extractor family:
  - YouTube short videos
  - YouTube long courses
  - YouTube comments
  - public web/resource links
  - GitHub/repos
  - Skool/free communities
  - Skool/paid courses
  - MyICOR/paid training
  - Google Drive/Meet training corpus
  - Gmail/Missive
  - Slack
  - meetings/transcripts
- The matrix marks each capability as `working`, `manual proof only`, `planned`, `blocked by source packet`, or `not applicable`.
- Public YouTube extraction does not count as complete until comments and approved public resource follow-up have an owned route or an explicit blocked reason.
- Logged-in/community/course sources do not count as God Mode until hands/session boundaries and source packets are approved and proven.
- Dev Scoper/build promotion is paused for major AIOS build decisions until the baseline source set is caught up through the highest available God Mode lane or explicitly marked incomplete.
- Proof output shows which already-watched videos were video/audio/visual only and which have been upgraded to full source-appropriate God Mode.

## Definition Of Done

- Add or update docs/UI wording so "God Mode" is not used loosely.
- Add a focused proof that fails if a source is labeled full God Mode while comments/hands/links/source-packet status are missing.
- Add Dev Hub capability fields so Steve can see what each extractor actually does.
- Update current sprint order so `DEV-BUILD-OPPORTUNITY-SCOPER-001` does not become the next major build-promotion step before extractor parity/catch-up.

Proof command:

```bash
npm run process:god-mode-extractor-parity-gate-check -- --json
```

## Not Next

- Do not crawl paid/private/auth sources from this card.
- Do not auto-approve links.
- Do not auto-create backlog cards from extracted ideas.
- Do not rerun every historical video until the parity gate identifies which lane and depth is needed.
