# BCrew AI OS Rebuild Plan

Last updated: 2026-04-24
Version: v6.3 — extraction operating system plus hub supply-chain doctrine
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
- OpenClaw stays the planned runtime/channel shell for the later live-agent layer, not the whole OS.
- Harlan is Steve's personal agent, not the whole OS.
- Crewbert is the orchestrator/operator identity, not a magic replacement for source contracts.
- We are not switching stacks mid-Foundation.
- We are not turning on a large agent swarm during Foundation.
- Scripts/routines that call LLMs are not the same thing as agents.
- Real agents are later and narrow: Harlan, Crewbert, then a few specialist agents only after governed loops are stable.
- Active truth lives in the current docs and source-backed UI/API surfaces.
- Handoffs and audits are evidence unless promoted into active docs or backlog.
- Imported spreadsheet mirrors are not write surfaces. Any governed write must target the source workbook/range or a deliberately non-imported destination.
- Extraction is a Foundation supply chain, not a one-off research chore. It must keep current sources fresh, mine old corpora one bounded bite at a time, and preserve what each hub can use.
- Drive and Skool mining belong in Foundation while they inventory, archive, classify, extract, and organize evidence. Course creation, content production, recruiting outreach, coaching, and monetization are Hub work built on that Foundation output.
- The brand/hub lanes must stay separate: Benson Crew residential, Zahnd Team Ag, Steve Zahnd personal brand, MarketMasters, and Steve-owned monetization/education assets are different consumers with different risk boundaries.

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
- First Foundation worker slice: scheduled/manual job metadata, due/next-run status, one-pass worker, read-only deal-review jobs proven through the worker, and LaunchAgent supervision live.
- Policy-aware LLM router MVP: credential/route/probe/call tables, router shell, auth-path audit job, and route status visibility.
- Extraction control MVP: source crawl target/item tables, seeded current-day/backfill/corpus/recovery lanes, item-level crawl reporting, and scheduled current-day proof for Missive + Gmail.
- Row-scoped Owners / deal-review runners.
- Owners Dashboard imported `Lists` repair: governed FUB lead sources now live in upstream `SRC-OWNERS-LISTS-001`, Admin `N` and `P` reuse the same source list, Admin `S` uses imported active agents, and Google delegated writes are blocked from the imported mirror range.
- Marketing source evidence from the old system and current connector checks.
- Doc cleanup plan and generated doc indexes.

Still not done:

- durable source cursors and backfill leases beyond the current-day target proof
- scheduled meeting-notes current-day lane that stays fresh without Steve watching it
- failed-item retry policy for item-level meeting/Drive crawl records beyond visible partial-run reporting
- route acceptance review and first low-risk LLM script migration behind the router
- hub-dedicated model capacity allocation
- source-budget and failure visibility
- full subject-person privacy/query layer
- richer KPI / finance / FUB grounding inside synthesis
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
- protected by budget, pause, and retry rules where relevant
- recording last run, next run, and failure state
- surfacing failures in the dashboard
- verified by `npm run foundation:verify` or a specific proof command

If Steve or a builder has to remember to run it from a terminal, it is still a prototype.

## Active Build Order

### Phase 0 — Keep The Existing Proof Stable

Goal: do not break the working Foundation while we activate it.

Do now:

- keep `npm run foundation:verify` green
- keep shared-comms coverage working
- keep synthesis persisted
- keep Owners/deal-review queued runners usable
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
- deal-review queued runner
- synthesis as manual or scheduled with explicit budget
- one current-day sync lane if stable

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

- `npm run foundation:worker -- --once --maxJobs=2` ran the two due read-only deal-review jobs and recorded successful runs.
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
- do not migrate every LLM call until probes pass

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
- API fallback works when subscription paths fail, exhaust, or are not allowed

Current partial proof:

