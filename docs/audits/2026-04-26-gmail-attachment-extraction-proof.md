# Gmail Attachment Extraction Proof - 2026-04-26

Status: Passed

## Scope

This proof covers the first `EMAIL-ATTACHMENTS-001` slice:

- Gmail attachment manifest from delegated Gmail
- PDF/text attachment download
- text extraction into `shared_communication_artifacts`
- unsupported-file skip reasons in `source_crawl_items`
- scheduled daily extraction target and Foundation job wiring

Missive attachment extraction is not included in this proof.

## API Basis

- Gmail attachment download: `users.messages.attachments.get`
- Official reference: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get

## Implementation

- Script: `scripts/extract-email-attachments.mjs`
- Target: `email-attachments-backfill`
- Job: `email-attachment-extract-bite`
- Artifact type: `gmail_attachment`
- Extractor version: `gmail_attachment_text_v1`
- Daily quota: `5` attachment items
- Text cap: `250,000` chars per artifact
- Attachment cap: `80,000,000` bytes

Durable dedupe key:

- `mailbox:message_id:part_id:filename:size`

Do not use Gmail's raw `attachmentId` as the durable dedupe key. The proof run showed that `attachmentId` can vary between reads for the same message/part. The script still uses the current `attachmentId` to download, but stores stable crawl/artifact identity by message part.

## Live Proof

Command:

```bash
npm run -s extraction:control-seed
npm run -s extraction:target -- --target=email-attachments-backfill --force=true
```

Result:

- `5` Gmail attachments inspected
- `2` PDF attachments extracted
- `3` image attachments skipped with `image_ocr_requires_multimodal_lane`
- `0` crawl item failures
- `1,949` extracted text chars
- target next run: `2026-04-27 13:45:20-04`

Scheduled-worker follow-up:

- Restarted `ai.bcrew.foundation-worker`.
- Worker picked up `email-attachment-extract-bite` and succeeded at `2026-04-26 13:48:12-04`.

Current DB proof after the controlled run plus worker follow-up:

- `shared_communication_artifacts`: `6` `gmail_attachment` artifacts
- `source_crawl_items`: `6` succeeded, `4` skipped for `email-attachments-backfill`
- total archived attachment text: `21,494` chars

## Boundaries

Built now:

- Gmail PDF extraction through `pdftotext`
- Gmail text-like blob extraction
- explicit skips for images, audio, video, Office, spreadsheets, slides, and calendar invites
- controlled writes only through `extraction:target`

Not built yet:

- Missive attachment extraction
- Office conversion
- OCR / scanned PDFs
- image understanding
- audio/video attachment transcription
- downstream candidate extraction from attachment artifacts

## Follow-On Cards

- `EMAIL-ATTACHMENTS-001`: continue beyond Gmail PDF/text v1
- `MULTIMODAL-EXTRACTOR-001`: OCR, media, and rich attachment review
- `EXTRACTION-TEAM-001`: retrieval/atoms/action routing after archive coverage improves
