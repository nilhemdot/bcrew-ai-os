# Agent Doctrine Decisions — Captured for Review (2026-04-15 / 2026-04-17)

**Status:** Research / doctrine reasoning. **Key principles ALREADY integrated into `docs/system-strategy.md`** (lines 80, 100-104) as of 2026-04-16. This doc supplements with fuller reasoning + rejected alternatives + open questions.
**Context:** Decisions made during architecture conversations 2026-04-15 through 2026-04-17 with Claude Opus 4.7.
**Purpose:** Document the reasoning behind the doctrine lines in system-strategy.md so future agents understand WHY, not just WHAT. Surface open questions that aren't resolved.

---

## Decision 1: Agents live OUTSIDE system folders

**Decision:** Agent identity, memory, and tool configuration live at the OS level (`~/.agents/<name>/`), not inside any project repository.

**Context:** In the old BCrew-Buddy system, the CLAUDE.md file at the repo root WAS the agent identity. Opening Claude Code in the folder meant "talking to Crewbert." This created confusion: the line between "editing code in the system" and "roleplaying as the system's bot" was blurred.

**Why:**
- A repo should describe the SYSTEM, not a persona.
- Opening Claude Code in the repo should give you a coding assistant working ON the system, not a business agent running it.
- Agents with OS-level identity can roam across multiple projects Steve builds. Personal agents especially.
- Identity survives repo wipes. Swap the repo, agent still exists.

**How to apply:**
- `bcrew-ai-os-review/CLAUDE.md` becomes pure system documentation. No persona.
- Agent identities/memory move to `~/.agents/<name>/` on the Mac Mini.
- Each agent registered in PostgreSQL with a pointer to its OS-level home.

**Status:** Decided 2026-04-15. **Principle captured** in `system-strategy.md` line 100-102 ("project repos as home of system docs and code, not long-term identity home of agents; personal agents may span multiple systems; system-dedicated agents may specialize in one system deeply without trapping identity/memory/permissions inside that repo").

---

## Decision 2: Three-tier agent taxonomy

**Decision:** Agents divide into three distinct tiers, each with different placement, scope, and capability:

