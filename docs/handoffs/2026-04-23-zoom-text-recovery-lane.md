# 2026-04-23 Zoom Text Recovery Lane

## What Was Inspected

- Root Drive folder: `1hVEFoc4KHqTY9i67RP8sMOy9kgwfemdP`
- Drive title: `OLD MEETINGS FORM ZOOM`
- Delegated user used for inspection: `steve.zahnd@bensoncrew.ca`

## Folder Shape

- Top-level structure is `folder-per-meeting`
- Meeting folders are named with a date/time prefix, for example:
  - `2024-10-07 13.47.47 Optima Meeting and Review`
  - `2025-01-10 09.07.48 Weekly Leadership Meeting - Review the Week and Plan The Next`
- The historical merger-gap slice `2024-10-01 -> 2025-03-31` is directly usable from the folder names alone

## Actual Artifact Patterns In The Merger-Gap Slice

Scan across `2024-10 -> 2025-03` found:

- `109` meeting folders
- `78` non-empty meeting folders
- `77` Zoom chat exports
  - `meeting_saved_chat.txt`
  - `meeting_saved_new_chat.txt`
  - one `chat.txt`
- `0` caption/transcript files found in this slice
  - no `.vtt`
  - no `.srt`
  - no `*transcript*.txt`
- `6` meeting folders include media:
  - `.mp4`
  - `.m4a`
  - `recording.conf`

## What Was Implemented

New scripts:

- `scripts/sync-zoom-text-archive.mjs`
- `scripts/extract-zoom-chat-candidates.mjs`

Archive behavior:

- scans the uploaded Zoom root folder
- filters to date-prefixed meeting folders
- supports a date range
- ingests high-signal text artifacts into `shared_communication_artifacts`
- maps Zoom chat exports into `artifact_type = meeting_note`
- maps transcript/caption-like files into `artifact_type = meeting_transcript`
- writes Zoom-specific metadata:
  - `meetingPlatform = zoom`
  - `zoomArtifactKind = chat|transcript|caption`
  - root folder id/name
  - meeting folder id/name
  - file id/name
  - inferred meeting class / privacy profile

Extraction behavior:

- reads historical Zoom chat artifacts from `SRC-MEETINGS-001`
- only processes `meeting_note` artifacts with:
  - `importedFromHistoricalZoom = true`
  - `meetingPlatform = zoom`
  - `zoomArtifactKind = chat`
- uses a chat-specific extraction prompt that treats the source as partial context, not a full transcript
- ignores notetaker notices, routine links, attendance logistics, and secret-looking strings
- prioritizes durable merger-era context, marketing phrasing, operating doctrine, decisions, blockers, and reusable atoms

## First Runs Completed

Archive run:

- `79` historical Zoom chat artifacts imported
- date range now in archive: `2024-10-03 -> 2025-03-10`
- artifact type: `meeting_note`
- source: `SRC-MEETINGS-001`

Extraction run:

- `79` archived Zoom chats scanned
- `78` shared-communication candidates created
- examples of covered meeting themes:
  - weekly partner meetings
  - marketing report-outs
  - budget reviews
  - John / ZTeam sessions
  - HomeOptima / Optima
  - buyer mastery / seller mastery
  - support network strategy
  - recruitment resources

## Useful Commands

```bash
node scripts/sync-zoom-text-archive.mjs \
  --folderId=1hVEFoc4KHqTY9i67RP8sMOy9kgwfemdP \
  --start=2024-10-01 \
  --end=2025-03-31 \
  --limit=250
```

Dry run:

```bash
node scripts/sync-zoom-text-archive.mjs \
  --folderId=1hVEFoc4KHqTY9i67RP8sMOy9kgwfemdP \
  --start=2024-10-01 \
  --end=2025-03-31 \
  --limit=250 \
  --dryRun=true
```

Candidate extraction:

```bash
npm run zoom:extract-candidates -- --limit=79
```

## Current Limits

- This is a **text-only** recovery lane
- It does **not** transcribe `.mp4` / `.m4a`
- Most useful merger-gap recovery in this upload is the Zoom chat text, not transcripts
- If Steve wants deeper historical meeting content than chat exports, the next lane is media transcription from the `.mp4` / `.m4a` files
- Zoom-chat candidates should feed synthesis as historical context and content atoms, not as authoritative meeting minutes

## Recommended Next Step After This

1. Use the created Zoom candidates as historical context for merger-era synthesis and content mining.
2. Do not spend on media transcription until a specific missing meeting is worth recovering.
3. If media transcription becomes worth it, run a separate cost-controlled `.mp4` / `.m4a` lane rather than mixing it into this text recovery path.
