# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T13:53:04.351Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:icor-tom-ai-productivity:20260525135304`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- ICOR with Tom | AI Productivity: I Connected Claude Cowork to All My Tools. Game Changer. (LoDz4vcrr5M)
  - URL: https://www.youtube.com/watch?v=LoDz4vcrr5M
  - Visual evidence: 3; build candidates: 2; tokens: 136667
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- ICOR with Tom | AI Productivity: I Connected 9 Productivity Apps to One AI (Not the Way You Think) (LhXF_PWuciY)
  - URL: https://www.youtube.com/watch?v=LhXF_PWuciY
  - Visual evidence: 3; build candidates: 2; tokens: 52634
  - Resource links: 0 resolved public; 2 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Claude Cowork Analyzed 10 Years of My Data (It Knows More Than I Do) (_G2TR7r1h5E)
  - URL: https://www.youtube.com/watch?v=_G2TR7r1h5E
  - Visual evidence: 3; build candidates: 2; tokens: 28476
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- ICOR with Tom | AI Productivity: I Thought OpenClaw Was Scary… Then My Claude AI Assistant Went Rogue (nuYELqhn06g)
  - URL: https://www.youtube.com/watch?v=nuYELqhn06g
  - Visual evidence: 3; build candidates: 2; tokens: 16463
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- ICOR with Tom | AI Productivity: The One Productivity App You REALLY Need in 2026 (gi9547CWPz0)
  - URL: https://www.youtube.com/watch?v=gi9547CWPz0
  - Visual evidence: 3; build candidates: 2; tokens: 91111
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- ICOR with Tom | AI Productivity: The No-Time Paradox: Why Busy People Never Build Systems (And How to Break Free) (Aue5Jw8ONxs)
  - URL: https://www.youtube.com/watch?v=Aue5Jw8ONxs
  - Visual evidence: 3; build candidates: 2; tokens: 31990
  - Resource links: 0 resolved public; 7 blocked; 0 still queued
- ICOR with Tom | AI Productivity: I Connected My Read Later App to Claude. This Changes Everything. (hrcdltJsD4I)
  - URL: https://www.youtube.com/watch?v=hrcdltJsD4I
  - Visual evidence: 3; build candidates: 2; tokens: 47995
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- ICOR with Tom | AI Productivity: From Goals to Done: The Complete Productivity System (Team + Personal) (GUqTUyP7S90)
  - URL: https://www.youtube.com/watch?v=GUqTUyP7S90
  - Visual evidence: 3; build candidates: 2; tokens: 177998
  - Resource links: 0 resolved public; 10 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Tana + Claude Killed Heptabase. Here's the Proof. (aqI0lkGIyE4)
  - URL: https://www.youtube.com/watch?v=aqI0lkGIyE4
  - Visual evidence: 3; build candidates: 2; tokens: 87680
  - Resource links: 0 resolved public; 10 blocked; 0 still queued

## Top Build Candidates

- Local Sandboxed Python Scratchpad
  - Source: ICOR with Tom | AI Productivity - I Connected Claude Cowork to All My Tools. Game Changer.
  - Why: Allows the AIOS to generate complex local artifacts (like Excel sheets or data visualizations) by writing and executing Python scripts locally, mimicking Claude's scratchpad.
  - Next: Implement a secure Docker or WASM-based Python execution environment that the AIOS can write to and execute within.
  - Evidence: 15:44
- Dynamic MCP Tool Permission Manager
  - Source: ICOR with Tom | AI Productivity - I Connected Claude Cowork to All My Tools. Game Changer.
  - Why: Enables users to inspect, toggle, and authorize specific tools exposed by local or remote MCP servers before the agent executes them.
  - Next: Build a UI that parses MCP server schemas and displays a checklist of allowed functions per connector.
  - Evidence: 19:10
- Visual MCP Node Configurator
  - Source: ICOR with Tom | AI Productivity - I Connected 9 Productivity Apps to One AI (Not the Way You Think)
  - Why: Simplifies connecting multiple MCP servers to a central LLM using a drag-and-drop node canvas.
  - Next: Build a React-flow based canvas to manage active MCP server connections.
  - Evidence: 01:40
