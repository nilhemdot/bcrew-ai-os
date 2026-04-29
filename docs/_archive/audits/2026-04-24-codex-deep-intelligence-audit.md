# Codex Deep Intelligence Audit

Date: 2026-04-24
Auditor: Codex
Scope: Review Claude Code's audit/roadmap, verify current repo and database state, check current external technical sources, and produce the corrected plan for a nuke-power intelligence system.

## Executive Verdict

Claude's direction is right, but the plan needs correction before the builder starts.

The system is not blocked by lack of vision. It is blocked by four engineering gaps:

1. Retrieval is not real yet. The archive is large, but memory is still mostly time-ordered Postgres rows plus LLM batch synthesis.
2. Extraction coverage is uneven. The archive grew faster than candidate extraction, so thousands of artifacts are stored but not yet converted into useful candidates.
3. External intelligence is not a code-owned source family yet. Old scouts proved output value, but they were prompt-loop scouts and broke under runtime/tool friction.
4. Output cadence has not been productized. Old system shipped daily/weekly briefs. New system has a better substrate but needs scheduled, governed outputs.

The corrected plan:

1. Ship a Sunday/leadership packet now using synthesis v1.
2. Add a job/cost/coverage ledger so backfills, extraction, embedding, and synthesis are supervised.
3. Build chunk-level hybrid retrieval, not raw artifact embedding columns.
4. Add entity and temporal edges after retrieval proves useful.
5. Build YouTube/external scout MVP official-first, Gemini-video-first, no Playwright screenshot default.
6. Port old report cadence as consumer views over the new substrate.

## Repo Truth Observed

Git status at audit start:

- `main...origin/main`
- untracked: `docs/audits/2026-04-24-nuke-power-rebuild-roadmap.md`

I did not edit that file. It appears to be Claude's roadmap.

Current implementation that is real:

- `shared_communication_artifacts`
- `shared_communication_candidates`
- `shared_communication_synthesis_runs`
- `shared_communication_synthesized_items`
- `scripts/generate-shared-comms-synthesis.mjs`
- `/api/shared-communications/synthesis`
- `/api/shared-communications/coverage`
- `npm run shared-comms:coverage`
- `npm run foundation:verify`

Synthesis v1 is real. It is not a fake doc layer. The latest persisted run I saw:

- `synth-20260424T031259Z-d7104af839`
- model: `gpt-5.4`
- candidates read: `180`
- ranked items: `12`
- output: `docs/handoffs/2026-04-23-shared-comms-synthesis-source-facts-proof.md`

The ranked output is leadership-grade enough for a Sunday packet. It surfaces issues like automation degradation, source-trust problems, KPI dashboard failures, finance normalization, SocialPilot instability, and lead-source attribution.

## Current Data Reality

The database changed while this audit ran, likely because the main builder is active. The latest direct content-size query during this audit showed:

- total artifacts: `10,035`
- total artifact content: `132,601,260` characters
- rough token estimate: `33.1M` to `40.2M` tokens
- candidates: `4,481`
- candidate text: about `425k` estimated tokens

By source and artifact type:

| Source | Type | Artifacts | Avg chars | Median chars | P95 chars |
| --- | --- | ---: | ---: | ---: | ---: |
| `SRC-GMAIL-001` | `email_thread` | `4,109` | `15,916` | `3,362` | `51,233` |
| `SRC-MEETINGS-001` | `meeting_note` | `860` | `41,724` | `34,687` | `108,599` |
| `SRC-MEETINGS-001` | `meeting_transcript` | `638` | `46,451` | `42,049` | `98,988` |
| `SRC-MISSIVE-001` | `missive_thread` | `3,056` | `412` | `277` | `1,381` |
| `SRC-SLACK-001` | `slack_thread` | `1,371` | `310` | `145` | `779` |

Important correction to Claude's cost/math:

- Embedding candidates is tiny.
- Embedding raw artifacts is still cheap in API dollars, but not `$0.15`.
- Raw artifact rows cannot simply be embedded as one vector because many meeting/email artifacts exceed normal embedding input limits.
- The right unit is a chunk, not an artifact.

Unprocessed artifact reality:

| Source | Artifacts | Candidates | Artifacts with no candidate |
| --- | ---: | ---: | ---: |
| `SRC-GMAIL-001` | `3,947+` observed in distinct query | `226` | `3,863` |
| `SRC-MEETINGS-001` | `1,498` | `3,921` | `1,138` |
| `SRC-MISSIVE-001` | `2,990` | `244` | `2,912` |
| `SRC-SLACK-001` | `1,371` | `90` | `1,299` |

This does not mean every artifact should produce candidates. Promotional/noise threads should produce zero. But it does mean the system needs an explicit extraction coverage ledger, not just total archive counts.

## Review Of Claude's Roadmap

### Correct

- New architecture is structurally better than the old agent sprawl.
- Synthesis v1 is real and useful.
- Old system's remaining advantage was output cadence.
- External scouts should be code-owned routines, not skill-only agent loops.
- Semantic retrieval is the highest leverage next capability.
- Entity graph and temporal edges are the right next memory pattern.
- YouTube should feed the same artifact/candidate/synthesis substrate.
- Hub overlays should read shared atoms/candidates rather than duplicate ingestion.

### Needs correction

1. Do not add only `embedding` columns to artifacts/candidates.

   Add a `shared_communication_chunks` table. Meetings and email threads are often too large to embed as one record. Chunking also gives better source retrieval.

2. Do not assume pgvector is available.

   Local Postgres 17 currently shows only `pg_trgm` as available among checked extensions. `vector` is not available yet. Phase 1 includes installing/enabling pgvector or using a temporary lexical-only fallback.

3. Do not claim the initial embedding cost is `$0.15`.

   Current raw artifact content is roughly 33-40M estimated tokens. At current OpenAI `text-embedding-3-large` pricing, this is still low single-digit dollars plus chunk overhead, but it is not pennies. The right implementation should log actual token/cost per embedding run.

4. Do not treat YouTube Playwright screenshots as the default.

   Current Gemini docs support direct YouTube URL video understanding for public videos. Use Gemini video understanding first. Playwright screenshots should be reserved for user-authorized private training pages or fallback manual review, not bulk YouTube ingestion.

5. Do not bury privacy until late.

   Subject-person redaction is already tagged in candidate metadata but not enforced on query paths. Any search/brief API must include redaction from the start.

6. Do not skip job supervision.

   Archive totals changed during this audit. That is fine for an active system, but it proves the need for run ledgers, cursor ledgers, coverage ledgers, and cost ledgers before more automation.

## External Research Findings

### YouTube and video understanding

Google's current Gemini docs say Gemini can process video from audio and visual streams and can accept YouTube URLs directly. The YouTube URL feature is preview, public-video-only, and limits/rates/pricing can change. Gemini docs also support frame-rate and media-resolution controls for video processing.

Implication:

- Default YouTube intelligence path should be Gemini video understanding from public YouTube URLs.
- Use model tiers:
  - bulk pass: stable/cheap Gemini video-capable model
  - deep pass: Gemini 3 Pro/Flash preview only for high-value videos where the quality gain matters
- Store timestamped visual descriptions and source links first.
- Store actual frames/screenshots only when authorized and operationally necessary.

YouTube Data API is the right discovery layer for channels/videos/playlists. The official docs identify channels, playlist items, videos, search, comments, and captions as API resources. Caption download exists as an API method, but caption access and API policy are not the same as unlimited transcript scraping.

Implication:

- Use YouTube Data API for source discovery and freshness.
- Use Gemini URL analysis for multimodal understanding.
- Use captions/transcript extraction as fallback only where policy and access allow.
- Store derived intelligence, not full copied video/caption/frame archives by default.

### Memory and retrieval patterns

