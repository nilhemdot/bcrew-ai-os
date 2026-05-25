# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T18:15:40.564Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525181540`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Use These NEW Open Source Claude Code Tools or Fall Behind (6cYBFfA7Nyk)
  - URL: https://www.youtube.com/watch?v=6cYBFfA7Nyk
  - Visual evidence: 3; build candidates: 2; tokens: 86227
  - Resource links: 9 resolved public; 10 blocked; 0 still queued
- Matt Pocock / Total TypeScript: Building a REAL feature with Claude Code: every step explained (hX7yG1KVYhI)
  - URL: https://www.youtube.com/watch?v=hX7yG1KVYhI
  - Visual evidence: 3; build candidates: 2; tokens: 244833
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Nick Saraev: Claude Dispatch Just Dropped, And It Kills OpenClaw (NF10evwkefM)
  - URL: https://www.youtube.com/watch?v=NF10evwkefM
  - Visual evidence: 3; build candidates: 2; tokens: 90359
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Dream Labs AI: The Ultimate Claude Tutorial: Beginner to GOD MODE (without coding) (9PDU3LqNI5Q)
  - URL: https://www.youtube.com/watch?v=9PDU3LqNI5Q
  - Visual evidence: 3; build candidates: 2; tokens: 313211
  - Resource links: 0 resolved public; 3 blocked; 0 still queued
- Kia Ghasem / AI Automations: GPT-5 is Out...What Can You Do to Stay Relevant? (23xwLSHhWHU)
  - URL: https://www.youtube.com/watch?v=23xwLSHhWHU
  - Visual evidence: 3; build candidates: 2; tokens: 78984
  - Resource links: 0 resolved public; 7 blocked; 0 still queued
- Jack / Itssssss_Jack: Claude Video is Here… Automate Anything (4socWznMV74)
  - URL: https://www.youtube.com/watch?v=4socWznMV74
  - Visual evidence: 3; build candidates: 2; tokens: 100302
  - Resource links: 3 resolved public; 9 blocked; 0 still queued
- Jono Catliff: How I Hacked Claude Design Usage (Bypass Limits) (GPCF1XKYiD8)
  - URL: https://www.youtube.com/watch?v=GPCF1XKYiD8
  - Visual evidence: 3; build candidates: 2; tokens: 64708
  - Resource links: 0 resolved public; 27 blocked; 0 still queued
- Mansel Scheffel: Build Claude Routines Like The Top 1% (6k796vtP-54)
  - URL: https://www.youtube.com/watch?v=6k796vtP-54
  - Visual evidence: 3; build candidates: 2; tokens: 123024
  - Resource links: 0 resolved public; 5 blocked; 0 still queued
- Simon Scrapes: I Rebuilt Hermes in Claude Code (It’s Ridiculously Good) (wdc1OFWDxlU)
  - URL: https://www.youtube.com/watch?v=wdc1OFWDxlU
  - Visual evidence: 3; build candidates: 2; tokens: 74156
  - Resource links: 0 resolved public; 3 blocked; 0 still queued

## Top Build Candidates

- Graph-Based Codebase Context Minimizer
  - Source: Chase AI - Use These NEW Open Source Claude Code Tools or Fall Behind
  - Why: Reduces token usage in agentic codebase analysis by building a local non-embedding knowledge graph of code structures.
  - Next: Implement a local parser that extracts AST structures and maps relationships into a lightweight JSON graph for agent context.
  - Evidence: 03:12
- Dynamic Frame-Budget Video Analyzer MCP
  - Source: Chase AI - Use These NEW Open Source Claude Code Tools or Fall Behind
  - Why: Enables AIOS agents to analyze video files or URLs efficiently by dynamically scaling frame extraction based on duration.
  - Next: Build an MCP server wrapping ffmpeg and Whisper to feed structured visual/audio frames to Claude.
  - Evidence: 04:58
- Interactive Requirement Grilling Agent
  - Source: Matt Pocock / Total TypeScript - Building a REAL feature with Claude Code: every step explained
  - Why: Prevents incorrect code generation by proactively interviewing the developer about edge cases and terminology before implementation.
  - Next: Develop a CLI command that parses the codebase, accepts a loose goal, and asks 3-5 targeted questions to generate a PRD.
  - Evidence: 04:13