- Local Directory MCP Server
  - Source: ICOR with Tom | AI Productivity - I Connected 9 Productivity Apps to One AI (Not the Way You Think)
  - Why: Allows users to expose local folders and structured markdown notes directly to the AI OS LLM.
  - Next: Implement a lightweight local filesystem MCP server with secure read/write permissions.
  - Evidence: 03:22
- Multi-Source MCP Context Aggregator
  - Source: ICOR with Tom | AI Productivity - Claude Cowork Analyzed 10 Years of My Data (It Knows More Than I Do)
  - Why: Allows AIOS to query local files, cloud storage, task managers, and emails simultaneously using MCP to build a unified user context.
  - Next: Develop an orchestrator that maps a user query to multiple active MCP servers and merges results.
  - Evidence: 00:49
- Chronological Identity Synthesizer
  - Source: ICOR with Tom | AI Productivity - Claude Cowork Analyzed 10 Years of My Data (It Knows More Than I Do)
  - Why: Automatically builds and updates a structured timeline of the user's professional and personal milestones from historical data.
  - Next: Design a prompt template and memory parser that extracts dates and achievements from retrieved documents to construct a chronological profile.
  - Evidence: 02:15
- Visible Terminal Agent Spawner
  - Source: ICOR with Tom | AI Productivity - I Thought OpenClaw Was Scary… Then My Claude AI Assistant Went Rogue
  - Why: Prevents local AI agents from running silently in the background by forcing them to execute within visible, user-trackable terminal windows.
  - Next: Modify the local process manager to spawn agent shells using AppleScript or platform-native terminal launchers instead of silent background subprocesses.
  - Evidence: 01:45, 01:52
- Granular Local Tool Permission Guardrails
  - Source: ICOR with Tom | AI Productivity - I Thought OpenClaw Was Scary… Then My Claude AI Assistant Went Rogue
  - Why: Allows safe commands like system profiling to run automatically while blocking or prompting for sensitive commands like file modification or network requests.
  - Next: Implement an MCP-compatible permission manager that filters bash commands against a user-defined whitelist.
  - Evidence: 01:50
- Visual Tool-Stack Context Mapper
  - Source: ICOR with Tom | AI Productivity - The One Productivity App You REALLY Need in 2026
  - Why: Allows users to visually map their active tools, giving the AI OS a clear map of where data resides and which APIs to prioritize.
  - Next: Build a drag-and-drop Venn diagram UI that outputs a JSON tool-configuration schema for the AI OS.
  - Evidence: 06:21
- AI-Empowered Workstream Orchestrator
  - Source: ICOR with Tom | AI Productivity - The One Productivity App You REALLY Need in 2026
  - Why: Models workflows with explicit human-in-the-loop and AI-agent boundaries, allowing seamless handoffs between human actions and automated AI tasks.
  - Next: Develop a node-based workflow editor where nodes can be assigned to specific AI agents or human triggers.
  - Evidence: 11:46
- Agnostic ICOR Agent Pipeline
  - Source: ICOR with Tom | AI Productivity - The No-Time Paradox: Why Busy People Never Build Systems (And How to Break Free)
  - Why: Prevents rigid tool lock-in by decoupling data ingestion, state control, and task execution into a modular, four-stage AI agent pipeline.
  - Next: Develop an orchestration layer that ingests raw inputs, stores them in a unified vector database (Control), and dispatches tasks to specialized execution tools.
  - Evidence: 02:50
- Dual-Engine PKM and Action Splitter
  - Source: ICOR with Tom | AI Productivity - The No-Time Paradox: Why Busy People Never Build Systems (And How to Break Free)
  - Why: Avoids the 'One Tool' failure mode by separating semantic knowledge management (thinking) from deterministic task tracking (action) within the AI OS.
  - Next: Implement two distinct sub-agent classes: one optimized for document synthesis and retrieval, and another for structured project execution.
  - Evidence: 02:16
