# BCrew AI OS Rebuild Plan

Last updated: 2026-04-25
Version: v6.7 — Source intelligence lifecycle and strategy-input closeout
Status: Active

Use this doc for one question:

- what are we doing next, in what order, and what counts as done?

For the short state read, use [Current State](current-state.md).
For archive/extraction/synthesis doctrine, use [Intelligence Pipeline Operating Model](intelligence-pipeline.md).
For runtime boundaries, use [Current Runtime Map](current-runtime-map.md).
For Harlan/Crewbert boundaries, use [Agent Architecture](agent-architecture.md).
For doc cleanup rules, use [Doc Cleanup And Consolidation Plan](doc-cleanup-plan.md).

## Plan History

The previous active plan was preserved before this rewrite:

- [current-plan-2026-04-24-pre-v6-runtime-router-cleanup.md](plan-history/current-plan-2026-04-24-pre-v6-runtime-router-cleanup.md)

Reason for v6:

- the system now has enough archive/extraction/synthesis proof to stop treating every next step as more manual mining
- the immediate gap is activation: jobs exist but must become scheduled, supervised, visible system work
- model access must be centralized through a policy-aware router before high-volume automation expands
- extraction needs current-day and backfill control lanes so Steve is not waiting in builder chat for giant manual runs
- the doc surface became noisy enough that active doctrine must be separated from historical evidence

## Locked Doctrine

- Mac Mini stays the primary machine for this phase.
- Foundation-first stays the build order.
- OpenClaw stays the current Harlan channel/runtime adapter and possible later live-agent adapter, not the whole OS.
- BCrew router owns model/subscription routing. OpenClaw is one adapter for the ChatGPT/Codex subscription path, not the controlling system.
- Direct OpenAI Responses API is fallback-only and blocked unless an explicit paid-run override is set.
- Harlan is Steve's personal agent, not the whole OS.
- Crewbert is the orchestrator/operator identity, not a magic replacement for source contracts.
- We are not switching stacks mid-Foundation.
- We are not turning on a large agent swarm during Foundation.
- Scripts/routines that call LLMs are not the same thing as agents.
- Real agents are later and narrow: Harlan, Crewbert, then a few specialist agents only after governed loops are stable.
- Active truth lives in the current docs and source-backed UI/API surfaces.
- Handoffs and audits are evidence unless promoted into active docs or backlog.
- Specs are design references until promoted into this plan, source contracts, verifier checks, or DB-backed backlog/decision records.
- Imported spreadsheet mirrors are not write surfaces. Any governed write must target the source workbook/range or a deliberately non-imported destination.
- Extraction is a Foundation supply chain, not a one-off research chore. It must keep current sources fresh, mine old corpora one bounded bite at a time, and preserve what each hub can use.
- Drive and Skool mining belong in Foundation while they inventory, archive, classify, extract, and organize evidence. Course creation, content production, recruiting outreach, coaching, and monetization are Hub work built on that Foundation output.
- The brand/hub lanes must stay separate: Benson Crew residential, Zahnd Team Ag, Steve Zahnd personal brand, MarketMasters, and Steve-owned monetization/education assets are different consumers with different risk boundaries.
- Foundation is not done until source evidence can move through the full loop: source -> archive/artifact -> candidate/atom -> synthesized item -> routed decision/task/question/contradiction/action -> resolution.
- Foundation is the control plane for systems; hubs are the human/business cockpits. A job can run in Foundation while its queue, decisions, and cleanup work surface in the hub it serves.
- Admin-only proof surfaces can exist behind `requireAdminToken`, but no broad hub, assistant, query, or human-facing read surface may expose shared-communications intelligence until auth/tier filtering and subject-person redaction are implemented and verified.
- `SYSTEM-010` controls are a Foundation gate, not a later ops polish item: running jobs, agents, miners, and paid/subscription model calls must be visible, pausable/stoppable, failure-tracked, and decommissionable before autonomous loops expand.
- Strategy Hub is the first major consumer, not the next build surface. Do not build Strategy Hub UI before the extraction/miner and action-routing loop are closed enough to trust.

## Source Intelligence Lifecycle

Foundation source work follows this order:

1. connect the source and prove the system can reach it
2. verify the trusted unit, range, tab, API object, or corpus boundary
3. understand the business meaning, owner, caveats, and trust boundary
4. extract useful atoms with provenance and retry/cursor control
5. synthesize those atoms into business insight
6. route the insight into the right hub, decision, task, contradiction, or owner-bound action

The Strategy packet has completed steps 1-3 for its current source package: strategy docs, Freedom Community, BHAG Builder, Agent Engine, and the strategy-used Owners slice. That does not mean extraction, synthesis, Strategy Hub, or Action Router are complete; those are later Foundation layers.

