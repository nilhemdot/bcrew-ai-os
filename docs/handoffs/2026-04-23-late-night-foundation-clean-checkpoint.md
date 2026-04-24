# Late-Night Foundation Clean Checkpoint

Date: 2026-04-23
Status: checkpoint after full conversation/backlog review

## Why This Checkpoint Exists

Steve asked for a full regroup because the conversation had spread across:

- shared communications backfill
- Zoom historical recovery
- Gmail / Missive depth
- atoms versus synthesis
- old scout/director intelligence patterns
- Strategy Hub prerequisites
- marketing source lanes
- future CRM / recruiting CRM
- ClickUp / future project-manager behavior
- old-system review feedback

The durable decision is:

- keep the new Foundation architecture
- do not recreate the old scout swarm
- preserve the useful old output patterns
- build synthesis as the bridge from raw archive to actual intelligence

## Current Archive Reality

Current source coverage in PostgreSQL:

- Gmail: `1,103` archived threads, oldest currently `2026-04-09`
- Missive: `1,248` archived threads, oldest currently `2026-04-09`
- Slack: `1,371` archived threads, oldest currently `2026-01-27`
- Meetings: `1,498` artifacts
- Meeting notes / recovered historical text: oldest `2024-10-03`
- Meeting transcripts: oldest `2025-03-12`

Candidate totals:

- total candidates: `4,481`
- task candidates: `1,977`
- decision candidates: `263`
- blockers: `281`
- feedback signals: `470`
- atom candidates: `1,490`

Important boundary:

- this is a strong archive, not a complete 180-day Gmail/Missive backfill
- Zoom historical chats are partial context, not full transcripts
- more backfill without synthesis creates noise, not leverage

## Synthesis Proof

The first batch synthesis proof exists:

- `docs/specs/2026-04-23-synthesis-engine-v1.md`
- `scripts/generate-shared-comms-synthesis.mjs`
- `docs/handoffs/2026-04-23-shared-comms-synthesis-v1.md`

The proof correctly grouped raw candidates into higher-level live issues, including:

- KPI/reporting reliability break
- automation / old-system output trust degradation
- SocialPilot publishing instability
- finance reconciliation and transaction processing blockers
- lead-source attribution/source-trust issues
- specific compensation / billboard / agreed-client decisions requiring follow-through

This is still V1:

- batch output only
- no persisted synthesized-item table yet
- no continuous resolution/supersession engine yet
- no source-backed KPI/finance fact bundle injected yet

## Backlog Captured Or Enriched

Already captured and now treated as repo truth:

- `SOURCE-019` shared communications ingestion and synthesis layer
- `SOURCE-020` shared communications source adapters
- `SYNTHESIS-ENGINE-001` continuous synthesis layer
- `REPORT-MINING-001` mine old scout/director reports for useful output shapes
- `PLATFORM-INTEL-001` shared platform intelligence for publishing hubs
- `CRM-OWNERSHIP-001` owner-entity tagging for portability
- `AVATAR-001` old avatar registry salvage for future marketing hub
- `SOURCE-021` Lee/FUBZahnd middleware logic mining
- `SYSTEM-010` visible process control and kill switches before autonomous loops

Newly captured in this checkpoint:

- `COMMS-BACKFILL-001` durable cursor-based historical backfills
- `SYNTHESIS-FACTS-001` source-backed KPI/finance/strategy fact grounding for synthesis
- `CRM-RECRUIT-001` future Steve recruiting CRM inside AI OS, not a separate UR CRM
- `CRM-LEGACY-001` archive/review old Houseable CRM code if provided
- `PM-BASE-001` shared ClickUp/project-management substrate before hub PM overlays
- `FUB-AGENT-TOOLS-001` future agent-facing FUB tools, not current leadership synthesis

## Old System Lesson

The old system had real value:

- director briefs
- scout reports
- feedback-scout patterns
- marketing reports
- decision/action/blocker output shapes
- avatar work
- source adapter knowledge

The old system also failed structurally:

- too many independent scouts
- hidden schedules
- stale reports
- inconsistent schemas
- source truth mixed with generated narrative
- no single governed synthesis layer
- weak process control / decommissioning

Correct rebuild pattern:

- code-owned ingestion routines
- code-owned extraction routines that may use LLMs
- one Foundation synthesis layer
- consumer-specific Strategy/Leadership/Sales/Ops/Marketing views
- future agents only after `SYSTEM-010`

Do not build one new agent per source.

## What Is Next

Next build order:

1. Finish the clean checkpoint and verification.
2. Turn synthesis V1 from a one-off proof into the first persisted synthesis layer.
3. Add source-backed fact inputs from strategy, KPI, finance, Owners, FUB, marketing connector health, and source contracts.
4. Generate a tighter ownership strategy packet: top strategic issues, decisions needed, blockers, source-trust exceptions, and what is stale/resolved.
5. Add durable backfill cursor/run state so Gmail/Missive/Slack/Drive pulls can continue overnight without relying on terminal memory.
6. Continue deeper backfill only after the system can explain coverage and synthesize what matters.

Not next:

- rebuilding the old scout swarm
- importing FUB client notes into leadership synthesis by default
- building the recruiting CRM before Foundation/multi-tenancy
- building hub PM agents before the shared PM base and supervision exist

## Human Action Needed

None for this checkpoint.

Steve can ask the old-system chat to review the pushed repo after this commit. The useful review prompt is:

> Review the latest `bcrew-ai-os` main branch. Focus on whether the rebuild preserves the useful old intelligence/reporting patterns without recreating the old scout swarm. Pay special attention to `docs/rebuild/intelligence-pipeline.md`, `docs/specs/2026-04-23-synthesis-engine-v1.md`, `docs/rebuild/current-plan.md`, and the new backlog cards around synthesis/backfill/source facts.
