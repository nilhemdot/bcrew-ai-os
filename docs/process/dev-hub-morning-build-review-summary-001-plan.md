# DEV-HUB-MORNING-BUILD-REVIEW-SUMMARY-001 Plan

## What

Add a compact Morning Build Review summary to the proposed-card source-proof readback.

This gives Steve one operator summary for the proposed Dev build cards: how many are ready for review, how many have source proof, which items are top-ranked, and a Harlan digest preview that explicitly does not send.

## Why

The source-proof rows are detailed. Steve also needs a quick wake-up read: "what is ready, what is proven, what did the system mutate, and what could Harlan say later." The summary should answer that without creating cards, sending Harlan, or authorizing builds.

## Acceptance Criteria

- Extends `proposedCardSourceProofReadback`; does not create another truth layer.
- Adds `morningBuildReview` with:
  - review status
  - summary text
  - approval-required count
  - source-proof-ready count
  - candidate-proof row count
  - source-lineage ref count
  - top items
  - Harlan digest preview
- Harlan digest preview always has `sendsMessageNow: false`.
- Focused proof fails if the summary sends Harlan, creates cards, writes backlog/approval records, opens Current Sprint, or authorizes builds.
- Dev Hub renders the summary inside the existing Proposed Card Source Proof panel.

## Not Next

- Do not send Harlan.
- Do not create backlog cards or approval records.
- Do not open Current Sprint work.
- Do not mutate Scoper, Portfolio, routes, destinations, decisions, or open questions.
- Do not run extraction, connector probes, browser sessions, model calls, or external writes.
- Do not authorize implementation or auto-build from the summary.

## Proof

- `node --check lib/dev-hub-proposed-card-source-proof-readback.js scripts/process-dev-hub-morning-build-review-summary-check.mjs public/dev-proposed-card-source-proof-readback.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-hub-morning-build-review-summary-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:process-check-readonly-mode-check -- --json`
- `npm run foundation:verify -- --json-summary`
