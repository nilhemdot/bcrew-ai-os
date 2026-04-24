# Drive / Skool Corpus Crawl Checkpoint

Date: 2026-04-24
Status: captured into active source notes and backlog seeds

## Why This Exists

Steve clarified that Foundation extraction is not just email/meeting mining. It must become a durable extraction team that can keep current sources fresh and mine historical corpora one bounded bite at a time, especially Google Drive, Skool, YouTube/Loom/video links, public web, and old training/course material.

The goal is to make the business more intelligent and to create usable outputs for strategy, ops, sales leadership, marketing, recruiting, agent coaching, course creation, Steve Zahnd personal brand, MarketMasters, and Steve-owned education/monetization.

## External Review Inputs

Claude Code review:

- Current build is on track and ahead of schedule.
- Phase 1 runtime is done/hardened.
- Phase 2 LLM router MVP is real and correctly not yet used for broad migration.
- Phase 3 extraction control is partially built.
- Gmail and Missive scheduling is correct.
- Meeting notes should remain manual until retry/report handling is hardened.
- Next logical moves: meeting retry/report, item-level cursors, first safe Drive crawler bite, later `synthesis:brief` behind router.

Codex review:

- Current build order is right.
- Partial item failures currently mark source crawl target `partial` but do not make the Foundation job fail or warn strongly enough.
- Target `nextRunAt` and job `nextRunAt` are still separate schedule truths.
- Gmail archive output should eventually separate written/refreshed/net-new metrics.
- Proceed narrowly: monitor Gmail/Missive cycles, harden meeting/Drive retry and alerts, consolidate schedule truth, then first Drive bite.

## Drive Roots Captured

The exact shared-drive root list is now in `docs/source-notes/google-drive-corpus.md`.

Roots:

- Zahnd TEAM OG Folder: `0AJ4EQ018BaWwUk9PVA`
- Zahnd Team 2023+: `0AE5bQZviXUrhUk9PVA`
- MarketMasters training folder: `0AJZun9Ce_rOnUk9PVA`
- Zahnd Team 2025: `0ADIecWc1lshCUk9PVA`
- Houseable: `0AHpyJsfILw2DUk9PVA`
- BCrew Marketing Folder: `0AA5XKa6_SqTuUk9PVA`
- BensonCrew Owners Private: `0ACJxbgdxfgESUk9PVA`
- Benson Crew Zahnd Folder: `0AMaaJPwT3l80Uk9PVA`

Key rule: do not move/delete/reorganize originals. Start read-only, record what was inspected, and only propose copies or derived outputs after review.

## Skool Boundary Captured

Skool source note is now in `docs/source-notes/skool-corpus.md`.

Current position:

- Skool remains blocked until access path and content-use boundaries are explicit.
- Do not build blind browser scraping.
- First Skool task is an access-path audit: owned/paid communities, admin/export/Zapier paths, embedded Loom/YouTube/Vimeo/Wistia links, content owner, and reuse permission.

## Backlog / Plan Updates

Updated or added durable work:

- `DRIVE-CORPUS-001`: enriched with exact Drive roots and read-only first crawler bite.
- `SKOOL-001`: enriched with access-path audit and no-blind-scraping rule.
- `EXTRACTION-TEAM-001`: expanded to include Drive/Skool/video/web corpora.
- `EXTRACT-RETRY-001`: failed-item retry and partial-run alert handling.
- `EXTRACT-SCHEDULE-001`: consolidate job and target schedule truth.
- `EXTRACT-METRICS-001`: separate written/refreshed/net-new metrics.
- `WEB-CRAWLER-001`: compliant web/video crawler boundaries.

## Next Build Order

1. Monitor 2-3 scheduled Gmail/Missive cycles.
2. Add meeting/Drive failed-item retry plus partial-run warning/alert semantics.
3. Consolidate job/target schedule truth.
4. Build the first read-only Drive direct-child inventory bite.
5. Keep Skool blocked until access/content-use audit is done.
6. Do not migrate extraction/synthesis behind the LLM router yet.