- `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live in Foundation DB.
- `lib/llm-router.js` seeds policy-aware credential/route config and can record dry-run route selection without calling a provider.
- `llm-auth-audit` is registered as a manual Foundation job and runs through `npm run foundation:job -- --job=llm-auth-audit`.
- Latest audit probes, in order: direct OpenAI API, direct Anthropic API, local Claude Code subscription, Claude OAuth token, OpenClaw/ChatGPT gateway, and Gemini API.
- Latest probe result: OpenAI API available, Gemini API available through `GOOGLE_API_KEY`, Claude Code Max login available, OpenClaw gateway running, Anthropic API missing, Claude OAuth token missing.
- No raw secrets are stored in Postgres. DB records only labels, auth-path classes, status, policy classification, env/keychain references, probe outcomes, and call telemetry.
- Remaining Phase 2 gap: do a route acceptance review and migrate only one low-risk LLM script behind the router. Do not migrate extraction/synthesis broadly yet.

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
- First manual proof: Gmail scanned `970` messages, selected `263` threads, and archived `148` net-new artifacts through the target ledger.
- First manual proof: Missive selected `100` conversations and archived `43` net-new artifacts through the target ledger.
- Missive change-aware idempotency check is live; immediate rerun selected `100` conversations, skipped `94` already-current conversations, refreshed `6` changed conversations, and archived `0` net-new artifacts.
- `missive-sync-current` is scheduled every `120` minutes.
- Skool remains blocked until access path and content-use boundaries are explicit.
- Historical Zoom audio recovery is paused unless strategy/content value justifies reopening it.
- Gmail item-level ledger proof selected `259` recent threads per run, produced `0` item failures across repeated bounded runs, and promoted `gmail-sync-current` to scheduled every `120` minutes. The first scheduled worker run succeeded, archived `4` threads, cleared its lease, and set target/job next run around `2026-04-24T20:09Z`.
- Meeting notes current-day proof selected `50` meetings, archived `50` notes and `42` embedded transcripts, recorded `50` succeeded crawl items, left `0` failed crawl items, and added `2` net-new artifacts.
- Meeting target runs now parse item-level crawl failures and mark the target `partial` when the process succeeds but individual crawl items fail; the Foundation extraction panel surfaces recent item failures and last-run errors.
- Remaining Phase 3 gap: monitor scheduled Missive/Gmail runs, add failed-item retry execution for meetings/Drive, and build item-level cursors before broad backfill.

### Phase 4 — Retrieval, Entity, And Synthesis Hardening

Goal: turn archived data into ranked, live, source-backed intelligence.

Build:

- semantic retrieval / embeddings where justified
- entity graph
- temporal edges
- cross-artifact linking
- resolution detection
- supersession detection
- cross-source dedup
- staleness scoring
- actionability ranking
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

- `SYNTHESIS-ENGINE-001`
- `SYNTHESIS-FACTS-001`
- `STRATEGY-001`
- `MEMORY-005`
- `DECISION-005`

Acceptance:

- a strategy/leadership packet surfaces 15 to 25 real items, not thousands of raw candidates
- each item links to evidence and source facts
- old items are suppressed if resolved, stale, duplicated, or superseded
- sensitive people facts are filtered by subject-person and tier before reaching hubs or agents

### Phase 5 — Source Trust Closures

Goal: close the source truth needed before Strategy Hub is trusted.

Close:

- strategy-used Owners slice
- `SOURCE-014`
- `SOURCE-008`
- `FOUNDATION-003`
- `SOURCE-010`
- FUB Level 2 taxonomy baseline
- finance Level 2 sign-off
- KPI truth-layer map

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
- old-system report miner
- value classifier for content/course/training/recruiting/strategy material
- hub handoff queues for mined assets
- source fingerprints and duplicate detection
- dry-run organizer mode for Drive

Rules:

- current-day lane remains more important than history
- backfill takes one bite per day/source
- organizer/move actions stay dry-run until approved
- old system is mined for output patterns and useful doctrine, not copied as runtime architecture
- mining output must say which hub can use the asset, or why it should be ignored

Backlog/cards:

- `DRIVE-WORKER-001`
- `SKOOL-WORKER-001`
- `REPORT-MINING-001`
- `PLATFORM-INTEL-001`
- `HUB-INTEL-001`

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
- strategy/Owners/FUB/finance/KPI trust boundaries clear enough for strategy use
- subject-person privacy/redaction active for any sensitive people evidence used in the hub

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
- `docs/system-strategy.md`
- `docs/source-registry.md`

Evidence indexes:

- `docs/handoffs/INDEX.md`
- `docs/audits/INDEX.md`

Treat all other handoffs/audits as evidence unless promoted here or linked from the active docs.

## What Is Not Next

- not a full runtime pivot
- not Harlan migration before runtime/source trust
- not a 32-script router rewrite before probes
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
