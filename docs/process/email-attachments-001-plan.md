# EMAIL-ATTACHMENTS-001 Next Bounded Attachment Plan

## What

Close `EMAIL-ATTACHMENTS-001` by shipping the next safe email attachment bite through the existing governed `email-attachments-backfill` lane.

This card adds bounded `application/ics` calendar invite text extraction, updates the target retry model so newly-supported calendar skips are retried before fresh backlog, and proves the attachment lane still uses explicit skip reasons for unsupported, Office, image, audio, video, and other multimodal classes.

## Why

Email attachments are a core evidence source for agreements, briefs, calendar context, PDFs, and operating work. The lane already handles PDFs and text-like attachments, but it still had skipped calendar invite files in the live ledger. Those are safe to read as local text through the existing approved Gmail attachment target without sending mail or mutating external systems.

Steve's unattended rule applies: approval-bound or unsafe actions park the action, not the whole sprint. For this card, sends, external writes, credential mutation, provider config changes, broad historical private extraction, Missive attachment expansion, paid/provider/browser-auth work, and multimodal/OCR extraction stay out of scope.

## Acceptance Criteria

- `email-attachments-backfill` remains active, scheduled, idempotent, and capped to five attachments per run.
- `application/ics`, `text/calendar`, and `.ics` files use a bounded local text extraction path after `Gmail users.messages.attachments.get`.
- Attachment byte size remains capped by `maxAttachmentBytes`.
- The target retry prefixes include `calendar_invite_not_in_v1`.
- The queue prioritizes explicitly retried skipped rows before fresh unprocessed backlog.
- A governed target run succeeds after the code change and uses `--retrySkippedReasonPrefixes=calendar_invite_not_in_v1`.
- Existing `calendar_invite_not_in_v1` skips are retired or replaced with explicit bounded extraction outcomes.
- Remaining skipped classes are explicit and correctly parked:
  - images route to the future OCR/vision lane
  - audio/video route to multimodal/transcription lanes
  - Office, spreadsheets, and slides remain explicit follow-on lanes
- No emails are sent.
- No Gmail/Missive/Drive permissions, credentials, provider config, or keys are mutated.
- Current Sprint advances to `FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001` after closeout.

## Definition Of Done

- `process:email-attachments-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `email-attachments-next-bite-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing email attachment extractor and extraction target runner:

- `scripts/extract-email-attachments.mjs`
- `scripts/run-extraction-target.mjs`
- `scripts/seed-extraction-control.mjs`

The code path stays source-backed and bounded. It does not browse email broadly; it consumes the existing Gmail attachment query target and daily quota. Calendar invite extraction downloads the already-selected attachment through the Gmail attachment API, treats the file as UTF-8 text, normalizes it, and stores it through the existing `gmail_attachment` shared artifact path with provenance metadata that identifies the calendar extraction method and MIME type.

The behavioral proof reads live target state, latest source-crawl target run, latest Foundation job run, and source crawl item status. It does not print private email or attachment contents; it only reports counts, MIME types, skip reasons, run IDs, and status.

The dogfood proof rejects false-green cases: missing `application/ics` coverage, retryable skipped rows hidden behind fresh backlog, sends/external writes, unbounded budget, and vague skip routing.

## Operator Value

Steve and the team should see email attachments move from "we skipped this file type" to "safe text-like attachments become source-backed evidence with provenance." The real workflow this unlocks is better source context from inbox operations without asking Steve to manually open attachments or notice stale skip rows. The immediate useful thing is that calendar invite attachments become local artifacts, while unsafe file classes stay visible with explicit owner lanes instead of becoming vague skips.

## Reuse Existing Work

Reuse existing code:

- `downloadGmailAttachment()`
- `upsertSharedCommunicationArtifact()`
- `upsertSourceCrawlItem()`
- `getSourceCrawlItemsByExternalId()`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`

Reuse existing docs and live truth:

- `docs/source-notes/shared-communications.md`
- `docs/process/extract-backfill-001-plan.md`
- live backlog row `EMAIL-ATTACHMENTS-001`
- live Current Sprint active blocker
- existing email attachment source crawl target `email-attachments-backfill`

Reuse existing guardrails:

- target runner lease/ledger flow
- closeout registry
- Plan Critic approval integrity
- Foundation ship gate

## Tests

Focused proof:

- `node --check scripts/extract-email-attachments.mjs scripts/run-extraction-target.mjs lib/email-attachments-next-bite.js scripts/process-email-attachments-check.mjs`
- `npm run process:email-attachments-check -- --apply --json`
- `npm run extraction:target -- --target=email-attachments-backfill --force=true --actor=codex-email-attachments-ics-proof`
- `npm run process:email-attachments-check -- --apply --close-card --json`

Full closeout proof:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=EMAIL-ATTACHMENTS-001 --planApprovalRef=docs/process/approvals/EMAIL-ATTACHMENTS-001.json --closeoutKey=email-attachments-next-bite-v1 --commitRef=HEAD`

## Gate Decision

Gate decision tree: static checks are not enough because this card changes scheduled extraction behavior. Focused proof is required for the email target behavior, live DB budget, retry queue ordering, calendar invite skip retirement, and Current Sprint state. Full gate is required for closeout because the blast radius includes extraction runtime, live target budget, closeout registry, and Foundation ship proof. The focused check stays fast, under a few minutes by default, by reading metadata, counts, run status, MIME types, and skip reasons only; it does not print private email or attachment content.

## Risks

- Attachment extraction could drift into a broad private-content sweep. Containment: use only the existing daily quota target, keep five attachments per run, and do not change the Gmail query beyond the live target.
- Calendar parsing could become a calendar-write feature. Containment: this stores raw invite text only; it does not create, update, invite, delete, or RSVP to events.
- Retried skipped rows could starve fresh backlog. Containment: the target still has a five-attachment daily cap and only prioritizes explicitly configured retry skip prefixes.
- OCR/image/audio/video work could sneak into this text lane. Containment: those MIME types keep explicit skip reasons and route to multimodal/vision follow-up lanes.
- Proof could expose private attachment text. Containment: focused proof reports only statuses, counts, MIME types, skip reasons, run IDs, and command metadata.

Repair path: if calendar invite extraction fails, leave the card executing, keep the skipped rows explicit, and repair the extractor or park the file class with owner/threshold/next trigger. If the governed target run fails, repair the latest run state before closeout. If sends, credential mutation, new source access, or broad private extraction is required, park that action and continue the next safe Foundation card rather than stopping the whole sprint.

## Not Next

- No email sends or external messages.
- No Gmail/Missive/Drive permission mutation.
- No credential mutation, provider config change, or key rotation.
- No broad historical private extraction outside the bounded daily target.
- No new source access, paid/provider work, or browser-auth extraction.
- No OCR/images/audio/video/multimodal extraction in this text-only card.
- No Value Builder split.
