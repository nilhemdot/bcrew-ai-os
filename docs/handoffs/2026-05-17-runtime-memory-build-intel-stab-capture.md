# Runtime / Memory Build Intel Stab Capture

Date: 2026-05-17
Status: proposal-only capture

## Why This Exists

Steve surfaced several new Build Intel/runtime signals while Foundation cleanup was running:

- Chase AI: avoiding Claude Code/Codex/runtime lock-in after Anthropic's Claude Agent SDK changes.
- EverydayAI School / OpenHuman: context-first agent memory, broad connector ingestion, Obsidian-style knowledge trees, voice, model routing, and meeting participation.
- Mark Kashef: self-improving agentic OS patterns in Claude Code, including Claude Code `/goal`.
- Foundation memory concern: AIOS needs better compiled memory/knowledge so any agent can work from source-backed context instead of asking Steve questions Foundation already answered.

The useful part is not "install every shiny runtime." The useful part is to treat these as Build Intel inputs for the Foundation-owned agent/runtime/memory layer.

## Captured Backlog Cards

Created as proposal-only live backlog cards:

- `BUILD-INTEL-CHASE-AI-RUNTIME-PORTABILITY-PACKET-001`
- `AIOS-RUNTIME-PORTABILITY-GATE-001`
- `BUILD-INTEL-WATCHLIST-EVERYDAYAI-SCHOOL-001`
- `BUILD-INTEL-OPENHUMAN-RUNTIME-EVAL-001`
- `AIOS-CONTEXT-FIRST-AGENT-PREFLIGHT-001`
- `BUILD-INTEL-MARK-KASHEF-GOAL-PACKET-001`
- `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`

Already-existing related cards confirmed live:

- `SYSTEM-013`
- `LLM-ROUTER-001`
- `MODEL-ROUTING-001`
- `HARLAN-TERMINAL-RUNTIME-001`
- `VOICE-RUNTIME-WIRING-001`
- `FAL-IMAGE-ITERATION-TOOL-001`
- `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`
- `KNOWLEDGE-BASE-QUALITY-GATE-001`
- `BUILD-INTEL-WATCHLIST-DREAM-LABS-AI-001`
- `EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001`

## Doctrine Locked

Foundation-up remains the rule:

- Foundation owns source contracts, memory/knowledge compilation, permission posture, model/runtime routing, cost policy, proof, logs, and capability registry.
- Harlan, Codex, Claude Code, OpenHuman, OpenClaw, Higgsfield, and any future runtime are worker/adaptor layers.
- No runtime gets broad OAuth, repo writes, provider spend, or meeting access until Foundation has an approved connector/capability contract and proof.
- Build Intel sources can suggest improvements, but proposal-only output must flow through Research Inbox/backlog before build.

## OpenHuman Read

OpenHuman looks relevant because it packages several patterns Steve wants:

- context-first agent setup
- local memory database
- Obsidian/Markdown-style knowledge tree
- voice/chat surface
- model routing
- meeting/calendar/email/file context

It should be evaluated as a worker/runtime and memory-pattern source, not treated as a replacement for AIOS truth. The risk is broad connector access without AIOS source contracts and permission boundaries.

## Claude Code `/goal` Read

Claude Code `/goal` is relevant to Steve's "do not stop until the sprint is done" frustration. It is a measurable objective loop that can keep Claude Code working across turns until the goal is satisfied or explicitly stopped.

AIOS should evaluate whether a Foundation-owned goal runner or runner contract is needed:

- explicit goal statement
- measurable done condition
- stop/pause conditions
- allowed files/capabilities
- proof commands
- max spend/time
- handoff/closeout requirements

This belongs under Foundation runtime discipline, not ad hoc overnight prompts.

## Next Build Recommendation

Do not build these cards before the current Foundation cleanup queue is stable.

Recommended order after current root/source work:

1. `SOURCE-CONTRACT-VALIDATION-LAYER` or current equivalent.
2. `EXTRACTION-RUNTIME-READINESS` / Build Intel extraction readiness.
3. `FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001`.
4. `AIOS-RUNTIME-PORTABILITY-GATE-001`.
5. `AIOS-GOAL-DRIVEN-RUNNER-EVAL-001`.

## Not Approved

- No OpenHuman install.
- No broad OAuth.
- No meeting bot.
- No voice/Fal/Harlan feature build from this capture.
- No replacement of AIOS Foundation truth with an external runtime.
- No hub UI work.
