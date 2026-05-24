# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-24T23:36:59.623Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 3 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- Don't Use Claude's 1M Context Until You See This (ODA1eBo3P4w)
  - URL: https://www.youtube.com/watch?v=ODA1eBo3P4w
  - Visual evidence: 3; build candidates: 2; tokens: 71759
- This Is the Most Underrated Feature of Claude Code (04zBiBqzKQA)
  - URL: https://www.youtube.com/watch?v=04zBiBqzKQA
  - Visual evidence: 3; build candidates: 2; tokens: 64002
- Anthropic Just Dropped Skills for Office Apps (dMXuKdIGzVo)
  - URL: https://www.youtube.com/watch?v=dMXuKdIGzVo
  - Visual evidence: 3; build candidates: 2; tokens: 51466

## Top Build Candidates

- Dynamic Context Budgeter & Toggle
  - Source video: Don't Use Claude's 1M Context Until You See This
  - Why: Prevents runaway token costs by allowing users to cap context windows (e.g., 200k vs 1M) based on task complexity.
  - Next: Add a context-limit configuration parameter to AIOS agent initialization and CLI commands.
  - Evidence: 06:42
- Manual Compaction & Session Reset Trigger
  - Source video: Don't Use Claude's 1M Context Until You See This
  - Why: Avoids automated compaction loops that dilute critical instructions by giving users manual control over when to summarize and reset.
  - Next: Implement a `/compact` or `/reset` command in AIOS to clean up agent memory on demand.
  - Evidence: 09:57, 10:09
- AIOS Context Linter & CLAUDE.md Generator
  - Source video: This Is the Most Underrated Feature of Claude Code
  - Why: Ensures LLM-based developers always have optimized, structured instructions matching the repository's style.
  - Next: Implement an automated background agent that reads codebase patterns and updates the local CLAUDE.md.
  - Evidence: 04:34
- Self-Healing Configuration Agent for CLI Tools
  - Source video: This Is the Most Underrated Feature of Claude Code
  - Why: Automatically resolves syntax errors or schema mismatches in tool configurations like settings.json or hooks.
  - Next: Create a diagnostic loop that catches CLI tool startup errors and feeds them to a specialized sub-agent.
  - Evidence: 09:28
- Local Python-based Office Skill Runner
  - Source video: Anthropic Just Dropped Skills for Office Apps
  - Why: Allows AIOS to execute deterministic Python scripts (e.g., openpyxl, python-pptx) directly on local Office files via slash commands.
  - Next: Build a local execution sandbox that maps slash commands to Python scripts with file-system access.
  - Evidence: 06:47, 07:12
- Cross-File Context Sync Engine
  - Source video: Anthropic Just Dropped Skills for Office Apps
  - Why: Enables the AI assistant to maintain context across multiple open documents (Excel, PowerPoint, Word) simultaneously.
  - Next: Implement a background file watcher that feeds active document states into the LLM context window.
  - Evidence: 03:59

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 3
- PASS all videos come from the Mark Kashef Foundation pool - ODA1eBo3P4w:mark-kashef, 04zBiBqzKQA:mark-kashef, dMXuKdIGzVo:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - ODA1eBo3P4w, 04zBiBqzKQA, dMXuKdIGzVo
- PASS public YouTube page evidence captured for every video - ODA1eBo3P4w:true, 04zBiBqzKQA:true, dMXuKdIGzVo:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 6
- PASS safe resource follows are read-only metadata only - 0

