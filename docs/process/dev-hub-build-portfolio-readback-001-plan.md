# DEV-HUB-BUILD-PORTFOLIO-READBACK-001 Plan

## What

Expose the existing Build Portfolio / Sprint Master output on the Dev Hub as a read-only operator packet.

The current code can already trace Director recommendations through raw atoms/hits, run Scoper readiness, and merge Scoper-ready candidates into proposal-only portfolio groups. This card makes that final "what should I build next" layer visible on `/dev` without creating backlog cards, Scoper records, Portfolio records, sprint work, Harlan messages, extraction jobs, model calls, or external writes.

## Why

Steve's desired loop is:

`god-mode extract -> real atoms -> Director -> Scoper -> Portfolio/Sprint Master -> Steve approval -> build with the system`

The Scoper evidence trace currently proves the candidates are source-backed, but the operator surface still stops before the portfolio view that combines overlapping ideas. That means the system can know that four scoped recommendations become two stronger build opportunities while Steve still has to infer that from proof output. Dev Hub should show the ranked merged opportunities directly.

## Acceptance Criteria

- Reads the existing `buildDevBuildOpportunityEvidenceTrace` / Scoper-ready candidate payload from Dev Hub inputs.
- Reuses `buildPortfolioReview`; does not create a competing portfolio truth layer.
- Includes only candidates with:
  - `scoperStatus=ready_for_portfolio_review`
  - `sourceTraceStatus=source_trace_ready`
  - raw atom ID
  - raw hit ID
  - complete `portfolioCandidate`
- Shows portfolio groups with rank, score, decision, lane, title, reason, candidate count, and source-lineage count.
- Shows input candidate rows with raw atom/hit proof and the portfolio group they landed in.
- Shows parked candidate count separately; parked recommendations remain Scoper work, not Steve approval work.
- Every group remains `proposal_only_needs_steve_approval_after_portfolio_review`.
- Promotion policy remains `no_auto_promotion_without_steve_after_portfolio_review`.
- Dev Hub renders the packet from snapshot events through standalone JS/CSS.
- Focused proof fails if any row/group is auto-promoted, unbounded, missing source lineage, missing raw trace proof, or claiming live writes.

## Not Next

- Do not auto-create backlog cards from portfolio groups.
- Do not create or persist Portfolio records.
- Do not mutate Scoper records.
- Do not open Current Sprint work.
- Do not approve, apply, reject, snooze, reroute, or auto-clear action routes.
- Do not send Harlan or any external notification from this readback.
- Do not start extraction, connector probes, browser sessions, model calls, or external writes.
- Do not treat portfolio readiness as Steve approval or build authorization.

## Proof

- `node --check lib/dev-hub-build-portfolio-readback.js scripts/process-dev-hub-build-portfolio-readback-check.mjs public/dev-build-portfolio-readback.js lib/dev-team-hub.js scripts/process-dev-team-hub-v0-check.mjs`
- `npm run process:dev-hub-build-portfolio-readback-check -- --close-card --json`
- `npm run process:dev-team-hub-v0-check -- --json`
- `npm run process:process-check-readonly-mode-check -- --json`
- `npm run foundation:verify -- --json-summary`

