# 2026-04-26 Drive Strategy Corpus Checkpoint

Use this if a fresh chat needs to continue strategy-source work.

## Context

Steve wants meetings, email, and Drive dialed in before deeper strategy work. He gave the priority Drive folder:

- Strategy root: `1XsdsQ0Q0LKkbdZYipfZZEXC3__-8PbSF`
- Strategy subfolder: `1Mgv9MVu61PKxU8POMhQRgxB7z05V6uuw`

He uploaded John Kitchens' mastermind/strategy binder there and expects it to inform strategy design without copying it one-for-one.

## What Is Now Working

Drive inventory is no longer the only Drive capability.

Drive content extraction v1 is live for:

- Google Docs
- PDFs
- plain-text Drive blobs

The scheduled extraction target is:

- `drive-content-extract-backfill`

The scheduled Foundation job is:

- `drive-content-extract-bite`

Current target behavior:

- 5 filed text outputs per scheduled run
- 80MB PDF cap
- retry support for prior `pdf_too_large_for_v1` skips
- unsupported files get explicit skip reasons

## Live Proof

Total Drive text artifacts after this pass:

- `22` artifacts
- `451,581` text chars
- `12` Google Docs
- `10` PDFs

Priority strategy artifacts extracted:

- `KT Binder MAR 2026.pdf` - `142,435` chars
- `Benson Crew Vision and Core Values Doc - 2026 Q1` - `170,699` chars
- `Team Prestrat Template.pdf` - `6,990` chars
- `Carson and Steve Notes` - `6,459` chars
- Q2 pre-strat PDFs from Ahsan, Clare, Georgia, Nick, Ryan, and the template

## What Is Still Missing

Drive:

- Sheets extraction
- Slides extraction
- Office file conversion
- shortcut target resolution
- OCR/scanned PDFs
- Drive audio/video through multimodal lane

Other source gaps:

- `EMAIL-ATTACHMENTS-001`: Gmail/Missive attachments
- `MEETING-VIDEO-001`: videos/recordings linked from meeting notes
- `MULTIMODAL-EXTRACTOR-001`: YouTube/channels, Loom, Skool, Zoom, Drive videos, screenshots, demos

## Files Updated

- `scripts/extract-drive-content.mjs`
- `scripts/run-extraction-target.mjs`
- `scripts/seed-extraction-control.mjs`
- `lib/google-delegated.js`
- `lib/foundation-db.js`
- `lib/foundation-jobs.js`
- `lib/source-contracts.js`
- `server.js`
- `public/foundation.js`
- `docs/source-notes/google-drive-corpus.md`
- `docs/source-registry.md`
- `docs/rebuild/current-state.md`
- `docs/audits/2026-04-26-drive-content-extraction-proof.md`

## Next Recommended Move

1. Verify and commit this Drive content slice.
2. Restart the Foundation worker so it picks up the new scheduled Drive content job.
3. Build `EMAIL-ATTACHMENTS-001` next, because email bodies without attachments still miss real strategy evidence.
4. Then build shortcut resolution / Sheets / Slides for Drive, or start the multimodal extractor depending on Steve's priority.
