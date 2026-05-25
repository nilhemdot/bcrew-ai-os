# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T16:15:14.683Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525161514`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Claude Code Just Got a Dashboard (7zxIeRWasbc)
  - URL: https://www.youtube.com/watch?v=7zxIeRWasbc
  - Visual evidence: 3; build candidates: 2; tokens: 21579
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Matt Pocock / Total TypeScript: I Open-Sourced My Own AFK Software Factory (E5-QK3CDVQM)
  - URL: https://www.youtube.com/watch?v=E5-QK3CDVQM
  - Visual evidence: 3; build candidates: 2; tokens: 66329
  - Resource links: 1 resolved public; 5 blocked; 0 still queued
- Aaron Bitwise: Programming For Beginners: How To Start Coding (Easy Steps) (xrNN2VHwoe4)
  - URL: https://www.youtube.com/watch?v=xrNN2VHwoe4
  - Visual evidence: 3; build candidates: 2; tokens: 94501
  - Resource links: 0 resolved public; 1 blocked; 0 still queued
- Dan Martell: 99% of People Have No Idea What’s About to Happen With AI (8yt5yzwJQko)
  - URL: https://www.youtube.com/watch?v=8yt5yzwJQko
  - Visual evidence: 3; build candidates: 2; tokens: 80771
  - Resource links: 0 resolved public; 15 blocked; 0 still queued
- Dream Labs AI: How to Start a 1-Person Business with Claude AI in 30 days (Alex Hormozi Style) (0DotT09Tf0I)
  - URL: https://www.youtube.com/watch?v=0DotT09Tf0I
  - Visual evidence: 3; build candidates: 2; tokens: 77700
  - Resource links: 0 resolved public; 2 blocked; 0 still queued
- Kia Ghasem / AI Automations: 3 Marketing Automations To Sell For $1.5K/mo (n8n Templates) (XX5LUCgbUkI)
  - URL: https://www.youtube.com/watch?v=XX5LUCgbUkI
  - Visual evidence: 3; build candidates: 2; tokens: 137446
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Nick Saraev: Claude Managed Agents Just Dropped, And It Kills n8n (Ob5Vu-gD3mo)
  - URL: https://www.youtube.com/watch?v=Ob5Vu-gD3mo
  - Visual evidence: 3; build candidates: 2; tokens: 93698
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Jack / Itssssss_Jack: Hermes Agent + DeepSeek V4 = 100X Cheaper (awRQWBvE5eQ)
  - URL: https://www.youtube.com/watch?v=awRQWBvE5eQ
  - Visual evidence: 3; build candidates: 2; tokens: 119287
  - Resource links: 1 resolved public; 8 blocked; 0 still queued
- Jono Catliff: Every Claude Code Concept Explained Like You're 10 (daXxItfCfR4)
  - URL: https://www.youtube.com/watch?v=daXxItfCfR4
  - Visual evidence: 3; build candidates: 2; tokens: 200761
  - Resource links: 0 resolved public; 26 blocked; 0 still queued

## Top Build Candidates

- CLI Multi-Agent Dashboard
  - Source: Chase AI - Claude Code Just Got a Dashboard
  - Why: Enables developers to monitor and interact with multiple concurrent AIOS agent runs from a single terminal window.
  - Next: Build a terminal UI prototype using libraries like Blessed or Ink to display categorized agent states.
  - Evidence: 00:26, 01:20
- Agent Session Backgrounding Protocol
  - Source: Chase AI - Claude Code Just Got a Dashboard
  - Why: Allows long-running AIOS tasks to be backgrounded via a simple command, freeing the user's terminal while maintaining execution state.
  - Next: Implement a daemon-based session manager that handles process backgrounding and state persistence.
  - Evidence: 02:04
- Sandboxed Multi-Agent Orchestrator
  - Source: Matt Pocock / Total TypeScript - I Open-Sourced My Own AFK Software Factory
  - Why: Enables safe, parallel execution of untrusted agent code in local Docker/Podman containers without risking host system damage.
  - Next: Integrate a TypeScript-based container runner into AIOS to execute agent tasks in isolated micro-environments.
  - Evidence: 01:22, 02:19
