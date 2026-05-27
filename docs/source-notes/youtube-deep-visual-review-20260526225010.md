# YouTube Deep Visual Review

Generated: 2026-05-26T22:50:10.350Z
Report artifact: `batch:youtube-deep-visual-review:v1:20260526225010`
Model: `gemini-3.5-flash`

## Summary

- Videos reviewed: 5
- Timestamped visual evidence: 76
- Screen/code/tooling details: 76
- Build candidates: 40
- Missed-by-standard notes: 24

## Videos

- Nuno Tavares / Automated Marketer: Claude Code + GoHighLevel MCP Setup in 10 Minutes (Yu50M9al2JY)
  - URL: https://www.youtube.com/watch?v=Yu50M9al2JY
  - Deep rank: 1; score: 191
  - Reasons: Director rank 23; 7 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 2 missed-by-transcript notes; title indicates screen/code/UI detail
  - Visual evidence: 18; screen/code/tooling: 18
- Austin Marchese: How Claude Code's Creator ACTUALLY Automates his work (jdLFeBkiy3M)
  - URL: https://www.youtube.com/watch?v=jdLFeBkiy3M
  - Deep rank: 2; score: 190
  - Reasons: Director rank 8; 5 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 1 missed-by-transcript notes; title indicates screen/code/UI detail
  - Visual evidence: 16; screen/code/tooling: 16
- David Ondrej: 100 hours of Hermes Agent lessons in 46 minutes (G47mnkGkYwQ)
  - URL: https://www.youtube.com/watch?v=G47mnkGkYwQ
  - Deep rank: 3; score: 183
  - Reasons: Director rank 7; 7 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 1 missed-by-transcript notes
  - Visual evidence: 20; screen/code/tooling: 20
- Everyday AI / Jordan Wilson: Ep 779: First big AI IPO launches, Anthropic gets called out, Google preps for big AI updates at ... (bnXqtDqwh-Y)
  - URL: https://www.youtube.com/watch?v=bnXqtDqwh-Y
  - Deep rank: 4; score: 180
  - Reasons: Director rank 10; 7 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 1 missed-by-transcript notes
  - Visual evidence: 5; screen/code/tooling: 5
- Chris Bradley / MRR Official: Build Your Own CRM With Claude (in 7 steps) save £££ (JiSQj9eJI3c)
  - URL: https://www.youtube.com/watch?v=JiSQj9eJI3c
  - Deep rank: 5; score: 180
  - Reasons: Director rank 38; 7 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 3 missed-by-transcript notes; title indicates screen/code/UI detail
  - Visual evidence: 17; screen/code/tooling: 17

## Top Build Candidates

- GHL MCP Connector for AIOS
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Enables direct, middleware-free integration of GHL CRM data into AIOS workflows.
  - Next: Implement GHL's MCP server configuration schema within the AIOS tool registry.
  - Evidence: 01:05, 01:21
- Granular Scope Manager
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Prevents AI agents from executing destructive actions by enforcing strict scope limits.
  - Next: Build a UI toggle system in AIOS matching GHL's API scope permissions.
  - Evidence: 02:50
- GHL MCP Integration Module
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Enables Claude Code to directly query and modify GHL CRM data.
  - Next: Configure the MCP server using the generated PIT token and Location ID.
  - Evidence: 02:23, 03:44
- Scope-Limiting Security Guardrail
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Prevents AI agents from executing destructive actions like deleting users.
  - Next: Implement a validation step to ensure only read/write scopes are active.
  - Evidence: 02:54
- Automated MCP Config Injector CLI
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Eliminates manual string replacement errors during setup.
  - Next: Develop a lightweight CLI tool to prompt for tokens and update the config file.
  - Evidence: 05:33
- GHL MCP Connection Verifier
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Ensures the GHL MCP server is reachable and authenticated before running agent workflows.
  - Next: Create a diagnostic script to test the GHL API connection.
  - Evidence: 07:01
- Automated GHL MCP Configurator
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Simplifies the process of injecting GHL credentials into Claude's configuration.
  - Next: Develop a script to auto-detect the config path and write the GHL MCP settings.
  - Evidence: 06:12, 06:48
- AI Agent Team Workspace Template
  - Source: Nuno Tavares / Automated Marketer - Claude Code + GoHighLevel MCP Setup in 10 Minutes
  - Why: Provides a pre-structured workspace matching the starter kit for quick deployment.
  - Next: Create a repository template containing the standard GHL agent files.
  - Evidence: 07:30, 08:28
- AIOS Workspace Slash Command Engine
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Allows users to trigger complex multi-step bash and git workflows using simple slash commands.
  - Next: Create a parser that reads executable scripts from a local `.aios/commands/` directory.
  - Evidence: 01:26
- Subagent Orchestrator with Pre-Allowed CLI Permissions
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Enables specialized subagents to run safe commands (git, npm) without prompting the user for approval every time.
  - Next: Design a settings schema that maps specific CLI tools to auto-approve rules.
  - Evidence: 03:05
- Claude Code Slash Command Suite
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Replicates the exact developer workflow shortcuts used by Anthropic's team to minimize manual git and testing overhead.
  - Next: Clone the public bcherny/claude repo and port the bash scripts in `.claude/commands/` to our local environment.
  - Evidence: 01:26, 02:14
- Skeptical Staff Reviewer Subagent
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Implements a pre-implementation sanity check agent that prevents over-engineering and identifies edge cases early.
  - Next: Extract the full system prompt from `staff-reviewer.md` and configure it as a default workspace reviewer agent.
  - Evidence: 03:14
- Claude Code Subagent Orchestrator
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Allows developers to spin up specialized, single-purpose review agents locally.
  - Next: Create a template generator for .claude/agents/ based on the staff-reviewer markdown structure.
  - Evidence: 03:05, 03:14
- Event-Driven Claude Hooks Configurator
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Automates post-generation tasks like formatting, linting, and test validation without manual prompts.
  - Next: Implement a parser for .clauderc hook configurations to run local shell commands.
  - Evidence: 04:25
- Claude Code Hook Manager
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Automates the generation of standard hooks (formatting, continuation, logging) for local workspaces.
  - Next: Create a CLI utility to inject standard hook configurations into .claudecode.
  - Evidence: 04:25
- Auto-Ingestion Knowledge Pipeline
  - Source: Austin Marchese - How Claude Code's Creator ACTUALLY Automates his work
  - Why: Keeps local knowledge bases synced and ingested automatically as developers add raw files.
  - Next: Implement the shell script hook shown at 05:17 as a reusable workspace skill.
  - Evidence: 05:17
- Visual Kanban Task Orchestrator
  - Source: David Ondrej - 100 hours of Hermes Agent lessons in 46 minutes
  - Why: Improves visibility of multi-agent task execution through a node-based visual pipeline.
  - Next: Develop a lightweight React-based node graph UI that maps to agent task states.
  - Evidence: 00:47
- Holographic Fact Store Memory Layer
  - Source: David Ondrej - 100 hours of Hermes Agent lessons in 46 minutes
  - Why: Enables long-term semantic memory consolidation through background compaction.
  - Next: Design a hybrid vector/SQLite storage layer with an automated summarization daemon.
  - Evidence: 01:03, 01:15
