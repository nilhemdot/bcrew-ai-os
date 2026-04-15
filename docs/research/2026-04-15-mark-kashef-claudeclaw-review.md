# Mark Kashef's ClaudeClaw v2 — Reference Research (Not A Plan)

**Status:** Research only. Not adopted. Not a roadmap. Do not build from this.
**Date captured:** 2026-04-15
**Purpose:** Capture ideas, patterns, and tools worth learning from without committing to his architecture.

---

## Decision as of today

**We are NOT switching to Mark's setup.** The current bcrew-ai-os path stays: OpenClaw as the runtime, GPT-5.4 via ChatGPT Pro as the primary brain, Claude API only where instruction-following quality demands it, foundation trust layer in PostgreSQL.

Reasoning:
- Leaving OpenClaw for a Claude-only runtime would re-impose the exact subscription limitation we left OpenClaw for (wait, OpenClaw was left for different reasons — but switching to Claude-only caps us to Claude)
- GPT-5.4 via ChatGPT Pro offers materially more usage volume for the $300/mo we already pay
- Mark's system is ClaudeClaw — a Claude-only stack. That is narrower than our model-agnostic intent
- The foundation work (source contracts, Foundation Trust Layer, strategy docs, Business Atoms spec) is model-agnostic and compatible with OpenClaw OR any future runtime
- The right architectural position is: tools + memory + foundation as the substrate, and ANY agent runtime (OpenClaw today, something else tomorrow) can plug in

---

## What Mark built (from his video transcript 2026-04-14 + GitHub README)

Only kept for reference. His code is at https://github.com/earlyaidopters/claudeclaw (no LICENSE — not commercially forkable).

### The architectural premise he argues
- Claude Code's Agent SDK is a 200-line bridge
- Everything else (Telegram, memory, voice, dashboard, war room) is a removable layer on top
- Every "agent" is a real Claude Code subprocess spawned via Agent SDK, not a persona-in-a-prompt
- Layered philosophy: if a layer breaks or gets replaced, the foundation survives

### What's in his stack
- TypeScript + Node 20 + grammy (Telegram) + Hono (dashboard)
- SQLite + WAL + AES-256-GCM + vector embeddings
- Spawns official `claude` CLI as subprocess (ToS-safe per Boris Cherny, as of 2026-04)
- 5-layer memory: semantic vectors, salience recall, consolidation insights, hive mind activity, phrase-triggered recall
- Memory decay schedule (1% daily for 0.8–1.0 importance, 2% for 0.5–0.7, pinned never decay)
- Gemini Flash runs as "memory washing machine" — categorizes facts vs preferences vs context every 30 min
- Multi-agent: specialist agents (comms, content, ops, research) each as own Telegram bot, own CLAUDE.md, own Claude Code session
- Inter-agent delegation via `@agent: task` syntax
- Hive mind: unified SQLite table of tasks completed per agent, every agent sees 24h activity feed
- Scheduled tasks with cron + Gemini auto-assigns missions to best agent
- War Room: Pipecat (open-source voice orchestration) + daily.co (Google-Meet-style rooms) + local Hono server + websocket — avatars via Pika (expensive) as experimental option
- Security: chat-ID allowlist + PIN + exfiltration guard + Cloudflare Tunnel for remote dashboard access
- Auto-launch per agent via macOS launchd on Mac Mini

### His offers
- **Free Blueprint Kit:** https://markkashef.gumroad.com/l/gnwsm — mega prompt + 8 Power Pack prompts + assessment prompt + 20-page visual architecture guide
- **Skool "Early AI-dopters":** https://www.skool.com/earlyaidopters/about — $64/mo now, $97/mo at 1K members (they're at 1K). Includes one-click clone, 1:1 Claude Code coaching, AI Expert Network, $4M+ in AI software discounts
- **Consultation:** https://calendly.com/d/crfp-qz3-m4z

---

## Ideas worth stealing into bcrew-ai-os (model-agnostic versions)

These are patterns, not his code. Re-implement against whatever runtime we're on (OpenClaw today).

### 1. Hive Mind pattern
- Unified table of every task completed by every agent
- Every agent sees the last 24h of team activity in its context
- Makes agents aware of each other without tight coupling
- **Table exists in principle in our PostgreSQL** — could add `agent_activity_log` with 24h window query. Not Claude-specific.