- Dynamic Shell-Command Prompt Templating
  - Source: Matt Pocock / Total TypeScript - I Open-Sourced My Own AFK Software Factory
  - Why: Allows prompts to dynamically execute local CLI commands (like git diff or directory listings) and inject the output before sending to the LLM.
  - Next: Implement a markdown pre-processor in AIOS that parses ! command syntax to hydrate agent prompts with live system context.
  - Evidence: 08:40
- Automated Task-to-Code Parser
  - Source: Aaron Bitwise - Programming For Beginners: How To Start Coding (Easy Steps)
  - Why: Automatically extracts constraints, input data, and expected outputs from natural language task descriptions to scaffold code.
  - Next: Implement a regex and LLM-based parser that identifies lists, ranges, and constraints in comments and generates initial variable declarations.
  - Evidence: 03:15, 05:00
- Simulation Loop Verifier
  - Source: Aaron Bitwise - Programming For Beginners: How To Start Coding (Easy Steps)
  - Why: Verifies that user-written loops (like jar filling) have correct termination conditions and do not cause index-out-of-bounds errors.
  - Next: Create a static analysis tool or LLM prompt that checks loop boundaries against list lengths and decrementing variables.
  - Evidence: 07:05, 09:30
- Apex-Style Master-Agent Orchestrator
  - Source: Dan Martell - 99% of People Have No Idea What’s About to Happen With AI
  - Why: Enables a single conversational entry point to dynamically spawn, configure, and manage specialized sub-agents (e.g., real estate scanner, inbox triager).
  - Next: Design a hierarchical agent routing system where a LLM router maps user intent to specialized sub-agent tools.
  - Evidence: 09:24, 10:27
- Autonomous Procurement Agent with Virtual Card Integration
  - Source: Dan Martell - 99% of People Have No Idea What’s About to Happen With AI
  - Why: Allows the AI OS to execute real-world financial transactions securely using temporary virtual cards and password manager APIs.
  - Next: Integrate a browser-use agent with a virtual card provider API (like Privacy.com) and a secure credential store.
  - Evidence: 11:25, 11:29
- Hormozi-Style Offer Architect Agent
  - Source: Dream Labs AI - How to Start a 1-Person Business with Claude AI in 30 days (Alex Hormozi Style)
  - Why: Automates high-ticket offer creation by optimizing the four variables of the Hormozi Value Equation.
  - Next: Implement a system prompt for Claude that takes a target niche and outputs a structured offer with risk-reversal guarantees.
  - Evidence: 05:01
- C-L-O-S-E-R Sales Script Generator
  - Source: Dream Labs AI - How to Start a 1-Person Business with Claude AI in 30 days (Alex Hormozi Style)
  - Why: Generates custom sales scripts and provides real-time objection handling during calls.
  - Next: Build a speech-to-text pipeline that feeds live call transcripts to Claude to output real-time objection handling cards.
  - Evidence: 11:14
- n8n WordPress SEO Agent
  - Source: Kia Ghasem / AI Automations - 3 Marketing Automations To Sell For $1.5K/mo (n8n Templates)
  - Why: Automates the entire content pipeline from keyword research to live publishing, drastically reducing content creation costs.
  - Next: Develop an n8n template that accepts a keyword, performs Google search analysis, drafts an SEO-optimized post, and pushes to WordPress.
  - Evidence: 07:55
- Hyper-Personalized Cold Outreach Agent
  - Source: Kia Ghasem / AI Automations - 3 Marketing Automations To Sell For $1.5K/mo (n8n Templates)
  - Why: Enables high-deliverability outbound campaigns by researching individual leads and writing highly tailored emails at scale.
  - Next: Build an n8n workflow integrating Apollo API, a web scraper node for lead company research, and an LLM node for custom copy generation.
  - Evidence: 17:03
