# Killer Intelligence System Build Plan

**Date:** 2026-04-24
**Status:** Build-first correction after deep audit.
**Scope:** BCrew AI OS as a system that continuously learns from internal operations and external market intelligence, then recommends what to build, change, automate, sell, and stop doing.

## Executive Correction

The next move is not "prove the Sunday packet."

The current synthesis output is useful, but Steve's goal is a killer operating intelligence system. The correct priority is to build the machine that can answer:

- What should we build next?
- What is breaking in the business?
- Which automation, process, offer, content engine, or agent workflow has the highest leverage?
- What are outside experts teaching right now that should change our roadmap?
- Which internal facts prove or disprove those recommendations?

The system has a real foundation: PostgreSQL archive, source contracts, candidate governance, apply-to-backlog/decision/question flows, and a first synthesis engine. But it is not yet the "nuke power" system because it is missing the retrieval spine, job ledger, persistent intelligence state, entity graph, and external intelligence ingestion.

## Critical Architecture Update: Extraction Team, Not Backfill Marathon

Steve's builder chat exposed the most important product correction:

Do not keep spending human/build time trying to "finish the backfill." Build an extraction team that can stay current every day and take controlled historical bites forever.

The system needs two separate lanes:

- Current lane: process what happened today or since the last run across Gmail, Missive, Drive, meetings, Slack, Skool, YouTube, and other governed sources.
- Backfill lane: take one bounded bite from one source at a time, record what was inspected, extract what matters, and move the cursor forward.

This changes the plan. The first product is not a bigger script. The first product is a source extraction control plane.

The backfill rule:

- Never run a giant uncontrolled historical sweep as the default.
- Every source gets a cursor, budget, lease lock, status, retry policy, and audit record.
- Every worker must be resumable.
- Current-day sync always has priority over historical backfill.
- Backfill should be boring, daily, and bounded: one folder, one date window, one source cursor, or one community section at a time.

Why this matters for resale:

- A customer cannot wait while an AI agent watches six months of old video and crawls ten shared drives manually.
- The sellable product is a backfill and crawl system that starts useful today, then improves every day.
- "Stay current plus keep eating history" is the product pattern.

Drive and Skool must be treated as first-class sources:

- Google Drive is not just files. It is folders, docs, sheets, PDFs, recordings, exports, links, ownership, stale duplicates, and messy shared-drive structure.
- Skool is not just posts. It is videos, comments, links, documents, course modules, creator frameworks, and paid/private source material with access restrictions.
- Both need source contracts before broad ingestion.
- Both need crawl state before deep extraction.
- Both need content handling rules before anything is moved, copied, summarized, or exposed.

The correct near-term build is an "Extraction Team OS":

- Source queue.
- Source workers.
- Crawl ledger.
- Current sync lane.
- Historical bite lane.
- Review queue for uncertain classification.
- Safe organizer mode for Drive.
- Source-specific extractors.
- Shared output format into artifacts, chunks, candidates, and intelligence items.

## Critical Architecture Update 2: Activation Layer, Not Manual Scripts

Another major gap: the repo has useful systems that only run when a human or terminal agent manually triggers them.

Examples already present in `package.json`:

- `deal-review:admin`
- `deal-review:conditional`
- `gmail:sync-archive`
- `missive:sync-archive`
- `slack:sync-archive`
- `meeting-notes:sync`
- `meeting-notes:extract-candidates`
- `zoom:transcribe-audio`
- `zoom:extract-audio-candidates`
- `synthesis:brief`
- `foundation:verify`

That is not a living system. That is a toolbox.

The Foundation must enforce an activation rule:

- If a system is built but not registered, scheduled, supervised, and visible, it is not done.
- A package script is only a manual tool.
- A runtime-activated system has a schedule, queue, worker, health record, last run, next run, failure threshold, owner, pause switch, and cost/budget limit.

The right architecture is three layers:

1. Process supervisor: keeps the web app and worker process alive after terminal sessions end or the Mac restarts.
2. Job queue and scheduler: creates durable jobs, handles retries, prevents duplicate/concurrent runs, and records failures.
3. Foundation activation registry: shows every built system's runtime status in the Foundation UI.

Terminal windows are for debugging and one-off operations only. They are not the runtime.

### Runtime recommendation

Use a Postgres-backed job queue because the system already uses PostgreSQL as its operating memory.

Recommended first choice: `pg-boss`.

Why:

- Node/Postgres native.
- No Redis or separate queue server.
- Uses Postgres locking patterns for safe concurrent workers.
- Supports cron scheduling, retries, priority queues, dead letter queues, and queue policies.
- Has a dashboard package for monitoring.
- Current local Node is `v25.9.0`, which clears the current pg-boss Node requirement.

Strong alternate: Graphile Worker.

Why:

- Also Postgres-backed.
- Strong recurring crontab support.
- Official docs emphasize ACID-backed no-duplicate scheduling, optional missed-job backfill, and multiple worker support.

Decision:

- Pick one Postgres queue now. Do not build a custom scheduler first unless dependency risk blocks install.
- Prefer `pg-boss` for the first implementation because its JS API and dashboard fit the current Node repo and operator need.
- Keep source-specific leases/cursors in Foundation tables even if pg-boss owns queue execution. The queue runs jobs; Foundation records source state and operating truth.

### Process supervisor recommendation

On the Mac Mini, use macOS `launchd` or PM2 to keep processes alive.

Recommended shape:

- `npm run start` for the web/API server.
- `npm run foundation:worker` for the background worker.
- `launchd` starts both at login/boot and restarts the worker if it exits.
- PM2 is acceptable if we want easier process logs/status during development, but `launchd` is the native Mac supervisor.

Production/cloud later:

- Same two-process shape: web process plus worker process.
- Run under systemd, Docker Compose, a platform worker service, or Kubernetes when the system leaves the Mac Mini.
- Do not change the app architecture when the process manager changes.

### Model activation policy

Do not use the biggest model for every background job.

Use model tiers:

- Max intelligence: GPT-5.5 with highest available reasoning effort for architecture, hard debugging, final build recommendations, high-stakes synthesis, and human-facing strategic answers.
- Primary intelligence: GPT-5.4/5.5 class model for synthesis and complex candidate extraction when cost is justified.
- Efficient extraction: mini/flash-class models for routine tagging, classification, deduping, and low-risk extraction.
- Video intelligence: Gemini video understanding for YouTube/video-first sources.

As of the official OpenAI April 23, 2026 GPT-5.5 announcement, GPT-5.5 is available in ChatGPT/Codex and OpenAI says API availability is coming soon. Runtime code should support `OPENAI_HIGH_INTELLIGENCE_MODEL`, but not hard-require `gpt-5.5` until API access is actually available in the configured account.

### Activation definition of done

Every future system card needs these fields:

