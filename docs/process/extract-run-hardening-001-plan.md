# EXTRACT-RUN-HARDENING-001 Extraction Run Hardening Plan

Status: approved at 9.8 and implemented under `extract-run-hardening-v1`.

Card: `EXTRACT-RUN-HARDENING-001`

Current truth:

- `SYSTEM-010-GHOST-CLOSEOUT-001` is shipped.
- `SOURCE-LIFECYCLE-COMPLETION-001` is shipped.
- `SYNTHESIS-VERIFY-001` is shipped at `9596b76`.
- Foundation readiness is still `not_ready`.
- Remaining readiness blockers are `EXTRACT-RUN-HARDENING-001`, `MEETING-VAULT-ACL-001`, and `DRIVE-ACCESS-REQUEST-001`.
- Extraction already has `source_crawl_targets`, `source_crawl_target_runs`, `source_crawl_items`, target leases, target-run stale reaping, item summaries, and coverage-by-target visibility.
- Current live extraction snapshot has 12 targets, 0 stale active target runs, 2 recently reaped stale runs, 2 targets with failed items, and 0 currently leased items. That is enough substrate to harden, but not enough to call the supply chain ready.

## Goal

Close the extraction retry/ledger/backfill blocker honestly.

After this card, extraction readiness can pass only if failed items, partial runs, stale leases, and bounded backfills are mechanically controlled, visible, and proven. The goal is not to make every source complete. The goal is to prove the existing extraction lanes cannot silently hide failed work or run unbounded backfills.

Foundation may still report `not_ready` after this card because of:

- `MEETING-VAULT-ACL-001`
- `DRIVE-ACCESS-REQUEST-001`

## Current Model And Gaps

Existing model:

- `source_crawl_targets` stores target identity, source, lane, runtime mode, cursor state, budget, lease owner, last status, and aggregate counts.
- `source_crawl_target_runs` stores target-level run IDs, source, status, lease owner, deltas, and metadata.
- `source_crawl_items` stores target item rows, status, leases, `attempt_count`, last error, artifact ID, and metadata.
- `scripts/run-extraction-target.mjs` leases a target, creates a run, calls the target-specific script, parses summary output, and finishes the target run as `succeeded`, `partial`, or `failed`.
- `scripts/foundation-worker.mjs` already reaps stale `foundation_job_runs`, `source_crawl_target_runs`, and `llm_calls`.
- Runtime Health and `/api/foundation/extraction-control` already expose targets, recent runs, stale target runs, item summaries, and coverage-by-target.

Current gaps:

- Failed items are visible but not governed by a central retry/backoff state machine.
- Item retries are inconsistent: meeting notes have a first retry path; Drive/video/email attachment retries are partial or reason-specific; Gmail/Missive/Slack current-day rely mostly on rerunning the window.
- Item attempts are not tied strongly enough to the source crawl run that attempted them.
- `attempt_count` exists, but max attempts, next retry time, retry state, and exhausted/blocked reason are not queryable first-class fields.
- Target-run stale reaping exists, but stale `source_crawl_items` leases are not reaped with the same rigor.
- Partial runs exit nonzero and are visible, but the next safe command and retry queue are not explicit enough for Foundation readiness.
- Backfill targets have budgets, but there is no single verifier proving every active backfill/corpus target is bounded by item count, runtime, cursor, and daily mission caps.

## Definitions

- Target run: one leased execution of a `source_crawl_targets.target_key`, represented by `source_crawl_target_runs.run_id`.
- Crawl item: one unit of source work in `source_crawl_items`, such as a thread, meeting file, Drive file, attachment, video link, or extraction item.
- Item attempt: one attempt to process a crawl item under a source crawl run.
- Retryable failure: a failed item whose error class is transient, access-temporary, rate-limited, timeout, stale lease, or target-script recoverable and whose attempt count is below cap.
- Blocked failure: a failed or skipped item that needs another card, access approval, source capability, file-type support, or human review before retry is safe.
- Exhausted failure: a retryable item that reached its max attempt cap.
- Partial run: a target run where the process finished but one or more crawl items failed. Partial is not green.
- Bounded backfill: any backfill/corpus/recovery target with max items per run, max runtime, daily mission quota or explicit manual cap, cursor state, and no force path that can bypass those caps.

## Exact Files And Modules To Inspect

Inspect before implementation:

