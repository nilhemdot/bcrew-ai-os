# DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001 Plan

Closeout key: `dev-page-system-truth-cleanup-v1`

## Goal

Make `/dev` show the live truth for the Human Web Agent V1 sprint: what is built, what is running, what is blocked, what source data is present, and what proof backs each claim.

## Source-Backed Inputs

- `director:dev-team-intelligence-director-001:aios-mission-v0`
- `director:dev-daily-source-review-loop:v1`
- `source-system:extraction-state-ledger:v1`
- `source-system:myicor:mcp-catalog-snapshot:v1`
- `source-system:skool:source-system-map:v1`
- Existing `/api/foundation/dev-team-hub` YouTube intelligence, extractor parity, source-family maturity, and extraction economics readbacks.

## Build Slice

- Add a `systemTruth` read model to the Dev Hub payload.
- Render a System Truth section on `/dev` above Director recommendations.
- Show built/running/blocked systems with report IDs, proof commands, counts, next action, and approval-bound blockers.
- Persist `dev-page:system-truth-cleanup:v1` as the closeout report.
- Mark `DEV-PAGE-SYSTEM-TRUTH-CLEANUP-001` done only through the focused proof.

## Boundaries

- No Browserbase default.
- No normal Chrome profile.
- No extraction or source browser run.
- No source row mutation.
- No atom/vector write.
- No backlog promotion beyond this card closeout.
- No external write, login, join, post, comment, message, download, or paid/private read.

## Proof

Run:

```bash
npm run process:dev-page-system-truth-cleanup-check -- --apply --json
npm run process:dev-page-system-truth-cleanup-check -- --json
npm run process:dev-team-hub-v0-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Acceptance: the focused proof sees the required source-backed reports, `/api/foundation/dev-team-hub` exposes `systemTruth`, `/dev` renders the System Truth section, the live card is P0 done, and guardrails prove no browser/extraction/external write started.