Current memory systems have converged on the same practical shape:

- atomic facts or candidates
- source-chunk retrieval
- hybrid lexical + vector search
- entity-aware retrieval
- temporal invalidation or supersession

Zep/Graphiti's public docs emphasize temporal knowledge graphs, fact invalidation, and valid/invalid dates in memory context. That maps directly to our candidate-edge need.

Supermemory's research page reports strong LongMemEval-S performance using atom/source retrieval patterns, but it is vendor-reported. Treat the exact benchmark number as marketing until independently reproduced. Still, the pattern is sound: retrieve small facts, then bring original source chunks for evidence.

OpenAI's embedding docs confirm `text-embedding-3-large` defaults to 3072 dimensions and can be shortened with the `dimensions` parameter. pgvector's docs show `vector` supports up to 2,000 dimensions, so use `dimensions: 1536` for a normal `vector(1536)` column, or explicitly choose `halfvec` if we later want 3072 dimensions.

PostgreSQL full-text search is still required. The official docs are clear that ranking is application-specific and lexical ranking can be combined with other signals. Vector-only search will miss exact names, tool names, transaction IDs, and source IDs.

## Corrected Target Architecture

### 1. Source artifact layer

Keep `shared_communication_artifacts` as raw source archive.

Add external types:

- `youtube_video`
- `creator_blog_post`
- `creator_social_post`
- `newsletter_issue`
- `skool_training_item`
- `book_note`
- `podcast_episode`

But do not just widen the check constraint blindly. Add source contracts first:

- `SRC-YOUTUBE-001`
- `SRC-CREATOR-BLOGS-001`
- `SRC-SKOOL-TRAINING-001`
- `SRC-BOOK-NOTES-001`

Each source contract needs:

- authorized access boundary
- allowed storage policy
- freshness cadence
- owner
- output consumers
- privacy/copyright notes

### 2. Chunk retrieval layer

Add:

```sql
CREATE TABLE shared_communication_chunks (
  chunk_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_hash TEXT NOT NULL,
  start_char INTEGER,
  end_char INTEGER,
  token_estimate INTEGER,
  embedding vector(1536),
  search_vector tsvector,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (artifact_id, chunk_index)
);
```

Indexes:

- HNSW on `embedding vector_cosine_ops`
- GIN on `search_vector`
- B-tree on `(source_id, artifact_type, artifact_id, chunk_index)`
- optional partial indexes by source/type if needed

Chunking rules:

- meetings/transcripts: speaker/section-aware chunks when possible
- email threads: message-aware chunks
- Slack/Missive: thread/message-aware chunks
- books/notes: section/page-aware chunks with citation metadata
- overlap only when the source has long continuous prose

### 3. Candidate retrieval layer

Add candidate embedding/search too, but candidate vectors are secondary to chunk vectors.

```sql
ALTER TABLE shared_communication_candidates
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS search_vector tsvector;
```

Use candidate search for "what are the open issues?" Use chunk search for "show me evidence and context."

### 4. Hybrid search API

Build `/api/intelligence/search`.

Inputs:

- query
- source filters
- date range
- artifact types
- candidate statuses
- requester identity/tier
- redaction mode

Retrieval:

1. lexical search via `tsvector`
2. vector search via pgvector
3. entity match when entity tables exist
4. RRF fusion
5. optional rerank on top 50
6. return top chunks/candidates with evidence snippets

Hard rule:

- every search path must apply subject-person redaction before returning content.

### 5. Entity graph

Start in Postgres. Do not add Neo4j.

