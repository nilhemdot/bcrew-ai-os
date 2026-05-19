# MEETING-VIDEO-001 Plan

## What

Build the safe meeting-video review preflight for `MEETING-VIDEO-001`.

This card does not fetch or review live private meeting recordings. It reads the existing local meeting-note archive and local `video-link-inventory` manifest, prioritizes meeting-linked media candidates, classifies platform/access/rights posture, proves the WEB-GODMODE/private-source approval boundary, prepares the required meeting-media run packet, and parks live Drive/Zoom/Loom/private media review as approval-bound so the sprint can continue to `SKOOL-WORKER-001`.

## Why

Gemini notes and transcripts are useful, but recordings can contain screenshares, demos, workflows, visual evidence, and nuance that does not appear in text. Steve wants the extraction machine to keep moving, but private meeting recordings cannot be treated like safe public source text.

The right behavior is:

- local meeting notes/transcripts and video manifest rows can be inspected now
- existing YouTube transcript artifacts can be reused when already present
- private Drive/Meet/Zoom/Loom/Skool media access stays blocked until Steve approves the exact source/use/storage/provider packet
- the blocked action is parked instead of stopping the whole sprint
- Current Sprint shows `MEETING-VIDEO-001` as parked and continues to `SKOOL-WORKER-001`

## Acceptance Criteria

- Local `shared_communication_artifacts` meeting-note rows are used as meeting truth.
- Meeting notes with `Meeting records Recording` labels are identified without fetching any media.
- Local `source_crawl_items` `video-link-inventory` rows are used as video manifest truth.
- Platform decisions cover YouTube, Google Drive, Zoom, Loom, Skool, and meeting-record labels.
- Existing YouTube transcript evidence is recognized as reusable, while no-subtitle/unsupported/private media routes remain explicit.
- The run packet names required approval fields: approver, meeting artifacts, media URLs/file IDs, content-use boundary, screenshot storage, transcription route, max recordings, max runtime, max cost, and retention.
- WEB-GODMODE proof blocks private meeting media observation without source-specific preflight.
- A synthetic approved meeting-video fixture validates the multimodal envelope without launching a browser, fetching a network page, calling a provider, downloading media, storing screenshot bytes, or writing downstream content.
- Live meeting-video review is not marked done.
- Current Sprint parks `MEETING-VIDEO-001` as returned/approval-bound and advances to `SKOOL-WORKER-001`.

## Definition Of Done

- `MEETING-VIDEO-001` has a focused proof script and package command.
- The closeout registry records `meeting-video-preflight-v1` as `blocked-preflight`, not accepted/done.
- `process:fanout-check` and `process:post-ship-fanout` can verify the blocked-preflight posture without requiring the card to be done.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass after the preflight is shipped.
- No live Drive/Meet/Zoom/Loom/Skool/private recording extraction is run by this card.

## Details

The preflight uses:

- `lib/meeting-video-proof.js` for meeting-recording candidate classification, video-link prioritization, platform routing, run-packet construction, WEB-GODMODE validation, multimodal envelope proof, and dogfood.
- `scripts/process-meeting-video-check.mjs` for focused proof, live backlog/Current Sprint updates, and blocked-preflight closeout validation.
- `docs/source-notes/video-link-inventory.md` for the shared video queue and follow-up platform boundaries.
- `SRC-MEETINGS-001` archived meeting-note/transcript artifacts for local meeting truth.
- `video-content-extract-backfill` for existing YouTube subtitle transcript evidence.

This card intentionally produces a parked run packet instead of reviewing private meeting media. The later approved live run should be a new source-specific job/card that consumes the packet.

Tight V1 scope:

- read only local meeting-note artifacts
- read only local `video-link-inventory` and `video-content-extract-backfill` rows
- classify meeting recording labels and meeting-linked media candidates
- produce a blocked approval packet
- prove the synthetic WEB-GODMODE and multimodal contract paths
- update Current Sprint so `MEETING-VIDEO-001` is returned/approval-bound and `SKOOL-WORKER-001` can continue

Not next:

- no live Google Meet/Drive recording locator
- no private Drive media read or download
- no Zoom recording fetch or registration access
- no Loom provider/browser run
- no Skool browser session
- no transcript/media download from private meeting media
- no screenshot or keyframe byte storage
- no model, OCR, vision, or transcription call over private meeting media
- no atom, KB, action-route, vector, query-index, or backlog writes from private meeting content
- no credential/key mutation, Drive permission mutation, external send, or public exposure
- no `MEETING-VAULT-ACL-001` Phase B or Drive permissions work

Operator value:

Steve gets a concrete answer: the meeting archive already has recording labels, the shared video queue has platform candidates, the unsafe live media review is explicitly blocked, the exact approval fields are named, and the builder can keep moving to Skool work without pretending meeting-video extraction is complete.

Behavior proof:

- `buildMeetingVideoQueue()` must identify local meeting recording labels and a populated video manifest.
- `buildMeetingVideoPreflightStatus()` must return `blocked_pending_approval`, never `ready_to_run`.
- WEB-GODMODE must reject private meeting media observation without a browser/source preflight.
- A synthetic approved meeting-video fixture must validate the multimodal envelope without browser/network/provider/model side effects.
- Current Sprint proof must show `MEETING-VIDEO-001` parked as returned and `SKOOL-WORKER-001` as the active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, and Foundation ship proof are touched, so this cannot be static-only.
- focused proof is required for the preflight and Current Sprint update
- full `foundation:verify` is required because this updates live backlog/sprint truth and closeout registry truth
- `process:foundation-ship` is required because the card changes shipped proof and active sprint state
- external/provider/browser proof is explicitly not allowed in this card

Rollback / Repair path:

If proof fails after parking the card, restore the previous Current Sprint overlay, leave `MEETING-VIDEO-001` scoped/research with the failure reason, do not run live meeting media review, and repair the preflight code before proceeding. If local meeting notes contain no recording labels, park the card with `needs_meeting_media_locator_seed` and continue the next safe sprint card.

Speed bounded:

The focused proof must be local-only and bounded: scan at most 200 video manifest items, at most 200 extraction rows, and at most 200 meeting-note artifacts, make zero network/provider/browser/model calls, and finish fast enough to run before every ship gate.

## Reuse Existing Work

- `WEB-GODMODE-001` request guard and synthetic observation proof.
- `MULTIMODAL-EXTRACTOR-001` envelope contract.
- `SOURCE-018` meeting source contract.
- `EXTRACT-BACKFILL-001` video content queue contract.
- `LOOM-001` blocked-preflight operating pattern.
- `video-link-inventory` manifest and source note.
- Existing blocked-preflight closeout support in ship/fanout checks.

## Risks

- Treating meeting recording labels as permission to read private recording files.
- Running Drive/Zoom/browser/provider work from a proof check.
- Marking `MEETING-VIDEO-001` done when live review is still approval-bound.
- Creating downstream atoms/routes/KB entries from unapproved private meeting media.
- Blocking the whole sprint instead of parking the unsafe action.

## Tests

- `node --check lib/meeting-video-proof.js scripts/process-meeting-video-check.mjs`
- `npm run process:meeting-video-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=MEETING-VIDEO-001 --planApprovalRef=docs/process/approvals/MEETING-VIDEO-001.json --closeoutKey=meeting-video-preflight-v1 --commitRef=HEAD`