- Ubiquitous Language Context Sync
  - Source: Matt Pocock / Total TypeScript - Building a REAL feature with Claude Code: every step explained
  - Why: Maintains semantic alignment between user intent and agent execution by grounding the agent in a project-specific glossary.
  - Next: Create a system prompt injector that automatically reads a local glossary file and appends it to the agent's context window.
  - Evidence: 08:18
- Local-First Agentic Gateway (MCP + Mobile)
  - Source: Nick Saraev - Claude Dispatch Just Dropped, And It Kills OpenClaw
  - Why: Enables secure, low-cost remote execution of local scripts and MCP tools from a mobile interface without exposing raw API keys.
  - Next: Develop a lightweight local daemon that pairs with a mobile client via WebSockets to execute sandboxed MCP commands.
  - Evidence: 09:01, 11:48
- Interactive Permission Guard for AI Agents
  - Source: Nick Saraev - Claude Dispatch Just Dropped, And It Kills OpenClaw
  - Why: Prevents unauthorized file access or browser actions by requiring explicit user approval on the host machine or paired device.
  - Next: Build a prompt-interceptor middleware that pauses agent execution and requests user confirmation for file/network operations.
  - Evidence: 03:36, 12:05
- Autonomous File-Editing Agent with Claude Code
  - Source: Dream Labs AI - The Ultimate Claude Tutorial: Beginner to GOD MODE (without coding)
  - Why: Bypasses interactive permission prompts using dangerous mode, enabling fully autonomous code generation and deployment cycles.
  - Next: Implement a secure sandbox environment that executes claude --dangerously-skip-permissions with strict file-system boundaries.
  - Evidence: 12:03, 12:21
- Voice-Driven MCP Integration Hub
  - Source: Dream Labs AI - The Ultimate Claude Tutorial: Beginner to GOD MODE (without coding)
  - Why: Combines Wispr Flow voice dictation with Claude's MCP servers (Gmail, Stripe) to allow hands-free system administration and business operations.
  - Next: Create an AI OS voice-input pipeline that maps spoken commands directly to Claude Code MCP tool calls.
  - Evidence: 13:42, 26:06, 48:30
- Meta-Prompt Optimizer Pipeline
  - Source: Kia Ghasem / AI Automations - GPT-5 is Out...What Can You Do to Stay Relevant?
  - Why: Improves code generation quality by having an LLM first expand a simple user idea into a highly detailed technical specification prompt before execution.
  - Next: Create a two-step agent workflow: Step 1 generates the optimized prompt; Step 2 feeds it to the code generator.
  - Evidence: 01:46
- Inline Sandboxed Web App Runner
  - Source: Kia Ghasem / AI Automations - GPT-5 is Out...What Can You Do to Stay Relevant?
  - Why: Allows users to instantly run, test, and interact with generated HTML/JS/Tailwind code inside a secure iframe sandbox directly in the chat UI.
  - Next: Build a React-based iframe sandbox component that accepts raw HTML/JS/CSS strings and renders them dynamically.
  - Evidence: 00:50
- Multi-Modal CLI Orchestrator
  - Source: Jack / Itssssss_Jack - Claude Video is Here… Automate Anything
  - Why: Allows AIOS to orchestrate diverse media generation models (video, image, audio) through a single unified CLI wrapper.
  - Next: Develop a CLI parser in AIOS that translates natural language media requests into specific model API calls.
  - Evidence: 03:52, 10:20
- Repo-Grounded Design System Generator
  - Source: Jack / Itssssss_Jack - Claude Video is Here… Automate Anything
  - Why: Enables AIOS to ingest external GitHub design repositories to guide the visual style of generated web applications.
  - Next: Build a repository scraper that extracts CSS variables, layout rules, and design tokens to inject into the LLM context.
  - Evidence: 08:11, 09:05
