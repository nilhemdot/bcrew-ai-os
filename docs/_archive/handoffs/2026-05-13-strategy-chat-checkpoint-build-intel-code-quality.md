# Strategy Chat Checkpoint - Build Intel, Agents vs Code, Code Quality - 2026-05-13

## Purpose

Preserve the strategic decisions from the long 2026-05-13 main-session chat so future sprint chats do not rely on chat memory alone.

## Decisions To Preserve

1. Build Intel sources are dev/foundation inputs, not marketing content inputs.
   - YouTube builders, Skool communities, myICOR, GStack, Codex/Claude/OpenClaw communities, and related GitHub repos should teach AIOS how to build better.
   - They should feed implementation observations, backlog enrichment, and proposal-only research inbox rows.
   - Marketing content production is a separate later workflow.

2. No autonomous dev.
   - The correct pattern is: system proposes, Steve plus Codex agree, Codex builds with visible sprint process.
   - No agent auto-mutates backlog, sprints, or code.
   - Worktree conflicts and process drift make unsupervised auto-dev the wrong shape for Foundation.

3. Default to code, not agents.
   - The old system's critical flaw was making too many deterministic tasks into LLM agents.
   - Use code for queries, routing rules, scheduling, inserts, state transitions, verification, and reports.
   - Use an agent/LLM only for genuine language understanding, synthesis, judgment, scoring, or generation.
   - When proposing a new agent, ask: "Could this be a function?" If yes, build a function.

4. Foundation is not almost done.
   - There are still many scoped/research/Foundation cards.
   - Do not pull hub, marketing production, customer-facing agents, or department director work forward just because the substrate is improving.
   - Foundation work includes data source truth, process gates, code quality, verifier quality, frontend speed, backlog compression, and proposal-only advisory loops.

5. GStack is useful as Build Intel, not as a thing to copy blindly.
   - Good lessons: role-based skills, local brain/context, browser QA, review/ship gates, specialist workflows, community-driven patterns.
   - Do not install or clone it wholesale.
   - Extract patterns through Research Inbox and backlog proposals.

6. Code tightness and system tightness are Foundation work.
   - Steve is rightly concerned that hardcoded live truth, slow Foundation pages, and huge monolithic files can recreate old-system drift.
   - The next sprint should audit and prove code quality loops before more feature work.

## Current Handoffs Created

- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-13-code-quality-nightly-audit-sprint-handoff.md`
  - Canonical next sprint handoff.
  - Defines the Foundation Code Quality + Nightly Audit Sprint.
  - Covers hardcoded live truth, API performance, frontend performance, monolith risk, verifier assumptions, sprint-state mutation, and nightly audit reporting.

## Recommended Next Sprint

Run a fresh chat with:

- `foundation-code-quality-nightly-audit-2026-05-13`
- read-only/report-first audit behavior
- deterministic code detectors first
- optional LLM summarization only after detection
- no feature work
- no auto-fixes
- no autonomous dev

If using subagents, use only bounded read-only explorer lanes. The main session owns doctrine, DB sprint state, implementation, proof, and closeout.

## What Not To Lose

- The Build Intel pipeline is still important, but should wait unless Steve explicitly overrides the code-quality audit.
- The eventual Base44/Superagent-style front door is a useful product/UX signal, not the next build.
- If the code-quality audit finds severe issues, the following sprint should be targeted hardening.
- If findings are manageable, return to Build Intel Extraction Implementation after closeout.
