# 2026-04-26 Email Attachments Checkpoint

## Context

Steve wanted the source gaps treated as real Foundation work, not chat notes. Drive content extraction v1 was already shipped/proved. The next gap was email attachments because Gmail/Missive body sync does not equal full email understanding.

## Shipped

- Built Gmail attachment extraction v1.
- Added `email-attachments-backfill` extraction target.
- Added `email-attachment-extract-bite` scheduled Foundation job.
- Added `gmail_attachment` artifact type.
- Added Gmail attachment download helper using `users.messages.attachments.get`.
- Added controlled script `scripts/extract-email-attachments.mjs`.
- Added verifier checks for the job, target, caps, artifact type, and source crawl helper.
- Updated shared communications docs, current state, current plan, and source registry.

## Live Proof

Controlled run:

```bash
npm run -s extraction:control-seed
npm run -s extraction:target -- --target=email-attachments-backfill --force=true
```

Result:

- `5` Gmail attachments inspected
- `2` PDF attachments extracted
- `3` images skipped with `image_ocr_requires_multimodal_lane`
- `0` crawl item failures
- `1,949` extracted text chars
- target next run set to `2026-04-27 13:45:20-04`

After restarting `ai.bcrew.foundation-worker`, the worker picked up `email-attachment-extract-bite` and succeeded. Current DB totals:

- `6` `gmail_attachment` artifacts in `shared_communication_artifacts`
- `21,494` extracted attachment chars
- `6` succeeded and `4` skipped crawl items for `email-attachments-backfill`

Proof doc:

- `docs/audits/2026-04-26-gmail-attachment-extraction-proof.md`

## Important Implementation Note

Do not use Gmail's raw `attachmentId` as durable identity. During the proof, the API returned different attachment IDs for the same message/attachment between reads. The script now uses this durable key:

- `mailbox:message_id:part_id:filename:size`

The current `attachmentId` is still used only to download the attachment from Gmail.

## Still Open

- Missive attachment extraction is still not built.
- Office conversion is not built.
- OCR/scanned PDFs are not built.
- Image/audio/video attachment understanding routes to `MULTIMODAL-EXTRACTOR-001`.
- Attachment artifacts are archived as source evidence; downstream candidate extraction from `gmail_attachment` artifacts is still a follow-on.

## Next Good Moves

1. Run `npm run foundation:verify`.
2. Restart the Foundation worker so it sees `email-attachment-extract-bite`.
3. Let the daily email attachment bite advance slowly, or force another run if Steve wants more recent attached PDFs pulled now.
4. Decide whether to build Missive attachment extraction next or move to `MEETING-VIDEO-001`.
