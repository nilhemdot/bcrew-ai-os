# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-24T22:56:56.652Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 3 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- How to INSTANTLY Run ANY Skill in Claude + Codex (tjjX43FoAUg)
  - URL: https://www.youtube.com/watch?v=tjjX43FoAUg
  - Visual evidence: 3; build candidates: 2; tokens: 66288
- Why 90% of Your Claude Skills Are Dead Weight (cgWZcFKx2lQ)
  - URL: https://www.youtube.com/watch?v=cgWZcFKx2lQ
  - Visual evidence: 3; build candidates: 2; tokens: 78235
- Build Your Agentic OS Better Than The 99% (-WCNwxz3uoM)
  - URL: https://www.youtube.com/watch?v=-WCNwxz3uoM
  - Visual evidence: 3; build candidates: 2; tokens: 126821

## Top Build Candidates

- Unified Agent Skill Compiler
  - Source video: How to INSTANTLY Run ANY Skill in Claude + Codex
  - Why: Enables BCrew AI OS to write agent skills once and compile them to Claude Code, OpenAI Codex, or custom runtimes.
  - Next: Create an AST parser for agent skill markdown files that extracts YAML frontmatter and compiles to target schemas.
  - Evidence: 05:57, 07:18
- Dynamic Injection Parser for Claude Code
  - Source video: How to INSTANTLY Run ANY Skill in Claude + Codex
  - Why: Allows AI OS to execute inline terminal commands defined in skill markdown files using the backtick-bang syntax safely.
  - Next: Implement a regex parser to detect `!command` patterns in markdown and execute them via a secure sandbox shell.
  - Evidence: 04:51, 05:04
- Automated Skill Consolidation Engine
  - Source video: Why 90% of Your Claude Skills Are Dead Weight
  - Why: Reduces context bloat and tool confusion by merging redundant or overlapping system skills automatically.
  - Next: Build a CLI utility that scans the skills directory, clusters similar descriptions, and prompts to merge them.
  - Evidence: 07:22
- Parallel Skill Battle-Tester
  - Source video: Why 90% of Your Claude Skills Are Dead Weight
  - Why: Ensures newly registered system tools are robust by simulating user interactions and structural audits in parallel.
  - Next: Implement a testing harness that spins up mock user and auditor agents to evaluate new MCP tools.
  - Evidence: 08:26
- Silver Platter Data Bridge
  - Source video: Build Your Agentic OS Better Than The 99%
  - Why: Pre-aggregates raw data (CSVs, PDFs) into clean markdown summaries before feeding them to agents, saving context window and reducing hallucinations.
  - Next: Develop a local script or MCP server that watches a raw data directory, runs deterministic Python aggregation, and outputs structured markdown files.
  - Evidence: 03:20, 05:19
- 4-Layer Agentic OS Directory Template
  - Source video: Build Your Agentic OS Better Than The 99%
  - Why: Standardizes the workspace structure with CLAUDE.md (Identity), custom MCPs/skills (Knowledge), subagent definitions (Workers), and lifecycle hooks (Automation).
  - Next: Create a boilerplate repository containing template files for each layer, including pre-configured session-start and post-tool-use hooks.
  - Evidence: 14:01

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 3
- PASS all videos come from the Mark Kashef Foundation pool - tjjX43FoAUg:mark-kashef, cgWZcFKx2lQ:mark-kashef, -WCNwxz3uoM:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - tjjX43FoAUg, cgWZcFKx2lQ, -WCNwxz3uoM
- PASS public YouTube page evidence captured for every video - tjjX43FoAUg:true, cgWZcFKx2lQ:true, -WCNwxz3uoM:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 6
- PASS safe resource follows are read-only metadata only - 0

