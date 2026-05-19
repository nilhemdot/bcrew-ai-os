# MYICRO-TRAINING-001 Plan

## What

Build the safe Mycro/myICOR training preflight for `MYICRO-TRAINING-001`.

This card does not open Mycro/myICOR, log in, navigate courses, read lessons, play videos, fetch transcripts, capture screenshots, call models, or store paid training content. It reuses `MYICOR-EXTRACTION-PREFLIGHT-001`, prepares the future one-lesson approval packet, proves the WEB-GODMODE/private-source boundary with synthetic fixtures, and parks live paid-training execution as approval-bound so the sprint can continue to `DRIVE-WORKER-001`.

## Why

Mycro/myICOR is high-value training material for AI teams, project management, process automation, and agent operating doctrine. The system should eventually learn from it, but paid/private training content cannot be treated like a public web page.

The right behavior is:

- source contracts, source-auth rows, connector blockers, and prior preflight proof can be inspected now
- the one-lesson packet must name actor, access method, content types, max scope, storage, redaction, content-use, downstream-use, proof command, and rollback/delete policy
- WEB-GODMODE must refuse paid/private observation without browser/source preflight
- synthetic approved fixtures may prove the contract without launching a browser or touching the app
- the blocked action is parked instead of stopping the whole sprint
- Current Sprint shows `MYICRO-TRAINING-001` as parked and continues to `DRIVE-WORKER-001`

## Acceptance Criteria

- `MYICOR-EXTRACTION-PREFLIGHT-001` is reused as the source/auth baseline.
- `SRC-MYICRO-001` remains scoped/not connected and not signed off.
- `myicro-access` remains blocked and unsafe to use.
- Source extraction gate fails closed until source-specific owner approval exists.
- One-lesson approval packet names every required source-auth field.
- Live Mycro/myICOR execution is not marked done.
- WEB-GODMODE blocks private paid training observation without browser/session preflight.
- A synthetic approved Mycro/myICOR lesson fixture validates the multimodal envelope without launching a browser, fetching a network page, calling a provider, downloading media, storing screenshot bytes, or writing downstream content.
- No paid app, private auth, paid auth, browser session, course inventory, lesson navigation, transcript fetch, video playback/download, screenshot/keyframe capture, provider/model call, downstream write, external write, or hidden worker starts.
- Current Sprint parks `MYICRO-TRAINING-001` as returned/approval-bound and advances to `DRIVE-WORKER-001`.

## Definition Of Done

- `MYICRO-TRAINING-001` has a focused proof script and package command.
- The closeout registry records `myicro-training-preflight-v1` as `blocked-preflight`, not accepted/done.
- `process:fanout-check` and `process:post-ship-fanout` can verify the blocked-preflight posture without requiring the card to be done.
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass after the preflight is shipped.
- No live Mycro/myICOR paid/private/provider/browser extraction is run by this card.

## Details

The preflight uses:

- `lib/myicro-training-proof.js` for source/auth baseline reuse, one-lesson approval packet construction, WEB-GODMODE validation, multimodal envelope proof, and dogfood.
- `scripts/process-myicro-training-check.mjs` for focused proof, live backlog/Current Sprint updates, and blocked-preflight closeout validation.
- `docs/source-notes/myicro-training.md` for Mycro/myICOR policy/access research.
- `MYICOR-EXTRACTION-PREFLIGHT-001` as the paid-source auth baseline.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` for required approval fields and paid-course posture.

This card intentionally produces a parked one-lesson packet instead of opening the training app. The later approved live run should be a new source-specific job/card that consumes the packet.

Tight V1 scope:

- read source contracts, connector registry, source-auth matrix, validation rows, and prior MyICOR preflight
- produce a blocked one-lesson approval packet
- prove synthetic WEB-GODMODE and multimodal contract paths
- update Current Sprint so `MYICRO-TRAINING-001` is returned/approval-bound and `DRIVE-WORKER-001` can continue

Not next:

- no Mycro/myICOR login
- no private auth, paid auth, or authorized browser session
- no course inventory or lesson navigation
- no lesson text extraction
- no resource-link copying
- no transcript/media download
- no video playback/download
- no screenshot or keyframe byte storage
- no model, OCR, vision, or transcription call over paid content
- no atom, KB, action-route, vector, query-index, or backlog writes from paid content
- no credential/key mutation, Drive permission mutation, external send, or public exposure

Operator value:

Steve gets a concrete answer: Mycro/myICOR is valuable and still approval-bound, the exact one-lesson run packet is known, unsafe live paid access is blocked, and the builder can keep moving to Drive work without pretending paid training extraction is complete.

Behavior proof:

- `buildMyicroTrainingPreflightStatus()` must return `blocked_pending_source_specific_approval`, never `ready_to_run`.
- Prior MyICOR preflight must remain blocked/not approved.
- WEB-GODMODE must reject private paid training observation without browser/source preflight.
- A synthetic approved Mycro/myICOR fixture must validate the multimodal envelope without browser/network/provider/model side effects.
- Dogfood must reject unblocked approval and any auth/browser/model side effects.
- Current Sprint proof must show `MYICRO-TRAINING-001` parked as returned and `DRIVE-WORKER-001` as the active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, and Foundation ship proof are touched, so this cannot be static-only.
- focused proof is required for the preflight and Current Sprint update
- full `foundation:verify` is required because this updates live backlog/sprint truth and closeout registry truth
- `process:foundation-ship` is required because the card changes shipped proof and active sprint state
- external/provider/browser proof is explicitly not allowed in this card

Rollback / Repair path:

If proof fails after parking the card, restore the previous Current Sprint overlay, leave `MYICRO-TRAINING-001` scoped/executing with the failure reason, do not open Mycro/myICOR, and repair the preflight code before proceeding.

Speed bounded:

The focused proof must be local-only and bounded: make zero network/provider/browser/model calls and finish fast enough to run before every ship gate.

## Reuse Existing Work

- `WEB-GODMODE-001` request guard and synthetic observation proof.
- `MULTIMODAL-EXTRACTOR-001` envelope contract.
- `COURSE-SOURCE-AUTH-BOUNDARY-001` paid-course approval boundary.
- `MYICOR-EXTRACTION-PREFLIGHT-001` source/auth preflight.
- `docs/source-notes/myicro-training.md` as source note and proof-sequence context.
- Existing blocked-preflight closeout support in ship/fanout checks.

## Risks

- Treating preflight as permission to open the paid app.
- Running browser/provider work from a proof check.
- Marking `MYICRO-TRAINING-001` done when live paid-training execution is still approval-bound.
- Creating downstream atoms/routes/KB entries from unapproved paid content.
- Blocking the whole sprint instead of parking the unsafe action.

## Tests

- `node --check lib/myicro-training-proof.js scripts/process-myicro-training-check.mjs`
- `npm run process:myicro-training-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=MYICRO-TRAINING-001 --planApprovalRef=docs/process/approvals/MYICRO-TRAINING-001.json --closeoutKey=myicro-training-preflight-v1 --commitRef=HEAD`
