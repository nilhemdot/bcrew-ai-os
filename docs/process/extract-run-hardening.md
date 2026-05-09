# Extraction Run Hardening

Status: shipped for `EXTRACT-RUN-HARDENING-001` under `extract-run-hardening-v1`.

This closeout hardens existing governed extraction lanes. It does not add new connectors, widen corpus scope, mutate meeting Drive ACLs, or build Strategy/Sales/Agent Feedback/Scoper/Agent Factory/researcher/video-mining work.

## What Must Stay True

- Every target execution has a `source_crawl_target_runs.run_id`.
- `scripts/run-extraction-target.mjs` passes that run ID to target scripts as `--crawlRunId=<id>` and through `EXTRACTION_CRAWL_RUN_ID`.
- `source_crawl_items` has queryable retry fields: `retry_state`, `max_attempts`, `next_retry_at`, `last_attempted_at`, `last_source_crawl_run_id`, `retry_reason`, and `retry_blocker_card`.
- `source_crawl_item_attempts` records one metadata-only attempt row per `(item_key, source_crawl_run_id, attempt_number)`.
- Duplicate finish/attempt paths are idempotent and cannot double-count target deltas or item attempts.
- Failed items are classified as `eligible`, `waiting`, `exhausted`, or `blocked`; succeeded/skipped rows are explicit.
- Stale item leases are reaped by the worker and classified through the same retry policy.
- Partial/failed targets expose a next safe command or a blocker.
- Active backfill/corpus/recovery targets stay bounded by item/file/artifact cap, max runtime, cursor type, and idempotent dedupe policy.

## Retry Policy

The central policy lives in `lib/extraction-run-hardening.js`.

Default behavior:

- max attempts: 3
- hard max attempts: 5
- first backoff: 15 minutes
- multiplier: 4
- max backoff: 24 hours
- retry item cap: target `maxItemsPerRun` capped by `maxRetryItemsPerRun` or 10

Retryable examples include timeouts, network/transport errors, provider 429/5xx errors, temporary source fetch failures, and stale item leases.

Blocked examples include access/permission failures, unsupported file types, future-lane reasons, video/audio/image/multimodal requirements, no transcript/subtitle cases, and source scope that would require a new extraction lane.

## Runtime Visibility

Runtime Health > Extraction Control shows:

- retry eligible/waiting/exhausted/blocked counts
- stale item lease count
- target hardening status
- next safe command or blocker

The proof output is metadata-only. It does not print raw emails, transcript text, Drive file content, attachment text, or video transcript content.

## Proof

Required closeout proof:

```bash
npm run process:extract-run-hardening-check
npm run process:foundation-done-test -- --report-only
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=EXTRACT-RUN-HARDENING-001 --planApprovalRef=docs/process/approvals/EXTRACT-RUN-HARDENING-001.json --closeoutKey=extract-run-hardening-v1 --commitRef=HEAD
```

Foundation may still report `not_ready` because of `MEETING-VAULT-ACL-001` and `DRIVE-ACCESS-REQUEST-001`.