- Readwise MCP Connector
  - Source: ICOR with Tom | AI Productivity - I Connected My Read Later App to Claude. This Changes Everything.
  - Why: Enables the AI OS to access, search, and organize the user's curated external knowledge base (articles, highlights, books) dynamically.
  - Next: Implement a standard MCP server wrapping the Readwise Reader API endpoints for document listing, searching, and updating tags.
  - Evidence: 00:00, 03:54
- Cross-App Knowledge Triage Pipeline
  - Source: ICOR with Tom | AI Productivity - I Connected My Read Later App to Claude. This Changes Everything.
  - Why: Automates the flow of incoming information from read-later apps to structured PKM tools based on active project context.
  - Next: Create an orchestration layer that pulls from Readwise MCP, runs a classification prompt, and pushes structured nodes to Tana/Notion MCPs.
  - Evidence: 04:05, 05:34
- Unified Multi-Source Task Aggregator
  - Source: ICOR with Tom | AI Productivity - From Goals to Done: The Complete Productivity System (Team + Personal)
  - Why: Users struggle with fragmented tasks across ClickUp, Jira, and email. A unified planner interface improves focus.
  - Next: Build an integration layer that pulls tasks from ClickUp and Linear APIs into a single daily planning view.
  - Evidence: 12:30, 13:10
- AI-Driven Meeting-to-Backlog Pipeline
  - Source: ICOR with Tom | AI Productivity - From Goals to Done: The Complete Productivity System (Team + Personal)
  - Why: Automates the transition from synchronous team discussions to structured project backlogs without manual data entry.
  - Next: Develop a pipeline parsing meeting transcripts to extract action items and automatically populate ClickUp lists.
  - Evidence: 01:39, 02:24
- MCP-Based Entity Resolution Server
  - Source: ICOR with Tom | AI Productivity - Tana + Claude Killed Heptabase. Here's the Proof.
  - Why: Resolves ambiguous natural language terms to unique database IDs, preventing duplicate node creation in graph databases.
  - Next: Build a lightweight SQLite-backed MCP server that exposes a lookup tool for resolving aliases to unique IDs.
  - Evidence: 01:15, 05:55
- Outliner-Optimized LLM Formatter
  - Source: ICOR with Tom | AI Productivity - Tana + Claude Killed Heptabase. Here's the Proof.
  - Why: Ensures LLM-generated content perfectly matches the nested bullet structure required by outliner tools like Tana or Logseq.
  - Next: Develop system prompts and post-processing parsers that enforce strict nested markdown/OPML formatting.
  - Evidence: 07:05

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - LoDz4vcrr5M:icor-tom-ai-productivity, LhXF_PWuciY:icor-tom-ai-productivity, _G2TR7r1h5E:icor-tom-ai-productivity, nuYELqhn06g:icor-tom-ai-productivity, gi9547CWPz0:icor-tom-ai-productivity, Aue5Jw8ONxs:icor-tom-ai-productivity, hrcdltJsD4I:icor-tom-ai-productivity, GUqTUyP7S90:icor-tom-ai-productivity, aqI0lkGIyE4:icor-tom-ai-productivity
- PASS public YouTube page evidence captured for every video - LoDz4vcrr5M:true, LhXF_PWuciY:true, _G2TR7r1h5E:true, nuYELqhn06g:true, gi9547CWPz0:true, Aue5Jw8ONxs:true, hrcdltJsD4I:true, GUqTUyP7S90:true, aqI0lkGIyE4:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - LoDz4vcrr5M:ready_for_scoper, LhXF_PWuciY:ready_for_scoper, _G2TR7r1h5E:ready_for_scoper, nuYELqhn06g:ready_for_scoper, gi9547CWPz0:ready_for_scoper, Aue5Jw8ONxs:ready_for_scoper, hrcdltJsD4I:ready_for_scoper, GUqTUyP7S90:ready_for_scoper, aqI0lkGIyE4:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - LoDz4vcrr5M:0, LhXF_PWuciY:0, _G2TR7r1h5E:0, nuYELqhn06g:0, gi9547CWPz0:0, Aue5Jw8ONxs:0, hrcdltJsD4I:0, GUqTUyP7S90:0, aqI0lkGIyE4:0
- PASS batch produced ranked build candidates - 18
