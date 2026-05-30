# Extraction Lane Item Shape Inspection - 2026-04-28

Purpose: preserve the lane-consistency inspection that preceded the `EXTRACT-METRICS-001` coverage-by-target slice. The query used separate aggregates for item counts and metadata keys so metadata-key expansion did not inflate item totals.

## Result

Most governed extraction lanes already emit `source_crawl_items` with succeeded/skipped/failed state and reason metadata. The material inconsistency was `missive-current-day`: it had successful target runs but zero item rows, which made a coverage-by-target panel uneven and less trustworthy.

Smallest normalization shipped first: Missive current-day now records `missive_conversation` item rows and emits the same target-run summary hooks used by the other governed runners.

## Lane Snapshot

| Target | Item type(s) | Item state after proof |
| --- | --- | --- |
| `slack-current-day` | `slack_channel` | 61 total, 51 succeeded, 10 skipped, 0 failed |
| `gmail-current-day` | `email_thread` | 1437 total, 189 succeeded, 1248 skipped, 0 failed |
| `missive-current-day` | `missive_conversation` | 100 total, 17 succeeded, 83 skipped, 0 failed |
| `meetings-current-day` | `meeting` | 52 total, 52 succeeded, 0 skipped, 0 failed |
| `drive-corpus-backfill` | `drive_file`, `drive_folder`, `drive_link_access_request` | 121 total, 117 succeeded, 4 skipped, 0 failed |
| `drive-content-extract-backfill` | `drive_content_extraction` | 70 total, 45 succeeded, 21 skipped, 4 failed |
| `email-attachments-backfill` | `gmail_attachment` | 15 total, 10 succeeded, 5 skipped, 0 failed |
| `video-link-inventory` | `video_link` | 137 total, 137 succeeded, 0 skipped, 0 failed |
| `video-content-extract-backfill` | `video_content_extraction` | 24 total, 13 succeeded, 11 skipped, 0 failed |

## Proof

- Before normalization, `missive-current-day` had `last_status=succeeded` and `total_items=0`.
- Proof command: `npm run extraction:target -- --target=missive-current-day --force=true --actor=codex-missive-ledger-proof`
- Proof run: `crawl-missive-current-day-20260428142619014-26316f3a`
- Missive proof output: 100 conversations inspected, 17 written/refreshed, 82 already-current skips, 1 empty-thread skip, 0 item failures.
- Runtime Health now reports `missive-current-day` with 100 crawl items and explicit skipped reasons.

## Caveats

- Coverage-by-target UI is not shipped in this slice; `EXTRACT-METRICS-001` owns that next build.
- `drive-content-extract-backfill` still has 4 failed crawl items. Do not build retry/backoff in this slice; keep it in `EXTRACT-RETRY-001`.
- The coverage view should show remaining backlog indicators only where a lane already exposes them instead of inventing false parity.
