# SOURCE-EXTRACTION-STATE-LEDGER-001 Plan

## What

Build the shared source extraction state ledger.

Plain English: the system should know what it has seen, what changed, what is only metadata-mapped, what is queued, what has evidence, what is blocked, what is ignored, and what has already been implemented or cleared.

## Why

Steve's source-system vision depends on compounding memory. MyICOR, Skool, YouTube, Drive, video, email, Slack, Missive, and future source systems cannot keep rereading the same rows or resurfacing old trash. The ledger is the reusable read model that lets later systems ask:

- what exists
- what changed
- what has not been extracted
- what has evidence
- what is blocked
- what should be suppressed from Director
- what should remain searchable as history

## Model

Each source item gets three separate axes:

- discovery state: `new`, `known_unchanged`, `changed`, or `discovered`
- extraction state: `metadata_mapped_content_not_extracted`, `queued_or_pending`, `extracted_with_evidence`, `archived_with_artifact`, `skipped`, `blocked`, `failed`, or `discovered_only`
- review state: `unreviewed`, `graded_keep`, `graded_ignore`, or `implemented_cleared`

Director suppression is reversible. `graded_ignore` and `implemented_cleared` are excluded from the default Director candidate count, but the rows stay in history.

## Acceptance Criteria

- Reads existing `source_crawl_targets` and `source_crawl_items`.
- Produces target-level and source-level counts.
- Preserves MyICOR as metadata-mapped and not content-extracted.
- Includes a dogfood fixture that proves every required state exists.
- Persists report artifact `source-system:extraction-state-ledger:v1` only when run with `--apply`.
- Updates `SOURCE-EXTRACTION-STATE-LEDGER-001` with a V1 proof note only when run with `--apply`.
- No source row mutation.
- No source row deletion.
- No atom/vector/chunk writes.
- No browser start.
- No external write.
- No automatic Director suppression yet.

## Implementation Shape

`source_crawl_targets + source_crawl_items -> discovery/extraction/review classifier -> target/source summaries -> Director routing counts -> report artifact`

## Follow-Up Cards

- `SKOOL-SOURCE-SYSTEM-MAP-001`: use the ledger taxonomy for approved Skool source maps.
- `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`: feed new/changed/kept items into Director and suppress ignored/implemented-cleared rows without deleting history.
- `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`: expose ledger counts in the Dev page system truth view.
- `BUILDER-MEMORY-SYSTEM-001`: include ledger proof and current source state in builder startup memory.

## Proof

Read-only proof:

```bash
npm run process:source-extraction-state-ledger-check -- --json
```

Persist report/backlog readback:

```bash
npm run process:source-extraction-state-ledger-check -- --apply --json
```

Supporting proof:

```bash
node --check lib/source-extraction-state-ledger.js scripts/process-source-extraction-state-ledger-check.mjs
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No Skool login or crawl.
- No broad source extraction.
- No lesson/content copying.
- No MyICOR lesson extraction.
- No browser automation.
- No Director auto-apply.
- No backlog auto-promotion from ledger states.
- No destructive cleanup of ignored or implemented-cleared rows.
