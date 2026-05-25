# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T19:34:59.993Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525193459`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 7 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: I Tested DeepSeek V4 vs Opus 4.7 vs GPT 5.5 (uT2m7VD99qA)
  - URL: https://www.youtube.com/watch?v=uT2m7VD99qA
  - Visual evidence: 3; build candidates: 2; tokens: 151353
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Matt Pocock / Total TypeScript: I'm using claude --worktree for everything now (yv8VZpov8bk)
  - URL: https://www.youtube.com/watch?v=yv8VZpov8bk
  - Visual evidence: 3; build candidates: 2; tokens: 46586
  - Resource links: 0 resolved public; 5 blocked; 0 still queued
- Jono Catliff: How I Save Over 50% of My Claude Code Context (12 Rules) (7nP2wjGcIXs)
  - URL: https://www.youtube.com/watch?v=7nP2wjGcIXs
  - Visual evidence: 3; build candidates: 2; tokens: 85693
  - Resource links: 0 resolved public; 27 blocked; 0 still queued
- Brad Bonanno / AI & Automation: I Stopped Hitting Claude Code Usage Limits (Here's How) (9ToOfgZ4qqQ)
  - URL: https://www.youtube.com/watch?v=9ToOfgZ4qqQ
  - Visual evidence: 3; build candidates: 2; tokens: 63428
  - Resource links: 0 resolved public; 7 blocked; 0 still queued
- Jack / Itssssss_Jack: DeepSeekV4 + Claude Code = 100X Cheaper (tn7zXRv3Xmo)
  - URL: https://www.youtube.com/watch?v=tn7zXRv3Xmo
  - Visual evidence: 3; build candidates: 2; tokens: 95229
  - Resource links: 1 resolved public; 9 blocked; 0 still queued
- Mansel Scheffel: Building AI Agents is Overrated..do this instead (sTh6d8WFEUc)
  - URL: https://www.youtube.com/watch?v=sTh6d8WFEUc
  - Visual evidence: 3; build candidates: 2; tokens: 99922
  - Resource links: 0 resolved public; 5 blocked; 0 still queued
- Simon Scrapes: Creating Your Own Agentic OS is Easy (Insanely Powerful) (w0S-khYCaB4)
  - URL: https://www.youtube.com/watch?v=w0S-khYCaB4
  - Visual evidence: 3; build candidates: 2; tokens: 137641
  - Resource links: 0 resolved public; 3 blocked; 0 still queued

## Top Build Candidates

- Multi-Agent Coding Arena
  - Source: Chase AI - I Tested DeepSeek V4 vs Opus 4.7 vs GPT 5.5
  - Why: Enables real-time side-by-side benchmarking of different LLM engines on complex frontend tasks.
  - Next: Build a CLI harness that spins up parallel Docker containers running Claude Code and Codex.
  - Evidence: 04:57
- Visual Feedback Loop for 3D/WebGL Generation
  - Source: Chase AI - I Tested DeepSeek V4 vs Opus 4.7 vs GPT 5.5
  - Why: Prevents broken 3D/WebGL renders (like DeepSeek's glitched output) by capturing screenshots and feeding them back to the LLM.
  - Next: Integrate Puppeteer screenshot capture into the agentic loop to detect rendering anomalies.
  - Evidence: 11:53, 17:07
- Isolated Agent Worktree Manager
  - Source: Matt Pocock / Total TypeScript - I'm using claude --worktree for everything now
  - Why: Enables parallel execution of multiple coding agents without workspace conflicts by leveraging git worktrees.
  - Next: Implement an orchestrator module in AIOS that spawns sub-agents in temporary git worktrees.
  - Evidence: 03:02
- Safe Branch-Enforcing Git Agent
  - Source: Matt Pocock / Total TypeScript - I'm using claude --worktree for everything now
  - Why: Prevents agents from accidentally committing directly to main/master branches when working in isolated worktrees.
  - Next: Add system prompt constraints and pre-commit hooks in AIOS to force agents to create feature branches.
  - Evidence: 05:02
- Modular Skill-Based Prompt Loader
  - Source: Jono Catliff - How I Save Over 50% of My Claude Code Context (12 Rules)
  - Why: Reduces system prompt bloat by dynamically loading task-specific markdown files instead of a single massive system prompt.
  - Next: Create a directory watcher for a skills/ folder and inject only matching skill files into the agent's system prompt dynamically.
  - Evidence: 02:29
- Automated Context Compactor for LLM Agents
  - Source: Jono Catliff - How I Save Over 50% of My Claude Code Context (12 Rules)
  - Why: Prevents agent performance degradation over long sessions by summarizing history when context usage exceeds a threshold.
  - Next: Implement a middleware that monitors token usage and calls a summarization chain to replace older messages with a concise summary.
  - Evidence: 09:35
- Dynamic Context Auditor
  - Source: Brad Bonanno / AI & Automation - I Stopped Hitting Claude Code Usage Limits (Here's How)
  - Why: Reduces token usage and prevents context bloat by profiling system prompts, tools, and memory files before execution.
  - Next: Develop a utility to calculate pre-loaded token overhead and flag redundant rules.
  - Evidence: 01:29, 07:58
- On-Demand Reference Loader
  - Source: Brad Bonanno / AI & Automation - I Stopped Hitting Claude Code Usage Limits (Here's How)
  - Why: Saves context window space by replacing large system prompts with lightweight pointers, loading full docs only when triggered.
  - Next: Build a router that matches user intent to specific markdown reference files and injects them dynamically.
  - Evidence: 04:24
- Local LLM API Interceptor Proxy
  - Source: Jack / Itssssss_Jack - DeepSeekV4 + Claude Code = 100X Cheaper
  - Why: Allows developers to use premium developer CLIs (like Claude Code) with ultra-low-cost backends, saving up to 99% on API costs during heavy iteration.
  - Next: Develop a lightweight local proxy server that mimics the Anthropic API and translates requests to DeepSeek or OpenRouter formats.
  - Evidence: 02:23, 04:50
- Dual-Terminal Task Router
  - Source: Jack / Itssssss_Jack - DeepSeekV4 + Claude Code = 100X Cheaper
  - Why: Optimizes developer workflows by automatically routing creative/UI tasks to Claude and heavy boilerplate/algorithmic tasks to cheaper models.
  - Next: Build a terminal multiplexer plugin that classifies user prompts and routes them to the most cost-effective model backend.
  - Evidence: 07:37
- AIOS Posture & Security Auditor
  - Source: Mansel Scheffel - Building AI Agents is Overrated..do this instead
  - Why: Enables automated scanning of active MCP servers, exposed API keys, and oversized skills to maintain system health.
  - Next: Develop a CLI tool within AIOS that parses skill files and MCP configurations to output a security grade report.
  - Evidence: 07:27, 08:43
- Dynamic Model Router & Cache Monitor
  - Source: Mansel Scheffel - Building AI Agents is Overrated..do this instead
  - Why: Optimizes token spend by dynamically routing simple tasks to smaller models (Haiku) and tracking prompt cache hit rates.
  - Next: Integrate OpenTelemetry hooks into the AIOS execution layer to log cache hits and model routing decisions.
  - Evidence: 04:51, 08:05
- Context Inheritance Engine
  - Source: Simon Scrapes - Creating Your Own Agentic OS is Easy (Insanely Powerful)
  - Why: Allows AIOS to dynamically merge global system instructions with project-specific rules, preventing context pollution across clients.
  - Next: Develop a file-watcher that merges parent CLAUDE.md files with nested child configurations during runtime execution.
  - Evidence: 19:04
- Progressive Disclosure Skill Loader
  - Source: Simon Scrapes - Creating Your Own Agentic OS is Easy (Insanely Powerful)
  - Why: Optimizes token efficiency by only loading high-level metadata until a specific skill is actively invoked by the orchestrator.
  - Next: Implement a parser that reads YAML frontmatter from a skills directory and registers triggers in the system prompt.
  - Evidence: 11:43

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 7/9
- PASS all videos are non-Mark public creator selections - uT2m7VD99qA:chase-ai, yv8VZpov8bk:matt-pocock-total-typescript, 7nP2wjGcIXs:jono-catliff, 9ToOfgZ4qqQ:brad-bonanno-ai-automation, tn7zXRv3Xmo:jack-itssssss, sTh6d8WFEUc:mansel-scheffel, w0S-khYCaB4:simon-scrapes
- PASS public YouTube page evidence captured for every video - uT2m7VD99qA:true, yv8VZpov8bk:true, 7nP2wjGcIXs:true, 9ToOfgZ4qqQ:true, tn7zXRv3Xmo:true, sTh6d8WFEUc:true, w0S-khYCaB4:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - uT2m7VD99qA:ready_for_scoper, yv8VZpov8bk:ready_for_scoper, 7nP2wjGcIXs:ready_for_scoper, 9ToOfgZ4qqQ:ready_for_scoper, tn7zXRv3Xmo:ready_for_scoper, sTh6d8WFEUc:ready_for_scoper, w0S-khYCaB4:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - uT2m7VD99qA:0, yv8VZpov8bk:0, 7nP2wjGcIXs:0, 9ToOfgZ4qqQ:0, tn7zXRv3Xmo:0, sTh6d8WFEUc:0, w0S-khYCaB4:0
- PASS batch produced ranked build candidates - 14

