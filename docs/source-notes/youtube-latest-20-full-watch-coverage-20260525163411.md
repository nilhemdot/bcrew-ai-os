# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T16:34:11.515Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525163411`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: You're Using Claude Code Wrong (Add Codex) (VdxUKiF8CWI)
  - URL: https://www.youtube.com/watch?v=VdxUKiF8CWI
  - Visual evidence: 3; build candidates: 2; tokens: 157538
  - Resource links: 0 resolved public; 10 blocked; 0 still queued
- Matt Pocock / Total TypeScript: Never Trust An LLM (9VNG0h4pLh0)
  - URL: https://www.youtube.com/watch?v=9VNG0h4pLh0
  - Visual evidence: 3; build candidates: 2; tokens: 80045
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Aaron Bitwise: Integrating ChatGPT and Gemini: Python's New Power Duo (igrRObiGHVA)
  - URL: https://www.youtube.com/watch?v=igrRObiGHVA
  - Visual evidence: 3; build candidates: 2; tokens: 181966
  - Resource links: 0 resolved public; 1 blocked; 0 still queued
- Dream Labs AI: The Claude Code Setup Every Business Owner Should Have In 2026 (E8Vom5AryGE)
  - URL: https://www.youtube.com/watch?v=E8Vom5AryGE
  - Visual evidence: 3; build candidates: 2; tokens: 147257
  - Resource links: 0 resolved public; 2 blocked; 0 still queued
- Nick Saraev: Claude Computer Use Just Dropped, Here's How to Hack It (2u93VTYvG5U)
  - URL: https://www.youtube.com/watch?v=2u93VTYvG5U
  - Visual evidence: 3; build candidates: 2; tokens: 84898
  - Resource links: 0 resolved public; 13 blocked; 0 still queued
- Dan Martell: 7 Insane Use Cases For Manus AI (with Zero Code) (-5DylM1EdI4)
  - URL: https://www.youtube.com/watch?v=-5DylM1EdI4
  - Visual evidence: 3; build candidates: 2; tokens: 123071
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Kia Ghasem / AI Automations: n8n Webhook (Step-By-Step Guide) (EnEKKPLjZNU)
  - URL: https://www.youtube.com/watch?v=EnEKKPLjZNU
  - Visual evidence: 3; build candidates: 2; tokens: 111614
  - Resource links: 0 resolved public; 5 blocked; 0 still queued
- Jack / Itssssss_Jack: Build your first AI agent (Claude Code) (o1u_mEELKOQ)
  - URL: https://www.youtube.com/watch?v=o1u_mEELKOQ
  - Visual evidence: 3; build candidates: 2; tokens: 129183
  - Resource links: 0 resolved public; 9 blocked; 0 still queued
- Jono Catliff: Claude Code SEO: How I Got 50,000 Clicks Per Month (Steal This) (4IyJm1i__ag)
  - URL: https://www.youtube.com/watch?v=4IyJm1i__ag
  - Visual evidence: 3; build candidates: 2; tokens: 376474
  - Resource links: 0 resolved public; 30 blocked; 0 still queued

## Top Build Candidates

- Dual-Agent Cross-Verification Engine
  - Source: Chase AI - You're Using Claude Code Wrong (Add Codex)
  - Why: Reduces code errors by pitting two distinct LLM architectures (e.g., Claude and GPT) against each other for planning and code review.
  - Next: Develop an orchestration layer that automatically pipes Agent A's output to Agent B for critique before execution.
  - Evidence: 17:08, 21:10
- Unified Agent Workspace with Live Preview
  - Source: Chase AI - You're Using Claude Code Wrong (Add Codex)
  - Why: Improves developer experience by combining file management, multiple agent terminals, and an in-app browser into a single interface.
  - Next: Integrate an embedded browser component (like Electron/Tauri) into the AIOS workspace for real-time visual feedback.
  - Evidence: 12:23, 20:16
