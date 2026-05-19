# LOOM-001 Plan

## What

Build the safe Loom extraction preflight for `LOOM-001`.

This card does not run Loom extraction. It reads the existing local `video-link-inventory` manifest, selects Loom share/embed candidates, proves the WEB-GODMODE/private-source approval boundary, prepares the required Loom run packet, and parks live Loom provider/browser extraction as approval-bound so the sprint can continue to `MEETING-VIDEO-001`.

## Why

Loom is a high-value training source, but it is also private/workspace video content. Steve wants the extraction machine to keep moving without babysitting, but private/provider/browser work cannot be treated like a safe local proof.

The right behavior is:

- local manifest and preflight work can run now
- live provider/browser transcript/media/screenshot work stays blocked until Steve approves the exact run packet
- the blocked action is parked instead of stopping the whole sprint
- Current Sprint shows `LOOM-001` as parked and continues to the next safe card

## Acceptance Criteria

- `source_crawl_items` local `video-link-inventory` rows are used as the source of candidate truth.
- At least three Loom share/embed candidate URLs are selected from the local manifest.
- Non-video Loom marketing/action URLs are skipped with reasons.
- The run packet names required approval fields: approver, candidate URLs, content-use boundary, screenshot storage, provider/browser path, max videos, max cost, and artifact retention.
- WEB-GODMODE proof blocks private Loom observation without source-specific preflight.
- A synthetic approved Loom fixture validates the multimodal envelope without launching a browser, fetching a network page, calling a provider, downloading media, storing screenshot bytes, or writing downstream content.
- Live Loom extraction is not marked done.
- Current Sprint parks `LOOM-001` as returned/approval-bound and advances to `MEETING-VIDEO-001`.

## Definition Of Done

- `LOOM-001` has a focused proof script and package command.
- The closeout registry records `loom-extraction-preflight-v1` as `blocked-preflight`, not accepted/done.
- `process:fanout-check` and `process:post-ship-fanout` can verify the blocked-preflight posture without requiring the card to be done.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass after the preflight is shipped.
- No live Loom/private/provider/browser extraction is run by this card.

## Details

The preflight uses:

- `lib/loom-extraction-proof.js` for candidate classification, run-packet construction, WEB-GODMODE validation, multimodal envelope proof, and dogfood.
- `scripts/process-loom-check.mjs` for focused proof, live backlog/Current Sprint updates, and blocked-preflight closeout validation.
- `docs/source-notes/video-link-inventory.md` for the existing Loom proof boundary.
- `SRC-LOOM-001` source contract and `apify-loom-youtube` credential registry row for source/auth posture.

This card intentionally produces a parked run packet instead of a transcript artifact. The later approved live run should be a new source-specific job/card that consumes the packet.

Tight V1 scope:

- read only the local `video-link-inventory` manifest
- classify Loom URLs as eligible share/embed candidates or skipped non-video Loom URLs
- produce a blocked approval packet
- prove the synthetic WEB-GODMODE and multimodal contract paths
- update Current Sprint so `LOOM-001` is returned/approval-bound and `MEETING-VIDEO-001` can continue

Not next:

- no live Loom page read
- no Apify actor call
- no authorized browser session
- no transcript/media download
- no screenshot or keyframe byte storage
- no model, OCR, vision, or transcription call over private Loom content
- no atom, KB, action-route, vector, query-index, or backlog writes from private Loom content
- no credential/key mutation, Drive permission mutation, external send, or public exposure
- no `MEETING-VAULT-ACL-001` Phase B or Drive permissions work

Operator value:

Steve gets a concrete answer: there are local Loom candidate URLs ready for a future run, the unsafe operation is explicitly blocked, the exact approval fields are named, and the builder can keep moving to meeting-video work without pretending Loom extraction is complete.

Behavior proof:

- `buildLoomCandidateInventory()` must identify at least three local Loom share/embed candidates and skip non-video Loom URLs.
- `buildLoomPreflightStatus()` must return `blocked_pending_approval`, never `ready_to_run`.
- WEB-GODMODE must reject private Loom observation without a browser/source preflight.
- A synthetic approved Loom fixture must validate the multimodal envelope without browser/network/provider/model side effects.
- Current Sprint proof must show `LOOM-001` parked as returned and `MEETING-VIDEO-001` as the active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, and Foundation ship proof are touched, so this cannot be static-only.
- focused proof is required for the preflight and Current Sprint update
- full `foundation:verify` is required because this updates live backlog/sprint truth and closeout registry truth
- `process:foundation-ship` is required because the card changes shipped proof and active sprint state
- external/provider/browser proof is explicitly not allowed in this card

Rollback / Repair path:

If proof fails after parking the card, restore the previous Current Sprint overlay, leave `LOOM-001` scoped/research with the failure reason, do not run live Loom extraction, and repair the preflight code before proceeding. If the manifest has fewer than three candidates, park the card with `needs_more_manifest_candidates` and continue the next safe sprint card.

Speed bounded:

The focused proof must be local-only and bounded: scan at most 200 manifest items, select at most five candidates, make zero network/provider/browser/model calls, and finish fast enough to run before every ship gate.

## Reuse Existing Work

- `WEB-GODMODE-001` request guard and synthetic observation proof.
- `MULTIMODAL-EXTRACTOR-001` envelope contract.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` private/course approval boundary.
- `video-link-inventory` manifest and source note.
- Existing blocked-preflight closeout support in ship/fanout checks.

## Risks

- Treating local Loom URLs as permission to read private video content.
- Running Apify/browser/provider work from a proof check.
- Marking `LOOM-001` done when the live extraction path is still approval-bound.
- Creating downstream atoms/routes/KB entries from unapproved private content.
- Blocking the whole sprint instead of parking the unsafe action.

## Tests

- `node --check lib/loom-extraction-proof.js scripts/process-loom-check.mjs`
- `npm run process:loom-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=LOOM-001 --planApprovalRef=docs/process/approvals/LOOM-001.json --closeoutKey=loom-extraction-preflight-v1 --commitRef=HEAD`
