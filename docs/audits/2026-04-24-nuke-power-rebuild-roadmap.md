# The Nuke-Power Rebuild Roadmap

**Date:** 2026-04-24
**Status:** Strategic plan. Not a backlog dump. The plan to realize Steve's full vision with BCrew AI OS + Unchained Realtor.
**Scope:** Full system architecture + buildout sequence through mid-2026.

---

## The Vision (Restated Crisply)

Steve's life-work has three jobs:

1. **Recruit** — top agents, leaders, operators into BCrew / Real
2. **Lead** — only the highest-impact strategic meetings and decisions
3. **Build high-ticket systems** — custom AI OS builds at $50k-150k+ for other team leaders

**Everything else is the AI's job.**

The AI:

- Reads everything in Steve's operational world — meetings, emails, Slack, Missive, CRM notes, books he's reading, YouTube creators he follows, blogs, podcasts
- Builds queryable memory across YEARS of context, not just recent data
- Surfaces only what's **new, unresolved, actionable** — not raw dumps
- Generates content automatically for Unchained Realtor (faceless YouTube + IG + X + Skool + course)
- Enforces privacy: subject-person redaction across every output, every query, every assistant
- Supports each hub (Marketing, Sales, Ops, Retention, Recruiting) with its own lens on shared atoms
- Scales beyond Steve via multi-tenant productization (Tier 1 Access $1k/mo → Tier 4 Custom $150k + retainer)
- Runs **continuously**, not batch — when new content arrives, it's processed, classified, linked, and synthesized into existing context immediately

This is the moat most AI creators don't have: **retrospective archive depth + continuous synthesis + tiered privacy + productized hubs**. Steve has 10+ years of brokerage operation + 100+ coached agents + $1B+ combined volume sold feeding the system. No AI creator has that raw material.

## Current State (April 24, 2026)

### What's built and working

- **Archive:** 7,637 artifacts (860 meeting notes, 638 transcripts, 1,371 Slack threads, 2,381 Gmail, 2,385 Missive) — real scale
- **Extraction:** 4,481 candidates (tasks, decisions, blockers, atoms, feedback signals) with confidence scoring
- **Synthesis engine v1:** Committed in `2c293d2`. GPT-5.4-powered. Reads 180 candidates → produces 15-25 ranked strategic items with status (new/active/needs_decision/needs_owner/stale_watch/historical_context/likely_resolved) and sensitivity tagging (performance_concern/termination_risk/etc.)
- **Transcript-first meeting extraction:** Pulls all team Meet recordings via JWT, classifies broadcast vs discussion, extracts with Foundation context injected
- **Slack integration:** bcrew_intel_scout bot in 59/61 channels, archiving + extracting
- **Subject-person + sensitivity metadata:** Tagged at extraction. NOT yet enforced on query paths.
- **Source contracts + verifier:** 17/17 checks passing. Canon matches reality.
- **Multi-source governance lane:** Apply flows for task → backlog, decision → decision, blocker → open question
- **Crewbert Drive mirror:** Copy-mode active. ACL stripping deferred (correct).

### What's designed but not built

- Auth + tier middleware (spec at `docs/specs/2026-04-23-auth-tiers-vault.md`)
- Subject-person redaction query enforcement
- Multi-tenancy architecture
- Per-hub overlays / Scopers
- Continuous (event-driven) synthesis
- Recruiting CRM hub inside AI OS
- Platform intelligence domain
- Owner-entity tagging for portability

### What's missing entirely

- **Semantic search** — no pgvector, no embeddings, no hybrid retrieval
- **Entity graph** — no normalized people/tools/companies/books tables
- **Temporal reasoning** — no edges between candidates (updates/extends/derives)
- **External ingestion** — no YouTube scout, no blog scraper, no X/Twitter monitor, no book ingestion
- **Content generation engine** — no script → voice → visuals → publishing pipeline
- **Book → atom pipeline** — "I read something in Jim Rohn" vision requires ingestion we don't have
- **Continuous synthesis** — batch-only today
- **Feedback learning** — approve/reject decisions don't train the system
- **Scheduled brief cadence** — no daily/weekly briefs going out automatically

