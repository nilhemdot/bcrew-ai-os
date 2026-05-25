# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T19:49:42.936Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525194942`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 6 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Ranking Every AI Tool I Used in 2026 (What's ACTAULLY Good) (JtBWA49t8hc)
  - URL: https://www.youtube.com/watch?v=JtBWA49t8hc
  - Visual evidence: 3; build candidates: 2; tokens: 148452
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Mansel Scheffel: I Finally Solved Claude Code Skill Chaining (85% Less Context) (JdqJ2ekWt8M)
  - URL: https://www.youtube.com/watch?v=JdqJ2ekWt8M
  - Visual evidence: 3; build candidates: 2; tokens: 107843
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Jack / Itssssss_Jack: Karpathy's Skills just changed Everything (Claude Code) (pCqpuHA8kHM)
  - URL: https://www.youtube.com/watch?v=pCqpuHA8kHM
  - Visual evidence: 3; build candidates: 2; tokens: 126649
  - Resource links: 1 resolved public; 11 blocked; 0 still queued
- Ambitious AI: Claude Code Just Replaced Webflow (Free Hosting + No Vendor Lock In) (fgJLEmIzYrQ)
  - URL: https://www.youtube.com/watch?v=fgJLEmIzYrQ
  - Visual evidence: 3; build candidates: 2; tokens: 57155
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Jono Catliff: Claude Code Just Got Another Huge Upgrade (Computer Control) (bcVcIXwAH-o)
  - URL: https://www.youtube.com/watch?v=bcVcIXwAH-o
  - Visual evidence: 3; build candidates: 2; tokens: 45305
  - Resource links: 0 resolved public; 29 blocked; 0 still queued
- Simon Scrapes: Master 80% of Claude Code. Just Learn These 15 Things. (0qqV4yv-Hss)
  - URL: https://www.youtube.com/watch?v=0qqV4yv-Hss
  - Visual evidence: 3; build candidates: 2; tokens: 104204
  - Resource links: 0 resolved public; 3 blocked; 0 still queued

## Top Build Candidates

