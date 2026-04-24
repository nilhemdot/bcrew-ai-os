# Video Link Inventory Source Note

Source ID: `SRC-VIDEO-001`  
Related source IDs: `SRC-LOOM-001`, `SRC-SKOOL-001`, `SRC-GDRIVE-001`  
Last updated: 2026-04-24  
Status: Pending Revalidation

## Purpose

The video corpus is not a manual Steve task. Foundation should discover video/media links from existing archives and future authorized crawlers, dedupe them, preserve source provenance, and classify which extractor can handle each link.

This lane is the manifest before extraction. It does not download videos, scrape Skool, or call Loom.

## Platforms

- Loom
- Google Drive / Google Docs / Google Slides links that may contain recordings, trainings, or source documents
- YouTube
- Vimeo
- Wistia
- Zoom recordings
- Skool classroom/module/post links

## Current Research

- Loom is now under Atlassian. Loom documents that it does not offer a first-party open API for bulk extraction; Loom SDK is for recording, previewing, embedding, and interacting with Looms inside third-party apps, not corpus export.
- Apify has third-party Loom actors that can extract Loom metadata and transcript text from video URLs. The local environment has an `APIFY_API_TOKEN` configured, but it is not yet validated against Steve's Loom workspace or private/authenticated videos.
- `yt-dlp` may be useful as a fallback for public/accessible videos, but it should be treated as an extractor candidate, not the primary governed path.
- Skool classroom videos may point to Loom, YouTube, Vimeo, Wistia, Google Drive, or other embeds. Skool remains blocked for blind crawling; the approved path is to inventory links from authorized sources first, then validate a compliant Skool access workflow.

## Operating Rules

- Do not ask Steve to manually collect hundreds or thousands of links.
- Do not blind-crawl Skool or paid communities.
- Do not store platform passwords in Postgres.
- Do not download private Loom/Skool/creator content until content ownership and allowed use are classified.
- Store the URL manifest in `source_crawl_items` with normalized URL, platform, source provenance, evidence excerpt, and extraction status.
- Treat every route as `link_inventory_only` until a small authorized proof validates transcript/download behavior.

## First Implementation

Manual Foundation job: `video-link-inventory-bite`.

Command:

```bash
npm run video-links:inventory -- --limit=1000
```

What it does:

- scans existing `shared_communication_artifacts`
- scans existing Drive corpus crawl items
- extracts Loom, Drive, YouTube, Vimeo, Wistia, Zoom, and Skool URLs
- writes deduped `video_link` items under target `video-link-inventory`
- makes no external platform requests
- makes no LLM calls

First proof on 2026-04-24:

- Scanned `1,000` existing shared communication artifacts plus `60` Drive inventory items.
- Discovered `144` video/media URL occurrences.
- Stored `104` deduped `video_link` crawl items.
- Deduped platform mix: `34` YouTube, `36` Google Drive, `9` Loom, `24` Skool, `1` Zoom.
- No Loom, Skool, YouTube, Drive, Zoom, or Apify external extraction was attempted.

## Next Proof

When this becomes active work, validate one extractor path at a time:

1. Run `video-link-inventory-bite` to build the first URL manifest.
2. Pick 3-5 Steve-owned Loom URLs from the manifest.
3. Test an Apify Loom actor with `APIFY_API_TOKEN` against those URLs.
4. Record whether each item returns transcript text, metadata, MP4 URL, or a permission failure.
5. Only after that proof, add a `loom-transcript-extract-bite` job.

## Value Routes

- `loom_source`
- `drive_media_or_doc_source`
- `youtube_source`
- `vimeo_source`
- `wistia_source`
- `zoom_source`
- `skool_source`
- `buyer_course`
- `seller_course`
- `sales_training`
- `agent_coaching`
- `presentation_system`
- `marketmasters_training`
- `steve_personal_brand`
- `unchained_monetization`
- `third_party_reference_only`
- `blocked_by_policy`

## Boundary

Inventory is Foundation work. Turning video transcripts into courses, scripts, social posts, agent coaching, or monetization assets belongs to the correct hub after Foundation preserves source links, ownership class, permission class, and sensitivity.
