# 2026-04-24 Video Link Inventory Checkpoint

## What Changed

Steve got Loom admin access through Atlassian and clarified that old Loom/Skool/Zoom/Drive video content is not optional. The system must discover and mine it; Steve should not manually collect hundreds or thousands of links.

This checkpoint adds the first governed Foundation slice for that work without derailing current runtime/router/extraction priorities.

## Decisions

- Create `SRC-VIDEO-001` as the system-owned video/media URL manifest.
- Create `SRC-LOOM-001` as a separate Loom source contract because Loom has its own access/extraction policy.
- Keep Skool blind crawling blocked. Use existing archives and authorized paths first.
- Treat Loom/Apify as extractor candidates, not trusted ingestion until a small authorized proof succeeds.
- Do not store platform passwords in Postgres.
- Do not download or transcript private/purchased/third-party content until ownership/use class is known.

## Research Captured

- Loom/Atlassian says Loom does not offer a first-party open API. Loom SDK supports recording/previewing/embedding/interacting with Looms in third-party apps; it is not a bulk extraction API.
- Apify has Loom actors that may extract metadata/transcripts from Loom URLs. `APIFY_API_TOKEN` exists locally, but it is not validated against Steve's Loom workspace or private videos.
- `yt-dlp` may be a fallback for accessible videos, but it is not the governed default path.

Useful refs:

- `https://support.atlassian.com/loom/docs/does-loom-have-an-open-api/`
- `https://apify.com/automation-lab/loom-scraper`

## Code Added

- `scripts/inventory-video-links.mjs`
- `npm run video-links:inventory`
- manual Foundation job: `video-link-inventory-bite`
- extraction target: `video-link-inventory`
- source note: `docs/source-notes/video-link-inventory.md`
- source contracts: `SRC-VIDEO-001`, `SRC-LOOM-001`

## First Proof

Command:

```bash
npm run video-links:inventory -- --limit=1000
```

Result:

- scanned `1,000` shared communication artifacts
- scanned `60` Drive inventory items
- discovered `144` video/media URL occurrences
- stored `104` deduped `video_link` crawl items
- deduped platform mix: `34` YouTube, `36` Google Drive, `9` Loom, `24` Skool, `1` Zoom
- no external platform crawl, no video download, no Apify call, no LLM call

## Verification

- `node --check scripts/inventory-video-links.mjs` passed.
- `npm run video-links:inventory -- --dryRun=true --limit=300` passed.
- `npm run video-links:inventory -- --limit=1000` passed.
- `npm run extraction:control-seed` seeded `9` targets.
- Dashboard API was restarted so it picked up the new source contracts.
- `npm run foundation:verify` passed `26/26`.

## Next Work

Do not derail current Foundation closeout for Loom extraction yet.

When this lane becomes active:

1. Pick 3-5 Steve-owned Loom URLs from `video-link-inventory`.
2. Test one Apify Loom actor using the configured token.
3. Record whether each URL returns transcript text, metadata, MP4 URL, or permission failure.
4. Add `loom-transcript-extract-bite` only after that proof.
5. Later, add authorized Skool page/course inventory that records lesson hierarchy and embedded links without blind scraping.
