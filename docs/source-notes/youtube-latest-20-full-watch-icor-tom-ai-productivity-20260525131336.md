# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T13:13:36.463Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:icor-tom-ai-productivity:20260525131336`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- ICOR with Tom | AI Productivity: I Talk to My Phone. Saved in Local Folder. Claude Links my Thoughts for Me. (WYZ9RjiSdn8)
  - URL: https://www.youtube.com/watch?v=WYZ9RjiSdn8
  - Visual evidence: 3; build candidates: 2; tokens: 52830
  - Resource links: 0 resolved public; 5 blocked; 0 still queued
- ICOR with Tom | AI Productivity: I Migrated My 10-Year, 29 GB Knowledge Base With ONE Prompt (9MXSuCSktCw)
  - URL: https://www.youtube.com/watch?v=9MXSuCSktCw
  - Visual evidence: 3; build candidates: 2; tokens: 141162
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- ICOR with Tom | AI Productivity: One Folder Runs Claude, Gemini, Codex, and even Obsidian (Free on GitHub) (4C2w8eIG48A)
  - URL: https://www.youtube.com/watch?v=4C2w8eIG48A
  - Visual evidence: 3; build candidates: 2; tokens: 192088
  - Resource links: 0 resolved public; 18 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Stop Prompting AI. Start Managing It. (My Full Setup) (3XcT6knYqFQ)
  - URL: https://www.youtube.com/watch?v=3XcT6knYqFQ
  - Visual evidence: 3; build candidates: 2; tokens: 117676
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Don't Use Claude (Until You Watch This) (IBb7DGuY5qs)
  - URL: https://www.youtube.com/watch?v=IBb7DGuY5qs
  - Visual evidence: 3; build candidates: 2; tokens: 221192
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- ICOR with Tom | AI Productivity: My Claude AI Setup Does What a Human Team Would. (IlhTbhR6el0)
  - URL: https://www.youtube.com/watch?v=IlhTbhR6el0
  - Visual evidence: 3; build candidates: 2; tokens: 336731
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Obsidian With Claude: The Setup I Said You Didn't Need (B35SWx_4BNM)
  - URL: https://www.youtube.com/watch?v=B35SWx_4BNM
  - Visual evidence: 3; build candidates: 2; tokens: 138916
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- ICOR with Tom | AI Productivity: Claude will handle it. Local. In one folder. (No Obsidian Needed) (gY95g6DMaeY)
  - URL: https://www.youtube.com/watch?v=gY95g6DMaeY
  - Visual evidence: 3; build candidates: 2; tokens: 180955
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- ICOR with Tom | AI Productivity: I Fixed Claude's Token Limits. Here's How. (boilaC1Qo2c)
  - URL: https://www.youtube.com/watch?v=boilaC1Qo2c
  - Visual evidence: 3; build candidates: 2; tokens: 30833
  - Resource links: 0 resolved public; 6 blocked; 0 still queued

## Top Build Candidates

- Local Folder Watcher with Whisper.cpp Integration
  - Source: ICOR with Tom | AI Productivity - I Talk to My Phone. Saved in Local Folder. Claude Links my Thoughts for Me.
  - Why: Enables zero-latency, private, and free voice note transcription directly inside the AIOS local workspace without relying on cloud APIs.
  - Next: Implement a file watcher in the AIOS daemon that triggers a local Whisper.cpp binary when new audio files are detected in a designated inbox folder.
  - Evidence: 05:40, 06:05
- iOS Shortcut Template for AIOS Inbox
  - Source: ICOR with Tom | AI Productivity - I Talk to My Phone. Saved in Local Folder. Claude Links my Thoughts for Me.
  - Why: Lowers friction for mobile-to-desktop capture, allowing users to instantly save voice memos, images, or text directly into their AIOS context.
  - Next: Create and distribute a standardized iOS Shortcut configured to sync audio payloads to the AIOS local API or shared folder.
  - Evidence: 01:45, 02:03
- Markdown-Based Declarative Agent SOPs
  - Source: ICOR with Tom | AI Productivity - I Migrated My 10-Year, 29 GB Knowledge Base With ONE Prompt
  - Why: Allows developers to define agent skills, tools, and workflows as simple markdown files in the workspace, making them LLM-agnostic and easily editable.
  - Next: Design a parser in AIOS that reads a 'Team Knowledge/SOPs' directory and registers markdown files as executable agent tools.
  - Evidence: 03:31, 08:23
