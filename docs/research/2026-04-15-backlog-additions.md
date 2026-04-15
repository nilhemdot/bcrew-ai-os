---
name: Backlog Additions from 2026-04-15 Audit Session
description: Structured backlog items to add to bcrew-ai-os PostgreSQL (backlog_items table) when the Mac Mini session picks up. Source: full system audit + Mark Kashef video research + old BCrew-Buddy backlog carry-forwards + Codex Convo 2 loose threads + ghost-agent incident.
type: research
status: ready-to-file
---

# Backlog Additions — 2026-04-15 Session

## Status

All items below are **NOT YET FILED** to `backlog_items`. The Windows audit session (BCrew-Buddy workspace) cannot reach the Mac Mini's PostgreSQL directly. A future Codex or Claude Code session on the Mac Mini should file these via `POST /api/backlog-items` or the `createBacklogItem` function in `lib/foundation-db.js`.

## Filing instructions for the next session

For each item below, call `createBacklogItem` with the fields provided. All items are `team: 'dev'` unless noted. Lane values: `research` (idea stage), `scoped` (ready to estimate), `ranked` (prioritized), `executing` (in progress).

---

## Category A: Ghost Agent Lesson (URGENT architectural rule)

### GHOST-001

- **id:** GHOST-001
- **title:** Visible kill switches, cost tracking, and dead-man switch for every running process
- **team:** dev
- **lane:** scoped
- **priority:** P0
- **rank:** 1
- **source:** Live incident 2026-04-15 during rebuild audit — old claudeclaw PM2 process ran 3.5+ days on VPS silently spawning agents after we assumed system was decommissioned
- **summary:** Every running process (OpenClaw gateway, scheduler, Codex automations, agents, cron workers) must be visible on the dashboard with: name, uptime, last activity, active agent count, cost-to-date, and a STOP button. Processes must run under one identity with one registry. Add dead-man switch that auto-pauses scheduled agents if dashboard hasn't received admin heartbeat in N days. Add live cost dashboard with anomaly alerts. Add one-command decommission workflow. Add pre-launch checklist for every new service: "Does this have a visible kill switch?"
- **whyItMatters:** Ghost agents burn money silently. Old BCrew-Buddy ran for days spawning agents with zero visibility. The only reason it was caught is because the rebuild audit session happened to check. In production, an agent could run for weeks burning credits with nobody noticing.
- **nextAction:** Inventory all running processes on Mac Mini (launchd, background workers, anything). Build unified process registry endpoint in server.js. Add process list + stop button to dashboard admin panel. Add cost_usd column to agent_activity table. Implement dead-man switch cron.
- **statusNote:** Full lesson doc at `C:\Users\steve\BCrew-Buddy\workspace\rebuild-lesson-ghost-agents.md` (Windows local) — copy into bcrew-ai-os repo for permanent reference.

---

## Category B: Mark Kashef Skool Ingestion (after Steve joined)

### SKOOL-001

- **id:** SKOOL-001
- **title:** Agent to ingest Mark Kashef Early AI-dopters Skool content
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 1
- **source:** Steve joined Early AI-dopters Skool ($64/mo) on 2026-04-15 after watching "I Replaced OpenClaw and Hermes With This Claude Code Setup"
- **summary:** Build an agent or workflow that ingests Mark Kashef's Skool content — courses, lesson transcripts, community posts, templates, one-click-clone documentation — and stores it as structured knowledge for future reference. Extract patterns, not code. Tag extracted patterns by applicability to bcrew-ai-os (model-agnostic / Claude-specific / not-applicable).
- **whyItMatters:** Mark's thinking on agent architecture, memory layers, hive mind, and War Room is useful reference material. Ingesting systematically beats ad-hoc browsing. Lets the AIOS actually use his content when relevant, e.g., during build planning or architecture review.
- **nextAction:** Skool login access + scraping approach (probably Playwright-driven since Skool has no API). Decide: ingest all at once, or pull-on-demand per course. Store as structured docs in PostgreSQL or file tree. Respect community terms of service — personal use only, do not redistribute.
- **statusNote:** Steve has access. Reference research at `docs/research/2026-04-15-mark-kashef-claudeclaw-review.md`.

### SKOOL-002

