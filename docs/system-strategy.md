# System Strategy

This document defines what the BCrew AI OS is for, how it stores truth, and how future agents and hubs should behave.

The business strategy explains how Benson Crew grows the company.

This system strategy explains how the operating system supports that work without drifting, hallucinating, or turning into a pile of disconnected tools.

## What The System Is

- The root operating layer of the business
- A shared memory and source-of-truth system for strategy, decisions, backlog, questions, and live source-backed views
- The base that future hubs plug into:
  - Strategic Execution
  - Marketing
  - Departments
  - Agents

## Foundation Is The Root

Foundation is not just a strategy packet. It is the root layer of the OS.

It has three conceptual zones:

- Business Foundation
  - durable business strategy
  - human-readable and Git-versioned
- System Foundation
  - backlog
  - decisions
  - open questions
  - recent changes
  - memory status
- Source Of Truth
  - source contracts
  - source registry
  - source-backed live values
  - source trust and health over time

The current UI can stay simpler than this model. The architecture comes first.

## Truth Model

- Durable truth lives in docs and Git
- Volatile operating memory lives in PostgreSQL
- Live numbers come from source-backed contracts, not markdown snapshots
- Conversation history, decisions, and change events must stay queryable over time

This means:

- strategy docs stay concise and durable
- source-backed views render live values from real systems
- changing work belongs in the database, not loose markdown

## System Rules

1. Business strategy is the source of truth for business direction.
2. Live KPI values and milestone math belong in source systems, not in markdown docs.
3. Decisions that change strategy are logged as explicit records.
4. Strategy docs are updated through tracked proposals and approvals, not silent edits.
5. Supporting docs can expand the strategy packet but never contradict it.
6. The system must preserve the distinction between Benson Crew as the team and Real Broker as the brokerage/platform.
7. The system should render live values from source IDs so source updates flow through the system without manual doc cleanup.
8. Agents can support, analyze, and operationalize strategy, but they do not set or change strategy on their own.
9. Every source-backed view should show the source ID and give the user a clear way to open the real source of truth.

## System Role

The Foundation system makes strategy operational. It reads reality from source systems, renders live source-backed values, logs decisions, surfaces drift, routes accountability, and keeps the strategy layer current.

It supports leadership strategy. It does not invent or change strategy on its own.

## Change Doctrine

- The system proposes
- Steve confirms
- The system records

No agent or automation should silently rewrite core strategy.

For B1:

- decisions can be proposed and classified in the system
- doc updates can be proposed and reviewed in the system
- only a narrow allowlist of docs can be explicitly applied by the system
- central docs still get edited by hand

## Agent Doctrine

Agents exist to support and operationalize strategy. They do not set or change it.

Agents should:

- ground themselves in Foundation first
- use source contracts when live values matter
- record changing work in the memory layer
- surface drift, blockers, and inconsistencies
- help carry decisions into execution systems once approved

Agents should not:

- invent strategy
- overwrite approved truth silently
- hardcode live numbers into docs
- treat stale docs as normal

## Source Doctrine

- every important live input should have a stable source ID
- source links should be reachable from the UI
- source-backed panels should update when the source changes
- source trust matters as much as source connectivity

Foundation should wire the sources that keep strategy honest first:

- sales truth
- finance truth
- governance cadence
- retention / attrition truth

Department execution metrics can plug in later at lower layers.

## Hubs Plug Into Foundation

Future hubs should not become separate truth systems.

They should plug into Foundation:

- read durable business and system strategy
- read and write operating memory through approved APIs
- use source contracts for live values
- publish decisions and changes back into the shared record

That is how the OS stays coherent as it scales.

## What The System Is Not

- not a passive doc browser
- not a dashboard that only reads
- not a collection of bots without shared memory
- not a second strategy brain competing with leadership

If Foundation becomes stale, fragmented, or untraceable, that is a system failure.

## Current Build Rule

Build the trust layer before the sprawl layer.

That means:

- write paths before more dashboards
- decision capture before more agents
- source trust before more source count
- clean architecture before cosmetic sprawl
