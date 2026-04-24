# Intelligence Pipeline Operating Model

Last updated: 2026-04-24
Status: Foundation doctrine for extraction, synthesis, and future briefs

This doc answers one question:

- who does the intelligence work in the future?

## Straight Answer

The future system should not be a swarm of independent scouts.

It should be a governed pipeline:

1. source-specific ingestion routines
2. source-specific extraction routines
3. one shared synthesis layer
4. consumer-specific briefs and hub views
5. approved apply paths into backlog, decisions, ClickUp, CRM, or source systems

Agents can use this pipeline.

Agents should not each become their own private pipeline.

## Why The Old Scout Model Became Messy

The old scout/director model made sense because the business needed intelligence fast.

It became hard to trust because too many roles had their own:

- source reads
- prompts
- memory assumptions
- output formats
- schedules
- stale context
- confidence levels
- hidden operating cost

That creates intelligence sprawl.

Even when individual reports were useful, the system had no single governed layer deciding:

- what source was trusted
- what was duplicate
- what had already been resolved
- what was stale
- what should reach a human today

The rebuild should keep the useful report patterns and remove the sprawl.

## The New Model

### 1. Ingestion Routines

These are code-owned jobs.

Examples:

- `gmail:sync-archive`
- `missive:sync-archive`
- `slack:sync-archive`
- `meeting-notes:sync`
- `sync-zoom-text-archive.mjs`

Their job:

- read source systems
- normalize artifacts into the shared archive
- preserve source metadata and provenance
- avoid interpretation beyond basic classification

They are not agents.

There are two different ingestion jobs:

- current-day sync
- historical corpus crawl

Current-day sync keeps the system aware of what happened today across Gmail, Missive, Slack, meetings, Calendar, and other active operating surfaces.

Historical corpus crawl works backward through old folders, inbox windows, courses, videos, links, docs, and shared drives one safe bite at a time.

Google Drive starts with the shared-drive root list in `docs/source-notes/google-drive-corpus.md`.

Skool starts with the access-path and content-use audit in `docs/source-notes/skool-corpus.md`; do not treat it as a blind browser scrape target.

Do not mix these into one vague "backfill" script. They have different success metrics:

- current-day sync succeeds when yesterday and today are captured reliably
- historical crawl succeeds when source coverage expands with durable cursor state, review status, and provenance

### 2. Extraction Routines

These are code-owned jobs that may call an LLM.

Examples:

- `gmail:extract-candidates`
- `missive:extract-candidates`
- `slack:extract-candidates`
- `meeting-notes:extract-candidates`
- `zoom:extract-candidates`

Their job:

- turn raw artifacts into governed candidates
- tag candidate type
- tag sensitivity
- tag subject people
- keep evidence excerpts
- preserve extraction method and model version

They are not independent scouts.

The LLM is a tool inside the routine, not the owner of the process.

LLM calls for shared intelligence must go through `lib/llm-router.js`. The router owns provider/auth-path choice, call logging, and fallback policy. The current working Foundation route is the OpenClaw/Codex subscription adapter (`openclaw` / `chatgpt_subscription_gateway`). Direct OpenAI Responses API is a guarded manual fallback only and is blocked unless explicitly allowed for a paid run.

Extraction attempts are themselves operating facts. When an artifact is processed and correctly yields zero candidates, that success is recorded against the artifact's current content hash so the artifact is not mined forever under the same extractor version. If the email thread, Missive thread, or transcript content changes, the content hash changes and it becomes eligible again. Failures stay retryable. Candidate metadata and processing runs must store the actual provider, auth path, route key, and model returned by the router, not just the model the script requested.

Subscription routes are first-class production capacity, but they are not treated like low-latency APIs. They need pacing, long per-call windows, small bite sizes, per-source timeout knobs, and resumable ledgers. Strategy Hub and action-routing views should synthesize mined material that is already ready; Gmail, Missive, meeting/transcript, and corpus extraction should run as separate miners so a slow subscription call does not block leadership work.

The product is the closed operating loop:

- source evidence is mined into atoms and candidates
- synthesis ranks what matters for strategy, operations, sales, marketing, recruiting, and agent coaching
- ranked items route into decisions, contradictions, tasks, or owner-bound actions with source evidence attached
- completed actions and decisions update the operating record so future synthesis respects the resolution

Synthesis is a function inside that loop, not a standalone digest.

Historical extraction should be paced. The goal is not to read the entire company history in one night. The goal is a supervised extraction team that can:

- take one Drive folder, Skool course, inbox date window, or meeting archive window at a time
- record what it inspected
- archive or mirror the useful artifact
- extract candidates and atoms
- classify the asset's usable value by consumer
- preserve owner-entity, content-use, and sensitivity boundaries
- mark the source window done, skipped, failed, or needs human review
- continue the next day without Steve or Codex remembering where it left off

Extraction should not stop at "we found a file."

For old Drive, Skool, videos, trainings, courses, links, docs, and long-tail meeting history, the output needs a value route:

- strategy evidence
- ops improvement
- sales leadership / coaching
- marketing performance or content atom
- recruiting proof
- agent training or personal coaching
- Steve Zahnd personal-brand material
- MarketMasters trust-building material
- Steve-owned education / monetization material
- reject / duplicate / low value

This is how historical mining becomes useful instead of becoming a second archive nobody reads.

### 3. Synthesis Layer

This is the next major capability.

It should take candidates plus source-backed operating facts and produce live intelligence by:

- linking related signals across artifacts
- deduping repeated mentions
- detecting resolved work
- detecting superseded decisions
- scoring staleness
- ranking actionability
- grouping signals into strategic issues, blockers, decisions, and opportunities
- grounding claims against source-backed facts from strategy, KPI, finance, Owners, FUB, and source contracts

