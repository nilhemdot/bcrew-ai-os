# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T19:11:44.281Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525191144`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Claude Code + Higgsfield MCP = Content MACHINE (20BDYk-CU_o)
  - URL: https://www.youtube.com/watch?v=20BDYk-CU_o
  - Visual evidence: 3; build candidates: 2; tokens: 83412
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Matt Pocock / Total TypeScript: Never Run claude /init (9tmsq-Gvx6g)
  - URL: https://www.youtube.com/watch?v=9tmsq-Gvx6g
  - Visual evidence: 3; build candidates: 2; tokens: 61703
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Nick Saraev: Claude Code's New Upgrade: /btw (ZbKNpn0woDY)
  - URL: https://www.youtube.com/watch?v=ZbKNpn0woDY
  - Visual evidence: 3; build candidates: 2; tokens: 31819
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Jack / Itssssss_Jack: I replaced Hermes... Claude Agent 2.0 (kpBgBNzb2pY)
  - URL: https://www.youtube.com/watch?v=kpBgBNzb2pY
  - Visual evidence: 3; build candidates: 2; tokens: 63577
  - Resource links: 1 resolved public; 10 blocked; 0 still queued
- Jono Catliff: Claude Code Kills Canva & Figma For Web Design (Google Stitch) (g1ip5LmiZMQ)
  - URL: https://www.youtube.com/watch?v=g1ip5LmiZMQ
  - Visual evidence: 3; build candidates: 2; tokens: 103503
  - Resource links: 0 resolved public; 27 blocked; 0 still queued
- Mansel Scheffel: Every Claude Code User Needs To Watch This (AIOS Failover) (JBaUXDRtRek)
  - URL: https://www.youtube.com/watch?v=JBaUXDRtRek
  - Visual evidence: 3; build candidates: 2; tokens: 85977
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Simon Scrapes: Claude Code has a new UI (pair it with Claude OS) (J6tPNRc9m2Q)
  - URL: https://www.youtube.com/watch?v=J6tPNRc9m2Q
  - Visual evidence: 3; build candidates: 2; tokens: 34047
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- Brad Bonanno / AI & Automation: I FINALLY Stopped Babysitting Claude (Automate Anything) (1RdkW1zqv-U)
  - URL: https://www.youtube.com/watch?v=1RdkW1zqv-U
  - Visual evidence: 3; build candidates: 2; tokens: 115502
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Chris Bradley / MRR Official: Run Your Entire Business With Claude & WhatsApp (prompts included) (695rZ-cViOs)
  - URL: https://www.youtube.com/watch?v=695rZ-cViOs
  - Visual evidence: 3; build candidates: 2; tokens: 66426
  - Resource links: 0 resolved public; 5 blocked; 0 still queued

## Top Build Candidates

- Unified Media Generation MCP Gateway
  - Source: Chase AI - Claude Code + Higgsfield MCP = Content MACHINE
  - Why: Allows AIOS to support diverse image/video models (Kling, GPT-Image, Veo) through a single standardized MCP interface instead of maintaining separate API integrations.
  - Next: Implement an MCP client in AIOS that can dynamically discover and invoke media generation tools exposed by a gateway server.
  - Evidence: 01:48, 03:55
- Automated Content Pipeline Agent
  - Source: Chase AI - Claude Code + Higgsfield MCP = Content MACHINE
  - Why: Enables AIOS to run background cron jobs that fetch structured data (e.g., GitHub API), synthesize copy, and generate matching visual assets autonomously.
  - Next: Create a workflow template in AIOS combining a data-fetching tool with a media-generation MCP tool.
  - Evidence: 08:35, 11:03
- JIT Codebase Explorer
  - Source: Matt Pocock / Total TypeScript - Never Run claude /init
  - Why: Replaces static CLAUDE.md files with dynamic, task-specific context gathering to save token costs and prevent instruction rot.
  - Next: Implement a sub-agent that runs a search/read pass on relevant files before invoking the main coding agent.
  - Evidence: 01:15
