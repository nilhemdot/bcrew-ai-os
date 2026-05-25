# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T18:58:45.431Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525185845`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: The 7 Levels of Claude Code & Content (From Slop to Agentic) (S6YwrVql83U)
  - URL: https://www.youtube.com/watch?v=S6YwrVql83U
  - Visual evidence: 3; build candidates: 2; tokens: 195026
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Matt Pocock / Total TypeScript: How to actually force Claude Code to use the right CLI (don't use CLAUDE.md) (3CSi8QAoN-s)
  - URL: https://www.youtube.com/watch?v=3CSi8QAoN-s
  - Visual evidence: 3; build candidates: 2; tokens: 40273
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- Nick Saraev: Claude Code + Karpathy Autoresearch = The New Meta (4Cb_l2LJAW8)
  - URL: https://www.youtube.com/watch?v=4Cb_l2LJAW8
  - Visual evidence: 3; build candidates: 2; tokens: 138575
  - Resource links: 1 resolved public; 16 blocked; 0 still queued
- Jack / Itssssss_Jack: This Memory System just 10x'd Claude Code (YPup1cE4cAQ)
  - URL: https://www.youtube.com/watch?v=YPup1cE4cAQ
  - Visual evidence: 3; build candidates: 2; tokens: 95964
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Jono Catliff: 4 Claude Code Hacks To Make Any Website Look 10/10 (Steal These) (mtN2PdQ2V28)
  - URL: https://www.youtube.com/watch?v=mtN2PdQ2V28
  - Visual evidence: 3; build candidates: 2; tokens: 146378
  - Resource links: 0 resolved public; 28 blocked; 0 still queued
- Mansel Scheffel: Claude Code + Onyx = RAG For EVERYONE (5 Levels) (zl8SfRp1FWM)
  - URL: https://www.youtube.com/watch?v=zl8SfRp1FWM
  - Visual evidence: 3; build candidates: 2; tokens: 254303
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- Simon Scrapes: Skill Chaining in Claude OS is INSANE (Don’t Fall Behind!) (RrMTtG1ZccI)
  - URL: https://www.youtube.com/watch?v=RrMTtG1ZccI
  - Visual evidence: 3; build candidates: 2; tokens: 75085
  - Resource links: 0 resolved public; 3 blocked; 0 still queued
- Brad Bonanno / AI & Automation: My Claude Code Can INSTANTLY Watch Any Video (Here's How) (QZMljuD10sU)
  - URL: https://www.youtube.com/watch?v=QZMljuD10sU
  - Visual evidence: 3; build candidates: 2; tokens: 50769
  - Resource links: 1 resolved public; 5 blocked; 0 still queued
- Chris Bradley / MRR Official: How To Build Lead Magnets That Get Hundreds Of DMs (prompts included) (bdxsNV-_XiU)
  - URL: https://www.youtube.com/watch?v=bdxsNV-_XiU
  - Visual evidence: 3; build candidates: 2; tokens: 67507
  - Resource links: 0 resolved public; 5 blocked; 0 still queued

## Top Build Candidates

- Brand Voice Injector & System Prompt Template
  - Source: Chase AI - The 7 Levels of Claude Code & Content (From Slop to Agentic)
  - Why: Standardizes brand voice across all AIOS content generation tasks, eliminating generic AI phrasing.
  - Next: Build a system prompt generator that parses user-provided best posts and outputs a structured Markdown voice guide.
  - Evidence: 06:13
- Automated Content Cascade Pipeline
  - Source: Chase AI - The 7 Levels of Claude Code & Content (From Slop to Agentic)
  - Why: Enables AIOS to automatically repurpose a single long-form asset (e.g., video, blog) into platform-specific formats (X threads, LinkedIn posts, newsletters).
  - Next: Implement a multi-agent workflow that ingests a transcript and runs parallel formatting skills.
  - Evidence: 25:09
- Deterministic Pre-Tool Execution Guardrails
  - Source: Matt Pocock / Total TypeScript - How to actually force Claude Code to use the right CLI (don't use CLAUDE.md)
  - Why: Enables strict, zero-context-overhead blocking of unsafe or incorrect CLI commands by running local validation scripts before agent tool execution.
  - Next: Implement a PreToolUse hook runner in AIOS that intercepts shell commands and executes local validation scripts.
  - Evidence: 02:11, 04:20
- Natural Language to Hook Compiler
  - Source: Matt Pocock / Total TypeScript - How to actually force Claude Code to use the right CLI (don't use CLAUDE.md)
  - Why: Saves developer time by automatically translating system prompt constraints (e.g., 'never use npm') into executable validation scripts.
  - Next: Develop a utility that parses agent system prompts for negative constraints and generates corresponding bash/python validation hooks.
  - Evidence: 02:45
- Persistent Learning Log (resource.md) for Autonomous Agents
  - Source: Nick Saraev - Claude Code + Karpathy Autoresearch = The New Meta
  - Why: Allows agents to persist structured rules of what works/fails across sessions, preventing regression.
  - Next: Build a middleware that parses and appends to a markdown-based memory file after each run.
  - Evidence: 03:53
- Autonomous A/B Testing Orchestrator for External APIs
  - Source: Nick Saraev - Claude Code + Karpathy Autoresearch = The New Meta
  - Why: Enables AIOS to manage live experiments (e.g., email, ads, landing pages) by querying metrics and mutating payloads.
  - Next: Create an abstract Orchestrator class with deploy, harvest, and mutate methods.
  - Evidence: 02:20, 04:48
- L2 Workspace Context Engine (CLAUDE.md)
  - Source: Jack / Itssssss_Jack - This Memory System just 10x'd Claude Code
  - Why: Standardizes project-level context injection for agents, reducing token waste and preventing context drift.
  - Next: Create a CLI tool or agent routine that automatically initializes and maintains CLAUDE.md files in active workspaces.
  - Evidence: 07:37
- Semantic Conversation Archiver (Pinecone L3)
  - Source: Jack / Itssssss_Jack - This Memory System just 10x'd Claude Code
  - Why: Enables agents to recall historical decisions and context across different sessions using vector search.
  - Next: Develop a background service that vectorizes and indexes agent session summaries into a vector database.
  - Evidence: 11:37, 15:46
- CLAUDE.md Auto-Generator for Agentic Workspaces
  - Source: Jono Catliff - 4 Claude Code Hacks To Make Any Website Look 10/10 (Steal These)
  - Why: Automatically generates a tailored CLAUDE.md file containing project rules, tech stack details, and testing commands whenever a new workspace is initialized.
  - Next: Implement a workspace scanner that detects project files and writes a custom CLAUDE.md system prompt.
  - Evidence: 04:32
- Visual-to-Code One-Shot UI Builder
  - Source: Jono Catliff - 4 Claude Code Hacks To Make Any Website Look 10/10 (Steal These)
  - Why: An AI OS tool that accepts a reference screenshot and a functional code snippet (e.g., Three.js/Spline) and outputs a fully styled Next.js component.
  - Next: Develop a pipeline combining multimodal LLMs for layout analysis with code generation agents.
  - Evidence: 05:51
- AIOS Programmatic RAG Eval Harness
  - Source: Mansel Scheffel - Claude Code + Onyx = RAG For EVERYONE (5 Levels)
  - Why: Enables continuous integration testing of connected knowledge bases to prevent regression in retrieval accuracy, context recall, and faithfulness.
  - Next: Develop a Python-based evaluation runner that queries AIOS RAG endpoints with synthetic test cases and scores responses using Claude.
  - Evidence: 31:16, 40:35
- Onyx Enterprise Knowledge Connector
  - Source: Mansel Scheffel - Claude Code + Onyx = RAG For EVERYONE (5 Levels)
  - Why: Allows AIOS to leverage Onyx's 40+ out-of-the-box enterprise connectors (Slack, Jira, Notion) via a unified hybrid search API.
  - Next: Create an MCP server wrapper around the Onyx API to expose enterprise search capabilities directly to Claude Code.
  - Evidence: 16:09, 42:24
- Modular Skill Chaining Orchestrator
  - Source: Simon Scrapes - Skill Chaining in Claude OS is INSANE (Don’t Fall Behind!)
  - Why: Prevents context bloat and quality drops associated with monolithic mega-skills by executing specialized sub-agents dynamically.
  - Next: Build a parent orchestrator template in AIOS that parses a YAML manifest of child skills and executes them sequentially or in parallel.
  - Evidence: 06:46, 07:31
- Interactive Skill Onboarding Engine
  - Source: Simon Scrapes - Skill Chaining in Claude OS is INSANE (Don’t Fall Behind!)
  - Why: Allows newly imported skills to prompt the user for configuration parameters (e.g., brand voice, API keys) and save them to a local config file.
  - Next: Implement a CLI/UI onboarding parser in AIOS that reads an onboarding.md file and generates interactive setup prompts.
  - Evidence: 10:39, 11:32
- Multimodal Video Ingestion Tool
  - Source: Brad Bonanno / AI & Automation - My Claude Code Can INSTANTLY Watch Any Video (Here's How)
  - Why: Allows AI OS agents to ingest and analyze video content (YouTube, Loom, local MP4s) without expensive native video models.
  - Next: Build a Python tool wrapping yt-dlp for audio/subtitles and ffmpeg for keyframe extraction, optimized for LLM context limits.
  - Evidence: 03:18, 03:57
- Adaptive Frame-Capping Token Optimizer
  - Source: Brad Bonanno / AI & Automation - My Claude Code Can INSTANTLY Watch Any Video (Here's How)
  - Why: Prevents token budget exhaustion when processing long videos by dynamically scaling extracted frames.
  - Next: Implement a frame selection algorithm that samples keyframes evenly across the video duration based on target token limits.
  - Evidence: 05:08
- AI Client Data Processor Agent
  - Source: Chris Bradley / MRR Official - How To Build Lead Magnets That Get Hundreds Of DMs (prompts included)
  - Why: Automates the extraction and transformation of raw user data (e.g., chat logs, CRM exports) into structured, actionable insights.
  - Next: Develop parsing templates for common exports like WhatsApp TXT files and CRM CSVs to feed directly into Claude API.
  - Evidence: 01:35, 05:15
- Friction-to-Hook Copy Generator
  - Source: Chris Bradley / MRR Official - How To Build Lead Magnets That Get Hundreds Of DMs (prompts included)
  - Why: Generates high-converting marketing copy by translating technical AI workflows into user-centric results.
  - Next: Build a prompt chain that takes a technical tool solution and outputs optimized hook variations based on the positioning rule.
  - Evidence: 04:21, 08:48

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - S6YwrVql83U:chase-ai, 3CSi8QAoN-s:matt-pocock-total-typescript, 4Cb_l2LJAW8:nick-saraev, YPup1cE4cAQ:jack-itssssss, mtN2PdQ2V28:jono-catliff, zl8SfRp1FWM:mansel-scheffel, RrMTtG1ZccI:simon-scrapes, QZMljuD10sU:brad-bonanno-ai-automation, bdxsNV-_XiU:chris-bradley-mrr
- PASS public YouTube page evidence captured for every video - S6YwrVql83U:true, 3CSi8QAoN-s:true, 4Cb_l2LJAW8:true, YPup1cE4cAQ:true, mtN2PdQ2V28:true, zl8SfRp1FWM:true, RrMTtG1ZccI:true, QZMljuD10sU:true, bdxsNV-_XiU:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - S6YwrVql83U:ready_for_scoper, 3CSi8QAoN-s:ready_for_scoper, 4Cb_l2LJAW8:ready_for_scoper, YPup1cE4cAQ:ready_for_scoper, mtN2PdQ2V28:ready_for_scoper, zl8SfRp1FWM:ready_for_scoper, RrMTtG1ZccI:ready_for_scoper, QZMljuD10sU:ready_for_scoper, bdxsNV-_XiU:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - S6YwrVql83U:0, 3CSi8QAoN-s:0, 4Cb_l2LJAW8:0, YPup1cE4cAQ:0, mtN2PdQ2V28:0, zl8SfRp1FWM:0, RrMTtG1ZccI:0, QZMljuD10sU:0, bdxsNV-_XiU:0
- PASS batch produced ranked build candidates - 18

