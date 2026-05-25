# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T20:08:15.209Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525200815`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 6 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: The ONLY Claude Design Guide You Should Watch (iJRq1kLLRmY)
  - URL: https://www.youtube.com/watch?v=iJRq1kLLRmY
  - Visual evidence: 3; build candidates: 2; tokens: 138970
  - Resource links: 0 resolved public; 10 blocked; 0 still queued
- Simon Scrapes: Every Claude Code Memory System Compared (So You Don't Have To) (UHVFcUzAGlM)
  - URL: https://www.youtube.com/watch?v=UHVFcUzAGlM
  - Visual evidence: 3; build candidates: 2; tokens: 229878
  - Resource links: 4 resolved public; 7 blocked; 0 still queued
- Ambitious AI: Claude Code Just Replaced Your $40K Receptionist (p_w7R8XTiwA)
  - URL: https://www.youtube.com/watch?v=p_w7R8XTiwA
  - Visual evidence: 3; build candidates: 2; tokens: 58165
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- Austin Marchese: How Anthropic Employees ACTUALLY Use Claude Code (pRfIWmddRsE)
  - URL: https://www.youtube.com/watch?v=pRfIWmddRsE
  - Visual evidence: 3; build candidates: 2; tokens: 70032
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Jono Catliff: 10 Insane Claude Cowork Automations Nobody Is Talking About (steal these) (YQ50E59YJ6U)
  - URL: https://www.youtube.com/watch?v=YQ50E59YJ6U
  - Visual evidence: 3; build candidates: 2; tokens: 155963
  - Resource links: 0 resolved public; 28 blocked; 0 still queued
- Mansel Scheffel: Run Your ENTIRE Business on Claude Cowork (Agentic OS) (gEpsig46ZEI)
  - URL: https://www.youtube.com/watch?v=gEpsig46ZEI
  - Visual evidence: 3; build candidates: 2; tokens: 147958
  - Resource links: 0 resolved public; 6 blocked; 0 still queued

## Top Build Candidates

- AIOS Spatial Layout Sketcher
  - Source: Chase AI - The ONLY Claude Design Guide You Should Watch
  - Why: Allows users to draw rough wireframes on a canvas to guide UI generation, improving layout accuracy.
  - Next: Integrate a lightweight canvas tool that converts drawings to layout bounding boxes for LLM context.
  - Evidence: 08:37
- Structured Pre-Generation Planner
  - Source: Chase AI - The ONLY Claude Design Guide You Should Watch
  - Why: Prompts users with targeted questions (audience, tone, length) before generating complex assets like decks or apps.
  - Next: Implement a dynamic form generator in AIOS that triggers based on task type.
  - Evidence: 19:09
- Pre-Tool Semantic Memory Injector
  - Source: Simon Scrapes - Every Claude Code Memory System Compared (So You Don't Have To)
  - Why: Dynamically injects relevant domain/tool context right before an agent executes a tool, preventing context window bloat.
  - Next: Implement a PreToolUse hook in AIOS that queries a local vector store and appends matches to the prompt.
  - Evidence: 11:52, 22:20
- Self-Consolidating Memory Daemon
  - Source: Simon Scrapes - Every Claude Code Memory System Compared (So You Don't Have To)
  - Why: Periodically cleans up, deduplicates, and promotes short-term session logs into long-term structured memory files.
  - Next: Build a background worker that runs a consolidation LLM chain over daily markdown logs to update general.md and domain files.
  - Evidence: 12:47, 18:48
- Vapi-Cal.com Voice Scheduler
  - Source: Ambitious AI - Claude Code Just Replaced Your $40K Receptionist
  - Why: Enables automated, real-time voice booking systems for local businesses, reducing missed call revenue loss.
  - Next: Integrate Vapi SDK with Cal.com API webhooks to handle real-time slot booking and confirmation.
  - Evidence: 03:00, 03:20
- Agentic Repo Onboarding (claud.md)
  - Source: Ambitious AI - Claude Code Just Replaced Your $40K Receptionist
  - Why: Standardizes repository instructions so AI coding assistants can autonomously install, configure, and run complex codebases.
  - Next: Create a template claud.md file detailing environment variables, setup commands, and verification steps.
  - Evidence: 06:32, 08:30
- Figma Ad Variant Generator Agent
  - Source: Austin Marchese - How Anthropic Employees ACTUALLY Use Claude Code
  - Why: Automates creative production by generating copy variations directly inside design tools.
  - Next: Create a Figma plugin template that calls Claude's API to populate text layers.
  - Evidence: 01:51
- Pre-Flight Compliance Reviewer
  - Source: Austin Marchese - How Anthropic Employees ACTUALLY Use Claude Code
  - Why: Reduces human review bottlenecks by flagging high/medium/low risk compliance issues in text.
  - Next: Codify legal guidelines into system prompts and build a Slack/web interface for self-service analysis.
  - Evidence: 07:07
- Browser-Agent Session Bridge
  - Source: Jono Catliff - 10 Insane Claude Cowork Automations Nobody Is Talking About (steal these)
  - Why: Enables AI agents to securely inherit active browser sessions for seamless multi-app automation without API keys.
  - Next: Develop a secure Chrome extension that bridges active tab sessions to the local AI agent runtime.
  - Evidence: 00:30, 12:47
- Dynamic Local HTML Widget Renderer
  - Source: Jono Catliff - 10 Insane Claude Cowork Automations Nobody Is Talking About (steal these)
  - Why: Allows agents to present complex data analyses by generating and rendering interactive local HTML/JS dashboards on the fly.
  - Next: Build an isolated iframe sandbox in the AIOS UI to render agent-generated web code safely.
  - Evidence: 14:21, 20:35
- Context-Aware Business Pod Auditor
  - Source: Mansel Scheffel - Run Your ENTIRE Business on Claude Cowork (Agentic OS)
  - Why: Automates the discovery of business bottlenecks across Acquisition, Delivery, Support, and Ops, generating structured markdown maps.
  - Next: Build a system prompt that interviews the user, categorizes pain points, and outputs a structured YAML/Markdown system map.
  - Evidence: 12:45
- Lazy-Loading MCP Connector Registry
  - Source: Mansel Scheffel - Run Your ENTIRE Business on Claude Cowork (Agentic OS)
  - Why: Optimizes context window usage by dynamically loading MCP tools only when explicitly invoked by the agent, preventing token bloat.
  - Next: Implement a tool-use router in AIOS that registers MCP schemas but defers full payload loading until runtime invocation.
  - Evidence: 06:27

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 6/9
- PASS all videos are non-Mark public creator selections - iJRq1kLLRmY:chase-ai, UHVFcUzAGlM:simon-scrapes, p_w7R8XTiwA:ambitious-ai, pRfIWmddRsE:austin-marchese, YQ50E59YJ6U:jono-catliff, gEpsig46ZEI:mansel-scheffel
- PASS public YouTube page evidence captured for every video - iJRq1kLLRmY:true, UHVFcUzAGlM:true, p_w7R8XTiwA:true, pRfIWmddRsE:true, YQ50E59YJ6U:true, gEpsig46ZEI:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - iJRq1kLLRmY:ready_for_scoper, UHVFcUzAGlM:ready_for_scoper, p_w7R8XTiwA:ready_for_scoper, pRfIWmddRsE:ready_for_scoper, YQ50E59YJ6U:ready_for_scoper, gEpsig46ZEI:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - iJRq1kLLRmY:0, UHVFcUzAGlM:0, p_w7R8XTiwA:0, pRfIWmddRsE:0, YQ50E59YJ6U:0, gEpsig46ZEI:0
- PASS batch produced ranked build candidates - 12

