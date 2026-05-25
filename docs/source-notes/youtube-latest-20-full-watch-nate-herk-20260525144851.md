# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T14:48:51.823Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:nate-herk:20260525144851`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 4 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Nate Herk: Higgsfield Just Turned Claude Into a Creative Agency (xn6Z5PYyAIE)
  - URL: https://www.youtube.com/watch?v=xn6Z5PYyAIE
  - Visual evidence: 3; build candidates: 2; tokens: 197497
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: I Tried 100+ Claude Code Skills. These 6 Are The Best (eRS3CmvrOvA)
  - URL: https://www.youtube.com/watch?v=eRS3CmvrOvA
  - Visual evidence: 3; build candidates: 2; tokens: 78477
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: Claude Code + Playwright Automates Literally Anything (J-6pnl5DQg8)
  - URL: https://www.youtube.com/watch?v=J-6pnl5DQg8
  - Visual evidence: 3; build candidates: 2; tokens: 107097
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Nate Herk: 32 Tricks to Level Up Claude Code in 16 Mins (jqoFP9QapXI)
  - URL: https://www.youtube.com/watch?v=jqoFP9QapXI
  - Visual evidence: 3; build candidates: 2; tokens: 92264
  - Resource links: 0 resolved public; 11 blocked; 0 still queued

## Top Build Candidates

- Multi-CLI Orchestration Agent (GWS + Media Gen)
  - Source: Nate Herk - Higgsfield Just Turned Claude Into a Creative Agency
  - Why: Allows AIOS to read structured tasks from Google Sheets, execute local CLI commands (like Higgsfield or FFmpeg), and update task statuses back to the sheet autonomously.
  - Next: Build a prototype agent that integrates GWS CLI and a mock media generation CLI to process batch image requests from a spreadsheet.
  - Evidence: 14:37, 20:13
- Markdown-Based Skill Template Engine
  - Source: Nate Herk - Higgsfield Just Turned Claude Into a Creative Agency
  - Why: Codifies successful complex workflows into local markdown files (.skill) that agents can discover, read, and execute dynamically to ensure consistent output formats.
  - Next: Define a standard schema for .skill markdown files and implement a parser that loads these instructions into the agent's system prompt.
  - Evidence: 23:52, 30:16
- Context-Optimized Tool Output Filter
  - Source: Nate Herk - I Tried 100+ Claude Code Skills. These 6 Are The Best
  - Why: Reduces token usage by up to 90% by filtering raw tool outputs (like HTML/Playwright snapshots) before context injection.
  - Next: Build a middleware layer for AIOS tools that parses and summarizes raw outputs using lightweight local models.
  - Evidence: 08:35
- SQLite-Backed Vector Memory Bridge
  - Source: Nate Herk - I Tried 100+ Claude Code Skills. These 6 Are The Best
  - Why: Enables persistent cross-session memory for agents without manual file updates, using local SQLite vector search.
  - Next: Integrate a local SQLite vector database to automatically index agent decisions, file edits, and execution logs.
  - Evidence: 09:44
- Self-Healing UI QA Agent
  - Source: Nate Herk - Claude Code + Playwright Automates Literally Anything
  - Why: Automates web app testing by generating Playwright scripts, executing them, analyzing screenshots for visual/functional bugs, and directly modifying code to fix them.
  - Next: Build a CLI tool that runs Playwright, captures step-by-step screenshots, feeds them to Claude's vision model, and applies git diffs to resolve detected UI bugs.
  - Evidence: 06:14, 07:20
- Persistent Session Browser Tool
  - Source: Nate Herk - Claude Code + Playwright Automates Literally Anything
  - Why: Enables AI agents to interact with authenticated web platforms without exposing raw credentials, by utilizing local persistent browser profiles.
  - Next: Develop a browser tool wrapper for AIOS that launches Playwright with a dedicated, persistent user data directory for secure session reuse.
  - Evidence: 10:20, 11:30
- AIOS Custom Skills Engine
  - Source: Nate Herk - 32 Tricks to Level Up Claude Code in 16 Mins
  - Why: Allows users to define custom agent behaviors and workflows using simple markdown files in a local directory.
  - Next: Develop a parser that reads local markdown files and registers them as system-level slash commands.
  - Evidence: 05:31
- Git Worktree Agent Orchestrator
  - Source: Nate Herk - 32 Tricks to Level Up Claude Code in 16 Mins
  - Why: Enables safe, parallel execution of multiple coding agents on the same codebase by isolating them in Git worktrees.
  - Next: Integrate Git worktree creation and branch merging into the core agent execution lifecycle.
  - Evidence: 10:55

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 4/9
- PASS all videos are non-Mark public creator selections - xn6Z5PYyAIE:nate-herk, eRS3CmvrOvA:nate-herk, J-6pnl5DQg8:nate-herk, jqoFP9QapXI:nate-herk
- PASS public YouTube page evidence captured for every video - xn6Z5PYyAIE:true, eRS3CmvrOvA:true, J-6pnl5DQg8:true, jqoFP9QapXI:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - xn6Z5PYyAIE:ready_for_scoper, eRS3CmvrOvA:ready_for_scoper, J-6pnl5DQg8:ready_for_scoper, jqoFP9QapXI:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - xn6Z5PYyAIE:0, eRS3CmvrOvA:0, J-6pnl5DQg8:0, jqoFP9QapXI:0
- PASS batch produced ranked build candidates - 8

