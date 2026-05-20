# Google Drive Corpus Source Note

Source ID: `SRC-GDRIVE-001`
Last updated: 2026-05-20
Status: V1 Source Boundary Locked for current Foundation read-side reality

## Purpose

Google Drive is a Foundation corpus source. The first job is not to reorganize everything. The first job is to inventory one bounded folder bite at a time, preserve evidence links, classify value, and only propose copies/derived outputs after the system knows what it reviewed.

The original shared drives should not be moved, deleted, or ACL-stripped in this phase.

## Current V1 Boundary

`SRC-GDRIVE-001` is signed off for current Foundation read-side use through:

- delegated Google Workspace Drive reads,
- governed `drive-corpus-backfill` inventory metadata,
- governed `drive-content-extract-backfill` content extraction,
- local Drive document/PDF/spreadsheet/text artifacts with source links and provenance,
- Strategy Folder evidence intake as source evidence, not canonical strategy truth.

This boundary does not approve Drive permission mutation, request-access sends, broad private Drive sweeps, credential or OAuth scope changes, raw Drive exposure to broad team/agent surfaces, media/video/vision extraction, or treating the Strategy Folder as the canonical strategy layer.

Canonical strategy docs, Strategy Hub, and Action Router own cleaned strategy decisions, priorities, owners, and follow-through after Drive evidence is reviewed.

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
- scanned / image-only PDFs can retry through a local OCR fallback (`pdftoppm` + `tesseract`) so handwritten or scanned strategy PDFs do not silently disappear
- plain-text and markdown Drive blobs downloaded through Drive `files.get` with `alt=media`

V1 explicit skips:

- Sheets
- Slides
- Office files
- images / vision OCR
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

- Total Drive content artifacts archived so far: `40`.
- Total extracted Drive text archived so far: `713,744` chars.
- Artifact types: `26` `drive_document`, `13` `drive_pdf`, `1` `drive_text`.
- Strategy/pre-strat Drive artifacts archived so far: `14` / `274,461` chars.
- Priority strategy-folder extracted artifacts include:
  - `KT Binder MAR 2026.pdf` - John strategy/mastermind binder, `142,435` chars
  - `Benson Crew 2026 Q1 Strategic Planning Agenda` - John Q1 agenda, `28,545` chars
  - Q1 agenda linked docs including Steve's Q1 strat doc, Benson Crew Vision/Core Values, Strategic Planning Exercise, and accessible support docs
  - `Team Prestrat Template.pdf` - `6,990` chars
  - `Benson Crew Vision and Core Values Doc - 2026 Q1` - `170,699` chars
  - `Carson and Steve Notes` - `6,459` chars
  - Q2 pre-strat PDFs from Ahsan, Carson, Clare, Georgia, Nick, Ryan, Scott, and the template; fillable PDFs now include PDF form-field text, not only visible template text
  - `Steve Zahnd - Q2 2026 Pre-Strat Draft - AIOS.md` - rewritten as a first-person working draft and archived as markdown
- Current strategy-folder skips are explicit:
  - `4` Sheets: `sheet_text_extraction_not_in_v1`
  - `2` shortcuts: `unsupported_drive_mime_type_for_v1_text_extraction`
  - handwritten/scanned files may archive through rough OCR, but still need the future vision-grade handwriting lane before relying on exact quotes or high-confidence semantic extraction

Pre-strat read-coverage proof on 2026-04-27:

- Endpoint: `/api/strategic-execution/prework-coverage`.
- Purpose: prove which expected Q2 pre-strat participant notes are actually extracted and readable before the live strategy session.
- Current expected rows: Steve Zahnd, Scott Benson, Ryan Campbell, Carson, Georgia Huntley, Nick Bergmann, Clare, Ahsan, and Blake Berfelz.
- Current proof: `9/9` expected rows are readable, `11` current Q2 artifacts are indexed, and `112,122` chars of pre-work text are available to the Strategy source-to-gap surface.
- Read methods:
  - Scott: manual visual review over the handwritten PDF, plus rough OCR retained for search.
  - Ryan, Carson, Georgia, Ahsan: fillable PDF form fields extracted, not just blank template text.
  - Nick, Clare, Blake: PDF text extraction.
  - Steve: first-person AIOS draft markdown in Drive.
