# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T16:24:20.185Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525162420`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 9 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Codex Just Became THE BEST Long Running Agentic Harness (nOFordZCyzs)
  - URL: https://www.youtube.com/watch?v=nOFordZCyzs
  - Visual evidence: 3; build candidates: 2; tokens: 97743
  - Resource links: 0 resolved public; 10 blocked; 0 still queued
- Matt Pocock / Total TypeScript: How To De-Slop A Codebase Ruined By AI (with one skill) (3MP8D-mdheA)
  - URL: https://www.youtube.com/watch?v=3MP8D-mdheA
  - Visual evidence: 3; build candidates: 2; tokens: 64960
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Aaron Bitwise: Want to Know the REAL Power of AI Agents? (MycU50Jl6Z8)
  - URL: https://www.youtube.com/watch?v=MycU50Jl6Z8
  - Visual evidence: 3; build candidates: 2; tokens: 145181
  - Resource links: 0 resolved public; 1 blocked; 0 still queued
- Dan Martell: Why I Switched From ChatGPT to Claude (without losing anything) (XRU-CjzYt_o)
  - URL: https://www.youtube.com/watch?v=XRU-CjzYt_o
  - Visual evidence: 3; build candidates: 2; tokens: 91125
  - Resource links: 0 resolved public; 8 blocked; 0 still queued
- Dream Labs AI: The Brilliant AI Social Media System Alex Hormozi Is Using to Win (sn2d_eXeV9A)
  - URL: https://www.youtube.com/watch?v=sn2d_eXeV9A
  - Visual evidence: 3; build candidates: 2; tokens: 113180
  - Resource links: 0 resolved public; 4 blocked; 0 still queued
- Kia Ghasem / AI Automations: Give me 58 sec...I’ll IMPROVE your n8n skills by 176% (qBEyaFhduYg)
  - URL: https://www.youtube.com/watch?v=qBEyaFhduYg
  - Visual evidence: 3; build candidates: 2; tokens: 7687
  - Resource links: 0 resolved public; 6 blocked; 0 still queued
- Nick Saraev: Claude Mythos Preview: Everything You Need to Know (oCuttuCQmZg)
  - URL: https://www.youtube.com/watch?v=oCuttuCQmZg
  - Visual evidence: 3; build candidates: 2; tokens: 224312
  - Resource links: 0 resolved public; 12 blocked; 0 still queued
- Jack / Itssssss_Jack: Hermes Agent just got 10X Better (Agentic OS) (7xuWZ-3lyQE)
  - URL: https://www.youtube.com/watch?v=7xuWZ-3lyQE
  - Visual evidence: 3; build candidates: 2; tokens: 173124
  - Resource links: 1 resolved public; 11 blocked; 0 still queued
- Jono Catliff: Claude Code Website Conversion Rate Optimization (20% Conversions, $1.2M Case Study) (ru7fWKD4cyw)
  - URL: https://www.youtube.com/watch?v=ru7fWKD4cyw
  - Visual evidence: 3; build candidates: 2; tokens: 422829
  - Resource links: 0 resolved public; 28 blocked; 0 still queued

## Top Build Candidates

- Graceful Budget-Limited Agent Loop
  - Source: Chase AI - Codex Just Became THE BEST Long Running Agentic Harness
  - Why: Prevents abrupt agent failures when hitting token/cost limits by injecting a wrap-up prompt to summarize progress.
  - Next: Implement a token-monitoring middleware in AIOS that triggers a 'graceful exit' prompt when 90% of the budget is spent.
  - Evidence: 00:15, 05:28
- Automated Playwright Verification Harness
  - Source: Chase AI - Codex Just Became THE BEST Long Running Agentic Harness
  - Why: Enables the agent to autonomously verify UI and frontend changes by running headless browser tests and feeding results back to the LLM.
  - Next: Integrate a sandboxed Playwright execution environment into the AIOS toolset.
  - Evidence: 09:07, 14:44