- `lib/foundation-db.js`
- `lib/foundation-readiness-gates.js`
- `lib/foundation-build-log.js`
- `lib/source-lifecycle-completion.js`
- `lib/runtime-process-control.js`
- `scripts/run-extraction-target.mjs`
- `scripts/foundation-worker.mjs`
- `scripts/seed-extraction-control.mjs`
- `scripts/sync-gmail-archive.mjs`
- `scripts/sync-missive-archive.mjs`
- `scripts/sync-meeting-notes-archive.mjs`
- `scripts/sync-slack-archive.mjs`
- `scripts/inventory-drive-corpus.mjs`
- `scripts/extract-drive-content.mjs`
- `scripts/extract-email-attachments.mjs`
- `scripts/inventory-video-links.mjs`
- `scripts/extract-video-content.mjs`
- `server.js`
- `public/foundation.js`
- `package.json`
- `scripts/foundation-verify.mjs`
- `scripts/process-foundation-done-test.mjs`
- `docs/process/foundation-done-test.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

Likely files to touch:

- Add `lib/extraction-run-hardening.js`.
- Update `lib/foundation-db.js`.
- Update `scripts/run-extraction-target.mjs`.
- Update target scripts only where needed to accept/pass `crawlRunId`, `retryFailed`, or retry item IDs.
- Update `scripts/foundation-worker.mjs`.
- Add `scripts/process-extract-run-hardening-check.mjs`.
- Update `package.json`.
- Update `lib/foundation-readiness-gates.js`.
- Update `scripts/foundation-verify.mjs`.
- Update `lib/foundation-build-log.js`.
- Update `public/foundation.js` only for extraction retry visibility, not broad UI polish.
- Add `docs/process/extract-run-hardening.md`.
- Update `docs/process/foundation-done-test.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Add `docs/process/approvals/EXTRACT-RUN-HARDENING-001.json` only after approval.

Routes/surfaces covered:

- `GET /api/foundation-hub`
- `GET /api/foundation/extraction-control`
- Foundation Runtime Health extraction control panel
- Foundation readiness command: `npm run process:foundation-done-test -- --report-only`
- Foundation verifier: `npm run foundation:verify`

No new public route is required for v1 unless the existing extraction-control payload becomes too large. If a route is added, it must stay admin-gated through `requireAdminToken`.

## Central Hardening Layer

Create `lib/extraction-run-hardening.js` as the central policy layer.

Required exports:

- `EXTRACT_RUN_HARDENING_CARD_ID = 'EXTRACT-RUN-HARDENING-001'`
- `EXTRACT_RUN_HARDENING_CLOSEOUT_KEY = 'extract-run-hardening-v1'`
- `EXTRACTION_RETRY_STATES`
- `DEFAULT_EXTRACTION_RETRY_POLICY`
- `normalizeExtractionRetryPolicy(target)`
- `classifyExtractionItemRetry(item, target, policy)`
- `calculateExtractionBackoff({ attemptCount, policy, now })`
- `isExtractionItemRetryable(item, target, policy)`
- `buildExtractionNextSafeCommand(target, retrySummary)`
- `buildExtractionRunHardeningStatus(snapshot)`
- `buildSyntheticExtractionRunHardeningProof()`

This keeps retry/backoff rules in one place. Target scripts and dashboard code should consume status from this layer or from DB helpers that use it, not re-implement policy strings locally.

## Schema And Migration Needs

Use additive schema only. Do not drop or rewrite existing extraction tables.

Add queryable retry state to `source_crawl_items`:

- `retry_state TEXT NOT NULL DEFAULT 'not_evaluated'`
  - allowed values: `not_evaluated`, `not_retryable`, `eligible`, `waiting`, `leased`, `succeeded`, `skipped`, `blocked`, `exhausted`
- `max_attempts INTEGER NOT NULL DEFAULT 3`
- `next_retry_at TIMESTAMPTZ`
- `last_attempted_at TIMESTAMPTZ`
- `last_source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL`
- `retry_reason TEXT`
- `retry_blocker_card TEXT`

Add item-attempt ledger:

