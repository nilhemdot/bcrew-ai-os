# SKOOL-WORKER-001 Blocked-Preflight Closeout

Date: 2026-05-19
Closeout key: `skool-worker-preflight-v1`
Status: blocked-preflight

## What Changed

`SKOOL-WORKER-001` now has a governed Skool worker access matrix and runtime preflight without pretending live Skool extraction is done.

Added:

- `lib/skool-worker-proof.js`
- `scripts/process-skool-worker-check.mjs`
- `docs/process/skool-worker-001-plan.md`
- `docs/process/approvals/SKOOL-WORKER-001.json`
- closeout registry wiring
- `package.json` script `process:skool-worker-check`

Ship proof also exposed and repaired a narrow changelog verifier drift in `lib/foundation-change-log.js`: the bounded changelog now supplements from the verified closeout registry and selects verified closeout-backed rows for the 20-row threshold, instead of letting blocked preflight closeouts crowd out verified rows.

## What It Does

The preflight reads Skool source-contract truth, source-auth boundaries, connector readiness, and local `video-link-inventory` Skool URL rows. It classifies Skool surfaces as manual-export-only, link-inventory-only, needs-permission, blocked, or platform-worker-after-approval, builds the exact future approval packet, and proves WEB-GODMODE/multimodal boundaries with synthetic fixtures only.

It proves:

- `SRC-SKOOL-001` remains gap/not signed off
- `skool-access` remains blocked and unsafe to use
- local Skool URL rows remain link-inventory-only
- private/community Skool observation blocks without source-specific preflight
- synthetic approved Skool observation validates without browser/network/provider/model calls
- the multimodal envelope has source, rights, evidence, screenshot, and approval fields
- the live operation is parked instead of stopping the sprint

## Approval Boundary

This is not marked done as live Skool worker execution.

The following remains approval-bound and not accepted:

- Skool login
- private auth or authorized browser session
- community crawl
- course/classroom/module navigation
- post/comment extraction
- member-data read
- embedded-video extraction
- transcript/media download from private Skool content
- screenshot or keyframe byte storage
- provider/model/OCR/vision/transcription call over private Skool content
- downstream atom, KB, action-route, vector, query-index, or backlog writes from private Skool content

## Parked Run Packet

The future Skool run packet must include every source-auth field from `COURSE-SOURCE-AUTH-BOUNDARY-001`, including:

- source ID and class
- access owner
- approved actor
- approved access method
- permitted content types
- max scope
- artifact storage policy
- privacy/redaction policy
- content-use boundary
- downstream-use policy
- operator review cadence
- rollback/delete plan
- proof command
- expiry or review date

Until that exists, there is no approved command to run.

## Sprint Handling

`SKOOL-WORKER-001` is parked as approval-bound and not marked done. Current Sprint should continue to `MYICRO-TRAINING-001`.

This follows Steve's rule: blockers block unsafe actions, not the whole sprint.

## Proof

- `node --check lib/skool-worker-proof.js scripts/process-skool-worker-check.mjs`
- `npm run process:skool-worker-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:change-log-comprehensive-check`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SKOOL-WORKER-001 --planApprovalRef=docs/process/approvals/SKOOL-WORKER-001.json --closeoutKey=skool-worker-preflight-v1 --commitRef=HEAD`

## Next

Continue `MYICRO-TRAINING-001`. If it hits paid/provider/browser access, park the unsafe operation with the exact blocker and continue the next safe card.
