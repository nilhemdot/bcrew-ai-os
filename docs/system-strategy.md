# System Strategy

Status: Active
Last updated: 2026-04-28

This page defines how the BCrew AI OS works as an operating system around the business.

Business Strategy defines where Benson Crew is going.

System Strategy defines how the system keeps that strategy live, source-backed, visible, and enforceable.

Current execution order for the rebuild lives in [docs/rebuild/current-plan.md](docs/rebuild/current-plan.md) and is surfaced in Foundation under `System Strategy -> Rebuild Plan`.
The target operating model for Harlan, Crewbert, assistants, and delegation lives in [docs/rebuild/agent-architecture.md](docs/rebuild/agent-architecture.md).

## Foundation's Job

Foundation is the root operating layer of the business.

Its job is to:

- keep durable strategy clean and stable
- keep changing work, decisions, and accountability in a live operating layer
- keep live values tied to real sources instead of stale documents
- make every future hub plug into shared truth instead of becoming its own truth system

Foundation has four layers:

- **Business Foundation**  
  The durable business strategy and the supporting docs that clarify it.

- **Operating Foundation**  
  The system's working memory and accountability layer: decisions, backlog, open questions, recent changes, and workflow state.

- **Source Layer**  
  The live truth layer: source contracts, connector status, source-backed views, and source trust.

- **Systems Layer**  
  The operating bundles that connect sources, connectors, runtime jobs, source notes, backlog cards, and maturity levels into something hubs can use.

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
10. Foundation priority is an operating guardrail. Overview gives the command order, live Backlog owns task truth, and Rebuild Plan explains doctrine/phase gates. If work drifts from that order, the system should say so and require an explicit override or backlog routing.

## Change Doctrine

- The system proposes.
- The right human owner confirms.
- The system records.

No agent or automation silently rewrites core strategy.

Meaningful changes should be traceable and visibly reviewable: what changed, why it changed, which decision or source justified it, who confirmed it, and when it happened.
Approvals should follow role and ownership boundaries, not default back to one person.
Conflicting decisions should be surfaced and cleaned up, not allowed to silently coexist.

Doctrine and the rebuild plan are governed, not frozen. Research from operators, paid training, YouTube/creator intelligence, Mycro/myICOR, customer evidence, or better system proof can change the plan when the new evidence is useful and Steve or the right owner confirms the update. When that happens, update the doctrine, rebuild plan, backlog, decisions, source notes, and verifier checks together instead of treating the old plan as permanent.

## Build Discipline

Heavy build days must close through Foundation, not through chat memory.

Operating rules:

- memory is not backlog; if a conversation changes the build, it must land in repo truth or a DB-backed backlog/decision record
- a verifier can guard a spec, but it must not become the only spec
- human-readable sample rows matter; verifier green is not enough when output quality is the product
- UI work is not accepted just because the backend is correct
- after a major surface or doctrine pass, run a checkpoint before moving on: what changed, what was learned, what belongs in backlog, what belongs in docs, and what verifier should prevent regression
- Recent Builds must let Steve understand what changed, what it does, where it lives, and what to review next without reading long chats or git diffs

When the system learns something durable during a builder/reviewer loop, capture it at the lowest durable layer that fits: backlog card, source contract, current plan/state, system strategy, or verifier. Handoffs are evidence; active docs and live backlog are operating truth.

## Strategic Intelligence Doctrine

Strategy Hub is not a one-time quarterly-planning page. The long-term direction is a continuous Strategic Intelligence loop:

1. mine company signals from governed sources
2. separate strategic issues from operational noise
3. prove where the signal came from
4. scope what is already answered, what is partial, and what is truly missing
5. route decisions, questions, tasks, or issues to the right owner and hub
6. record resolution so stale issues stop resurfacing as fresh work

The gap-resolving Scoper is the first intended depth layer, but it must not be built as an agent swarm. It should be on-demand, tool-using, evidence-cited, cost-bounded, and built after the strategic issue schema/spec is approved. The Scoper's job is not to write a deeper research essay; its job is to narrow ambiguity into verified facts, remaining gaps, owner, and next steps.

The current Strategy Hub route-review UI proved useful plumbing but was not accepted as a meeting-ready product. Strategy route-review UI proof plumbing is not the same thing as meeting-ready UX. Until Foundation freshness, build visibility, and checkpoint discipline are stable, Strategy Hub polish should pause and Foundation should return to the command order.

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

Current direction:

- **Harlan** is Steve's personal assistant, not the BCrew AI OS itself.
- Harlan's long-term identity home should live outside this repo in an external agent home such as `~/.agents/harlan/` or an equivalent Benson Crew agent registry.
- Repo-local coding agents may live inside a repo because their job is to work on that repo specifically.
- System-dedicated BCrew agents should be defined by the system registry and runtime, not by ad hoc persona folders scattered through the repo.
- An agent does not lose capabilities because it lives outside a repo. Capability comes from runtime permissions, channel bindings, allowed tools, and an explicit project registry.
- The repo may host repo-local coder agents and system code, but it should not become the permanent identity home for a swarm of long-lived personal agents.

## Runtime And Model Position

- **Foundation** is the trust layer: strategy docs, source contracts, PostgreSQL memory, decisions, backlog, and verification.
- **BCrew router** owns model and runtime-route decisions for system workloads.
- **OpenClaw** is one runtime/channel adapter, especially for the ChatGPT/Codex subscription path. It is not the operating system.
- **Claude Code / Codex** are terminal-native coding and investigation tools. They may also become supervised router adapters for specific internal workloads, but they are not the product foundation.
- **Official APIs** are the clean default for customer-facing automated workloads unless a native/subscription route is explicitly allowed, probed, logged, and workload-classified.
- **Subscription/native routes** can be internal capacity lanes when supported, observable, stable, policy-classified, and paced. They are not a consumer-plan arbitrage business model.
- **Gemini / Claude / OpenAI / local models** are model choices under the router. Model choice is per workload, not system identity.
- These are not competing foundations. They are different layers in one stack: Foundation, router, runtime adapters, model providers, and coding tools.

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
- use Foundation systems as their operating bundles instead of each hub inventing its own hidden source map
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
