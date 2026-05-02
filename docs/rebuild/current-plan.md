# BCrew AI OS Rebuild Plan

Last updated: 2026-05-02
Version: v6.23 — missing-card capture after SECURITY-002
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

Locked doctrine means current operating default, not permanent dogma. If research from operators, paid training, YouTube/creator intelligence, Mycro/myICOR, customer evidence, or better system proof shows a better way, update the plan through the Foundation change path: capture the evidence, confirm the owner decision, update docs/backlog/source notes, and add or adjust verifier checks.

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
- Foundation surfaces must not rely on Steve noticing stale truth. When source contracts, connectors, jobs, docs, backlog, Systems, Data Sources, System Inventory, or hub links change, the change must update live-backed surfaces, add/adjust verifier checks, or run a deliberate sweep captured under `FOUNDATION-SWEEP-001`.
- Imported spreadsheet mirrors are not write surfaces. Any governed write must target the source workbook/range or a deliberately non-imported destination.
- Extraction is a Foundation supply chain, not a one-off research chore. It must keep current sources fresh, mine old corpora one bounded bite at a time, and preserve what each hub can use.
- Drive and Skool mining belong in Foundation while they inventory, archive, classify, extract, and organize evidence. Course creation, content production, recruiting outreach, coaching, and monetization are Hub work built on that Foundation output.
- The brand/hub lanes must stay separate: Benson Crew residential, Zahnd Team Ag, Steve Zahnd personal brand, MarketMasters, and Steve-owned monetization/education assets are different consumers with different risk boundaries.
- Foundation is not done until source evidence can move through the full loop: source -> archive/artifact -> candidate/atom -> synthesized item -> routed decision/task/question/contradiction/action -> resolution. V1 now proves this through one approved/applied Action Router route into a live backlog row; the remaining hardening is review UX, closure feedback, and recurrence durability.
- Foundation is the control plane for systems; hubs are the human/business cockpits. A job can run in Foundation while its queue, decisions, and cleanup work surface in the hub it serves.
- SECURITY-002 v1 is live for app-side auth/tier/redaction. Shared-comms and intelligence routes that cannot yet prove filtered access stay Tier 1-only until `SECURITY-FILTERED-COMMS-ACCESS-001` closes.
- Raw meeting notes are a separate Drive/vault boundary. `SECURITY-002` controls AIOS responses, but it does not remove access to original Google Docs. `MEETING-VAULT-ACL-001` owns owner-preserving raw meeting-note ACL enforcement.
- No public/broader external exposure happens until `SECURITY-EDGE-001` or an explicit approved successor proves the edge auth/tunnel/access posture.
- `SYSTEM-010` controls are a Foundation gate, not a later ops polish item: running jobs, agents, miners, and paid/subscription model calls must be visible, pausable/stoppable, failure-tracked, and decommissionable before autonomous loops expand.
- Strategy Hub is the first major consumer, not the old advisor surface. Now that the spine has Action Router v1 and retrieval eval coverage, resume Strategy Hub only as a source-to-gap operating dashboard on top of source-backed facts, synthesized items, and routed approval records.

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
- Foundation Systems page: 14 major operating systems mapped with purpose, maturity level, source contracts, connectors, runtime jobs, source notes, backlog cards, and next-level plan.
- Google delegated read path for Workspace sources.
- Gmail, Calendar, Missive, Slack, meeting notes, and meeting transcript reads.
- Shared-communications archive in Postgres.
- Candidate extraction lanes for meetings, Gmail, Missive, Slack, and recovered Zoom material.
- Historical meeting context reaching back to October 2024 where recovered/transcribed.
- Persisted synthesis runs/items in Postgres.
- Memory/retrieval/synthesis spine through governed synthesis: intelligence job runs, old-system salvage contract, report artifacts, atoms, atom hits, lexical chunks/search, pgvector semantic search, hybrid evidence retrieval, source-backed facts, and governed synthesized items with fact/evidence/chunk provenance.
- First Foundation job registry and DB-backed job run ledger.
- First Foundation worker slice: scheduled/manual job metadata, due/next-run status, one-pass worker, deal-review jobs proven through the worker, and LaunchAgent supervision live.
- Policy-aware LLM router: credential/route/probe/call tables, executable OpenClaw/Codex subscription adapter, auth-path audit job, call ledger, route status visibility, and shared intelligence extraction/synthesis migrated behind the router.
- Extraction control MVP: source crawl target/item tables, seeded current-day/backfill/corpus/recovery lanes, item-level crawl reporting, scheduled current-day lanes for Gmail/Missive/meetings/Slack, daily shared-comms extraction missions, daily Drive inventory/content missions, daily Gmail attachment extraction, and daily YouTube subtitle transcript extraction from the video manifest.
- Drive content extraction first slices: Google Docs, Google Sheets, PDFs, markdown, and plain-text files are archived as source-backed artifacts with explicit skip reasons for unsupported file types.
- Gmail attachment extraction first slice: Gmail PDF/text attachments are archived; images/media/Office/OCR classes are skipped into explicit future lanes.
- Video transcript extraction first slice: YouTube subtitles are extracted through DataForSEO from the shared video-link manifest; no-subtitle/visual-review work routes to the multimodal lane.
- KPI/Supabase read rules are closed for `SOURCE-010`; `KPI-HEALTH-001` v1 now probes load-bearing KPI tables/RPCs, freshness windows, and Lee repo/Supabase schema drift.
- Row-scoped Owners / deal-review runners.
- Owners Dashboard imported `Lists` repair: governed FUB lead sources now live in upstream `SRC-OWNERS-LISTS-001`, Admin `N` and `P` reuse the same source list, Admin `S` uses imported active agents, and Google delegated writes are blocked from the imported mirror range.
- Owners/FUB v1 parity rules: Admin column `BZ` joins to FUB person records, governed FUB source rules drive company/agent expectations, and Admin review flags invalid source, source-lineage, stale-stage, and ISA mismatch issues.
- Google Drive corpus root list captured in `docs/source-notes/google-drive-corpus.md`.
- Skool corpus access and policy boundary captured in `docs/source-notes/skool-corpus.md`.
- Marketing source evidence from the old system and current connector checks.
- Doc cleanup plan and generated doc indexes.
- Ops Hub v1 as its own hub surface for systems serving Ops, starting with Admin, Conditional, FUB drift, and Agent Roster inspections. Scheduled jobs now run marked re-reviews first, then pace Admin first-pass backlog at 5 newest eligible June 2025+ deals per day, writing AI status/action/findings only. Foundation remains the control plane; Ops owns the human cockpit.

Still not done:

- durable source cursors, target-run IDs, and backfill leases beyond the current-day target proof
- router-ledged transcription workload and enforced model-route budgets/caps beyond the direct-host verifier
- failed-item retry policy for Drive/video/non-meeting crawl records beyond the first meeting retry path
- proof that partial-run job failure/alert semantics work on a real failed meeting/Drive item
- operator UI/verifier hardening for job/target schedule truth now that Foundation jobs own scheduled crawl lanes
- Claude Code / Claude Agent SDK subscription adapter under the BCrew router
- hub-dedicated model capacity allocation beyond the first Foundation subscription path
- source-budget and failure visibility
- raw meeting-note Drive/vault ACL enforcement
- real-data filtered shared-comms summaries for approved non-Tier-1 users
- public edge auth/tunnel hardening before broader external exposure
- provider-side rotation/retirement proof for exposed credentials
- full `SYSTEM-010` decommission, dead-man, and cost/process-control layer
- scheduled broad corpus promotion beyond the current proof/mission lanes
- broader KPI / finance / FUB fact expansion inside synthesis
- Action Router closure proof: synthesized items now create human-approval-required routes into decisions, backlog tasks, open questions, ignore/snooze, and owner-bound action lanes with source back-links. One route has been approved/applied into live backlog item `ACTION-001`; pending queue size is no longer a verifier dependency.
- source-backed Strategy Hub
- Harlan/Crewbert useful runtime
- Drive Slides/Office/shortcut/vision-grade OCR/media extractors and Skool/Loom/Drive-video crawler workers
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

## Phase Gates And Backlog Traceability

This section is not a second backlog.

Priority resolves in this order:

1. Foundation Overview gives the command order for what to work on next.
2. The live Backlog owns task status, priority, lane, owner, and next action.
3. This Rebuild Plan explains doctrine, phase gates, and the definition of done.

