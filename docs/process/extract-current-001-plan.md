# EXTRACT-CURRENT-001 Current-Day Source Freshness Plan

## What

Close `EXTRACT-CURRENT-001` by proving current-day source freshness across the governed Gmail, Missive, meeting notes, Google Calendar, and Slack lanes.

This card does not create new source access or broad extraction. It verifies the current-day lanes already in the Foundation job and extraction-control system:

- `gmail-current-day`
- `missive-current-day`
- `meetings-current-day`
- `calendar-current-day`
- `slack-current-day`

It also proves partial-failure behavior. If a current-day item fails, the item must be visible in `source_crawl_items`, retry-classified, recoverable through a governed recovery command, and repaired when the repair is safe and already approved.

## Why

Useful extraction depends on source freshness. Backfill, Drive content, and attachment extraction are less valuable if today's source lanes are stale, ambiguous, or hiding failed items.

Steve's rule is that the system should fix what it can, not document around it. For this card, that means current-day failures are not accepted as vague watch rows. They either get repaired through existing governed recovery or remain explicitly parked with a live blocker while safe sprint work continues.

## Acceptance Criteria

- All five expected current-day targets exist in extraction control.
- Each target is active and scheduled.
- Each target latest state is `succeeded`.
- Each mapped Foundation job latest state is `succeeded`.
- Each target is fresh relative to its cadence:
  - Gmail and Missive within 6 hours.
  - Calendar, meetings, and Slack within 30 hours.
- Each target has item-level crawl proof.
- Current-day failed item count is repaired to zero when repair is safe and already governed.
- Hidden failed items without retry state are zero.
- The governed recovery path remains manual and dry-run-first.
- The focused proof emits counts, statuses, run IDs, and target keys only; no private message, meeting, email, Slack, or calendar contents.
- Current Sprint advances to `EXTRACT-BACKFILL-001` after closeout.

## Definition Of Done

- `process:extract-current-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `extract-current-source-freshness-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing extraction control target ledger, Foundation job registry, source crawl target/item tables, failed-item retry executor, System Health, and repeated-failure gate.

The focused proof reads:

- `getExtractionControlSnapshot()` for live target state and item summaries,
- `foundation_job_runs` for latest governed job status,
- `source_crawl_items` indirectly through extraction-control summaries,
- `npm run extraction:retry-failed -- --target=meetings-current-day --dryRun=true --json=true` for no-write recovery proof.

The proof does not print private source contents. It reports only metadata such as target key, source ID, job key, status, item counts, and retry counts.

## Reuse Existing Work

Reuse existing code:

- `lib/foundation-jobs.js`
- `lib/foundation-source-crawl-store.js`
- `lib/extraction-run-hardening.js`
- `lib/extraction-run-hardening-execution.js`
- `lib/foundation-system-health.js`

Reuse existing scripts:

- `scripts/run-extraction-target.mjs`
- `scripts/retry-extraction-failed-items.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

Reuse existing docs and policy:

- `docs/process/source-018-google-gemini-meeting-notes-contract-plan.md`
- `docs/source-notes/shared-communications.md`
- `docs/rebuild/current-state.md`

## Behavioral Proof

The dogfood proof simulates the exact false-green cases this card must block:

- one stale current-day lane,
- a hidden item failure without retry state,
- an unsafe approval-bound operation being required for freshness proof.

Live proof checks the actual extraction-control and job-ledger state through the real function path `getExtractionControlSnapshot()` -> `buildExtractCurrentSourceFreshnessStatus()` and the focused process path `process:extract-current-check`. The black-box recovery path is the existing `extraction:retry-failed` command in dry-run mode. The card rejects substring-only proof and string-match verifier theatre; source-text checks only verify that the package script, job registry, and target runner still expose the required governed paths.

If a safe governed repair rerun is needed, it may run under the standing repair policy only when it uses an existing Foundation job, reads already-approved source data, and writes only local archive/ledger/proof rows. Otherwise, the blocked action is parked and the sprint continues to the next safe card.

## Tests

- `node --check lib/extract-current-source-freshness.js scripts/process-extract-current-check.mjs`
- `npm run process:extract-current-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACT-CURRENT-001 --planApprovalRef=docs/process/approvals/EXTRACT-CURRENT-001.json --closeoutKey=extract-current-source-freshness-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACT-CURRENT-001 --closeoutKey=extract-current-source-freshness-v1`
- `npm run process:foundation-ship -- --card=EXTRACT-CURRENT-001 --planApprovalRef=docs/process/approvals/EXTRACT-CURRENT-001.json --closeoutKey=extract-current-source-freshness-v1 --commitRef=HEAD`

Gate decision tree: focused proof is required because this card changes live sprint state and makes operational freshness claims from live source/job data. Full verification is required because the blast radius touches extraction control, job health, backlog truth, package scripts, closeout registry, and ship/fanout proof.

Operator value: Steve can see that current-day source truth is fresh before the system starts working backward through history.

Speed bound: the focused proof is metadata-only plus one no-write retry dry-run and should run under 2 minutes.

## Risks

- Risk: current-day proof becomes broad private extraction. Mitigation: V1 only reads existing governed metadata and target/job state; no new source access is added.
- Risk: a failed item gets classified instead of repaired. Mitigation: the proof requires failed current-day items to be zero unless an operation is explicitly parked with blocker truth.
- Risk: retry proof accidentally mutates external systems. Mitigation: retry proof uses the dry-run path; any repair rerun must be an existing governed Foundation job with local ledger/archive writes only.
- Risk: private source content leaks into proof output. Mitigation: output is limited to counts/statuses/keys and no message, transcript, event, or Slack body text.

Rollback or repair path: if focused proof fails, do not close the card or advance to `EXTRACT-BACKFILL-001`. Fix the exact failing lane if it is a governed safe repair. If the fix needs an unsafe or approval-bound operation, park that action with owner/reason/command and continue the next safe sprint card.

## Not Next

- Do not run broad historical extraction from this card.
- Do not send messages or perform external writes.
- Do not mutate Google Drive permissions.
- Do not mutate credentials, provider config, or keys.
- Do not add new source access or paid/browser-auth work.
- Do not start Value Builder split.
