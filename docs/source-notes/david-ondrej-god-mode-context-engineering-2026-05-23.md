# David Ondrej God Mode Context Engineering Note

Date: 2026-05-23

Source:

- Creator: David Ondrej
- Channel: `https://www.youtube.com/@davidondrej`
- Video: `https://www.youtube.com/watch?v=PzVV4X37ihg`
- Title observed by extractor: `Why This Dev Ships 100x Faster Than 99% of Engineers`
- Pending video lead: `https://www.youtube.com/watch?v=efRIrLXoOVA`
- Pending title from web lookup: `Anthropic Just Dropped a Masterclass on Building Agent Harnesses (for Large Codebases)`

Why this matters:

Steve asked whether this video changes the BCrew build workflow, especially around Cursor, context engineering, and shipping faster as a non-developer operator.

Extractor proof:

- Mode: God Mode YouTube full video/audio/visual extraction
- Model: `gemini-3.5-flash`
- Video/audio/visual route: Gemini API YouTube URL video understanding
- Local report: `/tmp/bcrew-david-ondrej-god-mode/david-ondrej-PzVV4X37ihg-god-mode.json`
- Public comment proof: `/tmp/bcrew-david-ondrej-god-mode/david-ondrej-comments-aleksdeveloper698.json`

High-signal findings:

- The video argues for agentic engineering over loose vibe coding: scoped context, harnesses, source-grounded tools, agent instructions, and review loops.
- Visual evidence showed an agentic engineering harness map: Cursor / Claude Code / Codex, model, tools, system prompts, markdown files, and a large context window.
- Visual evidence showed an `AGENTS.md` pattern and `npx opensrc <package>` workflow for pulling real dependency source into the coding-agent context.
- Visual evidence showed a Greptile-style review loop and `/greploop` command pattern for self-healing PR iteration.

Build candidates:

- Dependency Source Injector: wrap an `opensrc`-style dependency-source fetch/cache tool so agents can inspect actual package code before changing repo code.
- Self-Healing PR Loop: integrate a review/test loop that feeds findings back to the coding agent until a threshold is met.

Important public comment:

- Public handle observed: `@aleksdeveloper698`
- Comment gist: a senior software developer argues most of the stack in the video may be unnecessary if the operator buys/uses a GLM coding plan, runs OpenCode against the GLM open model, and focuses on finishing projects quickly.
- This should become a review question, not accepted as truth without testing: compare current Codex/Claude workflow, Cursor-style context engineering, and OpenCode/GLM on one bounded BCrew task.

Operating decision:

- Do not buy Cursor only because this video is persuasive.
- Do add David Ondrej to the Build Intel watchlist.
- Do evaluate the workflow ideas as build candidates inside the Dev Team sprint.
- Do treat the `@aleksdeveloper698` GLM/OpenCode claim as a competing workflow to test.

## 2026-05-24 Agent Harness Lead

Steve supplied `https://youtu.be/efrirlxoova?si=pbtitpxospq4rkhg` as an agent-harness video to add to the extraction hit list. The raw link used lowercase characters, but web lookup resolved the case-sensitive YouTube ID to `efRIrLXoOVA`.

Status:

- Add to watchlist/source refs.
- Do not treat as extracted yet.
- Queue for God Mode video/audio/visual extraction when the active Mark/God Mode batch allows another harness-focused video.