- Uncertainty-Aware Evaluation Benchmark
  - Source: Matt Pocock / Total TypeScript - Never Trust An LLM
  - Why: Standard benchmarks reward guessing. AIOS needs an evaluation suite that rewards 'I don't know' or active tool invocation over hallucinated answers.
  - Next: Implement a custom evaluation harness that penalizes incorrect answers twice as heavily as 'I don't know' responses.
  - Evidence: 07:55, 08:51
- Forced Grounding Search Router
  - Source: Matt Pocock / Total TypeScript - Never Trust An LLM
  - Why: Parametric memory is highly compressed and prone to hallucination. Forcing search tool usage converts extrinsic queries into highly reliable intrinsic context.
  - Next: Build a classifier that detects factual/temporal queries and automatically injects real-time search results into the context.
  - Evidence: 11:05, 11:16
- Lightweight Structured Extractor
  - Source: Aaron Bitwise - Integrating ChatGPT and Gemini: Python's New Power Duo
  - Why: Enables reliable JSON extraction from unstructured text using native SDKs, avoiding framework overhead.
  - Next: Develop a Python utility class that wraps native OpenAI/Gemini SDKs with schema enforcement and low-temperature settings.
  - Evidence: 09:30
- Unified LLM Provider Interface
  - Source: Aaron Bitwise - Integrating ChatGPT and Gemini: Python's New Power Duo
  - Why: Provides a stable, lightweight abstraction layer to swap LLM providers without LangChain's dependency bloat or deprecation issues.
  - Next: Create a custom wrapper interface supporting unified input/output schemas for both OpenAI and Google Gemini.
  - Evidence: 13:40, 15:30
- Persistent Context Generator (CLAUDE.md Wizard)
  - Source: Dream Labs AI - The Claude Code Setup Every Business Owner Should Have In 2026
  - Why: Improves AIOS agent alignment by generating a structured markdown context file based on a guided business onboarding questionnaire.
  - Next: Develop an onboarding UI that interviews the user and writes a system-level context file.
  - Evidence: 08:10, 08:24
- Scheduled Agentic Routines Engine
  - Source: Dream Labs AI - The Claude Code Setup Every Business Owner Should Have In 2026
  - Why: Enables AIOS to run background, cron-like agent workflows (e.g., email triage, stock audits) using natural language instructions and MCP connectors.
  - Next: Build a scheduling engine that maps cron triggers to agent execution loops with tool access.
  - Evidence: 16:26, 18:17
- Obscure Browser Integration for Stealth Automation
  - Source: Nick Saraev - Claude Computer Use Just Dropped, Here's How to Hack It
  - Why: Bypasses anti-bot and AI-provider blocklists by routing agent traffic through lightweight, non-standard browsers like Min.
  - Next: Add support for Min browser execution within the AIOS browser tool suite.
  - Evidence: 01:38, 14:08
- Visual-First Human-Like QA Agent
  - Source: Nick Saraev - Claude Computer Use Just Dropped, Here's How to Hack It
  - Why: Enables end-to-end testing of web apps using actual mouse clicks and keyboard events instead of synthetic JS execution.
  - Next: Develop a visual QA testing template that captures screenshots at each step and asserts UI state.
  - Evidence: 11:17
- Virtual Browser Execution Canvas
  - Source: Dan Martell - 7 Insane Use Cases For Manus AI (with Zero Code)
  - Why: Enables the AI OS to run a headless or visible browser instance (using Playwright/Puppeteer) that users can monitor and interact with in real-time.
  - Next: Develop a sandboxed browser execution service integrated with an LLM planning agent to handle form-filling and navigation.
  - Evidence: 01:13
- Instant App Prototyping Engine
  - Source: Dan Martell - 7 Insane Use Cases For Manus AI (with Zero Code)
  - Why: Allows users to generate, preview, and deploy simple web/mobile applications instantly using a unified code-generation and hosting pipeline.
  - Next: Create a template-based code generation pipeline that deploys to a temporary serverless hosting provider with a QR code preview.
  - Evidence: 06:25