## Current Reality

Built and useful now:

- Foundation source/contracts layer.
- Foundation verifier.
- Strategy, decision, backlog, open-question, and change-event database surfaces.
- Source-backed dashboard/Foundation UI.
- Google delegated read path for Workspace sources.
- Gmail, Calendar, Missive, Slack, meeting notes, and meeting transcript reads.
- Shared-communications archive in Postgres.
- Candidate extraction lanes for meetings, Gmail, Missive, Slack, and recovered Zoom material.
- Historical meeting context reaching back to October 2024 where recovered/transcribed.
- Persisted synthesis runs/items in Postgres.
- First Foundation job registry and DB-backed job run ledger.
- First Foundation worker slice: scheduled/manual job metadata, due/next-run status, one-pass worker, deal-review jobs proven through the worker, and LaunchAgent supervision live.
- Policy-aware LLM router: credential/route/probe/call tables, executable OpenClaw/Codex subscription adapter, auth-path audit job, call ledger, route status visibility, and shared intelligence extraction/synthesis migrated behind the router.
- Extraction control MVP: source crawl target/item tables, seeded current-day/backfill/corpus/recovery lanes, item-level crawl reporting, and scheduled current-day proof for Missive + Gmail.
- Row-scoped Owners / deal-review runners.
- Owners Dashboard imported `Lists` repair: governed FUB lead sources now live in upstream `SRC-OWNERS-LISTS-001`, Admin `N` and `P` reuse the same source list, Admin `S` uses imported active agents, and Google delegated writes are blocked from the imported mirror range.
- Owners/FUB v1 parity rules: Admin column `BZ` joins to FUB person records, governed FUB source rules drive company/agent expectations, and Admin review flags invalid source, source-lineage, stale-stage, and ISA mismatch issues.
- Google Drive corpus root list captured in `docs/source-notes/google-drive-corpus.md`.
- Skool corpus access and policy boundary captured in `docs/source-notes/skool-corpus.md`.
- Marketing source evidence from the old system and current connector checks.
- Doc cleanup plan and generated doc indexes.
- Ops Hub v0 as its own hub surface for systems serving Ops, starting with Admin and conditional deal-review inspections. Scheduled jobs now run marked re-reviews first, then pace Admin first-pass backlog at one newest eligible June 2025+ deal per 8-hour run (3 per day), writing AI status/action/findings only. Foundation remains the control plane; Ops owns the human cockpit.

Still not done:

- durable source cursors, target-run IDs, and backfill leases beyond the current-day target proof
- router-ledged transcription workload and enforced model-route budgets/caps beyond the direct-host verifier
- scheduled meeting-notes current-day lane that stays fresh without Steve watching it
- failed-item retry policy for Drive and non-meeting crawl records beyond the first meeting retry path
- proof that partial-run job failure/alert semantics work on a real failed meeting/Drive item
- operator UI/verifier hardening for job/target schedule truth now that Foundation jobs own scheduled crawl lanes
- Claude Code / Claude Agent SDK subscription adapter under the BCrew router
- hub-dedicated model capacity allocation beyond the first Foundation subscription path
- source-budget and failure visibility
- full subject-person privacy/query layer
- auth/tier middleware and subject-person redaction implementation from `docs/specs/2026-04-23-auth-tiers-vault.md`
- final auth/tier middleware and redacted/public split for broad Foundation/Ops read APIs after interim admin gating
- full `SYSTEM-010` decommission, dead-man, and cost/process-control layer
- intelligence job ledger for extraction, embedding, video analysis, synthesis, and brief runs
- source-backed atom schema that turns rich extraction into durable, reviewable memory units
- retrieval spine: chunk-level lexical search, pgvector semantic search, and hybrid evidence API
- richer KPI / finance / FUB grounding inside synthesis
- Action Router v1: synthesized items do not yet route into decisions, backlog tasks, open questions, contradictions, ignore/snooze, or owner-bound actions with back-links
- source-backed Strategy Hub
- Harlan/Crewbert useful runtime
- Drive and Skool crawler workers
- clean marketing account/property map by lane
- hub consumer map for mined corpus value: strategy, ops, sales, marketing, recruiting, agent coaching, Steve personal brand, MarketMasters, and Steve-owned education/monetization

## Definition Of Done

A feature is not done because a script exists.

A feature is done only when it is:

- registered in Foundation runtime/job status
- scheduled or explicitly marked manual-only
- supervised by worker/scheduler or clearly manual-only
- visible in Foundation status
- assigned an owner/system lane
- protected by enforced budget, pause, and retry rules where relevant; if budget is only descriptive, the field must say so
- recording last run, next run, and failure state
- surfacing failures in the dashboard
- verified by `npm run foundation:verify` or a specific proof command