- Minimal Environment-Aware Agent Memory
  - Source: Matt Pocock / Total TypeScript - Never Run claude /init
  - Why: Restricts global agent memory to platform-specific quirks (e.g., WSL path resolution) rather than duplicating package.json scripts.
  - Next: Create a lightweight system-level config generator that only writes environment variables and OS-specific constraints.
  - Evidence: 09:02
- Side-Channel Agent Steering Overlay
  - Source: Nick Saraev - Claude Code's New Upgrade: /btw
  - Why: Allows users to query or correct running AIOS agents without polluting the primary conversation history or wasting tokens on new sessions.
  - Next: Develop a CLI parser in AIOS that intercepts prefix commands like `/btw` to route queries to a non-persistent sub-agent.
  - Evidence: 01:03, 01:30
- Unified Context Token Optimizer
  - Source: Nick Saraev - Claude Code's New Upgrade: /btw
  - Why: Reduces API costs by avoiding parallel thread initialization for simple lookups during complex workflows.
  - Next: Implement a local cache and lightweight router to handle non-context-polluting queries locally or via cheaper models.
  - Evidence: 02:02
- 3-Tier Agent Memory Architecture
  - Source: Jack / Itssssss_Jack - I replaced Hermes... Claude Agent 2.0
  - Why: Optimizes context limits by separating static core facts, rolling conversation history, and vector-indexed semantic memory.
  - Next: Develop a TypeScript memory manager class implementing SQLite for Tier 1/2 and Pinecone for Tier 3.
  - Evidence: 05:56
- Autonomous Skill-Authoring Loop
  - Source: Jack / Itssssss_Jack - I replaced Hermes... Claude Agent 2.0
  - Why: Allows the AI OS to expand its capabilities dynamically by writing, testing, and saving its own tools at runtime.
  - Next: Create a background evaluator that monitors tool calls and triggers a code-generation agent when repetitive tasks are detected.
  - Evidence: 07:39
- Stitch-to-Code Agentic Pipeline
  - Source: Jono Catliff - Claude Code Kills Canva & Figma For Web Design (Google Stitch)
  - Why: Automates the transition from visual design tokens (Stitch) to production-ready Next.js code using Claude Code, bypassing manual frontend drafting.
  - Next: Build a CLI tool that parses Stitch ZIP exports and feeds them directly to Claude Code with a standardized system prompt.
  - Evidence: 07:14, 09:50
- CRO Component Injector
  - Source: Jono Catliff - Claude Code Kills Canva & Figma For Web Design (Google Stitch)
  - Why: Automatically injects high-converting elements (VSL placeholders, video testimonials, trust badges) into generated landing pages to boost conversion rates.
  - Next: Create a library of pre-built React/Next.js CRO components that the AI agent can reference and inject during the build phase.
  - Evidence: 11:39, 15:07
- Multi-LLM Failover Router
  - Source: Mansel Scheffel - Every Claude Code User Needs To Watch This (AIOS Failover)
  - Why: Prevents critical business workflow interruptions during Anthropic API outages by automatically routing tasks to Codex or Gemini.
  - Next: Implement a lightweight python runner that catches Anthropic API errors and retries the task using Codex/Gemini APIs.
  - Evidence: 13:07
- Unified Skill Portability Layer
  - Source: Mansel Scheffel - Every Claude Code User Needs To Watch This (AIOS Failover)
  - Why: Ensures markdown-defined agent skills execute consistently across different LLM runtimes without rewriting code.
  - Next: Create a validation script to test skill.md files against multiple model endpoints to score output formatting parity.
  - Evidence: 08:15, 10:17
- Terminal-Based Multi-Agent Dashboard
  - Source: Simon Scrapes - Claude Code has a new UI (pair it with Claude OS)
  - Why: Enables developers to monitor and interact with multiple backgrounded agent tasks from a single terminal UI, reducing window clutter.
  - Next: Build a CLI dashboard using blessed/blessed-contrib or ink that aggregates backgrounded agent states and allows interactive replies.
  - Evidence: 01:15, 02:25
