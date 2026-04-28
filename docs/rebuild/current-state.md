# BCrew AI OS Current State

Last updated: 2026-04-28
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
- memory/retrieval/synthesis/action spine through Action Router v1: job ledger, old-system salvage contract, atoms/report artifacts, lexical retrieval, pgvector semantic retrieval, hybrid evidence API, source-backed facts, governed synthesized items with fact/evidence/chunk provenance, and pending approval-gated action routes
- first job registry and job-run ledger
- scheduled Missive and Gmail current-day sync lanes
- policy-aware LLM router with a working OpenClaw/Codex subscription adapter for shared intelligence extraction and synthesis
- extraction control target/item ledger, including Slack current-day channel-level item proof in Runtime Health
- Google Drive corpus root list and Skool access-boundary source notes
- Video link inventory source contract and manual inventory lane for Loom/Drive/YouTube/Vimeo/Wistia/Zoom/Skool URLs
- Owners/deal-review runners
- doc cleanup plan and generated evidence indexes

Open:

- durable item-level cursors, target-run IDs, and retry execution beyond the Slack current-day item proof
- meeting-notes current-day scheduling after retry/report handling is hardened
- real-world partial-run failure proof before scheduling high-variance corpus lanes
- operator UI/verifier hardening beyond Slack item summaries, especially coverage views and Foundation-job/target schedule reconciliation
- Claude Code / Claude Agent SDK subscription adapter under the BCrew router
- hub-dedicated model capacity allocation beyond the first Foundation subscription route
- broader production extractor promotion into atoms beyond the first shared-communications candidate path
- broader production synthesis hardening against resolved/stale/duplicated items after the first governed engine proof
- Action Router apply/closed-loop feedback after pending routes are human-approved
- Foundation hardening after the Apr 27-28 Strategy detour: surface-freshness sweep v1 and operator-readable Recent Builds v2 are done; broader DB-backed build records remain deferred unless the repo-truth closeout layer proves too thin
- router-ledged transcription workload if Zoom audio recovery is reopened
- full tier/redaction replacement for the interim admin gates on broad Foundation/Ops read APIs
- auth/tier middleware and explicit subject-person privacy/redaction before hubs, assistants, or non-admin users read sensitive people evidence
- `SYSTEM-010` decommission, dead-man, and cost/process controls before autonomous loops expand
- KPI health/freshness and deeper Sales Hub semantics after first-pass read rules
- marketing source map by brand lane
- hub value routing for mined Drive/Skool/corpus assets
- Strategy Hub
- Harlan/Crewbert useful runtime
- Strategy Hub v2 rebuild on top of the completed v1 spine and Action Router route records

## Foundation Surfaces

Automation truth:

- Scheduled current-day lanes: Gmail every 2 hours, Missive every 2 hours, meeting notes/transcripts daily, Slack daily, plus Admin/Conditional/Agent Roster Ops routines.
- Scheduled daily history/extraction missions: Gmail candidate extraction, Missive candidate extraction, meeting transcript extraction, Slack candidate extraction, Drive corpus inventory, and Drive Docs/Sheets/PDF/text/markdown content extraction.
- Meeting system visibility: `SRC-MEETINGS-001` is a distinct Foundation system, not just a buried shared-comms detail. Meeting notes/transcripts are owner-usable for Steve strategy work now because capture, archive, privacy-profile tagging, transcript extraction, and shared synthesis proof exist. Broad agent/team query access still waits for subject-person redaction and filtered response rules.
- Built for first text slice: Drive Google Docs, Google Sheets, PDFs, scanned PDFs with rough OCR fallback, plain-text, and markdown files can now be extracted from inventory into source-backed artifacts. Google Doc link inventory can follow Drive/Docs links from a strategy agenda, grant `ai@bensoncrew.ca` access where Steve can share, and send an access-request email where sharing is blocked and an owner email is visible. Gmail PDF/text attachment extraction is also live as a scheduled daily bite with unsupported files explicitly skipped. YouTube subtitle transcript extraction is live as the first video-content slice from the shared video-link manifest, including manual Steve priority URLs. Still not built: Missive attachment extraction, rich meeting-linked video/recording vision review, Drive Slides/Office conversion, shortcuts, vision-grade handwriting/screenshots, Loom/Skool/Zoom video extraction, and GOD-mode video/audio/visual extraction.
- Blocked/paused until access or value is approved: Skool crawling, broader Loom/video extraction, and Zoom audio recovery.

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Open hardening | v6 rebuild plan is live, prior plan is preserved in plan history, and handoff/audit indexes now separate evidence from active doctrine. | Finish doc cleanup Phase 1/2: classify indexes and promote any durable truth into active docs/backlog. | Optional dated archive folders after indexes are trusted. |
| Runtime activation | Open hardening | First Foundation job registry and DB-backed job run ledger exist. Jobs can be run through the Foundation runner. Runtime metadata now marks scheduled vs manual jobs, computes due/next-run state, exposes scheduled/due/manual counts, and `npm run foundation:worker` can run due jobs one at a time. The first worker proof ran both deal-review jobs and cleared due state. `ai.bcrew.foundation-worker` and `ai.bcrew.dashboard` are loaded as LaunchAgents, so the worker and web process survive terminal exit. The dashboard now captures its server-start commit, Runtime Health shows that commit, and `foundation:verify` fails with the restart command if the served dashboard commit does not match repo HEAD. Active-run locking now prevents duplicate queued/running runs for the same job, job timeout cleanup kills the process group with `SIGTERM` then `SIGKILL`, DB-backed pause/resume works through `/api/foundation/jobs/:jobKey/control`, and Runtime Health now exposes pause/resume buttons on job cards. Gmail/Missive current-day, meeting current-day, Slack current-day, shared-comms coverage, verifier, Ops review jobs, daily shared-comms extraction missions, and Drive inventory mission are scheduled. | Monitor scheduled current-day/extraction lanes, add auto-restart-on-push, finish `SYSTEM-010` decommission/dead-man/cost/process controls, then raise daily quotas only after runs stay stable. | Expand to more routines after the first jobs stay stable and stop/decommission paths are proven. |
| LLM routing | Open hardening | Phase 2 now has executable routing, not just a shell. `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls` are live. `llm-auth-audit` proves the local OpenClaw/Codex subscription gateway through `openai-codex/gpt-5.4`; `openai-codex/gpt-5.5` is currently an interactive/coding model target and is not known to the local OpenClaw gateway. `lib/llm-router.js` now executes that subscription adapter, logs calls, keeps direct OpenAI Responses API as a guarded fallback only, and lets the local operator explicitly allow bounded subscription extraction with `LLM_OPENCLAW_ALLOW_EXTRACTION=true` and bounded internal synthesis with `LLM_OPENCLAW_ALLOW_SYNTHESIS=true`. Shared candidate extraction, shared-comms synthesis, and Strategy Evidence Packet generation are migrated to the router. Live proof: one strategy packet run, one shared-comms synthesis run, one Gmail extraction run, and a bounded JSON extraction probe recorded `openclaw` / `chatgpt_subscription_gateway` / `estimatedCostUsd=0`. Audit stop-gap: Zoom audio transcription is paused/fail-closed for non-dry-run use, and verifier coverage now blocks direct OpenAI/Anthropic/Gemini host calls outside approved adapters. | Rebuild transcription as a router-ledged workload before reopening Zoom audio recovery, build the Claude Code / Claude Agent SDK subscription adapter, assign hub-dedicated capacity lanes, and run long subscription extraction only through paced worker jobs with timeout/reaper coverage. Keep Strategy Evidence Packet synthesis monitored until Action Router and review/approval workflows are live. | Broader workload migration, overflow policy, and productized/tenant credential handling. |
| Extraction control | Open hardening | Phase 3 control-plane substrate exists: `source_crawl_targets`, `source_crawl_items`, and `shared_communication_artifact_processing_runs`. Current-day Gmail and Missive are scheduled every `120` minutes; meeting notes and Slack current-day lanes are scheduled daily. Scheduled crawl targets now use Foundation job runtime as the visible next-run truth; target-level `next_run_at` is preserved as `crawlCheckpointNextRunAt` runner metadata instead of a competing operator schedule. Gmail/Missive/meeting/Slack candidate extraction now targets artifacts without a successful processing run for the current content hash and runs as daily quota missions with actual model/provider/auth-path/route provenance. Artifacts that correctly produce zero candidates are not reprocessed forever for the same extractor version and same content hash, while changed threads/transcripts become eligible again. Bounded extraction and synthesis now run through the router subscription adapter, not direct OpenAI Responses API. Drive corpus inventory is scheduled as a daily mission through `drive-corpus-inventory-bite`, and Drive content extraction is scheduled through `drive-content-extract-bite` as a five-file daily quota mission. Google Docs and Sheets are exported/read as text through Google APIs; PDFs, scanned PDFs with rough OCR fallback, PDF form fields, plain-text, and markdown blobs are downloaded and parsed; unsupported files receive explicit skip reasons. Latest Drive Sheets proof run `crawl-drive-content-extract-backfill-20260428181558392-93bfbd63` archived 5 `drive_spreadsheet` artifacts / 308,697 chars with 0 crawl failures after the coverage panel identified `sheet_text_extraction_not_in_v1` as the largest actionable skipped reason. Earlier Drive proof archived `40` Docs/PDF/text artifacts / `713,744` chars, including the strategy folder, Q2 pre-strat PDFs with fillable form-field extraction, Scott's handwritten scan plus manual visual review, Steve's Q2 draft markdown, John Q1 agenda plus accessible linked docs, and John `KT Binder MAR 2026.pdf`. Gmail attachment extraction is now scheduled through `email-attachment-extract-bite`: v1 extracts Gmail PDF/text attachments, stores `gmail_attachment` artifacts, and marks unsupported images/media/Office/OCR classes with explicit skip reasons. Live proof archived `6` Gmail attachment artifacts / `21,494` chars and skipped `4` image attachments with `0` item failures; the restarted worker picked up the new job and succeeded. Video content extraction is now scheduled through `video-content-extract-bite`: v1 reads the shared video-link manifest, extracts YouTube subtitle transcripts through DataForSEO, stores `video_transcript` artifacts, and skips no-subtitle videos into the future vision/transcription lane. Live proof plus worker/manual-priority follow-up archived `13` YouTube transcript artifacts / `261,853` chars, including Steve's Mycro test video `The AI Team Setup Nobody Talks About`; `6` unsupported/no-subtitle/channel crawl items are explicitly skipped or routed onward, and latest controlled runs had `0` item failures. Raw Drive, attachment, and video-content writes are guarded so non-dry-run work must run through controlled extraction paths. `video-link-inventory-bite` now also runs through `extraction:target`; the latest controlled proof scanned `1060` archive/Drive inventory records, found `179` media-link occurrences, and recorded the target run as succeeded with `0` crawl failures. Missive attachment extraction and rich meeting-linked video/recording vision review are not built yet. Drive Slides/Office/shortcuts/vision-grade OCR/media remain explicit follow-on lanes. Transcript-only video extraction is not GOD-mode video understanding; screenshots/keyframes, screen-demo understanding, visual tool/workflow detection, and richer audio/visual analysis remain under `MULTIMODAL-EXTRACTOR-001`. Corpus work is framed as daily quota missions: process a small count, file outputs with provenance, update the ledger, and stop. Skool is blocked pending access/content-use boundaries. Zoom recovery is paused. | Monitor scheduled current-day/extraction runs, prove partial failure on a real failed item, add Missive attachment extraction, add Drive Slides/shortcut resolution/vision-grade OCR lanes, add Loom/Drive/Zoom/Skool/GOD-mode video extractors under `MULTIMODAL-EXTRACTOR-001`, prove Strategy Hub/action-router synthesis, and build review/export gates before broad backfill. | Drive/Skool/Loom/YouTube/source workers run one bounded mission at a time. |
| Strategy packet | Source-to-gap v1 active; Strategic Intelligence pinned but paused | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. `FOUNDATION-001` and `SOURCE-014` are closed for this phase. Strategy Evidence Packet and Strategy Advisor v1 proved useful source material and live goal/operating truth, but they also proved the risk of running strategy synthesis before the memory/retrieval/action spine. The active Strategic Execution surface now renders Strategy Hub v2 source-to-gap command view: live Goal Truth, live Operating Truth, retrieval eval status, and Action Router route review/promote controls. The advisor endpoint returns `strategy_hub_v2_in_progress`, old active 90-day priority generation is disabled, and verifier coverage blocks the old recommendation surface from returning. The memory spine now has `INTEL-JOBS-001`, accepted `REPORT-MINING-001`, `INTEL-ATOM-001` v1 report/atom/hit proof, `RETRIEVAL-001` candidate-backed lexical chunks/search, `RETRIEVAL-002` pgvector semantic retrieval, `RETRIEVAL-003` hybrid evidence retrieval with explicit `maxTier`, `SYNTHESIS-FACTS-001` persisted source-backed fact grounding, `SYNTHESIS-ENGINE-001` governed synthesized items with fact/evidence/chunk provenance, and `ACTION-ROUTER-001` human-approval-required routes into decisions/backlog/open questions/ignore-snooze/owner actions. One closure route has already been approved/applied into live backlog item `ACTION-001`, and the first Strategy route exists after the synthesis/router repair. Commit `784fbf2` made the Strategy route proof readable and wired action controls, but Steve did not accept the UI as meeting-ready. The Strategic Intelligence direction is pinned, but paused behind Foundation visibility/freshness work. | Do not continue Strategy UI polish or Scoper code next. Current next work is Foundation: `FOUNDATION-CHANGELOG-002`, while keeping the completed `FOUNDATION-SWEEP-001` map current. | Later hardening: Strategy meeting-ready redesign, Strategic Intelligence issue ledger, full thread-context proof (`INTEL-THREAD-CONTEXT-001`), gap-resolving Scoper, Strategy Quarter context, model-routing doctrine, Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, privacy/tier filtering, closed-loop resolution feedback, and full Strategy Hub operating workflow. |
| Verification baseline | Done now | `npm run foundation:verify` exists and has been passing. | Keep green after runtime/doc changes. | Add checks only when new source surfaces close. |
| Owners Admin package | Done for v1 | `SRC-OWNERS-001` is signed off for meaning and now visibly carries the signed-off Owners workbook tabs: Admin, Split Cal, Agent Splits, Listings and Conditional Deals, Sales & Deposit, Goal & KPI Calculator, and CI Report. The Owners Dashboard `Lists` tab is verified as an `IMPORTRANGE` mirror but is not counted as the source-owned sign-off because governed writes belong to `SRC-OWNERS-LISTS-001` in the BHAG Builder / Old BIS KPI Lists Source workbook. `SRC-OWNERS-LISTS-001` is signed off for current-reality meaning after the imported `Lists` mirror repair: it owns the governed list/dropdown write target, Admin `N/P/S` validations are repointed, and delegated writes are guarded from the mirror range. First cross-system proof exists: Owners row -> FUB person -> ClickUp roster -> Drive contract package. FUB joins through Column `BZ`, v1 lead-source lineage rules are locked, and Admin review now checks split math, governed source rules, company/agent expectation, FUB source/stage/ISA evidence, pre-2026-04-01 Freedom follow-through, and post-2026-04-01 ClickUp Deal Data Entry follow-through by Trade Number. Scheduled Admin review runners process marked Admin re-reviews first, then pace first-pass backlog at five newest eligible June 2025+ deals per day, newest to older, writing only AI review status/action/findings. The Conditional tab is now a ClickUp-generated forecast/missing-data view with a preserved `Review This Conditional` action for fixed-row re-checks, not a separate legacy Google Sheet review lane. `/api/owners/review-queue` exposes the inspection queue, and `/ops` gives Ops its own hub surface for the queue and the running systems serving it. Missing FUB links, invalid lead sources, and duplicate-credit edge cases are now Ops cleanup findings surfaced by the inspection system, not blockers to the Foundation source package. Source-field corrections remain human-owned until an explicit apply/fix lane is approved. | No Foundation source-package closeout remains. Work Ops findings as they appear. | Reuse freshness and review patterns on more governed sources, then add assignment and approval-gated source-field writeback only after Ops approves that workflow. |
| FUB lead-source taxonomy | Done for v1 | `SRC-FUB-001` review and drift layers are live, source drift is clear, and the v1 source-lineage/company-agent rules are locked through the governed source rule table. The first drift/enforcement guardrails are closed through `DATA-018` and `DATA-019`. The Lee `FUBZahnd` middleware repo is now captured as implementation evidence for opportunity re-entry and `LeadDate` / `LeadClaimedDate` semantics. | Work invalid-source or missing-link findings from the Ops queue. Keep `SOURCE-021` as the deeper Sales Hub/FUB opportunity-semantics proof, not a blocker to v1 taxonomy closeout. | Add broader issue routing, live stage-table proof, and future Sales Hub support. |
| Finance sign-off | Done for current reality | `SRC-FINANCE-001` is signed off for current-reality meaning. Weekly Actuals is the operating finance ledger, Cashflow Dash is the management interpretation after partner-commission normalization, the roll-up/budget tabs and `Unspent -L3M + Actual Helper` are included in signed-off current-reality coverage, and QuickBooks is optional compliance verification, not a current rebuild dependency. | Keep finance freshness and later payment reconciliation as future hardening, not source-signoff blockers. | Define Level 3 freshness expectations when finance automation starts reading it continuously. |
| KPI foundation system | Done for v1 health | `SRC-SUPABASE-001` is verified readable, the Lee / `zahnd-team-dashboard` repo and Supabase audit checkpoint are captured, and AI OS now has locked first-pass read rules for pipeline, shopping list, executed deals, goals, competition, and usage. `KPI-HEALTH-001` adds a read-only KPI / Supabase health probe covering 14 load-bearing tables, 5 RPCs, per-source freshness windows, live Supabase column/output drift, and Lee repo table/RPC references. | Use Foundation > Data Sources > APIs / Apps > KPI / Supabase Health as the primary surface; Runtime Health only warns when unhealthy. | Future Sales Hub surfaces, coaching workflows, and KPI write/apply behavior remain separate work. |
| Meeting notes / transcript intelligence | Open hardening | Level 5 owner-usable system. `SRC-MEETINGS-001` is readable through delegated Google Workspace; meeting notes and standalone/embedded transcripts are archived into PostgreSQL as shared communication artifacts with content hashes, transcript source, meeting class, privacy profile, and provenance. Scheduled daily current sync and daily transcript-extraction quota missions are live. Candidate extraction uses Foundation context and asks for `subject_people`, `sensitivity`, and `min_tier` metadata before synthesis. Latest live checkpoint showed 866 meeting notes and 649 transcripts archived, with the 2026-04-26 current sync and transcript extraction runs succeeding. | Monitor scheduled meeting current-sync and transcript-extraction runs, tune backlog quotas, and use Runtime Health for live counts/status. Keep this owner-only for strategy work until subject-person redaction/query filtering is implemented. | Rich meeting video/recording vision, Zoom/Drive video transcription, filtered summary access requests, subject-person redaction, and Action Router handoff. |
| Shared freshness rules | Done for Owners/FUB first layer | The maturity model defines Level 3, and first Owners/FUB freshness guardrails are live through `DATA-020`. | No active freshness-rule closeout remains for the current Owners/FUB layer. | Reuse this pattern for finance, KPI, connectors, Drive/video corpus, and future source surfaces when those readers become continuous. |
| Shared communications intelligence | Open now | Gmail, Calendar, Missive, Slack, meetings, recovered Zoom chats/audio, archive, extraction, and persisted synthesis are live enough for proof. Exact archive counts belong to coverage job/dashboard, not this static file. Extraction doctrine now requires useful material to route to strategy, ops, sales, marketing, recruiting, agent coaching, and Steve-owned content/course lanes instead of only becoming raw archive. Runtime Health now has an Intelligence Pipeline panel that shows archived artifacts, processed artifacts, artifacts with active candidates, pending extraction backlog, extraction coverage percent, and latest synthesis so runtime progress is visible. Runtime Health also shows extraction target item summaries and health findings, including the 2026-04-28 Slack current-day proof: 61 channel crawl items, 51 succeeded, 10 explicitly skipped for no archivable messages, and the stale Apr 27 reaped run still visible as historical proof. `shared-comms-intelligence-bite` remains the older synthesis fast path, while the intelligence spine now persists governed synthesized items from source-backed facts plus hybrid evidence. Gmail, Missive, meeting transcript, and Slack extraction are scheduled as separate daily subscription-route quota missions with per-source timeout knobs. Latest strategy-prep proof recorded `strategy-packet-20260426T220426Z-0a7a650a6c` through `openclaw/chatgpt_subscription_gateway`: 220 candidates, 58 direct artifacts, 8 strategy docs, 17 synthesized packet items. Full Slack candidate extraction may need long subscription runtime, so the daily quota starts at one thread until latency is measured. Broad Foundation/Ops read APIs now have interim admin gating outside localhost; `SECURITY-002` still needs the real auth/tier and subject-person redaction layer before broader hub/query/assistant access. | Monitor daily extraction runs, tune quotas, close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `EXTRACTION-TEAM-001`, `HUB-INTEL-001`, `SECURITY-002`, and `ACTION-ROUTER-001` through runtime/extraction/privacy/action-routing hardening. | Broader apply flows, subject-person privacy/query layer, and Strategy Hub. |
| Marketing source map | Open now | Old-system evidence and some current connector checks exist. The four live lanes are Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016`: account/property map, Google auth repair, SocialPilot validation, GHL/lead-flow map, current-vs-legacy asset boundaries. | Marketing Hub and platform intelligence. |
| Drive / Skool / old corpus | Open now | Need is identified; first controlled surfaces now exist. Nine Google Drive shared-drive/priority roots are captured in `docs/source-notes/google-drive-corpus.md`, with Steve's strategy folder prioritized for strategy readiness. Drive Docs/Sheets/PDF/plain-text/markdown extraction is live and proved against the strategy folder and linked sheets: John `KT Binder MAR 2026.pdf`, John Q1 agenda and accessible linked docs, the team pre-strat template, Q2 pre-strat PDFs, Scott's handwritten scan through rough OCR plus a manual visual-review note, Steve's Q2 draft, Carson/Steve notes, the 2026 Q1 vision/core-values doc, and 5 Google Sheet artifacts including Freedom Sheet / Owners Dashboard linked files are archived as source-backed text artifacts. Remaining Drive gaps are Slides, Office files, shortcuts, high-confidence handwriting/screenshot OCR, audio, and video. John-linked access gaps are recorded; Steve manually requested the remaining access. Browser-based native request-access is not automated yet because the available local browser profile was logged in as Steve, not `ai@`. Skool access research is captured in `docs/source-notes/skool-corpus.md`; Skool remains blocked for blind crawling because access and content-use boundaries are not approved. Video/Loom research is captured in `docs/source-notes/video-link-inventory.md`; Apify credentials are available locally but unvalidated, and Loom has no first-party open extraction API. Mycro/myICOR paid-training direction is captured in `docs/source-notes/myicro-training.md`: AIOS needs a governed browser/video worker that can log into authorized training apps, navigate courses/lessons, read text, watch videos, capture screenshots/folder structures, verify the acting browser identity, and extract project-management / AI-team operating doctrine for internal improvement. Steve has explicitly approved the broader direction: AIOS needs a high-end multimodal extractor for YouTube videos/channels, Loom, Skool, Drive/meeting videos, Zoom recordings, demos, screenshots, transcripts, and related training/course material. The goal is not only storage cleanup: old Drive, Skool, Loom, Zoom, videos, trainings, docs, presentations, apps, and links should be mined for reusable content, courses, training, recruiting proof, strategy evidence, and operational improvement while preserving source links and owner-entity boundaries. | Keep daily Drive inventory/content bites running, add Drive Slides/Office/shortcut/vision-OCR lanes, run video-link inventory bites, build the `MULTIMODAL-EXTRACTOR-001` and `WEB-GODMODE-001` contracts, validate small authorized YouTube/Loom/Skool/Mycro/video proofs with route/cost ledgering and browser-session preflight, then promote proven workers to daily quota missions. | Bounded corpus ingestion cadence, dry-run organization, and hub handoff queues. |

## Active Execution Order

Use this priority model:

1. Foundation Overview gives the command order for what to work on next.
2. The live Backlog owns task status, priority, lane, owner, and next action.
3. The Rebuild Plan explains doctrine, phase gates, and the definition of done.

If these disagree, fix the live Backlog and active docs together instead of letting two work queues compete.

Hard checkpoint call from 2026-04-28:

- `SYSTEM-STRATEGY-REVIEW-001` is done for v1; the Apr 26-28 lessons were promoted into active docs/backlog.
- `STRATEGY-HUB-MEETING-READY-001` is not accepted as meeting-ready; it is scoped for later redesign.
- Strategy Hub route-review proof plumbing advanced, but Steve did not accept the UI as meeting-ready.
- `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `STRATEGY-QUARTER-001`, and `MODEL-ROUTING-001` remain pinned, but they are not tomorrow's first build.
- `FOUNDATION-SWEEP-001` is done for v1: all Foundation nav pages are mapped to backing APIs/docs/tables/source IDs/backlog owners, Runtime Health surfaces stale source-crawl runs, and `foundation:verify` guards the sweep.
- `FOUNDATION-CHANGELOG-002` is done for v1: Recent Builds groups work by day/system area and shows closeout records with backlog cards, proof commands, review-next notes, and known limits.
- `EXTRACT-METRICS-001` is done for v1, linked to `EXTRACT-CONTROL-001`. Lane-shape inspection is saved in `docs/audits/2026-04-28-extraction-lane-item-shape.md`; Missive current-day was the smallest missing item-ledger lane and now emits `missive_conversation` crawl items; Runtime Health now shows Extraction Control: Coverage By Target with last success, last failure, next bite, item totals, top failed/skipped reasons, and available remaining-backlog indicators.
- `EXTRACT-CONTROL-001 v1 is closed`: the control plane now has target/item ledgers, schedule truth, stale-run visibility, item summaries/findings, Slack/Missive item proof, and coverage-by-target. Failed-item retry/backoff remains a child card under `EXTRACT-RETRY-001`; app-surface breadcrumbs and updated markers are parked under `FOUNDATION-SURFACE-UPDATES-001`.
- `KPI-HEALTH-001` is done for v1: `npm run kpi:health` checks the load-bearing KPI tables/RPCs, freshness windows, expected Supabase schema/output fields, and Lee `zahnd-team-dashboard` references; `/api/source-of-truth` and `/api/foundation-hub` expose `kpiHealth`; Data Sources renders the KPI / Supabase Health panel; Runtime Health only surfaces KPI when unhealthy.
- Steve's operator UX standard is now active: plain English first, technical terms translated inline, Overview as the CEO dashboard for system-building, and top nav target of Overview -> Systems -> Backlog -> Recent Work. `FOUNDATION-SURFACE-UPDATES-001` owns the UI work.
- Served-code trust is now active: Runtime Health shows the dashboard server-start commit, and `foundation:verify` compares it to repo HEAD before reviewers trust a closeout pass.
- `BACKLOG-HYGIENE-PASS-001` is done for v1: stale/unclear executing cards were cleaned up, proof was split from remaining work where needed, and structural follow-up cards were created.
- `BACKLOG-HYGIENE-001` is done for v1: `npm run backlog:hygiene`, `/api/foundation-hub > backlogHygiene`, Runtime Health > Backlog Hygiene, synthetic stale-card proof, 3-day stale executing threshold, and verifier coverage are live.
- `DEV-PROCESS-AUDIT-001` is done for v1: `docs/audits/2026-04-28-dev-process-audit.md` maps stale lanes, pre-score shipping, manual backlog updates, stale served code, weak where-it-lives metadata, restart-dependent verifier claims, plan/backlog phase confusion, and transient verifier failures to exact owners.
- `PROCESS-HOOKS-001` is done for v1: `npm run process:ship-check` requires backlog card evidence, an approval file with score >= 9.8, a seven-field closeout, where-it-lives metadata, served-code proof, and default `foundation:verify` unless a skip reason is explicit.
- `ACTION-REVIEW-APPLY-001` is the next product build slice.
- `RESEARCH-INBOX-001` is parked as the pre-backlog research inbox for YouTube, Mycro/myICOR, courses, articles, and good AI-system ideas. It is not next.
- `RUNTIME-HEALTH-SIMPLIFY-001` is parked so Runtime Health can later get a plain-English top layer without weakening the diagnostic detail.