- **id:** SKOOL-002
- **title:** Extract architecture patterns from Build-Your-Own OpenClaw/ClaudeClaw course
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 2
- **source:** Mark Kashef's Early AI-dopters Skool course list
- **summary:** The specific course most relevant to bcrew-ai-os. Take the course, extract every architectural pattern, and cross-reference against bcrew-ai-os current design. Output: a list of patterns worth stealing and patterns NOT worth stealing, with rationale. Do NOT copy code. Do NOT fork his repo (no LICENSE). Extract concepts only.
- **whyItMatters:** The research doc lists 8 patterns at high level. The course likely has more detail on implementation tradeoffs, gotchas, memory decay math, hive mind schema design, and launchd service templates that aren't in the public README.
- **nextAction:** Steve takes the course. Notes get filed back to `docs/research/`. A later session converts notes into specific backlog items (MEMORY-*, AGENT-*, MEETING-* candidates below).
- **statusNote:** Depends on SKOOL-001 or manual walkthrough.

### SKOOL-003

- **id:** SKOOL-003
- **title:** Book 1:1 Claude Code coaching session with Mark Kashef for bcrew-ai-os architecture review
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 3
- **source:** Early AI-dopters Skool membership benefit
- **summary:** Book a 1:1 Claude Code coaching session. Bring specific question: "I'm building an AI OS for a 5-user real estate team on a Mac Mini M4 Pro with PostgreSQL + pgvector, OpenClaw as runtime, GPT-5.4 as primary brain, Foundation Trust Layer with source contracts and strategy docs. I'm NOT moving to Claude-only. What would you change about my architecture?"
- **whyItMatters:** Mark has the deepest hands-on experience with Agent SDK + Telegram + multi-agent orchestration. His review against a non-Claude-primary stack could surface blind spots.
- **nextAction:** Calendly link https://calendly.com/d/crfp-qz3-m4z. Book when bcrew-ai-os has enough shape to show (after Foundation Trust Layer reviewed end-to-end).
- **statusNote:** Queue for Q2 once FTL smoke tests pass.

### SKOOL-004

- **id:** SKOOL-004
- **title:** Download and process Mark Kashef Free Blueprint Kit (Gumroad)
- **team:** dev
- **lane:** scoped
- **priority:** P1
- **rank:** 1
- **source:** https://markkashef.gumroad.com/l/gnwsm
- **summary:** Free kit includes: mega prompt for Claude Code, 8 Power Pack prompts, assessment prompt for existing setups, 20-page visual architecture guide. Download all files. Run the assessment prompt against current bcrew-ai-os state. Store outputs in `docs/research/mark-kashef-blueprint-kit/`.
- **whyItMatters:** Free, non-licensed content that's designed to be used. Zero risk. The assessment prompt against our current state will produce actionable gap analysis.
- **nextAction:** Download today. Run assessment prompt in a Codex session. File findings as additional backlog items if patterns are worth stealing.
- **statusNote:** No cost. Do this first, before Skool course deep-dive.

---

## Category C: Memory System Patterns to Borrow

### MEMORY-006

- **id:** MEMORY-006
- **title:** Cross-agent hive mind activity feed
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 6
- **source:** Mark Kashef ClaudeClaw architecture (2026-04-14 video + README)
- **summary:** Unified PostgreSQL table `agent_activity_feed` storing every task completed by every agent. Every agent sees the last 24 hours of team activity as part of its context load. Makes agents aware of what other agents are doing without tight coupling. Queryable at global level or per-agent.
- **whyItMatters:** Without cross-agent awareness, the comms agent doesn't know what ops agent just did. With hive mind, every agent has team context. Mark reports his members "swear by" this feature.
- **nextAction:** Schema: id, agent_id, task_summary, started_at, completed_at, status, outcome_excerpt, artifacts_ref. Add to `lib/foundation-db.js` schema section. Expose via /api/hive-mind with time-range filter. Feed into agent context on every run.
- **statusNote:** Runtime-agnostic. Works on any agent framework. Not Claude-specific.

### MEMORY-007

