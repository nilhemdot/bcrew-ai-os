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
- synthesis hardening against resolved/stale/duplicated items
- explicit subject-person privacy/redaction before hubs or agents use sensitive people evidence
- FUB/finance/KPI source sign-off
- marketing source map by brand lane
- hub value routing for mined Drive/Skool/corpus assets
- Strategy Hub
- Harlan/Crewbert useful runtime

## Foundation Surfaces

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Open hardening | v6 rebuild plan is live, prior plan is preserved in plan history, and handoff/audit indexes now separate evidence from active doctrine. | Finish doc cleanup Phase 1/2: classify indexes and promote any durable truth into active docs/backlog. | Optional dated archive folders after indexes are trusted. |
| Runtime activation | Open hardening | First Foundation job registry and DB-backed job run ledger exist. Jobs can be run through the Foundation runner. Runtime metadata now marks scheduled vs manual jobs, computes due/next-run state, exposes scheduled/due/manual counts, and `npm run foundation:worker` can run due jobs one at a time. The first worker proof ran both read-only deal-review jobs and cleared due state. `ai.bcrew.foundation-worker` and `ai.bcrew.dashboard` are loaded as LaunchAgents, so the worker and web process survive terminal exit. Active-run locking now prevents duplicate queued/running runs for the same job, job timeout cleanup kills the process group with `SIGTERM` then `SIGKILL`, DB-backed pause/resume works through `/api/foundation/jobs/:jobKey/control`, and System Health now exposes pause/resume buttons on job cards. Scheduled Missive and Gmail current-day jobs now have worker proof. | Monitor scheduled current-day lanes, then activate only the next 1-2 jobs after they stay stable. | Expand to all routines after the first jobs stay stable. |
| LLM routing | Open hardening | Phase 2 now has executable routing, not just a shell. `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live. `llm-auth-audit` proved OpenClaw/Codex subscription auth through `openai-codex/gpt-5.4` OAuth. `lib/llm-router.js` now executes that subscription adapter, logs calls, and keeps direct OpenAI Responses API as a guarded fallback only. Shared candidate extraction and shared-comms synthesis are migrated to the router. Live proof: one synthesis run and one Gmail extraction run recorded `openclaw` / `chatgpt_subscription_gateway` / `estimatedCostUsd=0`. | Build the Claude Code / Claude Agent SDK subscription adapter and assign hub-dedicated capacity lanes. Then schedule the daily bounded intelligence bite after a few monitored router runs. | Broader workload migration, overflow policy, and productized/tenant credential handling. |
| Extraction control | Open hardening | Phase 3 control-plane substrate exists: `source_crawl_targets`, `source_crawl_items`, and `shared_communication_artifact_processing_runs`. Current-day Gmail and Missive are scheduled every `120` minutes and have worker proof. Meeting notes current-day remains manual while recent transcript gaps and retry/report policy are hardened. Gmail/Missive/meeting transcript candidate extraction now targets artifacts without a successful processing run for the current content hash and records actual model/provider/auth-path/route provenance. Artifacts that correctly produce zero candidates are not reprocessed forever for the same extractor version and same content hash, while changed threads/transcripts become eligible again. Bounded extraction and synthesis now run through the router subscription adapter, not direct OpenAI Responses API. First manual Drive corpus bite is live through `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` children recorded, `24` folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed. Raw Drive inventory writes are guarded so non-dry-run inventory must run through `extraction:target`. `video-link-inventory-bite` now gives Foundation a system-owned manifest lane for Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool URLs without logging into platforms or extracting content. Skool is blocked pending access/content-use boundaries. Zoom recovery is paused. | Monitor scheduled Missive/Gmail runs, prove partial failure on a real failed item, extend retry semantics to Drive/video lanes, schedule one daily bounded intelligence bite after monitored subscription-router proof, and build review/export gates before broad backfill. | Drive/Skool/Loom/YouTube/source workers run one bounded bite at a time. |
| Strategy packet | Open now | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, and Agent Engine current reality are captured. Decision provenance, traceability, change ledger, contradiction queue, and strategy-change watch have first slices. | Finish strategy-used Owners slice and close `SOURCE-014`. | Strategy Hub after runtime/router/extraction/synthesis are stable. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Open now | `SRC-OWNERS-001` is signed off for meaning. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. Row-scoped review runners and `/api/owners/review-queue` exist. The imported `Lists` mirror break is repaired: `SRC-OWNERS-LISTS-001` owns the governed lead-source list, Admin `N/P/S` validations are repointed, and delegated writes are guarded from the mirror range. | Close `SOURCE-008`, `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, supported by `FINANCE-002`; keep `npm run sheets:verify` green after sheet-source changes. | Reuse freshness and review patterns on more governed sources. |
| FUB lead-source taxonomy | Open now | `SRC-FUB-001` review and drift layers are live. | Finish Level 2 taxonomy baseline. | Add broader issue routing and future Sales Hub support. |
| Finance sign-off | Open now | `SRC-FINANCE-001` is partially reviewed, not signed off. | Close `FOUNDATION-003` after FUB. | Define freshness expectations and strategy-use rules. |
| KPI foundation system | Open now | `SRC-SUPABASE-001` is verified readable. KPI is live, but AI OS has not locked which truth layer to read for pipeline, shopping list, executed deals, goals, competition, and usage. | Use `SOURCE-010` to split KPI into explicit read rules. | Add health checks, freshness, and future Sales Hub surfaces. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. Extraction doctrine now requires useful material to route to strategy, ops, sales, marketing, recruiting, agent coaching, and Steve-owned content/course lanes instead of only becoming raw archive. System Health now has an Intelligence Pipeline panel that shows archived artifacts, processed artifacts, artifacts with active candidates, pending extraction backlog, extraction coverage percent, and latest synthesis so runtime progress is visible. `shared-comms-intelligence-bite` is a manual composite job that runs one bounded Gmail, Missive, meeting-transcript, and synthesis pass when Steve needs freshness. Its parent timeout is now `6000` seconds. Latest router-backed synthesis proof recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked items through `openclaw/chatgpt_subscription_gateway`, not direct API. Top issues: KPI deal-data display/sync failure, June cash gap, SocialPilot access/publishing instability, Union Street delivery retry, and Loom access migration issue. | Close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `HUB-INTEL-001`, `SYNTHESIS-FACTS-001`, and `SYNTHESIS-ENGINE-001` through runtime/extraction/synthesis hardening. Next operating move is one scheduled daily bounded intelligence bite after monitored router proof. | Broader apply flows, subject-person privacy/query layer, and leadership packets. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; first controlled surfaces now exist. Eight Google Drive shared-drive roots are captured in `docs/source-notes/google-drive-corpus.md`. Skool access research is captured in `docs/source-notes/skool-corpus.md`; Skool remains blocked for blind crawling because access and content-use boundaries are not approved. Video/Loom research is captured in `docs/source-notes/video-link-inventory.md`; Apify credentials are available locally but unvalidated, and Loom has no first-party open extraction API. The goal is not only storage cleanup: old Drive, Skool, Loom, Zoom, videos, trainings, docs, presentations, and links should be mined for reusable content, courses, training, recruiting proof, strategy evidence, and operational improvement while preserving source links and owner-entity boundaries. | Run read-only Drive inventory bites, run video-link inventory bites, validate a small authorized Apify/Loom proof later, then build Skool access-path audit, report-mining lane, web/video crawler boundary, and hub value classifier after current-day extraction control is hard enough. | Daily bounded corpus ingestion, dry-run organization, and hub handoff queues. |

## Active Execution Order

1. Finish Runtime MVP hardening.
2. Harden the LLM router with Claude Code / Agent SDK subscription adapter and hub capacity lanes.
3. Finish first extraction-control cursor/lease proof.
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
