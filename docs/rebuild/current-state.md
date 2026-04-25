# BCrew AI OS Current State

Last updated: 2026-04-25
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
- scheduled Missive and Gmail current-day sync lanes
- policy-aware LLM router with a working OpenClaw/Codex subscription adapter for shared intelligence extraction and synthesis
- extraction control target/item ledger
- Google Drive corpus root list and Skool access-boundary source notes
- Video link inventory source contract and manual inventory lane for Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool URLs
- Owners/deal-review runners
- doc cleanup plan and generated evidence indexes

Open:

- durable item-level cursors/retry execution beyond current-day sync proof
- meeting-notes current-day scheduling after retry/report handling is hardened
- real-world partial-run failure proof before scheduling high-variance corpus lanes
- one schedule truth between Foundation jobs and source crawl targets
- Claude Code / Claude Agent SDK subscription adapter under the BCrew router
- hub-dedicated model capacity allocation beyond the first Foundation subscription route
- intelligence job ledger for extraction, embedding, video analysis, synthesis, and brief generation
- source-backed atom schema for rich extracted value
- retrieval spine: chunk-level lexical search, pgvector semantic retrieval, and hybrid evidence API
- synthesis hardening against resolved/stale/duplicated items
- router-ledged transcription workload if Zoom audio recovery is reopened
- full tier/redaction replacement for the interim admin gates on broad Foundation/Ops read APIs
- auth/tier middleware and explicit subject-person privacy/redaction before hubs, assistants, or non-admin users read sensitive people evidence
- `SYSTEM-010` decommission, dead-man, and cost/process controls before autonomous loops expand
- FUB/KPI source sign-off
- marketing source map by brand lane
- hub value routing for mined Drive/Skool/corpus assets
- Strategy Hub
- Harlan/Crewbert useful runtime
- Action Router v1: synthesized items do not yet become governed decisions, tasks, questions, contradictions, ignored/snoozed items, or owner-bound actions

