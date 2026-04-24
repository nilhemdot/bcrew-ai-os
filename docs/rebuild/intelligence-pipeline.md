# Intelligence Pipeline Operating Model

Last updated: 2026-04-23
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

The old Directors of Intelligence are useful here as output inspiration.

They should not come back as independent source-reading agents.

### 5. Apply Paths

Approved outputs can become action.

Examples:

- task candidate -> backlog or ClickUp
- decision candidate -> decision ledger
- blocker -> open question
- marketing atom -> content overlay
- strategy issue -> strategy review queue

The system proposes.

The right human owner confirms.

The system records.

## Who Runs This Work

Today:

- Codex and Steve manually run the routines while the system is being built
- scripts are the first tools
- PostgreSQL is the memory layer

Near future:

- scheduled jobs or queue workers run ingestion and extraction
- each run writes status, counts, cursor state, errors, and cost
- `SYSTEM-010` process supervision must exist before long-running autonomous loops are trusted

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