- Obsidian-Markdown Agent Memory Vault
  - Source: Chase AI - Ranking Every AI Tool I Used in 2026 (What's ACTAULLY Good)
  - Why: Provides a structured, human-readable local markdown database that agents can easily query and update for persistent memory.
  - Next: Develop a local file-system tool for the AI OS that reads and writes to an Obsidian vault structure.
  - Evidence: 05:35
- Dual-Engine CLI Coding Agent Wrapper
  - Source: Chase AI - Ranking Every AI Tool I Used in 2026 (What's ACTAULLY Good)
  - Why: Allows developers to seamlessly switch terminal coding tasks between Claude Code and Codex to optimize token usage and costs.
  - Next: Create a CLI wrapper that routes terminal commands to either Anthropic or OpenAI APIs based on task complexity.
  - Evidence: 06:03, 07:35
- Isolated Sub-Agent Skill Runner
  - Source: Mansel Scheffel - I Finally Solved Claude Code Skill Chaining (85% Less Context)
  - Why: Prevents token bloat in long-running agent loops by executing sub-tasks in isolated forks and discarding intermediate tool outputs.
  - Next: Implement a context-forking execution engine in the AIOS skill runner.
  - Evidence: 02:48, 07:23
- Zero-Token Prompt Injector
  - Source: Mansel Scheffel - I Finally Solved Claude Code Skill Chaining (85% Less Context)
  - Why: Saves context and reasoning tokens by programmatically reading files and injecting them into the prompt before LLM invocation.
  - Next: Add support for bang-style command preprocessing in the AIOS prompt compiler.
  - Evidence: 05:05, 12:24
- Karpathy-Inspired Claude Code Guidelines Plugin
  - Source: Jack / Itssssss_Jack - Karpathy's Skills just changed Everything (Claude Code)
  - Why: Enforces strict coding principles (surgical edits, goal-driven execution) directly inside the AIOS development environment to reduce token waste and code regressions.
  - Next: Integrate the CLAUDE.md ruleset into the system prompt of AIOS developer agents.
  - Evidence: 05:30
- Zapier & Firecrawl MCP Connector Integration
  - Source: Jack / Itssssss_Jack - Karpathy's Skills just changed Everything (Claude Code)
  - Why: Expands AIOS tool capabilities by allowing agents to query live web data via Firecrawl and automate workflows across 6,000+ apps via Zapier MCP.
  - Next: Implement an MCP client inside AIOS to dynamically load and authenticate custom SSE/stdio servers.
  - Evidence: 11:40, 13:47
- AIOS Design Token MCP Server
  - Source: Ambitious AI - Claude Code Just Replaced Webflow (Free Hosting + No Vendor Lock In)
  - Why: Allows the AI OS to dynamically read, export, and apply design system tokens (colors, typography, spacing) directly to active codebases via MCP.
  - Next: Develop an MCP server that parses Figma tokens or CSS variables and exposes them as tools for LLM code-generation agents.
  - Evidence: 01:52, 06:54
- Automated LLM-Friendly SEO Generator
  - Source: Ambitious AI - Claude Code Just Replaced Webflow (Free Hosting + No Vendor Lock In)
  - Why: Automatically generates sitemaps, robots.txt, and llms.txt to ensure deployed sites are optimized for both traditional search engines and AI crawlers.
  - Next: Integrate an automated post-deployment script in AIOS that analyzes site structure and outputs standard llms.txt files.
  - Evidence: 08:08
- Mobile-to-Desktop Agentic Gateway
  - Source: Jono Catliff - Claude Code Just Got Another Huge Upgrade (Computer Control)
  - Why: Enables users to trigger complex, long-running desktop workflows remotely via a lightweight mobile chat interface.
  - Next: Develop a secure WebSocket relay connecting a mobile web client to a local desktop agent runner.
  - Evidence: 00:15, 05:01
- GUI Self-Correction Engine
  - Source: Jono Catliff - Claude Code Just Got Another Huge Upgrade (Computer Control)
  - Why: Improves reliability of GUI automation by detecting incorrect selections and retrying the action.
  - Next: Implement visual state verification and coordinate validation after each simulated click.
  - Evidence: 04:18
- Deterministic Hook Lifecycle Engine
  - Source: Simon Scrapes - Master 80% of Claude Code. Just Learn These 15 Things.
  - Why: Allows AIOS to run token-free, deterministic validation scripts before and after agent tool execution, preventing hallucinated commands.
  - Next: Implement a hook runner that intercepts agent tool calls and executes local shell scripts based on a config file.
  - Evidence: 11:13
- Progressive Context Loader
  - Source: Simon Scrapes - Master 80% of Claude Code. Just Learn These 15 Things.
  - Why: Prevents context window bloat and context rot by only loading detailed reference files when a specific skill is triggered.
  - Next: Create a skill registry where each skill has a lightweight description and dynamically injects deeper reference markdown files on demand.
  - Evidence: 08:58, 09:51

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 6/9
- PASS all videos are non-Mark public creator selections - JtBWA49t8hc:chase-ai, JdqJ2ekWt8M:mansel-scheffel, pCqpuHA8kHM:jack-itssssss, fgJLEmIzYrQ:ambitious-ai, bcVcIXwAH-o:jono-catliff, 0qqV4yv-Hss:simon-scrapes
- PASS public YouTube page evidence captured for every video - JtBWA49t8hc:true, JdqJ2ekWt8M:true, pCqpuHA8kHM:true, fgJLEmIzYrQ:true, bcVcIXwAH-o:true, 0qqV4yv-Hss:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - JtBWA49t8hc:ready_for_scoper, JdqJ2ekWt8M:ready_for_scoper, pCqpuHA8kHM:ready_for_scoper, fgJLEmIzYrQ:ready_for_scoper, bcVcIXwAH-o:ready_for_scoper, 0qqV4yv-Hss:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - JtBWA49t8hc:0, JdqJ2ekWt8M:0, pCqpuHA8kHM:0, fgJLEmIzYrQ:0, bcVcIXwAH-o:0, 0qqV4yv-Hss:0
- PASS batch produced ranked build candidates - 12