- AIOS Event-Driven Webhook Gateway
  - Source: Kia Ghasem / AI Automations - n8n Webhook (Step-By-Step Guide)
  - Why: Allows AIOS to expose secure, authenticated webhook endpoints dynamically for external systems to trigger agent workflows instantly.
  - Next: Implement a dynamic endpoint router in AIOS that supports header-based bearer token authentication and maps incoming payloads to agent triggers.
  - Evidence: 08:37, 13:34
- Automated Webhook Registration Engine
  - Source: Kia Ghasem / AI Automations - n8n Webhook (Step-By-Step Guide)
  - Why: Enables AI agents to automatically register webhooks on third-party platforms using OAuth2 credentials without manual UI setup.
  - Next: Develop API connectors that programmatically create webhook subscriptions on external platforms during agent initialization.
  - Evidence: 01:55, 02:45
- BLAST Framework System Prompt
  - Source: Jack / Itssssss_Jack - Build your first AI agent (Claude Code)
  - Why: Standardizes agent generation by forcing Claude to ask discovery questions and write a CLAUDE.md constitution.
  - Next: Integrate BLAST protocol into the AIOS system prompt library.
  - Evidence: 07:33
- Local HTML Dashboard Sandbox
  - Source: Jack / Itssssss_Jack - Build your first AI agent (Claude Code)
  - Why: Allows agents to output interactive local web interfaces for human-in-the-loop review.
  - Next: Build a secure local web server inside AIOS to serve agent-generated HTML dashboards.
  - Evidence: 18:40
- Automated SEO Content Pipeline with Style Injection
  - Source: Jono Catliff - Claude Code SEO: How I Got 50,000 Clicks Per Month (Steal This)
  - Why: Automates keyword research filtering, few-shot style injection (voice/humor), and programmatic on-page SEO checklist validation.
  - Next: Build an AIOS skill that pulls keywords from SEMrush API, filters by KD/Volume, and generates styled articles using custom style templates.
  - Evidence: 11:25, 22:19
- Lighthouse-Driven Code Optimization Agent
  - Source: Jono Catliff - Claude Code SEO: How I Got 50,000 Clicks Per Month (Steal This)
  - Why: Automates the loop of running Lighthouse audits, parsing performance bottlenecks, and prompting the AI agent to refactor code until scores reach 100%.
  - Next: Implement a CLI tool integration in AIOS that runs Lighthouse, parses the JSON report, and feeds errors back to the code generation agent.
  - Evidence: 07:28, 08:53

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - VdxUKiF8CWI:chase-ai, 9VNG0h4pLh0:matt-pocock-total-typescript, igrRObiGHVA:aaron-bitwise, E8Vom5AryGE:dream-labs-ai, 2u93VTYvG5U:nick-saraev, -5DylM1EdI4:dan-martell, EnEKKPLjZNU:kia-ghasem-ai-automations, o1u_mEELKOQ:jack-itssssss, 4IyJm1i__ag:jono-catliff
- PASS public YouTube page evidence captured for every video - VdxUKiF8CWI:true, 9VNG0h4pLh0:true, igrRObiGHVA:true, E8Vom5AryGE:true, 2u93VTYvG5U:true, -5DylM1EdI4:true, EnEKKPLjZNU:true, o1u_mEELKOQ:true, 4IyJm1i__ag:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - VdxUKiF8CWI:ready_for_scoper, 9VNG0h4pLh0:ready_for_scoper, igrRObiGHVA:ready_for_scoper, E8Vom5AryGE:ready_for_scoper, 2u93VTYvG5U:ready_for_scoper, -5DylM1EdI4:ready_for_scoper, EnEKKPLjZNU:ready_for_scoper, o1u_mEELKOQ:ready_for_scoper, 4IyJm1i__ag:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - VdxUKiF8CWI:0, 9VNG0h4pLh0:0, igrRObiGHVA:0, E8Vom5AryGE:0, 2u93VTYvG5U:0, -5DylM1EdI4:0, EnEKKPLjZNU:0, o1u_mEELKOQ:0, 4IyJm1i__ag:0
- PASS batch produced ranked build candidates - 18