### 2. Memory washing machine pattern
- A cheap background model (Gemini Flash in Mark's stack) reads conversations and classifies each statement as fact / preference / context
- Decides what deserves to be persistent, pinned, or throwaway
- **Model-agnostic.** We can use Gemini Flash, GPT-5.4 mini, or Claude Haiku — whichever is cheapest per run.

### 3. Importance decay schedule
- 1% daily decay for high-importance memories (~460 day lifespan)
- 2% daily for medium (~230 days)
- Pinned memories never decay
- Salience +0.1 on useful recall, −0.05 on irrelevant recall
- **Trivial to add to any memory table.** Runs as a nightly cron.

### 4. Layered philosophy
- Foundation (business brain, source contracts, strategy docs) is model-agnostic
- Runtime (OpenClaw, Claude Code via Agent SDK, anything else) is replaceable
- Memory stores are swappable (SQLite, Postgres, Pinecone, Supabase)
- Voice layer is swappable (Gemini Live, Deepgram, Pipecat + Cartesia)
- **This is already our stated doctrine.** Mark just validates it's the right one.

### 5. War Room pattern for meetings
- Pipecat (open-source) orchestrates voice envelopes
- daily.co provides the room
- Three routing rules decide which agent handles what
- Multiple agents can participate in the same voice conversation
- **This is the meeting/strategic-advisor/project-manager solve.** Buildable on top of OpenClaw channel framework OR on a thin SDK bridge.

### 6. Chat-ID allowlist + PIN security pattern
- First line of defense: only whitelisted chat IDs can message
- Second line: PIN required to activate
- Third: exfiltration guard checks messages before responses leave the system
- **Already partially in our permission-tier design.** Formalize the three layers.

### 7. launchd auto-start per agent on Mac Mini reboot
- Each agent gets its own LaunchAgent
- Auto-restart on crash
- Spins up on machine boot with zero manual intervention
- **Directly applicable to our Mac Mini.** Template files are in his repo.

### 8. Cron + Gemini auto-assign pattern for missions
- Create a task via dashboard or Telegram
- Cheap model classifies which specialist agent should handle it
- Agent picks it up within 60 seconds
- **Model-agnostic task-routing primitive.** Add to our job scheduler.

---

## Ideas NOT worth stealing

### Claude Code as the foundation
- His entire argument rests on Claude Code being the bedrock
- Binds you to the Claude ecosystem — Anthropic policy changes hit you directly
- Locks model choice — Claude only
- GPT-5.4 via ChatGPT Pro gives us more usage headroom for the same $300/mo
- We want model-agnostic from day one: GPT-5.4 primary, Gemini Flash for cheap tasks, Ollama local for heartbeats, Claude API when instruction-following quality justifies the cost

### SQLite as the primary memory store
- Works for single-user personal productivity
- Does not work for a 5-user real estate team with 1500+ deals, FUB, GHL, Owners Dashboard, Weekly Actuals, Freedom Sheet
- We're on PostgreSQL + pgvector for business memory. Keep it.

### His GitHub repo
- No LICENSE file → "all rights reserved" by default
- Cannot legally fork/modify for commercial use without Mark's explicit permission
- Use it as reference only

### Skool subscription as a hard requirement
- The Free Blueprint Kit gives you the architectural thinking
- Skool has value (1:1 Claude Code coaching, AI Expert Network, $4M discounts, one-click clone) but is optional
- $64/mo ($97 at the price jump) is a business decision, not a technical requirement

---

## What to actually do

1. **Download the Free Blueprint Kit** (https://markkashef.gumroad.com/l/gnwsm) and mine the architecture guide for patterns. Free, no lock-in.
2. **Do NOT fork his GitHub repo.** License risk.
3. **Keep building bcrew-ai-os on OpenClaw.** Foundation Trust Layer work stands.
4. **Layer the 8 stealable patterns above into bcrew-ai-os over time** as model-agnostic primitives.
5. **Revisit the architectural question quarterly.** If OpenClaw hits a wall, we have this research ready. If it doesn't, we keep the usage ceiling we get with ChatGPT Pro.
6. **Skool is optional.** If we want the coaching and discounts, join. If we want the blueprints only, Gumroad free kit is enough.

---

## Why I (Claude) was wrong to push Path B hard

I was giving Steve an architectural pivot ("Path B: clean-room rebuild on Mark's pattern") when what he asked for was research. I was treating Mark's system as a ceiling when it's just one proof point. The right framing is:

- bcrew-ai-os chose OpenClaw + GPT-5.4 + model-agnostic runtime for reasons that are still valid
- Mark chose Claude Code because his system is single-user productivity
- Different problem, different answer
- Stealing patterns is smart. Replacing the foundation is not.

Steve pushed back correctly. This doc reflects the recalibration.

---

## Source artifacts

- Video: https://www.youtube.com/watch?v=rVzGu5OYYS0
- Full transcript: `C:\Users\steve\Downloads\Claude Code Prompt to Work on Project (21).md` (Steve's local)
- GitHub: https://github.com/earlyaidopters/claudeclaw
- Skool: https://www.skool.com/earlyaidopters/about
- Free Blueprint Kit: https://markkashef.gumroad.com/l/gnwsm
- Consultation: https://calendly.com/d/crfp-qz3-m4z
- LinkedIn post: https://www.linkedin.com/posts/mkashef_ive-tried-to-make-openclaw-or-a-derivative-activity-7432161999347691520-g81d
- Mark's Prompt Advisers: https://www.promptadvisers.com/
- Earlier working brief: `C:\Users\steve\BCrew-Buddy\workspace\mark-kashef-claudeclaw-research.md`