- Blake's late upload, `PreStrat Doc 2.0_fillable - Q2 (1)Blake.pdf`, was extracted as `SRC-GDRIVE-001:drive_pdf:1x5UsSybYWbHdZQRN7yE6vnjnXsWnUWa9`.
- The prework coverage API now returns `read_complete`; if any later artifact appears, rerun Drive content extraction and confirm the participant row stays source-backed rather than inferred from packet summaries.

John Q1 agenda link-following proof on 2026-04-26:

- Source doc: `Benson Crew 2026 Q1 Strategic Planning Agenda` (`1WdpCsM4elMgjYf7TJFy-1FHLjk5Io-jhZFxQqoA-Ux0`).
- `ai@bensoncrew.ca` initially lacked access; Steve's delegated Drive access granted `ai@` reader access to the agenda.
- Link inventory found `13` Drive/Docs/Sheets links.
- `10` linked files/folders were accessible and recorded into `source_crawl_items`.
- `4` access gaps were recorded; `1` access-request email was sent from `ai@bensoncrew.ca` to `john@johnkitchens.coach`.
- Steve manually requested access for the remaining linked strategy docs the system could not access.
- Browser/Playwright-style native "Request access" is not proved for AIOS yet because the available local Chrome profile was logged in as `steve.zahnd@bensoncrew.ca`, not `ai@bensoncrew.ca`. Opening the inaccessible John doc in that browser showed Steve's owner/editor view instead of an `ai@` request-access screen.
- Before claiming browser-based Drive access repair as automated, AIOS needs an approved `ai@` browser profile/session preflight: active account, allowed source, login state, request-access button detection, screenshot capture, and recorded result.
- Accessible linked Google Docs were extracted into Drive artifacts before the refreshed Strategy Evidence Packet run.

This proves Drive access was not the main blocker. The blocker was extractor implementation and per-file access/format handling. Docs/Sheets/PDF/text/markdown and rough OCR are now live; Slides, shortcut resolution, Office conversion, high-confidence handwriting/vision, and media remain separate file-type workers.

## Strategy Folder Operating Model

The Strategy Folder is not the canonical strategy. It is the quarterly evidence intake inside `SRC-GDRIVE-001`.

Use this model:

- `SRC-GDRIVE-001` owns the broader Google Drive corpus source.
- The Strategy Folder is a priority strategy-evidence corpus under that source.
- Canonical strategy docs hold the cleaned/current strategy after decisions are made.
- Strategy Hub / Strategic Execution should be the working surface that turns evidence into issues, priorities, owners, decisions, and follow-through.

Quarterly workflow target:

1. Before strategy: inventory and extract the Strategy Folder, John/mastermind material, team pre-work, prior-quarter notes, PDFs, Docs, Sheets, Slides, and any linked videos.
2. During strategy: capture strategic issues, options, decisions, contradictions, owners, open questions, and evidence links.
3. After strategy: update canonical strategy docs through the decision/change path, archive the evidence package, and route execution items into the correct hub/backlog.

What is live now:

- Strategy-folder inventory, Docs/Sheets/PDF/text/markdown extraction, Q1 agenda link inventory, rough scanned-PDF OCR fallback, and a manual visual review for Scott's handwritten pre-strat PDF.
- Source-backed artifacts for the John binder, John Q1 agenda and accessible linked docs, team pre-work, Q2 PDFs, Steve/Carson notes, Scott handwritten scan, Steve Q2 draft, and Q1 vision/core-values material.
- Scott's handwritten pre-strat visual review is captured in `docs/audits/2026-04-26-scott-pre-strat-visual-review.md`; use that note over the raw OCR when asking about Scott's themes until vision-grade extraction is built.

What is still needed before this becomes a high-value strategy engine:

- Slides, shortcut target resolution, Office files, vision-grade handwriting/screenshot extraction, Drive videos, and linked-video extraction.
- Synthesis that turns extracted artifacts into strategy issues, contradictions, risks, priorities, and recommendations.
- Action Router / Strategy Hub handoff so approved outputs become decisions, tasks, questions, or execution records instead of another raw document pile.

## Course-Building Note

Presentations are likely one of the highest-value first corpora. Buyer, seller, and buy-sell presentation assets should eventually become end-to-end training/course outlines. Foundation should extract and classify the material; course production belongs to the right hub after Foundation preserves source links and sensitivity boundaries.