This is where raw mining becomes intelligence.

Core source systems should not be blindly atomized.

Strategy, KPI, finance, Owners, FUB, and source-contract facts stay source-backed first. They become evidence for synthesis. They only become atoms when they express durable business meaning, not just because a row or metric exists.

### 4. Consumer Views

These are the useful outputs humans and hubs read.

Examples:

- Sunday strategy packet
- leadership brief
- sales brief
- ops brief
- marketing brief
- retention brief
- source-trust brief
- mined-asset queue for content, course, training, recruiting, and strategy reuse

The old Directors of Intelligence are useful here as output inspiration.

They should not come back as independent source-reading agents.

### 4.5 Hub Supply Chain

The same Foundation extraction layer should feed different hub consumers without mixing their boundaries.

Primary consumer lanes:

- Strategy / ownership: concise source-backed decisions, constraints, unresolved issues, and next moves.
- Sales / recruiting leadership: agent attraction, recruiting proof, coaching gaps, candidate context, and team-growth signals.
- Ops: bottlenecks, SOP gaps, handoff failures, client-experience issues, transaction cleanup, and source-health failures.
- Marketing: performance facts, content atoms, audience growth, SEO/AEO learnings, publishing opportunities, and platform intelligence.
- Agent Hub: tailored training, Home Value Hub usage, coaching prompts, accountability signals, and deal-growth recommendations.
- Benson Crew residential brand: client-safe marketing and safe realtor-attraction content.
- Zahnd Team Ag: its own content, SEO/AEO, recruiting, and farm-team proof lane.
- Steve Zahnd personal brand: founder authority and realtor-attraction material with a separate voice from Benson Crew.
- MarketMasters: trust-led recruiting/community growth and training/event authority.
- Steve-owned education / monetization: course, AI/software, faceless/avatar content, and productized knowledge assets with clear owner-entity tagging.

Foundation owns the extraction, evidence, source links, privacy tags, and value routing.

Hubs own the final action: publish, teach, coach, recruit, sell, or change operations.

### 5. Apply Paths

Approved outputs can become action.

Examples:

- task candidate -> backlog or ClickUp
- decision candidate -> decision ledger
- blocker -> open question
- marketing atom -> content overlay
- strategy issue -> strategy review queue
- mined training asset -> course/training queue
- recruiting proof -> recruiting CRM or sales leadership brief
- agent coaching signal -> Agent Hub recommendation

The system proposes.

The right human owner confirms.

The system records.

## Who Runs This Work

Today:

- Codex and Steve still manually run unproven routines while the system is being built
- scripts are the first tools
- `foundation:job` is the first runner that records routine status in PostgreSQL instead of leaving runs trapped in builder chat
- `foundation:worker` now runs selected scheduled routines, including Missive and Gmail current-day sync
- `llm-router` now executes shared intelligence extraction/synthesis through the subscription adapter and records `llm_calls`
- PostgreSQL is the memory layer

Near future:

- scheduled jobs or queue workers run ingestion and extraction
- each run writes status, counts, cursor state, errors, and cost
- `SYSTEM-010` process supervision must exist before long-running autonomous loops are trusted
- a daily current-sync worker keeps live sources fresh
- a historical crawler worker takes one bounded bite per source per day
- a Claude Code / Claude Agent SDK subscription adapter is added under the BCrew router so Claude subscription capacity can be assigned to the right hubs without making OpenClaw the whole model-access layer

Later:

- Crewbert / OpenClaw can orchestrate scheduled work and route exceptions
- personal assistants and hub agents consume synthesized outputs
- specialist agents can be added only when the workflow is bounded, supervised, and has a clear owner

## Hard Rule

Do not create a new scout when a routine, source contract, synthesis rule, or consumer view would solve the problem.

Create a specialist agent only when:

- the inputs are clear
- the output shape is clear
- the action boundary is clear
- supervision exists
- the agent is using Foundation truth, not building its own truth

## Old System Value To Keep

Keep these output patterns:

- decisions
- action items
- bottlenecks
- escalation-worthy issues
- suggested owner
- suggested next action
- ranked findings with evidence
- daily/weekly brief cadence when a real human reads it

Discard these old patterns:

- one-off agents with their own source readers
- report families with inconsistent schemas
- hidden background processes
- stale markdown intelligence
- confidence without evidence
- recommendations that are not tied to source artifacts

## The Next Build

The next build is not more scouts.

The next build is the first synthesis contract and output shape:

- what gets linked
- what gets marked resolved
- what gets deduped
- what gets ranked
- what gets suppressed
- what becomes a strategy packet or director-style brief

That is the bridge from archive to nuclear power.

## Source Types To Support Next

The extraction team needs to support more than communications:

- Google Drive corpus crawl: old shared drives, brand folders, docs, PDFs, training assets, videos, and links
- Skool corpus crawl: courses, trainings, posts, comments, links, docs, and video lessons
- marketing corpus crawl: platform reports, old avatars, performance reports, content briefs, and source maps
- strategy corpus crawl: old strategy docs, meeting packets, John Kitchens work, quarterly prep, and post-strategy outcomes

Every source should eventually have two lanes:

- current-day lane: what changed today and needs to be available now
- historical/corpus lane: one bounded bite at a time until the old valuable material is indexed, classified, and routed

Each source needs the same control model:

- source contract
- cursor/checkpoint
- artifact inventory
- archive/mirror location
- extraction status
- cost/status/errors
- evidence links
- synthesis handoff