```sql
CREATE TABLE entities (
  entity_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE artifact_entities (
  artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  mention_count INTEGER NOT NULL DEFAULT 1,
  evidence TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (artifact_id, entity_id)
);

CREATE TABLE entity_edges (
  edge_id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  target_entity_id TEXT NOT NULL REFERENCES entities(entity_id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,
  strength NUMERIC(4,3),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  observed_at TIMESTAMPTZ,
  source_artifact_id TEXT REFERENCES shared_communication_artifacts(artifact_id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

Initial entity types:

- person
- org
- tool
- platform
- book
- creator
- concept
- deal
- campaign
- source_contract

### 6. Candidate temporal edges

```sql
CREATE TABLE shared_communication_candidate_edges (
  edge_id TEXT PRIMARY KEY,
  source_candidate_key TEXT NOT NULL REFERENCES shared_communication_candidates(candidate_key) ON DELETE CASCADE,
  target_candidate_key TEXT NOT NULL REFERENCES shared_communication_candidates(candidate_key) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,
  confidence NUMERIC(4,3),
  evidence TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Edge types:

- duplicates
- updates
- extends
- contradicts
- resolves
- supersedes
- derives_from

This is the Zep/Supermemory-style upgrade that turns candidate lists into memory.

### 7. Job, cost, and coverage ledger

Add a generic intelligence job ledger before serious automation:

```sql
CREATE TABLE intelligence_jobs (
  job_id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  source_id TEXT,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  cursor_in JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor_out JSONB NOT NULL DEFAULT '{}'::jsonb,
  artifacts_read INTEGER NOT NULL DEFAULT 0,
  artifacts_written INTEGER NOT NULL DEFAULT 0,
  candidates_written INTEGER NOT NULL DEFAULT 0,
  chunks_written INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

This should cover:

- Gmail backfill
- Missive backfill
- Slack sync
- meeting sync
- extraction
- chunking
- embedding
- synthesis
- YouTube discovery
- YouTube video analysis
- brief generation

Without this, "coverage" will keep living in chat memory.

## YouTube Intelligence System

### Watchlist

Seed the watchlist from Steve's list:

Priority paid/private:

- ICOR with Tom / AI Productivity
- Mark Kashef / Prompt Advisers / Skool

AI/operators:

- Nate Herk
- Chase AI
- Dan Martell
- Nick Saraev
- Paul J Lipsky
- Linking Your Thinking / Nick Milo
- Mansel Scheffel
- AI News & Strategy Daily
- Ray Amjad
- Alex Finn
- Jono Catliff
- Chris Bradley
- Ambitious AI
- Brad AI & Automation

Marketing:

- Neil Patel
- Russell Brunson
- Alex Hormozi

Normalize these into `creator_watchlist`:

```sql
CREATE TABLE creator_watchlist (
  creator_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  priority TEXT NOT NULL,
  source_category TEXT NOT NULL,
  youtube_channel_id TEXT,
  youtube_channel_url TEXT,
  blog_url TEXT,
  skool_url TEXT,
  x_url TEXT,
  linkedin_url TEXT,
  access_boundary TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

### Ingestion flow

1. Discover channel uploads using official YouTube Data API.
2. Store video metadata and source URL.
3. For each new/high-priority video, run Gemini video analysis by URL.
4. Ask for structured output:
   - thesis
   - tools demonstrated
   - workflows shown
   - prompts shown
   - UI screens or visual moments with timestamps
   - architecture patterns
   - claims requiring verification
   - business applications for BCrew
   - content ideas for Unchained Realtor
   - source confidence
   - "adopt/adapt/ignore" recommendation
5. Store a `youtube_video` artifact containing derived notes, timestamp links, and visual descriptions.
6. Run standard candidate extraction.
7. Run weekly creator synthesis.

### Why not Playwright by default

Playwright screenshots are fragile and have higher policy risk when used to bulk-capture third-party YouTube videos.

Use Playwright only for:

- user-authorized paid training pages where Steve has access and terms allow personal/internal notes
- browser-only demos where Gemini URL analysis cannot access the content
- manual evidence capture for internal review

For public YouTube:

- prefer Gemini video understanding
- store timestamp links and visual descriptions
- avoid storing raw frames unless specifically required and allowed

### MVP

Do not start with 200 videos.

Start with:

- 5 creators
- 3 latest videos each
- one bulk model
- one deep model
- one weekly "creator intel" brief

Then scale to last 10 videos per creator after quality/cost are measured.

## Old System Output Shapes To Preserve

The old system's best output was not its agent architecture. It was the report shape.

Preserve these patterns:

- scout health at the top
- top 3 actions
- action windows
- source citations
- owner
- confidence/score
- cross-source validated patterns
- dead/noise suppression
- platform updates
- playbook flags
- action items for the director

Do not preserve:

- 100+ independent agents
- skill-only source readers
- prompt-loop browser automation
- stale markdown as live truth
- markdown reports with no source-backed DB record

New brief schema should live in DB:

```sql
CREATE TABLE intelligence_brief_runs (
  brief_run_id TEXT PRIMARY KEY,
  brief_type TEXT NOT NULL,
  audience TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_run_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  synthesis_run_id TEXT,
  output_path TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

Brief types:

- sunday_strategy_packet
- daily_leadership_brief
- weekly_creator_intel
- weekly_marketing_intel
- weekly_ops_intel
- source_trust_brief

## Recommended Build Sequence

### Phase 0: Use what exists now

Time: 1 day

- Run synthesis v1 for Sunday/leadership packet.
- Produce one short owner-ready packet, not a giant report.
- Record whether it saved Steve at least 2 hours.

Do not wait for YouTube or pgvector to prove the existing synthesis output.

### Phase 1: Supervision and coverage truth

Time: 2-4 days

- Add `intelligence_jobs`.
- Add extraction coverage report:
  - artifacts by source/type
  - artifacts with zero candidates
  - candidate density
  - latest extraction run by source
  - oldest/newest coverage by source
  - token/cost totals
- Stop relying on chat claims like "full 180-day backfill."

Gate:

- `/api/shared-communications/coverage` shows archive coverage and extraction coverage separately.

### Phase 2: Chunk-level search foundation

Time: 1 week

- Install/enable pgvector for Postgres 17, or explicitly document fallback if not possible.
- Add `shared_communication_chunks`.
- Chunk all artifacts idempotently.
- Add `search_vector` and lexical search first.
- Embed candidates and chunks with `text-embedding-3-large` using `dimensions: 1536`, or use a cheaper model if eval proves enough.
- Add HNSW vector index and GIN lexical index.

Gate:

- "What has been said about SocialPilot?" returns evidence-backed chunks in under 2 seconds.
- Sensitive subject-person content is filtered.

### Phase 3: Hybrid retrieval into synthesis v2

Time: 1 week

- Build RRF search across:
  - chunk vector
  - chunk lexical
  - candidate vector
  - candidate lexical
- Rewrite synthesis input selection:
  - no more fixed "top 180 pending by type/date"
  - retrieve by active operating themes and source-backed facts
  - include original source chunks as evidence
- Add brief output schema and first scheduled cadence.

Gate:

- daily leadership brief and weekly creator/marketing brief can run without manual context assembly.

### Phase 4: Entity graph and temporal edges

Time: 2 weeks

- Add entity tables.
- Extract people/tools/platforms/books/creators/concepts.
- Add candidate edge table.
- Start with high-confidence edges only:
  - duplicate
  - resolves
  - supersedes
  - extends
- Add entity dossier endpoint.

Gate:

- "Show me everything about Nick Saraev" and "show me everything about SocialPilot" return coherent, deduped, dated dossiers.

### Phase 5: YouTube scout MVP

Time: 1 week after retrieval foundation

- Add `creator_watchlist`.
- Add YouTube discovery script.
- Add Gemini video analysis script.
- Add `youtube_video` artifact support.
- Analyze 15 videos first.
- Produce first `weekly_creator_intel` brief.

Gate:

- brief returns 5-10 concrete adopt/adapt/ignore recommendations with timestamps and source links.

### Phase 6: External source family

Time: ongoing

- creator blogs/RSS
- newsletters
- public social
- paid Skool/community notes only when authorized
- book-note pipeline

Rule:

- no paywall scraping
- no fake ownership of other people's ideas
- cite source inspiration
- store Steve's takeaways and operational applications, not copied books or wholesale transcripts

### Phase 7: Hub overlays

Time: after Phase 3/4

Start with Marketing overlay because it monetizes fastest:

- marketing content opportunities
- recruiting hooks
- proof points from internal archive
- platform intelligence
- creator patterns
- book-note lessons

Then Sales, Ops, Retention, Recruiting.

## What The Main Builder Should Do Next

Immediate pasteable instruction:

> Treat `docs/audits/2026-04-24-codex-deep-intelligence-audit.md` as the corrected implementation plan. Do not start with raw `embedding` columns only. First ship the Sunday packet using synthesis v1. Then add `intelligence_jobs` plus extraction coverage truth. Then build `shared_communication_chunks` with lexical search, pgvector install, 1536-dim embeddings, HNSW index, and hybrid RRF retrieval. YouTube scout starts only after retrieval foundation, with Gemini video URL analysis as default and Playwright screenshots only as authorized fallback.

Backlog cards to add or adjust:

- `INTEL-JOBS-001`: run/cost/cursor ledger for all ingestion, extraction, embedding, synthesis, and external scout jobs
- `RETRIEVAL-001`: chunk-level lexical search over shared communications
- `RETRIEVAL-002`: pgvector install plus 1536-dim chunk/candidate embeddings
- `RETRIEVAL-003`: hybrid RRF search API with subject-person redaction
- `SYNTHESIS-V2-001`: retrieval-grounded synthesis input selection and evidence chunk injection
- `CREATOR-WATCHLIST-001`: normalized creator/source watchlist
- `YOUTUBE-SCOUT-001`: YouTube Data API discovery plus Gemini video analysis MVP
- `BRIEF-CADENCE-001`: DB-backed daily/weekly brief runs modeled after old report shapes
- `ENTITY-GRAPH-001`: Postgres entity tables and mention extraction
- `TEMPORAL-EDGES-001`: candidate updates/extends/resolves/supersedes edges
- `BOOK-NOTES-001`: Steve-owned book-note pipeline with citation and copyright guardrails

## Sources Checked

Local repo and DB:

- `docs/rebuild/current-state.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/specs/2026-04-23-synthesis-engine-v1.md`
- `docs/audits/2026-04-22-youtube-extraction-tool-audit.md`
- `docs/audits/2026-04-24-nuke-power-rebuild-roadmap.md`
- `scripts/generate-shared-comms-synthesis.mjs`
- `lib/foundation-db.js`
- `lib/shared-candidate-extraction.js`
- `shared_communication_*` Postgres tables
- old system reports under `/Users/bensoncrew/bcrew-buddy-reference/docs/archive/intelligence/`
- old `bcrew-external-scout` skill

External sources:

- Google Gemini video understanding: https://ai.google.dev/gemini-api/docs/video-understanding
- Google Gemini models: https://ai.google.dev/gemini-api/docs/models
- Google Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini 3 developer guide: https://ai.google.dev/gemini-api/docs/gemini-3
- YouTube Data API reference: https://developers.google.com/youtube/v3/docs
- YouTube captions API: https://developers.google.com/youtube/v3/docs/captions
- YouTube API Services Terms: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube API Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- OpenAI embeddings guide: https://platform.openai.com/docs/guides/embeddings
- pgvector docs: https://github.com/pgvector/pgvector
- PostgreSQL full-text ranking docs: https://www.postgresql.org/docs/current/textsearch-controls.html
- Zep graph docs: https://help.getzep.com/groups
- Zep concepts: https://help.getzep.com/v2/concepts
- Zep paper: https://arxiv.org/abs/2501.13956
- Supermemory research page: https://supermemory.ai/research/
- Mem0 State of AI Agent Memory 2026: https://mem0.ai/blog/state-of-ai-agent-memory-2026
