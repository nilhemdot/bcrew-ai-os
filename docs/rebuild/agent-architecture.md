# Agent Architecture

Last updated: 2026-04-26
Status: Target operating model for the first real agent layer

This doc answers the question:

How is the BCrew AI OS agent layer supposed to work once Foundation is ready?

This is not the current build phase.

This is the locked target shape we are building toward so the system does not drift while Foundation work continues.

## Straight Answer

The operating model is:

1. each real human gets their own personal assistant
2. those personal assistants are the default user-facing layer
3. a system orchestrator sits behind them
4. the orchestrator delegates work to specialist agents and tools
5. specialist agents do not become the main user-facing identity unless there is a deliberate reason

For BCrew:

- **Harlan** = Steve's personal assistant
- **Crewbert** = BCrew system orchestrator
- future leaders may get their own personal assistants
- specialist agents exist behind the scenes for scoped work

## The Actual Stack

There are four layers. Do not mix them.

### 1. Foundation

This is the trust layer:

- strategy docs
- source contracts
- PostgreSQL memory
- decisions
- backlog
- verification

Foundation is not a model and not an agent.

### 2. Runtime

This is the live agent layer:

- OpenClaw for channel orchestration, routing, scheduling, and supervised execution

The runtime is not the same thing as the model.

### 3. Model And Tool Layer

This is the reasoning and execution substrate used by agents:

- BCrew policy-aware LLM router for backend workload routing
- OpenClaw/Codex subscription adapter for the first shared-intelligence extraction/synthesis route
- Claude Code / Claude Agent SDK subscription adapter as the next subscription route to build
- official APIs for fallback or workloads that require API-only capabilities
- Gemini for video/vision and long-context paths where appropriate
- Codex and Claude Code for terminal-native coding and deep investigation work

These are not separate foundations.

They are swappable workers under one system.

### 4. Agent Layer

This is the role structure:

- personal assistants
- orchestrator
- specialist agents
- repo-local coding agents

## External Pattern Note

Steve's 2026-04-26 Mycro video drop, archived as `SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys`, reinforced a useful architecture pattern without changing BCrew doctrine.

The useful pattern:

- separate knowledge/personal assistant systems from process-automation systems
- keep an orchestrator as the single point of contact
- route work to specialist agents instead of forcing one agent to do every job
- maintain a team/agent registry, task inbox, deliverables inbox, and workstream definitions
- let specialists work in separate context windows where the runtime supports it
- preserve persistent memory, daily logs, and open-task carry-forward
- treat agent hiring/onboarding as a governed process with questions, acceptance criteria, and source context

BCrew should not copy a folder-only architecture as the source of truth. Foundation remains the source-backed trust layer: Postgres, source contracts, ledgers, permissions, artifacts, atoms, decisions, backlog, and verifier checks. The Mycro pattern belongs mainly in the later execution layer: Crewbert orchestration, specialist worker contracts, workstreams, task/deliverable ledgers, and visible supervision.

## The Target Operating Model

### Personal Assistant Layer

Each core human should talk to their own assistant first.

Examples:

- Steve -> Harlan
- Nick -> future Nick assistant
- Carson -> future Carson assistant
- Tanner -> future Tanner assistant

These assistants should:

- know the person's role, priorities, permissions, and context
- present one continuous identity across channels
- translate human intent into system work
- hide internal orchestration from the user
- escalate to the orchestrator when the request crosses systems, teams, or specialist workflows

These assistants should not:

- become their own private disconnected truth systems
- directly own global system policy
- silently bypass the orchestrator on business-critical multi-step work

Personal assistants also need a real onboarding loop. The target is not a generic welcome message; it is a governed profile-building process that helps create a private personal profile, learns goals/preferences/context, captures feedback, and eventually sends one useful daily nugget. `ME.md` is only a working label for that profile. See [Personal Agent Onboarding](../agents/personal-agent-onboarding.md).

### Orchestrator Layer

**Crewbert** is the system orchestrator.

Crewbert is not the main day-to-day chat persona for most people.

Crewbert's job is to:

- receive delegated work from personal assistants
- route jobs to the right specialist agent, tool, or workflow
- enforce permissions and approval rules
- maintain queue discipline
- supervise long-running work
- expose status, pause, stop, and decommission controls
- keep the work visible in the system

