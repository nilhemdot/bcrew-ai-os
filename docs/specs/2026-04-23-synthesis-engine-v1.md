# Synthesis Engine V1 Contract

Date: 2026-04-23
Status: V1 contract with persisted batch proof

## Purpose

Turn the shared communications candidate queue into ranked live intelligence.

The output is not a raw list of candidates.

The output is the smallest useful set of:

- live decisions
- unresolved blockers
- current action items
- strategic issues
- repeat patterns
- content / marketing / operating atoms worth using

## Inputs

V1 reads from:

- `shared_communication_candidates`
- `shared_communication_artifacts`
- Foundation backlog snapshot
- decision ledger snapshot
- open questions snapshot
- source contracts
- source-backed operating facts from signed-off or readable source contracts

Source-backed operating facts include:

- business strategy doctrine and current priorities
- KPI source facts
- Owners / deal source facts
- finance source facts
- FUB source facts
- marketing source facts
- meeting / comms source facts

These should not be treated as random chat atoms.

They should stay source-backed and traceable.

Synthesis uses them to validate, rank, or contextualize candidates.

Candidate inputs include:

- candidate key
- candidate type
- source id
- title
- summary
- owner hint
- evidence excerpt
- confidence
- sensitivity
- subject people
- artifact title
- artifact date
- artifact source metadata

## Required Synthesis Functions

### 1. Cross-Artifact Linking

Group candidates that appear to describe the same work, blocker, decision, issue, or recurring pattern.

Examples:

- Missive thread says Tanner needs SocialPilot API context
- Gmail thread contains SocialPilot API key exchange
- Slack thread discusses posting gaps
- All three become one publishing-source issue

### 2. Deduplication

Repeated mentions become one canonical synthesized item.

Do not produce three tasks because three sources mention the same thing.

### 3. Resolution Detection

Suppress or downgrade items that appear resolved.

Signals:

- later artifact says done / fixed / resolved / shipped
- candidate already applied to backlog / decision / question
- linked ClickUp / decision / source state indicates closed
- later candidate supersedes earlier candidate

V1 can be conservative. If uncertain, mark `status = needs_review`.

### 4. Staleness Scoring

Classify each synthesized item:

- `fresh`
- `active`
- `stale_watch`
- `historical_context`

Rules:

- recent unresolved multi-source issue = fresh / active
- old item with no later recurrence = historical_context
- old item repeated recently = active
- old item with unclear resolution = stale_watch

### 5. Actionability Ranking

Rank by:

- strategic relevance
- unresolved status
- recency
- source count
- evidence quality
- owner clarity
- business impact
- whether Steve or a leader needs to decide

The first proof should surface 15-25 high-signal items, not hundreds.

## Output Schema

Each synthesized item has:

- `rank`
- `item_type`
  - `decision`
  - `blocker`
  - `action_item`
  - `strategic_issue`
  - `pattern`
  - `content_atom`
  - `source_trust_issue`
- `title`
- `one_line`
- `status`
  - `new`
  - `active`
  - `needs_decision`
  - `needs_owner`
  - `stale_watch`
  - `historical_context`
  - `likely_resolved`
- `why_it_matters`
- `recommended_next_action`
- `suggested_owner`
- `source_count`
- `candidate_keys`
- `source_ids`
- `evidence_summary`
- `confidence`
- `sensitivity`

## Consumer Shapes

The same synthesis substrate can feed different consumers:

- strategy packet
- leadership brief
- sales brief
- ops brief
- marketing brief
- retention brief
- source-trust brief

V1 should produce a strategy/leadership synthesis first.

## Strategy Packet Shape

Ownership does not need a long report.

Ownership needs a tight packet with the most critical source-backed intelligence.

Recommended shape:

- 1-page executive summary
- top 10 live strategic issues
- top 5 decisions needed
- top 5 unresolved blockers
- KPI / finance / source-trust exceptions that change the decision
- what changed since the last strategy review
- what is noise / stale / already resolved

Each issue should have:

- owner
- decision needed, if any
- concrete next action
- source-backed evidence
- metric or business impact
- confidence
- stale/resolution status

If a point cannot be tied to evidence, it does not belong in the strategy packet.

## Atom Boundary

Not everything should become an atom.

Chats, meetings, Slack, and email can produce candidate atoms because they contain unstructured language, decisions, lessons, repeated objections, and context.

Core source systems should mostly produce governed facts or metrics:

- KPI numbers
- finance balances and variances
- deal counts and statuses
- lead-source classifications
- strategy doctrine
- source-trust status

Those facts can support synthesized items, but they should not become loose atoms unless they carry durable business meaning beyond the metric itself.

Example:

- `May cash could be tight if projected closings slip` can become a strategic issue backed by finance evidence.
- `Bank balance = $X` should stay a source-backed finance value, not an atom.
- `41 deals / $18M have unknown lead source` can become a source-trust issue because it affects leadership decisions.
- Every row in the KPI dashboard should not become an atom.

## Old System Patterns To Preserve

Keep these from old Director / scout outputs:

- decisions
- action items
- bottlenecks
- escalation-worthy issues
- suggested owner
- suggested next action
- ranked findings with evidence

Do not preserve:

- separate agents with separate source readers
- inconsistent report schemas
- hidden background processes
- stale markdown reports
- confidence without evidence

## V1 Implementation Rule

V1 may be a batch job.

It should:

- read a bounded candidate window
- produce one ranked synthesis output
- record source/candidate keys in the output
- avoid changing candidate statuses automatically
- avoid applying work automatically

Automation comes after the output shape is trusted.

## V1 Persistence Slice

Current implemented slice:

- `shared_communication_synthesis_runs`
- `shared_communication_synthesized_items`
- `scripts/generate-shared-comms-synthesis.mjs`
- `/api/shared-communications/synthesis`
- Foundation snapshot includes `sharedCommunicationSynthesis`

The script now records:

- run id
- title
- model
- output path
- candidate limits and candidates read
- source coverage
- suppressed patterns
- open questions
- archive summary
- candidate summary
- source-backed fact bundle
- ranked synthesized items

The source-backed fact bundle currently includes:

- `doc_source_snapshots`
- critical open `P0/P1` backlog
- open questions
- recent change events

This is still not the final continuous engine.

It is the first durable proof that synthesis can be generated, stored, and read by the system.
