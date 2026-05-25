# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T13:26:19.486Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:nate-herk:20260525132619`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Nate Herk: Give Me 10 Mins and I'll Save You Millions of Claude Tokens (6cEQEba0i2A)
  - URL: https://www.youtube.com/watch?v=6cEQEba0i2A
  - Visual evidence: 3; build candidates: 2; tokens: 61512
  - Resource links: 0 resolved public; 12 blocked; 0 still queued
- Nate Herk: How to Use Your Claude Code Projects in Codex in 5 Mins (kB9iMD0EjT8)
  - URL: https://www.youtube.com/watch?v=kB9iMD0EjT8
  - Visual evidence: 3; build candidates: 2; tokens: 51775
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: How to Deploy Your Claude Automations (3 Methods) (xJ5oz63mIec)
  - URL: https://www.youtube.com/watch?v=xJ5oz63mIec
  - Visual evidence: 3; build candidates: 2; tokens: 122351
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: Anthropic Just Dethroned OpenAI. Here's What Happens Next. (-nG-9vlSkho)
  - URL: https://www.youtube.com/watch?v=-nG-9vlSkho
  - Visual evidence: 3; build candidates: 2; tokens: 46292
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Nate Herk: Every Level of Claude Explained in 21 Minutes (ZRb7D6R64hM)
  - URL: https://www.youtube.com/watch?v=ZRb7D6R64hM
  - Visual evidence: 3; build candidates: 2; tokens: 121948
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Nate Herk: Claude Code Just Got an Agent Dashboard (ZAaxx3qyT8g)
  - URL: https://www.youtube.com/watch?v=ZAaxx3qyT8g
  - Visual evidence: 3; build candidates: 2; tokens: 45314
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: Hermes Agent: Zero to Personal AI Assistant (1 Hour Course) (gb5TlGw6Uks)
  - URL: https://www.youtube.com/watch?v=gb5TlGw6Uks
  - Visual evidence: 3; build candidates: 2; tokens: 322237
  - Resource links: 0 resolved public; 12 blocked; 0 still queued
- Nate Herk: This is The Most Powerful Tool to Give to Claude Code (YHk45NEpspE)
  - URL: https://www.youtube.com/watch?v=YHk45NEpspE
  - Visual evidence: 3; build candidates: 2; tokens: 84641
  - Resource links: 2 resolved public; 12 blocked; 0 still queued
- Nate Herk: Claude Just Solved Session Limits (3QclAjmu5Tw)
  - URL: https://www.youtube.com/watch?v=3QclAjmu5Tw
  - Visual evidence: 3; build candidates: 2; tokens: 60067
  - Resource links: 0 resolved public; 11 blocked; 0 still queued

## Top Build Candidates

- Automated Session Handoff Manager
  - Source: Nate Herk - Give Me 10 Mins and I'll Save You Millions of Claude Tokens
  - Why: Reduces token costs by summarizing and clearing active LLM sessions before the 1-hour or 5-minute TTL cache window expires.
  - Next: Develop a CLI utility or agent middleware that monitors session idle time and triggers state compression.
  - Evidence: 06:48, 07:15
- Local Token & Cache Dashboard
  - Source: Nate Herk - Give Me 10 Mins and I'll Save You Millions of Claude Tokens
  - Why: Provides developers with real-time visibility into cache hit rates, input/output tokens, and estimated API costs.
  - Next: Build a lightweight local web dashboard that parses agent log files to visualize token metrics.
  - Evidence: 00:04, 03:21
- Multi-Agent Workspace Adapter
  - Source: Nate Herk - How to Use Your Claude Code Projects in Codex in 5 Mins
  - Why: Allows AIOS to dynamically generate and maintain configuration files (.claude/, .codex/, AGENTS.md) so multiple coding assistants can run on the same codebase without conflict.
  - Next: Develop a workspace initialization script that outputs both Claude Code and Codex compatible directory structures and instructions.
  - Evidence: 00:41, 05:13
- Cross-Agent Session Handoff Protocol
  - Source: Nate Herk - How to Use Your Claude Code Projects in Codex in 5 Mins
  - Why: Enables seamless transition of active tasks between different LLM providers (e.g., Claude to GPT-5) by serializing session state, active files, and next steps into a standardized handoff payload.
  - Next: Create a system-level '/handoff' command in AIOS that compiles current workspace state into a prompt optimized for the target agent.
  - Evidence: 07:07
- AIOS Session-Scoped Cron Scheduler
  - Source: Nate Herk - How to Deploy Your Claude Automations (3 Methods)
  - Why: Allows users to schedule recurring agent tasks locally without external infrastructure, matching Claude's internal cron tools.
  - Next: Implement local cron-like scheduling using lightweight background workers tied to the active user session.
  - Evidence: 01:50, 03:21
- Lifecycle Hook System for Agent Tools
  - Source: Nate Herk - How to Deploy Your Claude Automations (3 Methods)
  - Why: Triggers custom scripts or notifications before/after tool execution, improving observability and control.
  - Next: Add pre-execution and post-execution event listeners to the AIOS tool execution pipeline.
  - Evidence: 20:06
- Model-Agnostic Agent Abstraction Layer
  - Source: Nate Herk - Anthropic Just Dethroned OpenAI. Here's What Happens Next.
  - Why: Prevents vendor lock-in during the AI subsidy phase by allowing instant hot-swapping of underlying LLMs (Claude Code vs Codex) without rewriting agent logic.
  - Next: Develop a unified API wrapper for agent tools that standardizes prompt templates and system instructions across OpenAI and Anthropic schemas.
  - Evidence: 05:10, 06:14