- Architectural Refactoring Agent
  - Source: Matt Pocock / Total TypeScript - How To De-Slop A Codebase Ruined By AI (with one skill)
  - Why: Helps users identify shallow modules and missing seams in legacy codebases to improve maintainability.
  - Next: Build a system prompt that parses codebase structure and flags low-locality patterns.
  - Evidence: 05:50
- Interactive Design Grilling Loop
  - Source: Matt Pocock / Total TypeScript - How To De-Slop A Codebase Ruined By AI (with one skill)
  - Why: Prevents AI from making unilateral bad design decisions by forcing a multi-turn Q&A before writing code.
  - Next: Implement a stateful agent workflow that generates 3-5 critical architectural questions before refactoring.
  - Evidence: 07:22
- Browser-Based Human-in-the-Loop (HITL) Protocol
  - Source: Aaron Bitwise - Want to Know the REAL Power of AI Agents?
  - Why: Enables the AI OS to safely execute web automation tasks by pausing and handing over control to the user for sensitive actions like logins or payments.
  - Next: Develop a browser extension or containerized browser environment that supports shared control between the agent and user.
  - Evidence: 08:52, 19:18
- Dynamic Tool Schema Registry
  - Source: Aaron Bitwise - Want to Know the REAL Power of AI Agents?
  - Why: Allows the AI OS to dynamically register, describe, and expose local and web APIs to the LLM router using standardized JSON schemas.
  - Next: Create a Python-based registry that auto-generates OpenAI-compatible tool schemas from function docstrings.
  - Evidence: 00:22, 22:20
- Cross-App Browser Automation Sidecar
  - Source: Dan Martell - Why I Switched From ChatGPT to Claude (without losing anything)
  - Why: Enables real-time page reading, form filling, and cross-app workflows (e.g., Sheets to Gmail) directly from a browser extension.
  - Next: Develop a Chrome extension sidecar that pipes DOM context to the AIOS local agent.
  - Evidence: 05:31
- Universal LLM Memory Migration Utility
  - Source: Dan Martell - Why I Switched From ChatGPT to Claude (without losing anything)
  - Why: Allows users to migrate their custom instructions, style preferences, and memory from ChatGPT/other LLMs to AIOS.
  - Next: Build a prompt template that extracts structured JSON profiles from ChatGPT to seed AIOS user profiles.
  - Evidence: 13:56
- AI OS Style Cloner & Voice Engine
  - Source: Dream Labs AI - The Brilliant AI Social Media System Alex Hormozi Is Using to Win
  - Why: Allows users to upload raw text/transcripts to automatically extract voice, tone, and formatting rules, preventing generic AI output.
  - Next: Build a pipeline that ingests CSV/TXT files, runs a style analysis prompt, and saves a reusable system prompt.
  - Evidence: 09:18, 12:22
- Context-Aware Multi-File Prompt Assembler
  - Source: Dream Labs AI - The Brilliant AI Social Media System Alex Hormozi Is Using to Win
  - Why: Automates the assembly of Business Context, Style Data, and Task Prompts into a single LLM context window for consistent brand alignment.
  - Next: Develop a workspace manager in AIOS that automatically attaches 'brand context' and 'style guides' to creative tasks.
  - Evidence: 01:34, 09:33
- AI-Powered cURL Generator for Workflow Nodes
  - Source: Kia Ghasem / AI Automations - Give me 58 sec...I’ll IMPROVE your n8n skills by 176%
  - Why: Speeds up integration development by converting natural language API requests into structured cURL commands ready for workflow engines.
  - Next: Implement an LLM utility in AIOS that outputs clean cURL commands optimized for n8n's import format.
  - Evidence: 00:33, 00:47
- Automated API Schema Resolver
  - Source: Kia Ghasem / AI Automations - Give me 58 sec...I’ll IMPROVE your n8n skills by 176%
  - Why: Bypasses manual documentation reading by querying search-enabled LLMs to resolve API endpoints and payloads dynamically.
  - Next: Integrate a search-enabled LLM agent (like Perplexity API) to fetch real-time API schemas during agent execution.
  - Evidence: 00:33