Current command order:

1. Keep the `FOUNDATION-SWEEP-001` map and `FOUNDATION-CHANGELOG-002` closeout records current when Foundation nav, APIs, docs, source contracts, jobs, System Inventory, hub links, or major build cards change.
2. Close the action loop through `ACTION-REVIEW-APPLY-001`.
3. Stop and re-plan with Steve before auto-picking another Foundation slice. The decision is whether Foundation is good enough to un-pause Scoper, dev intelligence, and agent-managed backlog work.

## Operator Surface Pattern

Every hub overview should eventually follow the same CEO-dashboard pattern:

- what the system can do
- system and code health grade
- recent improvements
- what needs attention right now

For Foundation, this means Overview should become the high-level command dashboard, Systems should explain what the system is, Backlog should show queued/done work, and Recent Builds / Recent Work should show what shipped and where it lives.

## Foundation Operations Surfaces

These pages are operator surfaces, not strategy pages.

| Page | Why it exists | Current truth |
| --- | --- | --- |
| Backlog | Root Foundation build queue. | Live and primary for task status, priority, lane, owner, and next action. Needs done-date and newest-done sorting under `FOUNDATION-SURFACE-UPDATES-001`. |
| Decisions | Canonical governance ledger. | Working as a manual first slice; not yet automatic meeting/chat decision capture. `DECISION-007` owns old-decision reconciliation and `ACTION-ROUTER-001` owns future routing from synthesis. |
| Open Questions | Exception queue for real unresolved blockers. | Technically working, but the old stale carry-forward questions were resolved or routed into backlog/source docs on 2026-04-26. New questions should be rare, owner-bound, and cleared quickly. |
| Recent Work | Operator changelog. | Currently Recent Builds v2. It should move near the top nav, default collapsed, and link each change to the app/doc/system surface where it lives under `FOUNDATION-SURFACE-UPDATES-001`. |
| System Activity | Short audit feed. | Live latest-event view from `change_events`; `SYSTEM-007` owns the future searchable explorer. |
| Runtime Health | Operator diagnostic surface. | Live job/LLM/extraction/source-crawl view; `SYSTEM-008` owns deeper alert/degradation semantics and `RUNTIME-HEALTH-SIMPLIFY-001` owns later readability simplification. |

## Data Sources And System Inventory Surfaces

These pages are visibility surfaces. They do not replace the live Backlog, Foundation Systems map, or Runtime Health.

| Page | Why it exists | Current truth |
| --- | --- | --- |
| Data Sources Overview | Front door to the source layer. | Live from `/api/source-of-truth`: grouped systems, source contracts, validation units, connector paths, and source-trust states. |
| Docs | Doc-backed source contracts only. | Useful for seeing written packets and file-backed truth units. It is not the same thing as All Docs storage inventory. |
| Spreadsheets | Workbook/tab/range source contracts. | Useful for sheet-by-sheet trust. Connector access is separated from which sheet units are actually signed off. |
| APIs / Apps | External app, API, database, and Workspace source contracts. | Useful for FUB, KPI, ClickUp, Gmail, Missive, Slack, meetings, Drive, video, and marketing source boundaries. API reach does not equal trust. The KPI / Supabase Health panel lives here as the primary KPI freshness/schema surface. |
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