- `source_crawl_item_attempts`
  - `attempt_id TEXT PRIMARY KEY`
  - `item_key TEXT REFERENCES source_crawl_items(item_key) ON DELETE CASCADE`
  - `target_key TEXT NOT NULL`
  - `source_id TEXT NOT NULL`
  - `source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL`
  - `attempt_number INTEGER NOT NULL`
  - `status TEXT NOT NULL CHECK (status IN ('leased','succeeded','failed','skipped','blocked'))`
  - `lease_owner TEXT`
  - `started_at TIMESTAMPTZ`
  - `finished_at TIMESTAMPTZ`
  - `next_retry_at TIMESTAMPTZ`
  - `error_class TEXT`
  - `error_message TEXT`
  - `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
  - unique index on `(item_key, source_crawl_run_id, attempt_number)`

Backfill rules:

- Existing `succeeded` items become `retry_state = 'succeeded'`.
- Existing `skipped` items become `retry_state = 'skipped'` unless the target budget explicitly allows retrying that skipped reason.
- Existing `failed` items are classified:
  - below cap and retryable error -> `eligible` or `waiting`
  - at/over cap -> `exhausted`
  - unsupported/access/permission/future-lane reason -> `blocked` with `retry_blocker_card`
- Existing `leased` items with expired leases are reaped by the new stale-item lease handler and then classified.
- No raw item content is copied into retry metadata or proof output.

## Retry And Backoff Rules

Default retry policy:

- `maxAttempts = 3`
- hard cap: no target can set `maxAttempts > 5`
- `initialBackoffSeconds = 900` (15 minutes)
- `backoffMultiplier = 4`
- `maxBackoffSeconds = 86400` (24 hours)
- deterministic schedule; no jitter in v1 so proof is stable
- retry run item cap: `min(target.budget.maxItemsPerRun, target.budget.maxRetryItemsPerRun || 10)`

Retryable classes:

- timeout
- network transport error
- provider/rate limit
- source API 429/5xx
- stale item lease
- temporary Drive/Gmail/Missive/Slack/meeting fetch failure
- target-script failure that did not classify the item as unsupported or permission-blocked

Not retryable without another card or explicit target policy:

- permission denied / access request needed
- unsupported file type
- `not_in_v1` or future extractor lane
- no transcript/no subtitles where the next step is multimodal extraction
- too large unless target budget has an explicit retry prefix and a larger approved cap
- Skool or blocked-source items
- any item whose retry would broaden corpus/source scope beyond existing targets

Backoff state:

- On first failed attempt, set `attempt_count = 1` and `next_retry_at = failed_at + 15 minutes`.
- On second failed attempt, set `next_retry_at = failed_at + 60 minutes`.
- On third failed attempt, mark `exhausted` unless target policy explicitly allows more attempts.
- Items at max attempts do not retry automatically.
- `--force` can run a target, but cannot bypass item max attempts unless a proof-only script creates a synthetic fixture.

## Run IDs And Idempotency

Target-run rules:

- Every non-dry-run target execution must have one `source_crawl_target_runs.run_id`.
- `scripts/run-extraction-target.mjs` must pass that run ID to target scripts as `--crawlRunId=<id>`.
- `finishSourceCrawlTargetRun` must require both `runId` and `leaseOwner`.
- Duplicate finish for the same run must not double-count target deltas. Either return the already-finished run for an exact idempotent repeat or fail closed before updating counters.
- Target-level counts must be derived from the run summary and/or item attempts, not from broad source table deltas when a run ID is available.

Item-attempt rules:

- Each item attempt must carry the current `crawlRunId`.
- `upsertSourceCrawlItem` must record `last_source_crawl_run_id` when supplied.
- A helper must write one attempt row per `(item_key, source_crawl_run_id, attempt_number)`.
- Re-running the same item under the same run ID must not increment attempts twice.
- Attempt metadata may include IDs, reason codes, counts, and hashes; it must not include raw email, transcript, Drive content, attachment text, or video transcript content.

## Failed Item Retry Behavior

Add DB helpers in `lib/foundation-db.js`:

- `getRetryableSourceCrawlItems({ targetKey, limit, now })`
- `leaseRetryableSourceCrawlItems({ targetKey, runId, leaseOwner, limit, leaseSeconds })`
- `markSourceCrawlItemAttemptStarted(...)`
- `markSourceCrawlItemAttemptFinished(...)`
- `markStaleSourceCrawlItems(...)`
- `classifySourceCrawlItemRetries(...)`
- `getExtractionRunHardeningSnapshot(...)`

Target-script behavior:

- Meeting notes: replace the current ad hoc failed-item listing with the central retry helper.
- Drive content: retry failed `drive_content_extraction` rows and explicitly allowed skipped reasons without rerunning the full inventory queue.
- Email attachments: retry failed `gmail_attachment` rows without widening the Gmail query.
- Video content: retry failed `video_content_extraction` rows while leaving no-subtitle/vision-needed skips blocked for `MULTIMODAL-EXTRACTOR-001`.
- Gmail/Missive/Slack current-day: keep idempotent window reruns for normal current-day extraction, but failed item rows must still be classified and either retried by target-specific ID where safe or blocked with a next safe command.
- Drive corpus inventory and video link inventory: inventory failures must be retryable by external ID or blocked; no broad re-inventory is allowed just to clear one failed item.

No retry path may rerun an entire broad source window just because one item failed.

## Partial Failure Handling

Rules:

- Any target run with `itemFailures > 0` must finish as `partial`, not `succeeded`.
- Partial target runs exit nonzero in `scripts/run-extraction-target.mjs`.
- Partial runs must preserve successful item/artifact writes and mark failed items for retry classification.
- Partial runs must still write `intelligence_job_runs` with `failure_count`.
- Partial target runs must expose a next safe command, such as:
  - `npm run extraction:target -- --target=drive-content-extract-backfill --retryFailed=true`
  - or a blocked reason if no safe retry command exists.
- A target cannot be readiness-healthy if its latest partial/failed state has no retry queue, exhausted state, or blocker reason.

## Stale Lease Handling

Existing target-run stale reaping stays.

Add stale item lease handling:

- `source_crawl_items.status = 'leased'` with expired `lease_expires_at` is stale.
- Stale item leases are marked failed with `retry_reason = 'stale_item_lease'`.
- If under cap, stale items become retry-eligible after backoff.
- If at cap, stale items become exhausted.
- Target-run reaping also releases or classifies associated leased items for that run.
- `scripts/foundation-worker.mjs` must call `markStaleSourceCrawlItems` before selecting due jobs, alongside the existing target-run reaper.

Proof must include a synthetic stale item lease that cannot remain silently leased.

## Cursor And Backfill Boundaries

Backfill/corpus/recovery target rules:

- Every active target in `lane IN ('backfill','corpus_mining','recovery')` must have:
  - `budget.maxItemsPerRun`
  - `budget.maxRuntimeSeconds`
  - a cursor type in `cursor_state.cursorType`
  - either `budget.dailyMissionQuota` or manual-only runtime
  - idempotent `dedupe_policy`
- `--force` cannot bypass max item/runtime caps.
- Cursor state may advance only after the target run records terminal item state for selected items.
- Partial runs may preserve successful cursor details, but the next run must drain eligible retries before advancing broad backfill work.
- Blocked/paused targets such as Skool and Zoom must stay blocked/paused and cannot be made readiness-green by hidden retries.

Proof must fail if an active backfill/corpus target has no cap, no cursor type, or an unbounded retry command.

## Dashboard And Proof Visibility

Extend extraction-control snapshot with metadata-only fields:

- `summary.retryEligibleItems`
- `summary.retryWaitingItems`
- `summary.retryExhaustedItems`
- `summary.retryBlockedItems`
- `summary.staleLeasedItems`
- `summary.partialRuns`
- `summary.targetsMissingRetryPolicy`
- `coverageByTarget[].retrySummary`
- `coverageByTarget[].nextSafeCommand`
- `coverageByTarget[].hardeningStatus`

Runtime Health should show these in the existing Extraction Control coverage panel only. Do not build a new sprint view or broader UI redesign.

Operator copy must answer:

- what failed
- whether it will retry
- when it can retry
- when it is exhausted
- what card or source access blocks it
- the next safe command

## Readiness Integration

Implementation must update:

- `lib/foundation-readiness-gates.js`
  - add `closeoutKey: 'extract-run-hardening-v1'` to `EXTRACT-RUN-HARDENING-001`.
- `scripts/process-foundation-done-test.mjs`
  - no shape change expected; it should clear the extraction leg via the readiness registry once closeout proof exists.
- `scripts/foundation-verify.mjs`
  - add structural coverage for the central hardening layer, script, package command, approval artifact, build-log closeout, retry state, stale item reaper, and readiness result.
- `lib/foundation-build-log.js`
  - add exact closeout owned only by `EXTRACT-RUN-HARDENING-001`.
- `docs/process/foundation-done-test.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`
  - update remaining readiness blockers without marking meeting ACL/vault cards done.

After implementation, `npm run process:foundation-done-test -- --report-only` should no longer name `EXTRACT-RUN-HARDENING-001`.

It is OK, and expected, if Foundation remains `not_ready` because of:

- `MEETING-VAULT-ACL-001`
- `DRIVE-ACCESS-REQUEST-001`

## Focused Proof Script

Add `scripts/process-extract-run-hardening-check.mjs`.

Required proof:

- Synthetic retry policy cases:
  - retryable timeout -> `eligible` / `waiting`
  - retryable item below cap -> next retry scheduled
  - item at cap -> `exhausted`
  - unsupported/no-transcript/future-lane item -> `blocked`
  - stale leased item -> reaped and classified
  - duplicate finish/attempt proof does not double-count
- Live extraction snapshot checks:
  - all 12 governed targets remain represented
  - every active backfill/corpus/recovery target has max item/runtime/cursor bounds
  - no stale target runs
  - no stale item leases
  - every failed item has retry state, next retry, exhausted, or blocker classification
  - partial/failed target runs expose next safe command or blocker
  - proof output contains no raw/private source content
- Readiness check:
  - `EXTRACT-RUN-HARDENING-001` is no longer in readiness blocking cards when healthy and closed.

If healthy, the script may update `EXTRACT-RUN-HARDENING-001` to `done` with `extract-run-hardening-v1`. It must not mark `MEETING-VAULT-ACL-001` or `DRIVE-ACCESS-REQUEST-001` done.

## Acceptance Criteria

This card is done only when:

- Central retry/backoff policy exists in `lib/extraction-run-hardening.js`.
- `source_crawl_items` has queryable retry state.
- Item attempts are ledgered with run IDs.
- Target runner passes `crawlRunId` into target scripts.
- Duplicate run finish/attempt paths cannot double-count.
- Failed items are retryable, waiting, exhausted, blocked, or succeeded; none are ambiguous.
- Stale item leases are reaped.
- Partial runs stay partial/failed and expose next safe command.
- Active backfill/corpus/recovery targets are bounded by budget and cursor.
- Runtime Health exposes retry/exhausted/blocked/stale item state.
- `process:extract-run-hardening-check`, `foundation:verify`, and `process:foundation-done-test -- --report-only` prove the behavior.
- Foundation readiness no longer names `EXTRACT-RUN-HARDENING-001`.
- Foundation may still be `not_ready` due only to meeting Drive ACL/vault blockers.

## Proof Commands

Required implementation proof:

```bash
npm run process:extract-run-hardening-check
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=EXTRACT-RUN-HARDENING-001 --planApprovalRef=docs/process/approvals/EXTRACT-RUN-HARDENING-001.json --closeoutKey=extract-run-hardening-v1 --commitRef=HEAD
```

Useful focused diagnostics before closeout:

```bash
npm run extraction:target -- --target=drive-content-extract-backfill --dryRun=true
npm run extraction:target -- --target=meetings-current-day --dryRun=true
curl -s "http://localhost:3000/api/foundation/extraction-control?limit=200"
```

Do not run broad extraction or source expansion as proof.

## Rollback And Fail-Closed Behavior

- Schema changes are additive; rollback is disabling retry selection while leaving existing target/item ledgers readable.
- If retry classification is missing, readiness stays `not_ready`.
- If an item retry path is unsafe, classify it `blocked` with a blocker card instead of pretending it is retried.
- If a target cannot prove bounded caps, keep it blocked or paused.
- If a target-specific script cannot safely retry by item, expose a next-safe command blocker and keep readiness red until fixed.
- If proof output would expose raw source content, fail the proof.

## Recent Work Date Header Bug

Adjacent isolated bug:

- Recent Work day groups use `YYYY-MM-DD` keys.
- `public/foundation.js` rendered those keys with the full timestamp formatter.
- In Toronto, `new Date('2026-05-09')` renders as May 8 at 8:00 PM.

Allowed planning-slice fix:

- Day group headers should call the existing date-only formatter, `formatAsOfDate(dayGroup.day)`.
- Individual build/card timestamps should continue to use `formatDate(...)`.
- This is not part of the extraction readiness closeout and should not expand into Recent Work UI polish.

## Not Included

Do not build:

- Strategy expansion
- Sales expansion
- Agent Feedback expansion
- Scoper
- Agent Factory
- broad corpus expansion
- researcher/self-improvement agent
- video mining or new multimedia extraction
- meeting Drive ACL/vault work
- public access
- sprint view
- broad Recent Work/UI polish
- new source connectors or new extraction lanes
- Skool crawling
- Loom/Zoom/Drive video multimodal extraction
- advisor chat
