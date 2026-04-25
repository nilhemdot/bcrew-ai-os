# Foundation Memory And Source Audit

Date: 2026-04-25
Status: evidence
Category: foundation
Purpose: Lock the current rebuild truth after the continuity, memory, and source-system concern.

## Bottom Line

Do not restart from scratch.

The rebuild direction is still right: finish Foundation first, but define memory as part of Foundation instead of treating it as a later feature. The missing piece is not another giant chat summary. The missing piece is a durable, source-backed memory spine that every extractor, scout, backlog decision, and UI surface can write to and retrieve from.

The correct next build order is:

1. Finish the Foundation source-truth cleanup and close the current audit drift.
2. Add the intelligence job ledger.
3. Add the source-backed atom schema.
4. Add lexical chunk retrieval over archived artifacts.
5. Add pgvector semantic retrieval.
6. Add hybrid evidence retrieval.
7. Then scale YouTube, Skool, Loom, Zoom, and webpage extraction.

The creator/video/scout system matters, but it should feed the memory spine. It should not be built as another disconnected extractor first.

## Scope Of This Audit

This was a broad active-system audit, not a forensic read of every file on the computer.

Read or reviewed:

- current repo status, recent commits, and dirty worktree
- main runtime entrypoints in `server.js`
- Foundation job registry, worker, and job runner
- Foundation database schema, backlog seed, LLM router, source contracts, FUB client, and Google delegated client
- active extraction scripts for Gmail, Missive, meetings, Slack, Zoom chat, Zoom audio transcripts, Drive corpus, and video-link inventory
- Admin and Conditional deal review scripts
- Ops and home UI code involved in the recent work
- active rebuild docs and intelligence pipeline docs
- source registry and source notes for shared communications, Skool, and video links
- live Postgres backlog, source targets, LLM routes, job controls, and recent job runs
- old BCrew-Buddy reference material for memory, agent memory, external scouting, YouTube strategy, and scout registries
- local project inventory around AIOS, old buddy reference, Unchained Realtor, OpenClaw, Codex, and Claude state

Not complete yet:

- a literal line-by-line read of every UI file, especially all of `public/foundation.js`
- a line-by-line read of every old skill and every archived handoff
- a forensic audit of every local/private folder on the computer
- a security review of every dependency or generated artifact
- a current external research sprint over the latest videos from every creator

That means this audit is enough to make the next build-order decision. It should not be represented as a full security audit or a full old-system decompile.

## Where Memory Lives Today

There are four different memory layers right now, and that confusion is part of the problem.

1. Repo-local assistant memory

- Path: `/Users/bensoncrew/bcrew-ai-os/MEMORY.md`
- Daily notes: `/Users/bensoncrew/bcrew-ai-os/memory/YYYY-MM-DD.md`
- Status: local-only, ignored by git, useful for direct assistant continuity
- Limitation: not a product memory system and not queryable by the app

2. OpenClaw native/local memory

- Path family: `/Users/bensoncrew/.openclaw`
- Status: exists as local runtime memory/state
- Limitation: not yet wired as Foundation source truth

3. Foundation/Postgres operating memory

- Database: `bcrew_ai_os`
- Current durable tables include backlog, decisions, open questions, source contracts, source targets, LLM routes/probes/calls, job runs/controls, shared communication artifacts, candidates, processing runs, and synthesis runs/items.
- Status: this is the right place for product memory to grow.
- Limitation: it is missing a first-class intelligence atom table, chunk table, lexical retrieval, vector retrieval, and hybrid evidence API.

4. Old-system memory and scout references

- Main reference path: `/Users/bensoncrew/bcrew-buddy-reference`
- Status: useful as evidence and seed material, not current doctrine.
- Limitation: old memory/scout patterns were valuable but too fragmented and prompt-loop driven for the new system.

## Current System Truth

The active AIOS system already has more real Foundation than it may feel like during chat handoffs.

Real now:

- source contracts and source registry
- Foundation dashboard and Ops dashboard
- DB-backed backlog, decisions, questions, and job runs
- scheduled Foundation worker
- shared communications archive and candidate extraction
- synthesis v1 over shared communications
- LLM router records and call ledger
- deal review scripts for Admin and Conditional
- paced deal review backlog lane plus queued re-review lane
- extraction target control plane seed for current sources
- old-system reference material imported as readable evidence

Still missing:

- durable source-backed atom schema
- chunk-level retrieval over archived artifacts
- Postgres full-text/trigram search API
- pgvector install and semantic retrieval
- hybrid retrieval that returns both atoms and source chunks
- structured correction proposals for deal review cards
- approval-gated writeback lane for corrections beyond inspection findings
- first-class creator watchlist and YouTube intelligence source
- governed Skool, Loom, Zoom, and webpage extraction contracts
- fresh LLM route proof after local Codex/OpenClaw upgrade

