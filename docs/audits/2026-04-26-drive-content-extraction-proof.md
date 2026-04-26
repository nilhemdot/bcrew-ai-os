# 2026-04-26 Drive Content Extraction Proof

Purpose: prove that Google Drive corpus work has moved past file inventory into actual source-backed text extraction for strategy prep.

## What Changed

- Added a read-only Drive content extractor: `npm run drive:extract-content`.
- Added governed target: `drive-content-extract-backfill`.
- Added scheduled Foundation job: `drive-content-extract-bite`.
- Added Drive artifact types: `drive_document`, `drive_pdf`, `drive_text`.
- Added grouped Foundation source visibility for the `Strategy Corpus / Shared Intelligence System`.

## Official API Basis

- Google Workspace documents are exported through Drive `files.export`.
- Blob files such as PDFs/plain text are downloaded through Drive `files.get` with `alt=media`.
- Gmail attachment extraction remains a separate lane because Gmail uses `users.messages.attachments.get`.

References:

- https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get

## Commands

```bash
npm run -s extraction:control-seed
npm run -s drive:inventory-corpus -- --target=drive-corpus-backfill --folderId=1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF --folderName="Strategy Folder - Quarterly Strategy and Team Prework" --sensitivity=strategy_internal --maxItems=100 --controlledByTargetRunner=true --actor=drive-strategy-folder-inventory
npm run -s drive:inventory-corpus -- --target=drive-corpus-backfill --folderId=1Mgv9MVu61PKxU8POMhQRgxB7z05V6uuw --folderName="Strategy Folder - Quarterly Strategy and Team Prework / Strategy" --sensitivity=strategy_internal --maxItems=200 --controlledByTargetRunner=true --actor=drive-strategy-folder-inventory
npm run -s extraction:target -- --target=drive-content-extract-backfill --force=true
```

John binder retry proof used the same extractor with a larger governed PDF cap, then the seeded target was updated so future controlled runs inherit that cap:

```bash
npm run -s drive:extract-content -- --target=drive-content-extract-backfill --limit=5 --controlledByTargetRunner=true --maxPdfBytes=80000000 --retrySkippedReasonPrefixes=pdf_too_large_for_v1 --actor=drive-strategy-binder-extraction
```

## Strategy Folder Inventory

Root provided by Steve:

- `Strategy Folder - Quarterly Strategy and Team Prework`
- folder ID: `1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF`

Priority subfolder:

- `Strategy`
- folder ID: `1Mgv9MVu61PKxU8POMhQRgxB7z05V6uuw`

Current strategy-folder inventory:

- `18` folders
- `11` PDFs
- `4` Google Sheets
- `2` Google Docs
- `2` shortcuts
- `0` crawl failures

All strategy-folder items are tagged `strategy_evidence` so they queue before lower-value corpus files.

## Extraction Proof

Total `SRC-GDRIVE-001` extracted artifacts after this pass:

- `22` artifacts
- `433,209` extracted text chars
- `12` `drive_document`
- `10` `drive_pdf`

Priority strategy-folder extracted artifacts:

| Artifact | Type | Text chars |
| --- | --- | ---: |
| `KT Binder MAR 2026.pdf` | `drive_pdf` | `142,435` |
| `Benson Crew Vision and Core Values Doc - 2026 Q1` | `drive_document` | `170,699` |
| `Team Prestrat Template.pdf` | `drive_pdf` | `6,990` |
| `Carson and Steve Notes` | `drive_document` | `6,459` |
| `PreStrat_Q2_2026_Ahsan.pdf` | `drive_pdf` | `12,490` |
| `df4779640_nick_strat_doc_q2_2026.pdf` | `drive_pdf` | `13,696` |
| `PreStrat Doc 2.0_fillable-Georgia.pdf` | `drive_pdf` | `11,077` |
| `PreStrat_Clare_Q2 2026.pdf` | `drive_pdf` | `4,137` |
| `Ryan PreStrat Doc 2.0_fillable (3).pdf` | `drive_pdf` | `7,146` |

## Explicit Skips

Strategy-folder skips are tracked, not silently dropped:

- `4` Google Sheets: `sheet_text_extraction_not_in_v1`
- `2` shortcuts: `unsupported_drive_mime_type_for_v1_text_extraction`
- `1` PDF: `empty_text_after_extraction`

## Interpretation

Drive permissions were not the blocker. The missing piece was extractor implementation.

Drive Docs/PDF/plain-text v1 is now live enough for strategy prep. It does not yet mean full Drive understanding. The next file-type lanes are:

- Sheets extraction
- Slides extraction
- Office conversion
- shortcut target resolution
- OCR/scanned PDFs
- Drive videos/audio through `MULTIMODAL-EXTRACTOR-001`

## Backlog Impact

- `DRIVE-CONTENT-001`: v1 shipped/proved; follow-on file-type extractors remain.
- `DRIVE-WORKER-001`: no longer inventory-only; now owns ongoing Drive inventory + content mission maturity.
- `EXTRACTION-TEAM-001`: now includes Drive Docs/PDF/text extraction as a live runtime slice.
- `EMAIL-ATTACHMENTS-001`: still P0; email body sync does not equal attachment understanding.
- `MEETING-VIDEO-001` / `MULTIMODAL-EXTRACTOR-001`: still P0 for videos, Loom, Skool, YouTube, Drive videos, meeting recordings, screenshots, and demos.
