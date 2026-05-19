# Knowledge-Base Quality Gate Closeout

Card: `KNOWLEDGE-BASE-QUALITY-GATE-001`

Closeout key: `knowledge-base-quality-gate-v1`

## What Shipped

Defined the Foundation-owned fail-closed quality gate for compiled knowledge before any agent can query or cite compiled KB output.

The V1 gate covers:

- citations and source IDs
- stale or fuzzy freshness expectations
- unresolved contradictions
- oversized pages
- orphan pages
- missing frontmatter
- privacy/tier violations
- unsourced doctrine

## Where It Lives

- `lib/foundation-knowledge-base-quality-gate.js`
- `scripts/process-knowledge-base-quality-gate-check.mjs`
- `lib/foundation-intelligence-audit-verifier.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `docs/process/knowledge-base-quality-gate-001-plan.md`
- `docs/process/approvals/KNOWLEDGE-BASE-QUALITY-GATE-001.json`

## Proof

- Focused proof: `process:knowledge-base-quality-gate-check` passed with 26/26 checks.
- Dogfood: valid synthetic compiled page passes; missing frontmatter, missing citations/source IDs, stale freshness, unresolved contradiction, oversized page, orphan page, privacy/tier violation, unsourced doctrine, and live-run attempt fail closed.
- Backlog hygiene: healthy with 652 cards and 0 findings.
- `foundation:verify`: passed 478/478.
- `process:foundation-ship`: required before push.

## System Health Repair During Ship

The full verifier exposed Agent Feedback diagnostic route fragility while ClickUp returned rate-limit source errors. No live auto-send job was rerun, no Gmail was sent, and no ClickUp write was performed.

Repair shipped with this closeout:

- ClickUp `429`/external API errors in Agent Feedback diagnostic builders now degrade to explicit source-health risk instead of returning 500 from `/api/ops-hub` or `/api/foundation-hub?view=full`.
- The diagnostics dogfood now covers both slow-panel timeout and rate-limited ClickUp failure modes.
- Agent Feedback verifier acceptance now treats those degraded diagnostic reads as explicit fail-soft source outage, not hidden green production proof.
- Historical full-diagnostics focused proof no longer fails just because its old sprint is no longer the active sprint.

## Boundaries

This does not run live extraction, fetch transcripts, capture screenshots, crawl, summarize, call models, create compiled KB pages, build a query index/vector table, create atoms, write Research Inbox rows, mutate backlog from extracted content, or build Harlan/Fal/voice/Canva/OpenHuman work.

Next in the bounded Foundation queue: `AIOS-RUNTIME-PORTABILITY-GATE-001`.