If these disagree, fix the live Backlog and the active docs together instead of letting two work queues compete.
If a builder chat drifts into lower-priority work, the assistant should name the drift, route the idea to backlog, or ask Steve to explicitly override the current command order.
All implementation work must be backlog-pulled. Evidence chooses which formal card to pull next; it does not justify chat-only work.
Before code, each slice needs a card ID, scope, implementation plan, acceptance criteria, verifier plan, closeout plan, and risk notes reviewed to the 9.8/10 quality bar.

### 2026-05-02 Missing-Card Capture

After the SECURITY-002 closeout, Steve asked for a full sweep of specs, audits, handoffs, source notes, memory, and backlog state to catch work that had been discussed but never promoted into real backlog cards. The sweep found more than the meeting-note issue. The following work is now captured in backlog truth and must be planned before implementation:

- `MEETING-VAULT-ACL-001` — raw Google Drive meeting-note ACL enforcement. SECURITY-002 does not remove Drive access from original files.
- `SECURITY-FILTERED-COMMS-ACCESS-001` — real-data filtered shared-comms/intelligence summaries for approved non-Tier-1 users.
- `SECURITY-EDGE-001` — public edge auth/tunnel hardening before broader external exposure.
- `SECURITY-PROVIDER-ROTATION-PROOF-001` — provider-side proof for exposed or retired credentials.
- `DRIVE-ACCESS-REQUEST-001` — delegated Drive access-request and ACL repair preflights.
- `FOUNDATION-DONE-TEST-001` — explicit Foundation readiness exit gate. Done for the gate implementation under `foundation-done-test-v1`; the current gate may still report `not_ready` while blocker cards remain open.
- `SYSTEM-010-GHOST-CLOSEOUT-001` — dead-man, autorestart, kill/decommission, active-process, and cost-control closeout.
- `SOURCE-LIFECYCLE-COMPLETION-001` — source lifecycle completion/revalidation gate.
- `EXTRACT-RUN-HARDENING-001` — extraction run ID, retry/backoff, partial failure, stale lease, cursor, and bounded backfill hardening.
- `SYNTHESIS-VERIFY-001` — source-evidence verification gate for synthesized claims before Strategy/scout consumption.
- `MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001` — future meeting transcript capture and gap handling.
- `PROCESS-ACK-STATES-001` — governed acknowledged-state handling for accepted gaps and intentional pauses.
- `VERIFIER-INCREMENTAL-COVERAGE-001` — incremental/card-scoped verifier path.

Disposition notes:

- `FOUNDATION-SURFACE-UPDATES-001` and `RUNTIME-HEALTH-SIMPLIFY-001` already cover the Foundation command-center/UI clarity work; do not create a duplicate command-center card unless Steve explicitly wants a separate build.
- Existing source cards still own source-specific work where they are already precise enough. The new cards above exist only where audits found missing ownership or an umbrella that could hide a Foundation gate.
- These cards are captured so the sprint does not skip them. Capture is not approval to build them out of order. `FOUNDATION-DONE-TEST-001` is the exception now pulled and implemented as the readiness detector; it does not make the blocker cards pass.

### Operator Surface Standard

Foundation is the CEO dashboard for system-building. It must answer in plain English:

- what the system can do now
- how healthy the system and code are
- what shipped recently
- what needs attention next

Every operator-facing page, build description, status label, and agent handoff should use plain English first. If a technical term is necessary, such as a commit hash, table name, file path, API route, or source ID, put the plain-English meaning next to it.

The daily Foundation nav target is:

1. Overview
2. Systems
3. Backlog
4. Recent Work

The Overview should act like a scrum-master / CEO dashboard for the Foundation build: active command order, system grade, recent shipped work, done velocity, and the next decision. Done sections should show when work moved to done and sort newest done to oldest done. Recent Builds / Recent Work should default collapsed and show where each change lives in the app or docs.

The old Foundation Overview grouping that reads like `Phase 1 · Truth Cleanup` must not compete with this Rebuild Plan's phase numbers. Either reconcile the UI to the plan's phase numbering or replace those groups with the current command-order view: keep maps/build log current -> monitor extraction -> harden corpus -> source health/freshness -> close action loop.

### Immediate Foundation Closeout Checklist

This checklist is the current phase-gate trace after the 2026-04-26 systems/source review. Treat it as a map to live backlog cards, not a standalone work queue.

0. `BACKLOG-HYGIENE-PASS-001` -> `BACKLOG-HYGIENE-001` -> `DEV-PROCESS-AUDIT-001` -> `PROCESS-HOOKS-001` — Restore backlog-pulled dev discipline before more product UI.
   - `BACKLOG-HYGIENE-PASS-001` is the one-time cleanup that moved stale/unclear cards out of executing or split their proof from remaining work.
   - `BACKLOG-HYGIENE-001` is done for v1: `npm run backlog:hygiene`, `/api/foundation-hub > backlogHygiene`, Runtime Health > Backlog Hygiene, synthetic stale-card proof, and verifier coverage are live.
   - `DEV-PROCESS-AUDIT-001` is done for v1: `docs/audits/2026-04-28-dev-process-audit.md` maps the 2026-04-28 failures to hook/verifier/backlog/UX owners and gives `PROCESS-HOOKS-001` 10 concrete v1 requirements.
   - `PROCESS-HOOKS-001` is done for v1: `npm run process:ship-check` requires a live backlog card, approval evidence file, score >= 9.8, seven-field closeout, where-it-lives metadata, served-code proof, and default `foundation:verify` unless a skip reason is explicit.

1. `SECURITY-003` — Close direct LLM/transcription spend bypasses.
   - `scripts/transcribe-zoom-audio-archive.mjs` is paused/fail-closed for non-dry-run use.
   - Verifier coverage now checks direct model/transcription host calls outside approved router/adapters, not only OpenAI Responses.
   - Later: rebuild transcription as a router-ledged transcription workload before reopening Zoom audio recovery.
   - Keep sanctioned auth probes explicit.
2. `SECURITY-004` / `SECURITY-002` — Gate broad read APIs before any broader dashboard, hub, assistant, or user-facing access.
   - `SECURITY-002` is done for v1 under `security-002-auth-tier-redaction-v1`: central request access context, route posture registry, `assertTier`/`assertRole`, server-derived intelligence evidence tier, stable redacted response helpers, subject_people/sensitivity/min_tier filtering proof, and Tier 1-only fail-closed posture for unproven shared-comms/intelligence access.
   - Interim admin gating remains for legacy broad read surfaces, but it now runs behind central route posture instead of scattered route allowlists.
   - `MEETING-VAULT-ACL-001` owns raw Google Drive meeting-note ACL enforcement. Do not treat SECURITY-002 as removing access from original Drive files.
   - `SECURITY-FILTERED-COMMS-ACCESS-001` owns non-Tier-1 filtered summary access on real shared-comms data.
   - `SECURITY-EDGE-001` owns public edge auth/tunnel hardening before broader external exposure.
   - `SECURITY-PROVIDER-ROTATION-PROOF-001` owns provider-side credential rotation/retirement proof.
   - `FOUNDATION-USERS-001` is the smaller P1 follow-up for owner-only user administration from Foundation: list users, add email/name/role, disable users, audit changes, avoid password exposure, and prove non-owners cannot manage access. Do not build it inside extraction-control schedule reconciliation.
   - `FOUNDATION-SURFACE-UPDATES-001` is the P1 follow-up for Foundation operator clarity: plain-English status/copy, Overview -> Systems -> Backlog -> Recent Work nav order, collapsed Recent Builds / Recent Work with app/doc breadcrumbs, done-velocity visibility, and plan/backlog grouping convergence. Do not build it inside hygiene/process slices unless Steve explicitly switches scope.
3. `SYSTEM-010` — Finish runtime/process-control hardening.
   - Keep dashboard and worker LaunchAgent plists in repo.
   - Served-code-equals-HEAD check is live: the dashboard captures its server-start commit and `foundation:verify` fails with a restart command if the served commit does not match repo HEAD.
   - Add auto-restart-on-push next so the dashboard updates itself after verified commits instead of only failing loudly.
   - Router fallback is manual-explicit, not automatic; keep code/docs/UI from implying automatic paid fallback.
   - Enforce job-level budget tags or rename them as descriptive tags.
   - Bound large Foundation snapshot reads with limits or paging.
   - Finish decommission, dead-man, cost/process visibility, and stop controls.
   - `SYSTEM-010-GHOST-CLOSEOUT-001` captures the remaining ghost-process/dead-man/decommission/cost-control proof so the umbrella cannot sound more finished than it is.
