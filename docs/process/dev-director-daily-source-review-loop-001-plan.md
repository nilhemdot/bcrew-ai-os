# DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001 Plan

## What

Build Dev Director Daily Source Review Loop V1.

Plain English: the Dev Director should not keep rereading the same trash, forget what was already built, or treat metadata-only source maps like extracted evidence. This slice makes a proposal-only daily review artifact that reads the existing Director report plus the source-state ledger, MyICOR MCP catalog snapshot, and Skool source-system map.

The loop separates:

- existing Director build recommendations
- new/changed/kept source candidates from the ledger
- exact source-packet candidates from metadata-only MyICOR and Skool maps
- blocked approval/session/content-use queues
- suppressed history that should stay searchable but not keep resurfacing by default

## Why

Steve's stated vision is that every day new data arrives, Director reviews old plus new opportunities, enriches build opportunities, adds new ones when evidence supports it, suppresses low-value items, and clears implemented/documented work without deleting history.

This card builds that review layer. It does not create backlog cards automatically.

## Inputs

Required report artifacts:

- `director:dev-team-intelligence-director-001:aios-mission-v0`
- `source-system:extraction-state-ledger:v1`
- `source-system:myicor:mcp-catalog-snapshot:v1`
- `source-system:skool:source-system-map:v1`

Output report artifact:

- `director:dev-daily-source-review-loop:v1`

## Acceptance Criteria

- V1 consumes the existing Director report and source-system reports.
- V1 carries the source-state ledger rule: `new + changed + graded_keep`, excluding `graded_ignore` and `implemented_cleared`.
- V1 proves suppressed history stays searchable and is not deleted.
- V1 turns MyICOR and Skool metadata/source maps into exact source-packet candidates, not build recommendations, until extracted evidence exists.
- V1 keeps the existing Director ranking review-only until new extracted evidence changes it.
- V1 produces top queues: ready Director candidates, enrichment packet candidates, blocked approval/session/content-use items, and suppressed history count.
- V1 persists `director:dev-daily-source-review-loop:v1`.
- V1 marks `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001` done only after the report artifact, backlog closeout note, current docs, coverage registration, and proof script pass.
- No auto backlog promotion.
- No automatic suppression apply.
- No source extraction run.
- No browser session.
- No atom/vector write.
- No source row mutation or deletion.
- No external write.

## Implementation Shape

V1 adds:

- `lib/dev-director-daily-source-review-loop.js`
- `scripts/process-dev-director-daily-source-review-loop-check.mjs`
- package script `process:dev-director-daily-source-review-loop-check`
- report artifact `director:dev-daily-source-review-loop:v1`
- live backlog proof note for `DEV-DIRECTOR-DAILY-SOURCE-REVIEW-LOOP-001`
- verifier coverage registration for the done card

## Proof

Focused proof:

```bash
node --check lib/dev-director-daily-source-review-loop.js scripts/process-dev-director-daily-source-review-loop-check.mjs
npm run process:dev-director-daily-source-review-loop-check -- --json
npm run process:dev-director-daily-source-review-loop-check -- --apply --json
```

Supporting proof:

```bash
npm run process:source-extraction-state-ledger-check -- --json
npm run process:skool-source-system-map-check -- --json
npm run process:myicor-mcp-catalog-snapshot-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- No auto backlog card creation.
- No Director-to-Scoper promotion without Steve approval.
- No automatic deletion or irreversible suppression.
- No MyICOR, Skool, YouTube, web, Drive, or private-source extraction.
- No browser login/session/run.
- No post/comment/message/email/external write.
- No atom/chunk/vector write from this review loop.
- No Dev page UI cleanup in this card; that is `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001`.
