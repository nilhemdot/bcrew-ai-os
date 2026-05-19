# DRIVE-CONTENT-001 Next Bounded Drive Content Plan

## What

Close `DRIVE-CONTENT-001` by shipping the next safe Drive content bite through the existing governed `drive-content-extract-backfill` lane.

This card adds bounded DOCX text extraction, updates the target retry model so newly-supported Office skips are retried before fresh backlog, and proves the Drive lane still uses explicit skip reasons for unsupported, vision, and media classes.

## Why

Drive is a core evidence source for strategy, SOPs, recruiting, operations, and client work. The lane already handles Google Docs, Google Sheets, PDFs, text, and markdown, but it still had skipped Office documents in the live ledger. Those are useful source records and are safe to read through the existing approved Drive content target without mutating permissions.

Steve's unattended rule applies: approval-bound or unsafe actions park the action, not the whole sprint. For this card, Drive permission mutation, request-access sends, broad Drive sweeps, paid/provider/browser-auth work, and multimodal/vision extraction stay out of scope.

## Acceptance Criteria

- `drive-content-extract-backfill` remains active, scheduled, idempotent, and capped to five files per run.
- DOCX files use a bounded local text extraction path after `Drive files.get alt=media`.
- Office file byte size is capped by `maxOfficeBytes`.
- The target retry prefixes include:
  - `pdf_too_large_for_v1`
  - `sheet_text_extraction_not_in_v1`
  - `office_file_conversion_not_in_v1`
- The queue prioritizes explicitly retried skipped rows before fresh unprocessed backlog.
- A governed target run succeeds after the code change and uses `--maxOfficeBytes` plus the Office retry prefix.
- Existing DOCX `office_file_conversion_not_in_v1` skips are retired or replaced with explicit bounded extraction outcomes.
- Remaining skipped classes are explicit and correctly parked:
  - scanned/image PDFs route to OCR/vision follow-up
  - video/audio route to multimodal lanes
  - shortcuts/forms/drawings remain unsupported or separate source lanes
- No Google Drive permissions are created, deleted, or changed.
- Current Sprint advances to `EMAIL-ATTACHMENTS-001` after closeout.

## Definition Of Done

- `process:drive-content-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `drive-content-next-bite-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing Drive content extractor and extraction target runner:

- `scripts/extract-drive-content.mjs`
- `scripts/run-extraction-target.mjs`
- `lib/foundation-source-crawl-store.js`
- `scripts/seed-extraction-control.mjs`

The code path stays source-backed and bounded. It does not browse Drive broadly; it consumes the existing Drive inventory queue and target budget. DOCX extraction downloads the already-inventory-listed file with Drive media read, reads `word/document.xml` locally with `unzip`, normalizes XML text, and stores it through the existing `drive_document` shared artifact path with provenance metadata that identifies the DOCX extraction method and MIME type.

The behavioral proof reads live target state, latest source-crawl target run, latest Foundation job run, and source crawl item status. It does not print private Drive contents; it only reports counts, MIME types, skip reasons, run IDs, and status.

The dogfood proof rejects false-green cases: missing DOCX coverage, retryable skipped rows hidden behind fresh backlog, Drive permission mutation, unbounded budget, and vague skip routing.

## Operator Value

Steve and the team should see Drive content move from "we know this file exists" to "we can read safe file contents with source provenance." The real workflow this unlocks is higher-quality strategy, recruiting, operations, and client-prep retrieval from Drive without manually opening files or asking Steve to notice stale skip rows. The immediate useful thing is that current skipped DOCX strategy/operations files become source-backed artifacts, while unsafe file classes stay visible with explicit owner lanes instead of becoming vague skips.

## Reuse Existing Work

Reuse existing code:

- `driveDownloadFile()`
- `upsertSharedCommunicationArtifact()`
- `upsertSourceCrawlItem()`
- `listDriveContentExtractionQueue()`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`

Reuse existing docs and live truth:

- `docs/source-notes/google-drive-corpus.md`
- `docs/process/extract-backfill-001-plan.md`
- live backlog row `DRIVE-CONTENT-001`
- live Current Sprint active blocker
- existing Drive source crawl target `drive-content-extract-backfill`

Reuse existing guardrails:

- target runner lease/ledger flow
- source crawl item retry classification
- closeout registry
- Plan Critic approval integrity
- Foundation ship gate

## Tests

Focused proof:

- `node --check scripts/extract-drive-content.mjs scripts/run-extraction-target.mjs lib/foundation-source-crawl-store.js lib/drive-content-next-bite.js scripts/process-drive-content-check.mjs`
- `npm run process:drive-content-check -- --apply --json`
- `npm run extraction:target -- --target=drive-content-extract-backfill --force=true --actor=codex-drive-content-docx-proof`
- `npm run process:drive-content-check -- --apply --close-card --json`

Full closeout proof:

- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=DRIVE-CONTENT-001 --planApprovalRef=docs/process/approvals/DRIVE-CONTENT-001.json --closeoutKey=drive-content-next-bite-v1 --commitRef=HEAD`

## Gate Decision

Gate decision tree: static checks are not enough because this card changes scheduled extraction behavior. Focused proof is required for the Drive target behavior, live DB budget, retry queue ordering, DOCX skip retirement, and Current Sprint state. Full gate is required for closeout because the blast radius includes extraction runtime, live target budget, closeout registry, and Foundation ship proof. The focused check stays fast, under a few minutes by default, by reading metadata, counts, run status, MIME types, and skip reasons only; it does not print private Drive content.

## Risks

- DOCX extraction could accidentally become a broad Office conversion project. Containment: support only `.docx` via local XML text extraction, keep byte limits, and leave old binary Office formats parked.
- Retried skipped rows could starve fresh backlog. Containment: the target still has a five-file daily cap and only prioritizes explicitly configured retry skip prefixes.
- Drive work could drift into permissions or access requests. Containment: no permission APIs, no request-access sends, no external writes.
- Vision/video/media work could sneak into this text lane. Containment: those MIME types keep explicit skip reasons and route to multimodal/vision follow-up lanes.
- Proof could expose private Drive text. Containment: focused proof reports only statuses, counts, MIME types, skip reasons, run IDs, and command metadata.

Repair path: if DOCX extraction fails, leave the card executing, keep the skipped rows explicit, and repair the extractor or park the file class with owner/threshold/next trigger. If the governed target run fails, repair the latest run state before closeout. If Drive access or permission work is required, park that action and continue the next safe Foundation card rather than mutating permissions.

## Not Next

- No Drive permission mutation.
- No request-access emails or external writes.
- No broad Drive sweep outside the bounded daily target.
- No new source access, paid/provider work, or browser-auth extraction.
- No OCR/vision/video/media extraction in this text-only card.
- No Value Builder split.
