# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-24T23:40:40.901Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 3 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- Google's New CLI Just Made Claude Code Unstoppable (1Z1aECGwJh0)
  - URL: https://www.youtube.com/watch?v=1Z1aECGwJh0
  - Visual evidence: 3; build candidates: 2; tokens: 78691
- You've Never Used Claude Code Skills Like This (EeX7ovArylU)
  - URL: https://www.youtube.com/watch?v=EeX7ovArylU
  - Visual evidence: 3; build candidates: 2; tokens: 71336
- Plan Like a Pro in Claude Code (3qUg57KGSVY)
  - URL: https://www.youtube.com/watch?v=3qUg57KGSVY
  - Visual evidence: 3; build candidates: 2; tokens: 94542

## Top Build Candidates

- Google Workspace CLI Agent Toolset
  - Source video: Google's New CLI Just Made Claude Code Unstoppable
  - Why: Enables direct, low-latency integration of Google Workspace APIs into AIOS tools, bypassing heavy middleware like Zapier.
  - Next: Implement a tool wrapper around `gws` commands for the AIOS agent.
  - Evidence: 02:07, 04:25
- Automated Google Cloud OAuth Provisioner
  - Source video: Google's New CLI Just Made Claude Code Unstoppable
  - Why: Simplifies the complex developer setup of Google Cloud APIs for end-users via guided browser automation.
  - Next: Create a browser automation script to configure OAuth consent and download credentials.
  - Evidence: 05:30, 08:08
- Multi-Model Consensus (Council) Skill for AIOS CLI
  - Source video: You've Never Used Claude Code Skills Like This
  - Why: Allows the AIOS terminal agent to dynamically spin up sub-agents using specialized models via OpenRouter to audit its own work before final execution.
  - Next: Build a CLI skill parser that reads a config mapping task categories to OpenRouter model IDs and executes parallel API calls.
  - Evidence: 02:10, 07:25
- Context-Aware LLM Router & Synthesizer
  - Source video: You've Never Used Claude Code Skills Like This
  - Why: Enables AIOS to package local codebase context, send it to specialized models, and synthesize conflicting feedback into a single actionable plan.
  - Next: Implement context packaging rules (specific files, tried approaches, desired output format) and synthesis prompts for the primary executor model.
  - Evidence: 03:20, 04:32, 05:10
- ASCII Layout Planner Agent
  - Source video: Plan Like a Pro in Claude Code
  - Why: Enforces a visual planning step in AI OS code generation tasks, reducing code iterations and token usage by aligning on UI structure first.
  - Next: Create a system prompt template that instructs the LLM to output an ASCII wireframe and wait for user confirmation before generating code.
  - Evidence: 02:42, 06:13
- ASCII ER Diagram Schema Validator
  - Source video: Plan Like a Pro in Claude Code
  - Why: Allows non-technical users to review and modify database schemas visually in plain text before the AI OS generates SQL migrations.
  - Next: Develop a tool that parses ASCII ER diagrams into structured JSON schemas to feed into SQL generation pipelines.
  - Evidence: 13:15

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos - 3
- PASS all videos come from the Mark Kashef Foundation pool - 1Z1aECGwJh0:mark-kashef, EeX7ovArylU:mark-kashef, 3qUg57KGSVY:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - 1Z1aECGwJh0, EeX7ovArylU, 3qUg57KGSVY
- PASS public YouTube page evidence captured for every video - 1Z1aECGwJh0:true, EeX7ovArylU:true, 3qUg57KGSVY:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 6
- PASS safe resource follows are read-only metadata only - 0

