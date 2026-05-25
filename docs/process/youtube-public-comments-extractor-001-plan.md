# YOUTUBE-PUBLIC-COMMENTS-EXTRACTOR-001 Plan

## What

Integrate public YouTube comment signal into the approved YouTube extractor lane.

Plain English: a one-off comment proof is not enough. If comments help validate whether builders care about a workflow, the batch extractor needs a governed comments route that can run on approved public videos.

## Why

Steve expected comments to be part of God Mode. The system has proof that a specific important comment can matter, but the main runner still excludes comments. That creates a quality gap and a naming gap.

## Acceptance Criteria

- Public/no-auth YouTube comments can be captured for approved videos when allowed by the source route.
- Comment capture is bounded:
  - top/relevant comments only
  - no login
  - no replies/member/private surfaces unless separately approved
  - no social crawling beyond the exact video
- Each captured comment signal stores:
  - video ID and URL
  - comment author handle or public display name when visible
  - comment text hash and safe excerpt
  - rank/relevance reason
  - capture timestamp
  - source artifact/report ID
  - whether it validates, challenges, or expands the video extraction
- Comment signal merges with transcript/audio/visual/resource evidence before Director ranking.
- The Dev page shows whether a video has comment signal, not just visual evidence.
- Existing one-off David/Ondrej comment proof is marked as `manual proof only`, not pipeline-complete.

## Definition Of Done

- Add a public-comment route or extractor module.
- Add a focused proof with synthetic and live-safe public fixtures.
- Update the YouTube full-watch runner to optionally include comment capture after the parity gate allows it.
- Update source notes/reports so comment evidence is visible and source-linked.

## Current V1 Proof

V1 now defines the public-comments evidence contract, safety gate, and a YouTube Data API public-comment adapter. The adapter is dogfooded with a fake fetch and blocks cleanly when no `YOUTUBE_DATA_API_KEY` / `YOUTUBE_API_KEY` is configured.

Run:

```bash
npm run process:youtube-public-comments-extractor-check -- --json
```

The proof must show:

- exact-video only
- public/no-auth only
- no cookies or logged-in browser session
- no author-profile crawling
- no automatic outbound-link following
- comment links become source packets first
- each comment has video/source provenance, comment ID, safe excerpt, text hash, author hash, capture timestamp, report artifact, signal role, and relevance reason
- the live adapter uses the public YouTube Data API `commentThreads` endpoint only
- missing API key, API failure, disabled comments, or quota failure block without downstream writes
- the proof packet is report-only and does not start crawlers, write backlog cards, or write external systems

Do not call comments “working” in the normal YouTube batch lane until a real API key is configured and the full-watch runner stores comment evidence beside transcript, audio, visual, and resource-link evidence.

## Not Next

- Do not log in to YouTube.
- Do not crawl comment author profiles.
- Do not scrape private/member-only comments.
- Do not treat comment claims as verified facts without evidence review.
