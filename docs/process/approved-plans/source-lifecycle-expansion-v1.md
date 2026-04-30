# SOURCE-LIFECYCLE-EXPANSION-001 Approved Plan

Approval score: 9.8/10
Approved by: Steve
Approved at: 2026-04-30T17:38:00Z
Closeout key: `source-lifecycle-expansion-v1`

## Goal

Expand the source lifecycle layer so missing and underdeveloped source lanes are clearly connected, verified, extracted, reviewed, retried, or parked through evidence-backed status.

This is source lifecycle visibility/control only. It improves source coverage clarity without random corpus expansion.

## Scope

- Add an additive API: `/api/foundation/source-lifecycle`.
- Add Foundation route: `/foundation#source-lifecycle`.
- Use existing source contracts, grouped source systems, Foundation jobs, and extraction-control targets.
- Cover all 35 source contracts and all 12 governed extraction targets.
- Show included source lanes, parked/blocked lanes, extraction caps, target state, lifecycle definitions, and metadata-only evidence refs.
- Keep `/api/source-of-truth` backward-compatible.

## Included Lanes

- Shared communications: `SRC-GMAIL-001`, `SRC-MISSIVE-001`, `SRC-MEETINGS-001`, `SRC-SLACK-001`.
- Drive/corpus text: `SRC-GDRIVE-001`.
- Video manifest/transcripts: `SRC-VIDEO-001`, `SRC-YOUTUBE-INTEL-001`.
- Explicit parked/blocked visibility: `SRC-SKOOL-001`, `SRC-LOOM-001`, `SRC-MYICRO-001`, `SRC-CREATOR-WATCHLIST-001`.

## Excluded Lanes

- No new extraction targets.
- No extraction quota increases.
- No broad corpus expansion.
- No Strategy Hub activation.
- No Scoper.
- No Agent Factory.
- No research cleanup.
- No Action Review applying.
- No new feature lane.
- No Missive attachment implementation.
- No Drive Slides/Office/shortcut/media/OCR expansion.
- No Loom, Skool, or Mycro crawler/browser extraction.
- No YouTube scout/discovery/Gemini video analysis.
- No Google Ads, publishing, reviews, training, or content connector buildout.

## Lifecycle Definitions

- Connected: connector, source path, or governed source contract exists and is source-backed.
- Verified: trusted unit, validation boundary, or readable-source status is documented with a source ID.
- Extracted: existing governed extraction target or job has archived/extracted evidence with provenance and caps.
- Reviewed: lane is signed off, readable-only, explicitly needs review, or routes review through a documented source note.
- Retry: failures and skips have a reason plus an existing retry path or an explicit not-built/parked state.
- Parked: lane is scoped, blocked, paused, planned, or a known gap with reason and next action.

## Data And Privacy Boundary

- No private/source content copied into docs, API JSON, verifier logs, or manual proof.
- Evidence refs are metadata only: source IDs, target keys, job names, counts, run IDs, status, skip reason, and artifact class.
- Real source content, email/message bodies, transcripts, attachment text, row data, screenshots, raw tokens, and private local files are not copied.
- Blocked, paused, planned, and gap lanes stay visible without being activated.

## Extraction Caps And Safety Rules

- Existing extraction caps are surfaced and verified against the approved baseline.
- Blocked/paused/planned lanes must not silently become active.
- No target status, runtime mode, scheduler mode, or budget cap changes are allowed in this card.
- Any missing target/source metadata becomes a known limit or follow-up; it is not silently accepted.

## Acceptance Criteria

- `/api/foundation/source-lifecycle` covers all 35 source contracts and all 12 extraction targets.
- 100% of included lanes have lifecycle status and evidence or explicit no-target/parked reason.
- Parked/blocked lanes are visible with reason and next action.
- Extraction caps are visible and unchanged.
- `/api/source-of-truth` remains backward-compatible.
- `/foundation#source-lifecycle` works on desktop and mobile.
- Closeout owns only `SOURCE-LIFECYCLE-EXPANSION-001`.

## Manual Review

Manual review must pass desktop `1440x900` and mobile `390x844` for:

- source lifecycle route
- active source lanes
- parked/blocked lanes
- extraction caps
- evidence refs
- lifecycle definitions
- no horizontal overflow
- no overlapping text

## Proof Commands

- `npm run process:source-lifecycle-expansion-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `curl -s http://localhost:3000/api/foundation-hub`
- `curl -s http://localhost:3000/api/source-of-truth`
- `curl -s http://localhost:3000/api/foundation/source-lifecycle`
- `curl -s "http://localhost:3000/api/foundation/build-log?limit=5"`
- `npm run process:foundation-ship -- --card=SOURCE-LIFECYCLE-EXPANSION-001 --planApprovalRef=docs/process/approvals/SOURCE-LIFECYCLE-EXPANSION-001.json --closeoutKey=source-lifecycle-expansion-v1 --commitRef=HEAD`

## Closeout Draft

`SOURCE-LIFECYCLE-EXPANSION-001` closes under `source-lifecycle-expansion-v1` after the source lifecycle API, Foundation UI route, focused process check, manual desktop/mobile review, backlog hygiene, foundation verify, live API proof, and canonical ship wrapper pass.

Closeout owns only `SOURCE-LIFECYCLE-EXPANSION-001`.

Mentioned/context only: `DRIVE-CONTENT-001`, `EMAIL-ATTACHMENTS-001`, `MULTIMODAL-EXTRACTOR-001`, `YOUTUBE-SCOUT-001`, `EXTRACT-CURRENT-001`, `EXTRACT-BACKFILL-001`, `EXTRACT-RETRY-001`, `SECURITY-002`, and `SYSTEM-010`.

Review-next: stop for review. Do not start any new source build automatically.