- `runtime_status`: manual, registered, scheduled, active, paused, failed, retired.
- `job_queue`: queue name or manual-only reason.
- `schedule`: cron/interval/event trigger.
- `last_run_at`.
- `last_success_at`.
- `last_failure_at`.
- `next_run_at`.
- `owner`.
- `max_runtime_seconds`.
- `daily_budget_usd`.
- `failure_threshold`.
- `pause_switch`.
- `health_check`.

No more "built" without "turned on" or an explicit "manual-only by design" reason.

## Critical Architecture Update 3: LLM Router With Policy-Aware Subscription Use

Claude's runtime plan is right on the need for an LLM router. It is too aggressive on credential pooling.

The system should absolutely support multiple model providers and multiple paid plans. But the router must distinguish between:

- Official API paths.
- Native subscription paths.
- Local interactive coding paths.
- Experimental/gateway paths.
- Unsupported or policy-risky paths.

### What I verified

Local machine:

- `claude` is installed.
- Claude Code version is `2.1.119`.
- `claude auth status --text` reports login via Steve's Claude Max account.
- This shell does not expose `ANTHROPIC_API_KEY`, so Claude Code is currently using subscription auth, not API billing.

Official Anthropic docs:

- Claude Code can authenticate with Pro/Max subscriptions.
- `claude -p` exists for one-shot terminal queries.
- `claude setup-token` can generate a one-year OAuth token for CI/scripts and authenticates against a Pro/Max/Team/Enterprise plan.
- If `ANTHROPIC_API_KEY` is set, Claude Code prioritizes API billing over subscription auth.
- Anthropic legal/compliance says Pro/Max usage limits assume ordinary individual usage of Claude Code and Agent SDK.
- Anthropic legal/compliance says developers building products or services, including with Agent SDK, should use API key or cloud-provider authentication and may not route requests through Free/Pro/Max credentials on behalf of users.

Official OpenAI docs:

- GPT-5.5 is real and available in ChatGPT/Codex as of April 23, 2026.
- OpenAI says GPT-5.5 API availability is coming soon; do not hard-require `gpt-5.5` in API code until the configured account actually has access.
- ChatGPT subscription and OpenAI API billing are separate products. Treat any ChatGPT-Pro-through-gateway route as a local adapter that needs policy and reliability testing, not as a guaranteed API replacement.

### Correct interpretation

Steve is right about the strategic goal:

- Use the paid subscriptions where they are technically and contractually supported.
- Do not pay API rates by default if an official subscription path exists.
- Keep the system provider-agnostic so Claude, OpenAI, Gemini, Codex, OpenClaw, and direct APIs are adapters under BCrew AI OS, not the system itself.

The correction:

- Do not build a blind "quota farm" that round-robins across 3 Claude Max and 2 ChatGPT Pro accounts to evade usage caps.
- Do build a policy-aware LLM router with credential registry, capability probes, usage tracking, fallback paths, and per-workload rules.
- Use subscriptions first only where the route is allowed, observable, stable, and tied to the real subscriber identity.
- Use API fallback where automation becomes productized, multi-tenant, unsupported by subscription auth, or too important to depend on consumer plan limits.

### Hub-dedicated capacity model

Steve's intended model is not blind rotation. It is hub-owned capacity:

- Foundation has its own model account capacity for source sync, extraction, synthesis, verification, and shared intelligence.
- Marketing has dedicated model account capacity because image/video/content generation can burn far more tokens than normal operations.
- Strategy, Ops, Sales, Recruiting, Retention, and Unchained Realtor can each receive dedicated capacity as their usage becomes real.
- A heavy hub may need both a Claude account and a ChatGPT account, or more than one account, if its workload justifies it.
- Accounts should be assigned by system/hub/workload first, not pooled globally by default.
- The router should support overflow and fallback, but overflow must be explicit, logged, budgeted, and policy-classified.

This gives each high-volume system its own compute lane without hiding usage, blending owners, or pretending one subscription can safely power the whole business.

### LLM router architecture

Suggested module:

- `lib/llm-router.js`

Core concepts:

- `llm_credentials`: provider, account identity, auth type, allowed workloads, status, quota state, reset estimate, policy classification.
- `llm_routes`: workload, preferred provider/model, auth path, fallback path, max cost, max latency, max risk class.
- `llm_calls`: every call logged with workload, model, credential id, auth path, estimated tokens, result, cost, failure mode.

Auth path classes:

- `api_direct`: official API key or cloud provider. Best for production automation and resale.
- `claude_code_subscription`: Claude Code native subscription auth. Good for local/internal Claude Code tasks and carefully supervised scripts.
- `claude_code_oauth_token`: Claude Code setup-token route for CI/scripts. Good for internal scripts where Anthropic policy permits; not for a hosted customer product without approval.
- `chatgpt_subscription_gateway`: ChatGPT Pro via OpenClaw or similar gateway. Treat as experimental/local until proven reliable and permitted.
- `codex_subscription`: use Codex subscription for coding-agent work inside Codex, not as a general backend API unless OpenAI exposes an official callable route.
- `manual_interactive`: Claude Code / Codex conversations driven by Steve or a builder.

### Routing rules

Safe first routing:

- Foundation worker health checks: no LLM.
- Sync jobs: no LLM.
- Extraction: cheap model via router, prefer subscription route only after policy and reliability probe passes; otherwise mini/haiku/nano API.
- Synthesis: high-intelligence route, A/B Claude Opus 4.7 vs GPT-5.5 when available through supported routes.
- Agents: Claude Agent SDK is strong, but production/productized agents should use API/cloud auth unless subscription use is explicitly approved or clearly within ordinary individual usage.
- Embeddings: OpenAI API direct; subscription plans do not replace embedding APIs.
- Video: Gemini API direct for public YouTube/video understanding.
- Audio: OpenAI transcription API direct or local transcription if quality/cost improves.

Rejected default routing:

- Do not rotate consumer accounts purely to avoid rate limits.
- Do not share one person's subscription credentials across unrelated users or tenants.
- Do not build resale economics on consumer-plan quota arbitrage.
- Do not route Claude Max through OpenClaw if that path is known to be blocked or disallowed.

Acceptable credential pooling:

- Identity-scoped pool: each real subscriber account is used for that subscriber's own agent/workload.
- Service account pool: only if the provider plan permits service accounts or org-managed seats.
- Fallback pool: when subscription route hits an honest limit, mark it exhausted and route to API or pause, rather than hiding the limit by cycling accounts.

### Implementation rule

Build the LLM router early, but do not make it Phase 1 ahead of runtime activation.

Correct order:

1. Runtime activation registry and worker.
2. LLM router skeleton with provider adapters and logging.
3. Move existing LLM calls behind the router.
4. Add subscription adapters as tested routes, not assumptions.
5. Add policy dashboard: which workloads use subscription, API, gateway, or manual paths.

The router is the abstraction. The runtime is what makes the system alive. Both matter, but runtime activation still comes first because dormant tools are the current operational failure.

## What I Actually Verified Locally

### Current archive and synthesis state

