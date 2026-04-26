# BCrew AI OS Current State

Last updated: 2026-04-26
Status: Active
Purpose: one short answer to "what is actually closed, what is still partial, and what closes next?"

Rule: if a package depends on open live inputs, open runtime activation, or open parity work, the package is still open even if part of it is signed off.

## Level Guide

| Level | Name | Meaning |
| --- | --- | --- |
| Level 1 | Connected | AIOS can reach and read the source. |
| Level 2 | Trusted | The trusted unit, fields, and meaning are signed off. |
| Level 3 | Monitored | Refresh cadence, stale-state visibility, drift, and runtime ownership are explicit. |
| Level 4 | Extracted | Source content is filed as governed artifacts/atoms with provenance. |
| Level 5 | Synthesized | Evidence becomes useful source-backed intelligence. |
| Level 6 | Routed | Intelligence becomes owner-bound decisions, tasks, questions, contradictions, or actions. |
| Level 7 | Governed Apply | Approved writes or workflow changes can happen safely and audibly. |
| Level 8 | Closed Loop | Resolution is captured, stale findings stop reappearing, and history stays intact. |

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

- durable item-level cursors, target-run IDs, and retry execution beyond current-day sync proof
- meeting-notes current-day scheduling after retry/report handling is hardened
- real-world partial-run failure proof before scheduling high-variance corpus lanes
- operator UI/verifier hardening for Foundation-job schedule truth and source-crawl checkpoint metadata
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

Automation truth:

- Scheduled current-day lanes: Gmail every 2 hours, Missive every 2 hours, meeting notes/transcripts daily, Slack daily, plus Admin/Conditional/Agent Roster Ops routines.
- Scheduled daily history/extraction missions: Gmail candidate extraction, Missive candidate extraction, meeting transcript extraction, Slack candidate extraction, Drive corpus inventory, and Drive Docs/PDF/text content extraction.
- Meeting system visibility: `SRC-MEETINGS-001` is a distinct Foundation system, not just a buried shared-comms detail. Meeting notes/transcripts are owner-usable for Steve strategy work now because capture, archive, privacy-profile tagging, transcript extraction, and shared synthesis proof exist. Broad agent/team query access still waits for subject-person redaction and filtered response rules.
- Built for first text slice: Drive Google Docs, PDFs, and plain-text files can now be extracted from inventory into source-backed artifacts. Gmail PDF/text attachment extraction is also live as a scheduled daily bite with unsupported files explicitly skipped. YouTube subtitle transcript extraction is live as the first video-content slice from the shared video-link manifest, including manual Steve priority URLs. Still not built: Missive attachment extraction, rich meeting-linked video/recording vision review, Drive Sheets/Slides/Office conversion, shortcuts, OCR, Loom/Skool/Zoom video extraction, and GOD-mode video/audio/visual extraction.
- Blocked/paused until access or value is approved: Skool crawling, broader Loom/video extraction, and Zoom audio recovery.

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Open hardening | v6 rebuild plan is live, prior plan is preserved in plan history, and handoff/audit indexes now separate evidence from active doctrine. | Finish doc cleanup Phase 1/2: classify indexes and promote any durable truth into active docs/backlog. | Optional dated archive folders after indexes are trusted. |
| Runtime activation | Open hardening | First Foundation job registry and DB-backed job run ledger exist. Jobs can be run through the Foundation runner. Runtime metadata now marks scheduled vs manual jobs, computes due/next-run state, exposes scheduled/due/manual counts, and `npm run foundation:worker` can run due jobs one at a time. The first worker proof ran both deal-review jobs and cleared due state. `ai.bcrew.foundation-worker` and `ai.bcrew.dashboard` are loaded as LaunchAgents, so the worker and web process survive terminal exit. Active-run locking now prevents duplicate queued/running runs for the same job, job timeout cleanup kills the process group with `SIGTERM` then `SIGKILL`, DB-backed pause/resume works through `/api/foundation/jobs/:jobKey/control`, and Runtime Health now exposes pause/resume buttons on job cards. Gmail/Missive current-day, meeting current-day, Slack current-day, shared-comms coverage, verifier, Ops review jobs, daily shared-comms extraction missions, and Drive inventory mission are scheduled. | Monitor scheduled current-day/extraction lanes, finish `SYSTEM-010` decommission/dead-man/cost/process controls, then raise daily quotas only after runs stay stable. | Expand to more routines after the first jobs stay stable and stop/decommission paths are proven. |
| LLM routing | Open hardening | Phase 2 now has executable routing, not just a shell. `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live. `llm-auth-audit` proves the local OpenClaw/Codex subscription gateway through `openai-codex/gpt-5.4`; `openai-codex/gpt-5.5` is currently an interactive/coding model target and is not known to the local OpenClaw gateway. `lib/llm-router.js` now executes that subscription adapter, logs calls, keeps direct OpenAI Responses API as a guarded fallback only, and lets the local operator explicitly allow bounded subscription extraction with `LLM_OPENCLAW_ALLOW_EXTRACTION=true`. Shared candidate extraction and shared-comms synthesis are migrated to the router. Live proof: one synthesis run, one Gmail extraction run, and a bounded JSON extraction probe recorded `openclaw` / `chatgpt_subscription_gateway` / `estimatedCostUsd=0`. Audit stop-gap: Zoom audio transcription is paused/fail-closed for non-dry-run use, and verifier coverage now blocks direct OpenAI/Anthropic/Gemini host calls outside approved adapters. | Rebuild transcription as a router-ledged workload before reopening Zoom audio recovery, build the Claude Code / Claude Agent SDK subscription adapter, assign hub-dedicated capacity lanes, and run long subscription extraction only through paced worker jobs with timeout/reaper coverage. Prove subscription-routed synthesis as Strategy Hub/action-router input after monitored runs. | Broader workload migration, overflow policy, and productized/tenant credential handling. |
| Extraction control | Open hardening | Phase 3 control-plane substrate exists: `source_crawl_targets`, `source_crawl_items`, and `shared_communication_artifact_processing_runs`. Current-day Gmail and Missive are scheduled every `120` minutes; meeting notes and Slack current-day lanes are scheduled daily. Gmail/Missive/meeting/Slack candidate extraction now targets artifacts without a successful processing run for the current content hash and runs as daily quota missions with actual model/provider/auth-path/route provenance. Artifacts that correctly produce zero candidates are not reprocessed forever for the same extractor version and same content hash, while changed threads/transcripts become eligible again. Bounded extraction and synthesis now run through the router subscription adapter, not direct OpenAI Responses API. Drive corpus inventory is scheduled as a daily mission through `drive-corpus-inventory-bite`, and Drive content extraction is scheduled through `drive-content-extract-bite` as a five-file daily quota mission. Google Docs are exported as text; PDFs and plain-text blobs are downloaded and parsed; unsupported files receive explicit skip reasons. Latest proof archived `27` Drive artifacts / `451,581` chars, including the strategy folder, Q2 pre-strat PDFs, and John `KT Binder MAR 2026.pdf`. Gmail attachment extraction is now scheduled through `email-attachment-extract-bite`: v1 extracts Gmail PDF/text attachments, stores `gmail_attachment` artifacts, and marks unsupported images/media/Office/OCR classes with explicit skip reasons. Live proof archived `6` Gmail attachment artifacts / `21,494` chars and skipped `4` image attachments with `0` item failures; the restarted worker picked up the new job and succeeded. Video content extraction is now scheduled through `video-content-extract-bite`: v1 reads the shared video-link manifest, extracts YouTube subtitle transcripts through DataForSEO, stores `video_transcript` artifacts, and skips no-subtitle videos into the future vision/transcription lane. Live proof plus worker/manual-priority follow-up archived `13` YouTube transcript artifacts / `261,853` chars, including Steve's Mycro test video `The AI Team Setup Nobody Talks About`; `6` unsupported/no-subtitle/channel crawl items are explicitly skipped or routed onward, and latest controlled runs had `0` item failures. Raw Drive, attachment, and video-content writes are guarded so non-dry-run work must run through controlled extraction paths. `video-link-inventory-bite` now also runs through `extraction:target`; the latest controlled proof scanned `1060` archive/Drive inventory records, found `179` media-link occurrences, and recorded the target run as succeeded with `0` crawl failures. Missive attachment extraction and rich meeting-linked video/recording vision review are not built yet. Drive Sheets/Slides/Office/shortcuts/OCR/media remain explicit follow-on lanes. Transcript-only video extraction is not GOD-mode video understanding; screenshots/keyframes, screen-demo understanding, visual tool/workflow detection, and richer audio/visual analysis remain under `MULTIMODAL-EXTRACTOR-001`. Corpus work is framed as daily quota missions: process a small count, file outputs with provenance, update the ledger, and stop. Skool is blocked pending access/content-use boundaries. Zoom recovery is paused. | Monitor scheduled current-day/extraction runs, prove partial failure on a real failed item, add Missive attachment extraction, add Drive Sheets/Slides/shortcut resolution/OCR lanes, add Loom/Drive/Zoom/Skool/GOD-mode video extractors under `MULTIMODAL-EXTRACTOR-001`, prove Strategy Hub/action-router synthesis, and build review/export gates before broad backfill. | Drive/Skool/Loom/YouTube/source workers run one bounded mission at a time. |
| Strategy packet | Done for current reality | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. `FOUNDATION-001` and `SOURCE-014` are closed for this phase. Decision provenance, traceability, change ledger, contradiction queue, and strategy-change watch have first slices. | No source sign-off closeout work remains for the current strategy packet. | Later hardening: Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, and Strategy Hub after runtime/router/extraction/synthesis/privacy/action-routing are stable. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Done for v1 | `SRC-OWNERS-001` is signed off for meaning and now visibly carries the signed-off Owners workbook tabs: Admin, Split Cal, Agent Splits, Listings and Conditional Deals, Sales & Deposit, Goal & KPI Calculator, and CI Report. The Owners Dashboard `Lists` tab is verified as an `IMPORTRANGE` mirror but is not counted as the source-owned sign-off because governed writes belong to `SRC-OWNERS-LISTS-001` in the BHAG Builder / Old BIS KPI Lists Source workbook. `SRC-OWNERS-LISTS-001` is signed off for current-reality meaning after the imported `Lists` mirror repair: it owns the governed list/dropdown write target, Admin `N/P/S` validations are repointed, and delegated writes are guarded from the mirror range. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. FUB joins through Column `BZ`, v1 lead-source lineage rules are locked, and Admin review now checks split math, governed source rules, company/agent expectation, FUB source/stage/ISA evidence, pre-2026-04-01 Freedom follow-through, and post-2026-04-01 ClickUp Deal Data Entry follow-through by Trade Number. Scheduled Admin review runners process marked Admin re-reviews first, then pace first-pass backlog at five newest eligible June 2025+ deals per day, newest to older, writing only AI review status/action/findings. The Conditional tab is now a ClickUp-generated forecast/missing-data view with a preserved `Review This Conditional` action for fixed-row re-checks, not a separate legacy Google Sheet review lane. `/api/owners/review-queue` exposes the inspection queue, and `/ops` gives Ops its own hub surface for the queue and the running systems serving it. Missing FUB links, invalid lead sources, and duplicate-credit edge cases are now Ops cleanup findings surfaced by the inspection system, not blockers to the Foundation source package. Source-field corrections remain human-owned until an explicit apply/fix lane is approved. | No Foundation source-package closeout remains. Work Ops findings as they appear. | Reuse freshness and review patterns on more governed sources, then add assignment and approval-gated source-field writeback only after Ops approves that workflow. |
| FUB lead-source taxonomy | Done for v1 | `SRC-FUB-001` review and drift layers are live, source drift is clear, and the v1 source-lineage/company-agent rules are locked through the governed source rule table. The first drift/enforcement guardrails are closed through `DATA-018` and `DATA-019`. The Lee `FUBZahnd` middleware repo is now captured as implementation evidence for opportunity re-entry and `LeadDate` / `LeadClaimedDate` semantics. | Work invalid-source or missing-link findings from the Ops queue. Keep `SOURCE-021` as the deeper Sales Hub/FUB opportunity-semantics proof, not a blocker to v1 taxonomy closeout. | Add broader issue routing, live stage-table proof, and future Sales Hub support. |
| Finance sign-off | Done for current reality | `SRC-FINANCE-001` is signed off for current-reality meaning. Weekly Actuals is the operating finance ledger, Cashflow Dash is the management interpretation after partner-commission normalization, the roll-up/budget tabs and `Unspent -L3M + Actual Helper` are included in signed-off current-reality coverage, and QuickBooks is optional compliance verification, not a current rebuild dependency. | Keep finance freshness and later payment reconciliation as future hardening, not source-signoff blockers. | Define Level 3 freshness expectations when finance automation starts reading it continuously. |
| KPI foundation system | Done for read rules | `SRC-SUPABASE-001` is verified readable, the Lee / `zahnd-team-dashboard` repo and Supabase audit checkpoint are captured, and AI OS now has locked first-pass read rules for pipeline, shopping list, executed deals, goals, competition, and usage. | No current-state source-signoff work remains for `SOURCE-010`. | `KPI-HEALTH-001`: add health checks, visible freshness, schema/code drift review, and future Sales Hub surfaces. |
| Meeting notes / transcript intelligence | Open hardening | Level 5 owner-usable system. `SRC-MEETINGS-001` is readable through delegated Google Workspace; meeting notes and standalone/embedded transcripts are archived into PostgreSQL as shared communication artifacts with content hashes, transcript source, meeting class, privacy profile, and provenance. Scheduled daily current sync and daily transcript-extraction quota missions are live. Candidate extraction uses Foundation context and asks for `subject_people`, `sensitivity`, and `min_tier` metadata before synthesis. Latest live checkpoint showed 866 meeting notes and 649 transcripts archived, with the 2026-04-26 current sync and transcript extraction runs succeeding. | Monitor scheduled meeting current-sync and transcript-extraction runs, tune backlog quotas, and use Runtime Health for live counts/status. Keep this owner-only for strategy work until subject-person redaction/query filtering is implemented. | Rich meeting video/recording vision, Zoom/Drive video transcription, filtered summary access requests, subject-person redaction, and Action Router handoff. |
| Shared freshness rules | Done for Owners/FUB first layer | The maturity model defines Level 3, and first Owners/FUB freshness guardrails are live through `DATA-020`. | No active freshness-rule closeout remains for the current Owners/FUB layer. | Reuse this pattern for finance, KPI, connectors, Drive/video corpus, and future source surfaces when those readers become continuous. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. Extraction doctrine now requires useful material to route to strategy, ops, sales, marketing, recruiting, agent coaching, and Steve-owned content/course lanes instead of only becoming raw archive. Runtime Health now has an Intelligence Pipeline panel that shows archived artifacts, processed artifacts, artifacts with active candidates, pending extraction backlog, extraction coverage percent, and latest synthesis so runtime progress is visible. `shared-comms-intelligence-bite` is now the synthesis fast path: it records ranked Strategy Hub/action-router input from already-mined candidates without starting live extraction and uses a long subscription-route timeout. Gmail, Missive, meeting transcript, and Slack extraction are scheduled as separate daily subscription-route quota missions with per-source timeout knobs. Last successful router-backed synthesis proof recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked items through `openclaw/chatgpt_subscription_gateway`, not direct API. A 2026-04-26 Slack archive refresh succeeded; full Slack candidate extraction may need long subscription runtime, so the daily quota starts at one thread until latency is measured. Broad Foundation/Ops read APIs now have interim admin gating outside localhost; `SECURITY-002` still needs the real auth/tier and subject-person redaction layer before broader hub/query/assistant access. | Monitor daily extraction runs, tune quotas, close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `HUB-INTEL-001`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, `SECURITY-002`, and `ACTION-ROUTER-001` through runtime/extraction/synthesis/privacy/action-routing hardening. | Broader apply flows, subject-person privacy/query layer, and Strategy Hub. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; first controlled surfaces now exist. Nine Google Drive shared-drive/priority roots are captured in `docs/source-notes/google-drive-corpus.md`, with Steve's strategy folder prioritized for strategy readiness. Drive Docs/PDF/plain-text extraction v1 is live and proved against the strategy folder: John `KT Binder MAR 2026.pdf`, the team pre-strat template, Q2 pre-strat PDFs, Carson/Steve notes, and the 2026 Q1 vision/core-values doc are archived as source-backed text artifacts. Remaining Drive gaps are Sheets, Slides, Office files, shortcuts, scanned/empty PDFs, OCR, audio, and video. Skool access research is captured in `docs/source-notes/skool-corpus.md`; Skool remains blocked for blind crawling because access and content-use boundaries are not approved. Video/Loom research is captured in `docs/source-notes/video-link-inventory.md`; Apify credentials are available locally but unvalidated, and Loom has no first-party open extraction API. Mycro/myICOR paid-training direction is captured in `docs/source-notes/myicro-training.md`: AIOS needs a governed browser/video worker that can log into authorized training apps, navigate courses/lessons, read text, watch videos, capture screenshots/folder structures, and extract project-management / AI-team operating doctrine for internal improvement. Steve has explicitly approved the broader direction: AIOS needs a high-end multimodal extractor for YouTube videos/channels, Loom, Skool, Drive/meeting videos, Zoom recordings, demos, screenshots, transcripts, and related training/course material. The goal is not only storage cleanup: old Drive, Skool, Loom, Zoom, videos, trainings, docs, presentations, apps, and links should be mined for reusable content, courses, training, recruiting proof, strategy evidence, and operational improvement while preserving source links and owner-entity boundaries. | Keep daily Drive inventory/content bites running, add Drive Sheets/Slides/Office/shortcut/OCR lanes, run video-link inventory bites, build the `MULTIMODAL-EXTRACTOR-001` and `WEB-GODMODE-001` contracts, validate small authorized YouTube/Loom/Skool/Mycro/video proofs with route/cost ledgering, then promote proven workers to daily quota missions. | Bounded corpus ingestion cadence, dry-run organization, and hub handoff queues. |

## Active Execution Order

Use this priority model:

1. Foundation Overview gives the command order for what to work on next.
2. The live Backlog owns task status, priority, lane, owner, and next action.
3. The Rebuild Plan explains doctrine, phase gates, and the definition of done.

If these disagree, fix the live Backlog and active docs together instead of letting two work queues compete.

Current command order:

1. Keep source truth clean.
2. Monitor capture and extraction.
3. Harden missing corpus lanes.
4. Add freshness and health checks.
5. Close the action loop.

## Foundation Operations Surfaces

These pages are operator surfaces, not strategy pages.

| Page | Why it exists | Current truth |
| --- | --- | --- |
| Backlog | Root Foundation build queue. | Live and primary for task status, priority, lane, owner, and next action. |
| Decisions | Canonical governance ledger. | Working as a manual first slice; not yet automatic meeting/chat decision capture. `DECISION-007` owns old-decision reconciliation and `ACTION-ROUTER-001` owns future routing from synthesis. |
| Open Questions | Exception queue for real unresolved blockers. | Technically working, but the old stale carry-forward questions were resolved or routed into backlog/source docs on 2026-04-26. New questions should be rare, owner-bound, and cleared quickly. |
| System Activity | Short audit feed. | Live latest-event view from `change_events`; `SYSTEM-007` owns the future searchable explorer. |
| Runtime Health | Operator diagnostic surface. | Live job/LLM/extraction/source-crawl view; `SYSTEM-008` owns deeper alert/degradation semantics. |

## Data Sources And System Inventory Surfaces

These pages are visibility surfaces. They do not replace the live Backlog, Foundation Systems map, or Runtime Health.

| Page | Why it exists | Current truth |
| --- | --- | --- |
| Data Sources Overview | Front door to the source layer. | Live from `/api/source-of-truth`: grouped systems, source contracts, validation units, connector paths, and source-trust states. |
| Docs | Doc-backed source contracts only. | Useful for seeing written packets and file-backed truth units. It is not the same thing as All Docs storage inventory. |
| Spreadsheets | Workbook/tab/range source contracts. | Useful for sheet-by-sheet trust. Connector access is separated from which sheet units are actually signed off. |
| APIs / Apps | External app, API, database, and Workspace source contracts. | Useful for FUB, KPI, ClickUp, Gmail, Missive, Slack, meetings, Drive, video, and marketing source boundaries. API reach does not equal trust. |
| Connectors | Technical pipes and access paths. | Useful for seeing what is installed, wired, or missing. Connector does not equal trusted source. |
| All Docs | File-level repo and local-private markdown inventory. | Live from `/api/system-inventory`; shows tracked docs and intentionally private local docs. It is storage inventory, not active doctrine. |
| Skills | Local skill inventory. | Shows reusable assistant instructions available in this runtime. Skills are not business agents or source contracts. |
| Plugins / MCPs | Local plugin and MCP inventory. | Shows runtime capabilities such as Google Drive, Gmail, Calendar, GitHub, and Canva. Installed plugin does not mean the matching source is signed off. |
| Agents | Agent-system boundary view. | Backed by `SYS-AGENTS-001` plus backlog links, but not a live Agent Registry yet. `AGENT-006` owns registry, `AGENT-007` owns operations, and `AGENT-010` owns personal-agent onboarding. |

## Active Plan Docs

Trust these first:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/rebuild/owners-closeout.md`
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
