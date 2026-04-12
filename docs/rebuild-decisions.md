---
name: Rebuild Session Decisions (2026-04-11)
description: All architecture and strategy decisions made during the BCrew AI OS v1.0 rebuild session. Reference before building.
type: project
---

## Platform Decisions
- **OpenClaw** is the production runtime (model-agnostic, 30+ channels, MIT licensed)
- **Mac Mini M4 Pro** (24GB, $2,000 CAD) is the always-on hardware. Purchased, set up, remote access working.
- **GPT-5.4** via ChatGPT Pro subscription ($300/month) is the primary agent brain
- **Gemini Flash** (free via Google Workspace) for cheap tasks
- **Ollama local** for heartbeats/simple tasks (free)
- **Claude API** ($5/$25 per M tokens) only when instruction-following quality matters
- **Claude Code** (1 Max plan, $300/month) for development. Drop other 2 Max plans.
- **Codex CLI** (included in ChatGPT Pro) as alternative/complementary dev tool
- **Anthropic banned** using Max plan credits in OpenClaw (April 4, 2026). Cannot use subscription for agents.
- **OpenAI allows** using ChatGPT Pro subscription in OpenClaw. One command to set up.

## Architecture Decisions
- **Business strategy and system strategy MUST be separate docs.** Don't blend them.
- **Strategy docs are files in git** — human-readable, printable, versioned. Not live database queries.
- **Database stores decisions, events, proposals** — the change log and memory layer under the docs.
- **System proposes doc updates from database** — not auto-generated, curated artifacts with approval.
- **Not everything needs an agent.** Code for math/data pulling, agents only where LLM reasoning is needed.
- **Brain is swappable.** Any agent can use any LLM. No model lock-in.
- **One machine, one database, one runtime.** No VPS. No split-brain.

## Strategy Doc Structure (modular)
- `docs/business-strategy.md` — canonical one-page summary
- `docs/strategy/vision-and-north-star.md` — $2B team, 10K downline
- `docs/strategy/agent-engine.md` — ATTRACT/GROW/RETAIN math
- `docs/strategy/quarterly-priorities.md` — current quarter only
- `docs/strategy/department-mandates.md` — who owns what
- `docs/strategy/marketmasters.md` — trust layer brand
- `docs/system-strategy.md` — separate from business, how the AI OS behaves
- "Being everywhere" belongs under marketing mandate, not a foundation object
- Canonical doc says "real estate team" consistently
- Strategic issues in separate file tied to the quarter

## Memory System Decisions
- **Four layers:** Working (context), Operational (PostgreSQL), Episodic (events table), Semantic (pgvector later)
- **PostgreSQL + pgvector** as the single database (runs free on Mac Mini)
- **Graphiti deferred** — too complex for day 1. Temporal tracking done via valid_from/valid_until/superseded_by columns in PostgreSQL
- **Strategy docs + database work together:** docs are canonical truth, database tracks changes/decisions/proposals
- **Same database for agent memory AND strategy memory** — different tables, same PostgreSQL
- **Decision Codifier flow:** detect → classify → record in DB → propose doc update → Steve confirms → doc updated + change recorded
- **Shared memory:** any agent can read shared memory (people, teams, priorities). Each agent also has its own memory table.

## Naming
- **Harlan** = Steve's personal assistant (Telegram bot @harlan_bcrew_bot)
- **Crewbert** = system orchestrator (email: ai@bensoncrew.ca or crewbert@bensoncrew.ca — TBD)
- **BCrew AI OS** = the system name, repo: bcrew-ai-os

## What's Working (confirmed 2026-04-11)
- OpenClaw gateway running as LaunchAgent (survives reboot)
- GPT-5.4 connected via ChatGPT Pro subscription
- Telegram bot @harlan_bcrew_bot responding
- WhatsApp tested and working (disconnected for now, needs own number)
- GitHub repo bcrew-ai-os created and cloned
- Codex CLI installed and authenticated on Mac Mini
- Chrome Remote Desktop access from Steve's laptop

## What's Not Done Yet
- Dashboard (Codex building it)
- Strategy doc refactor into modular structure (Codex doing this)
- PostgreSQL installation on Mac Mini
- Database schema implementation
- Decision capture process
- Data connectors (Freedom Sheet, ClickUp, Gmail, Calendar)
- Memory system implementation
- Agent creation (no agents exist yet beyond Harlan's blank default)
- Cloudflare Tunnel for public dashboard URL
- LaunchAgent for dashboard (only gateway has one)

## Build Order (agreed)
1. Visual source-of-truth dashboard
2. Strategy docs as first live source (modular structure)
3. Source registry for business data inputs
4. Decision/event schema (PostgreSQL)
5. Decision capture and codification flow
6. Strategic intelligence layer
7. Marketing pipeline on top

## Cost Summary
- Before: $900 (3x Claude Max) + $300 (ChatGPT Pro) + $40 (VPS) = ~$1,240/month
- After: $300 (1x Claude Max) + $300 (ChatGPT Pro) + ~$5 (embeddings) = ~$605/month
- Savings: ~$635/month
