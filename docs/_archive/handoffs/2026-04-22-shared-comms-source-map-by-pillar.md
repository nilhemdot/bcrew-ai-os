# Shared Communications Source Map By Pillar

Date: 2026-04-22

## What This Settles

The old system direction was mostly right:

- read Missive
- read Gmail
- read Google meeting notes
- read Slack
- extract decisions, tasks, blockers, feedback, and atoms

The old execution was too fragmented.

The rebuild should use one shared ingestion model instead of one separate agent per surface.

## Locked Source Roles

- `Missive`
  - primary shared inbox + internal comments + routing context
- `Gmail`
  - broader mailbox fallback
- `Google meeting notes / transcripts`
  - meeting evidence layer
- `Slack`
  - team-signal / feedback / fast-decision layer

## Best Path Forward

1. revalidate source reads
2. archive raw artifacts
3. normalize into one shared communications model
4. extract narrow candidate records
5. route approved outputs into decisions, backlog, and later hub queues

Implementation bias:

- port the old working Google delegated readers
- port the old working Missive bridge
- revalidate Slack reads before building on them
- do not reinvent four separate source readers from scratch

## Pillar Uses

### Strategy

- pending decisions
- contradiction review
- strategy drift evidence
- quarterly planning context

### Ops

- missed follow-through
- stale inbox / routing issues
- blockers and handoff failures

### Retention

- meeting attendance gaps
- friction signals
- unresolved people issues

### Marketing

- story atoms
- repeated objections
- wins / proof snippets

### Sales / Coaching

- appointment quality signals
- follow-up misses
- client-objection patterns
- stage-hygiene clues

## Foundation Boundary

Foundation owns:

- read
- archive
- normalize
- extract
- review

Later hubs own:

- acting
- nudging
- updating workflows
- department-specific automation

## Backlog Links

- `SOURCE-005`
- `SOURCE-006`
- `SOURCE-018`
- `SOURCE-019`
- `DECISION-004`
- `MEMORY-003`
- `STRATEGY-001`
