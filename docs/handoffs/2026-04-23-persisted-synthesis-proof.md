# Persisted Synthesis Proof

Date: 2026-04-23
Status: implemented and verified

## What Changed

The shared-communications synthesis is no longer only a markdown handoff.

It now persists into PostgreSQL:

- `shared_communication_synthesis_runs`
- `shared_communication_synthesized_items`

It is readable through:

- Foundation snapshot: `sharedCommunicationSynthesis`
- Admin API: `/api/shared-communications/synthesis`
- Markdown proof: `docs/handoffs/2026-04-23-shared-comms-synthesis-source-facts-proof.md`

## Latest Persisted Run

- Run id: `synth-20260424T031259Z-d7104af839`
- Model: `gpt-5.4`
- Candidates read: `180`
- Ranked items recorded: `12`
- Source facts included:
  - doc source facts: `25`
  - critical backlog facts: `40`
  - open questions: `4`
  - recent changes: `30`

## Why It Matters

This is the first real step from extraction to usable intelligence.

Before:

- archive existed
- candidates existed
- markdown proof existed
- nothing durable represented the synthesized live issues

Now:

- synthesis runs are inspectable
- ranked items are queryable
- future Strategy Hub / leadership brief views can read the same stored items
- the system can compare later runs against earlier runs

## What The Latest Proof Surfaced

Top source-backed items:

- automation/intelligence layer degradation
- old/stale system briefs should not be trusted for execution
- KPI dashboard missing deal data despite source data appearing intact
- lead-source attribution and FUB lineage are still a live data-quality bottleneck
- finance reconciliation and commission-normalization remain unsettled
- SocialPilot instability and API gating are active marketing-source blockers

The proof also used source-backed context:

- team volume currently behind 2026 pace
- community goal currently behind 2026 pace
- open finance/source-trust/backlog state

This makes the synthesis more useful than a plain comms summary.

## Still Open

This is still a batch proof.

Open work:

- persist resolution/supersession state
- compare current synthesized items to prior runs
- add richer KPI / finance / FUB / marketing source-fact bundles
- add durable backfill-run tracking
- build the tighter ownership strategy packet view
- decide what gets promoted to backlog / decision / question / ClickUp after human review

## Verification

Passed:

- `node --check lib/foundation-db.js`
- `node --check server.js`
- `node --check scripts/generate-shared-comms-synthesis.mjs`
- `npm run foundation:verify`

Foundation verify result:

- `15/15 checks passed`