| Tier | Lives at | Scope | Examples |
|---|---|---|---|
| **Personal agents** | `~/.agents/<name>/` (OS-level) | Every system the human owns. Loyal to the human, not the project. | Harlan (Steve's EA), future Ace |
| **System-dedicated agents** | PostgreSQL rows with prompt + tool allowlist + memory scope + model routing | One specific system only. Spawned by that system's scheduler. | Crewbert (orchestrator), Strategic Advisor, Project Manager, scouts, department leads |
| **Per-repo coding agents** | Inside the repo at `.claude/` (or `.codex/`) | That repo only. Terminal-native. Spawned when you message `@<repo>-coder_bot` on Telegram. | `bcrew-ai-os-review/.claude/` — spawns Claude Code subprocess to edit this codebase |

**Why:**
- Matches how humans actually work: one personal assistant across everything, specialists per domain, tools per workspace.
- Coding agents get TERMINAL POWER (bash, git, npm, file system) which skill-scoped agents cannot have.
- Personal agents are portable: rebuild the system, personal agents still have your memory.
- System agents are database-driven: easy to create, modify, retire. No repo gymnastics.

**Why terminal-native for coding agents matters:**
SKILL.md agents can only use tools the orchestrator exposes. Terminal-native agents can install packages, explore unfamiliar code, debug failures, use shell pipelines, adopt tools on the fly. This is an order-of-magnitude capability difference. Mark Kashef's demo proved the pattern works within Anthropic ToS (Agent SDK subprocess).

**How to apply:**
- Add to `system-strategy.md` as a distinct section.
- Each new agent gets classified into one tier at creation.
- Personal agents never live in system repos.
- Coding agents per repo are a planned future pattern; not built yet.

**Status:** Decided 2026-04-16. Refined 2026-04-17. **Principle captured** in `system-strategy.md` line 80 ("Coding assistants like Codex and Claude Code are implementation tools inside the system. They are not business agents in the operating model.") — that's the coding-agent distinction. Personal/system-dedicated distinction captured at lines 100-102. Coding-agent-per-repo subprocess pattern NOT yet in system-strategy.md; still a candidate future pattern.

---

## Decision 3: Mac Mini deployment — one macOS user per agent

**Decision:** On the Mac Mini, each agent that needs browser or GUI capability gets its own macOS user account. API-only agents (Telegram bots, cron workers) run as headless daemons under one shared service account.

**Configuration:**
- Browser-capable agents: `/Users/harlan/`, `/Users/nick-assist/`, `/Users/crewbert/`, etc.
- Each has own Chrome profile, own Keychain, own OAuth tokens, own launchd jobs
- Fast User Switching keeps all users logged in concurrently
- Mac Mini has dummy HDMI plug (~$10) so Chrome can render even when no physical monitor is connected
- Steve RDPs in as `steve` — sees only his session. Agents are invisible unless he attaches via Screen Sharing to debug.
- API-only agents: single background user, systemd-style daemons, no user session needed

**Why:**
- Credential isolation: Harlan's Google OAuth cannot touch Nick-assist's Google OAuth.
- Chrome profile isolation: each agent has its own browsing state, cookies, extensions.
- Headful Chrome: real auth flows work. Headless breaks on modern SSO, captcha, SPA state.
- Scale: M4 Pro 64GB comfortably runs 15-20 browser agents + unlimited API agents.
- No visual pollution: Steve's RDP session shows only Steve's stuff.

**Scale plan:**
- Per Mac Mini: ~10-15 browser agents + unlimited API agents.
- 20 real estate agents each with their own AI: 2 Mac Minis.
- Cluster by adding machines, not by moving to cloud.

**Status:** Decided 2026-04-16. **Principle captured** in `system-strategy.md` line 103 ("Browser-capable agents should run with isolated user and session boundaries when credentials or trust boundaries matter."). Specific Mac Mini implementation details (dummy HDMI, Fast User Switching, per-user Chrome profiles) are deployment-level, not system-strategy level.

---

## Decision 4: Ghost-agent rule (visibility, kill, dead-man)

**Decision:** Every running process in the system must have: visible presence on the dashboard, cost tracking, a STOP button, and a dead-man switch that auto-pauses it if no admin heartbeat is received in N days.

**Context:** On 2026-04-15, during rebuild audit, an old claudeclaw PM2 process was discovered running on the VPS for 3.5+ days silently spawning agents after the system was believed decommissioned. Only caught because the audit happened to check.

**Why:**
- Ghost agents burn money silently.
- Without visibility, nobody notices failure or runaway cost.
- Dead-man switch prevents forgotten-system-running scenarios.

**How to apply:**
- Dashboard admin panel lists every running process with: name, uptime, last activity, active agent count, cost-to-date, STOP button.
- Every agent execution logged to `agent_activity` table with cost_usd.
- Live cost aggregation with anomaly alerts (budget, rate-of-spend).
- Nightly dead-man cron auto-pauses scheduled agents if `admin_heartbeat` table hasn't been touched in X days.
- One-command decommission workflow for taking an agent offline cleanly.
- Pre-launch checklist for every new service: "Does this have a visible kill switch?"

**Status:** **Doctrine line captured** in `system-strategy.md` line 104 ("Every long-running runtime, scheduler, or agent service needs visible supervision, a stop path, and a clean decommission path."). Implementation work still in backlog as GHOST-001.

**Backlog item:** `GHOST-001` in `docs/research/2026-04-15-backlog-additions.md`. Should be split: (a) ~~doctrine line in system-strategy~~ DONE, (b) dashboard process registry, (c) dead-man switch cron, (d) cost dashboard, (e) one-command decommission.

---

## Decision 5: Stance on Mark Kashef's ClaudeClaw v2

**Decision:** NOT adopting Mark Kashef's architecture. Stealing 8 patterns as model-agnostic primitives.

**Context:** Investigation on 2026-04-15 of Mark Kashef's system after watching his YouTube video "I Replaced OpenClaw and Hermes With This Claude Code Setup."

**Why not adopt:**
- His system is Claude-only. Steve explicitly rejected returning to a Claude-locked runtime.
- GPT-5.4 via ChatGPT Pro gives more usage headroom for $300/month than Claude-only.
- His GitHub repo has no LICENSE file — not commercially forkable.
- His system is single-user personal productivity. bcrew-ai-os serves a 5-user team scaling to multi-tenant SaaS. Different scope.

**Patterns worth borrowing (already filed in 2026-04-15 backlog additions):**
- `MEMORY-006` Hive mind activity feed
- `MEMORY-007` Memory washing machine (LLM classifier)
- `MEMORY-008` Importance decay + salience
- `AGENT-001` Agent team templates
- `AGENT-002` Inter-agent delegation (@agent: task)
- `MEETING-001..003` War Room + Strategic Advisor + Project Manager
- `MISSION-001..002` Cron + auto-assigned missions
- `SECURITY-001` Three-layer security (allowlist + PIN + exfiltration guard)
- `INFRA-001..002` launchd auto-start + Cloudflare Tunnel
- `VOICE-001` Voice in/out

**What Mark's work confirms:**
- Agent SDK subprocess pattern is ToS-safe (Anthropic confirmation via Boris Cherny, 2026-04)
- Terminal-native agents are much more powerful than skill-scoped agents
- Layered architecture (foundation / runtime / agents / channels / voice) is the right mental model

**Status:** Research doc at `docs/research/2026-04-15-mark-kashef-claudeclaw-review.md`. Decision locked. Steve joined Skool ($64/mo) for ongoing learning.

---

## Decisions NOT made — open questions for review

These came up but were not resolved:

1. **When agent layer begins (Phase 4), is OpenClaw still the runtime?** The rebuild master plan says yes. No reason to revisit until agent-building actually starts. Flagged for later re-confirmation.

2. **Coding-agent-per-repo pattern — build first on bcrew-ai-os-review itself?** Would let Steve message `@bcrew-ai-os-coder_bot` on Telegram and have Claude Code subprocess build features. Not yet scoped as a backlog item. Candidate for Phase 3 or early Phase 4.

3. **Multi-tenant path — when to add `tenant_id` columns?** If the long-term vision includes selling, adding tenant_id early (even if defaulted to 'bcrew') is cheap. Adding later is expensive. Currently not in plan.

4. **When do data connectors get wired?** Listed as foundation work (not agents), but not currently scheduled. Gmail, Slack, ClickUp, FUB, GHL, Supabase all pending. Highest-leverage order is TBD.

---

## For reviewing agents

If you're reading this, your job is to:

1. **Verify the decisions above match what Steve actually wants.** Some of this is Claude Opus 4.7's interpretation of conversations. Push back if anything's wrong.
2. **Flag doctrine that should be promoted to system-strategy.md.** Not everything here is durable. Some may be working assumption only.
3. **Surface contradictions.** If any of these decisions contradict existing system-strategy.md or rebuild-master-plan.md, say so.
4. **Propose better patterns.** If you see a cleaner way, propose it.

Steve values directness. No sycophancy. If the doctrine is wrong, say so.