- Local File-System Multi-Agent Orchestrator
  - Source: ICOR with Tom | AI Productivity - I Migrated My 10-Year, 29 GB Knowledge Base With ONE Prompt
  - Why: Enables a local CLI (like Claude Code) to orchestrate specialized sub-agents (researcher, database architect, designer) by writing to and reading from a shared local folder.
  - Next: Implement a local orchestrator loop in AIOS that routes user requests to specialized agents based on an AGENTS.md registry.
  - Evidence: 12:05, 13:15, 17:35
- Markdown-Based Multi-Agent Workspace
  - Source: ICOR with Tom | AI Productivity - One Folder Runs Claude, Gemini, Codex, and even Obsidian (Free on GitHub)
  - Why: Enables local directory structures to act as multi-agent environments where an orchestrator delegates tasks to specialized agents based on a markdown routing table.
  - Next: Implement a local workspace parser that reads agent definitions from markdown files and routes user queries accordingly.
  - Evidence: 02:42, 12:24
- LLM-Agnostic Adapter Prompt Bootstrapper
  - Source: ICOR with Tom | AI Productivity - One Folder Runs Claude, Gemini, Codex, and even Obsidian (Free on GitHub)
  - Why: Allows any connected LLM provider to automatically configure system prompts, agent roles, and tool constraints by reading a single local configuration file.
  - Next: Create a bootstrapper module that detects and parses ADAPTER-PROMPT.md upon workspace initialization.
  - Evidence: 11:54
- File-System-Based Agent Registry (CLAUDE.md Pattern)
  - Source: ICOR with Tom | AI Productivity - Stop Prompting AI. Start Managing It. (My Full Setup)
  - Why: Allows users to define, configure, and spin up specialized agents simply by creating markdown files in a structured local directory, matching Claude Code's native behavior.
  - Next: Build a parser that scans a designated 'Team' directory for markdown files, extracts system instructions, and registers them as callable tools for the root orchestrator.
  - Evidence: 07:49, 11:10
- SOP-Driven Context Injector
  - Source: ICOR with Tom | AI Productivity - Stop Prompting AI. Start Managing It. (My Full Setup)
  - Why: Reduces system prompt token overhead by having the orchestrator dynamically read and inject specific Standard Operating Procedure (SOP) markdown files only when a matching task is triggered.
  - Next: Implement an SOP indexing tool that maps user intents to local SOP markdown files, allowing the orchestrator to fetch and append them to the active context window.
  - Evidence: 11:53, 13:12
- Dynamic Local Workspace Watcher
  - Source: ICOR with Tom | AI Productivity - Don't Use Claude (Until You Watch This)
  - Why: Enables AI agents to read and write to local workspaces dynamically, maintaining up-to-date context without manual file uploads.
  - Next: Implement a file-system watcher that automatically syncs local workspace changes to the agent's active context window.
  - Evidence: 06:15, 11:10
- Remote Agent Control Bridge
  - Source: ICOR with Tom | AI Productivity - Don't Use Claude (Until You Watch This)
  - Why: Allows users to securely monitor and control local terminal-based AI agents from mobile or web interfaces.
  - Next: Build a secure session-mirroring protocol that exposes local CLI agent outputs to an authenticated web endpoint.
  - Evidence: 16:20
- File-System-Based Agent Orchestrator (PKA/BKM)
  - Source: ICOR with Tom | AI Productivity - My Claude AI Setup Does What a Human Team Would.
  - Why: Allows BCrew AI OS to orchestrate multiple specialized agents using standard local directories, markdown files, and file-based inboxes instead of complex database-heavy state machines.
  - Next: Build a prototype orchestrator that parses a root markdown file (like CLAUDE.md) to route tasks to sub-folders representing specialized agents.
  - Evidence: 18:32, 20:28
- SOP-Driven Agent Context Injection
  - Source: ICOR with Tom | AI Productivity - My Claude AI Setup Does What a Human Team Would.
  - Why: Enables agents to dynamically reference standard operating procedures (SOPs) stored as markdown files in a BKM folder, reducing hallucination and ensuring consistent 80%+ output quality.
  - Next: Implement a retrieval step where the orchestrator matches task keywords against an SOP directory and appends the relevant markdown file to the agent's context.
  - Evidence: 19:13, 20:49
