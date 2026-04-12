# Business Atoms Framework

## Purpose

Business atoms are the smallest unit of strategic intelligence in the system.

The marketing system already proved the pattern:

- atoms were small enough to capture precisely
- rich enough to stand on their own
- tagged well enough to query later
- reusable across planning and execution

The business version applies that same pattern to leadership, operations, recruiting, retention, finance, and strategy.

The goal is simple: quarterly and annual planning should run on accumulated evidence, not memory, intuition, or whoever talked loudest in the room.

## Design Principles

Business atoms should inherit the strongest parts of the old content-atoms system:

1. Every atom must be self-contained.
2. Every atom must be source-grounded.
3. Every atom must be tagged consistently enough to query later.
4. Every atom must survive outside the original conversation or meeting.
5. Repeated hits should strengthen confidence, not create duplicate clutter.
6. Atoms only matter if they feed downstream planning, prioritization, and decision-making.

## What a Business Atom Is

A business atom is a single classified signal captured from:

- meetings
- conversations
- emails
- Slack or internal chat
- KPI drift
- source-health issues
- leadership observations
- operational incidents
- agent feedback

It should represent one coherent thing the system can track over time.

## Suggested Categories

| Category | What It Captures | Example |
|---|---|---|
| `bottleneck` | Friction slowing the engine | Onboarding still takes 45 days, not 30 |
| `decision_needed` | Unresolved question blocking progress | Who owns the recruiting-to-ops handoff? |
| `decision_made` | Strategic choice already made | Q2 focus shifts from recruiting to retention |
| `win` | Positive proof worth reinforcing | Best recruiting month of the year |
| `loss` | Negative outcome worth learning from | Lost two agents after coaching cadence dropped |
| `frustration` | Repeated complaint that may indicate design failure | Nick is firefighting instead of coaching |
| `opportunity` | Upside the system should exploit | Competitor office instability opened a recruiting window |
| `assumption_risk` | Live data contradicts a key model assumption | Target GCI is $13K, live average is materially lower |
| `culture_signal` | Pride, engagement, morale, or behavior indicator | Agents are sharing team content voluntarily |
| `external_signal` | Market or platform shift affecting the business | Real Broker policy change affects cap math |

## Core Tags

Every atom should carry tags on four dimensions.

### 1. Pillar

- `ATTRACT`
- `GROW`
- `RETAIN`
- `FINANCIAL`
- `LEADERSHIP`
- `SYSTEM`

### 2. Department

- `leadership`
- `recruiting`
- `sales`
- `marketing`
- `operations`
- `retention`
- `finance`
- `system`
- `unknown`

### 3. Time Scope

- `this_week`
- `this_month`
- `this_quarter`
- `annual_pattern`
- `structural`

### 4. Lifecycle Status

- `detected`
- `confirmed`
- `recurring`
- `structural`
- `resolved`
- `archived`

## Frequency Model

The useful part of the atoms idea is not the label. It is the accumulation.

Every time the same theme surfaces again, the system should record another hit against the atom instead of creating a near-duplicate.

Suggested thresholds:

- `1 hit` -> `detected`
- `2 hits` -> `confirmed`
- `3+ hits in a quarter` -> `recurring`
- `5+ hits across periods` -> `structural`

These thresholds should stay configurable.

## Proposed Schema

```sql
CREATE TABLE business_atoms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  pillar TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'unknown',
  time_scope TEXT NOT NULL DEFAULT 'this_quarter',
  lifecycle_status TEXT NOT NULL DEFAULT 'detected',
  hit_count INTEGER NOT NULL DEFAULT 1,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL,
  source_ref TEXT,
  source_excerpt TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE atom_hits (
  id BIGSERIAL PRIMARY KEY,
  atom_id TEXT NOT NULL REFERENCES business_atoms(id) ON DELETE CASCADE,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL,
  source_ref TEXT,
  context_excerpt TEXT,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_atoms_category ON business_atoms(category);
CREATE INDEX idx_business_atoms_pillar ON business_atoms(pillar);
CREATE INDEX idx_business_atoms_department ON business_atoms(department);
CREATE INDEX idx_business_atoms_status ON business_atoms(lifecycle_status);
CREATE INDEX idx_business_atoms_hits ON business_atoms(hit_count DESC, last_hit_at DESC);
CREATE INDEX idx_atom_hits_atom ON atom_hits(atom_id, hit_at DESC);
```

## How Atoms Should Enter the System

Business atoms should be created in four ways:

1. Manual capture
   - leadership explicitly says “that is a bottleneck” or “that needs to be tracked”

2. Agent-detected
   - intelligence or meeting-review agents propose atoms based on recurring themes

3. Data-driven
   - KPI drift or source-health alerts create atoms automatically when thresholds are crossed

4. Session extraction
   - after a strategy or leadership session, the system proposes atoms from what came up

## Dedup and Merge Logic

This matters. The old atoms system only became useful because it had dedup and winner logic.

The business version should do the same:

- try to match new candidate atoms against existing active atoms
- if it is clearly the same theme, create a new hit instead of a duplicate atom
- if it is similar but meaningfully different, create a new atom
- if two atoms later prove equivalent, merge them and preserve the hit history

The system should prefer one strong recurring atom over five weak duplicates.

## How Planning Uses Atoms

### Weekly

Use atoms as a pulse check:

- what surfaced this week
- what got resolved
- what is repeating again

### Monthly

Use atoms to see emerging patterns:

- which bottlenecks are starting to recur
- which wins deserve amplification
- which unresolved decisions are lingering too long

### Quarterly

This is where atoms become a planning instrument:

- sort by hit count
- review recurring and structural atoms first
- turn the strongest unresolved atoms into priorities, fixes, or decisions

### Annual

Atoms should show the long-term themes:

- what keeps coming back every quarter
- what the business actually solved
- where the operating model is still structurally weak

## Dashboard Views

The first dashboard views should be:

### Weekly Pulse

- grouped by category
- shows newest atoms and new hits this week

### Quarterly Board

- grouped by recurring importance
- filters by pillar, department, category, lifecycle status

### Annual Patterns

- structural atoms only
- shows what persisted across quarters

## Relationship to Existing Strategy Work

Business atoms do not replace:

- business strategy docs
- source registry
- backlog
- decisions

They sit underneath them and make them smarter.

### Strategy docs

Strategy docs remain canonical.

### Decisions

Some atoms become decisions. Some decisions create or resolve atoms.

### Backlog

Recurring atoms should generate scoped backlog items when action is needed.

### Source registry

Data-driven atoms should cite the exact `Source ID` that triggered them.

## Implementation Sequence

1. Capture the spec in the repo.
2. Add `STRATEGY-001` to the backlog.
3. Create `business_atoms` and `atom_hits` tables.
4. Add a read-only Atoms view to the dashboard.
5. Seed a few manual atoms from current strategy lock and known friction.
6. Add proposal flows from meetings, decisions, and KPI drift.
7. Add merge / dedup logic once the first manual dataset exists.

## Initial Success Criteria

The framework is working when:

- atoms are easy to add
- repeated signals create hits instead of clutter
- planning can filter and sort by recurring themes
- atoms can cite real sources
- the system can show wins and bottlenecks without re-reading entire conversations

## Immediate Next Step

The next move is not to build the full automation.

The next move is to:

- save this spec
- add the backlog item
- create the tables
- seed a handful of real atoms manually

That gives the concept a real home and lets the system prove value before we automate extraction.