## Important Corrections Made During This Pass

Memory is now explicitly part of Foundation closeout, not deferred as vague future work.

Backlog and docs now include:

- `INTEL-JOBS-001` - intelligence job ledger
- `INTEL-ATOM-001` - source-backed intelligence atom schema
- `RETRIEVAL-001` - chunk-level lexical search
- `RETRIEVAL-002` - pgvector semantic retrieval
- `RETRIEVAL-003` - hybrid retrieval and evidence API
- `MULTIMODAL-EXTRACTOR-001` - rich multimodal worker contract
- `CREATOR-WATCHLIST-001` - normalized creator/source watchlist
- `YOUTUBE-SCOUT-001` - YouTube discovery and video intelligence MVP
- `ZOOM-RECOVERY-001` - historical Zoom recovery validation

The extraction-control seed now points video, Skool, Loom, Zoom, webpage, creator, and YouTube targets at the right backlog cards instead of loose ideas.

The source registry now includes pending source IDs for the creator watchlist and YouTube intelligence.

The Harlan preview no longer claims assistant memory is live. It now reflects that assistant memory is not wired yet.

The repo defaults for OpenClaw extraction/synthesis now target `openai-codex/gpt-5.5` instead of stale `gpt-5.4`. The route status remains `probe_required` until a fresh audit is run after the local Codex/OpenClaw update.

## Deal Review Truth

The deal review process should have two lanes:

1. Manual re-review lane

- Triggered by `Review This Deal` or `Review This Conditional`.
- This is for rows Ops already fixed or wants checked again.
- Existing `--queued` behavior is correct for this lane.

2. First-pass backlog lane

- Starts at the merger cutoff: `2025-06-01`.
- Only reviews eligible deals older than the maturity window, currently 10 days.
- Runs slowly at first, currently one backlog item per scheduled cadence.
- Writes inspection status, action, and findings only.

This is now represented in the scheduled Foundation job definitions. The latest completed deal-review job runs before the change were still queued-only, so the first scheduled backlog/write run happens on the next cadence unless run manually.

This is not source-field auto-fix. Auto-fix should wait until structured correction proposals and an approval lane exist.

## Old-System Findings

The old system explains why the rebuild exists.

Useful pieces:

- creator/scout registries
- YouTube strategy notes
- memory architecture notes
- old session/agent memory patterns
- old output cadence expectations
- evidence that daily/weekly intelligence reports are valuable

Problems:

- memory was spread across local files, SQLite-style stores, projections, and prompt behavior
- scouts were too agent-loop and tool-friction dependent
- extraction quality was uneven
- source truth was too easy to blur with summaries
- too much important context lived in chats instead of repo or DB truth

The correct move is to salvage the useful source lists and doctrine, not revive the old architecture.

## Why Postgres First Still Makes Sense

Postgres is not the newest idea, but it is the right base for this system because it gives:

- durable source-backed records
- structured tables for jobs, atoms, decisions, backlog, and routes
- transactional write safety
- full-text search
- trigram matching
- pgvector when installed
- clear audit and provenance paths

Graph/agent-memory systems like Graphiti or Zep can still matter later, but only after the repo has its own source-backed atoms, retrieval, and evidence API. Otherwise the system would outsource the most important source-truth layer before it understands its own data.

## Right Next Build Order

The next work should not be a broad YouTube crawler yet.

Build in this order:

1. `INTEL-JOBS-001`
   - one durable ledger for extraction, chunking, embedding, synthesis, scout, and memory jobs
   - track source, cursor, budget, cost, model, status, evidence, and errors

2. `INTEL-ATOM-001`
   - define the source-backed atom schema
   - include source IDs, artifact IDs, chunk IDs, claim text, type, entities, confidence, timestamps, validity, supersession, privacy flags, and value route

3. `RETRIEVAL-001`
   - chunk archived artifacts and build lexical retrieval first
   - names, source IDs, deal IDs, and exact phrases need lexical search

4. `RETRIEVAL-002`
   - install/enable pgvector and add semantic retrieval
   - log model, dimensions, token cost, and embedding runs

5. `RETRIEVAL-003`
   - combine lexical, vector, recency, entity, source, and privacy filters into a single evidence API

6. Multimodal and creator extraction
   - after retrieval exists, scale YouTube, Skool, Loom, Zoom, and webpage extraction into the same atom/evidence spine

## Operating Rule Going Forward

When a major section or system surface feels done, do not just move to the next surface.

Close it with:

1. what belongs here
2. what belongs elsewhere
3. what doctrine or source contract surfaced
4. what backlog cards need enrichment
5. what handoff/audit artifact preserves the decision

That is how the new system avoids becoming the old system again.