4. `EXTRACTION-TEAM-001` / `DRIVE-CONTENT-001` / `EMAIL-ATTACHMENTS-001` / `MEETING-VIDEO-001` — Finish controlled miner/corpus lanes.
   - Build paced miner v1: one-at-a-time, cursors, leases, retry/backoff, spacing, per-source timeouts.
   - Keep daily Drive Docs/Sheets/PDF/text/markdown, scanned-PDF OCR fallback, Gmail PDF/text attachment, and YouTube subtitle transcript missions stable.
   - Add Missive attachments, Drive Slides/Office/shortcuts/vision-grade OCR, meeting-linked Drive/Zoom/Loom video priority, and richer multimodal/GOD-mode extraction as separate ledged slices.
   - Extend failed-item retry/reporting beyond meetings into Drive/video/non-meeting crawl records.
   - Keep Skool/Loom/Mycro extraction governed by authorized access, use rights, cost/route ledgering, quotas, and stop controls.
   - `EXTRACT-RUN-HARDENING-001` consolidates run IDs, retry/backoff, partial failure alerts, stale leases, bounded backfill windows, and next-safe-command proof across the existing extraction cards.
5. `INTEL-JOBS-001` -> `REPORT-MINING-001` -> `INTEL-ATOM-001` -> `RETRIEVAL-001` through `SYNTHESIS-ENGINE-001` — Build the memory/retrieval/synthesis spine.
   - Add a run/cost/cursor ledger for ingestion, extraction, chunking, embedding, synthesis, video analysis, and brief generation.
   - `INTEL-JOBS-001`, `REPORT-MINING-001`, `INTEL-ATOM-001` done as the v1 report/atom substrate, `RETRIEVAL-001`, `RETRIEVAL-002`, `RETRIEVAL-003`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, and `ACTION-ROUTER-001` are now done/hardened enough for Strategy Hub v2 to consume routed proof.
   - Use `intelligence_report_artifacts`, `intelligence_atoms`, `intelligence_atom_hits`, `intelligence_retrieval_chunks`, `intelligence_synthesis_facts`, and `intelligence_synthesized_items` as the governed report/atom/retrieval/fact/synthesis substrate before scaling video/web/Skool extraction.
   - Build Strategy Hub v2 next from deterministic source-to-gap snapshots and routed action records, not the old advisor/recommendation surface. Run `npm run intelligence:retrieval-eval` before major retrieval/synthesis changes.
   - Keep Graphiti/Zep deferred until Postgres memory proves itself.
6. `SOURCE-008` / `DATA-005` — Close FUB Level 2 taxonomy and Owners/FUB lineage.
   - Refresh stale FUB source snapshot.
   - Sign off trusted FUB source taxonomy baseline and new-source review rules.
   - Lock Owners dropdown/list parity against FUB lineage.
7. `DATA-007` through `DATA-009` — Parked Ops/deal-validation cleanup, not Foundation source blockers.
   - Invalid lead-source row backfill, missing FUB link backfill, and suspicious duplicate full-credit row resolution now route through Ops/source-quality cleanup unless new evidence proves a v1 rule is wrong.
8. `KPI-HEALTH-001` — Done for v1 after `SOURCE-010`.
   - `SOURCE-010` is closed for first-pass read rules. KPI health now has a read-only probe, Data Sources surface, Runtime Health warning hook, Lee repo/Supabase schema drift checklist, and verifier coverage.
9. `SYNTHESIS-ENGINE-001` / `SYNTHESIS-FACTS-001` / `ACTION-ROUTER-001` — Close the intelligence loop.
   - Governed synthesis now persists owner-suggested synthesized items from source-backed facts and hybrid evidence.
   - Source-backed strategy/source-contract, goal, operating, KPI, source-health, and retrieved-evidence grounding is now persisted in `intelligence_synthesis_facts`.
   - Action Router v1 now proposes governed routes into decisions, backlog tasks, questions, ignore/snooze, or owner-bound action lanes with back-links and human approval required before destination writes.
   - `ACTION-REVIEW-APPLY-001` is done for v1: Foundation > Backlog > Action Review makes pending and approved routes visible, supports approve/reject/apply, requires reject reasons, and shows destination-record proof after apply. Do not reopen broad `ACTION-ROUTER-001` for this.

10. `RESEARCH-INBOX-001` — Park the pre-backlog research inbox.
   - This captures Steve's outside ideas, YouTube/Mycro/myICOR/course/article inputs, and AI-system-building patterns before they become committed backlog. Workflow: capture -> plain-English triage -> promote to backlog or archive with reason.
   - Not next. It becomes important when Foundation is good enough to un-pause Scoper/dev-intelligence/agent-managed backlog work.

11. `RUNTIME-HEALTH-SIMPLIFY-001` — Park Runtime Health simplification.
   - Runtime Health is powerful but dense. Later work should add a plain-English top layer and collapsed diagnostic groups without removing the underlying detail.
   - Not next.

### Hard Checkpoint — 2026-04-28 Foundation Return

The Apr 27-28 Strategy push was useful because it proved the source -> atom -> retrieval -> facts -> synthesis -> route spine and exposed the next Strategic Intelligence requirements. It also proved the danger of climbing too high before Foundation can explain and police what was built.

Current call:

- pause Strategy Hub UI polish
- do not build the Scoper yet
- do not start Agent Factory / Health Auditor / cleanup agents
- stop and re-plan with Steve after the first Action Review slice

Order now:

1. `SYSTEM-STRATEGY-REVIEW-001` — done / P1.
   - Apr 26-28 builder/reviewer lessons were promoted into system strategy, current plan/state, and backlog cards.
   - The handoff evidence is `docs/handoffs/2026-04-28-foundation-hard-checkpoint.md`.
2. `FOUNDATION-SWEEP-001` — done / P0.
   - V1 maps every Foundation nav page to backing APIs/docs/tables/source IDs/backlog owners.
   - Runtime Health now surfaces stale source-crawl target runs.
   - The stale Slack proof run `crawl-slack-current-day-20260427145904292-3f93bebd` was caught and marked failed by the stale source-crawl run reaper.
   - `foundation:verify` now guards the surface map, stale-run payload, and no-stale-active-run state.
3. `FOUNDATION-CHANGELOG-002` — done / P0.
   - Recent Builds v2 merges git history with repo-truth closeout records for major Foundation builds.
   - The page now groups builds by day and system area, links related backlog cards, shows proof commands/status, explains where the work lives, and names what Steve should review next.
   - `foundation:verify` guards the v2 closeout schema and the visible closeout proof for `FOUNDATION-SWEEP-001` and `FOUNDATION-CHANGELOG-002`.
4. `EXTRACT-CONTROL-001` / `EXTRACT-METRICS-001` — done for v1 / P0 + P1.
   - Runtime Health now exposes Extraction Control: Coverage By Target.
   - The coverage panel shows last success, last failure, next bite, item totals, succeeded/skipped/failed counts, top failed/skipped reasons, and remaining backlog indicators where lanes already expose them.
   - `EXTRACT-CONTROL-001` v1 is closed; failed-item retry/backoff remains in `EXTRACT-RETRY-001`, and surface breadcrumb/update polish remains in `FOUNDATION-SURFACE-UPDATES-001`.
5. `ACTION-REVIEW-APPLY-001` — done for v1 / P0.
   - Foundation > Backlog > Action Review is the first human action-loop surface.
   - Pending routes can be approved or rejected with a required reason; approved routes can be applied; applied routes show destination-record proof.
   - Next is not automatic. Stop and re-plan with Steve before un-pausing Scoper, dev intelligence, agent-managed backlog, Strategy UI, or another Foundation slice.
   - runtime/source freshness
   - extraction/corpus hardening
   - closed-loop action/resolution feedback
   - privacy/tier/process controls
6. Resume Strategic Intelligence only after the Foundation checkpoint work is stable.

### Parked Next Leg — Strategic Intelligence Operating Loop

This is the active next-leg plan after the 2026-04-28 Strategy Hub route review. The goal is not a one-time quarterly planning dashboard. The goal is a continuously useful Strategic Intelligence loop that mines company signals, surfaces needle-moving issues, scopes what is already answered versus truly missing, and helps the ownership team move those issues to resolution.

This leg remains correct, but it is not the next build until Foundation visibility catches up.

Order:

1. `STRATEGY-HUB-MEETING-READY-001` — scoped / P1.
   - V1 proof plumbing shipped, but Steve did not accept the UI quality as meeting-ready.
   - Resume only after Foundation freshness/build-visibility work is stable.
   - Required: human-readable source proof instead of internal IDs, button legend/tooltips, owner picker, snooze durations, Strategy-local applied/done visibility, and reject confirmation.