- **id:** MEMORY-007
- **title:** Memory washing machine (LLM classifier for facts/preferences/context)
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 7
- **source:** Mark Kashef ClaudeClaw architecture
- **summary:** Background job using cheap LLM (Gemini Flash in Mark's stack; we can use Gemini Flash, GPT-5.4 mini, or Claude Haiku — whichever is cheapest per run) that reads conversation history every N minutes and categorizes each statement as `fact`, `preference`, or `context`. Writes back to memory table with category tag. Enables later retrieval by category.
- **whyItMatters:** Separates durable facts from conversational noise. Preferences inform agent personality. Context matters per-session. Without classification, memory is undifferentiated mush.
- **nextAction:** Spec the prompt. Spec the categorization schema. Pick model (probably Gemini Flash for cost). Runs every 30 min via cron. Writes to `memory_classification` column on `memories` table.
- **statusNote:** Model-agnostic. Swap the classifier LLM at will.

### MEMORY-008

- **id:** MEMORY-008
- **title:** Importance decay schedule with salience boost/penalty
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 8
- **source:** Mark Kashef ClaudeClaw architecture
- **summary:** Every memory row gets `importance` (0.0 to 1.0) and `salience` (tracks usefulness over time). Decay: 0.8–1.0 importance decays 1% daily (~460 day lifespan), 0.5–0.7 decays 2% daily (~230 days), pinned memories never decay. On retrieval: +0.1 salience if useful, −0.05 if irrelevant. Memories below threshold get archived.
- **whyItMatters:** Memory grows unbounded without decay. Manual pruning doesn't scale. Automated decay + salience self-tunes what stays relevant.
- **nextAction:** Add `importance`, `salience`, `is_pinned`, `last_accessed_at` columns to `memories` table. Write nightly decay cron. Add `boost_salience(memory_id, delta)` function. Add archived_memories table.
- **statusNote:** Trivial to add. High value once memory table has >1000 rows.

---

## Category D: Agent Team Architecture

### AGENT-001

- **id:** AGENT-001
- **title:** Agent team templates (comms, content, ops, research, strategic-advisor, project-manager)
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 1
- **source:** Mark Kashef ClaudeClaw agent team pattern + Steve's meeting/strategic advisor request
- **summary:** Create template configs for specialist agents. Each template includes: persona CLAUDE.md (or OpenClaw equivalent), assigned tools, default model, allowed skills, memory pool, channels. Ship six templates: comms (email, Slack, Telegram), content (social media, marketing pipeline), ops (onboarding, process enforcement, deal analyst), research (scouting, intelligence), strategic-advisor (business strategy, decision support), project-manager (task orchestration, follow-up, meeting prep).
- **whyItMatters:** Each specialist gets its own context window, its own tools, its own personality. No single agent has to hold the whole business in its head. Scales to more specialists over time. Solves the "one big agent is never quite right" problem.
- **nextAction:** Template format (YAML or JSON). Model selection per template (strategic-advisor = Opus or GPT-5.4 Pro reasoning, content = Sonnet or GPT-5.4 standard, etc.). Permission tier per agent (per Steve's Steve/Nick/Carson/Tanner/Georgia role model).
- **statusNote:** Steve's feedback: this is what was wanted in BCrew-Buddy but never cleanly delivered.

### AGENT-002

- **id:** AGENT-002
- **title:** Inter-agent delegation syntax (@agent: task)
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 2
- **source:** Mark Kashef ClaudeClaw architecture
- **summary:** Parser that recognizes `@agent-name: task description` in any message (Telegram, dashboard, Slack, email). Routes the task to the named agent. Logs the handoff to hive mind activity feed. Notifies requester when done via original channel.
- **whyItMatters:** Enables humans and agents to delegate cleanly without needing to know the internal orchestration. Natural UX: "Hey @ops: can you pull last week's onboarding reports?" works from anywhere.
- **nextAction:** Parser regex. Router function. Delegation state machine (pending → in_progress → completed / failed). Notification back to original channel.
- **statusNote:** Builds on AGENT-001.

---

## Category E: War Room / Meetings

### MEETING-001

- **id:** MEETING-001
- **title:** War Room voice meeting stack (Pipecat + daily.co + agent council)
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 1
- **source:** Mark Kashef War Room demo + Steve's longstanding meeting idea
- **summary:** Live voice conversation with a council of agents (main agent + specialists) in a Google-Meet-style room. Stack: Pipecat (open-source voice orchestration framework), daily.co (browser-based room), local Hono server, websocket connection, three routing rules (everyone/team keyword → broadcast, `@agent` prefix → explicit route, JSON pin → persistent route). Avatar option via Pika (expensive, experimental) or audio-only.
- **whyItMatters:** This is the meeting solve. Steve wants a strategic advisor and a project manager to participate in real business conversations. Pipecat is open-source and malleable, so routing rules can grow without framework lock-in.
- **nextAction:** Install Pipecat. Stand up daily.co room. Wire websocket. Port agent team (AGENT-001) as voice-capable participants. Test with three routing rules.
- **statusNote:** Depends on AGENT-001. Voice pipeline: Deepgram / Cartesia / Gemini Live for STT+TTS. Gemini Live is cheapest lean stack.

### MEETING-002

- **id:** MEETING-002
- **title:** Strategic Advisor agent persona
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 2
- **source:** Steve's direct request — wants an agent that can participate in strategic business conversations
- **summary:** Specialist agent with CLAUDE.md (or OpenClaw persona config) focused on business strategy, decision support, priority tradeoffs, risk surfacing. Reads: business-strategy.md, strategy/*.md, decisions table, open_questions table, source registry, Business Atoms (when those exist). Writes: proposes decisions, flags drift, surfaces strategic issues. Participates in War Room voice meetings.
- **whyItMatters:** Steve's been treating Claude sessions as a strategic advisor for months. Making it a first-class agent with persistent memory and meeting presence is the natural next step.
- **nextAction:** Draft CLAUDE.md persona. Wire reads to foundation tables. Wire writes to decisions/proposals. Test against real strategy questions.
- **statusNote:** Builds on AGENT-001 and MEETING-001.

### MEETING-003

- **id:** MEETING-003
- **title:** Project Manager agent persona
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 3
- **source:** Steve's direct request — wants an agent that drives task orchestration and meeting follow-through
- **summary:** Specialist agent focused on task orchestration, meeting prep, follow-up, deadline tracking, commitment accountability. Reads: backlog_items, scheduled_tasks, mission_tasks, meeting notes, commitments. Writes: kicks off tasks, reminds owners, reports on stalled work, escalates blockers. Participates in War Room.
- **whyItMatters:** The old BCrew-Buddy had a "commitment tracker" agent concept that never fully landed. Project Manager is the consolidation of that idea — one clear owner, clear scope, meeting-room presence.
- **nextAction:** Draft persona. Wire to backlog/scheduled_tasks/mission_tasks tables. Define escalation rules (when does PM ping Steve vs owner directly). Test against real open commitments.
- **statusNote:** Builds on AGENT-001 and MEETING-001.

---

## Category F: Mission Control + Scheduled Tasks

### MISSION-001

- **id:** MISSION-001
- **title:** Mission tasks table with Gemini auto-assignment
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 1
- **source:** Mark Kashef mission control pattern
- **summary:** `mission_tasks` table separate from `scheduled_tasks`. Missions are one-shot tasks with auto-assign logic: a cheap LLM classifies which specialist agent should handle the mission based on content, routes it, and the agent picks it up within 60 seconds. 10-minute timeout per mission. Dashboard UI to create missions + see status (queued / live / done / failed).
- **whyItMatters:** Humans shouldn't have to decide which agent to ask. The system figures it out. Lowers friction for team members to kick off work.
- **nextAction:** Schema for mission_tasks. Auto-assign prompt for Gemini Flash (or cheapest model). Agent polling logic (polls every 15s for unassigned missions matching its team). Dashboard UI for mission creation + status.
- **statusNote:** Builds on AGENT-001. Different from scheduled_tasks (cron). Complementary.

### MISSION-002

- **id:** MISSION-002
- **title:** Cron + agent scoping for scheduled tasks
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 2
- **source:** Mark Kashef scheduled tasks pattern
- **summary:** `scheduled_tasks` table with cron syntax column (standard 5-field cron), agent_id scope (which agent runs it), prompt field (what the agent does), last_run_at, next_run_at. FIFO queue collision prevention (only one task per agent at a time). 10-min timeout. Standard examples: `0 9 * * 1` = Mondays 9am, `0 */4 * * *` = every 4 hours.
- **whyItMatters:** Daily briefs, weekly reviews, monthly strategic priorities reviews, morning/midday/EOD briefs — all need cron scheduling scoped to the right agent.
- **nextAction:** Schema. Cron parser (use `cron-parser` npm). Scheduler loop (polls every 60s). FIFO queue per agent.
- **statusNote:** Runtime-agnostic. OpenClaw or direct SDK.

---

## Category G: Security + Infra

### SECURITY-001

- **id:** SECURITY-001
- **title:** Three-layer security: chat-ID allowlist + PIN + exfiltration guard
- **team:** dev
- **lane:** scoped
- **priority:** P0
- **rank:** 2
- **source:** Mark Kashef security pattern + ghost agent lesson
- **summary:** Layer 1: allowlist of chat IDs (Telegram, Slack, email) permitted to interact with any agent. Non-allowlisted messages get rejected silently or with a generic "not authorized" response. Layer 2: PIN required on first activation per session (prevents stolen phone / unlocked device scenario). Layer 3: exfiltration guard — LLM check on outbound responses flagging credentials, PII, deal-sensitive data before sending outside the trusted boundary.
- **whyItMatters:** Without layer 1, anyone who guesses the bot handle can talk to your business agent. Without layer 2, physical device compromise is agent compromise. Without layer 3, prompt-injection attacks can exfiltrate sensitive data.
- **nextAction:** Implement allowlist table (chat_id_allowlist). Implement PIN flow (pin_sessions table with expiry). Implement exfiltration guard as LLM call on responses over a threshold length or containing credential patterns.
- **statusNote:** Layer 1 is easy. Layer 3 is the novel work.

### INFRA-001

- **id:** INFRA-001
- **title:** launchd auto-start for every agent on Mac Mini reboot
- **team:** dev
- **lane:** scoped
- **priority:** P1
- **rank:** 4
- **source:** Mark Kashef launchd pattern
- **summary:** Every agent service gets a LaunchAgent plist file. Auto-starts on Mac Mini boot. Auto-restarts on crash. Logs to known path. Scripted installer: `bash scripts/install-launchd.sh` that generates one plist per agent and loads them all.
- **whyItMatters:** Mac Mini reboots (power loss, OS updates). Manual restart of five agents is tedious and will be forgotten. Auto-start eliminates the operational failure mode.
- **nextAction:** Plist template. Install script. Uninstall script. Log rotation. Test cold-boot scenario end-to-end.
- **statusNote:** Mark has templates in his repo we can reference (not copy).

### INFRA-002

- **id:** INFRA-002
- **title:** Cloudflare Tunnel for secure remote dashboard access
- **team:** dev
- **lane:** scoped
- **priority:** P2
- **rank:** 3
- **source:** Mark Kashef dashboard access pattern + avoid exposing Mac Mini ports directly
- **summary:** Cloudflare Tunnel (free tier) exposes the local Hono dashboard as a stable public URL without opening Mac Mini ports. Optional Cloudflare Access auth layer on top. Dashboard reachable from phone, laptop, anywhere.
- **whyItMatters:** Without this, dashboard is only reachable on LAN. With it, Steve can check agent status and cost from his phone at a coffee shop without a VPN.
- **nextAction:** `cloudflared` install on Mac Mini. Register tunnel. Update DNS. Optional: Cloudflare Access email-based auth.
- **statusNote:** Free tier sufficient. Known good pattern.

### VOICE-001

- **id:** VOICE-001
- **title:** Voice input and output (Groq Whisper in, Gemini Live or ElevenLabs out)
- **team:** dev
- **lane:** research
- **priority:** P2
- **rank:** 4
- **source:** Mark Kashef voice pattern
- **summary:** Speech-to-text on inbound (Telegram voice messages, dashboard mic): Groq Whisper API (free tier generous) or Deepgram. Text-to-speech on outbound (War Room, voice responses): Gemini Live (cheapest lean stack) or ElevenLabs (higher quality, more expensive). Route via Pipecat for War Room scenarios.
- **whyItMatters:** Voice in beats typing on phone. Voice out beats scrolling long text. Makes the "strategic advisor in your pocket" real.
- **nextAction:** Pick STT (Groq first — has free tier). Pick TTS (Gemini Live first — cheapest). Wire to Telegram voice message handler. Wire to dashboard mic button.
- **statusNote:** Model-agnostic. Swap providers at will.

---

## Category H: Architecture Doctrine

### ARCH-001

- **id:** ARCH-001
- **title:** Document "tools as foundation" doctrine: runtime-agnostic agent primitives
- **team:** dev
- **lane:** scoped
- **priority:** P1
- **rank:** 2
- **source:** Steve's recalibration after Mark Kashef video — "can't we use all the tools as the foundation for any agent we spin up"
- **summary:** Add a section to `docs/system-strategy.md` that codifies the architectural doctrine: tools, memory, foundation, and source contracts are the substrate. Any agent runtime (OpenClaw today, something else tomorrow, hybrid in between) can plug in. Model choice is per-agent, per-task. Steve's default is GPT-5.4 via ChatGPT Pro subscription for volume; Claude API for instruction-following quality; Gemini Flash for cheap classification; Ollama local for heartbeats; Claude Code via Agent SDK optional for specific dev-focused agents.
- **whyItMatters:** Without this doctrine in writing, every architectural decision is re-litigated. With it, new agents follow a consistent pattern: declare what tools you need, what memory scope you have, what model you default to. Runtime stays swappable.
- **nextAction:** Draft doctrine section for system-strategy.md. Include: tools-as-foundation principle, model selection guide per-agent type, runtime portability requirement, the "no vendor-lock-in" rule.
- **statusNote:** This doctrine is IMPLICIT in current bcrew-ai-os design. Making it EXPLICIT prevents drift.

### ARCH-002

- **id:** ARCH-002
- **title:** Layered architecture philosophy — foundation, runtime, agents, channels, voice
- **team:** dev
- **lane:** scoped
- **priority:** P1
- **rank:** 3
- **source:** Mark Kashef "layered architecture" argument, adapted to our runtime-agnostic stance
- **summary:** Document the layer stack: (1) Foundation = strategy docs + source contracts + PostgreSQL + decisions; (2) Runtime = OpenClaw or direct SDK or hybrid; (3) Agents = specialist personas with tools and memory scope; (4) Channels = Telegram, Slack, email, dashboard, War Room; (5) Voice = STT/TTS layers. Each layer is independently replaceable. Breaking changes in any one layer do not cascade to others.
- **whyItMatters:** If Anthropic changes policy, runtime layer absorbs it. If Telegram API changes, channel layer absorbs it. Foundation and agents survive. This is the "don't move houses every time a new framework ships" argument.
- **nextAction:** Diagram the layers. Document interfaces between layers. List current implementation per layer. Mark each layer's swap cost (low / medium / high).
- **statusNote:** Complements ARCH-001.

---

## Category I: Old BCrew-Buddy Backlog Carry-Forwards

### BOT-GOD-001

- **id:** BOT-GOD-001
- **title:** Bot God Mode — bots answer any question, trigger any action
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 10
- **source:** Old BCrew-Buddy BOT-001 (top priority, never built)
- **summary:** Every user's personal bot (Steve's Ace, Nick's Chief, Carson's assist, Tanner's assist, Georgia's assist) can answer any question about the business (subject to permission tier) and trigger any action (subject to approval flow). No canned menu. Natural language in, intelligent action or answer out.
- **whyItMatters:** This was the biggest unmet promise of BCrew-Buddy. Each leader had a bot but it was limited. God Mode means the bot is actually useful, not a gimmick.
- **nextAction:** Permission tier enforcement. Tool allowlist per tier. Action approval flow for write operations. Conversation state persistence per user. Agent team routing per query type.
- **statusNote:** Depends on AGENT-001, SECURITY-001. Builds on permission model from old system.

### RECRUIT-001

- **id:** RECRUIT-001
- **title:** Recruiting dashboard and pipeline view
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 11
- **source:** Old BCrew-Buddy REC-001 and REC-002
- **summary:** Unified recruiting dashboard showing: active prospects, stage in pipeline, next action, last contact, source, assigned recruiter. Aggregates from GHL (Business Assessment pipeline), FUB (recruiting-tagged contacts), calendar (recruiting calls), email. Post-call workflow: debrief input (voice or text), AI processes, writes meeting brief, updates prospect record, flags follow-up.
- **whyItMatters:** Steve's Q1 priority #2 is a predictable recruiting engine. Without a dashboard, recruiting pace is invisible and response to missed pace is ad-hoc.
- **nextAction:** GHL connector. FUB connector. Calendar connector. Unified view component. Debrief input flow (voice via VOICE-001).
- **statusNote:** Replaces old REC-001, REC-002, REC-003 (GHL migration) into one coherent build.

### AVATAR-001

- **id:** AVATAR-001
- **title:** Client and agent avatar research (10 RETAIN client avatars + 5 ATTRACT agent avatars)
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 12
- **source:** Old BCrew-Buddy MKT-130 and MKT-131
- **summary:** Agent-driven research to define 10 client avatars (RETAIN side — buyers and sellers Benson Crew serves) and 5 agent avatars (ATTRACT side — real estate agents Benson Crew recruits). Each avatar: demographics, psychographics, pain points, content preferences, platform preferences, triggering events, objections. Avatars feed content production, recruiting outreach, marketing pipeline.
- **whyItMatters:** Content without avatars is shotgun. Every downstream marketing and recruiting pipeline needs this input. Old system never shipped it.
- **nextAction:** Research agent build (likely just a scoped Claude Code session with browser + Owners Dashboard + FUB reads). Avatar template. Storage in foundation tables. Review + sign-off by Steve and Tanner.
- **statusNote:** Dependency for content pipeline, recruiting campaigns, marketing ecosystem.

### CONTENT-BACKLOG-001

- **id:** CONTENT-BACKLOG-001
- **title:** Port 41 content ideas (CB-001 through CB-041) to new content system
- **team:** marketing
- **lane:** research
- **priority:** P2
- **rank:** 1
- **source:** Old BCrew-Buddy backlog content items
- **summary:** 41 validated content ideas from old system (culture-first recruiting content, LinkedIn native documents, IG Reels, carousels, YouTube topics, founder thought leadership, property-specific content, client testimonials, coaching framework posts, etc.). Each has priority P1 in the old system, none produced. Port to new content pipeline when content agents exist.
- **whyItMatters:** Validated ideas. Not speculative. Just needs a pipeline to produce them.
- **nextAction:** Export from old system. Import to new system's content queue. Tag by avatar (depends on AVATAR-001). Schedule per cadence.
- **statusNote:** Low-leverage until AVATAR-001 ships. Don't start content production blind.

### DATA-HUMAN-001

- **id:** DATA-HUMAN-001
- **title:** Human actions blocking data connections (GA4, Meta API, FUB reconnect, GHL refresh)
- **team:** dev
- **lane:** scoped
- **priority:** P1
- **rank:** 13
- **source:** Old BCrew-Buddy MKT-101, MKT-107, MKT-135 + Codex Convo 2 KPI dashboard ask
- **summary:** Items that cannot be built until humans act. Tracked so they don't get forgotten. (1) Steve: enable GA4 Data API and grant service account Viewer on bensoncrew.ca and zahndteam.ca properties. (2) Tanner: create Meta developer app for Benson Crew business accounts. (3) Steve: follow up with KPI dashboard dev on codebase + Supabase access. (4) Steve: sign off on SRC-OWNERS-001 Admin tab source notes (In Review status).
- **whyItMatters:** These block downstream work. Tracking as backlog items (not buried in someone's head) surfaces them in weekly review.
- **nextAction:** Assign owners. Add to weekly leadership meeting agenda. Kill when completed.
- **statusNote:** Not technical work — human action tracking.

---

## Category J: Codex Convo 2 Loose Threads

### OWNERS-SIGNOFF-001

- **id:** OWNERS-SIGNOFF-001
- **title:** Steve final signoff on SRC-OWNERS-001 Admin tab source notes
- **team:** dev
- **lane:** scoped
- **priority:** P0
- **rank:** 14
- **source:** Codex Convo 2 — SRC-OWNERS-001 status is "In Review", not signed off
- **summary:** Admin tab validated column-by-column through Column CB (80 columns). Source notes written to `docs/source-notes/owners-dashboard.md`. Foundation source registry shows "In Review". Steve needs to do final review pass and move to "Signed Off" or flag corrections.
- **whyItMatters:** Downstream finance, attribution, deal-quality, and CRM reconciliation all depend on this source being signed off. Cannot build trust chain without it.
- **nextAction:** Steve reads `docs/source-notes/owners-dashboard.md` on dashboard. Confirms or flags corrections per column. Foundation UI updates status when approved.
- **statusNote:** Codex is waiting for this. Should be a 30-minute review.

### OWNERS-REMAINING-001

- **id:** OWNERS-REMAINING-001
- **title:** Validate remaining Owners Dashboard tabs (Split Cal, Agent Splits, Weekly Actuals, Cashflow Dash, Monthly Roll-ups)
- **team:** dev
- **lane:** research
- **priority:** P1
- **rank:** 15
- **source:** Codex Convo 2 — only Admin tab walked through in detail
- **summary:** Apply the same column-by-column validation approach to: (1) Split Cal tab — agent split tier calculations, BR running total driver, apprenticeship graduation logic; (2) Agent Splits tab — full roster per year for split calculator to reset correctly; (3) (Input) Weekly Actuals — internal finance truth, week-by-week revenue, expenses, bank balances, LOC, credit card, HST; (4) Cashflow Dash — management interpretation layer, partner commission backing-out logic, top-line/expense presentation for leadership; (5) Monthly Actuals (Roll Up) and annual roll-ups — verify partner commission normalization doesn't drift at scale.
- **whyItMatters:** Admin tab is upstream deal truth. Split Cal determines agent pay. Weekly Actuals is finance truth. Cashflow Dash is leadership view. Full source signoff requires all of these.
- **nextAction:** Pick next tab (probably Weekly Actuals since it's finance truth). Walk through. Write source notes. Update source registry status.
- **statusNote:** Follow-up from Codex Convo 2. Sequential. Can't do all at once.

---

## Filing Checklist (for the next Codex/Claude session on Mac Mini)

When the next session opens this doc on the Mac Mini side:

1. Read this entire file
2. For each item, call `createBacklogItem` with the fields
3. Verify items appear in Foundation > Backlog view
4. Commit a note to this file: `Filed YYYY-MM-DD by [session-id]`
5. Move this file to `docs/research/archived/` once fully filed to keep the active research folder clean

## Cross-references

- Original research: `docs/research/2026-04-15-mark-kashef-claudeclaw-review.md`
- Ghost agent lesson (Windows local, needs copy to this repo): `C:\Users\steve\BCrew-Buddy\workspace\rebuild-lesson-ghost-agents.md`
- Full audit summary: conversation history, session 2026-04-15
- Mark Kashef transcript: `C:\Users\steve\Downloads\Claude Code Prompt to Work on Project (21).md` (Steve's local)
- Source truths: `docs/source-notes/owners-dashboard.md`, `docs/source-registry.md`
- Strategy docs: `docs/business-strategy.md`, `docs/strategy/*.md`, `docs/system-strategy.md`
- Rebuild decisions: `docs/rebuild-decisions.md`

## Total items to file

- 1 Ghost Agent lesson (GHOST-001)
- 4 Skool ingestion (SKOOL-001 through SKOOL-004)
- 3 Memory patterns (MEMORY-006 through MEMORY-008)
- 2 Agent team architecture (AGENT-001, AGENT-002)
- 3 War Room / Meetings (MEETING-001 through MEETING-003)
- 2 Mission control + Scheduled tasks (MISSION-001, MISSION-002)
- 3 Security + Infra (SECURITY-001, INFRA-001, INFRA-002)
- 1 Voice (VOICE-001)
- 2 Architecture doctrine (ARCH-001, ARCH-002)
- 4 Old backlog carry-forwards (BOT-GOD-001, RECRUIT-001, AVATAR-001, CONTENT-BACKLOG-001, DATA-HUMAN-001)
- 2 Codex Convo 2 follow-ups (OWNERS-SIGNOFF-001, OWNERS-REMAINING-001)

**Total: 25 new backlog items ready to file.**

## Resume prompt for the next session

```
Open docs/research/2026-04-15-backlog-additions.md and file all 25
items into the bcrew-ai-os backlog_items table via createBacklogItem.
Preserve IDs as shown. Preserve lanes/priorities/ranks. After all are
filed, append a "Filed YYYY-MM-DD by [session-id]" line and move the
file to docs/research/archived/. Then continue with Foundation Trust
Layer smoke tests (B1 live verification on port 3000) and SRC-OWNERS-001
signoff flow.
```
