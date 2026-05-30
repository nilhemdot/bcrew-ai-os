# DRIVE-WORKER-001 Plan

## What

Close `DRIVE-WORKER-001` as the governed Drive worker/control-plane V1.

This card does not run a broad Drive crawl. It proves the existing Drive inventory and content extraction lanes are live and usable as the worker foundation, adds a focused proof for the Drive route matrix, checks duplicate/file-ID visibility, preserves explicit skip reasons, and keeps permission mutation/media/provider work parked.

## Why

Drive contains strategy, training, SOPs, sales assets, product ideas, operating doctrine, and content IP. The system already has real Drive inventory/content slices, but Steve needs the umbrella worker to be governed enough that future Slides, Office, shortcut, OCR, vision, and media work can plug in without repeating old-system chaos.

The right behavior is:

- bounded inventory and content targets are the live worker basis
- folders/files carry stable Drive IDs and route classification
- supported text/file classes keep flowing through the content target
- unsupported/approval-bound classes are parked with owner lanes and explicit skip reasons
- Drive permission mutation remains blocked
- Current Sprint advances to `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`

## Acceptance Criteria

- `drive-corpus-backfill` is active and latest state succeeded.
- `drive-content-extract-backfill` is active and latest state succeeded.
- Drive corpus inventory has material ledger rows and stable Drive file IDs.
- Drive content extraction has material succeeded content rows.
- Route matrix covers:
  - folder/file inventory
  - text content extraction
  - shortcut resolution follow-up
  - Slides/Office expansion follow-up
  - media/vision/multimodal follow-up
- Duplicate/file-ID fingerprint basis is visible.
- Explicit skip/retry reasons remain visible.
- Dogfood rejects missing inventory, failed targets, permission mutation, and vague skips.
- No Drive permission mutation, request-access email, broad sweep, media download, provider/model call, credential mutation, external write, or downstream write starts.
- Current Sprint marks `DRIVE-WORKER-001` done this sprint and advances to `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`.

## Definition Of Done

- `process:drive-worker-check` passes with `--close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `drive-worker-governed-v1`.
- Main is clean and pushed.

## Details

The card adds:

- `lib/drive-worker-proof.js` for ledger summaries, route matrix, side-effect guards, and dogfood proof.
- `scripts/process-drive-worker-check.mjs` for live proof, backlog/Current Sprint updates, and closeout validation.
- `docs/process/drive-worker-001-plan.md`
- `docs/process/approvals/DRIVE-WORKER-001.json`
- `docs/_archive/handoffs/2026-05-19-drive-worker-governed-closeout.md`

## Reuse Existing Work

Existing code to reuse:

- `DRIVE-CONTENT-001` and closeout `drive-content-next-bite-v1`
- `drive-corpus-backfill` inventory target
- `drive-content-extract-backfill` content target
- `scripts/inventory-drive-corpus.mjs`
- `scripts/extract-drive-content.mjs`
- source crawl target/item ledgers
- existing blocked-preflight/ship/fanout gates

Existing docs to reuse:

- `docs/process/drive-content-001-plan.md`
- `docs/_archive/handoffs/2026-05-19-drive-content-next-bite-closeout.md`
- `docs/source-notes/google-drive-corpus.md`

Existing scripts to reuse:

- `scripts/process-drive-content-check.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`

Live backlog and Current Sprint truth to reuse:

- live backlog row `DRIVE-WORKER-001`
- done prerequisite `DRIVE-CONTENT-001`
- next card `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001`
- active sprint `FOUNDATION-GODMODE-EXTRACTION-2026-05-19`

This is a control-plane close, not a new extraction sweep. It makes the worker contract executable from current ledgers and route policy. Future file-type implementations should be separate bounded cards.

## Operator Value

Steve gets a clear answer: Drive inventory and readable content extraction are live, the worker knows where each file class goes next, unsupported/approval-bound work is not hidden, and future Drive expansion can proceed one bounded lane at a time.

This makes Drive useful without making it dangerous. It tells the operator which evidence is already extractable, which file classes need their own cards, and which operations are blocked by approval or permission boundaries.

## Not Next

- no Drive permission mutation
- no request-access emails
- no broad Drive sweep
- no media/video/audio download
- no OCR/vision/model/provider calls
- no credential/key mutation
- no external writes
- no atom/KB/action-route/vector writes from Drive content in this card

Behavior proof:

- `buildDriveWorkerStatus()` must be healthy from live target and item ledgers.
- `buildDriveWorkerRouteMatrix()` must name owned routes and next actions.
- Dogfood must reject missing inventory, failed target state, permission mutation, and vague skip reasons.
- Current Sprint proof must show `DRIVE-WORKER-001` done and `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001` as active blocker.

Gate decision tree:

- Gate choice: full gate.
- Blast radius: live backlog, Current Sprint, closeout registry, Drive extraction proof, and Foundation ship proof are touched.
- focused proof is required for the Drive worker control plane and Current Sprint update
- full `foundation:verify` is required
- `process:foundation-ship` is required
- live Drive permission mutation and broad extraction are explicitly not allowed

## Risks

- Risk: Drive worker V1 gets mistaken for approval to run a broad Drive crawl. Mitigation: proof reads existing ledgers only and closeout keeps broad sweeps out of scope.
- Risk: shortcut handling turns into permission repair. Mitigation: shortcut resolution is metadata-only where visible; request-access email and permission mutation remain blocked.
- Risk: media/OCR work sneaks into Drive worker. Mitigation: media, screenshots, handwriting, OCR, and vision route to multimodal follow-up lanes.
- Risk: the control-plane proof hides stale Drive target failures. Mitigation: focused proof requires both Drive targets to be active and latest-succeeded.

Rollback / Repair path:

If proof fails, leave `DRIVE-WORKER-001` executing, do not mutate Drive permissions, and repair the ledger/route proof. If a Drive target is red, repair the target/job state first. If a file class needs approval-bound media/provider work, park that operation and continue the next safe card.

## Speed Bounded

The focused proof reads only target rows and the latest 500 item rows per Drive lane. It does not export Drive files, print private file content, call Google APIs, run OCR/model/provider work, or start extraction jobs. It should stay fast enough to run before every ship gate.

## Tests

- `node --check lib/drive-worker-proof.js scripts/process-drive-worker-check.mjs`
- `npm run process:drive-worker-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=DRIVE-WORKER-001 --planApprovalRef=docs/process/approvals/DRIVE-WORKER-001.json --closeoutKey=drive-worker-governed-v1 --commitRef=HEAD`