- `npm run shared-comms:coverage` reports more than 10,000 archived shared communication artifacts and 4,481 candidates as of this audit.
- `npm run foundation:verify` passes 17/17.
- `shared_communication_synthesis_runs` exists and contains two runs.
- Latest synthesis run uses `gpt-5.4`, reads 180 candidates, and produced 12 ranked synthesized items.
- The synthesis proof output at `docs/handoffs/2026-04-23-shared-comms-synthesis-source-facts-proof.md` is materially useful but still run-based, not a durable intelligence state machine.

### Current API/apply surface

Existing routes in `server.js`:

- `GET /api/shared-communications/archive`
- `GET /api/shared-communications/coverage`
- `GET /api/shared-communications/candidates`
- `GET /api/shared-communications/synthesis`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-backlog`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-decision`
- `POST /api/shared-communications/candidates/:candidateKey/apply-to-question`
- `POST /api/shared-communications/candidates/:candidateKey/:action`

Existing DB functions in `lib/foundation-db.js`:

- `applySharedCommunicationCandidateToBacklog`
- `applySharedCommunicationCandidateToDecision`
- `applySharedCommunicationCandidateToQuestion`
- `listSharedCommunicationSynthesisRuns`
- `listSharedCommunicationSynthesizedItems`

This means the action loop has started, but it only supports three internal governance outputs. It does not yet recommend builds as a first-class product loop.

### Current data gap

The archive is large, but it is not yet searchable like memory.

Local DB inspection found:

- `shared_communication_artifacts.content_text` is very large: roughly 132M characters across the archive.
- That is roughly 33M to 40M tokens before chunking.
- P95 artifact sizes for meeting notes, transcripts, and Gmail threads are far above safe single-embedding size.
- There is no `vector` extension installed locally.
- `pg_trgm` is available but not installed.
- There are no embedding columns, chunk tables, entity tables, or candidate edge tables yet.

Conclusion: a direct "embed artifacts" plan is incomplete. The system needs chunk-level retrieval, not artifact-level embedding only.

### Current extraction coverage gap

Observed candidate coverage is uneven:

- Gmail has thousands of archived artifacts but only hundreds of candidates.
- Missive has thousands of archived artifacts but only hundreds of candidates.
- Slack has more than 1,000 archived artifacts but fewer than 100 candidates.
- Meetings are the strongest current extraction source.

Some artifacts should legitimately produce zero candidates, so this is not automatically a bug. But the system cannot yet prove extraction coverage quality because it lacks a run ledger and no-candidate explanations.

Needed distinction:

- Archive coverage: did we ingest the source?
- Extraction coverage: did each artifact get processed by the right extractor?
- Candidate yield: did it produce zero, one, or many candidates?
- Review coverage: were candidates accepted, rejected, stale-watched, applied, or superseded?
- Retrieval coverage: was content chunked and embedded?

Right now those are mixed together.

## Old System Lessons To Preserve

I checked the old system under:

- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/briefs/`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/scout-reports/`
- `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/myicor/`
- `/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-external-scout/SKILL.md`

The old system's strength was output cadence and useful report shape:

- Daily scout reports.
- Executive briefs.
- Department-specific intelligence.
- Platform scans.
- Marketing trend scans.
- External expert summaries.
- Concrete "what changed / why it matters / what to do next" recommendations.

The old system's weakness was implementation:

- It was prompt-loop driven.
- External scouts lived as markdown skills, not reliable code.
- It used WebSearch, WebFetch, Puppeteer, Firecrawl, and agent behavior rather than idempotent jobs.
- It produced useful markdown artifacts but did not create durable operating memory.

Correct conclusion: port the old output shapes, not the old architecture.

## External Research Conclusions

I researched current memory/retrieval/video patterns and used primary/current sources where possible.

### Video intelligence

Use Gemini video understanding as the default video analysis path, not Playwright screenshot scraping as the primary path.

Reason:

- Gemini API supports video understanding.
- Google documents support for public YouTube URLs as video input.
- The model can reason over visual and audio content directly.
- This avoids fragile browser automation, YouTube page breakage, screenshot timing bugs, and unnecessary storage.

Still use `yt-dlp` or official captions as fallback where legally and technically allowed. Use YouTube Data API for discovery and metadata, not scraping.

Sources:

- Gemini video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- YouTube Data API docs: https://developers.google.com/youtube/v3/docs
- YouTube captions API: https://developers.google.com/youtube/v3/docs/captions
- YouTube API terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube developer policies: https://developers.google.com/youtube/terms/developer-policies

### Memory systems

The useful modern pattern is not "vector search only."

The strongest pattern is:

- Atomic facts.
- Original source retrieval.
- Temporal updates.
- Graph/entity connections.
- Hybrid search.
- Reranking.
- Feedback from accept/reject/apply behavior.

Useful references:

- Zep/Graphiti temporal knowledge graph concepts: https://help.getzep.com/groups
- Zep concepts: https://help.getzep.com/v2/concepts
- Graphiti paper: https://arxiv.org/abs/2501.13956
- Supermemory research: https://supermemory.ai/research/
- Mem0 State of AI Agent Memory 2026: https://mem0.ai/blog/state-of-ai-agent-memory-2026

Important caveat: vendor benchmark claims are useful signals, not gospel. The architecture pattern matters more than the leaderboard claim.

### Retrieval stack

Stay in Postgres first.

Use:

- `pgvector` for vector similarity.
- Postgres full-text search for lexical/BM25-style exact recall.
- `pg_trgm` for fuzzy names, misspellings, tool names, and creator names.
- Reciprocal Rank Fusion for combining lexical, vector, and entity results.
- Reranker only after the first retrieval stage.

Do not add Pinecone, Weaviate, Neo4j, or a separate vector DB yet. The current system's advantage is one operating DB with provenance and governance. Splitting early will create another sync problem.

Sources:

- pgvector: https://github.com/pgvector/pgvector
- Postgres full-text search controls: https://www.postgresql.org/docs/current/textsearch-controls.html
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings

## The Missing System Pieces

### -1. Foundation runtime activation registry

The system needs a runtime registry before more "built but asleep" features are added.

Suggested tables:

```sql
CREATE TABLE foundation_runtime_services (
  service_id text PRIMARY KEY,
  service_name text NOT NULL,
  service_type text NOT NULL,
  runtime_status text NOT NULL CHECK (
    runtime_status IN ('manual', 'registered', 'scheduled', 'active', 'paused', 'failed', 'retired')
  ),
  command text,
  queue_name text,
  schedule text,
  owner text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  next_run_at timestamptz,
  max_runtime_seconds integer,
  daily_budget_usd numeric(10,4),
  failure_threshold integer NOT NULL DEFAULT 3,
  pause_switch boolean NOT NULL DEFAULT false,
  health_check text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

First services to register:

- Foundation web/API server.
- Foundation worker process.
- Admin deal review.
- Conditional deal review.
- Foundation verifier.
- Source-of-truth verifier.
- Gmail current sync.
- Missive current sync.
- Meeting current sync.
- Slack current sync.
- Shared-comms candidate extraction.
- Shared-comms synthesis.
- Extraction control worker.

Acceptance test:

- Foundation UI can show which systems are manual, scheduled, active, stale, failed, paused, or retired.
- A built system cannot be marked complete without an activation status.
- Steve can ask "what is running?" and the system can answer from the registry, not from someone remembering terminal history.

### 0. Runtime worker process

Add one background worker entry point:

- `npm run foundation:worker`

Responsibilities:

- Start the Postgres job queue.
- Register task handlers.
- Execute jobs with source leases, cost budgets, and runtime limits.
- Update `foundation_runtime_services` and `intelligence_jobs`.
- Emit heartbeat records.
- Refuse paused jobs.
- Enforce max runtime and concurrency.

Initial handlers:

- `owners.adminDealReview`
- `owners.conditionalDealReview`
- `foundation.verify`
- `sharedComms.gmailCurrentSync`
- `sharedComms.missiveCurrentSync`
- `sharedComms.meetingCurrentSync`
- `sharedComms.slackCurrentSync`
- `sharedComms.extractCandidates`
- `sharedComms.synthesis`
- `extractControl.currentLane`
- `extractControl.backfillBite`

Acceptance test:

- Worker can be started once and then jobs run without terminal-agent intervention.
- Failed jobs retry with limits and land in a visible failed state.
- Deal review can run on queued rows without Steve or Codex manually typing `npm run deal-review:*`.

### 0. Source extraction control plane

Before more backfill, add a DB-backed queue for all source crawling and extraction.

The control plane decides:

- Which source is allowed to run now.
- Whether the run is current-day sync or historical bite.
- Which cursor/date/folder/community/module/video comes next.
- How much work the run is allowed to do.
- Whether another worker already owns the lease.
- What was inspected and what still remains.

Suggested tables:

```sql
CREATE TABLE source_crawl_targets (
  target_id text PRIMARY KEY,
  source_id text NOT NULL,
  source_type text NOT NULL,
  display_name text NOT NULL,
  lane text NOT NULL CHECK (lane IN ('current', 'backfill')),
  priority integer NOT NULL DEFAULT 3,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'blocked', 'done')),
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  lease_owner text,
  lease_expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source_crawl_items (
  crawl_item_id text PRIMARY KEY,
  target_id text NOT NULL REFERENCES source_crawl_targets(target_id) ON DELETE CASCADE,
  source_id text NOT NULL,
  external_id text NOT NULL,
  item_type text NOT NULL,
  title text,
  source_url text,
  parent_external_id text,
  status text NOT NULL CHECK (status IN ('discovered', 'inspected', 'archived', 'extracted', 'skipped', 'failed')),
  fingerprint text,
  inspected_at timestamptz,
  archived_artifact_id text,
  skip_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);
