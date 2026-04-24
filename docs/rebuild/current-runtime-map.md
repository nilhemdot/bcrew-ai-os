# Current Runtime Map

Last updated: 2026-04-17
Status: Plain-English architecture map

This doc exists for one reason:

to answer, clearly and simply, what each part of the system is.

If the words Foundation, OpenClaw, Harlan, Crewbert, terminal agent, memory, or model start blurring together, come back here.

## The Short Version

- **Foundation** is the truth layer.
- **OpenClaw** is the live runtime layer.
- **Harlan** is a personal assistant identity.
- **Crewbert** is the planned orchestrator identity.
- **Codex / Claude Code** are terminal-native coding and investigation tools.
- **Memory** is not one thing. Different layers of memory live in different places.

## The 5 Layers

### 1. Foundation

Foundation is the business operating truth layer.

It includes:

- strategy docs
- source contracts
- PostgreSQL operating memory
- decisions
- backlog
- verification

Foundation is what the future agents are supposed to use.

Foundation is not itself an agent.

Foundation is not OpenClaw.

Foundation is not Claude Code.

### 2. Runtime

The runtime is what runs live agents and channels.

For this system, the planned runtime is:

- **OpenClaw**

OpenClaw handles things like:

- Telegram
- WhatsApp
- channel connections
- live agent process execution
- routing and runtime behavior

So:

- OpenClaw is a **system/runtime setup**
- not the business foundation
- not the permanent identity of Harlan
- not the permanent identity of Crewbert

### 3. Agent Identity

Agent identity answers:

- who is this
- what is this agent for
- who owns it
- what memory should it load
- what permissions should it have

Examples:

- **Harlan** = Steve's personal assistant
- **Crewbert** = BCrew system orchestrator
- future Nick assistant
- future Tanner assistant

Identity is not the same thing as runtime.

OpenClaw can run Harlan.
That does not mean Harlan and OpenClaw are the same thing.

### 4. Execution Mode

Execution mode answers how the agent does work.

There are two main kinds:

- **Constrained / tool-scoped**
  - Gmail
  - Calendar
  - Drive
  - source APIs
  - database reads/writes

- **Terminal-native**
  - shell
  - files
  - git
  - browser/computer use
  - package installs
  - open-ended investigation

Terminal-native is the most flexible mode.

It is not automatically the default mode every agent should use all the time.

### 5. Model Layer

The model layer answers which brain is used for a given job.

Current direction:

- **GPT-5.4** for primary high-trust reasoning
- **Gemini Flash** for cheap classification and support work
- **Claude API** when Claude is the best fit
- **Codex / Claude Code** for terminal-native coding and investigation

These are not separate foundations.

They are workers and tools used under one system.

## Where Memory Actually Lives

This is the part that keeps getting blurred together.

Memory is not one single magic bucket.

### Foundation Memory

This is the business operating memory.

It lives in:

- PostgreSQL
- decisions
- backlog
- change events
- source-backed records

This is the memory the system uses to stay accountable and keep truth visible.

### Agent Memory

This is the assistant/runtime memory.

Current direction:

- OpenClaw native memory for agent recall baseline
- later improvements only after the baseline is proven

This is for things like:

- assistant continuity
- recall across sessions
- personal assistant context

### Workspace Identity Memory

This is the local session identity layer.

Examples:

- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- local memory files

This helps a session know how to behave inside a workspace.

This is not the same as the system's business memory.

## What Happens When You Talk To Harlan Today

Current live reality:

- Telegram messages to `@harlan_bcrew_bot`
- go to the local OpenClaw gateway on the Mac Mini
- the runtime is pointed at this repo workspace
- so the bot is currently OpenClaw wearing the Harlan identity on top of the `bcrew-ai-os` workspace

That is why the identity feels muddy.

Current Harlan is not yet a fully separated external personal-assistant home.

He is:

- a live OpenClaw Telegram bot
- mounted to this repo workspace
- using the repo/workspace context

## What Harlan Should Become

Target direction:

- Harlan becomes a real external personal assistant home
- Harlan is Steve-facing
- Harlan spans projects
- Harlan has explicit project reach via a project registry

That means:

- Harlan should eventually live outside this repo
- Harlan should not be identical to BCrew AI OS
- Harlan should still be able to reach BCrew AI OS when allowed

## What Crewbert Should Be

Crewbert is the orchestrator.

Crewbert should:

- receive delegated work
- route work to specialists and tools
- manage supervision
- manage queueing
- expose pause, stop, and decommission controls
- keep work visible in the operating record

Crewbert is not supposed to be the default chat personality most humans talk to every day.

## Why OpenClaw Still Matters

OpenClaw matters because it gives you:

- model-agnostic runtime flexibility
- live channels
- local execution
- room to route different jobs to different models

That is why it feels like a system, not just a model wrapper.

That instinct is right.

The correction is:

OpenClaw is the runtime layer in the system.

It is not the whole architecture by itself.

## Why Terminal Agents Still Matter

Terminal-native agents matter because they can:

- inspect real files
- run commands
- browse
- retry
- self-correct
- do open-ended work

That is why they feel smart and useful.

But the system should still separate:

- who the agent is
- who runs it
- what permissions it has
- when it is allowed to use terminal power

## The Correct Mental Model

Use this sentence:

**Foundation is the truth layer. OpenClaw is the runtime. Harlan and Crewbert are agent identities. Terminal access is one execution mode. Memory lives in multiple layers.**

## The Current Direction

If you need the short operating answer:

- You talk to **Harlan**
- Harlan is your personal assistant
- Harlan can answer directly, use tools, or delegate
- **Crewbert** sits behind Harlan as orchestrator
- specialist agents and workers sit under Crewbert
- repo-local coding agents are separate from both
- Foundation is what all of them are supposed to use when truth matters

## What We Are Building Toward

1. finish Foundation
2. finish verification
3. close source trust
4. lock Harlan / Crewbert / project-registry architecture
5. turn on one trusted assistant loop
6. only then expand the agent layer
