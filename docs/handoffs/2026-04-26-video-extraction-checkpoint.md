# 2026-04-26 Video Extraction Checkpoint

## Decision

Video extraction is one shared Foundation system, not one script per source.

The architecture is:

- `SRC-VIDEO-001`: URL manifest and source provenance
- `video-content-extract-backfill`: shared video content queue
- platform-specific extractors plugged into that queue one at a time
- `MULTIMODAL-EXTRACTOR-001`: richer contract for vision/audio/screens/demos/tool walkthroughs

Meeting videos are the first business-critical lane, but the same system must support YouTube, Loom, Skool, Drive videos, Zoom recordings, screenshots, and demos.

## Shipped

- Added `lib/dataforseo.js`.
- Added `scripts/extract-video-content.mjs`.
- Added package script `video:extract-content`.
- Added `video_transcript` artifact type.
- Added `listVideoContentExtractionQueue()`.
- Added target `video-content-extract-backfill`.
- Added scheduled job `video-content-extract-bite`.
- Added target runner and verifier coverage.
- Updated current state, current plan, source registry, and video source note.

## Live Proof

Controlled run:

```bash
npm run -s extraction:control-seed
npm run -s extraction:target -- --target=video-content-extract-backfill --force=true
```

Clean proof after no-subtitle skip handling:

- `5` video links inspected
- `4` YouTube transcripts extracted
- `1` no-subtitle Short skipped with `youtube_subtitles_unavailable_needs_video_vision_or_transcription`
- `0` crawl item failures
- `16,539` chars extracted in the clean run

Current DB totals:

- `8` `video_transcript` artifacts after controlled proof
- `78,219` archived transcript chars after controlled proof
- `8` succeeded and `1` skipped crawl items for `video-content-extract-backfill` after controlled proof

After restarting `ai.bcrew.foundation-worker`, the worker picked up `video-content-extract-bite` and succeeded. Current DB totals:

- `12` `video_transcript` artifacts
- `235,537` archived transcript chars
- `12` succeeded and `2` skipped crawl items for `video-content-extract-backfill`

Manual Steve priority follow-up:

- Steve dropped `https://youtu.be/McPot5-N0ys` from the paid Mycro lane and asked whether the extractor could handle it.
- Inserted it into `video-link-inventory` as `steve_manual_priority`, and updated the queue order so manual Steve priority videos process before older discovered links.
- `video-content-extract-backfill` processed it successfully as `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys`.
- Title: `The AI Team Setup Nobody Talks About`.
- Archived text: `26,316` chars.
- Current DB totals after this proof: `13` `video_transcript` artifacts / `261,853` chars; `13` succeeded and `6` skipped `video-content-extract-backfill` crawl items.
- The video reinforced the architecture split: Foundation/source knowledge is not enough by itself; the later agent layer needs orchestrator, specialist agents, workstreams, task/deliverable inboxes, memory/journaling, and supervised execution.

Proof doc:

- `docs/audits/2026-04-26-video-transcript-extraction-proof.md`

## Still Open

- YouTube channel/profile links need `CREATOR-WATCHLIST-001`.
- YouTube no-subtitle videos need rich video vision/transcription.
- Loom extraction is not built.
- Drive video extraction is not built.
- Zoom recording extraction is not built.
- Skool video extraction is not built.
- `video_transcript` artifacts are archived evidence; downstream candidate/atom extraction is still a follow-on.
- GOD-mode video review is not built. That means no screenshots/keyframes, no screen-demo understanding, no visual tool/workflow detection, and no richer audio/visual analysis yet.

## Capacity Note

Steve said he can buy multiple accounts/seats using emails like `steve.zahnd@bensoncrew.ca`, `ai@bensoncrew.ca`, `crewbert@bensoncrew.ca`, and `harlan@bensoncrew.ca`.

Do not turn this into random account rotation. Treat it as named capacity lanes:

- builder chat lane
- system worker lane
- Claude Code / coding lane
- direct API fallback lane

Each lane needs owner email, allowed workload, model/provider, weekly or monthly budget, pacing, fallback, and kill switch. This belongs under `LLM-HUB-CAPACITY-001`.

## Next Good Moves

1. Run `npm run foundation:verify`.
2. Restart the worker so it sees `video-content-extract-bite`.
3. Add YouTube channel/profile routing to `CREATOR-WATCHLIST-001`.
4. Add the next platform extractor proof: likely Drive video or Loom, depending on the highest-value meeting/strategy links in the manifest.