- VAML-based Agent Specification Engine
  - Source: Nick Saraev - Claude Managed Agents Just Dropped, And It Kills n8n
  - Why: Standardizes agent definitions, system prompts, and tool schemas into a single parseable format for easier orchestration.
  - Next: Define a YAML/JSON schema for AIOS agents that mirrors Anthropic's VAML structure.
  - Evidence: 01:05
- Sandboxed MCP Tool Execution Environment
  - Source: Nick Saraev - Claude Managed Agents Just Dropped, And It Kills n8n
  - Why: Secures agent tool execution by restricting network access and isolating runtime environments on a per-session basis.
  - Next: Implement Docker-based or WASM-based sandboxing for AIOS MCP servers.
  - Evidence: 01:40
- Triad Multi-Agent Orchestrator
  - Source: Jack / Itssssss_Jack - Hermes Agent + DeepSeek V4 = 100X Cheaper
  - Why: Implements a cost-efficient pipeline mapping Claude for planning, DeepSeek for bulk execution, and GPT/Gemini for critique, reducing API costs by up to 90%.
  - Next: Develop an orchestration engine in BCrew AI OS that routes subtasks to different models based on role definitions.
  - Evidence: 08:16, 15:20
- Soul-Context Engine (soul.md)
  - Source: Jack / Itssssss_Jack - Hermes Agent + DeepSeek V4 = 100X Cheaper
  - Why: Injects structured personal/business context (identity, goals, metrics, voice) into every agent interaction, ensuring highly aligned outputs.
  - Next: Create a system-wide context parser that reads a user's soul.md file and appends it to agent system prompts.
  - Evidence: 12:56, 15:33
- Local Rule-Enforcement Engine (AIOS.md)
  - Source: Jono Catliff - Every Claude Code Concept Explained Like You're 10
  - Why: Allows users to define custom execution rules (e.g., 'never overwrite files without asking') in a simple markdown file.
  - Next: Build a parser that reads .aios.md at startup and appends it to the system prompt.
  - Evidence: 11:13
- Custom Slash-Command Workflow Registry
  - Source: Jono Catliff - Every Claude Code Concept Explained Like You're 10
  - Why: Enables users to trigger complex multi-step agent workflows via simple terminal commands (e.g., /publish).
  - Next: Implement a CLI command parser in the AIOS shell that maps slash commands to JSON-defined agent pipelines.
  - Evidence: 19:35

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - 7zxIeRWasbc:chase-ai, E5-QK3CDVQM:matt-pocock-total-typescript, xrNN2VHwoe4:aaron-bitwise, 8yt5yzwJQko:dan-martell, 0DotT09Tf0I:dream-labs-ai, XX5LUCgbUkI:kia-ghasem-ai-automations, Ob5Vu-gD3mo:nick-saraev, awRQWBvE5eQ:jack-itssssss, daXxItfCfR4:jono-catliff
- PASS public YouTube page evidence captured for every video - 7zxIeRWasbc:true, E5-QK3CDVQM:true, xrNN2VHwoe4:true, 8yt5yzwJQko:true, 0DotT09Tf0I:true, XX5LUCgbUkI:true, Ob5Vu-gD3mo:true, awRQWBvE5eQ:true, daXxItfCfR4:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 7zxIeRWasbc:ready_for_scoper, E5-QK3CDVQM:ready_for_scoper, xrNN2VHwoe4:ready_for_scoper, 8yt5yzwJQko:ready_for_scoper, 0DotT09Tf0I:ready_for_scoper, XX5LUCgbUkI:ready_for_scoper, Ob5Vu-gD3mo:ready_for_scoper, awRQWBvE5eQ:ready_for_scoper, daXxItfCfR4:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 7zxIeRWasbc:0, E5-QK3CDVQM:0, xrNN2VHwoe4:0, 8yt5yzwJQko:0, 0DotT09Tf0I:0, XX5LUCgbUkI:0, Ob5Vu-gD3mo:0, awRQWBvE5eQ:0, daXxItfCfR4:0
- PASS batch produced ranked build candidates - 18