- Cross-Agent State Handoff Protocol
  - Source: Jono Catliff - How I Hacked Claude Design Usage (Bypass Limits)
  - Why: Enables seamless transition from visual prototyping agents to code execution agents without losing design tokens or context.
  - Next: Develop a parser to translate Claude Design token exports into structured React/Tailwind components.
  - Evidence: 01:55, 02:44
- Token-Aware Prompt Pacer
  - Source: Jono Catliff - How I Hacked Claude Design Usage (Bypass Limits)
  - Why: Saves up to 90% in API costs by scheduling sub-agent tasks within the provider's prompt caching window.
  - Next: Implement a queue manager in AIOS that batches agent requests to maximize prompt cache hits.
  - Evidence: 07:49, 08:44
- AIOS Webhook Relay Layer
  - Source: Mansel Scheffel - Build Claude Routines Like The Top 1%
  - Why: An intermediary translation service that maps arbitrary third-party webhook payloads (Stripe, Fathom) to the strict JSON structure required by Claude Routine API triggers.
  - Next: Develop a lightweight serverless function template that accepts incoming webhooks, formats them with auth/beta/version headers, and forwards to Claude API.
  - Evidence: 07:44, 09:07
- Self-Reporting Agent Status Monitor
  - Source: Mansel Scheffel - Build Claude Routines Like The Top 1%
  - Why: A prompt-level guardrail and reporting mechanism that bypasses the 'green status trap' by forcing agents to write explicit execution logs and success/failure states to an external database or Slack channel.
  - Next: Integrate a standardized 'self-reporting' block into AIOS system prompts, requiring agents to run a final diagnostic step before session teardown.
  - Evidence: 18:56, 19:42
- Multi-Tenant Brand Context Injection
  - Source: Simon Scrapes - I Rebuilt Hermes in Claude Code (It’s Ridiculously Good)
  - Why: Allows a single AIOS instance to serve multiple clients dynamically by swapping context files instead of spinning up separate agent runtimes.
  - Next: Develop a session-aware context loader that injects client-specific markdown files (voice, ICP) into the system prompt dynamically.
  - Evidence: 03:41
- Hybrid Semantic Memory Search
  - Source: Simon Scrapes - I Rebuilt Hermes in Claude Code (It’s Ridiculously Good)
  - Why: Replaces fragile keyword-based memory recall with semantic vector search combined with local markdown context caching.
  - Next: Integrate a lightweight vector database (e.g., Milvus or Qdrant) into the AIOS memory layer to index session logs and enable semantic retrieval.
  - Evidence: 07:54

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - 6cYBFfA7Nyk:chase-ai, hX7yG1KVYhI:matt-pocock-total-typescript, NF10evwkefM:nick-saraev, 9PDU3LqNI5Q:dream-labs-ai, 23xwLSHhWHU:kia-ghasem-ai-automations, 4socWznMV74:jack-itssssss, GPCF1XKYiD8:jono-catliff, 6k796vtP-54:mansel-scheffel, wdc1OFWDxlU:simon-scrapes
- PASS public YouTube page evidence captured for every video - 6cYBFfA7Nyk:true, hX7yG1KVYhI:true, NF10evwkefM:true, 9PDU3LqNI5Q:true, 23xwLSHhWHU:true, 4socWznMV74:true, GPCF1XKYiD8:true, 6k796vtP-54:true, wdc1OFWDxlU:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 6cYBFfA7Nyk:ready_for_scoper, hX7yG1KVYhI:ready_for_scoper, NF10evwkefM:ready_for_scoper, 9PDU3LqNI5Q:ready_for_scoper, 23xwLSHhWHU:ready_for_scoper, 4socWznMV74:ready_for_scoper, GPCF1XKYiD8:ready_for_scoper, 6k796vtP-54:ready_for_scoper, wdc1OFWDxlU:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 6cYBFfA7Nyk:0, hX7yG1KVYhI:0, NF10evwkefM:0, 9PDU3LqNI5Q:0, 23xwLSHhWHU:0, 4socWznMV74:0, GPCF1XKYiD8:0, 6k796vtP-54:0, wdc1OFWDxlU:0
- PASS batch produced ranked build candidates - 18