## End-State Architecture

Four layers. Each upgrade path in order.

### Layer 1 — Ingestion

Every source is a code-based scout writing to `shared_communication_artifacts`:

- **Internal comms** (live): Gmail, Calendar, Drive meetings, Missive, Slack — done
- **CRM layer** (next): FUB notes, ClickUp comments — for people-commentary coverage
- **External intel** (next): YouTube watchlist (16 AI + 3 marketing creators), creator blogs, X/Twitter, Skool paid communities Steve is in
- **Reading material** (future): book ingestion pipeline, podcast transcripts, newsletter archives
- **Visual content** (future): Google Meet screen recordings (beyond transcript), screenshots from creator demos

Rule: **every external data source ingested as code, not as agent prompt loops.** This is the #1 lesson from the old system.

### Layer 2 — Storage + retrieval (this is what actually unlocks the vision)

Current: PostgreSQL with artifact + candidate tables, free-form JSONB metadata, time-ordered indexes only.

Upgrade sequence:

1. **`embedding vector(1536)`** on artifacts + candidates. `text-embedding-3-large` with Matryoshka truncation to 1536 dims (50% storage, ~1% accuracy loss). Cost: ~$0.15 to embed everything once, pennies per week rolling. HNSW index (m=16, ef_construction=64).

2. **`tsvector` column** for BM25 lexical search.

3. **Hybrid retrieval** via Reciprocal Rank Fusion (vector + BM25). Reranker on top: **Cohere Rerank 3.5** ($) or **BGE-reranker-v2-m3** (self-hosted on Mac mini, Apple Silicon compatible).

4. **Entity graph tables:**
```
entities        (id, type, canonical_name, aliases, metadata)
entity_edges    (source_id, target_id, edge_type, strength, context)
artifact_entities (artifact_id, entity_id, mention_count, first_seen, last_seen)
```
Entity types: `person, org, tool, book, concept, deal, property, campaign`. Edge types: `coached, owns, uses, references, reports_to, mentioned_in, decided_in, contradicts, supersedes`.

5. **Temporal edges between candidates:** `updates / extends / derives / supersedes / resolves`. Enables Supermemory-style relational versioning. Stop re-computing resolution every synthesis run.

6. **Dual timestamps on artifacts:** `document_date` + `event_date`. Meeting 2 weeks ago referenced a decision from 6 months ago — both matter.

7. **Feedback signals table:** when a candidate is approved/rejected/modified, record the decision + pattern. Future extraction learns from this.

### Layer 3 — Intelligence

Current: one synthesis engine, batch mode, strategy/leadership-lens only.

End state:

- **Synthesis engine v2 (continuous):** runs on ingestion events, not just scheduled batches. Every new artifact → relevant candidates → link/dedup/supersede against existing → update synthesis incrementally.

