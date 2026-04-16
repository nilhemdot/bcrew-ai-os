# System Strategy

This page defines how the BCrew AI OS works as an operating system around the business.

Business Strategy defines where Benson Crew is going.

System Strategy defines how the system keeps that strategy live, source-backed, visible, and enforceable.

## Foundation's Job

Foundation is the root operating layer of the business.

Its job is to:

- keep durable strategy clean and stable
- keep changing work, decisions, and accountability in a live operating layer
- keep live values tied to real sources instead of stale documents
- make every future hub plug into shared truth instead of becoming its own truth system

Foundation has three layers:

- **Business Foundation**  
  The durable business strategy and the supporting docs that clarify it.

- **Operating Foundation**  
  The system's working memory and accountability layer: decisions, backlog, open questions, recent changes, and workflow state.

- **Source Layer**  
  The live truth layer: source contracts, connector status, source-backed views, and source trust.

## Truth Model

- Durable truth lives in docs and Git.
- Volatile operating memory lives in PostgreSQL.
- Live values come from source-backed views, not markdown snapshots.
- Decisions, change events, and conversation history stay queryable over time.

This means:

- strategy docs stay concise
- changing work stays in the system, not loose markdown
- every important live value should be traceable to a source ID and real source link

## System Role

The system turns strategy into an operating environment.

It reads reality from source systems, keeps shared memory current, surfaces drift, routes accountability, records decisions, and helps carry approved changes into execution.

It supports the human leadership team. It does not replace it.

## System Rules

1. Business strategy is the source of truth for business direction.
2. Live KPI values and milestone math belong in source systems, not markdown docs.
3. Decisions that change strategy are explicit records, not chat residue.
4. Strategy docs move through tracked proposals and approvals, not silent edits.
5. Every important concept should have one canonical home so the system never creates duplicate truth.
6. Benson Crew and Real Broker must stay distinct in the system model.
7. Agents can support, analyze, and operationalize strategy, but they do not set or change strategy on their own.
8. The system should meet people in their natural workflows before forcing them into a new surface.
9. If the system says something is live, connected, or working, it should reflect real current state.

## Change Doctrine

- The system proposes.
- The right human owner confirms.
- The system records.

No agent or automation silently rewrites core strategy.

Meaningful changes should be traceable and visibly reviewable: what changed, why it changed, which decision or source justified it, who confirmed it, and when it happened.
Approvals should follow role and ownership boundaries, not default back to one person.
Conflicting decisions should be surfaced and cleaned up, not allowed to silently coexist.

## Agent Doctrine

Agents support strategy. They do not define it.

Coding assistants like Codex and Claude Code are implementation tools inside the system. They are not business agents in the operating model.

Agents should:

- ground themselves in Foundation first
- have a defined owner, purpose, permissions, memory model, and escalation path before activation
- use source contracts when live values matter
- write changing work into the memory layer
- surface drift, blockers, and inconsistencies
- carry approved decisions into execution systems

Agents should not:

- invent strategy
- overwrite approved truth silently
- hardcode live numbers into docs
- normalize stale or unverifiable data

## Agent Boundaries And Deployment

- Prefer to keep project repos as the home of system docs and code, not the long-term identity home of the agents that use them.
- Personal agents may span multiple systems and projects for one human owner.
- System-dedicated agents may specialize in one system deeply without trapping their identity, memory, or permissions inside that repo.
- Browser-capable agents should run with isolated user and session boundaries when credentials or trust boundaries matter.
- Every long-running runtime, scheduler, or agent service needs visible supervision, a stop path, and a clean decommission path.

## Source Doctrine

- every important live input needs a stable source ID
- source contracts define which system owns which values
- connectors are only the pipe; trust still has to be earned
- source links should be reachable from the UI
- source-backed panels should update when the source changes
- source trust matters as much as source connectivity
- overlapping or contradictory sources should be visibly flagged so the system never blends conflict into false certainty

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

- Read this page as doctrine, not as a product roadmap or inventory sheet.
- Use it to judge whether a new hub, agent, surface, or workflow belongs in Foundation.
- If a design conflicts with this page, fix the design before growing the system.
