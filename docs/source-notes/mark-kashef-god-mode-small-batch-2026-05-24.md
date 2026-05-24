# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-24T23:22:55.626Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 3 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- You've Been Using Claude Code at 10%. Here's the Rest. (oYIXe6aqh_U)
  - URL: https://www.youtube.com/watch?v=oYIXe6aqh_U
  - Visual evidence: 3; build candidates: 2; tokens: 137443
- You've Never Made a Claude Code Skill Like This (hTWxGSsGDZU)
  - URL: https://www.youtube.com/watch?v=hTWxGSsGDZU
  - Visual evidence: 3; build candidates: 2; tokens: 82986
- Anthropic's NEW Claude Architect Guide In 39 Minutes (vizgFWixquE)
  - URL: https://www.youtube.com/watch?v=vizgFWixquE
  - Visual evidence: 3; build candidates: 2; tokens: 216664

## Top Build Candidates

- Path-Scoped Context Router
  - Source video: You've Been Using Claude Code at 10%. Here's the Rest.
  - Why: Optimizes context window usage by dynamically loading system prompts and rules only when the agent accesses specific file paths.
  - Next: Develop a middleware that monitors active workspace paths and injects corresponding markdown rules into the LLM system prompt.
  - Evidence: 06:58, 08:50
- Hybrid Command/Skill Execution Engine
  - Source video: You've Been Using Claude Code at 10%. Here's the Rest.
  - Why: Allows both explicit user-triggered commands and implicit, auto-triggered background skills with manual override controls.
  - Next: Build an execution manager that parses markdown-defined tools, registers them as commands, and matches them semantically to tasks.
  - Evidence: 10:46, 12:35
- Video-to-SOP Agentic Pipeline
  - Source video: You've Never Made a Claude Code Skill Like This
  - Why: Allows users to generate structured system instructions and agent skills simply by recording their screen, capturing tacit knowledge.
  - Next: Implement a local CLI tool that accepts screen recordings, calls Gemini Flash/Pro video API, and outputs structured markdown SOPs.
  - Evidence: 00:32, 08:28
- Claude Code Skill Bootstrapper
  - Source video: You've Never Made a Claude Code Skill Like This
  - Why: Automates the creation of custom Claude Code skills (.md files) from raw text SOPs using interactive user prompts.
  - Next: Create a template generator that parses SOPs and formats them into Claude-compatible skill schemas with defined triggers.
  - Evidence: 10:53, 11:07
- Deterministic Hook-Based Guardrails for AIOS Tools
  - Source video: Anthropic's NEW Claude Architect Guide In 39 Minutes
  - Why: Prevents LLM bypass of critical actions (like auth or payments) by wrapping tool execution in strict programmatic pre/post-execution hooks instead of relying on system prompts.
  - Next: Implement a middleware layer in AIOS that intercepts tool calls and executes mandatory validation scripts before forwarding to the LLM.
  - Evidence: 08:52, 10:55
- Three-Tier Context Configuration Engine
  - Source video: Anthropic's NEW Claude Architect Guide In 39 Minutes
  - Why: Optimizes token usage and context window efficiency by loading rules dynamically based on active file paths, mimicking Claude's .claude/rules/ hierarchy.
  - Next: Build a dynamic context assembler that reads global user preferences, project-level guidelines, and path-specific markdown rules on every agent turn.
  - Evidence: 18:41, 20:04

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 3
- PASS all videos come from the Mark Kashef Foundation pool - oYIXe6aqh_U:mark-kashef, hTWxGSsGDZU:mark-kashef, vizgFWixquE:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - oYIXe6aqh_U, hTWxGSsGDZU, vizgFWixquE
- PASS public YouTube page evidence captured for every video - oYIXe6aqh_U:true, hTWxGSsGDZU:true, vizgFWixquE:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 6
- PASS safe resource follows are read-only metadata only - 0