- Token Cost & Value Estimator
  - Source: Nate Herk - Anthropic Just Dethroned OpenAI. Here's What Happens Next.
  - Why: Tracks real-time API token usage against flat-rate subscription limits to calculate the exact subsidy value and predict future cost impacts post-reset.
  - Next: Build a lightweight middleware proxy that logs input/output tokens for all agent runs and maps them to standard commercial API pricing.
  - Evidence: 01:15, 03:05
- Workspace-Specific Context Initializer (.aios.md)
  - Source: Nate Herk - Every Level of Claude Explained in 21 Minutes
  - Why: Allows developers to define workspace-specific rules, tech stacks, and naming conventions that agents auto-load, reducing prompt overhead.
  - Next: Develop a middleware that detects a local .aios.md file and injects its contents into the agent's system prompt.
  - Evidence: 10:01
- Token Budgeting & Auto-Dream Memory Consolidation
  - Source: Nate Herk - Every Level of Claude Explained in 21 Minutes
  - Why: Prevents runaway API costs in autonomous loops and keeps long-running agent memory clean by pruning redundant or contradictory facts.
  - Next: Build a background worker that runs memory consolidation routines and enforces token caps on agent runs.
  - Evidence: 18:21, 18:49
- Terminal-Based Multi-Agent Supervisor Dashboard
  - Source: Nate Herk - Claude Code Just Got an Agent Dashboard
  - Why: Allows developers to monitor and unblock multiple parallel local agents from a single terminal interface, reducing tab clutter.
  - Next: Build a curses-based CLI dashboard that aggregates stdout and status states from backgrounded agent processes.
  - Evidence: 00:10, 01:26
- Autonomous Goal-Seeking Execution Loop (/goal)
  - Source: Nate Herk - Claude Code Just Got an Agent Dashboard
  - Why: Enables long-running, self-correcting agent runs that execute shell commands iteratively until a defined metric or objective is met.
  - Next: Implement an agent loop wrapper that accepts a high-level goal, generates subtasks, executes them locally, and self-evaluates success.
  - Evidence: 03:15, 03:35
- Durable Markdown-Based Memory Sync
  - Source: Nate Herk - Hermes Agent: Zero to Personal AI Assistant (1 Hour Course)
  - Why: Enables seamless state persistence and portability across different agent runtimes using simple markdown files.
  - Next: Design a background sync service that commits local USER.md and MEMORY.md changes to a private Git repository.
  - Evidence: 07:36, 33:41
- Multi-Agent Containerized Isolation
  - Source: Nate Herk - Hermes Agent: Zero to Personal AI Assistant (1 Hour Course)
  - Why: Prevents credential and context leakage by running specialized agents in isolated Docker containers on a single host.
  - Next: Develop a Docker-compose template that spins up isolated agent environments with restricted API key access.
  - Evidence: 11:10, 12:57
- Agent-Native CLI Generator
  - Source: Nate Herk - This is The Most Powerful Tool to Give to Claude Code
  - Why: Enables AIOS to dynamically generate local, token-efficient Go CLIs for target services instead of relying on heavy MCP servers.
  - Next: Integrate the Printing Press factory (`cli-printing-press`) into AIOS tool-building workflows.
  - Evidence: 11:11
- Local SQLite Mirroring for Agent Tools
  - Source: Nate Herk - This is The Most Powerful Tool to Give to Claude Code
  - Why: Reduces external API roundtrips and token usage by caching tool states in a local SQLite database queried directly by the agent.
  - Next: Implement local SQLite caching layers for high-frequency AIOS tools.
  - Evidence: 03:03
- High-Throughput Multi-Agent Orchestrator
  - Source: Nate Herk - Claude Just Solved Session Limits
  - Why: Leverages the 16x API rate limit increase to run complex parallel sub-agents on Claude Opus without throttling.
  - Next: Build a benchmark suite testing parallel agent execution on Tier 1 Opus API limits.
  - Evidence: 02:51, 09:02
- Claude Code Session Monitor
  - Source: Nate Herk - Claude Just Solved Session Limits
  - Why: Optimizes developer workflows by tracking the newly doubled 5-hour rate limits directly in the terminal.
  - Next: Develop a CLI tool that queries and displays remaining Claude Code session limits.
  - Evidence: 01:20, 04:15

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - 6cEQEba0i2A:nate-herk, kB9iMD0EjT8:nate-herk, xJ5oz63mIec:nate-herk, -nG-9vlSkho:nate-herk, ZRb7D6R64hM:nate-herk, ZAaxx3qyT8g:nate-herk, gb5TlGw6Uks:nate-herk, YHk45NEpspE:nate-herk, 3QclAjmu5Tw:nate-herk
- PASS public YouTube page evidence captured for every video - 6cEQEba0i2A:true, kB9iMD0EjT8:true, xJ5oz63mIec:true, -nG-9vlSkho:true, ZRb7D6R64hM:true, ZAaxx3qyT8g:true, gb5TlGw6Uks:true, YHk45NEpspE:true, 3QclAjmu5Tw:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 6cEQEba0i2A:ready_for_scoper, kB9iMD0EjT8:ready_for_scoper, xJ5oz63mIec:ready_for_scoper, -nG-9vlSkho:ready_for_scoper, ZRb7D6R64hM:ready_for_scoper, ZAaxx3qyT8g:ready_for_scoper, gb5TlGw6Uks:ready_for_scoper, YHk45NEpspE:ready_for_scoper, 3QclAjmu5Tw:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 6cEQEba0i2A:0, kB9iMD0EjT8:0, xJ5oz63mIec:0, -nG-9vlSkho:0, ZRb7D6R64hM:0, ZAaxx3qyT8g:0, gb5TlGw6Uks:0, YHk45NEpspE:0, 3QclAjmu5Tw:0
- PASS batch produced ranked build candidates - 18
