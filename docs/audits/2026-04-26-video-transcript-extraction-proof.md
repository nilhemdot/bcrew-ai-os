# Video Transcript Extraction Proof - 2026-04-26

Status: Passed

## Scope

This proof covers the first `MEETING-VIDEO-001` / `MULTIMODAL-EXTRACTOR-001` shared-video slice:

- read video URLs from `SRC-VIDEO-001` / `video-link-inventory`
- classify valid YouTube video URLs versus no-subtitle/follow-on cases
- extract YouTube subtitle transcripts
- store timestamped transcript text as source-backed artifacts
- record skips and failures in `source_crawl_items`
- schedule the lane as a small daily mission

This is not yet rich visual video understanding. It is the first transcript route under the shared video-content queue.

## API Basis

- DataForSEO YouTube Video Subtitles live advanced endpoint
- Official reference: https://docs.dataforseo.com/v3/serp-youtube-video_subtitles-live-advanced/

## Implementation

- Script: `scripts/extract-video-content.mjs`
- DataForSEO helper: `lib/dataforseo.js`
- Target: `video-content-extract-backfill`
- Job: `video-content-extract-bite`
- Artifact type: `video_transcript`
- Artifact source: `SRC-YOUTUBE-INTEL-001`
- Extractor version: `video_content_youtube_subtitles_v1`
- Daily quota: `5` video content items
- Text cap: `250,000` chars per artifact

## Live Proof

Controlled run:

```bash
npm run -s extraction:control-seed
npm run -s extraction:target -- --target=video-content-extract-backfill --force=true
```

First run:

- `5` video links inspected
- `4` YouTube transcripts extracted
- `1` YouTube Short returned no subtitle result from DataForSEO
- This no-result class was changed from failure to explicit skip: `youtube_subtitles_unavailable_needs_video_vision_or_transcription`

Clean run after skip handling:

- `5` video links inspected
- `4` transcripts extracted
- `1` no-subtitle item skipped
- `0` crawl item failures
- `16,539` extracted text chars in that run

Current DB proof:

- `8` `video_transcript` artifacts after controlled proof
- `78,219` archived transcript chars after controlled proof
- `8` succeeded `video-content-extract-backfill` crawl items after controlled proof
- `1` skipped no-subtitle item after controlled proof
- target next run: `2026-04-27 14:00:16-04`

Scheduled-worker follow-up:

- Restarted `ai.bcrew.foundation-worker`.
- Worker picked up `video-content-extract-bite` and succeeded at `2026-04-26 14:05:26-04`.

Current DB proof after the controlled proof plus worker follow-up:

- `12` `video_transcript` artifacts
- `235,537` archived transcript chars
- `12` succeeded and `2` skipped crawl items for `video-content-extract-backfill`

Manual priority proof:

- Steve dropped `https://youtu.be/McPot5-N0ys` as a paid Mycro/reference video for agent-system learning.
- The URL was inserted into `video-link-inventory` as `steve_manual_priority`.
- Queue ordering now prioritizes manual Steve priority video items before older discovered links.
- `video-content-extract-backfill` archived `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys`.
- Title: `The AI Team Setup Nobody Talks About`.
- Archived text: `26,316` chars.
- Current DB proof after this follow-up: `13` `video_transcript` artifacts / `261,853` chars, `13` succeeded crawl items, and `6` skipped crawl items.

The Mycro proof also clarified the product boundary: subtitle extraction is a useful first route, but it is not the GOD-mode video extractor Steve wants. Paid trainings, demos, meetings, and walkthroughs need visual/audio understanding of what is shown and done, not only what is spoken.

## Boundaries

Built now:

- YouTube video/Short URL classification
- YouTube subtitle extraction through DataForSEO
- timestamped transcript formatting
- source artifact storage
- explicit skip for no-subtitle videos requiring future vision/transcription
- scheduled daily quota mission

Not built yet:

- YouTube channel/profile watchlist ingestion
- Gemini/GPT visual review for videos without subtitles
- Drive video download/transcription
- Loom extraction
- Zoom recording extraction
- Skool embedded video extraction
- downstream atom/candidate extraction from `video_transcript` artifacts
- GOD-mode visual review with screenshots/keyframes, screen-demo understanding, tool/workflow detection, and audio/visual quality scoring

## Follow-On Cards

- `MEETING-VIDEO-001`: meeting-linked recordings and videos
- `MULTIMODAL-EXTRACTOR-001`: rich visual/audio/video extractor contract
- `YOUTUBE-SCOUT-001`: channel discovery and full creator-intel lane
- `CREATOR-WATCHLIST-001`: channel/profile URLs and approved creator lists
- `EXTRACTION-TEAM-001`: retrieval/atoms/action routing after archive coverage improves