## Foundation Surfaces

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Open hardening | v6 rebuild plan is live, prior plan is preserved in plan history, and handoff/audit indexes now separate evidence from active doctrine. | Finish doc cleanup Phase 1/2: classify indexes and promote any durable truth into active docs/backlog. | Optional dated archive folders after indexes are trusted. |
| Runtime activation | Open hardening | First Foundation job registry and DB-backed job run ledger exist. Jobs can be run through the Foundation runner. Runtime metadata now marks scheduled vs manual jobs, computes due/next-run state, exposes scheduled/due/manual counts, and `npm run foundation:worker` can run due jobs one at a time. The first worker proof ran both deal-review jobs and cleared due state. `ai.bcrew.foundation-worker` and `ai.bcrew.dashboard` are loaded as LaunchAgents, so the worker and web process survive terminal exit. Active-run locking now prevents duplicate queued/running runs for the same job, job timeout cleanup kills the process group with `SIGTERM` then `SIGKILL`, DB-backed pause/resume works through `/api/foundation/jobs/:jobKey/control`, and System Health now exposes pause/resume buttons on job cards. Scheduled Missive and Gmail current-day jobs now have worker proof. | Monitor scheduled current-day lanes, finish `SYSTEM-010` decommission/dead-man/cost/process controls, then activate only the next 1-2 jobs after they stay stable. | Expand to all routines after the first jobs stay stable and stop/decommission paths are proven. |
| LLM routing | Open hardening | Phase 2 now has executable routing, not just a shell. `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live. `llm-auth-audit` historically proved OpenClaw/Codex subscription auth through `openai-codex/gpt-5.4` OAuth; the 2026-04-25 audit corrected repo defaults to target `openai-codex/gpt-5.5`, and the route needs a fresh probe after the local Codex/OpenClaw upgrade. `lib/llm-router.js` now executes that subscription adapter, logs calls, and keeps direct OpenAI Responses API as a guarded fallback only. Shared candidate extraction and shared-comms synthesis are migrated to the router. Live proof: one synthesis run and one Gmail extraction run recorded `openclaw` / `chatgpt_subscription_gateway` / `estimatedCostUsd=0`. Audit stop-gap: Zoom audio transcription is paused/fail-closed for non-dry-run use, and verifier coverage now blocks direct OpenAI/Anthropic/Gemini host calls outside approved adapters. | Rebuild transcription as a router-ledged workload before reopening Zoom audio recovery, build the Claude Code / Claude Agent SDK subscription adapter, assign hub-dedicated capacity lanes, and re-probe the 5.5 route. Prove subscription-routed synthesis as Strategy Hub/action-router input after monitored runs. | Broader workload migration, overflow policy, and productized/tenant credential handling. |
| Extraction control | Open hardening | Phase 3 control-plane substrate exists: `source_crawl_targets`, `source_crawl_items`, and `shared_communication_artifact_processing_runs`. Current-day Gmail and Missive are scheduled every `120` minutes and have worker proof. Meeting notes current-day remains manual while recent transcript gaps and retry/report policy are hardened. Gmail/Missive/meeting transcript candidate extraction now targets artifacts without a successful processing run for the current content hash and records actual model/provider/auth-path/route provenance. Artifacts that correctly produce zero candidates are not reprocessed forever for the same extractor version and same content hash, while changed threads/transcripts become eligible again. Bounded extraction and synthesis now run through the router subscription adapter, not direct OpenAI Responses API. First manual Drive corpus bite is live through `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` children recorded, `24` folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed. Raw Drive inventory writes are guarded so non-dry-run inventory must run through `extraction:target`. `video-link-inventory-bite` now also runs through `extraction:target`; the latest controlled proof scanned `1060` archive/Drive inventory records, found `179` media-link occurrences, and recorded the target run as succeeded with `0` crawl failures. Raw video inventory writes are guarded from direct non-dry-run execution. Skool is blocked pending access/content-use boundaries. Zoom recovery is paused. | Monitor scheduled Missive/Gmail runs, prove partial failure on a real failed item, extend retry semantics to Drive/video lanes, build subscription miner v1, prove Strategy Hub/action-router synthesis, and build review/export gates before broad backfill. | Drive/Skool/Loom/YouTube/source workers run one bounded bite at a time. |
| Strategy packet | Done for current reality | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. `FOUNDATION-001` and `SOURCE-014` are closed for this phase. Decision provenance, traceability, change ledger, contradiction queue, and strategy-change watch have first slices. | No source sign-off closeout work remains for the current strategy packet. | Later hardening: Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, and Strategy Hub after runtime/router/extraction/synthesis/privacy/action-routing are stable. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Open now | `SRC-OWNERS-001` is signed off for meaning and now visibly carries the signed-off Owners workbook tabs: Admin, Split Cal, Agent Splits, Listings and Conditional Deals, Sales & Deposit, Goal & KPI Calculator, and CI Report. The Owners Dashboard `Lists` tab is verified as an `IMPORTRANGE` mirror but is not counted as the source-owned sign-off because governed writes belong to `SRC-OWNERS-LISTS-001` in the BHAG Builder / Old BIS KPI Lists Source workbook. `SRC-OWNERS-LISTS-001` is signed off for current-reality meaning after the imported `Lists` mirror repair: it owns the governed list/dropdown write target, Admin `N/P/S` validations are repointed, and delegated writes are guarded from the mirror range. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. Scheduled review runners now process queued Admin/conditional re-reviews first, then one June 2025+ first-pass backlog item per run, writing only AI review status/action/findings. `/api/owners/review-queue` exposes the inspection queue, and `/ops` gives Ops its own hub surface for the queue and the running systems serving it. Source-field corrections remain human-owned until an explicit apply/fix lane is approved. `DATA-018`, `DATA-019`, and `DATA-020` are closed guardrails; they should not stay in the active closeout list. | Close `SOURCE-008`, `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`; keep `npm run sheets:verify` green after sheet-source changes. | Reuse freshness and review patterns on more governed sources, then hand actionable cleanup to Ops Hub once routing/write approval exists. |
| FUB lead-source taxonomy | Open now | `SRC-FUB-001` review and drift layers are live. The first drift/enforcement guardrails are closed through `DATA-018` and `DATA-019`. | Finish Level 2 taxonomy baseline and source-lineage rules through `SOURCE-008` and `DATA-005`. | Add broader issue routing and future Sales Hub support. |
| Finance sign-off | Done for current reality | `SRC-FINANCE-001` is signed off for current-reality meaning. Weekly Actuals is the operating finance ledger, Cashflow Dash is the management interpretation after partner-commission normalization, the roll-up/budget tabs and `Unspent -L3M + Actual Helper` are included in signed-off current-reality coverage, and QuickBooks is optional compliance verification, not a current rebuild dependency. | Keep finance freshness and later payment reconciliation as future hardening, not source-signoff blockers. | Define Level 3 freshness expectations when finance automation starts reading it continuously. |
| KPI foundation system | Open now | `SRC-SUPABASE-001` is verified readable. KPI is live, but AI OS has not locked which truth layer to read for pipeline, shopping list, executed deals, goals, competition, and usage. | Use `SOURCE-010` to split KPI into explicit read rules. | Add health checks, freshness, and future Sales Hub surfaces. |
| Shared freshness rules | Done for Owners/FUB first layer | The maturity model defines Level 3, and first Owners/FUB freshness guardrails are live through `DATA-020`. | No active freshness-rule closeout remains for the current Owners/FUB layer. | Reuse this pattern for finance, KPI, connectors, Drive/video corpus, and future source surfaces when those readers become continuous. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. Extraction doctrine now requires useful material to route to strategy, ops, sales, marketing, recruiting, agent coaching, and Steve-owned content/course lanes instead of only becoming raw archive. System Health now has an Intelligence Pipeline panel that shows archived artifacts, processed artifacts, artifacts with active candidates, pending extraction backlog, extraction coverage percent, and latest synthesis so runtime progress is visible. `shared-comms-intelligence-bite` is now the synthesis fast path: it records ranked Strategy Hub/action-router input from already-mined candidates without starting live extraction and uses a long subscription-route timeout. Gmail, Missive, meeting transcript, Slack, and Zoom extraction run as separate paced subscription miners with per-source timeout knobs. Last successful router-backed synthesis proof recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked items through `openclaw/chatgpt_subscription_gateway`, not direct API. Later proof runs exposed subscription-route timeout/context issues, so this surface is not schedule-ready. Broad Foundation/Ops read APIs now have interim admin gating outside localhost; `SECURITY-002` still needs the real auth/tier and subject-person redaction layer before broader hub/query/assistant access. | Close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `HUB-INTEL-001`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, `SECURITY-002`, and `ACTION-ROUTER-001` through runtime/extraction/synthesis/privacy/action-routing hardening. Next operating move is Foundation closeout: paced miner v1, auth/tier/redaction gate, and Action Router v1, not Strategy Hub UI. | Broader apply flows, subject-person privacy/query layer, and Strategy Hub. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; first controlled surfaces now exist. Eight Google Drive shared-drive roots are captured in `docs/source-notes/google-drive-corpus.md`. Skool access research is captured in `docs/source-notes/skool-corpus.md`; Skool remains blocked for blind crawling because access and content-use boundaries are not approved. Video/Loom research is captured in `docs/source-notes/video-link-inventory.md`; Apify credentials are available locally but unvalidated, and Loom has no first-party open extraction API. The goal is not only storage cleanup: old Drive, Skool, Loom, Zoom, videos, trainings, docs, presentations, and links should be mined for reusable content, courses, training, recruiting proof, strategy evidence, and operational improvement while preserving source links and owner-entity boundaries. | Run read-only Drive inventory bites, run video-link inventory bites, validate a small authorized Apify/Loom proof later, then build Skool access-path audit, report-mining lane, web/video crawler boundary, and hub value classifier after current-day extraction control is hard enough. | Bounded corpus ingestion cadence, dry-run organization, and hub handoff queues. |

## Active Execution Order

1. Finish Runtime MVP hardening.
2. Harden the LLM router with Claude Code / Agent SDK subscription adapter and hub capacity lanes.
3. Finish first extraction-control cursor/lease proof.
4. Intelligence job ledger, atom schema, and retrieval spine.
5. Retrieval/entity/synthesis hardening.
6. Auth/tier/subject-person redaction and `SYSTEM-010` controls.
7. Action Router v1.
8. Source trust closures.
9. Drive, Skool, video, creator-watchlist, and old-system mining.
10. Strategy Hub.
11. First useful agents.

## Active Plan Docs

Trust these first:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/rebuild/owners-closeout.md`
- `docs/rebuild-decisions.md`
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
- the Action Router is Foundation because it closes the evidence-to-operating-ledger loop; the hub is the consumer that reads and acts on that routed truth