If Steve or a builder has to remember to run it from a terminal, it is still a prototype.

## Active Build Order

### Immediate Foundation Closeout Checklist

This checklist is the current anti-drift queue from the 2026-04-25 top-down review. Treat it as backlog order, not a new plan.

1. `SECURITY-003` — Close direct LLM/transcription spend bypasses.
   - `scripts/transcribe-zoom-audio-archive.mjs` is paused/fail-closed for non-dry-run use.
   - Verifier coverage now checks direct model/transcription host calls outside approved router/adapters, not only OpenAI Responses.
   - Later: rebuild transcription as a router-ledged transcription workload before reopening Zoom audio recovery.
   - Keep sanctioned auth probes explicit.
2. `SECURITY-004` / `SECURITY-002` — Gate broad read APIs before any broader dashboard, hub, assistant, or user-facing access.
   - Interim admin gating is live for source-of-truth, doc reads, Foundation hub, FUB reads, Owners queue/governance, sheet structure, system inventory, changes, and doc-update reads.
   - Later replace stop-gap gating with tier and subject-person redaction.
3. `SYSTEM-010` — Finish runtime/process-control hardening.
   - Keep dashboard and worker LaunchAgent plists in repo.
   - Router fallback is manual-explicit, not automatic; keep code/docs/UI from implying automatic paid fallback.
   - Enforce job-level budget tags or rename them as descriptive tags.
   - Bound large Foundation snapshot reads with limits or paging.
   - Finish decommission, dead-man, cost/process visibility, and stop controls.
4. `EXTRACTION-TEAM-001` — Finish controlled miner/corpus lanes.
   - Build paced miner v1: one-at-a-time, cursors, leases, retry/backoff, spacing, per-source timeouts.
   - `video-link-inventory-bite` now runs through `extraction:target`; finish stable cursor/provenance-occurrence semantics before scheduling.
   - Extend failed-item retry/reporting beyond meetings into Drive/video/non-meeting crawl records.
   - Keep Skool/Loom extraction blocked until authorized proof paths are validated.
5. `INTEL-JOBS-001` / `INTEL-ATOM-001` / `RETRIEVAL-001` through `RETRIEVAL-003` — Build the memory/retrieval spine.
   - Add a run/cost/cursor ledger for ingestion, extraction, chunking, embedding, synthesis, video analysis, and brief generation.
   - Define the source-backed atom schema before scaling video/web/Skool extraction.
   - Add chunk-level lexical search first, then pgvector semantic retrieval, then hybrid evidence retrieval.
   - Keep Graphiti/Zep deferred until Postgres memory proves itself.
6. `SOURCE-008` / `DATA-005` — Close FUB Level 2 taxonomy and Owners/FUB lineage.
   - Refresh stale FUB source snapshot.
   - Sign off trusted FUB source taxonomy baseline and new-source review rules.
   - Lock Owners dropdown/list parity against FUB lineage.
7. `DATA-007` through `DATA-009` — Clear Ops/deal-validation source-quality work.
   - Invalid lead-source row backfill.
   - Missing FUB link backfill.
   - Suspicious duplicate full-credit row resolution.
8. `SOURCE-010` — Close KPI truth-layer map.
   - Split pipeline, shopping-list, executed-deal, goal, competition, and usage read rules before KPI jobs become trusted operating intelligence.
9. `SYNTHESIS-ENGINE-001` / `SYNTHESIS-FACTS-001` / `ACTION-ROUTER-001` — Close the intelligence loop.
   - Prove synthesis against bounded input that fits the subscription adapter.
   - Ground synthesis in source-backed KPI, finance, strategy, Owners/FUB facts.
   - Route synthesized items into governed decisions, backlog tasks, questions, contradictions, ignore/snooze, or owner-bound actions with back-links.

### Phase 0 — Keep The Existing Proof Stable

Goal: do not break the working Foundation while we activate it.

Do now:

- keep `npm run foundation:verify` green
- keep shared-comms coverage working
- keep synthesis persisted
- keep Owners/deal-review queued and first-pass backlog runners usable
- keep source-backed spreadsheet mirrors guarded and covered by `npm run sheets:verify`
- keep docs indexed and active truth clear

Do not do now:

- giant new manual backfills
- broad feature expansion
- new agent swarm
- full router migration
- rewriting every script before the router probes pass

### Phase 1 — Runtime MVP

Goal: turn the best existing routines from builder-chat/manual scripts into supervised system work.

Build:

- runtime registry for Foundation services/jobs
- always-on worker/scheduler path
- supervisor config for web/API and worker process
- dashboard panel for active/scheduled/failed/manual jobs
- pause switches
- retry limits
- max runtime limits
- last run / next run / failure state

