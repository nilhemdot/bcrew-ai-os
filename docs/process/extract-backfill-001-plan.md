# EXTRACT-BACKFILL-001 Bounded Historical Backfill Plan

## What

Close `EXTRACT-BACKFILL-001` by proving the historical backfill/corpus lanes are bounded, cursor-backed, latest-success, retry/skip visible, and safe to keep running as daily bites.

This card does not run broad history extraction. It proves the contract already visible in extraction control and Foundation jobs for these active lanes:

- `drive-corpus-backfill`
- `drive-content-extract-backfill`
- `email-attachments-backfill`
- `video-content-extract-backfill`
- `meeting-transcripts-extract-backlog`

It also proves paused, blocked, or planned lanes are parked with owner/reason/next trigger instead of stopping the whole sprint:

- `skool-corpus-backfill`
- `zoom-audio-recovery-backfill`
- `old-system-report-mining`
- `video-link-inventory`

## Why

Current-day source lanes are fresh now. The next risk is broad historical extraction becoming a blind private-data sweep, a runaway provider job, or a pile of skipped/failed items nobody owns.

Steve's rule is that blockers block actions, not the whole sprint. For backfill, that means active lanes must be safe, bounded, and observable. Approval-bound lanes must be parked explicitly with owner and next trigger, while safe Foundation work keeps moving.

## Acceptance Criteria

- Active historical extraction targets exist in extraction control.
- Each active target has the expected source ID, lane, and target type.
- Each active target is scheduled and latest target state is `succeeded`.
- Each active target has durable cursor/checkpoint state.
- Each active target has a daily mission unit, bite-size cap, runtime cap, and idempotent dedupe key.
- Output-producing lanes require filed outputs.
- Latest governed Foundation jobs for active lanes are `succeeded` and fresh for their cadence.
- `meeting-transcripts-extract-backlog` remains a bounded job-only backfill with `--limit=3`.
- Failed items, hidden failed items, and unresolved retry queues are zero for active historical lanes.
- Skipped items have explicit skip reasons and follow-on lanes rather than vague failure.
- Paused/blocked/planned lanes have status, runtime posture, bounded resume budget, owner, reason, and next trigger.
- The focused proof emits only metadata: target keys, source IDs, job keys, statuses, counts, cursor types, and skip reason names. It does not print private source content.
- Current Sprint advances to `DRIVE-CONTENT-001` after closeout.

## Definition Of Done

- `process:extract-backfill-check` passes with `--apply --close-card --json`.
- System Health remains healthy.
- Repeated-failure gate remains healthy.
- Backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.
- The closeout registry exposes `extract-backfill-cursor-contract-v1`.
- Main is clean and pushed.

## Details

The implementation reuses the existing extraction control target ledger, Foundation job registry, source crawl item summaries, extraction hardening snapshot, System Health, and repeated-failure gate.

The focused proof reads:

- `getExtractionControlSnapshot()` for live target state, cursor state, budget, dedupe, item summaries, retry state, and coverage hardening.
- `foundation_job_runs` for latest governed job state.
- `getFoundationJobDefinitions()` for scheduled job definitions and bounded command arguments.
- Current Sprint and live backlog rows for card sequencing.

The behavioral proof calls the real function path `buildExtractBackfillCursorContractStatus()` from `process:extract-backfill-check`. The dogfood proof rejects weak false-green cases: unbounded active lane, missing cursor, hidden partial failure, skipped rows without reasons, parked lane without owner, and broad unsafe extraction.

The proof does not run broad extraction. If a governed repair rerun is needed, it may run only under the standing repair policy: existing Foundation job, approved source data, local archive/ledger/proof writes only, no sends, no Drive permission mutation, no credential/provider mutation, and no broad historical private extraction outside this card.

## Reuse Existing Work

Reuse existing code:

- `lib/foundation-source-crawl-store.js`
- `lib/extraction-run-hardening.js`
- `lib/foundation-jobs.js`
- `lib/foundation-system-health.js`
- `lib/process-plan-critic.js`

Reuse existing scripts:

- `scripts/seed-extraction-control.mjs`
- `scripts/run-extraction-target.mjs`
- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

Reuse existing docs and policy:

- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/source-notes/google-drive-corpus.md`
- `docs/source-notes/shared-communications.md`
- `docs/source-notes/video-link-inventory.md`

## Behavioral Proof

The dogfood proof simulates the exact failure modes this card must prevent:

- an active backfill lane without a bounded bite cap,
- an active lane without a durable cursor,
- a hidden failed item without retry state,
- skipped items without explicit skip reasons,
- a parked/paused lane without owner,
- broad unsafe extraction being required for closeout.

Live proof uses the actual extraction-control snapshot and job-ledger state. Source-text checks only verify that existing scripts and registries still expose the required governed paths; they are not the main proof. Substring-only proof is rejected: the card cannot pass unless the real function path and focused process path evaluate live extraction-control and job-ledger behavior.

Gate decision tree: focused proof is required because this card changes live sprint/backlog state and makes operational claims from live extraction-control/job data. Full verification is required because the blast radius touches extraction control, job health, backlog truth, package scripts, closeout registry, and ship/fanout proof.

Operator value: Steve can see that historical extraction is a controlled daily-bite system with visible cursors, skips, retries, owners, and parked approval boundaries before the next Drive content slice expands coverage.

Speed bound: the focused proof is metadata-only plus local gate checks and should run under 2 minutes.

## Tests

- `node --check lib/extract-backfill-cursor-contract.js scripts/process-extract-backfill-check.mjs`
- `npm run process:extract-backfill-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACT-BACKFILL-001 --planApprovalRef=docs/process/approvals/EXTRACT-BACKFILL-001.json --closeoutKey=extract-backfill-cursor-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACT-BACKFILL-001 --closeoutKey=extract-backfill-cursor-contract-v1`
- `npm run process:foundation-ship -- --card=EXTRACT-BACKFILL-001 --planApprovalRef=docs/process/approvals/EXTRACT-BACKFILL-001.json --closeoutKey=extract-backfill-cursor-contract-v1 --commitRef=HEAD`

## Risks

- Risk: backfill proof becomes broad private extraction. Mitigation: V1 reads existing metadata and job/target state only; no new source access or broad live crawl is added.
- Risk: skipped unsupported items get treated as healthy without ownership. Mitigation: skipped rows must have explicit reasons and follow-on lanes.
- Risk: paused/approval-bound lanes stop the whole sprint. Mitigation: the proof requires owner/reason/next trigger and parks the blocked action while safe sprint work continues.
- Risk: a failed target gets classified around. Mitigation: active historical lanes must have zero failed items, zero hidden failures, and zero unresolved retry queue for closeout.
- Risk: private source content leaks into proof output. Mitigation: output is limited to metadata, counts, cursor types, and reason names.

Rollback or repair path: if focused proof fails because a safe governed repair can fix the lane, run the existing governed repair job and record the run. If the fix needs approval-bound/private/provider/external mutation, park the action with exact command, owner, reason, and next trigger, then continue the next safe sprint card.

## Not Next

- Do not run broad historical extraction from this card.
- Do not send messages or perform external writes.
- Do not mutate Google Drive permissions.
- Do not mutate credentials, provider config, or keys.
- Do not add new source access, paid/provider access, or browser-auth work.
- Do not treat skipped unsupported file/source classes as failures when they have explicit skip reasons and follow-on lanes.
- Do not start Value Builder split.
