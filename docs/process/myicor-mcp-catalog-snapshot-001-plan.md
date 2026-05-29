# MYICOR-MCP-CATALOG-SNAPSHOT-001 Plan

## What

Persist the MyICOR MCP catalog as source-system state.

Plain English: the system should know what MyICOR contains before it extracts anything. This card records the read-only MCP course, lesson, and learning-resource metadata map into `source_crawl_items`, fingerprints each item, marks whether it is new/changed/known, and writes one reviewable `intelligence_report_artifacts` proof report.

## Why

Steve's target is a source system, not a one-time manual browse. MyICOR may contain high-value agentic OS, memory, MCP, Claude, workflow, myPKA, and orchestration lessons. The first durable move is state:

- what exists
- what changed
- what has only metadata mapped
- what is a high-value exact extraction candidate
- what is still blocked behind an exact content packet

## Acceptance Criteria

- Uses MyICOR MCP read-only tools first.
- Captures course metadata, lesson metadata, and learning-resource metadata.
- Persists a source target keyed as `myicor-mcp-catalog-snapshot-v1`.
- Persists one `source_crawl_items` row per catalog item with a stable fingerprint.
- Persists report artifact `source-system:myicor:mcp-catalog-snapshot:v1`.
- Marks items as `new`, `known_unchanged`, or `changed` by comparing existing fingerprints.
- Marks content status as `metadata_mapped_content_not_extracted`.
- Surfaces high-value exact candidates for later approval.
- Creates or refreshes the follow-up backlog cards for Skool source maps, source-state ledger, daily Dev Director loop, Dev page truth cleanup, and builder memory.
- No lesson bodies, scripts, videos, screenshots, downloads, browser crawl, atom/vector writes, external writes, Browserbase, or normal Chrome profile use.

## Implementation Shape

`get_courses + get_lessons + search_learning_resources -> normalized catalog rows -> fingerprints -> source-state comparison -> source_crawl_items -> report artifact -> follow-up cards`

The snapshot is intentionally metadata-only. If a lesson/resource looks valuable, the next step is an exact source packet under `MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001`.

## Follow-Up Cards

- `SKOOL-SOURCE-SYSTEM-MAP-001`: map approved free and paid Skool communities with state/delta before extraction.
- `SOURCE-EXTRACTION-STATE-LEDGER-001`: generalize extracted/not-extracted/changed/cleared state.
- `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`: daily review of old plus new evidence with suppression for ignored or implemented-cleared items.
- `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`: make `/dev` show live system truth, running systems, data flow, blockers, and proof.
- `BUILDER-MEMORY-SYSTEM-001`: builder startup memory so agents stop starting from scratch.

## Proof

Fixture/no-network proof:

```bash
npm run process:myicor-mcp-catalog-snapshot-check -- --json
```

Live read-only MCP apply:

```bash
npm run process:myicor-mcp-catalog-snapshot-check -- --live-mcp --apply --json
```

Supporting proof:

```bash
node --check lib/myicor-mcp-catalog-snapshot.js scripts/process-myicor-mcp-catalog-snapshot-check.mjs
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No broad MyICOR crawl.
- No lesson-content extraction.
- No course script copying.
- No video/audio/coaching-call capture.
- No screenshots/keyframes.
- No download.
- No progress mutation.
- No post/comment/message/profile/account mutation.
- No external writes.
- No atom/chunk/vector/query-index writes from MyICOR content.
- No Browserbase or hosted-browser fallback.
- No normal Chrome profile use.
