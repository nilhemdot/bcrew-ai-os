# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-25T02:10:50.017Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 5 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- You Have the OpenClaw Mind Virus (s-BHmRewyNI)
  - URL: https://www.youtube.com/watch?v=s-BHmRewyNI
  - Visual evidence: 3; build candidates: 2; tokens: 70007
- Anthropic's Full Claude Skills Guide In 22 Minutes (TzJecWCbex0)
  - URL: https://www.youtube.com/watch?v=TzJecWCbex0
  - Visual evidence: 3; build candidates: 2; tokens: 125380
- How to Make Stunning Graphics with Claude Code Agent Teams (mGfQV4s1MgE)
  - URL: https://www.youtube.com/watch?v=mGfQV4s1MgE
  - Visual evidence: 3; build candidates: 2; tokens: 82527
- Claude Code Agent Teams Explained (Complete Guide) (1jlKUxqRQAw)
  - URL: https://www.youtube.com/watch?v=1jlKUxqRQAw
  - Visual evidence: 3; build candidates: 2; tokens: 122009
- Anthropic Just Gave Claude 11 New Superpowers (eT_6uaHNlk8)
  - URL: https://www.youtube.com/watch?v=eT_6uaHNlk8
  - Visual evidence: 3; build candidates: 2; tokens: 79074

## Top Build Candidates

- Markdown-Driven Custom Agent Generator
  - Source video: You Have the OpenClaw Mind Virus
  - Why: Allows users to select modular agent capabilities (memory, tools, platforms) and compile a minimal, custom Python codebase, avoiding bloated frameworks.
  - Next: Build a CLI tool or web UI that maps agent features to reference implementations and uses Claude Code to synthesize a tailored agent script.
  - Evidence: 02:52, 05:15, 07:00
- Zero-Docker Interactive Agent CLI
  - Source video: You Have the OpenClaw Mind Virus
  - Why: Simplifies local agent onboarding by replacing complex Docker/Kubernetes setups with a simple Python CLI wizard for API keys and model selection.
  - Next: Develop a lightweight Python setup script that prompts for OpenRouter/Telegram keys and writes a clean config.json for the agent runtime.
  - Evidence: 07:17, 08:37
- Context-Optimized Skill Registry
  - Source video: Anthropic's Full Claude Skills Guide In 22 Minutes
  - Why: Implements progressive disclosure (YAML frontmatter -> SKILL.md -> linked files) to minimize token usage in agent loops.
  - Next: Create a parser that extracts YAML frontmatter for initial system prompts, loading full markdown only when triggered.
  - Evidence: 01:55, 03:11
- Multi-MCP Coordination Skill Pattern
  - Source video: Anthropic's Full Claude Skills Guide In 22 Minutes
  - Why: Orchestrates multiple Model Context Protocol (MCP) servers sequentially with validation gates between phases.
  - Next: Build a state machine that coordinates Figma, Drive, Linear, and Slack MCPs with strict validation checks.
  - Evidence: 13:10
- Multi-Agent Image Generation Pipeline (Banana Squad)
  - Source video: How to Make Stunning Graphics with Claude Code Agent Teams
  - Why: Automates high-fidelity infographic generation by separating research, prompt engineering, API calling, and critique into specialized agents.
  - Next: Implement an orchestrator agent in AIOS that spawns specialized sub-agents for style analysis and iterative image critique.
  - Evidence: 04:14, 05:58
- Iterative Visual Critic Loop
  - Source video: How to Make Stunning Graphics with Claude Code Agent Teams
  - Why: Improves image generation accuracy and visual appeal by 10%+ through structured multi-dimensional evaluation (faithfulness, readability, aesthetics).
  - Next: Integrate a vision-LLM critic step in AIOS asset generation workflows to score and refine outputs before final delivery.
  - Evidence: 03:56, 08:10
- Claude Code State Parser & Visualizer
  - Source video: Claude Code Agent Teams Explained (Complete Guide)
  - Why: Allows developers to monitor complex multi-agent workflows in real-time instead of tailing raw terminal logs or JSON files.
  - Next: Build a lightweight file watcher on ~/.claude/teams/ to stream config, inbox, and task updates to a local dashboard.
  - Evidence: 00:12, 13:34
- Hybrid Model Team Allocator
  - Source video: Claude Code Agent Teams Explained (Complete Guide)
  - Why: Optimizes token usage by assigning expensive models (Opus 4.6) to the Team Lead and cheaper models (Sonnet 4.5/Haiku) to sub-agents.
  - Next: Implement a routing layer in the AIOS orchestrator that dynamically swaps model endpoints based on agent role complexity.
  - Evidence: 04:24, 17:32
- File-Based AIOS Plugin Engine
  - Source video: Anthropic Just Gave Claude 11 New Superpowers
  - Why: Allows AIOS to ingest Anthropic-compatible plugin directories (JSON manifests + markdown prompts) to dynamically register slash commands and domain-specific skills.
  - Next: Build a parser that reads .claude-plugin/plugin.json and registers the markdown files in the commands/ and skills/ directories to the agent context.
  - Evidence: 03:10, 13:07
- Meta-Plugin Generator Agent
  - Source video: Anthropic Just Gave Claude 11 New Superpowers
  - Why: Enables users to describe a workflow in natural language and automatically generate a deployable .zip plugin package containing the manifest, commands, and skills.
  - Next: Create an AIOS system prompt that outputs the exact folder structure and files required for a valid Claude Cowork plugin based on user requirements.
  - Evidence: 12:04, 14:06

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 5
- PASS all videos come from the Mark Kashef Foundation pool - s-BHmRewyNI:mark-kashef, TzJecWCbex0:mark-kashef, mGfQV4s1MgE:mark-kashef, 1jlKUxqRQAw:mark-kashef, eT_6uaHNlk8:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - s-BHmRewyNI, TzJecWCbex0, mGfQV4s1MgE, 1jlKUxqRQAw, eT_6uaHNlk8
- PASS public YouTube page evidence captured for every video - s-BHmRewyNI:true, TzJecWCbex0:true, mGfQV4s1MgE:true, 1jlKUxqRQAw:true, eT_6uaHNlk8:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 10
- PASS safe resource follows are read-only metadata only - 1

