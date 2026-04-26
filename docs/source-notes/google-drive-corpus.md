# Google Drive Corpus Source Note

Source ID: `SRC-GDRIVE-001`
Last updated: 2026-04-26
Status: Pending Revalidation

## Purpose

Google Drive is a Foundation corpus source. The first job is not to reorganize everything. The first job is to inventory one bounded folder bite at a time, preserve evidence links, classify value, and only propose copies/derived outputs after the system knows what it reviewed.

The original shared drives should not be moved, deleted, or ACL-stripped in this phase.

## Shared Drive Roots

| Root | Folder ID | Initial value hypothesis | Sensitivity |
| --- | --- | --- | --- |
| Strategy Folder - Quarterly Strategy and Team Prework | `1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF` | Current strategy folder Steve identified for last-quarter strategy, current-quarter pre-work, team inputs, and the incoming John strategy book. This should be processed before lower-value historical Drive folders for strategy readiness. | strategy-internal |
| Zahnd TEAM OG Folder | `0AJ4EQ018BaWwUk9PVA` | Older Zahnd Team systems, scripts, presentations, sales/training IP, historical operations material. | internal |
| Zahnd Team 2023+ | `0AE5bQZviXUrhUk9PVA` | More recent Zahnd Team operating assets and training material. | internal |
| MarketMasters training folder | `0AJZun9Ce_rOnUk9PVA` | Buyer/seller presentation work, newer training videos, course-building source material. | Steve / MarketMasters |
| Zahnd Team 2025 | `0ADIecWc1lshCUk9PVA` | Current Zahnd Team assets and possible live operating material. | internal |
| Houseable | `0AHpyJsfILw2DUk9PVA` | High-value old CRM/product/IP corpus. Likely contains course ideas, systems, and reusable software/training material. | Steve-owned / sensitive |
| BCrew Marketing Folder | `0AA5XKa6_SqTuUk9PVA` | Marketing assets, campaigns, possible brand/content source material. | marketing |
| BensonCrew Owners Private | `0ACJxbgdxfgESUk9PVA` | Owner-private material that may be useful for strategy but must not leak to hubs or public content. | owners-private |
| Benson Crew Zahnd Folder | `0AMaaJPwT3l80Uk9PVA` | Mixed Benson Crew / Zahnd Team working corpus. | internal |

## Crawl Doctrine

- Start read-only.
- Crawl one root/folder bite at a time.
- Record every inspected folder/file in `source_crawl_items` or a Drive-specific crawl table before extracting content.
- Do not review the same unchanged file twice; key by `drive_file_id:modified_time` for v1.
- Do not move originals.
- Copy or create derivative course/content outputs only after a review step approves it.
- Keep source links attached to every extracted atom, course outline, SOP idea, recruiting proof point, or strategy signal.

## Initial Value Routes

Use these `value_route` tags while classifying Drive items. In the inventory stage these are candidate routes inferred from metadata only; they are not facts until content review confirms them.

- `strategy_evidence`
- `ops_sop`
- `sales_training`
- `agent_coaching`
- `buyer_course`
- `seller_course`
- `presentation_system`
- `content_script`
- `youtube_source`
- `recruiting_proof`
- `marketmasters_training`
- `steve_personal_brand`
- `unchained_monetization`
- `software_product_ip`
- `archive_only`
- `sensitive_skip`

## First Crawler Bite

The first safe Drive crawler should:

- accept a root folder ID and a crawl target key
- list direct children only
- store folder/file metadata, MIME type, modified time, owner, URL, parent, and skip reason
- classify which files are ready for the content extractor and which need later file-type workers
- skip Sheets, Slides, videos, audio, shortcuts, and unknown binary files in v1 with explicit skip reasons
- avoid LLM calls until inventory and evidence links are captured
- produce a review report instead of moving/copying anything

First proof on 2026-04-24:

- Manual Foundation job: `drive-corpus-inventory-bite`.
- Target: `drive-corpus-backfill`.
- Root inspected: `Zahnd TEAM OG Folder` (`0AJ4EQ018BaWwUk9PVA`).
- Result: `60` direct children inventoried, `24` child folders discovered, `36` files discovered, `0` crawl item failures.
- Cursor state now has `1` inspected folder and `31` queued folders/roots for later bounded bites.
- No files were moved, copied, exported, or sent to an LLM.

Priority strategy-folder proof on 2026-04-26:

- Root provided by Steve: `Strategy Folder - Quarterly Strategy and Team Prework` (`1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF`).
- Priority subfolder: `Strategy` (`1Mgv9MVu61PKxU8POMhQRgxB7z05V6uuw`).
- Inventory found direct/current strategy material plus Q1/Q2 strategy subfolders.
- Current strategy folder inventory summary: `18` folders, `11` PDFs, `4` Sheets, `2` Google Docs, and `2` shortcuts.
- Every discovered item is tagged `strategy_evidence` so strategy material queues ahead of lower-value corpus inventory.

## Content Extraction V1

Drive inventory is not enough for strategy work. V1 content extraction now has a separate target:

- target: `drive-content-extract-backfill`
- command: `npm run extraction:target -- --target=drive-content-extract-backfill`
- source: `SRC-GDRIVE-001`
- schedule: daily quota mission
- quota: `5` filed text outputs per run
- governed large-PDF cap: `80,000,000` bytes with retry for prior `pdf_too_large_for_v1` skips

V1 supported content:

- Google Docs exported through Drive `files.export` as plain text
- PDFs downloaded through Drive `files.get` with `alt=media`, then parsed with `pdftotext`
- plain-text Drive blobs downloaded through Drive `files.get` with `alt=media`

V1 explicit skips:

- Sheets
- Slides
- Office files
- images / OCR
- audio / transcription
- video / multimodal review
- unknown or unsupported MIME types

Every extracted file is written to `shared_communication_artifacts` with:

- Drive file ID
- source URL
- MIME type
- content hash
- owner
- parent path / source folder
- sensitivity
- value route
- source crawl item key
- extraction target key
- extractor version

Every unsupported file should receive an explicit skip reason through the extraction item ledger instead of disappearing silently.

Proof on 2026-04-26:

- Total Drive content artifacts archived so far: `22`.
- Total extracted Drive text archived so far: `433,209` chars.
- Artifact types: `12` `drive_document`, `10` `drive_pdf`.
- Priority strategy-folder extracted artifacts: `12`, including:
  - `KT Binder MAR 2026.pdf` - John strategy/mastermind binder, `142,435` chars
  - `Team Prestrat Template.pdf` - `6,990` chars
  - `Benson Crew Vision and Core Values Doc - 2026 Q1` - `170,699` chars
  - `Carson and Steve Notes` - `6,459` chars
  - Q2 pre-strat PDFs from Ahsan, Clare, Georgia, Nick, Ryan, and the template
- Current strategy-folder skips are explicit:
  - `4` Sheets: `sheet_text_extraction_not_in_v1`
  - `2` shortcuts: `unsupported_drive_mime_type_for_v1_text_extraction`
  - `1` PDF: `empty_text_after_extraction` (likely scanned/image-only or otherwise textless)

This proves Drive access was not the blocker. The blocker was extractor implementation. Docs/PDF/text v1 is now live; Sheets, Slides, shortcut resolution, OCR, Office conversion, and media remain separate file-type workers.

## Course-Building Note

Presentations are likely one of the highest-value first corpora. Buyer, seller, and buy-sell presentation assets should eventually become end-to-end training/course outlines. Foundation should extract and classify the material; course production belongs to the right hub after Foundation preserves source links and sensitivity boundaries.
