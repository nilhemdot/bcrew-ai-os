# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-24T23:32:11.606Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 3 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- Did Claude Code Just Make OpenClaw Obsolete? (RUyqEAXt2YQ)
  - URL: https://www.youtube.com/watch?v=RUyqEAXt2YQ
  - Visual evidence: 3; build candidates: 2; tokens: 54814
- 3 Claude Code Features You'll Wish You Knew Sooner (iALzJyvgCoM)
  - URL: https://www.youtube.com/watch?v=iALzJyvgCoM
  - Visual evidence: 3; build candidates: 2; tokens: 54278
- Claude Code Turned Obsidian Into My Dream Second Brain (2kbINqpluM0)
  - URL: https://www.youtube.com/watch?v=2kbINqpluM0
  - Visual evidence: 3; build candidates: 2; tokens: 79974

## Top Build Candidates

- Remote Channel Execution Gateway
  - Source video: Did Claude Code Just Make OpenClaw Obsolete?
  - Why: Allows secure, remote CLI execution of AI OS tasks via chat platforms like Telegram/Discord using MCP.
  - Next: Implement a channel listener plugin architecture supporting Discord/Telegram bot webhooks.
  - Evidence: 03:02, 05:09
- Dynamic Access Policy Whitelisting
  - Source video: Did Claude Code Just Make OpenClaw Obsolete?
  - Why: Prevents unauthorized remote users from executing system commands on the host machine via public bot channels.
  - Next: Design a strict user-ID validation middleware for all incoming chat gateway payloads.
  - Evidence: 04:57, 07:49
- Isolated Skill Execution Engine
  - Source video: 3 Claude Code Features You'll Wish You Knew Sooner
  - Why: Prevents context bloat by running heavy tool-use tasks in ephemeral sub-contexts, returning only summaries.
  - Next: Implement a sub-agent orchestrator that parses 'context: fork' metadata and executes tasks in a clean sandbox.
  - Evidence: 01:47, 03:49
- Transient Query Bypass (/btw)
  - Source video: 3 Claude Code Features You'll Wish You Knew Sooner
  - Why: Allows users to query system state or documentation without polluting the active agent's context window.
  - Next: Add a transient query router to the AI OS CLI that executes side-requests in a separate, stateless thread.
  - Evidence: 05:16
- Obsidian CLI MCP Server
  - Source video: Claude Code Turned Obsidian Into My Dream Second Brain
  - Why: Allows AIOS agents to read, write, query, and structure local markdown vaults using Obsidian's native CLI.
  - Next: Wrap the Obsidian CLI commands into an MCP server compatible with AIOS.
  - Evidence: 03:02, 11:32
- Interactive Workspace Onboarding Agent
  - Source video: Claude Code Turned Obsidian Into My Dream Second Brain
  - Why: Uses interactive terminal prompts to dynamically structure folders, templates, and system prompts based on user role.
  - Next: Build a CLI wizard that generates custom system prompts and folder structures.
  - Evidence: 06:28

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 3
- PASS all videos come from the Mark Kashef Foundation pool - RUyqEAXt2YQ:mark-kashef, iALzJyvgCoM:mark-kashef, 2kbINqpluM0:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - RUyqEAXt2YQ, iALzJyvgCoM, 2kbINqpluM0
- PASS public YouTube page evidence captured for every video - RUyqEAXt2YQ:true, iALzJyvgCoM:true, 2kbINqpluM0:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 6
- PASS safe resource follows are read-only metadata only - 3