- Vault-Aware AI CLI Integration
  - Source: ICOR with Tom | AI Productivity - Obsidian With Claude: The Setup I Said You Didn't Need
  - Why: Embeds a local terminal inside the note editor to run Claude Code with direct access to the active vault's markdown files.
  - Next: Develop a terminal plugin wrapper that auto-injects vault context into the local shell session.
  - Evidence: 06:08
- Markdown-Based Slash Command System
  - Source: ICOR with Tom | AI Productivity - Obsidian With Claude: The Setup I Said You Didn't Need
  - Why: Allows users to define custom AI workflows as markdown files in a commands folder, which the CLI parses as executable slash commands.
  - Next: Implement a parser that reads a local directory of markdown prompts and registers them as CLI shortcuts.
  - Evidence: 09:21
- Markdown-Based Agent Index & Orchestrator (Larry Pattern)
  - Source: ICOR with Tom | AI Productivity - Claude will handle it. Local. In one folder. (No Obsidian Needed)
  - Why: Allows local, zero-overhead agent orchestration by parsing a simple markdown file of agent capabilities instead of heavy database-backed routing.
  - Next: Create a parser for `agent-index.md` that maps user intents to specific agent system prompts stored locally.
  - Evidence: 13:27
- Inbox-Driven Workspace Architecture
  - Source: ICOR with Tom | AI Productivity - Claude will handle it. Local. In one folder. (No Obsidian Needed)
  - Why: Decouples raw inputs from verified knowledge by using structured `Team-Inbox` and `Owner-Inbox` directories for human-in-the-loop validation.
  - Next: Implement directory-based triggers in AIOS that automatically process files dropped into an inbox folder.
  - Evidence: 10:04
- Dynamic Agent Model Routing
  - Source: ICOR with Tom | AI Productivity - I Fixed Claude's Token Limits. Here's How.
  - Why: Reduces token costs by automatically matching agent tasks to the cheapest capable model tier.
  - Next: Add a 'model_tier' field to the agent schema and implement fallback logic.
  - Evidence: 02:07
- Reasoning Effort Controller
  - Source: ICOR with Tom | AI Productivity - I Fixed Claude's Token Limits. Here's How.
  - Why: Allows users to toggle reasoning depth to save tokens on simple API calls.
  - Next: Expose the reasoning effort parameter in the LLM provider configuration.
  - Evidence: 03:34

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - WYZ9RjiSdn8:icor-tom-ai-productivity, 9MXSuCSktCw:icor-tom-ai-productivity, 4C2w8eIG48A:icor-tom-ai-productivity, 3XcT6knYqFQ:icor-tom-ai-productivity, IBb7DGuY5qs:icor-tom-ai-productivity, IlhTbhR6el0:icor-tom-ai-productivity, B35SWx_4BNM:icor-tom-ai-productivity, gY95g6DMaeY:icor-tom-ai-productivity, boilaC1Qo2c:icor-tom-ai-productivity
- PASS public YouTube page evidence captured for every video - WYZ9RjiSdn8:true, 9MXSuCSktCw:true, 4C2w8eIG48A:true, 3XcT6knYqFQ:true, IBb7DGuY5qs:true, IlhTbhR6el0:true, B35SWx_4BNM:true, gY95g6DMaeY:true, boilaC1Qo2c:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - WYZ9RjiSdn8:ready_for_scoper, 9MXSuCSktCw:ready_for_scoper, 4C2w8eIG48A:ready_for_scoper, 3XcT6knYqFQ:ready_for_scoper, IBb7DGuY5qs:ready_for_scoper, IlhTbhR6el0:ready_for_scoper, B35SWx_4BNM:ready_for_scoper, gY95g6DMaeY:ready_for_scoper, boilaC1Qo2c:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - WYZ9RjiSdn8:0, 9MXSuCSktCw:0, 4C2w8eIG48A:0, 3XcT6knYqFQ:0, IBb7DGuY5qs:0, IlhTbhR6el0:0, B35SWx_4BNM:0, gY95g6DMaeY:0, boilaC1Qo2c:0
- PASS batch produced ranked build candidates - 18