2. `STRATEGIC-INTEL-001` — scoped / P0.
   - Spec gate before more Strategic Intelligence code.
   - Must define the strategic issue data model, continuous mining cadence, urgency/impact/confidence/staleness fields, resolution feedback writes, old scout/director/scoper/sprint mapping, and 10x value metrics.
   - Depends on `STRATEGY-HUB-MEETING-READY-001`; blocks `INTEL-SCOPER-001`.
   - Initial 10x targets for the first pilot: >= 5 strategic issues surfaced/week, >= 3 scoped/week, >= 2 resolved-to-applied/week, and median manual investigation time <= 30 minutes per issue.
3. `INTEL-SCOPER-001` — scoped / P0.
   - Build the gap-resolving Scoper, not a generic research brief.
   - It must answer what is already verified, what is partial, what actually remains, who likely owns it, and the smallest useful next steps, with evidence pointers for every verified claim.
   - Depends on the approved `STRATEGIC-INTEL-001` issue-ledger/schema decision.
   - Hub UI must support `Scope this` and render the scoped result as verified / partial / remaining-gaps sections with evidence chips and next steps.
4. `INTEL-THREAD-CONTEXT-001` — scoped / P1.
   - Evidence proof must show reply count, participants, latest activity, weak-proof flags, and cross-source corroboration where available.
   - This prevents one-way or test-like emails from looking like confirmed strategic issues.
5. `STRATEGY-QUARTER-001` — scoped / P1.
   - Build the Strategy Quarter input/context layer: quarter theme, critical number, unresolved strategic issues, department targets, open decisions, weekly outputs, and meeting follow-through.
   - This gives Strategic Intelligence context; it is not the value layer by itself.
6. `MODEL-ROUTING-001` — scoped / P1.
   - Document model/runtime routing doctrine before Scoper and agent work expand.
   - Preserve the boundary: subscriptions are for humans/operator use when allowed and logged; system runtime uses official APIs and governed adapters by default.
   - Canonical destination is `docs/rebuild/current-runtime-map.md`.
7. `SYSTEM-STRATEGY-REVIEW-001` — done / P1.
   - Apr 26-28 builder/reviewer conversations were mined into repo truth/backlog/verifiers by the hard checkpoint.

Discipline rules for this leg:

- Memory is not backlog. If a conversation changes the build, it must land in repo truth or a DB-backed backlog card in the same session.
- Each card closes only on measurable acceptance criteria, proof, and a human-readable sample where applicable.
- Steve reads the Strategy/Scoper sample rows before closeout; verifier success alone is not enough.
- Do not start Agent Factory, System Health Auditor, cleanup agents, or department director agents until the existing deferral gate is met.
- Foundation remains the control plane. Hubs are consumers and work surfaces; if the system cannot explain its own changes and current plan, do not climb higher into hub UX.

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
- current-day sync lanes for Gmail, Missive, meetings, and Slack
- daily quota missions for shared-comms extraction, Drive content, Gmail attachments, and video transcript outputs

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
- `RUNTIME-SUPERVISOR-001` now explicitly owns the dashboard served-code-equals-HEAD / auto-restart-on-push gap exposed by the Recent Builds closeout review. The served-code verifier slice is live; auto-restart-on-push remains open.
- Active-run locking is enforced with a unique active-run index per job, so a second worker/manual trigger cannot start the same job while it is already queued/running.
- Job timeout cleanup now kills the process group with `SIGTERM` and escalates to `SIGKILL`.
- Operator-controlled job pause/resume is DB-backed and exposed through `/api/foundation/jobs/:jobKey/control`.
- Gmail and Missive current-day sync jobs now run through the extraction target ledger.
- Missive current-day sync has been promoted to scheduled every 2 hours after exact-ID idempotency proof.
- Gmail current-day sync now has item-level thread ledgering and is scheduled every 2 hours after repeated bounded runs showed `0` item failures and explainable net-new/changed threads.
- Meeting notes current-day and Slack current-day lanes are scheduled.
- Daily shared-comms extraction missions are scheduled for Gmail, Missive, meeting transcripts, and Slack.
- Drive content extraction, Gmail attachment extraction, and video transcript extraction are scheduled as daily quota missions with filed-output proof.
- Dashboard pause/resume buttons are live on the System Health job cards and were round-trip tested through `gmail-sync-current`.
- Remaining Phase 1 gap: monitor scheduled current-day/extraction runs, prove alert behavior on real partial failures, and raise daily quotas only after runs stay stable.

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
- Latest probe result: OpenAI API available, Gemini API available through `GOOGLE_API_KEY`, Claude Code Max login available, OpenClaw/Codex subscription model run succeeded through `openai-codex/gpt-5.4`, Anthropic API missing, Claude OAuth token missing.
- 2026-04-26 correction: keep AIOS subscription extraction on `openai-codex/gpt-5.4` until OpenClaw explicitly supports `openai-codex/gpt-5.5`; use 5.5 for coding/interactive work, not scheduled extraction.
- No raw secrets are stored in Postgres. DB records only labels, auth-path classes, status, policy classification, env/keychain references, probe outcomes, and call telemetry.
- Shared candidate extraction and shared-comms synthesis are migrated behind the router.
- Live proof: one synthesis run and one Gmail extraction run recorded `provider=openclaw`, `authPath=chatgpt_subscription_gateway`, `estimatedCostUsd=0` in `llm_calls`.
- A bounded JSON extraction probe also passed through `openclaw` / `openai-codex/gpt-5.4`; full shared-comms extraction can use long subscription windows, but it must run through paced worker jobs with timeout/reaper coverage instead of foreground builder-chat commands.
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

Corpus mission lane:

- old Drive, Skool, Zoom, Loom, YouTube, and report mining are daily quota missions, not polling timers
- a mission starts, processes a small count such as 5 files, 5 videos, or 10 reports, files the outputs with provenance, updates the ledger, then stops
- runtime windows can be long when subscription capacity is used, but completion is governed by quota, filed outputs, and stop conditions instead of elapsed time alone
- current-day sync is scheduled for Gmail, Missive, meetings, and Slack; corpus inventory/extraction should run as quota missions with pause/stop behavior and filed-output checks

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
- `FOUNDATION-SURFACE-UPDATES-001`
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
- Scheduled crawl targets now display Foundation job runtime as the visible next-run truth; target-level `next_run_at` remains available only as `crawlCheckpointNextRunAt` runner checkpoint metadata.
- `gmail-sync-current` now calls `npm run extraction:target -- --target=gmail-current-day` through the Foundation job runner.
- `missive-sync-current` now calls `npm run extraction:target -- --target=missive-current-day` through the Foundation job runner.
- `meeting-notes-sync-current` now calls `npm run extraction:target -- --target=meetings-current-day` through the Foundation job runner.
- `slack-current-day` now records channel-level `source_crawl_items`; the 2026-04-28 proof run inspected 61 channels, archived 481 threads, marked 51 channel items succeeded, marked 10 skipped with `no_archivable_messages`, and replaced the stale Apr 27 reaped run as the latest target state.
- `missive-current-day` now records conversation-level `source_crawl_items`; the 2026-04-28 proof run inspected 100 conversations, wrote/refreshed 17, marked 82 already-current skips, marked 1 empty-thread skip, and produced 0 item failures.
- `docs/audits/2026-04-28-extraction-lane-item-shape.md` preserves the lane-consistency inspection for `EXTRACT-METRICS-001`: Slack, Gmail, meetings, Drive corpus/content, attachments, video, and Missive now all expose item ledger rows; the audit-time Drive content failures stay routed to future retry/backoff handling if they reappear.
- Runtime Health now exposes Extraction Control: Coverage By Target from `/api/foundation-hub`, with last success, last failure, next bite, item totals, top failed/skipped reasons, and remaining backlog indicators where available.
- `EXTRACT-CONTROL-001` v1 is closed through that coverage panel. Further retry/backoff execution belongs to `EXTRACT-RETRY-001`; richer app-surface breadcrumbs and updated markers belong to `FOUNDATION-SURFACE-UPDATES-001`.
- Drive Sheets text extraction was picked from Runtime Health evidence: `sheet_text_extraction_not_in_v1` was the largest actionable Drive content skipped reason. Proof run `crawl-drive-content-extract-backfill-20260428181558392-93bfbd63` inspected 5 existing sheet-skipped items, archived 5 `drive_spreadsheet` artifacts / 308,697 chars through Sheets API values, and recorded 0 crawl item failures.
- KPI health was picked from the broader Runtime Health/source evidence frame: failed extraction items were 0, synthesis quality was green, Action Router had pending work but no approved-stuck breakage, and `KPI-HEALTH-001` was the smallest closeable freshness/health slice. The v1 probe checks 14 load-bearing KPI tables, 5 KPI RPCs, per-source freshness windows, expected Supabase columns/RPC output fields, and Lee `zahnd-team-dashboard` table/RPC references. Primary surface is Foundation > Data Sources > APIs / Apps > KPI / Supabase Health; Runtime Health only warns when unhealthy.
- Partial target runs now exit nonzero from `run-extraction-target`, so item-level failures cannot look like green Foundation jobs.
- `meeting-notes-retry-failed` is registered as a manual Foundation job and retries failed meeting crawl items from `source_crawl_items` instead of rerunning the whole current-day window.
- First retry proof found `0` failed meeting crawl items and succeeded as a no-op.
- Meeting transcript gap report now separates historical archive gaps from recent forward-looking transcript watch. Current archive coverage is `866` notes, `649` transcripts, and `863` meetings across `2024-10-03` to `2026-04-24`; historical gaps remain real (`239/863` meetings missing transcript artifacts), led by Steve (`123/386` missing), Blake (`49/203`), Nick (`40/88`), and Tanner (`10/32`). Recent watch is keyed to the actual meeting date, not document modified time; the exact Apr 23-24 Leadership, Owners, Budget Review, and Marketing docs Steve checked are confirmed archived with `embedded_in_gemini` transcripts.
- `meeting-transcript-recent-gap-verify` is registered as a manual Foundation job. First proof classified the `21` recent missing transcript artifacts as `21` true-missing, `0` parser/tab misses, `0` owner/path misses, and `0` key mismatches; no safe auto-repairs were available.
- Meeting text coverage is not the same as meeting video/recording coverage. The video-link inventory can find linked Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool URLs, but reviewing or transcribing the linked videos/recordings is separate backlog work.
- `meeting-transcripts-extract-backlog` is registered as a scheduled daily Foundation job for a bounded LLM bite over archived transcripts without a successful processing run for the current content hash. First proof scanned `15` transcripts, upserted `87` candidates, and moved recent transcript candidate coverage to `56/59`.
- First manual proof: Gmail scanned `970` messages, selected `263` threads, and archived `148` net-new artifacts through the target ledger.
- First manual proof: Missive selected `100` conversations and archived `43` net-new artifacts through the target ledger.
- Missive change-aware idempotency check is live; immediate rerun selected `100` conversations, skipped `94` already-current conversations, refreshed `6` changed conversations, and archived `0` net-new artifacts.
- `missive-sync-current` is scheduled every `120` minutes.
- `gmail-extract-latest`, `missive-extract-latest`, `meeting-transcripts-extract-backlog`, and `slack-extract-latest` now target archived artifacts without a successful processing run for the current content hash. Gmail and Missive first proofs scanned `15` threads each and created `13` and `11` candidates. These now run as scheduled daily subscription-router quota missions.
- `shared_communication_artifact_processing_runs` now records candidate-extraction processing attempts with `artifact_content_hash`, actual `provider`, `auth_path`, `route_key`, and actual model. Successful zero-candidate artifacts are excluded from future `--onlyWithoutCandidates=true` queues only for the same extractor version and same current content hash, while changed content and failures remain retryable.
- System Health now exposes Intelligence Pipeline extraction depth: archived artifacts, artifacts with active candidates, still-unmined artifacts, extraction coverage percent, and latest synthesis.
- `shared-comms-intelligence-bite` is a manual synthesis-only job for strategy prep and action review. It reads already-mined candidates and records ranked Strategy Hub/action-router input with a long subscription-route timeout. Gmail, Missive, meeting transcript, and Slack extraction now run as separate scheduled daily subscription miners so slow extraction calls do not block current-day archive sync.
- Skool remains blocked until access path and content-use boundaries are explicit.
- Historical Zoom audio recovery is paused unless strategy/content value justifies reopening it.
- Gmail item-level ledger proof selected `259` recent threads per run, produced `0` item failures across repeated bounded runs, and promoted `gmail-sync-current` to scheduled every `120` minutes. The first scheduled worker run succeeded, archived `4` threads, cleared its lease, and set target/job next run around `2026-04-24T20:09Z`.
- Meeting notes current-day proof selected `50` meetings, archived `50` notes and `42` embedded transcripts, recorded `50` succeeded crawl items, left `0` failed crawl items, and added `2` net-new artifacts.
- Meeting target runs now parse item-level crawl failures and mark the target `partial` when the process succeeds but individual crawl items fail; partials now fail the Foundation job so the dashboard/worker gets an alert path instead of a false green state.
- Extraction target snapshots now attach a `scheduler` object derived from the registered Foundation job when `metadata.foundationJobKey` exists. This makes Foundation jobs the schedule truth for scheduled crawl lanes while preserving target `nextRunAt` as crawl checkpoint metadata.
- First read-only Drive corpus bite is live through scheduled daily Foundation job `drive-corpus-inventory-bite`: Zahnd TEAM OG root inspected, `60` direct children recorded, `24` child folders discovered, `36` files discovered, `31` next folders/roots queued, `0` item failures, and no files moved/copied/exported/LLM-processed.
- Foundation now exposes a Drive corpus inventory review snapshot with item totals, folder/file counts, pending extraction counts, candidate value routes, and queue state.
- Raw Drive inventory script writes are guarded: non-dry-run inventory must be run through `extraction:target` so leases and target cursors advance with item writes.
- Shared-comms synthesis was run through the subscription router and recorded `synth-20260424T203755Z-e6b01782ad` with `5` ranked live intelligence items. Top issues surfaced: KPI deal-data display/sync failure, June cash gap, SocialPilot access/publishing instability, Union Street delivery retry, and Loom access migration issue.
- Remaining Phase 3 gap: monitor scheduled current-day/extraction runs, prove partial failure on a real failed item, extend retry semantics to Drive/video lanes, add Missive attachment extraction and richer Gmail attachment file types, prove meeting-linked video review, tune subscription-route miners with per-source timeouts and pacing, prove synthesis as Strategy Hub/action-router input, and build review/export gates before broad backfill. Drive Docs/Sheets/PDF/text/markdown, agenda link inventory, rough scanned-PDF OCR fallback, and Gmail PDF/text attachment filed-output extraction are now live first slices, not unbuilt gaps.

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

- app-level authenticated user and tier attachment — done for v1 through `lib/security-access.js`
- tier-aware read filters for shared intelligence surfaces — done synthetically, with unproven routes left Tier 1-only
- subject-person tagging and sensitivity policy for comms-derived items — done for v1 proof; broader real-data filtering remains future approved work
- subject-person redaction before any non-Steve / non-admin response — done for v1 proof and route posture
- uniform response shape that does not reveal that content was suppressed — done for v1 helpers
- owner-preserving raw meeting/doc access policy from `docs/specs/2026-04-23-auth-tiers-vault.md` — done for fail-closed summary boundary
- `ai@bensoncrew.ca` front-office identity stays invite/delegated-read only; `crewbert@bensoncrew.ca` owns private vault/back-office access
- verifier checks proving lower-tier users and subject people cannot read restricted material
- `SYSTEM-010` decommission/dead-man/cost/process controls for scheduled miners and future agents

Backlog/cards:

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

Goal: create sustainable corpus ingestion instead of one-time archaeology. Steve has repeatedly made this explicit: the target is a high-end multimodal extractor for YouTube videos/channels, Loom, Skool, Drive/meeting videos, Zoom recordings, demos, screenshots, transcripts, and related training/course material. This is not optional research; it is a core Foundation capability. The constraint is governed access, provenance, cost/route ledgering, quotas, and stop controls.

Build:

- Drive worker: one folder at a time
- Skool worker: trainings, videos, links, docs, comments where accessible
- rich multimodal extractor contract for Zoom, Loom, YouTube, Skool, web pages, screenshots, transcripts, slides, and demos
- normalized creator/source watchlist for YouTube, blogs, Skool, X, LinkedIn, newsletters, and websites
- YouTube discovery and Gemini video-intelligence MVP after the retrieval spine is live
- web/video crawler boundary for YouTube, Loom, Vimeo, Wistia, public web, Mycro/myICOR-style paid training apps, and paid/community sources
- video-link inventory lane: system discovers Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool links from archives and authorized crawlers so Steve is not manually collecting URLs
- video-content extraction lane: first YouTube subtitle transcript slice is live through DataForSEO and the shared video manifest, including manual Steve priority URLs such as the Mycro `The AI Team Setup Nobody Talks About` proof; richer visual review, no-subtitle videos, Loom, Drive videos, Zoom recordings, and Skool embeds stay under the multimodal contract
- old-system report miner (broad corpus mining stays here; the pre-atom report-shape salvage gate is `REPORT-MINING-001` in the memory spine)
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
- YouTube/Loom/Skool/video extraction should proceed through small ledged proofs, then daily quota missions; do not wait for another broad approval that the category matters
- transcript-only is not full video understanding; paid trainings, demos, meeting recordings, and screen walkthroughs require the GOD-mode layer: speech/transcript, screenshots/keyframes, visual workflow/tool detection, timestamped evidence, quality scoring, and cost/permission controls
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
- `WEB-GODMODE-001`
- `MYICRO-TRAINING-001`

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
- synthesis hardening producing governed synthesized items
- memory/retrieval/fact/synthesis spine complete enough for routing: `INTEL-JOBS-001`, accepted old-system report-shape salvage, `INTEL-ATOM-001`, `RETRIEVAL-001` lexical retrieval, `RETRIEVAL-002` semantic retrieval, `RETRIEVAL-003` hybrid evidence retrieval, `SYNTHESIS-FACTS-001` source-backed fact grounding, `SYNTHESIS-ENGINE-001` governed synthesized items, and the direct Scoper-to-atom query rule
- Action Router v1 producing governed decision/task/question/ignore/snooze/owner-action route records with source back-links
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

Latest proof remains useful historical/debug evidence: `strategy:evidence-packet` generated source-backed packet material from mined candidates, Drive/video/email/meeting artifacts, strategy docs, backlog/decision/runtime facts, and live goal/operating truth. That work exposed the right operating metrics and proved the danger of letting packet/advisor synthesis outrun the Foundation spine. The active Strategic Execution surface now renders the Strategy Hub v2 source-to-gap command view: live goal truth, operating source cards, retrieval eval status, and Action Router review/promote records. The advisor endpoint still returns `strategy_hub_v2_in_progress`, and old active 90-day priority generation remains disabled. The Foundation spine is closed enough for routed review and apply: `INTEL-JOBS-001`, `REPORT-MINING-001`, `INTEL-ATOM-001`, `RETRIEVAL-001`, `RETRIEVAL-002`, `RETRIEVAL-003`, `SYNTHESIS-FACTS-001`, `SYNTHESIS-ENGINE-001`, and `ACTION-ROUTER-001` are done for v1, with one Strategy route created after the synthesis/router repair and old operational routes hidden from Strategy. `npm run intelligence:retrieval-eval` guards 20 expected hybrid retrieval matches across Gmail, Meetings, and Missive before Strategy Hub depends on evidence recall. Next Strategy Hub hardening should make the current route review meeting-ready, then define Strategic Intelligence and build the gap-resolving Scoper. It must not revive chat/advisor polish.

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

## Active Post-Audit Trust Hit List

Before new feature work resumes, finish the post-audit trust repairs that protect the rebuild process itself.

Current order:

1. `PROCESS-FANOUT-001` repair — done for v1. The false-done card now has the actual fanout check, doc, npm command, closeout proof, and verifier coverage.
2. Wave 2 Chat B: `WORKER-CODE-TRUST-001` — done for v1. The supervised Foundation worker now exposes startup commit and LaunchAgent pid proof.
3. Wave 2 Chat A: `VERIFIER-DONE-COVERAGE-001` + `VERIFIER-ARTIFACT-EXISTS-001` — done for v1. Done cards now need verifier proof or an explicit exception, and claimed artifacts must exist.
4. Wave 3 Card 4: `POST-SHIP-FAN-OUT-001` — done for v1. The post-ship fanout gate checks that closeouts prove surrounding truth moved with the code.
5. Card 6.5: `SHEETS-QUOTA-HARDENING-001` — done for v1. Sheets reads now have short TTL caching, batchGet support, and Runtime Health quota visibility before Wave 5 parallel ramp.
6. Wave 4 Card 5: `DOCTRINE-PROPAGATION-001` — done for v1. The active bcrew-foundation skill now carries the current operating doctrine through a generated section without copying private memory content.
7. Wave 4 Card 6: `DECISION-AUTO-EMIT-001` — done for v1. Explicit commit/checkpoint decision language can now become proposed decisions through a dry-run-first tool.
8. Phase C Track 1: `PHANTOM-CARD-CHECK-001` + `PHASE-NUMBERING-RECONCILE-001` — done for v1. Active card references must point at live backlog cards, and the Foundation UI now shows command order instead of competing phase labels.
9. Phase C Track 2: `SUB-SURFACE-MAPPING-001` + `SYSTEM-INVENTORY-TRUE-UP-001` — done for v1. Foundation maps critical sub-surfaces/API routes and System Inventory reports all nine configured plugin surfaces.
10. Phase C Track 3: `SOURCE-CONTRACT-CLEANUP-001` + `VERIFIER-CONSOLIDATION-001` — done for v1. Active source references resolve to source contracts, historical source aliases are classified, and verifier messaging is cleaner.
11. Phase D Cards 13+14: `DOC-ARCHIVE-AUTO-001` + `RESEARCH-CURATION-001` — done for v1. Historical handoffs/audits/research docs moved to `docs/_archive/` without deletion, and research-lane cards remain preserved for later human curation.
12. Phase D Cards 15+16: `REBUILD-DOCS-RETIRE-001` + `ARCHIVE-RETIRE-001` — done for v1. Stale rebuild docs moved to plan history, and the only delete lane recorded that no safe-delete archive was present, so nothing was deleted.
13. Phase D drift remediation: `EXCEPTION-CURATION-001` + `HIT-LIST-RECONCILE-001` — done for v1. The 24 historical verifier exceptions are classified without extending the 2026-07-27 deadline, and the canonical hit-list snapshot is checked without auto-reading Steve's private Google Doc.
14. Phase D Recent Work UX: `RECENT-BUILDS-MULTI-CLOSEOUT-001` — done for v1. Recent Builds can show multiple closeouts under one collapsed same-commit group.
15. Phase E: `FULL-SYSTEM-RE-AUDIT-001` — done for v1. The 12-area re-audit found 0 blockers, 9 minor-drift areas, and 3 clean areas. Phase F can open with follow-up cards.
16. Wave Cleanup A: `LOCAL-DOC-LINK-001`, `DOC-AUTHORITY-INDEX-REPAIR-001`, and `DOC-OTHER-TRIAGE-001` — done for v1. Private local docs can open only from trusted localhost, stale doc-authority links/statuses are repaired, and the 127-doc `Other` bucket has an inspect-only triage report.
17. Cleanup B: `DOC-CATEGORIZATION-001`, `DOCTRINE-PROPAGATION-002`, and `PROCESS-HOOKS-002` — done for v1. System Inventory now uses the 12 approved doc categories, doctrine propagation watches private memory metadata without copying content, and `process:foundation-ship` gives builders one canonical gate wrapper.
18. Phase G Track 1: `GATE-PERFORMANCE-001` — done for v1. The canonical Foundation ship wrapper now skips the duplicate embedded verifier with an explicit reason, runs independent fanout checks in parallel, prints per-step timing, and keeps strict duplicate-verifier mode available.
19. Hard-checkpoint backlog reconciliation: `FOUNDATION-PLAN-RECONCILE-001` is done for v1. It promoted the hard-checkpoint sprint plan into backlog truth before Phase G Track 2 starts.
20. Phase 1 enforcement: `APPROVAL-FILE-INTEGRITY-001`, `BUILD-LOG-BACKLOG-ID-FIX-001`, `PRE-COMMIT-HOOK-INSTALL-001`, and `CLOSEOUT-BACKFILL-001` are done for v1. Approval files are tamper-evident, Recent Work separates owned backlog IDs from mentioned context IDs, the 13 closeout-proof targets are backfilled or explicitly exceptioned, and repo-managed Git hooks protect Foundation paths while keeping `process:foundation-ship` as the full gate.
21. Foundation control layer: `GATE-RELIABILITY-001`, `PERSONAL-WORKSPACE-BOUNDARY-001`, `DOCTRINE-PROPAGATION-003`, `DECISION-AUTO-EMIT-002`, and `CEO-DASHBOARD-PATTERN-001` are done for v1 under `foundation-control-layer-v1`. Gate reliability uses deterministic injected transient/permanent proof, bounded raw-verifier retry, and a targeted `gate-reliability-retry-pool-reset-v1` patch proving retry after DB cleanup resets the Foundation DB pool before the second attempt; personal workspace proof is metadata-only for real private files with synthetic sentinel leak tests; doctrine propagation carries the missing control rules; decision auto-emit is explicit-source and proposed-only; CEO dashboard pattern is a doctrine/schema contract, not UI polish.
22. Foundation 1100 Review Sprint: `BACKLOG-HYGIENE-PASS-002`, `ACTION-REVIEW-CLEANUP-001`, `RESEARCH-CURATION-002`, and `PHASE-G-READINESS-001` are done for v1 under `foundation-1100-review-v1`. The sprint froze the 289-card baseline before wrapper-card creation, cleaned the 20 Backlog Hygiene warnings to 0 findings, curated the 18 pending Action Review routes without applying business/owner-action routes, dispositioned 102 research/future-build cards without deep research or source expansion, and recorded the Phase G order. No Phase G UI work starts inside this cleanup sprint.
23. Phase G Track 2: `PLAIN-ENGLISH-SWEEP-001` is done for v1 under `plain-english-sweep-v1`. Foundation operator copy was tightened across Backlog/Action Review, Runtime Health, Recent Work/Build Log, Data Sources, System Inventory, and shell/nav/mobile/error/empty states with 60 audited entries and 24/24 manual route/viewport passes. This was copy-only: no IDs, selectors, API shapes, route names, data contract keys, source IDs, card IDs, table names, proof commands, source-contract strings, layout, Recent Work redesign, source expansion, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows changed.
24. Reliability follow-up before UI layout: `GATE-RELIABILITY-002` is done for v1 under `gate-reliability-recurring-transient-v1`. After `PLAIN-ENGLISH-SWEEP-001`, Steve pulled this narrow patch ahead of UI/menu/layout polish because recurring bounded `foundation:verify` retries still needed a root-cause class. Gate retries now classify and print class/subsystem diagnostics for Postgres deadlocks, Foundation DB pool cleanup, network timeouts, and external quota/rate limits while keeping bounded retry behavior and permanent failures fail-closed. The ship wrapper also runs fanout gates sequentially by default to avoid the observed local Postgres deadlock class; `--parallelFanout=true` remains explicit profiling mode. This does not start UI polish or any other Phase G surface work.
25. Phase G Track 2: `UI-MENU-LAYOUT-POLISH-001` is done for v1 under `ui-menu-layout-polish-v1`. Foundation navigation now puts the operator command surfaces first, adds separate System Inventory access for Current Docs and Archive / History, keeps `/api/system-inventory` shape unchanged, hides archive/history docs from the default current-doc view, preserves archive/history evidence at `/foundation#inventory-archive-history`, keeps private/local docs metadata-only, adds desktop/mobile manual route review, and proves the slice through `process:ui-menu-layout-polish-check`.
26. Reliability follow-up after UI layout: `GATE-RELIABILITY-003` is done for v1 under `gate-reliability-direct-verifier-deadlock-v1`. Independent review accepted `UI-MENU-LAYOUT-POLISH-001`, but direct `foundation:verify` still hit a bounded `postgres-deadlock` retry. The root local path was normal review gates calling the write-heavy `initFoundationDb()` schema/seed initializer while dashboard/worker were live. Direct verifier, process ship/fanout gates, post-ship fanout, and backlog hygiene now use read-only DB readiness checks before reading live state. Gate retry diagnostics include safe Postgres metadata only: code, relation OIDs, process IDs, routine, gate label, and retry attempt; no row data, source content, or private content is logged.
27. Phase G Track 2: `RECENT-BUILDS-BILLION-DOLLAR-UI-001` is done for v1 under `recent-builds-billion-dollar-ui-v1`. Recent Work now has an executive summary, visible review-next queue, collapsed-by-default closeout cards, proof/known-limit/where-it-lives sections, separate owning-card and context-card treatments, and same-commit groups that stay grouped while each closeout stays individually reviewable. Ownership semantics remain exact: `backlogIds` own cards only, mentioned/context cards stay context only.
28. Phase G Track 2: `CHANGE-LOG-COMPREHENSIVE-001` is done for v1 under `change-log-comprehensive-v1`. System Activity now has a comprehensive source-backed changelog with recent highlights, by-surface grouping, by-type grouping, raw evidence rows, inspectable evidence refs, and owner/context card separation. The layer uses verified closeouts, DB `change_events`, and changed-file evidence; `/api/foundation/changes` remains backward-compatible and `/api/foundation/change-log` is additive. This did not implement Daily Exec Summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.
29. Phase G Track 2: `DAILY-EXEC-SUMMARY-001` is done for v1 under `daily-exec-summary-v1`. Foundation now has a date-scoped daily executive summary at `/foundation#daily-summary` and `/api/foundation/daily-summary`, with selected date, recent-day selector/list, where we started, what changed, what shipped, what remains, what we learned, what is next, and proof/evidence refs. The layer uses Recent Work, comprehensive changelog, current plan/state, live backlog truth, action/research disposition summaries, and recorded proof only; it does not generate narrative without evidence refs.
30. Phase G Track 2: `SOURCE-LIFECYCLE-EXPANSION-001` is done for v1 under `source-lifecycle-expansion-v1`. Foundation now has an additive source lifecycle control layer at `/foundation#source-lifecycle` and `/api/foundation/source-lifecycle`, covering all 35 source contracts and all 12 governed extraction targets with connected/verified/extracted/reviewed/retry/parked status, visible parked/blocked lanes, unchanged extraction caps, and metadata-only evidence refs. This is visibility/control only: it does not create extraction targets, increase quotas, activate Strategy Hub, Scoper, Agent Factory, broad corpus expansion, research cleanup, Action Review applying, or a new feature lane.
31. Foundation follow-up capture: `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` is done for v1 under `foundation-followup-card-capture-v1`. It created and scoped the three missing follow-up cards with full context, kept `PEOPLE-006` as related/context only, and did not send Gmail, write ClickUp Requested status, implement Systems grouping, start feature work, or open Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup. Next expected build order:
   1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001
   2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001
   3. AGENT-FEEDBACK-SEND-001
