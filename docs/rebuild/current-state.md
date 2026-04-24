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
- policy-aware LLM router audit substrate
- extraction control target/item ledger
- Google Drive corpus root list and Skool access-boundary source notes
- Owners/deal-review runners
- doc cleanup plan and generated evidence indexes

Open:

- durable item-level cursors/retry execution beyond current-day sync proof
- meeting-notes current-day scheduling after retry/report handling is hardened
- real-world partial-run failure proof before scheduling high-variance corpus lanes
- one schedule truth between Foundation jobs and source crawl targets
- policy-aware LLM router workload migration beyond the new audit shell
- hub-dedicated model capacity
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
| LLM routing | Open hardening | Phase 2 MVP substrate exists: `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls`; `lib/llm-router.js` seeds route config and records dry-run route selection; `llm-auth-audit` is registered as a manual Foundation job; Foundation API/UI can expose route status. Probe results show OpenAI API and Gemini API configured, Claude Code Max logged in locally, OpenClaw gateway running, Anthropic API missing, and Claude OAuth token missing. | Add route-level failure-mode/fallback review, dashboard polish, and then migrate one low-risk LLM script behind the router. | Hub-dedicated capacity and broader extraction/synthesis migration after probes are accepted. |
| Extraction control | Open hardening | Phase 3 control-plane substrate exists: `source_crawl_targets` and `source_crawl_items`; `extraction-control-seed` is a manual Foundation job; seeded targets separate current-day Gmail/Missive/meetings/Slack from Drive backfill, Skool validation, old-system report mining, and Zoom recovery. `scripts/run-extraction-target.mjs` now leases a target, runs bounded sync, records before/after archive stats, clears leases, writes last-run/failure state, and marks target runs `partial` when individual crawl items fail even if the process exits cleanly. Partial target runs now exit nonzero so the Foundation job is not falsely green. Missive is scheduled every `120` minutes after change-aware selected-ID proof. Gmail now records item-level email-thread crawl results, showed `0` item failures across repeated bounded runs, and is scheduled every `120` minutes; the first scheduled worker run succeeded, archived `4` threads, cleared its lease, and set its next target/job run around `2026-04-24T20:09Z`. Meeting notes current-day is registered/manual and records item-level crawl results; latest manual proof selected `50` meetings, archived `50` notes and `42` embedded transcripts, recorded `50` succeeded crawl items, left `0` failed crawl items, and added `2` net-new artifacts. `meeting-notes-retry-failed` is a manual Foundation job that retries failed meeting crawl items; first proof found `0` failed items and succeeded as a no-op. Meeting transcript gap reporting now separates historical archive gaps from recent forward-looking watch by actual meeting date. Current coverage is `866` notes, `649` transcripts, and `863` meetings; historical gaps remain real (`239/863` missing transcript artifacts), while the exact Apr 23-24 Leadership, Owners, Budget Review, and Marketing docs Steve checked are confirmed archived with `embedded_in_gemini` transcripts. `meeting-transcript-recent-gap-verify` is now a manual Foundation job and classified the `21` recent missing transcript artifacts as true-missing rather than parser/tab misses; `meeting-transcripts-extract-backlog` is now a manual bounded LLM job and the first bite scanned `15` archived transcripts, upserted `87` candidates, and moved recent transcript candidate coverage to `56/59`. Extraction targets now expose a `scheduler` object derived from the registered Foundation job when `metadata.foundationJobKey` exists, so scheduled target panels use Foundation job runtime as schedule truth while target `nextRunAt` stays crawl checkpoint metadata. First manual Drive corpus bite is live through `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` children recorded, `24` folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed. Foundation now exposes a Drive corpus inventory review surface with item totals, folder/file counts, pending extraction counts, candidate value routes, and queue state. Raw Drive inventory script writes are guarded so non-dry-run inventory must run through `extraction:target` and advance the target cursor. Skool is blocked pending access/content-use boundaries. Zoom recovery is paused. | Monitor scheduled Missive/Gmail runs, prove partial failure on a real failed item, extend retry semantics to Drive, keep transcript-mining bites manual until router/cost telemetry is accepted, and build review/export gates before broad backfill. | Drive/Skool/YouTube/source workers run one bounded bite at a time. |
| Strategy packet | Open now | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, and Agent Engine current reality are captured. Decision provenance, traceability, change ledger, contradiction queue, and strategy-change watch have first slices. | Finish strategy-used Owners slice and close `SOURCE-014`. | Strategy Hub after runtime/router/extraction/synthesis are stable. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Open now | `SRC-OWNERS-001` is signed off for meaning. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. Row-scoped review runners and `/api/owners/review-queue` exist. The imported `Lists` mirror break is repaired: `SRC-OWNERS-LISTS-001` owns the governed lead-source list, Admin `N/P/S` validations are repointed, and delegated writes are guarded from the mirror range. | Close `SOURCE-008`, `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, supported by `FINANCE-002`; keep `npm run sheets:verify` green after sheet-source changes. | Reuse freshness and review patterns on more governed sources. |
| FUB lead-source taxonomy | Open now | `SRC-FUB-001` review and drift layers are live. | Finish Level 2 taxonomy baseline. | Add broader issue routing and future Sales Hub support. |
| Finance sign-off | Open now | `SRC-FINANCE-001` is partially reviewed, not signed off. | Close `FOUNDATION-003` after FUB. | Define freshness expectations and strategy-use rules. |
| KPI foundation system | Open now | `SRC-SUPABASE-001` is verified readable. KPI is live, but AI OS has not locked which truth layer to read for pipeline, shopping list, executed deals, goals, competition, and usage. | Use `SOURCE-010` to split KPI into explicit read rules. | Add health checks, freshness, and future Sales Hub surfaces. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. Extraction doctrine now requires useful material to route to strategy, ops, sales, marketing, recruiting, agent coaching, and Steve-owned content/course lanes instead of only becoming raw archive. | Close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `HUB-INTEL-001`, `SYNTHESIS-FACTS-001`, and `SYNTHESIS-ENGINE-001` through runtime/extraction/synthesis hardening. | Broader apply flows, subject-person privacy/query layer, and leadership packets. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; not yet a controlled worker. Eight Google Drive shared-drive roots are captured in `docs/source-notes/google-drive-corpus.md`. Skool access research is captured in `docs/source-notes/skool-corpus.md`; Skool remains blocked for blind crawling because access and content-use boundaries are not approved. The goal is not only storage cleanup: old Drive, Skool, videos, trainings, docs, presentations, and links should be mined for reusable content, courses, training, recruiting proof, strategy evidence, and operational improvement while preserving source links and owner-entity boundaries. | Build read-only Drive inventory worker first, then Skool access-path audit, report-mining lane, web/video crawler boundary, and hub value classifier after current-day extraction control is hard enough. | Daily bounded corpus ingestion, dry-run organization, and hub handoff queues. |

## Active Execution Order

1. Finish Runtime MVP hardening.
2. Finish the LLM router MVP acceptance review.
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