Crewbert should not:

- try to be every user's personal assistant
- become the public-facing personality for all interactions
- hide work from the operating record

### Specialist Agent Layer

These are scoped workers under the orchestrator.

Examples:

- meeting operator
- content planner
- recruiting analyst
- finance explainer
- bounded research worker
- browser research agent

Specialist agents should be activated when:

- the work is repetitive, role-shaped, and bounded
- the inputs, outputs, and approvals are clear
- supervision exists
- the business value is real

Do not create specialist agents just because the role name sounds good.

### Repo-Local Coding Agent Layer

These are a separate class of agents.

Examples:

- `bcrew-ai-os` coder bot
- future repo-specific coder or debugger bots

These agents are allowed to live inside a repo because their job is specifically to work on that repo.

They are not business agents.

They are implementation agents.

## Where Each Agent Lives

### Harlan

Harlan should live outside this repo.

Long-term home:

- external agent home such as `~/.agents/harlan/`
- or an equivalent Benson Crew agent registry

Why:

- Harlan is cross-project by nature
- Harlan should not be trapped inside one repo
- Harlan's identity, memory spine, and project reach should be portable

### Crewbert

Crewbert belongs to the BCrew AI OS system.

Crewbert should be defined by:

- the live system registry
- the runtime configuration
- the operating model in Foundation

Crewbert should not depend on one ad hoc prompt file inside a random folder.

### Specialist Business Agents

These belong to the BCrew AI OS runtime and registry.

They should be defined in-system with:

- owner
- purpose
- permissions
- memory scope
- channels
- source dependencies
- escalation path

### Repo-Local Coding Agents

These can live inside repos.

Examples:

- `.claude/`
- `.codex/`
- repo-local settings and instructions

This is the right place for repo-specific implementation agents.

## Will Harlan Lose Abilities If He Lives Outside The Repo

No.

An agent's abilities do not come from the folder it lives in.

Abilities come from:

- runtime permissions
- channel bindings
- allowed tools
- authenticated connectors
- browser/session access
- project registry reach

What changes when Harlan moves outside the repo is not capability.

What changes is boundary discipline.

That is a good change.

## The Project Registry

Because Harlan is cross-project, he needs an explicit project registry.

That registry should answer:

- which systems he can reach
- which repos he can touch
- which dashboards he can open
- which APIs he can call
- what auth mode each system uses
- what actions are allowed
- where escalation is required

Without a project registry, Harlan's reach becomes hidden human memory.

That does not scale and is not trustworthy.

## The Correct Delegation Path

Default path:

1. human asks personal assistant
2. personal assistant interprets the request
3. if the work is simple and within scope, the assistant handles it directly
4. if the work crosses systems or needs specialist execution, the assistant delegates to Crewbert
5. Crewbert routes to the right specialist agent, tool, or workflow
6. results flow back through the assistant to the human
7. important work is recorded in the operating layer

That means Steve should usually talk to Harlan, not Crewbert.

Crewbert exists behind the curtain most of the time.

## What This Means For The Build

The system should not build "100 agents in one folder."

It should build in this order:

1. Foundation trust layer
2. verification
3. first trusted source loops
4. agent architecture lock
5. one trusted assistant loop
6. then specialist expansion

## First Real Agent Sequence

The first sequence should be:

1. define Harlan's external identity model
2. define Crewbert's orchestrator contract
3. define the project registry
4. define the agent franchise contract
5. recover the old bot-onboarding/coaching lessons into the personal-agent onboarding contract
6. build one trusted assistant loop for Harlan
7. prove delegation to one specialist workflow
8. only then add more assistants or specialists

## What We Are Not Doing

- not making every user talk directly to the orchestrator
- not turning this repo into the permanent identity home of all agents
- not treating Claude Code, Codex, and Gemini as three separate foundations
- not building a giant unsupervised terminal swarm as the architecture
- not letting browser-capable agents run without visible supervision

## Decision Summary

If you need the short version:

- Harlan is Steve's personal assistant
- Crewbert is the hidden orchestrator
- each human can eventually get their own assistant
- assistants delegate to Crewbert for multi-step or cross-system work
- specialist agents work under Crewbert
- repo-local coding agents are separate and can live inside repos
- Harlan should eventually live outside this repo with an explicit project registry