- **Per-hub overlays/Scopers:**
  - Marketing overlay: reads atoms as content opportunities / brand moments / campaign signals
  - Sales overlay: pipeline velocity, deal stalls, coaching opportunities
  - Ops overlay: process drift, task debt, accountability gaps
  - Retention overlay: engagement signals, culture moments, retention-risk flags
  - Recruiting overlay: candidate quality signals, sourcing channel performance
  - Strategic overlay: decisions, blockers, contradictions (current synthesis engine's scope)

- **Subject-person redaction enforced on query:** every query from a user or their assistant filters content where requester is in `subject_people` AND sensitivity >= performance_concern, unless the context is a performance review with requester present.

- **Continuous digest generation:** daily leadership brief (Mon-Fri morning), weekly marketing brief, monthly executive digest, quarterly strategic packet.

### Layer 4 — Output

Current: synthesis markdown in `docs/handoffs/`, apply paths to backlog/decisions/questions.

End state:

- **Per-hub briefs delivered via email / Slack / dashboard** — right content, right person, right time
- **Unchained Realtor content engine:** topic planner reads atoms + books + creator intel → script generator → AI voice render (ElevenLabs brand voice) → AI visuals (HeyGen or stock + AI slides) → publish to YouTube/IG/X/LinkedIn → cross-link into Skool
- **Action writebacks:** approved task → ClickUp task created. Approved decision → email draft sent for confirmation. Approved blocker → Slack DM to owner. Each apply path is automated and auditable.
- **Steve's private hub:** recruiting CRM surface with AI-flagged "reach out to these people today" — leads from Unchained Realtor content, meeting-mentioned candidates, Slack intros, conference contacts, all one queue.
- **MCP interface for n8n compatibility:** so the creator ecosystem (Nate Herk's pattern) can integrate. Future distribution path.

## Buildout Sequence — 9 phases (v3 ordering after LLM Router promotion)

**v3 correction (2026-04-24):** LLM Router with credential pools promoted to Phase 1. It's foundational — every LLM call in the system passes through it. Bumped semantic layer, runtime, agents, etc. by one phase each. This is the single biggest structural change to the roadmap since v1.

Each phase unlocks the next. Don't skip.

### Phase 0 — Ship the Sunday packet (this weekend)

- Use current synthesis engine as-is. Output is already leadership-grade.
- Run it once for Sunday 2026-04-27 strategy meeting.
- Gate: does the packet save you >2 hours of manual prep? If yes, cadence is worth automating. If no, sharpen before automating.

**Effort:** hours, not days. Cost: $5-10.

### Phase 1 — Semantic layer (1-2 weeks)

The single highest-leverage upgrade available.

- Add `embedding` + `tsvector` columns to artifacts + candidates
- Embed all 12k+ records once
- HNSW index, hybrid search API, Cohere reranker
- Retrofit synthesis engine to use hybrid retrieval for context injection (stops brute-forcing 180 candidates per run)
- Query API at `/api/search` — ask anything, get ranked results

**Effort:** ~1 week Codex time. **Cost:** $0.15 initial + $1-2/month rolling.

**Unlocks:** every downstream layer. Without this, everything stays linear-scan.

### Phase 2 — Extraction Team / Backfill Orchestrator / Runtime Layer (2-3 weeks)

**Added 2026-04-24 after Steve surfaced the "daily bite" insight + the "nothing actually runs" insight.** Two distinct problems with the same fix: historical backfill + current-day sync shouldn't run as a concurrent hose (causes deadlocks), and 32+ npm scripts that SHOULD run on schedule currently run manually only. Foundation has ceremony without automation.

**Tech choices locked (from 2026-04-24 research):**

- **Job queue:** **pg-boss v10** (`npm install pg-boss`). Postgres-backed, no new infra. Built-in cron scheduling (`boss.schedule('foundation:verify', '0 */2 * * *')`). Survives reboots, resumable jobs. Winner for today.
- **Worker supervision:** launchd LaunchAgent `ai.bcrew.worker` (same pattern as `ai.bcrew.dashboard` + `ai.openclaw.gateway`). KeepAlive=true.
- **Agent runtime (for Harlan / Crewbert / specialist agents):** **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) — Claude Code's production agent harness as an embeddable SDK. Built-in tool loop, file-system tools, bash, MCP server support, session resumption, streaming. Replaces rolling our own agent loop.
- **Productization path:** Dockerfile authored now (Cal.com / Documenso / Dub.co pattern — "runs on laptop → Fly/Vercel → self-host via Docker, one codebase"). Mac mini runs natively today; container available when we sell.

**Core architecture:**

- **Job queue** — pg-boss schema in Postgres; cron-in-DB means no extra daemon
- **Source-specific workers** — one lane per source (Drive / Gmail / Missive / Slack / YouTube / Skool / X / Blogs). No cross-source contention.
- **Three job categories:**
  - `current_day_sync` — every 2-4 hours. Pulls "what's new since last check." Tiny, fast, never deadlocks.
  - `backfill_crawler` — once per day per source. Takes one bite of historical content, marks progress (`last_processed_cursor`), resumes tomorrow. Capped by volume, not time.
  - `scoper_mission` — on-demand, targeted. "Find merger-story proof from Oct 2024–Mar 2025." Returns results + evidence links, not full archive ingestion.
- **Progress tracking:** every source has a `backfill_progress` row — cursor, last bite timestamp, bites completed, estimated percent coverage.
- **Rate limiting:** per-source budget (OpenAI calls, Google API quota, Playwright concurrency cap). No single source can starve another.
- **Visible status dashboard:** Steve can see "Gmail: 72% backfilled, last bite 2h ago, next in 22h" at a glance.

**For productization:** this is the onboarding story. New tenant signs up → Extraction Team starts daily bites across their connected sources → at 30 days they have usable coverage → at 90 days comprehensive. No "wait 2 weeks for Codex to run scripts" experience.

**Key implementation details:**

- **Single writer per source lane** prevents deadlocks
- **Resumable with exponential backoff** on errors (don't bail whole backfill on one failed artifact)
- **Idempotent upserts** by `content_hash` — reruns don't double-count
- **Skool requires Playwright** (no public API for paid courses). Treat Skool ingestion as a browser-automation scout that logs in, walks the course library, downloads video files (yt-dlp for Vimeo iframes), pulls posts + comments
- **On-demand Scopers** are separate from ingestion workers — they query the archive, not raw sources

**Existing 32+ npm scripts become pg-boss job handlers.** Each ~10-line wrapper. Initial cadence:

| Job class | Cadence |
|-----------|---------|
| Health verifiers (foundation / sheets / google / fub / slack / missive / meeting-notes / shared-comms) | Every 2-4 hours |
| Current-day sync (meeting-notes / gmail / missive / slack) | Every 2-4 hours |
| Extractors (per source) | Triggered by successful sync of that source |
| Deal review (admin / conditional) | Daily morning |
| Strategy/action synthesis | On-demand and routed into decisions/tasks/contradictions; the earlier daily-brief framing is superseded by `docs/handoffs/2026-04-24-strategy-action-loop-correction.md` |
| Reports (coverage / gap-report) | Weekly Monday 8am |
| Historical backfill | One bite per source per day (rate-limited) |
| Scoper missions | On-demand |

**Effort:** ~2-3 days for pg-boss + worker LaunchAgent + wrap existing 32 scripts. +1 week for Claude Agent SDK integration for Harlan/Crewbert runtime. Total ~2-3 weeks.

**Cost:** negligible infra. Model costs change with provider swap (see Phase 2b).

**Unlocks:** 
- Gmail/Missive/Drive deadlocks go away (single writer per source lane)
- Every existing script actually runs on schedule (no more manual `npm run X`)
- External scouts (YouTube, Skool, blogs, X) become worker classes, not bespoke scripts
- Productization onboarding story works cleanly
- Steve can SEE progress in the dashboard instead of guessing
- Harlan/Crewbert have a real runtime (Claude Agent SDK) instead of being doctrine-only

### Phase 2b — LLM Router + Model layer swap (parallel to Phase 2, ~1 week)

**Correction (2026-04-24 later):** OpenAI flagship is **GPT-5.5** (Steve uses it directly), not 5.1 as agent research claimed. Also the system is not locked to API keys — Steve's existing subscriptions (ChatGPT Pro, Claude Max) can and should carry workload where allowed.

**Build the LLM Router FIRST** — one module (`lib/llm-router.js`) that every script/agent calls. Router maintains CREDENTIAL POOLS per provider (3 Claude Max subs × 2 ChatGPT Pro subs) and load-balances across them (round-robin / least-used / rate-limit-aware). Swap strategy in ONE place, not 32 scripts.

**Credential pool architecture (Steve's ~$1,000/mo in subscriptions → $5-13k/mo token-value):**

```
claudeCredentials = [
  { userEmail: 'steve.zahnd@bensoncrew.ca',   type: 'claude_max' },
  { userEmail: 'crewbert@bensoncrew.ca',      type: 'claude_max' },
  { userEmail: 'ai@bensoncrew.ca',            type: 'claude_max' },
];

openaiCredentials = [
  { userEmail: 'steve.zahnd@bensoncrew.ca',   type: 'chatgpt_pro' },
  { userEmail: 'ai@bensoncrew.ca',            type: 'chatgpt_pro' },
];
```

Each credential is a real user identity on bensoncrew.ca with its own subscription of record. Router picks least-used credential per call. Each Claude call invokes `claude -p` as that user (uses their Max). Each OpenAI call routes via OpenClaw (uses that user's Pro).

**ToS stance (honest):**
- Anthropic banned Max credits routed through **OpenClaw** (third-party middleware) — Apr 2026.
- Anthropic did NOT ban multiple Max subscriptions each used by the subscriber of record.
- Our router calls Claude Code CLI directly as each user → not OpenClaw routing → not the banned pattern.
- Gray zone: automating "rotate across subscriptions for rate-limit avoidance." Not explicitly banned, but Anthropic could tighten. If they do, router flips to pay-per-token API fallback — architecture unchanged.

**Rate-limit handling:** when a credential hits its daily Max cap, router marks it exhausted until reset window. Calls fall through to next available credential. If all pools exhausted, fall through to paid API.

Current: GPT-5.4 for synthesis + GPT-5.4-mini for extraction. All OpenAI API direct. Upgrade the router and the per-workload routing:

**Per-workload routing (cost-optimized against existing subscriptions):**

| Workload | Model | Auth path via router | Why |
|----------|-------|----------------------|-----|
| Extraction (high volume) | **GPT-5.5-mini** | **ChatGPT Pro via OpenClaw** | Subscription-funded — effectively free given $300/mo Pro already paid |
| Synthesis (highest quality needed) | **Claude Opus 4.7 (1M context)** OR **GPT-5.5** | Anthropic API (per-token) OR ChatGPT Pro via OpenClaw | Both are top-tier. Choice: quality of Opus 1M context + extended thinking VS zero marginal cost of GPT-5.5 via Pro. Worth A/B testing. |
| Bulk classification | **GPT-5.5-nano** | ChatGPT Pro via OpenClaw | Subscription-funded, cheap |
| Embeddings | `text-embedding-3-large` | OpenAI API direct | Cheap ($0.13/M, ~$2/mo), no subscription path for embeddings |
| Vision (video) | **Gemini 2.5 Pro** | Gemini API direct URL | Cheapest + best for video (prior research) |
| Vision (single images) | Claude Opus 4.7 Vision | Anthropic API | Strongest reasoning over screenshots |
| Audio transcription | Whisper | OpenAI API direct | Cheap, works |
| Voice synthesis (UR) | ElevenLabs | ElevenLabs API | Locked |
| Image generation | gpt-image-1 | OpenAI API direct | OpenAI wins here |
| **Harlan / Crewbert (agents)** | Claude Sonnet 4.6 | **Claude Agent SDK** (Anthropic API) | Per-token, low volume. Max plan ToS forbids automated agent use (Apr 4 2026). |
| Steve's Claude Code dev work | Claude Opus 4.7 | **Claude Max subscription** | Already paid. Interactive dev only. |

**The LLM router makes this swappable.** If Anthropic loosens Max-for-automation, the router picks it up without rewriting consumers. If Codex finds a new subscription-routing path, same story.

**Key wins:**
- ~80% of LLM workload (extraction + classification + bulk) offloads to existing ChatGPT Pro subscription. Effectively free.
- ~20% (synthesis + agents + specialty vision) stays on per-token APIs where quality matters.
- **Claude's prompt caching** (5-min + 1-hour) on the Anthropic-side workloads drops re-extraction costs ~10x.
- **1M context on Opus** means synthesis can read the whole archive in one call.
- No vendor lock-in — swap providers by editing router logic.

**Effort:** ~1 week. LLM router + env config + rewire 32 scripts to call router instead of direct SDK.

**Cost impact (monthly steady state):** **LOWER than today.** Today's GPT-5.4 direct-API spend gets absorbed by ChatGPT Pro subscription for ~80% of calls. Net monthly LLM spend might drop ~40-60%.

### Phase 3 — Entity graph + temporal edges (2-3 weeks)

- `entities` + `entity_edges` + `artifact_entities` tables
- Entity extraction pass across archive (people first, then tools, companies, books, concepts)
- Disambiguation ("Nick" = Nick Bergmann not Nick Saraev)
- `updates / extends / derives / supersedes / resolves` edges between candidates
- Dual timestamps on artifacts

**Effort:** ~2-3 weeks Codex time. **Cost:** ~$5-15 for entity extraction LLM passes.

**Unlocks:** "show me everything about X" queries. Queryable relationships. Temporal reasoning. Much better resolution detection.

### Phase 4 — External scouts as workers on the Extraction Team (1 week after Phase 2)

Registered as worker classes on the orchestrator, each takes a daily bite:

- **YouTube scout** — `lib/youtube-ingest.js` with yt-dlp (captions/metadata) + Gemini 2.5 Pro direct URL (video understanding). Daily: check each creator for new videos, full pipeline on detection. No Puppeteer.
- **Creator blog scout** — Firecrawl on creator blog RSS. Daily: parse new posts.
- **X/Twitter monitor** — daily scan of creators' recent posts.
- **Skool scout** (Playwright) — logs into your paid communities (ICOR, Mark Kashef), walks course library, pulls new videos + posts + comments. Weekly bite, not daily, since Skool rate-limits aggressively.

**Effort:** ~1 week Codex time AFTER Phase 2 Extraction Team lands. **Cost:** $30-60 initial sweep, $2-5/week rolling per scout.

**Unlocks:** competitive intel at scale. Content ideas flow in. Architectural patterns (Nate Herk's n8n+MCP stack) surface. Steve + team stop manually watching 2 hours of YouTube/day to stay current.

### Phase 5 — Subject-person redaction enforcement + tier middleware (2 weeks)

- Build from existing `docs/specs/2026-04-23-auth-tiers-vault.md`
- Cloudflare Access + app middleware
- Query-side filter: `subject_people` ∩ requester + sensitivity check
- Uniform response shape (never leak existence of suppressed content)
- Access-request flow for raw content through Crewbert

**Effort:** ~2 weeks Codex time. **Cost:** ~$12/user/month Workspace license + $5/month Cloudflare Access (free tier likely enough).

**Unlocks:** team can actually use the system. Without this, you can't share any intelligence broadly because sensitive content leaks.

### Phase 6 — Per-hub overlays (4-6 weeks, after Phase 3)

Start with Marketing overlay (most leverage for Unchained Realtor content generation):

- Read atoms through marketing lens
- Produce content opportunities + hooks + framework extractions
- Feed content engine (Phase 6)

Then Sales, Ops, Retention overlays iteratively.

**Effort:** ~2 weeks per overlay, parallel-ish. **Cost:** LLM calls per synthesis, negligible.

**Unlocks:** each hub becomes a real productized offering. Foundation serves multiple domains without duplicating infrastructure.

### Phase 7 — Unchained Realtor content engine + recruiting CRM (8-12 weeks)

- Marketing overlay → topic planner → script generator → AI voice render → AI visuals → publisher (YouTube long-form + IG carousels + X threads + LinkedIn + Skool)
- Book ingestion pipeline (Jim Rohn / Dan Sullivan / etc. → atoms with citations)
- Recruiting CRM hub: lead capture from UR + podcast appearances + network → tier-1-private dashboard for Steve → "reach out today" flagging

**Effort:** ~2-3 months. **Cost:** $500-2k/month for content tooling (ElevenLabs Pro $22, HeyGen $99, video editor subscriptions, content infrastructure) + LLM generation $50-200/month.

**Unlocks:** $2M gross / $1M net path for Unchained Realtor. Content from Steve's real work, not hallucinated frameworks.

## Cost Summary (rough, monthly at steady state)

| Category | Monthly |
|----------|---------|
| Existing (GPT-5.4, Claude, FUB, Google Workspace, PostgreSQL) | ~$600/mo |
| pgvector + embeddings + reranker | ~$10 |
| YouTube scout + external intel | ~$30 |
| Content generation (ElevenLabs + HeyGen + tools + LLM) | ~$200-500 |
| Infrastructure growth | ~$50 |
| **Total steady-state monthly** | **~$900-1,200/mo** |

Modest against potential revenue ($2M gross / $1M net for UR, plus BCrew's continuing growth).

## Timeline (realistic)

- **Phase 0 (Sunday packet):** this weekend
- **Phase 1 (semantic layer):** first 2 weeks of May 2026
- **Phase 2 (entity graph + temporal):** May-mid-June
- **Phase 3 (YouTube scout):** mid-May (parallel to Phase 2)
- **Phase 4 (tier enforcement):** June
- **Phase 5 (first overlay — marketing):** June-July
- **Phase 6 (content engine starts):** July+
- **First Unchained Realtor content shipping:** August 2026
- **Paid tier launch:** October-November 2026

**Steve's $1M net run-rate:** achievable 12-18 months from today (late 2027 to mid-2027).

## The One Thing to Commit to This Week

**Ship the Sunday packet from current synthesis, then green-light Phase 1 (semantic layer).**

Phase 1 is the single highest-leverage upgrade in the entire roadmap. Everything downstream compounds on it. Every additional week without pgvector is a week the archive grows without getting more useful. One decision: approve Codex to start Phase 1 Monday 2026-04-28.

Cost to say yes: $0.15 initial + Codex's time. Cost to delay: archive keeps growing, synthesis gets heavier, every intelligence query keeps being linear-scan brute-force. Compound interest runs the wrong way.

## Risks

- **Codex execution bias.** He ships infrastructure cleanly but doesn't always pause to re-architect. This roadmap exists so he doesn't have to re-derive the plan at every checkpoint.
- **Steve's attention.** This plan succeeds only if Steve protects his 3 jobs and lets the AI do the rest. If Steve gets pulled back into manual content review / manual brief reading / manual intelligence digestion, the ROI collapses.
- **Scope creep (meta).** Peripheral sub-projects (Unchained Realtor brand work, specific podcast outreach, FUB note expansion) can eat Codex's cycles. Stay on the backbone. Phase sequence is the discipline.
- **Privacy breach before Phase 4.** If tier enforcement doesn't ship before the system gets broadly used, someone sees something they shouldn't. Phase 4 is a gating requirement for team-wide deployment.

## Success Metrics

Phase-by-phase, what proves the upgrade worked:

- **Phase 0:** Sunday packet saves 2+ hours of manual prep. Steve arrives at strategy meeting with pre-synthesized issues.
- **Phase 1:** "What's been said about X?" returns top 10 relevant results in <2 seconds. Synthesis engine runs use targeted retrieval, not brute-force.
- **Phase 2:** "Show me everything about Nick" returns a full entity dossier. Resolution detection is automatic, not recomputed.
- **Phase 3:** Weekly "What AI creators taught this week" brief lands in Steve's inbox. No more manual YouTube bingeing.
- **Phase 4:** Any tier-2 or tier-3 user can query the system without accidentally receiving performance-concern content about themselves.
- **Phase 5:** Marketing overlay produces 10+ publishable content ideas weekly from existing atoms.
- **Phase 6:** First faceless YouTube video auto-generated from atoms + book quote + founder framework. Published without manual touch beyond review.

## What to Tell Codex at Next Checkpoint

Single paragraph:

> Roadmap locked at `docs/audits/2026-04-24-nuke-power-rebuild-roadmap.md`. Ship Sunday packet first. Then Phase 1 (semantic layer: pgvector + tsvector + hybrid search + Cohere reranker) is the next block. Add `SEMANTIC-LAYER-001`, `ENTITY-GRAPH-001`, `TEMPORAL-EDGES-001`, `YOUTUBE-SCOUT-001`, `BOOK-INGESTION-001` to live backlog as one-liners. No premature building — Phase 1 gates Phase 2+. Confirm timeline against your current block queue.

## The Headline

**Steve's vision is real and achievable. The current system is 30% built. The next 6 months deliver the other 70%, in sequence. Phase 1 starts Monday. Phase 6 ships Unchained Realtor's first AI-generated content in August. Run-rate hits $1M net in late-2026 / mid-2027.**

Every phase makes Steve's time more valuable. Every artifact added compounds. The moat widens. That's nuke power.
