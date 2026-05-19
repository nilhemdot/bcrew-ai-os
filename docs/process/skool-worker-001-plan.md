# SKOOL-WORKER-001 Plan

## What

Build the safe Skool worker preflight for `SKOOL-WORKER-001`.

This card does not open Skool, log in, crawl communities, or extract private course content. It reuses the completed `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` source/auth proof, reads the local Skool URL inventory, creates a reusable Skool access matrix, proves the WEB-GODMODE/private-source approval boundary, prepares the required Skool run packet, and parks live Skool worker execution as approval-bound so the sprint can continue to `MYICRO-TRAINING-001`.

## Why

Skool may contain high-value training, classroom, post, comment, link, and embedded-video material. Blind scraping would create platform, privacy, copyright, and product risk. Foundation needs a worker contract that is strong enough for future extraction but strict enough to block private/community access until Steve approves the exact source, actor, use, storage, and scope.

The right behavior is:

- source contracts, source-auth rows, and local Skool link inventory can be inspected now
- the access matrix must classify routes as manual-export-only, link-inventory-only, needs-permission, blocked, or platform-worker-after-approval
- live Skool browser/crawler/provider work stays blocked until Steve approves the exact packet
- the blocked action is parked instead of stopping the whole sprint
- Current Sprint shows `SKOOL-WORKER-001` as parked and continues to `MYICRO-TRAINING-001`

## Acceptance Criteria

- `SRC-SKOOL-001` source contract remains gap/not signed off.
- `skool-access` connector remains blocked and not safe to use.
- Source-auth boundary classifies Skool as private/community, metadata-only preflight allowed, extraction blocked pending approval.
- Existing local Skool URL inventory rows are treated as link-inventory-only.
- Access matrix covers Mark M / Early AI-dopters Skool, Skool URL inventory, classroom/modules/lessons, posts/comments/member data, and embedded videos.
- The run packet names every required source-auth approval field.
- WEB-GODMODE proof blocks private Skool observation without source-specific preflight.
- A synthetic approved Skool fixture validates the multimodal envelope without launching a browser, fetching a network page, calling a provider, downloading media, storing screenshot bytes, or writing downstream content.
- Live Skool worker execution is not marked done.
- Current Sprint parks `SKOOL-WORKER-001` as returned/approval-bound and advances to `MYICRO-TRAINING-001`.

## Definition Of Done

- `SKOOL-WORKER-001` has a focused proof script and package command.
- The closeout registry records `skool-worker-preflight-v1` as `blocked-preflight`, not accepted/done.
- `process:fanout-check` and `process:post-ship-fanout` can verify the blocked-preflight posture without requiring the card to be done.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass after the preflight is shipped.
- No live Skool/private/provider/browser extraction is run by this card.

## Details

The preflight uses:

- `lib/skool-worker-proof.js` for source/auth truth, local Skool link inventory classification, access matrix, run-packet construction, WEB-GODMODE validation, multimodal envelope proof, and dogfood.
- `scripts/process-skool-worker-check.mjs` for focused proof, live backlog/Current Sprint updates, and blocked-preflight closeout validation.
- `docs/source-notes/skool-corpus.md` for Skool policy/access research.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` for required approval fields and private-community posture.
- `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` as prior source/auth proof.

This card intentionally produces a parked access matrix and run packet instead of opening Skool. The later approved live run should be a new source-specific job/card that consumes the packet.

Tight V1 scope:

- read source contracts, connector registry, source-auth matrix, and validation rows
- read only local `video-link-inventory` rows with platform `skool`
- classify Skool surfaces and allowed/blocked routes
- produce a blocked approval packet
- prove synthetic WEB-GODMODE and multimodal contract paths
- update Current Sprint so `SKOOL-WORKER-001` is returned/approval-bound and `MYICRO-TRAINING-001` can continue

Not next:

- no Skool login
- no private auth or authorized browser session
- no community crawl
- no course/classroom/module navigation
- no post/comment extraction
- no member-data read
- no embedded-video extraction
- no transcript/media download
- no screenshot or keyframe byte storage
- no model, OCR, vision, or transcription call over private Skool content
- no atom, KB, action-route, vector, query-index, or backlog writes from private Skool content
- no credential/key mutation, Drive permission mutation, external send, or public exposure

Operator value:

Steve gets a concrete answer: Skool is valuable and still approval-bound, the URL inventory exists, the worker route rules are explicit, the unsafe live access is blocked, and the builder can keep moving to Mycro/myICOR work without pretending Skool extraction is complete.

Behavior proof:

- `buildSkoolAccessMatrix()` must classify the local Skool URL inventory as link-inventory-only.
- `buildSkoolWorkerPreflightStatus()` must return `blocked_pending_source_specific_approval`, never `ready_to_run`.
- WEB-GODMODE must reject private Skool observation without browser/source preflight.
- A synthetic approved Skool fixture must validate the multimodal envelope without browser/network/provider/model side effects.
- Dogfood must reject unblocked extraction and any auth/crawl/model side effects.
- Current Sprint proof must show `SKOOL-WORKER-001` parked as returned and `MYICRO-TRAINING-001` as the active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, and Foundation ship proof are touched, so this cannot be static-only.
- focused proof is required for the preflight and Current Sprint update
- full `foundation:verify` is required because this updates live backlog/sprint truth and closeout registry truth
- `process:foundation-ship` is required because the card changes shipped proof and active sprint state
- external/provider/browser proof is explicitly not allowed in this card

Rollback / Repair path:

If proof fails after parking the card, restore the previous Current Sprint overlay, leave `SKOOL-WORKER-001` scoped/research with the failure reason, do not open Skool, and repair the preflight code before proceeding. If local Skool inventory is empty, park the card with `needs_skool_link_inventory_seed` and continue the next safe sprint card.

Speed bounded:

The focused proof must be local-only and bounded: scan at most 200 video manifest items, make zero network/provider/browser/model calls, and finish fast enough to run before every ship gate.

## Reuse Existing Work

- `WEB-GODMODE-001` request guard and synthetic observation proof.
- `MULTIMODAL-EXTRACTOR-001` envelope contract.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` private/community approval boundary.
- `MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001` source/auth preflight.
- `video-link-inventory` manifest and source note.
- Existing blocked-preflight closeout support in ship/fanout checks.

## Risks

- Treating local Skool URLs as permission to open private community pages.
- Running browser/provider work from a proof check.
- Marking `SKOOL-WORKER-001` done when live worker execution is still approval-bound.
- Creating downstream atoms/routes/KB entries from unapproved private community content.
- Blocking the whole sprint instead of parking the unsafe action.

## Tests

- `node --check lib/skool-worker-proof.js scripts/process-skool-worker-check.mjs`
- `npm run process:skool-worker-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SKOOL-WORKER-001 --planApprovalRef=docs/process/approvals/SKOOL-WORKER-001.json --closeoutKey=skool-worker-preflight-v1 --commitRef=HEAD`
