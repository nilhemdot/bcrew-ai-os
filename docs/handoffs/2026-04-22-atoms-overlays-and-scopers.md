# Atoms, Overlays, And Scopers

Date: 2026-04-22

## Core Rule

Foundation should store shared evidence atoms.

Hubs should not rebuild ingestion.

Hubs should read the same atom base through different overlays.

## Core Atom

Every business atom should be able to answer:

- what happened
- where it came from
- who was involved
- what quote or evidence supports it
- which pillar it belongs to
- when it happened
- how confident the system is
- whether a human approved it

## Overlay Rule

Atoms should support optional overlays.

Do **not** force every atom into one marketing-style target model.

### Marketing overlay

Marketing is the first heavy overlay case.

Locked current structure:

- `10` RETAIN client avatars
- `5` ATTRACT agent avatars

Marketing overlays should support:

- audience
- avatar id
- avatar name
- content angle
- proof / objection / story type

### Strategy overlay

Strategy overlays should support:

- issue type
- decision relevance
- assumption risk
- blocker type
- contradiction / carry-forward relevance

### Ops overlay

Ops overlays should support:

- workflow
- SOP gap
- handoff failure
- accountability miss
- quality flag

### Sales overlay

Sales overlays should support:

- objection type
- stage problem
- follow-up miss
- coaching pattern
- client / opportunity type

### Retention overlay

Retention overlays should support:

- engagement signal
- culture signal
- praise
- frustration
- retention-risk theme

## Scoper Rule

Each hub should eventually have a Scoper.

The Scoper is **not** the ingestion layer.

The Scoper is a reader that:

1. reads relevant approved atoms
2. spots patterns, gaps, and priorities
3. goes deeper into raw sources when needed
4. produces scoped work for the hub

Clean split:

- Foundation = ingest, archive, normalize, extract, approve
- Hub Scoper = read, deepen, scope
- Later specialists = act

## Why This Is Better Than The Old System

The old system had the right instinct:

- atoms
- avatars
- directors
- scopers

But it spread those roles across too many separate pipelines.

The rebuild should keep the pattern and simplify the architecture:

- one Foundation atom layer
- optional hub overlays
- one Scoper per hub when the hub is ready

## Next Build Order

1. port and harden shared communications readers
2. create `business_atoms` + `atom_hits`
3. define the first overlay model
4. lock the marketing avatar registry
5. build the first extraction review lane
6. then build the first hub Scoper on top of approved atoms

## Backlog Links

- `SOURCE-019`
- `SOURCE-020`
- `STRATEGY-001`
- `STRATEGY-006`
- `SYSTEM-012`
