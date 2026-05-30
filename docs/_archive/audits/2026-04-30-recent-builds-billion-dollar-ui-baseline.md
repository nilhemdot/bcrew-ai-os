# Recent Builds Billion-Dollar UI Baseline

Before build: `99a0100`

Owned card: `RECENT-BUILDS-BILLION-DOLLAR-UI-001`
Closeout key: `recent-builds-billion-dollar-ui-v1`

## Live Build Log Snapshot

Live `/api/foundation/build-log?limit=60` before the build:
- Schema version: 2
- Total build entries: 65
- Closeout builds: 42
- Backlog-linked builds: 46
- Proof-linked builds: 42
- Review-next builds: 65
- Day count: 4
- System areas: 20

Newest closeouts before this build:
- `gate-reliability-direct-verifier-deadlock-v1` at `99a0100`
  - Owning cards: `GATE-RELIABILITY-003`
  - Context cards: `GATE-RELIABILITY-001`, `GATE-RELIABILITY-002`, `UI-MENU-LAYOUT-POLISH-001`, `RECENT-BUILDS-BILLION-DOLLAR-UI-001`
- `ui-menu-layout-polish-v1` at `005b259`
  - Owning cards: `UI-MENU-LAYOUT-POLISH-001`
  - Context cards include the remaining Phase G order.
- `plain-english-sweep-v1` at `a101bd7`
  - Owning cards: `PLAIN-ENGLISH-SWEEP-001`
  - Context cards include the remaining Phase G order.

same-commit closeout groups:
- `58f029f`: 4 operator closeouts
- `ba5ec81`: 3 operator closeouts

## Before Build Findings

- Recent Work already had v2 closeout records, proof commands, review-next notes, and same-commit grouping.
- The UI still read like an expanded audit feed because individual closeout cards rendered fully open by default.
- Steve had to scan dense raw closeout detail before seeing what to review first.
- Owned backlog cards and context cards were separate in API data, but the UI did not give context cards a dedicated executive treatment.
- Same-commit groups existed, but the executive summary did not make it obvious that each closeout inside the group was still individually reviewable.

## Ownership Boundary

This build must preserve the `BUILD-LOG-BACKLOG-ID-FIX-001` rule:
- `backlogIds` are owning cards only.
- backlogIds are owning cards only.
- `relatedBacklog` renders owning cards only.
- `mentionedBacklogIds` and `mentionedBacklog` are context only.
- Context cards must not appear as owning cards.
- Same-commit closeouts stay grouped without merging ownership.

## Required Manual States

Required route:
- `/foundation#build-log`

Required viewports:
- desktop `1440x900`
- mobile `390x844`

Required states:
- collapsed default
- expanded latest closeout
- same-commit group
- ownership context separation
- review-next queue

## Out Of Scope Guard

This baseline does not approve comprehensive changelog, daily summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus work, research cleanup, or a new feature lane.