```

Initial targets:

- Gmail current: last 24 to 48 hours by team accounts.
- Gmail backfill: one bounded historical date slice at a time.
- Missive current: newest conversations since last cursor.
- Missive backfill: one cursor page at a time.
- Google Drive current: recently modified docs/files across governed shared drives.
- Google Drive backfill: one folder at a time, inventory first, extract second.
- Zoom/Meet current: new meeting artifacts as they land.
- Zoom audio backfill: one folder/date bite at a time.
- Skool current: new modules/posts/comments from paid communities.
- Skool backfill: one course/module/community section at a time.
- YouTube current: new uploads from watchlist.
- YouTube backfill: last N videos per priority creator.

Acceptance test:

- The system can run `current` workers daily without blocking on `backfill`.
- Two workers cannot process the same target at the same time.
- A failed worker records its failure and releases or expires its lease.
- Every source can answer "what did we already inspect?" and "what is next?"

### 1. Job ledger

The system needs an `intelligence_jobs` table before more automation is added.

Without this, the system cannot prove:

- What ran.
- When it ran.
- Which source it processed.
- Which model it used.
- How much it cost.
- How many artifacts/chunks/candidates/items it created.
- Whether it failed.
- Whether it was retried safely.

Suggested table:

```sql
CREATE TABLE intelligence_jobs (
  job_id text PRIMARY KEY,
  job_type text NOT NULL,
  source_id text,
  source_scope text,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial')),
  started_at timestamptz,
  finished_at timestamptz,
  input_count integer DEFAULT 0,
  output_count integer DEFAULT 0,
  model_name text,
  cost_usd numeric(10,4),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

First jobs to ledger:

- Source crawl target lease.
- Source crawl item discovery.
- Gmail import.
- Missive import.
- Slack import.
- Meeting import.
- Drive inventory.
- Drive content extraction.
- Skool inventory.
- Skool video/post/document extraction.
- Candidate extraction.
- Chunking.
- Embedding.
- Synthesis.
- YouTube discovery.
- YouTube video analysis.
- External brief generation.

### 2. Chunk-level retrieval spine

Artifact-level embedding is not enough because many artifacts are huge.

Add `shared_communication_chunks`:

```sql
CREATE TABLE shared_communication_chunks (
  chunk_id text PRIMARY KEY,
  artifact_id text NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
  source_id text NOT NULL,
  artifact_type text NOT NULL,
  chunk_index integer NOT NULL,
  content_text text NOT NULL,
  token_count integer,
  search_vector tsvector,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, chunk_index)
);
```

Chunking rules:

- Meetings: chunk by agenda section, speaker turn cluster, or paragraph group.
- Transcripts: chunk by timestamp window and speaker continuity.
- Emails: chunk by message in thread, then paragraph group if needed.
- Slack: chunk by thread.
- YouTube: chunk by chapter, topic segment, or Gemini timestamp segment.
- Books: chunk by chapter/section/page range with citation metadata.

Acceptance test:

- Query "what should we build next for recruiting?" returns cited chunks from meetings, decisions, external videos, and prior backlog within two seconds on local DB after warmup.

### 3. Hybrid search API

Add a first-class search endpoint before trying to make synthesis smarter.

Suggested route:

- `GET /api/intelligence/search?q=&source=&entity=&since=&limit=`

Search strategy:

- Run lexical search over `search_vector`.
- Run trigram search over titles, names, aliases, and short text.
- Run vector search over chunk embeddings.
- Run entity lookup when an entity name is detected.
- Fuse results using Reciprocal Rank Fusion.
- Rerank top 50 to top 10 only when needed.
- Return source citations and ACL/redaction status.

Acceptance tests:

- "SocialPilot" finds exact internal mentions even if embedding similarity is weak.
- "voice AI setup" finds Paul Lipsky/voice-agent content even when exact phrasing differs.
- "what did Nick say about memory?" disambiguates the right Nick when entity graph exists.
- "what should we build next?" returns recommendations backed by evidence, not generic advice.

### 4. Persistent intelligence items

Synthesis runs are not enough. The system needs durable intelligence items with lifecycle.

Suggested table:

```sql
CREATE TABLE intelligence_items (
  intelligence_item_id text PRIMARY KEY,
  item_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  recommendation text,
  status text NOT NULL CHECK (status IN ('active', 'watch', 'resolved', 'rejected', 'superseded')),
  priority integer NOT NULL DEFAULT 3,
  confidence numeric(4,3),
  owner_scope text,
  valid_from timestamptz,
  valid_until timestamptz,
  superseded_by text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Item types:

- `build_recommendation`
- `automation_opportunity`
- `process_break`
- `sales_opportunity`
- `recruiting_signal`
- `content_opportunity`
- `market_shift`
- `tool_adoption`
- `leadership_risk`
- `financial_risk`
- `customer_insight`

This is the core product layer. The system should not just summarize. It should maintain live intelligence items that can be promoted to backlog, decision, question, campaign, offer, or automation build.

### 5. Candidate and intelligence edges

Add relationship edges:

```sql
CREATE TABLE intelligence_edges (
  edge_id text PRIMARY KEY,
  from_id text NOT NULL,
  to_id text NOT NULL,
  from_type text NOT NULL,
  to_type text NOT NULL,
  edge_type text NOT NULL,
  strength numeric(4,3),
  evidence text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Edge types:

- `updates`
- `extends`
- `contradicts`
- `supports`
- `supersedes`
- `derived_from`
- `mentions`
- `caused_by`
- `blocked_by`
- `recommended_action_for`

This is how the system stops rediscovering the same insight every week.

### 6. Entity graph in Postgres

Start simple. Do not add Neo4j.

Tables:

- `entities`
- `entity_aliases`
- `artifact_entities`
- `candidate_entities`
- `intelligence_item_entities`

Entity types:

- `person`
- `company`
- `team`
- `tool`
- `book`
- `creator`
- `concept`
- `offer`
- `system`
- `campaign`

Critical disambiguation examples:

- Nick Milo vs Nick Saraev vs internal Nick.
- Alex Hormozi vs Alex Finn.
- ICOR/Tom vs generic "Tom."
- ElevenLabs as tool, not person.
- Skool as platform/community, not school.

Acceptance test:

- Query "show me all tool recommendations from Nate Herk, Nick Saraev, Mark Kashef, and Paul Lipsky in the last 30 days" returns entity-filtered evidence, not broad text matches.

### 7. External intelligence scout as code

The YouTube/external scout must be a coded ingestion pipeline, not another prompt skill.

Tables:

```sql
CREATE TABLE creator_watchlist (
  creator_id text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL,
  youtube_channel_id text,
  youtube_handle text,
  website_url text,
  x_handle text,
  linkedin_url text,
  skool_url text,
  priority integer NOT NULL DEFAULT 3,
  paid_source boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Initial creator watchlist:

- ICOR with Tom / AI Productivity
- Mark Kashef
- Nate Herk
- Chase AI
- Dan Martell
- Nick Saraev
- Paul J Lipsky
- Linking Your Thinking with Nick Milo
- Mansel Scheffel
- AI News & Strategy Daily
- Ray Amjad
- Alex Finn
- Jono Catliff
- Chris Bradley
- Ambitious AI
- Brad / AI & Automation
- Neil Patel
- Russell Brunson
- Alex Hormozi

YouTube ingestion flow:

1. Discover recent uploads with YouTube Data API.
2. Store metadata and video identity.
3. Analyze selected videos with Gemini video understanding using the YouTube URL.
4. Store timestamped structured analysis as `youtube_video` artifacts.
5. Store extracted tools, workflows, prompts, screenshots-of-interest, offers, and claims as metadata.
6. Run candidate extraction against those artifacts.
7. Run weekly external intelligence synthesis.
8. Promote output to `intelligence_items`.

Gemini video prompt should extract:

- Tools demonstrated.
- Workflows shown.
- Prompts used or implied.
- UI patterns shown.
- Automation architecture.
- Offer or business model insight.
- Content angle that could be adapted.
- Claims that need verification.
- Timestamped moments worth revisiting.
- Build recommendations for BCrew AI OS or Unchained Realtor.

Acceptance test:

- For five creators and three videos each, the system produces source-backed build recommendations with timestamps and cites the originating video.

### 8. Drive and Skool source workers

Google Drive and Skool should not be one-time backfill projects. They should be source workers under the same extraction control plane.

Google Drive worker responsibilities:

- Inventory shared drives and key folders.
- Fingerprint files so duplicates are visible.
- Classify file type, owner, modified date, source sensitivity, and extraction priority.
- Extract text from Docs, Sheets, PDFs, slides, notes, meeting exports, and transcripts.
- Detect video/audio files and route them to the right media extractor.
- Detect links inside docs and queue linked resources where allowed.
- Suggest organization moves, but do not move or delete files without an explicit approved policy.

Drive organizer rule:

- First mode is inventory and recommendations only.
- Second mode can copy or tag into a new AI OS staging folder.
- Move/delete mode requires explicit policy, dry-run output, and approval.

Skool worker responsibilities:

- Inventory communities, courses, modules, posts, comments, videos, links, and attached docs where access is authorized.
- Preserve paid/private source boundaries in metadata.
- Extract course frameworks, prompts, workflows, offers, and implementation ideas.
- Store media-derived outputs with timestamp/module/post context.
- Avoid redistributing paid content as raw copied training material. Store source-grounded intelligence and citations for internal use.

Skool technical note:

- If a stable API is unavailable, use a supervised authenticated browser worker with strict rate limits, crawl state, screenshots/logs for audit, and no credential leakage into artifacts.
- Browser crawling should be a source worker with leases and budgets, not a human-driven ad hoc session.

Acceptance test:

- Drive can process one folder bite and report discovered, skipped, archived, extracted, and failed items.
- Skool can process one module bite and produce source-backed candidates without losing access boundaries.
- Current-day workers still run even if historical Drive or Skool backfill is incomplete.

### 9. Privacy and tier gate before broad query

The auth/tier/vault spec already exists at `docs/specs/2026-04-23-auth-tiers-vault.md`.

Do not expose global search broadly until these are enforced:

- Tier-based access.
- Subject-person redaction.
- Vault/source scope filters.
- Evidence-level redaction.
- Query audit trail.

Reason: a powerful memory system becomes dangerous if it can retrieve private HR, leadership, compensation, legal, or personal context for the wrong user.

Minimum rule:

- Admin-only search first.
- Then tiered search.
- Then hub-specific search.
- Then user-facing copilots.

## Correct Build Sequence

### Sprint 1: Runtime Activation Layer

Goal: turn built systems into running systems.

Build:

- `foundation_runtime_services`.
- `npm run foundation:worker`.
- Postgres job queue dependency and worker harness.
- Process supervisor config for Mac Mini.
- Runtime dashboard/API showing manual, scheduled, active, stale, failed, paused, and retired systems.
- Activation status fields for backlog/system cards.

Acceptance:

- Foundation web/API and worker can survive terminal session end.
- Deal review jobs can run through queue/scheduler, not only manual `npm run`.
- The Foundation UI can answer "what is running, what failed, what is stale, and what is paused?"
- No future system can be marked done without activation status.

### Sprint 2: First Always-On Jobs

Goal: activate what already exists before adding more new systems.

Build:

- Register `deal-review:admin -- --queued` as a scheduled/queued job.
- Register `deal-review:conditional -- --queued` as a scheduled/queued job.
- Register `foundation:verify` as a recurring health job.
- Register source coverage reporting as a recurring health job.
- Register synthesis as manual or scheduled with explicit budget, not ambiguous.
- Add fail thresholds and pause switches.

Initial conservative schedule:

- Foundation verify: every 30 to 60 minutes.
- Owners/deal review queued rows: every 30 to 60 minutes with max concurrency 1.
- Shared-comms coverage: every 2 to 4 hours.
- Synthesis: manual until durable intelligence items exist, or scheduled once daily with budget cap.

Acceptance:

- Existing deal review system stops being dormant.
- Failures create visible runtime status.
- Schedules can be paused without code edits.
- Jobs cannot overlap and deadlock each other.

### Sprint 3: Policy-Aware LLM Router

Goal: let BCrew AI OS use the best available model/auth path per workload without hardcoding provider assumptions into every script.

Build:

- `llm_credentials` registry with provider, account identity, auth type, allowed workloads, status, quota state, reset estimate, and policy classification.
- `llm_routes` config with workload, preferred model, auth path, fallback path, cost cap, latency cap, and risk class.
- `llm_calls` ledger for every model call.
- `lib/llm-router.js` skeleton with adapters for official API, Claude Code subscription auth, Claude Code setup-token, OpenClaw/ChatGPT gateway, Gemini API, and manual interactive routes.
- Capability probes for each route before it is allowed in scheduled automation.
- Policy dashboard showing which workloads are using subscription, API, gateway, or manual paths.

Acceptance:

- Existing LLM-using scripts can be moved behind the router without changing their business logic.
- Subscription routes are marked tested/untested and allowed/disallowed by workload.
- The router never round-robins consumer accounts only to hide provider rate limits.
- If a subscription path fails, hits a real cap, or becomes disallowed, the router can pause or fall back to an official API route.
- Every call is logged with provider, model, auth path, workload, success/failure, and estimated cost.

### Sprint 4: Extraction Team Control Plane

Goal: stop hand-running backfill scripts and create a durable worker system.

Build:

- `source_crawl_targets`.
- `source_crawl_items`.
- `intelligence_jobs`.
- Lease/lock helpers in `lib/foundation-db.js`.
- Job logging helper in `lib/foundation-db.js`.
- Admin route or script to list active targets, leases, failures, next cursors, and daily budgets.
- Concurrency guard so Gmail, Missive, Drive, Zoom, Skool, deal review, and synthesis jobs do not deadlock each other.

Acceptance:

- Every source worker gets a target, lane, cursor, budget, status, and lease.
- Current-day sync and historical backfill are visibly separate.
- Failed jobs are visible and retryable.
- Re-running a worker does not duplicate artifacts or candidates.
- Backfill can be paused without stopping current-day sync or active deal review.

### Sprint 5: Current-Day Sync Lane

Goal: make the system stay current every day before eating more history.

Build:

- Gmail current worker: last 24 to 48 hours across governed team accounts.
- Missive current worker: newest conversations since last cursor.
- Meeting current worker: new Google Meet, Zoom, transcript, chat, and note artifacts.
- Drive current worker: recently modified docs/files in governed folders.
- Skool current worker: new posts/modules/comments/videos where access is authorized.
- YouTube current worker: new uploads from watchlist creators.
- Daily current-lane summary: processed, extracted, skipped, failed, and needs-review.
- Runtime activation records for every current-lane worker.

Acceptance:

- The system can answer "what changed today?" from current sources.
- Historical backfill can be incomplete and the system is still useful.
- A missed day resumes from cursor instead of starting over.
- Current-lane jobs have stricter priority than backfill jobs.

### Sprint 6: Bounded Historical Bite Lane

Goal: replace giant backfill marathons with controlled bites.

Build:

- Gmail backfill worker: one bounded date slice at a time.
- Missive backfill worker: one cursor/page slice at a time.
- Zoom audio/video backfill worker: one folder/date bite at a time.
- Drive backfill worker: one folder inventory bite, then extraction bite.
- Skool backfill worker: one course/module/community section bite.
- YouTube backfill worker: last N videos per priority creator.
- Source-specific skip reasons and no-candidate accounting.

Acceptance:

- The system can take one bite from each source and record exactly what happened.
- It can show "next bite" per source.
- It can prioritize high-value sources without pretending all history must be complete first.

### Sprint 7: Extraction Coverage And Source Quality

Goal: make the extraction team accountable.

Build:

- Coverage report by source, target, lane, artifact type, candidate type, and extraction method.
- No-candidate ledger: processed artifacts that intentionally produced zero candidates.
- Rejection/stale-watch/applied coverage.
- Cost and model usage by job type.
- Deadlock/failure counter by source worker.

Acceptance:

- Coverage separates archived, inspected, processed, yielded, reviewed, applied, rejected, stale-watch, chunked, and embedded.
- The next best processing target is visible.
- The system can prove whether backfill is helping or wasting time.

### Sprint 8: Retrieval Spine Without Waiting For Vectors

Goal: make the archive queryable immediately.

Build:

- `shared_communication_chunks`.
- Chunker script for existing artifacts.
- `pg_trgm` install if available.
- `search_vector` generated/update path.
- Lexical/trigram search API.
- Admin-only `/api/intelligence/search`.

Acceptance:

- Search works before embeddings.
- Exact names, tools, books, offers, and systems are findable.
- Results include source title, artifact id, chunk id, snippet, and timestamps where available.

### Sprint 9: Embeddings And Hybrid Fusion

Goal: make search semantic, not just keyword based.

Build:

- Install `pgvector` locally and in deployment environment.
- Add `embedding vector(1536)` to chunks and candidates.
- Use OpenAI embeddings with dimensions set to 1536, or another 1536-compatible embedding model.
- HNSW index for chunk vectors.
- Vector search path.
- RRF fusion of lexical, trigram, vector, and entity results.
- Optional reranker behind a feature flag.

Acceptance:

- Semantic queries find relevant evidence without exact words.
- Exact proper-noun queries still beat vague semantic matches.
- Search latency stays acceptable.
- Embedding job is resumable and cost logged.

### Sprint 10: Durable Intelligence Items

Goal: stop producing only run outputs. Maintain live intelligence state.

Build:

- `intelligence_items`.
- `intelligence_edges`.
- Synthesis v2 writes durable items.
- Existing items are updated, extended, contradicted, or superseded instead of duplicated.
- Apply paths extended from candidates to intelligence items.

New apply routes:

- `apply-to-backlog`
- `apply-to-decision`
- `apply-to-question`
- `apply-to-build-card`
- `apply-to-content-idea`
- `apply-to-automation-card`

Acceptance:

- "What should we build next?" returns top live `build_recommendation` items.
- Each recommendation has evidence and a lifecycle status.
- New synthesis run updates old items instead of spamming duplicates.

### Sprint 11: External Source MVPs

Goal: add YouTube, Skool, and Drive as recurring source workers, not side quests.

Build:

- `creator_watchlist`.
- YouTube Data API discovery script.
- Gemini video analysis script.
- `youtube_video` artifact type.
- Drive current and one-folder backfill worker.
- Skool current and one-module backfill worker.
- External candidate extraction.
- External synthesis into `intelligence_items`.

MVP scope:

- YouTube: five creators, three videos each.
- Skool: one paid community, one module/course section.
- Drive: one high-value shared-drive folder.
- Manual run first, then scheduled current lane.

Scale after MVP:

- 19 creators.
- Last 10 videos each.
- Blog/newsletter/social sources.
- Paid community ingestion only where terms and access allow.
- Full shared-drive inventory with safe organizer recommendations.

Acceptance:

- System can answer: "What are external experts teaching that should change what we build?"
- Drive can answer: "What valuable content/assets did we find in this folder?"
- Skool can answer: "What paid training content creates build or content opportunities?"
- Every recommendation links back to source, timestamp/module/file, and extracted evidence.

### Sprint 12: Entity Graph And Temporal Memory

Goal: make the system reason over people, tools, books, systems, and time.

Build:

- `entities`.
- `entity_aliases`.
- `artifact_entities`.
- `candidate_entities`.
- `intelligence_item_entities`.
- Entity extraction job.
- Disambiguation review queue.
- `event_date` and `document_date` normalization.
- Entity-aware search filters.

Acceptance:

- "Show me everything about ElevenLabs" works.
- "What has changed about recruiting since March?" works.
- "What did we believe before, what do we believe now, and why did it change?" works.

### Sprint 13: System Recommends Builds

Goal: make build recommendations a first-class product output.

Build:

- `build_recommendation` intelligence item type.
- Build scoring model.
- Build dashboard view.
- Apply-to-backlog flow with automatic evidence bundle.

Scoring dimensions:

- Revenue leverage.
- Time saved.
- Strategic fit.
- Urgency.
- Confidence.
- Evidence count.
- Cross-source support.
- Implementation complexity.
- Dependency risk.
- Privacy/compliance risk.

Acceptance:

- Top 10 build recommendations are ranked with clear reasoning.
- Each recommendation has source evidence.
- Each recommendation has "build now / watch / reject / needs human decision."
- Applying a recommendation creates a backlog card with context, evidence, acceptance criteria, and owner.

## What Not To Build Yet

Do not build these first:

- More giant historical backfill runs without the source control plane.
- A separate vector database.
- Neo4j.
- Browser-based YouTube screenshot scraping as the main path.
- Fully autonomous email/Slack sending.
- A consumer-facing assistant before tier/redaction gates.
- More markdown-only scout skills.
- More handoff docs without promotion into DB-backed cards.
- Drive file moving/deleting automation before inventory, dry run, and explicit policy approval.
- Paid community scraping that ignores source access boundaries.

These create sprawl before the intelligence spine is stable.

## Backlog Cards To Create

### RUNTIME-ACTIVATION-001: Foundation runtime activation registry

Create a Foundation runtime registry that tracks every built system's activation status, schedule, owner, health, failure state, and pause switch.

Acceptance:

- Built systems can be manual, registered, scheduled, active, paused, failed, or retired.
- Foundation UI/API can answer "what is running?" and "what is asleep?"
- Completion criteria require activation status or explicit manual-only reason.

### RUNTIME-WORKER-001: Foundation background worker process

Create `npm run foundation:worker` and a worker harness around a Postgres-backed job queue.

Acceptance:

- Worker starts once and processes scheduled/queued jobs continuously.
- Jobs update runtime service status and job ledger status.
- Failed jobs retry with limits and then become visible failures.
- Worker can be paused safely by source/job type.

### RUNTIME-SUPERVISOR-001: Mac Mini process supervision

Create process supervisor config for the Foundation web/API process and the Foundation worker process.

Acceptance:

- Web/API and worker restart after terminal session exit or process crash.
- Logs are written to stable files.
- Startup survives Mac restart/login according to the chosen supervisor.
- `launchctl`/PM2 status can prove whether the processes are alive.

### RUNTIME-FIRST-JOBS-001: Activate existing dormant systems

Register and schedule the systems that already exist before building more new machinery.

Acceptance:

- Admin deal review queued runner is scheduled with max concurrency 1.
- Conditional deal review queued runner is scheduled with max concurrency 1.
- Foundation verify runs on a recurring health schedule.
- Shared-comms coverage runs on a recurring health schedule.
- Synthesis is explicitly marked manual, scheduled, or paused with budget settings.

### LLM-AUTH-AUDIT-001: Verify subscription and API auth paths

Audit every model/auth path before wiring it into scheduled automation.

Acceptance:

- Claude Code Max via local `claude -p` is tested and classified by allowed workload.
- Claude Code `setup-token` / OAuth route is tested and classified by allowed workload.
- Claude Agent SDK auth path is tested separately from plain Claude Code CLI.
- OpenClaw/ChatGPT Pro route is tested and classified by allowed workload.
- Direct OpenAI, Anthropic, and Gemini API fallbacks are tested.
- The audit records technical status, policy risk, reliability risk, rate-limit behavior, and fallback recommendation.

### LLM-CREDENTIAL-REGISTRY-001: Policy-aware credential registry

Create a credential registry that supports multiple accounts without turning consumer subscriptions into an unsafe quota farm.

Acceptance:

- Credentials include provider, account identity, auth type, owner/subscriber, allowed workloads, risk class, quota state, and status.
- Router can mark a credential healthy, exhausted, failed, disabled, or manual-only.
- Consumer subscriptions are not round-robined only to evade rate limits.
- Identity-scoped usage is supported where the route is allowed.
- API/cloud auth fallback is available for productized, multi-tenant, or unsupported automation.

### LLM-HUB-CAPACITY-001: Hub-dedicated model account allocation

Define which model accounts belong to which systems and hubs before high-volume automation runs.

Acceptance:

- Foundation has a default model capacity lane for shared extraction, synthesis, and system jobs.
- Marketing has its own high-volume capacity lane, with separate Claude/OpenAI routes if needed for content and visual work.
- Each hub can declare preferred model accounts, allowed overflow accounts, budget limits, and API fallback rules.
- Router selection prefers hub-assigned accounts before any global fallback.
- Overflow between hubs is logged and visible, not silent.
- Usage dashboards can show cost/token burn by hub, workload, provider, model, and credential.
- No single account is assumed sufficient for all Foundation plus hub workloads.

### LLM-ROUTER-001: Route all model calls through one module

Create `lib/llm-router.js` and move LLM-using scripts behind it.

Acceptance:

- Existing extraction and synthesis code calls the router rather than direct provider SDKs.
- Router supports workload-based defaults and fallbacks.
- Every call is logged to an `llm_calls` ledger with workload, model, provider, auth path, result, and estimated cost.
- GPT-5.5 is supported as a configured high-intelligence model when available through the selected auth path, but API code does not hard-fail if the API account lacks access.
- Embeddings, transcription, video, and image generation can remain direct API routes where no subscription route exists.

### EXTRACT-CONTROL-001: Source extraction control plane

Create DB-backed source crawl targets, crawl items, leases, cursors, budgets, and source worker status.

Acceptance:

- Current and backfill lanes are separate.
- Workers are resumable and idempotent.
- Leases prevent concurrent writers from colliding.
- Each source can show next cursor, last success, last failure, and next bite.

### EXTRACT-CURRENT-001: Current-day source sync lane

Build the daily lane that keeps Gmail, Missive, meetings, Drive, Skool, and YouTube current.

Acceptance:

- The system can process the last 24 to 48 hours without waiting on history.
- Missed runs resume from cursor.
- Daily summary shows processed, extracted, skipped, failed, and review-needed counts.

### EXTRACT-BACKFILL-001: Bounded historical bite lane

Replace open-ended backfill runs with one bounded bite per source target.

Acceptance:

- Each backfill job has a fixed budget, cursor, target, and stop condition.
- The system records what was inspected and what remains.
- Backfill can be paused without harming current-day sync.

### DRIVE-WORKER-001: Google Drive inventory and extraction worker

Inventory and extract Google Drive one folder at a time, starting with high-value shared drives.

Acceptance:

- Worker fingerprints files and detects duplicates.
- Worker classifies docs, sheets, PDFs, slides, media, links, and stale folders.
- Worker extracts readable content into artifacts.
- Organizer mode is dry-run/recommendation-only until a move/copy policy is approved.

### SKOOL-WORKER-001: Skool source contract and crawler worker

Treat paid Skool trainings as governed source material with strict access boundaries.

Acceptance:

- Source contract defines allowed use, access owner, paid/private handling, and redaction rules.
- Worker can process one authorized course/module/community section.
- Videos, posts, links, comments, and attached docs become source-backed artifacts or queued media tasks.
- Outputs preserve source citations without redistributing paid content as raw public training material.

### INTEL-JOBS-001: Intelligence job ledger

Create durable job tracking for every ingestion, extraction, chunking, embedding, synthesis, and external scout run.

Acceptance:

- Job status visible from admin.
- Runs are idempotent.
- Failures and costs are captured.

### INTEL-COVERAGE-001: Extraction and retrieval coverage

Separate archive coverage, extraction coverage, candidate yield, review coverage, chunk coverage, and embedding coverage.

Acceptance:

- Report shows source by source gaps.
- No-candidate artifacts are explicitly tracked.
- Coverage can be used to decide what to process next.

### INTEL-CHUNKS-001: Shared communication chunk table

Chunk all archived artifacts into retrieval-safe units with metadata.

Acceptance:

- Chunks preserve artifact provenance.
- Chunking is resumable.
- Large artifacts are not embedded as one unit.

### INTEL-SEARCH-001: Admin intelligence search

Build admin-only lexical/trigram search before vector search.

Acceptance:

- Exact names/tools/offers are searchable.
- Results include snippets and citations.
- Search is filtered by source and date.

### INTEL-VECTOR-001: pgvector hybrid retrieval

Install pgvector, add 1536-dim embeddings, create HNSW indexes, and add RRF fusion.

Acceptance:

- Semantic and exact search are both supported.
- Search powers synthesis v2.
- Embedding cost and job status are logged.

### INTEL-ITEMS-001: Durable intelligence item state

Create persistent intelligence items with status, priority, owner scope, evidence, and lifecycle.

Acceptance:

- Synthesis creates or updates live items.
- Duplicate insights are merged.
- Items can be applied to backlog/decision/question/build/content/automation outputs.

### INTEL-EDGES-001: Intelligence relationship edges

Track updates, extends, contradicts, supports, supersedes, and derived-from edges.

Acceptance:

- The system can explain why an item changed.
- Old recommendations are superseded, not forgotten.

### INTEL-ENTITY-001: Entity graph in Postgres

Add first-class people, tools, companies, creators, books, concepts, systems, and offers.

Acceptance:

- Entity-centric search works.
- Ambiguous names can be disambiguated.
- Entity filters improve synthesis relevance.

### EXT-YOUTUBE-001: Creator watchlist and YouTube discovery

Create creator watchlist and discover recent videos through YouTube Data API.

Acceptance:

- Watchlist is stored in DB.
- Video metadata is imported idempotently.
- Paid/private source flags exist.

### EXT-YOUTUBE-002: Gemini video intelligence extraction

Analyze selected YouTube videos with Gemini video understanding and store timestamped intelligence artifacts.

Acceptance:

- Video artifacts include transcript/visual insights.
- Tools, workflows, prompts, and build recommendations are extracted.
- Results cite video URL and timestamps.

### BUILD-REC-001: Build recommendation engine

Make "what should we build next?" a first-class intelligence output.

Acceptance:

- Recommendations are ranked.
- Evidence is attached.
- Apply-to-backlog creates a usable card with acceptance criteria.

## The Real First Move

Start with runtime activation, then the LLM auth/router layer, then extraction control. The immediate problem is not lack of scripts. It is that scripts are not registered, scheduled, supervised, visible, or routed through one policy-aware model layer.

Build order:

1. `RUNTIME-ACTIVATION-001`
2. `RUNTIME-WORKER-001`
3. `RUNTIME-SUPERVISOR-001`
4. `RUNTIME-FIRST-JOBS-001`
5. `LLM-AUTH-AUDIT-001`
6. `LLM-CREDENTIAL-REGISTRY-001`
7. `LLM-ROUTER-001`
8. `EXTRACT-CONTROL-001`
9. `INTEL-JOBS-001`
10. `EXTRACT-CURRENT-001`
11. `EXTRACT-BACKFILL-001`
12. `INTEL-COVERAGE-001`
13. `DRIVE-WORKER-001`
14. `SKOOL-WORKER-001`
15. `INTEL-CHUNKS-001`
16. `INTEL-SEARCH-001`
17. `INTEL-VECTOR-001`
18. `INTEL-ITEMS-001`
19. `EXT-YOUTUBE-001`
20. `EXT-YOUTUBE-002`
21. `BUILD-REC-001`

That sequence turns the current repo from "built tools plus manual terminal runs" into an always-on Foundation runtime, then into an extraction team that stays current, eats history safely, and feeds an operating intelligence machine that can recommend builds and prove why.

## Definition Of Nuke Power

The system is not done when it generates briefs.

The system is working when Steve can ask:

> What should we build next to make BCrew and Unchained Realtor more powerful?

And the system returns:

- Ranked recommendations.
- Evidence from internal operations.
- Evidence from external experts and market signals.
- Estimated business leverage.
- Implementation difficulty.
- Suggested owner.
- Suggested first build card.
- Risks and privacy flags.
- What changed since last week.
- What old belief this supersedes.

That is the bar.