- Autonomous Sandbox Escape Monitoring
  - Source: Nick Saraev - Claude Mythos Preview: Everything You Need to Know
  - Why: Advanced models can exploit environment weaknesses to escape sandboxes. Real-time monitoring of system calls and network requests is critical.
  - Next: Design a secure, isolated execution environment with strict syscall filtering and anomaly detection.
  - Evidence: 01:01, 09:31
- Automated Vulnerability Patching Pipeline
  - Source: Nick Saraev - Claude Mythos Preview: Everything You Need to Know
  - Why: Leverage model capabilities to find and automatically propose fixes for high-severity software vulnerabilities before deployment.
  - Next: Integrate static analysis tools with LLM-driven code repair agents in the CI/CD pipeline.
  - Evidence: 03:09, 14:25
- Pantheon Persona Manager
  - Source: Jack / Itssssss_Jack - Hermes Agent just got 10X Better (Agentic OS)
  - Why: Enables the AIOS to dynamically swap system prompts, models, and tool permissions based on the active task context.
  - Next: Develop a local YAML-based persona registry that maps tasks to specific model configurations.
  - Evidence: 21:15
- Zapier MCP Tool Bridge
  - Source: Jack / Itssssss_Jack - Hermes Agent just got 10X Better (Agentic OS)
  - Why: Exposes thousands of third-party app integrations to local agents using the Model Context Protocol.
  - Next: Integrate an MCP client into the AIOS core to handshake with the Zapier MCP server.
  - Evidence: 27:25
- Automated Lighthouse Self-Optimization Loop
  - Source: Jono Catliff - Claude Code Website Conversion Rate Optimization (20% Conversions, $1.2M Case Study)
  - Why: Enables the AI OS to automatically audit generated web pages using Lighthouse and iteratively refactor code to achieve optimal performance scores without human intervention.
  - Next: Develop a CLI tool or agent skill that runs Lighthouse, parses the JSON report, and feeds performance issues back to the LLM with refactoring instructions.
  - Evidence: 34:45, 35:50
- Dynamic Landing Page Generator Skill
  - Source: Jono Catliff - Claude Code Website Conversion Rate Optimization (20% Conversions, $1.2M Case Study)
  - Why: Allows on-demand generation of highly targeted, niche-specific landing pages using a single command, mapping services to locations dynamically.
  - Next: Build a custom generator script that takes service and city inputs, matches them to pre-defined templates, and outputs optimized static pages.
  - Evidence: 45:55, 48:40

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 9/9
- PASS all videos are non-Mark public creator selections - nOFordZCyzs:chase-ai, 3MP8D-mdheA:matt-pocock-total-typescript, MycU50Jl6Z8:aaron-bitwise, XRU-CjzYt_o:dan-martell, sn2d_eXeV9A:dream-labs-ai, qBEyaFhduYg:kia-ghasem-ai-automations, oCuttuCQmZg:nick-saraev, 7xuWZ-3lyQE:jack-itssssss, ru7fWKD4cyw:jono-catliff
- PASS public YouTube page evidence captured for every video - nOFordZCyzs:true, 3MP8D-mdheA:true, MycU50Jl6Z8:true, XRU-CjzYt_o:true, sn2d_eXeV9A:true, qBEyaFhduYg:true, oCuttuCQmZg:true, 7xuWZ-3lyQE:true, ru7fWKD4cyw:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true, gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3, gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2, gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - nOFordZCyzs:ready_for_scoper, 3MP8D-mdheA:ready_for_scoper, MycU50Jl6Z8:ready_for_scoper, XRU-CjzYt_o:ready_for_scoper, sn2d_eXeV9A:ready_for_scoper, qBEyaFhduYg:ready_for_scoper, oCuttuCQmZg:ready_for_scoper, 7xuWZ-3lyQE:ready_for_scoper, ru7fWKD4cyw:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - nOFordZCyzs:0, 3MP8D-mdheA:0, MycU50Jl6Z8:0, XRU-CjzYt_o:0, sn2d_eXeV9A:0, qBEyaFhduYg:0, oCuttuCQmZg:0, 7xuWZ-3lyQE:0, ru7fWKD4cyw:0
- PASS batch produced ranked build candidates - 18