- Context-Aware Agentic OS Directory Structure
  - Source: Simon Scrapes - Claude Code has a new UI (pair it with Claude OS)
  - Why: Organizes agent prompts, brand guidelines, and client contexts into a structured folder hierarchy that agents can automatically parse.
  - Next: Define a standard workspace template containing folders for brand_context, command-centre, and projects to inject context dynamically.
  - Evidence: 03:01, 05:05
- AIOS Webhook Adapter for Claude Routines
  - Source: Brad Bonanno / AI & Automation - I FINALLY Stopped Babysitting Claude (Automate Anything)
  - Why: Claude's co-routines API only accepts a single 'text' field and strict headers, preventing direct integration with standard webhooks from tools like Stripe or HubSpot.
  - Next: Develop a lightweight middleware service within AIOS that accepts arbitrary webhooks, extracts key data, and formats it for the Anthropic co-routines endpoint.
  - Evidence: 13:12, 13:49
- Local Browser Automation Agent Runtime
  - Source: Brad Bonanno / AI & Automation - I FINALLY Stopped Babysitting Claude (Automate Anything)
  - Why: Enables agents to perform tasks using the user's active, authenticated browser sessions (e.g., LinkedIn, internal tools) without API integration overhead.
  - Next: Implement a local runtime module that launches Chrome in debugging mode and allows LLM agents to execute Puppeteer/Playwright actions.
  - Evidence: 05:28
- Chat-to-Asset Pipeline Parser
  - Source: Chris Bradley / MRR Official - Run Your Entire Business With Claude & WhatsApp (prompts included)
  - Why: Automates the extraction of raw chat logs (WhatsApp/Slack) to generate structured client roadmaps, FAQs, and testimonials.
  - Next: Build a Python-based parser to clean raw chat exports and format them for LLM context windows.
  - Evidence: 03:37, 10:25
- Personalized Client Yearbook Generator
  - Source: Chris Bradley / MRR Official - Run Your Entire Business With Claude & WhatsApp (prompts included)
  - Why: Generates beautiful, styled HTML pages summarizing client milestones and metrics directly from conversational history.
  - Next: Create a Claude prompt template that outputs structured HTML/CSS based on parsed milestone data.
  - Evidence: 07:40

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - 20BDYk-CU_o:chase-ai, 9tmsq-Gvx6g:matt-pocock-total-typescript, ZbKNpn0woDY:nick-saraev, kpBgBNzb2pY:jack-itssssss, g1ip5LmiZMQ:jono-catliff, JBaUXDRtRek:mansel-scheffel, J6tPNRc9m2Q:simon-scrapes, 1RdkW1zqv-U:brad-bonanno-ai-automation, 695rZ-cViOs:chris-bradley-mrr
- PASS public YouTube page evidence captured for every video - 20BDYk-CU_o:true, 9tmsq-Gvx6g:true, ZbKNpn0woDY:true, kpBgBNzb2pY:true, g1ip5LmiZMQ:true, JBaUXDRtRek:true, J6tPNRc9m2Q:true, 1RdkW1zqv-U:true, 695rZ-cViOs:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 20BDYk-CU_o:ready_for_scoper, 9tmsq-Gvx6g:ready_for_scoper, ZbKNpn0woDY:ready_for_scoper, kpBgBNzb2pY:ready_for_scoper, g1ip5LmiZMQ:ready_for_scoper, JBaUXDRtRek:ready_for_scoper, J6tPNRc9m2Q:ready_for_scoper, 1RdkW1zqv-U:ready_for_scoper, 695rZ-cViOs:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 20BDYk-CU_o:0, 9tmsq-Gvx6g:0, ZbKNpn0woDY:0, kpBgBNzb2pY:0, g1ip5LmiZMQ:0, JBaUXDRtRek:0, J6tPNRc9m2Q:0, 1RdkW1zqv-U:0, 695rZ-cViOs:0
- PASS batch produced ranked build candidates - 18

