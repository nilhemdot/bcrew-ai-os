# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T14:14:33.440Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525141433`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Every Claude Code User NEEDS To Watch This (8kWONfT_-H8)
  - URL: https://www.youtube.com/watch?v=8kWONfT_-H8
  - Visual evidence: 3; build candidates: 2; tokens: 93316
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Matt Pocock / Total TypeScript: /handoff is my new favourite skill (dtAJ2dOd3ko)
  - URL: https://www.youtube.com/watch?v=dtAJ2dOd3ko
  - Visual evidence: 3; build candidates: 2; tokens: 71100
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Nate Herk: Master 97% of Codex in 1 Hour (full course) (3TdD8Qv5Tk8)
  - URL: https://www.youtube.com/watch?v=3TdD8Qv5Tk8
  - Visual evidence: 3; build candidates: 2; tokens: 336605
  - Resource links: 0 resolved public; 11 blocked; 0 still queued
- Aaron Bitwise: Why Everyone Is Afraid of OpenClaw (And Why They're Wrong) 346 1 mo ago (67QAynXPGXQ)
  - URL: https://www.youtube.com/watch?v=67QAynXPGXQ
  - Visual evidence: 3; build candidates: 2; tokens: 85887
  - Resource links: 0 resolved public; 2 blocked; 0 still queued
- Dan Martell: Learn 97% of Claude in Under 16 Minutes (wZeOwqmSw84)
  - URL: https://www.youtube.com/watch?v=wZeOwqmSw84
  - Visual evidence: 3; build candidates: 2; tokens: 86415
  - Resource links: 0 resolved public; 10 blocked; 0 still queued
- Dream Labs AI: Kaparthy revealed the most profitable business to build in 2026 (Software 3.0) (hJNp9RwK-Uw)
  - URL: https://www.youtube.com/watch?v=hJNp9RwK-Uw
  - Visual evidence: 3; build candidates: 2; tokens: 80279
  - Resource links: 0 resolved public; 2 blocked; 0 still queued
- Kia Ghasem / AI Automations: Watch This Before Learning n8n in 2025 (TNs9YXbuovA)
  - URL: https://www.youtube.com/watch?v=TNs9YXbuovA
  - Visual evidence: 3; build candidates: 2; tokens: 56135
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Nick Saraev: How to Use Claude Code for FREE (2026) (U6gg_bi1I70)
  - URL: https://www.youtube.com/watch?v=U6gg_bi1I70
  - Visual evidence: 3; build candidates: 2; tokens: 154714
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Jack / Itssssss_Jack: 100 hours of Hermes Agent lessons in 23 minutes (k5NhsF7t68M)
  - URL: https://www.youtube.com/watch?v=k5NhsF7t68M
  - Visual evidence: 3; build candidates: 2; tokens: 131228
  - Resource links: 1 resolved public; 12 blocked; 0 still queued

## Top Build Candidates

- Human-in-the-Loop Agent Steering (Steer Mode)
  - Source: Chase AI - Every Claude Code User NEEDS To Watch This
  - Why: Allows users to inject prompts mid-execution of multi-step agent tasks, preventing wasted tokens and steering agents dynamically.
  - Next: Implement an execution queue in AIOS that can accept runtime prompt injections to modify the active task graph.
  - Evidence: 04:17, 12:15
- Unified Plugin & Skill Router (@ and / commands)
  - Source: Chase AI - Every Claude Code User NEEDS To Watch This
  - Why: Provides a clean, standardized UX for explicitly invoking system tools (plugins) or custom agent behaviors (skills) within a chat interface.
  - Next: Create a parser in AIOS chat UI that detects '@plugin' and '/skill' prefixes to pre-configure the agent context.
  - Evidence: 08:39, 10:51
- Standardized Session Handoff Protocol
  - Source: Matt Pocock / Total TypeScript - /handoff is my new favourite skill
  - Why: Allows seamless context transfer between different LLMs or agent sessions without bloating the main context window.
  - Next: Create a schema for handoff.md containing current focus, suggested next skills, and file pointers.
  - Evidence: 00:43, 05:57
- Proactive Context Degradation Monitor
  - Source: Matt Pocock / Total TypeScript - /handoff is my new favourite skill
  - Why: Alerts the user or automatically triggers compaction/handoff when the session token count enters the 'dumb zone' (e.g., >120k tokens).
  - Next: Implement token tracking with visual indicators in the AIOS terminal.
  - Evidence: 02:12
- Local Reusable Skills Engine
  - Source: Nate Herk - Master 97% of Codex in 1 Hour (full course)
  - Why: Allows AIOS to save complex, multi-step workflows as local markdown recipes that can be dynamically loaded and executed by the LLM.
  - Next: Create a parser for `.aios/skills/*.md` files that registers natural language triggers and maps them to agent execution steps.
  - Evidence: 26:44
- Visual Browser QA & Self-Correction Loop
  - Source: Nate Herk - Master 97% of Codex in 1 Hour (full course)
  - Why: Enables AIOS to launch a browser, take screenshots of deployed local/remote apps, detect visual bugs, and automatically patch the codebase.
  - Next: Integrate Playwright with a multimodal LLM to run visual assertions on local web servers and feed errors back to the developer agent.
  - Evidence: 48:25
- WSL2-Isolated Agent Sandbox
  - Source: Aaron Bitwise - Why Everyone Is Afraid of OpenClaw (And Why They're Wrong) 346 1 mo ago
  - Why: Enables safe execution of powerful but potentially risky agentic frameworks (like OpenClaw) on Windows developer machines without risking host compromise.
  - Next: Develop an automated script to provision a clean WSL2 Ubuntu instance, install OpenClaw, and verify loopback-only bindings.
  - Evidence: 02:58, 06:32
- Local Loopback Verification Utility
  - Source: Aaron Bitwise - Why Everyone Is Afraid of OpenClaw (And Why They're Wrong) 346 1 mo ago
  - Why: Prevents accidental exposure of agent gateways to public networks by automatically auditing active port bindings.
  - Next: Implement a lightweight network scanner or script that checks if agent ports are strictly bound to 127.0.0.1.
  - Evidence: 11:15
- Cross-LLM Memory Migration Tool
  - Source: Dan Martell - Learn 97% of Claude in Under 16 Minutes
  - Why: Allows users to seamlessly transition their personalized AI context and history from ChatGPT to BCrew AI OS.
  - Next: Develop a parser that processes OpenAI data exports and maps them to AI OS user profiles.
  - Evidence: 00:45
- Local OS Agentic Control (Computer Use)
  - Source: Dan Martell - Learn 97% of Claude in Under 16 Minutes
  - Why: Enables the AI OS to execute complex multi-app workflows directly on the user's desktop via screen analysis and input emulation.
  - Next: Integrate OS-level accessibility APIs and screenshot-based vision models for local task execution.
  - Evidence: 08:13
- Agentic Self-Healing Installer
  - Source: Dream Labs AI - Kaparthy revealed the most profitable business to build in 2026 (Software 3.0)
  - Why: Replaces fragile bash scripts with an LLM agent that inspects system state, executes commands, and self-corrects errors dynamically.
  - Next: Prototype a local bash execution agent with a feedback loop for error handling and environment inspection.
  - Evidence: 05:24
- Context-Aware Interactive Co-Pilot
  - Source: Dream Labs AI - Kaparthy revealed the most profitable business to build in 2026 (Software 3.0)
  - Why: Moves beyond static chat interfaces to real-time, context-aware agents that guide users through complex tasks as they take action.
  - Next: Build an LSP-integrated agent that monitors workspace state and injects proactive guidance.
  - Evidence: 10:18
- AIOS Business Diagnostic & ROI Estimator
  - Source: Kia Ghasem / AI Automations - Watch This Before Learning n8n in 2025
  - Why: Prevents the 95% failure rate by validating business problems and estimating cost/revenue impact before generating code.
  - Next: Develop a system prompt that interviews users about business bottlenecks and outputs an ROI scorecard.
  - Evidence: 01:59, 03:23
- Problem-First Workflow Generator
  - Source: Kia Ghasem / AI Automations - Watch This Before Learning n8n in 2025
  - Why: Shifts AI generation from technical prompts to business problem statements, automatically selecting the best templates.
  - Next: Integrate a vector database of n8n templates mapped to business problems (e.g., lead generation, cost reduction).
  - Evidence: 01:22, 05:31
- Local LLM Proxy for Proprietary CLIs
  - Source: Nick Saraev - How to Use Claude Code for FREE (2026)
  - Why: Allows AIOS to run expensive agentic CLIs (like Claude Code) on local or cheap open-source models.
  - Next: Build a lightweight Python proxy that mimics Anthropic's /v1/messages endpoint and translates to OpenRouter/Ollama.
  - Evidence: 02:52
- Dynamic CLI Endpoint Overrider
  - Source: Nick Saraev - How to Use Claude Code for FREE (2026)
  - Why: Enables seamless switching of backend LLMs for terminal-based developer agents without modifying their source code.
  - Next: Create an environment variable manager in AIOS to inject custom base URLs.
  - Evidence: 09:48
- Persistent Context Engine (soul.md)
  - Source: Jack / Itssssss_Jack - 100 hours of Hermes Agent lessons in 23 minutes
  - Why: Enables the AI OS to maintain a highly personalized, structured profile of the user's identity, business, and preferences, drastically improving prompt relevance.
  - Next: Design a standardized schema for a local soul.md file and integrate it into the system prompt loader.
  - Evidence: 02:20
- Asynchronous Background Task Runner
  - Source: Jack / Itssssss_Jack - 100 hours of Hermes Agent lessons in 23 minutes
  - Why: Allows users to delegate heavy research or processing tasks to background workers via a simple command, keeping the primary interface responsive.
  - Next: Implement a task queue system triggered by a /background command.
  - Evidence: 05:40

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - 8kWONfT_-H8:chase-ai, dtAJ2dOd3ko:matt-pocock-total-typescript, 3TdD8Qv5Tk8:nate-herk, 67QAynXPGXQ:aaron-bitwise, wZeOwqmSw84:dan-martell, hJNp9RwK-Uw:dream-labs-ai, TNs9YXbuovA:kia-ghasem-ai-automations, U6gg_bi1I70:nick-saraev, k5NhsF7t68M:jack-itssssss
- PASS public YouTube page evidence captured for every video - 8kWONfT_-H8:true, dtAJ2dOd3ko:true, 3TdD8Qv5Tk8:true, 67QAynXPGXQ:true, wZeOwqmSw84:true, hJNp9RwK-Uw:true, TNs9YXbuovA:true, U6gg_bi1I70:true, k5NhsF7t68M:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 8kWONfT_-H8:ready_for_scoper, dtAJ2dOd3ko:ready_for_scoper, 3TdD8Qv5Tk8:ready_for_scoper, 67QAynXPGXQ:ready_for_scoper, wZeOwqmSw84:ready_for_scoper, hJNp9RwK-Uw:ready_for_scoper, TNs9YXbuovA:ready_for_scoper, U6gg_bi1I70:ready_for_scoper, k5NhsF7t68M:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 8kWONfT_-H8:0, dtAJ2dOd3ko:0, 3TdD8Qv5Tk8:0, 67QAynXPGXQ:0, wZeOwqmSw84:0, hJNp9RwK-Uw:0, TNs9YXbuovA:0, U6gg_bi1I70:0, k5NhsF7t68M:0
- PASS batch produced ranked build candidates - 18