32. Foundation Systems service grouping: `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1 under `foundation-systems-service-grouping-v1`. It groups the 12 existing `/api/source-of-truth` `groupedSystems` records by the 14 approved business/service areas on `/foundation#systems`, gives every system one valid primary `serviceArea`, keeps valid `secondaryServiceAreas`, labels partial/planned systems, shows empty groups as `No mapped systems yet.`, and keeps Sales and Recruiting separate with no combined bucket. This did not invent systems, send Gmail, write ClickUp Requested, build Agent Onboarding Feedback, build `AGENT-FEEDBACK-SEND-001`, or start Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or a new feature lane. Next expected card is `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`.
33. Agent Onboarding Feedback system visibility: `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` is done for v1 under `agent-onboarding-feedback-system-v1`. `/api/source-of-truth` now has 13 `groupedSystems`: the existing 12 are preserved and `SYS-AGENT-ONBOARDING-FEEDBACK-001` is added exactly once as a partial `Agent Onboarding` system. The system records ClickUp Agent Roster source truth, Real Start Date + 30/60/90 triggers, Agent Roster / Ops review queue, `/agent-feedback` private-token form, `agent_onboarding_feedback_responses`, Onboarding NPS 30/60/90 Status/Score/Feedback writeback fields, statuses, blockers, proof surfaces, and privacy boundaries. Georgia/Chris proof is metadata-only. `FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001` is scoped as context only, `AGENT-FEEDBACK-SEND-001` remains scoped, and the closeout owns only `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`. This did not send Gmail, write ClickUp Requested, send Georgia a survey, build the production email path, broaden Systems regrouping, or copy private feedback tokens, feedback content, or personal email addresses into tracked proof.
34. Agent Onboarding Feedback send Stage 1: `AGENT-FEEDBACK-SEND-001` is done for Stage 1 under `agent-feedback-send-v1`. The infrastructure now has eligibility checks, dry-run metadata proof, duplicate-send protection, Gmail send path wiring, Requested writeback sequencing, privacy checks, and verifier coverage. `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` later corrects the recipient policy across request, test, auto-send, and reminder paths: Agent Feedback uses ClickUp Company Email only. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. No Gmail send, ClickUp Requested writeback, Georgia survey, or Stage 2 execution happened. `AGENT-FEEDBACK-GEORGIA-SEND-001` is preserved as context only; Steve Zahnd is now the only live full-loop test target.
35. Agent Onboarding Feedback auto-send readiness: `AGENT-FEEDBACK-AUTO-SEND-001` is done for readiness under `agent-feedback-auto-send-v1`. The system now has a daily dry-run/report scanner over the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, with would-send/sent/skipped/blocked/warning/repair counts visible in Runtime Health and Ops. Default behavior is dry-run/report-only. Live sends require both `AGENT_FEEDBACK_AUTO_SEND_ENABLED=true` and an approved mode/allowlist artifact; toggle alone cannot send, allowlist alone cannot send, and production-all requires a separate approval artifact. The Company Email policy makes all auto-send candidates use Company Email; Steve Zahnd is the next full-loop live test target, and production-all remains a separate later card. No Gmail send, ClickUp Requested writeback, broad live auto-send, raw email address, token URL, or feedback-content exposure happened.
36. Agent Onboarding Feedback response notification: `AGENT-FEEDBACK-RESPONSE-NOTIFY-001` is done for v1 under `agent-feedback-response-notify-v1`. After a feedback response saves in `agent_onboarding_feedback_responses` and after the ClickUp Completed/Score/Feedback writeback attempt, the system sends an internal notification to Steve, Carson, Ryan, and Georgia with agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status `clickup_completed_writeback_failed`. Duplicate notification protection is keyed by `agent_onboarding_feedback_response_notifications.response_id`. Synthetic dry-run proof covers success and repair paths with no Gmail send. Tracked proof uses roles/hashes only and does not copy private tokens, raw email addresses, or feedback text. Response notification remains active for the Steve full-loop test and later production-all enablement.
37. Agent Onboarding Feedback reminder cadence: `AGENT-FEEDBACK-REMINDER-CADENCE-001` is done for readiness under `agent-feedback-reminder-cadence-v1`. Reminder readiness now covers day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial Requested send, with cap 6 reminders or 30 days. No reminder runs before a successful initial request. Completed/skipped/blocked status stops reminders, duplicate task/milestone/slot sends are protected by `agent_onboarding_feedback_reminder_attempts`, and Runtime Health/Ops expose pending/sent/skipped/blocked/maxed-out/repair counts plus next-due dates. The Company Email policy makes reminder recipients use Company Email only. No live reminder send, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, Gmail send, raw email address, token URL, or feedback-content exposure happened.
38. Agent Feedback Company Email policy: `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001` is done for v1 under `agent-feedback-company-email-policy-v1`. Request sends, test sends, auto-send readiness, and reminder readiness all use ClickUp Company Email only. Personal Email is not part of Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. Approval validation and allowlists support any named approved target instead of Georgia-only. Proof shows Steve Zahnd Day-30 dry-run eligible by Company Email, Georgia eligible by Company Email if checked but not the live target, and a synthetic external agent eligible by Company Email. No Gmail send, ClickUp Requested writeback, production auto-send, or Georgia test happened.
39. Steve Agent Feedback full-loop test: `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` is not accepted. The prior `agent-feedback-steve-full-loop-test-v1` run sent the Steve Day-30 request and then the script consumed the same emailed token with a controlled synthetic response before Steve could use the real browser link. That proof is now evidence of the failure mode only, not production readiness. No production auto-send may start from it.
40. Real-user submit repair: `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001` is done for the repaired real-user test under `agent-feedback-real-user-submit-repair-v1`. It split send-only/manual-user mode from dry-run-only synthetic-submit mode, superseded the script-consumed Steve Day-30 artifacts without deleting evidence, sent one fresh Steve Day-30 Company Email request, waited for Steve to submit from the actual emailed browser link, and proved DB response, ClickUp Completed/Score/Feedback writeback, internal notification, reminder stop, duplicate-submit clear error, duplicate resend protection, and BCC role proof. It cleared the gate for the separate production enablement card.
41. Foundation verifier health repair: `FOUNDATION-VERIFY-HEALTH-REPAIR-001` is done under `foundation-verify-health-repair-v1`. It repaired or classified the three remaining `foundation:verify` failures after the real-user submit repair: worker startup code trust was real served-code drift and was repaired by restarting the Foundation worker; `DAILY-EXEC-SUMMARY-001` was a stale date-scoped latest-build expectation and now measures latest Recent Work as of the selected summary date; `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001` was stale live source-context wording and now records explicit status vocabulary, live-send Gmail proof wording, and current Chris source-state proof. `foundation:verify` is fully green. It cleared the Foundation gate before the separate production enablement card.
42. Agent Feedback production auto-send: `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001` is done under `agent-feedback-production-autosend-enable-v1`. The production auto-send is live for governed 30/60/90 onboarding feedback initial requests. The daily job scans the ClickUp Agent Roster at 8:30 AM America/Toronto and the live sender fails closed outside the 8:30-10:00 AM America/Toronto send window. It uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, writes ClickUp Requested only after Gmail succeeds, blocks duplicates through `agent_onboarding_feedback_send_attempts`, records non-resend repair state if Gmail succeeds but ClickUp Requested fails, and exposes enabled state, send window, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime/Ops.
43. Agent Feedback live reminders: `AGENT-FEEDBACK-LIVE-REMINDERS-001` is done under `agent-feedback-live-reminders-v1`. Live reminders are enabled for requested-but-not-completed onboarding feedback using the existing day 1, 3, 7, 10, 14, and 17 cadence after the initial Requested send. The reminder job runs at 8:30 AM America/Toronto and fails closed outside the 8:30-10:00 AM America/Toronto send window before Gmail, ClickUp, or reminder ledger side effects. It uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, does not write ClickUp Requested, blocks duplicate reminder slots through `agent_onboarding_feedback_reminder_attempts`, stops after feedback is completed/skipped/blocked, and exposes live mode, next due, last run, next run, and sent/skipped/blocked/warning/repair counts in Runtime/Ops. Georgia Huntley Day-30 and Chris Chopite Day-30 have exactly one protected Requested initial attempt each; as of the proof run no reminder was due and both next reminder states were deferred to 2026-05-03T00:00:00.000Z.
44. System registration sweep: `SYSTEM-REGISTRATION-SWEEP-001` is done under `system-registration-sweep-v1`. `/api/source-of-truth` and Foundation Systems now include `SYS-SALES-GLS-001` as `GLS System / Get Listings Sold`, a live Sales system with routes `/sales#gls-dashboard` and `/sales#gls-system`, source truth ClickUp Deal Data Entry / `SRC-CLICKUP-001`, supporting evidence only from KPI Shopping List / `SRC-SUPABASE-001`, trigger active listings crossing stale threshold, owner lane Sales Leadership, and proof from `SALES-GLS-SCOREBOARD-V1`. `SYS-AGENT-ONBOARDING-FEEDBACK-001` remains visible as live under Agent Onboarding. `process:system-registration-sweep-check` and `foundation:verify` now protect shipped-system discoverability.

Guardrail: Agent Feedback production enablement, live reminders, the system registration sweep, and `SECURITY-002` auth/tier/redaction v1 are complete; stop for Steve review. No unrelated hub work, new GLS features, onboarding expansion, Scoper, Agent Factory, corpus expansion, retry/backoff expansion, source build, broad Foundation cleanup, broad query surfaces, or new feature lane starts by default. Phase 1 enforcement, the Foundation control layer, the Foundation 1100 Review Sprint, `PLAIN-ENGLISH-SWEEP-001`, `GATE-RELIABILITY-002`, `UI-MENU-LAYOUT-POLISH-001`, `GATE-RELIABILITY-003`, `RECENT-BUILDS-BILLION-DOLLAR-UI-001`, `CHANGE-LOG-COMPREHENSIVE-001`, `DAILY-EXEC-SUMMARY-001`, `SOURCE-LIFECYCLE-EXPANSION-001`, `FOUNDATION-FOLLOWUP-CARD-CAPTURE-001`, `FOUNDATION-SYSTEMS-SERVICE-GROUPING-001`, `AGENT-ONBOARDING-FEEDBACK-SYSTEM-001`, `AGENT-FEEDBACK-SEND-001` Stage 1, `AGENT-FEEDBACK-AUTO-SEND-001` readiness, `AGENT-FEEDBACK-RESPONSE-NOTIFY-001`, `AGENT-FEEDBACK-REMINDER-CADENCE-001` readiness, `AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001`, `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`, `FOUNDATION-VERIFY-HEALTH-REPAIR-001`, `AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001`, `AGENT-FEEDBACK-LIVE-REMINDERS-001`, `SYSTEM-REGISTRATION-SWEEP-001`, and `SECURITY-002` are in place; `AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001` remains reopened/not accepted as the old failure evidence, with the real-user repair now accepted. Next work is:

1. Steve review of `SECURITY-002`.
2. Stop until Steve explicitly pulls the next card.

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
