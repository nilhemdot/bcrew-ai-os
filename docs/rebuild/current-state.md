# BCrew AI OS Current State

Last updated: 2026-04-24
Purpose: one short answer to "what is actually closed, what is still partial, and what closes next?"

Rule: if a package depends on open live inputs, open runtime activation, or open parity work, the package is still open even if part of it is signed off.

## Level Guide

| Level | Meaning |
| --- | --- |
| Level 1 | The system can reach and read the source. |
| Level 2 | The trusted unit and meaning are reviewed and signed off. |
| Level 3 | Refresh cadence, stale-state visibility, and runtime ownership are explicit. |
| Level 4 | Approved writes and governed automation are live. |

## Short Version

The Foundation is real. The system is not yet fully alive.

Built:

- source contracts and Foundation DB
- verifier
- dashboard/Foundation UI
- shared communications archive
- meeting/Gmail/Missive/Slack extraction lanes
- historical meeting context back to October 2024 where recovered/transcribed
- persisted synthesis runs/items
- first job registry and job-run ledger
- Owners/deal-review runners
- doc cleanup plan and generated evidence indexes

Open:

- dashboard buttons for pause/resume beyond the DB/API control path
- source cursors and leases
- current-day extraction lane
- policy-aware LLM router workload migration beyond the new audit shell
- hub-dedicated model capacity
- extraction control plane
- synthesis hardening against resolved/stale/duplicated items
- explicit subject-person privacy/redaction before hubs or agents use sensitive people evidence
- FUB/finance/KPI source sign-off
- marketing source map by brand lane
- Strategy Hub
- Harlan/Crewbert useful runtime

## Foundation Surfaces

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Open hardening | v6 rebuild plan is live, prior plan is preserved in plan history, and handoff/audit indexes now separate evidence from active doctrine. | Finish doc cleanup Phase 1/2: classify indexes and promote any durable truth into active docs/backlog. | Optional dated archive folders after indexes are trusted. |
| Runtime activation | Open hardening | First Foundation job registry and DB-backed job run ledger exist. Jobs can be run through the Foundation runner. Runtime metadata now marks scheduled vs manual jobs, computes due/next-run state, exposes scheduled/due/manual counts, and `npm run foundation:worker` can run due jobs one at a time. The first worker proof ran both read-only deal-review jobs and cleared due state. `ai.bcrew.foundation-worker` and `ai.bcrew.dashboard` are loaded as LaunchAgents, so the worker and web process survive terminal exit. Active-run locking now prevents duplicate queued/running runs for the same job, job timeout cleanup kills the process group with `SIGTERM` then `SIGKILL`, and DB-backed pause/resume works through `/api/foundation/jobs/:jobKey/control`. | Add dashboard pause/resume buttons, then activate only the first 3-5 jobs. | Expand to all routines after the first jobs stay stable. |
| LLM routing | Open hardening | Phase 2 MVP substrate exists: `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls`; `lib/llm-router.js` seeds route config and records dry-run route selection; `llm-auth-audit` is registered as a manual Foundation job; Foundation API/UI can expose route status. Probe results show OpenAI API and Gemini API configured, Claude Code Max logged in locally, OpenClaw gateway running, Anthropic API missing, and Claude OAuth token missing. | Add route-level failure-mode/fallback review, dashboard polish, and then migrate one low-risk LLM script behind the router. | Hub-dedicated capacity and broader extraction/synthesis migration after probes are accepted. |
| Extraction control | Open now | Archives and manual/bounded extraction have proven value. | Build current-day lane, backfill lane, source cursors, leases, budgets, retries, and pause switches. | Drive/Skool/YouTube/source workers run one bounded bite at a time. |
| Strategy packet | Open now | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, and Agent Engine current reality are captured. Decision provenance, traceability, change ledger, contradiction queue, and strategy-change watch have first slices. | Finish strategy-used Owners slice and close `SOURCE-014`. | Strategy Hub after runtime/router/extraction/synthesis are stable. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Open now | `SRC-OWNERS-001` is signed off for meaning. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. Row-scoped review runners and `/api/owners/review-queue` exist. | Close `SOURCE-008`, `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, supported by `FINANCE-002`. | Reuse freshness and review patterns on more governed sources. |
| FUB lead-source taxonomy | Open now | `SRC-FUB-001` review and drift layers are live. | Finish Level 2 taxonomy baseline. | Add broader issue routing and future Sales Hub support. |
| Finance sign-off | Open now | `SRC-FINANCE-001` is partially reviewed, not signed off. | Close `FOUNDATION-003` after FUB. | Define freshness expectations and strategy-use rules. |
| KPI foundation system | Open now | `SRC-SUPABASE-001` is verified readable. KPI is live, but AI OS has not locked which truth layer to read for pipeline, shopping list, executed deals, goals, competition, and usage. | Use `SOURCE-010` to split KPI into explicit read rules. | Add health checks, freshness, and future Sales Hub surfaces. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. | Close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `SYNTHESIS-FACTS-001`, and `SYNTHESIS-ENGINE-001` through runtime/extraction/synthesis hardening. | Broader apply flows, subject-person privacy/query layer, and leadership packets. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; not yet a controlled worker. | Build Drive worker, Skool source contract/worker, and report-mining lane after runtime/router/extraction control. | Daily bounded corpus ingestion and dry-run organization. |

## Active Execution Order

1. Finish Runtime MVP hardening.
2. Finish the LLM router MVP acceptance review.
3. Extraction control MVP.
4. Retrieval/entity/synthesis hardening.
5. Source trust closures.
6. Drive, Skool, and old-system mining.
7. Strategy Hub.
8. First useful agents.

## Active Plan Docs

Trust these first:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`

Evidence indexes:

- `docs/handoffs/INDEX.md`
- `docs/audits/INDEX.md`

Everything else is supporting evidence unless promoted into the active docs.

## Boundary

### Foundation now

- understand sources
- define source boundaries
- verify sources
- sign off source meaning
- archive shared communications
- extract candidates/atoms
- synthesize source-backed intelligence
- operate scheduled/supervised routines
- route LLM calls through policy-aware infrastructure
- expose what is done, open, stale, failed, or paused

### Future hub work

- coaching
- reminders
- content production workflows
- data-entry enforcement agents
- ops accountability loops
- sales assistants
- manager nudges
- recruiting CRM behavior

Rule:

- if the work helps AI OS understand or operate shared truth, it is Foundation
- if the work tells a department/person what to do or acts in a workflow, it is Hub work