Activate only 3 to 5 jobs first:

- `foundation:verify`
- `shared-comms:coverage`
- deal-review queued/backlog runner
- synthesis as manual or scheduled with explicit route and budget visibility
- one current-day sync lane if stable
- bounded candidate-extraction bites for already-archived material, still manual until the paced miner cadence is deliberately activated

Backlog/cards:

- `RUNTIME-ACTIVATION-001`
- `RUNTIME-WORKER-001`
- `RUNTIME-SUPERVISOR-001`
- `RUNTIME-FIRST-JOBS-001`
- `SYSTEM-010`

Acceptance:

- Foundation UI can answer: what is running, what is scheduled, what is stale, what failed, and what is paused?
- Terminal windows are for debugging only, not production runtime.
- Worker survives terminal session end.
- Failed jobs become visible failures.

Current partial proof:

- `npm run foundation:worker -- --once --maxJobs=2` ran the two due deal-review jobs and recorded successful runs.
- `npm run foundation:job -- --snapshot` now exposes scheduled, due, and manual job counts plus next-run status.
- `ai.bcrew.foundation-worker` is loaded as a LaunchAgent and running the worker loop.
- `ai.bcrew.dashboard` is loaded as a LaunchAgent and was restarted after the runtime changes.
- Active-run locking is enforced with a unique active-run index per job, so a second worker/manual trigger cannot start the same job while it is already queued/running.
- Job timeout cleanup now kills the process group with `SIGTERM` and escalates to `SIGKILL`.
- Operator-controlled job pause/resume is DB-backed and exposed through `/api/foundation/jobs/:jobKey/control`.
- Gmail and Missive current-day sync jobs now run through the extraction target ledger.
- Missive current-day sync has been promoted to scheduled every 2 hours after exact-ID idempotency proof.
- Gmail current-day sync now has item-level thread ledgering and is scheduled every 2 hours after repeated bounded runs showed `0` item failures and explainable net-new/changed threads.
- Dashboard pause/resume buttons are live on the System Health job cards and were round-trip tested through `gmail-sync-current`.
- Remaining Phase 1 gap: monitor scheduled Missive/Gmail runs, keep meetings manual until retry/report handling is hard enough, and activate only the next 1-2 jobs after these lanes stay stable.

### Phase 2 — Policy-Aware LLM Router MVP

Goal: centralize model access before high-volume automation expands.

Build:

- `lib/llm-router.js`
- credential registry
- `llm_calls` ledger
- route probes
- workload route table
- model/provider fallback rules
- usage/cost/risk visibility

Auth paths to test and classify:

- Claude Code Max via local `claude -p`
- Claude setup-token / OAuth route
- Claude Agent SDK route
- OpenClaw / ChatGPT Pro route
- direct OpenAI API
- direct Anthropic API
- direct Gemini API
- manual interactive routes

Routing doctrine:

- use subscription paths where supported, observable, stable, and policy-classified
- keep API/cloud fallback mandatory
- do not build blind round-robin quota farming
- do not make resale economics depend on consumer-plan arbitrage
- do not build the production product backend on consumer subscriptions; use official APIs for customer-facing automation unless a native/subscription route is explicitly allowed, probed, logged, and workload-classified
- migrate one workload family at a time only after that route has a successful actual-call probe

Hub-dedicated capacity doctrine:

- Foundation gets its own default model capacity lane.
- Marketing gets its own high-burn model lane because content, video, visuals, and creative iteration can consume far more than normal ops.
- Heavy hubs may need both Claude and ChatGPT capacity.
- Strategy, Ops, Sales, Recruiting, Retention, Zahnd Team Ag, Steve Zahnd, MarketMasters, and Unchained Realtor receive dedicated lanes as usage becomes real.
- Router chooses the hub-assigned account first.
- Overflow is allowed only when explicit, logged, budgeted, and visible.
- No single account is assumed sufficient for all Foundation plus hub workloads.

Backlog/cards:

- `LLM-AUTH-AUDIT-001`
- `LLM-CREDENTIAL-REGISTRY-001`
- `LLM-HUB-CAPACITY-001`
- `LLM-ROUTER-001`

Acceptance:

- every LLM call can be logged with workload, hub, provider, model, auth path, credential, status, and estimated cost
- route probes classify each path before scheduled automation uses it
- existing extraction/synthesis can be moved behind the router incrementally
- API fallback can be invoked only as a guarded, explicit paid-run path when subscription paths fail, exhaust, or are not allowed

Current proof:

- `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live in Foundation DB.
- `lib/llm-router.js` seeds policy-aware credential/route config, executes OpenClaw/Codex subscription model calls, logs every call, and keeps direct OpenAI Responses API as a guarded fallback only.
- `llm-auth-audit` is registered as a manual Foundation job and runs through `npm run foundation:job -- --job=llm-auth-audit`.
- Latest audit probes, in order: direct OpenAI API, direct Anthropic API, local Claude Code subscription, Claude OAuth token, OpenClaw/ChatGPT gateway, and Gemini API.
- Latest historical probe result: OpenAI API available, Gemini API available through `GOOGLE_API_KEY`, Claude Code Max login available, OpenClaw/Codex subscription model run succeeded through `openai-codex/gpt-5.4` OAuth, Anthropic API missing, Claude OAuth token missing.
- 2026-04-25 correction: repo defaults now target `openai-codex/gpt-5.5`; rerun `llm-auth-audit` after the local Codex/OpenClaw upgrade so the DB route proof matches the current model.
- No raw secrets are stored in Postgres. DB records only labels, auth-path classes, status, policy classification, env/keychain references, probe outcomes, and call telemetry.
- Shared candidate extraction and shared-comms synthesis are migrated behind the router.
- Live proof: one synthesis run and one Gmail extraction run recorded `provider=openclaw`, `authPath=chatgpt_subscription_gateway`, `estimatedCostUsd=0` in `llm_calls`.
- Direct OpenAI Responses calls outside the router are blocked by `foundation:verify`; the router fallback requires `LLM_ALLOW_DIRECT_OPENAI_RESPONSES=true`.
- Remaining Phase 2 gap: build the Claude Code / Claude Agent SDK subscription adapter, define hub-dedicated capacity lanes, and add overflow/fallback rules before broad hub automation.

### Phase 3 — Extraction Control MVP

Goal: stop running giant manual backfills and create an always-current extraction team.

Build:

- source crawl targets
- crawl item ledger
- current-day lane
- bounded historical backfill lane
- corpus value classification
- source cursors
- leases
- budgets
- retries
- pause switches
- dedupe/fingerprint rules
- dashboard visibility for each source

Current-day lane:

- process last 24 to 48 hours
- prioritize Gmail, Missive, meetings, Slack, Calendar, Drive notes, and high-value source deltas
- never wait for historical backfill to stay fresh

Backfill lane:

- one bounded bite per source target
- fixed budget and stop condition
- resumable and idempotent
- records what was inspected and what remains

Corpus value lane:

- classify mined material by consumer: strategy, sales leadership, ops, marketing, recruiting, agent coaching, Steve personal brand, MarketMasters, Unchained/education, or reject/no value
- tag reusable assets for content, training, courses, recruiting proof, SOPs, coaching, and strategy evidence
- keep original source evidence linked so hubs can use the material without guessing where it came from
- do not reorganize or move Drive assets outside dry-run mode until a target folder strategy is approved

Backlog/cards:

- `EXTRACT-CONTROL-001`
- `EXTRACT-CURRENT-001`
- `EXTRACT-BACKFILL-001`
- `EXTRACT-RETRY-001`
- `EXTRACT-SCHEDULE-001`
- `EXTRACT-METRICS-001`
- `COMMS-BACKFILL-001`
- `EXTRACTION-TEAM-001`
- `HUB-INTEL-001`

Acceptance:

- Steve can see what source is being crawled, what is current, what remains, and what failed
- current-day sync stays fresh even while history is being processed
- high-value old material becomes usable by the right hub instead of disappearing into a raw archive
- no more overnight "I thought it was running" ambiguity

Current partial proof:

- `source_crawl_targets` and `source_crawl_items` are live in Foundation DB.
- `extraction-control-seed` is registered as a manual Foundation job and seeds the control plane without running any crawls.
- Seed/control runs are serialized with advisory locks and retry deadlocks so overlapping restarts/manual runs do not corrupt the target ledger.
- Seeded targets cover Gmail, Missive, meetings, Slack, Drive, Skool, old-system report mining, and historical Zoom recovery.
- Current-day targets are separate from bounded backfill/corpus/recovery targets.
- `scripts/run-extraction-target.mjs` wraps supported targets with a lease, process-group timeout, source before/after stats, output tail, and target run-state update.
- `gmail-sync-current` now calls `npm run extraction:target -- --target=gmail-current-day` through the Foundation job runner.
- `missive-sync-current` now calls `npm run extraction:target -- --target=missive-current-day` through the Foundation job runner.
- `meeting-notes-sync-current` now calls `npm run extraction:target -- --target=meetings-current-day` through the Foundation job runner.
- Partial target runs now exit nonzero from `run-extraction-target`, so item-level failures cannot look like green Foundation jobs.
- `meeting-notes-retry-failed` is registered as a manual Foundation job and retries failed meeting crawl items from `source_crawl_items` instead of rerunning the whole current-day window.
- First retry proof found `0` failed meeting crawl items and succeeded as a no-op.
- Meeting transcript gap report now separates historical archive gaps from recent forward-looking transcript watch. Current archive coverage is `866` notes, `649` transcripts, and `863` meetings across `2024-10-03` to `2026-04-24`; historical gaps remain real (`239/863` meetings missing transcript artifacts), led by Steve (`123/386` missing), Blake (`49/203`), Nick (`40/88`), and Tanner (`10/32`). Recent watch is keyed to the actual meeting date, not document modified time; the exact Apr 23-24 Leadership, Owners, Budget Review, and Marketing docs Steve checked are confirmed archived with `embedded_in_gemini` transcripts.
- `meeting-transcript-recent-gap-verify` is registered as a manual Foundation job. First proof classified the `21` recent missing transcript artifacts as `21` true-missing, `0` parser/tab misses, `0` owner/path misses, and `0` key mismatches; no safe auto-repairs were available.
- `meeting-transcripts-extract-backlog` is registered as a manual Foundation job for a bounded LLM bite over archived transcripts without a successful processing run for the current content hash. First proof scanned `15` transcripts, upserted `87` candidates, and moved recent transcript candidate coverage to `56/59`.
- First manual proof: Gmail scanned `970` messages, selected `263` threads, and archived `148` net-new artifacts through the target ledger.
- First manual proof: Missive selected `100` conversations and archived `43` net-new artifacts through the target ledger.
- Missive change-aware idempotency check is live; immediate rerun selected `100` conversations, skipped `94` already-current conversations, refreshed `6` changed conversations, and archived `0` net-new artifacts.
- `missive-sync-current` is scheduled every `120` minutes.
- `gmail-extract-latest` and `missive-extract-latest` now target archived threads without a successful processing run for the current content hash instead of offset/latest chunks. First manual proofs scanned `15` Gmail threads and created `13` candidates, then scanned `15` Missive threads and created `11` candidates. These now run through the subscription router; keep them bounded and manual until the paced miner cadence is deliberately activated.
- `shared_communication_artifact_processing_runs` now records candidate-extraction processing attempts with `artifact_content_hash`, actual `provider`, `auth_path`, `route_key`, and actual model. Successful zero-candidate artifacts are excluded from future `--onlyWithoutCandidates=true` queues only for the same extractor version and same current content hash, while changed content and failures remain retryable.
- System Health now exposes Intelligence Pipeline extraction depth: archived artifacts, artifacts with active candidates, still-unmined artifacts, extraction coverage percent, and latest synthesis.
- `shared-comms-intelligence-bite` is a manual synthesis-only job for strategy prep and action review. It reads already-mined candidates and records ranked Strategy Hub/action-router input with a long subscription-route timeout. Gmail, Missive, and meeting transcript extraction now run as separate paced subscription miners so slow extraction calls do not block leadership work.
- Skool remains blocked until access path and content-use boundaries are explicit.
- Historical Zoom audio recovery is paused unless strategy/content value justifies reopening it.
- Gmail item-level ledger proof selected `259` recent threads per run, produced `0` item failures across repeated bounded runs, and promoted `gmail-sync-current` to scheduled every `120` minutes. The first scheduled worker run succeeded, archived `4` threads, cleared its lease, and set target/job next run around `2026-04-24T20:09Z`.
- Meeting notes current-day proof selected `50` meetings, archived `50` notes and `42` embedded transcripts, recorded `50` succeeded crawl items, left `0` failed crawl items, and added `2` net-new artifacts.
- Meeting target runs now parse item-level crawl failures and mark the target `partial` when the process succeeds but individual crawl items fail; partials now fail the Foundation job so the dashboard/worker gets an alert path instead of a false green state.
- Extraction target snapshots now attach a `scheduler` object derived from the registered Foundation job when `metadata.foundationJobKey` exists. This makes Foundation jobs the schedule truth for scheduled crawl lanes while preserving target `nextRunAt` as crawl checkpoint metadata.
- First read-only Drive corpus bite is live through manual Foundation job `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` direct children recorded, `24` child folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed.
- Foundation now exposes a Drive corpus inventory review snapshot with item totals, folder/file counts, pending extraction counts, candidate value routes, and queue state.
- Raw Drive inventory script writes are guarded: non-dry-run inventory must be run through `extraction:target` so leases and target cursors advance with item writes.
- Shared-comms synthesis was run through the subscription router and recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked live intelligence items. Top issues surfaced: KPI deal-data display/sync failure, June cash gap, SocialPilot access/publishing instability, Union Street delivery retry, and Loom access migration issue.
- Remaining Phase 3 gap: monitor scheduled Missive/Gmail sync runs, prove partial failure on a real failed item, extend retry semantics to Drive/video lanes, tune subscription-route miners with per-source timeouts and pacing, prove synthesis as Strategy Hub/action-router input, and build review/export gates before broad backfill.

### Phase 4 — Retrieval, Entity, And Synthesis Hardening

Goal: turn archived data into ranked, live, source-backed intelligence.

Build:

- chunk-level hybrid retrieval / embeddings where justified, with pgvector or a documented fallback
- retrieval cost/call ledgering for high-volume corpus mining
- entity graph
- temporal edges
- cross-artifact linking
- resolution detection
- supersession detection
- cross-source dedup
- staleness scoring
- actionability ranking
- synthesis claim verification before human-facing outputs are treated as decision-grade
- acknowledged-state registry so resolved/accepted/ignored items stop resurfacing as fresh work
- source-backed fact grounding from strategy, KPI, finance, Owners, FUB, marketing, and source contracts
- subject-person privacy/redaction: a person cannot see sensitive evidence about themselves just because they can ask their own assistant
- tier-aware query filtering before any human-facing or agent-facing answer uses sensitive people data

Synthesis output must answer:

- what is new?
- what is unresolved?
- what was resolved?
- what was superseded?
- what matters now?
- who owns it?
- what evidence proves it?
- what should Steve or leadership do next?

Backlog/cards:

- `SECURITY-002`
- `INTEL-JOBS-001`
- `INTEL-ATOM-001`
- `RETRIEVAL-001`
- `RETRIEVAL-002`
- `RETRIEVAL-003`
- `SYNTHESIS-ENGINE-001`
- `SYNTHESIS-FACTS-001`
- `ACTION-ROUTER-001`
- `STRATEGY-001`
- `MEMORY-005`
- `DECISION-005`

Acceptance:

- a small live set of real items exists instead of thousands of raw candidates
- each item links to evidence and source facts
- each item can route to the right operating ledger: decision, backlog task, open question, contradiction, ignore/snooze, or owner-bound action
- old items are suppressed if resolved, stale, duplicated, superseded, or explicitly closed
- sensitive people facts are filtered by subject-person and tier before reaching hubs or agents

### Phase 4A — Auth, Tier, Redaction, And Process-Control Gates

Goal: prevent the old-system leak pattern before hubs or assistants consume sensitive intelligence.

Build:

- app-level authenticated user and tier attachment
- tier-aware read filters for shared intelligence surfaces
- subject-person tagging and sensitivity policy for comms-derived items
- subject-person redaction before any non-Steve / non-admin response
- uniform response shape that does not reveal that content was suppressed
- owner-preserving raw meeting/doc access policy from `docs/specs/2026-04-23-auth-tiers-vault.md`
- `ai@bensoncrew.ca` front-office identity stays invite/delegated-read only; `crewbert@bensoncrew.ca` owns private vault/back-office access
- verifier checks proving lower-tier users and subject people cannot read restricted material
- `SYSTEM-010` decommission/dead-man/cost/process controls for scheduled miners and future agents

Backlog/cards:

- `SECURITY-002`
- `SYSTEM-010`

Acceptance:

- admin-only proof endpoints are clearly separated from user-facing hub/query endpoints
- every shared-communications read surface has an explicit auth/tier/redaction posture
- sensitive people facts cannot be surfaced to the subject person through their own assistant or query
- every running miner/job/agent has visible state, stop/pause/decommission behavior, last activity, and cost/subscription call visibility
- Strategy Hub and agents remain blocked until this gate is green

### Phase 5 — Source Trust Closures

Goal: close the source truth needed before Strategy Hub is trusted.

Close:

- `SOURCE-008`
- `SOURCE-010`
- FUB Level 2 taxonomy baseline
- KPI truth-layer map

Already closed for current reality:

- strategy-used Owners slice
- `SOURCE-014`
- `FOUNDATION-003` / `SRC-FINANCE-001`

Marketing source map:

- `SOURCE-016`
- Benson Crew lane
- Zahnd Team Ag lane
- Steve Zahnd lane
- MarketMasters lane
- legacy Zahnd Team assets that still feed BCrew truth
- SocialPilot auth validation
- Google marketing auth repair
- GA4 / Search Console / YouTube / Google Business Profile / Google Ads account map
- GoHighLevel and lead-flow map

Acceptance:

- Strategy Hub can trust the source facts it uses
- marketing can separate brand lanes without mixing current BCrew and legacy Zahnd truth incorrectly
- KPI and finance facts are no longer guessed from memory

### Phase 6 — Drive, Skool, And Old-System Mining

Goal: create sustainable corpus ingestion instead of one-time archaeology.

Build:

- Drive worker: one folder at a time
- Skool worker: trainings, videos, links, docs, comments where accessible
- rich multimodal extractor contract for Zoom, Loom, YouTube, Skool, web pages, screenshots, transcripts, slides, and demos
- normalized creator/source watchlist for YouTube, blogs, Skool, X, LinkedIn, newsletters, and websites
- YouTube discovery and Gemini video-intelligence MVP after the retrieval spine is live
- web/video crawler boundary for YouTube, Loom, Vimeo, Wistia, public web, and paid/community sources
- video-link inventory lane: system discovers Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool links from archives and authorized crawlers so Steve is not manually collecting URLs
- old-system report miner
- value classifier for content/course/training/recruiting/strategy material
- hub handoff queues for mined assets
- source fingerprints and duplicate detection
- dry-run organizer mode for Drive

Rules:

- current-day lane remains more important than history
- backfill takes one bite per day/source
- Google Drive starts with read-only direct-child inventory of the eight captured shared-drive roots
- Skool starts with access-path audit only; no blind browser scraping
- Loom starts with URL inventory and small authorized extractor proof; Loom's SDK is not a bulk extraction API
- organizer/move actions stay dry-run until approved
- old system is mined for output patterns and useful doctrine, not copied as runtime architecture
- mining output must say which hub can use the asset, or why it should be ignored

Backlog/cards:

- `DRIVE-CORPUS-001`
- `MULTIMODAL-EXTRACTOR-001`
- `CREATOR-WATCHLIST-001`
- `YOUTUBE-SCOUT-001`
- `SKOOL-001`
- `LOOM-001`
- `ZOOM-RECOVERY-001`
- `EXTRACTION-TEAM-001`
- `REPORT-MINING-001`
- `PLATFORM-INTEL-001`
- `HUB-INTEL-001`
- `WEB-CRAWLER-001`

Acceptance:

- the system can keep eating old Drive/Skool/meeting/training content without Steve sitting there
- salvageable old avatars, marketing atoms, scout reports, director briefs, and strategy context are indexed into the new Foundation model
- valuable old material can feed course ideas, YouTube scripts, training assets, recruiting proof, or strategy evidence without mixing brand lanes

### Phase 7 — Strategy Hub

Goal: build the first high-value hub on top of Foundation truth, not raw archive dumps.

Prerequisites:

- runtime MVP active
- router MVP classified
- extraction current-day lane active
- synthesis hardening producing ranked live intelligence
- Action Router v1 producing governed decisions/tasks/questions/contradictions/ignore/snooze records with source back-links
- strategy/Owners/FUB/finance/KPI trust boundaries clear enough for strategy use
- subject-person privacy/redaction active for any sensitive people evidence used in the hub
- `SYSTEM-010` decommission/dead-man/process-cost controls active for any autonomous loop the hub depends on

Strategy Hub should:

- ingest last strategy materials and John Kitchens prep
- compare planned strategy against source-backed operating reality
- surface contradictions
- identify open decisions
- identify constraints and blockers
- produce a tight owner-level strategy packet
- track follow-through after the meeting

Acceptance:

- output is concise enough for ownership to read
- every important claim links to evidence
- decisions and follow-through become tracked system objects

### Phase 8 — First Useful Agents

Goal: only after governed loops work, connect live agents to the system.

Order:

- Harlan personal assistant
- Crewbert orchestrator/operator
- one narrow specialist if needed

Do not build:

- 20 scouts
- autonomous agents without kill switches
- agents that bypass Foundation source truth
- agents that act without logged evidence and approval lanes
- agents that can leak subject-person restricted evidence

Acceptance:

- agents read Foundation truth
- agents create logged proposals/actions
- agents have kill switches
- agents do not invent separate memory or source truth
- agents respect subject-person privacy and tier filters before answering or acting

## Active Docs Only

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

Treat all other handoffs/audits as evidence unless promoted here or linked from the active docs.

## What Is Not Next

- not a full runtime pivot
- not Harlan migration before runtime/source trust
- not a 32-script router rewrite; route one workload family at a time after real adapter proof
- not multi-agent sprawl
- not another giant manual backfill marathon
- not manually auditing hundreds of rows with Steve
- not rebuilding KPI inside AI OS before read rules are locked
- not sales coach / ops hub automations before Owners, FUB, KPI, and source trust are stable
- not deleting handoffs blindly

## Review Cadence

Every major build block needs a checkpoint:

- what shipped?
- what is registered/scheduled/visible?
- what is still manual?
- what source facts changed?
- what backlog cards were closed/enriched?
- what docs became superseded?
- what should run without Steve tonight?

If the answer is unclear, the block is not done.
