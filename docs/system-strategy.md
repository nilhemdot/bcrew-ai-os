# System Strategy

This page defines what the BCrew AI OS is for, how truth flows through it, and how future hubs, agents, and live views must behave.

Business Strategy defines where the company is going.

System Strategy defines how the operating system keeps that strategy live, visible, and enforceable.

## What Foundation Is

- the root operating layer of the business
- the place where durable strategy, operating memory, and source trust meet
- the base every future hub plugs into instead of becoming its own truth system

Foundation has three layers:

- Business Foundation
  - durable business strategy
  - supporting docs that explain it without contradicting it
- Operating Foundation
  - backlog
  - decisions
  - open questions
  - recent changes
  - memory and workflow state
- Source Layer
  - source contracts
  - connector status
  - live source-backed views
  - source trust and source health

## Truth Model

- Durable truth lives in docs and Git.
- Volatile operating memory lives in PostgreSQL.
- Live values come from source-backed views, not markdown snapshots.
- Decisions, change events, and conversation history must stay queryable over time.
- Each concept should have one authoritative home. If the same truth is duplicated across docs, views, or config, drift is a system bug.

This means:

- strategy docs stay concise
- changing work stays in the system, not loose markdown
- every live value should be traceable to a source ID and real source link

## System Rules

1. Business strategy is the source of truth for business direction.
2. Live KPI values and milestone math belong in source systems, not markdown docs.
3. Decisions that change strategy are logged as explicit records.
4. Strategy docs move through tracked proposals and approvals, not silent edits.
5. Supporting docs can expand the strategy packet but never contradict it.
6. Benson Crew and Real Broker must stay distinct in the system model.
7. Source-backed views should render from source IDs so updates flow through the system without manual doc cleanup.
8. Agents can support, analyze, and operationalize strategy, but they do not set or change strategy on their own.
9. Every source-backed view should show the source ID and a clear path to the real source of truth.
10. The system should meet people in their natural workflows before forcing them into a new surface.
11. Visibility is part of trust. If a page claims something is live, connected, or working, it should reflect real current state rather than cached assumption.

## Change Doctrine

- The system proposes.
- The right human owner confirms.
- The system records.

No agent or automation silently rewrites core strategy.

Right now:

- decisions can be proposed and classified in the system
- doc updates can be proposed and reviewed in the system
- only a narrow allowlist of docs can be auto-applied
- core docs are still edited carefully by hand

## Agent Doctrine

Agents support strategy. They do not define it.

Agents should:

- ground themselves in Foundation first
- use source contracts when live values matter
- write changing work into the memory layer
- surface drift, blockers, and inconsistencies
- carry approved decisions into execution systems

Agents should not:

- invent strategy
- overwrite approved truth silently
- hardcode live numbers into docs
- normalize stale or unverifiable data

## Source Doctrine

- every important live input needs a stable source ID
- source contracts define which system owns which values
- connectors are only the pipe; trust still has to be earned
- source links should be reachable from the UI
- source-backed panels should update when the source changes
- source trust matters as much as source connectivity

Foundation wires the sources that keep strategy honest first:

- sales truth
- finance truth
- governance cadence
- retention and attrition truth

Everything else comes later.

## Hubs And Modules

Future hubs must plug into Foundation, not fork away from it.

That means they:

- read durable business and system strategy
- read and write operating memory through approved APIs
- use source contracts for live values
- publish decisions and changes back into the shared record

## What This Is Not

- not a passive doc browser
- not a dashboard with no memory
- not a bot swarm with no shared truth
- not a second strategy brain competing with leadership

If Foundation becomes stale, fragmented, or untraceable, the system has failed.

## Current Build Rule

Build the trust layer before the sprawl layer.

That means:

- source trust before more source count
- decision capture before more agents
- verification before more automation
- clean architecture before cosmetic sprawl

## How to Read This

- Read this page as doctrine, not a product roadmap.
- Use it to judge whether a new hub, agent, surface, or workflow belongs in Foundation.
- If a design conflicts with this page, fix the design before growing the system.
