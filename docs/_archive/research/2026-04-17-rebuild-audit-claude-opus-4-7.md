# Rebuild Audit — Claude Opus 4.7 (2026-04-16 / 2026-04-17)

**Auditor:** Claude Opus 4.7 (fresh model upgrade)
**Session context:** Steve requested a full audit of bcrew-ai-os rebuild after feeling "off track." Two-day conversation spanning 2026-04-16 audit + 2026-04-17 correction.
**Status:** Research / analysis. Not doctrine. Other agents should review, flag disagreements, and surface gaps.

---

## Audit scope

Compared old system (`C:\Users\steve\BCrew-Buddy`) against new system (`C:\Users\steve\bcrew-ai-os-review`) against the rebuild master plan (`BCrew-Buddy/docs/rebuild/rebuild-master-plan.md`).

Deep-read the following:
- Old system: `docs/business-strategy.md`, `docs/system-strategy.md`, `docs/agent-inventory.md`, 18,659 LOC across 87 TS files, 80+ dashboard endpoints
- New system: all strategy docs, `server.js` (967 LOC), `lib/foundation-db.js` (2,944 LOC), all public dashboard files, source registry, 25 staged backlog items
- Rebuild plan: master plan, AGENTS.md, memory architecture spec, rebuild decisions (2026-04-11)

---

## Key findings

### What's working well

- **Strategy docs are clean and modular.** 10 files in `docs/strategy/`, well-organized, no bloat.
- **Source registry with stable IDs is real.** 8 verified, 11 pending revalidation, 7 gaps. Stable IDs reference cleanly.
- **Foundation Trust Layer is architecturally sound.** Express + PostgreSQL + admin token auth, 8 endpoints, doc-update proposal/approval flow, change events, live source snapshots for Freedom Sheet + Owners Dashboard. 105 seeded backlog items.
- **Business Atoms spec is thoughtful.** Builds on the content-atoms pattern that already proved out. Dedup + merge + frequency model are right.
- **Change doctrine is encoded, not just aspirational.** "System proposes, Steve confirms, system records" is actually implemented with pending-doc-updates flow.
- **Cost model validated.** Plan targets ~$605/month vs old $1,240/month. Down ~50%.

### Actual gaps (corrected from initial audit)

**ORIGINAL CLAIM (2026-04-16):** "New system is bypassing OpenClaw runtime — this is drift."
**CORRECTION (2026-04-17):** This framing was wrong. OpenClaw was planned as the AGENT runtime (Phase 4), not the foundation layer. Foundation is runtime-neutral by design per `system-strategy.md` ("hubs plug into foundation," "runtime is replaceable"). Since agents haven't been built yet, OpenClaw hasn't been exercised yet. No drift. No urgent runtime question. The decision stands; it simply hasn't been activated.

**Real remaining gaps in foundation work (Phase 1-3):**

| Gap | Severity | Notes |
|---|---|---|
| Q2 2026 priorities not locked in business-strategy | P1 | BCrew Q2 starts May — about 2 weeks out. Phase 1 exit criterion. |
| ~~SRC-OWNERS-001 still "In Review"~~ | ~~P1~~ | **RESOLVED 2026-04-16.** Signed Off in source-registry.md. Commit `8745c72`. Admin tab locked. Downstream finance/attribution/recruiting work unblocked. |
| ~~Agent-boundaries doctrine not in system-strategy.md~~ | ~~P1~~ | **PARTIALLY RESOLVED.** Principles absorbed into `docs/system-strategy.md` lines 80, 100-104: coding assistants are tools not agents, personal vs system-dedicated distinction, browser-capable agents need isolated user/session boundaries. Fuller reasoning in companion doc `2026-04-17-agent-doctrine-decisions.md`. |
| ~~Ghost-agent rule is backlog only~~ | ~~P1~~ | **PARTIALLY RESOLVED.** Principle captured at `docs/system-strategy.md` line 104: "Every long-running runtime, scheduler, or agent service needs visible supervision, a stop path, and a clean decommission path." Implementation still backlog work (GHOST-001 in 2026-04-15-backlog-additions.md). |
| 25 backlog items staged but not filed | P1 | `docs/research/2026-04-15-backlog-additions.md`. ID collisions with seed (AGENT-001/002/003 exist in both). Renumber before filing. |
| Rebuild master plan lives in old repo only | P2 | `BCrew-Buddy/docs/rebuild/rebuild-master-plan.md` governs the new system but isn't in it. Copy or link. |
| Data connectors partial | P2 | **UPDATED 2026-04-16.** FUB now wired (read + admin-gated write). Gmail, Slack, ClickUp, GHL, Supabase, Google Ads still pending. These are foundation (data ingestion), not agents. |

### What old system did that the new system will need (when agent layer starts)

Not current work — this is for Phase 4+ reference.

- Scheduler pattern (60-second poll, FIFO per-agent queue, concurrency limiter, orphan cleanup) — `scheduler.ts` 2,064 LOC
- Code runner pattern (Claude Agent SDK subprocess, MCP management, post-build QA) — `code-runner.ts` 3,127 LOC
- Write-safety sandboxing (doc mutation prevention without approval) — `write-safety.ts` 553 LOC
- Review loop + multi-perspective QA — `review-loop.ts` + `multi-qa.ts`
- 70+ SKILL.md files — port candidates. Need audit: which are still relevant at Mac Mini scale with new runtime decisions.
- Multi-bot Telegram orchestration (Grammy) — 5 bots: @BensonCrew, @Chief, @Tanner, @Carson, @Georgia
- Agent activity logging + cost tracking
- MCP health monitoring

---

## Current phase state (updated 2026-04-17 post-rebase)

| Phase | Plan | Status | Notes |
|---|---|---|---|
| 0 | Mac Mini + OpenClaw setup | ✅ DONE | OpenClaw Gateway running, Harlan bot responding, repo initialized |
| 1 | Business Strategy | 🟡 ~85% | Q2 priorities — reviewing agent please verify current state |
| 2 | System Strategy | 🟢 ~90% | Doctrine principles absorbed (system-strategy.md rewritten 2026-04-16). Reviewing agent please verify completeness |
| 3 | Foundation Infrastructure | 🟡 in progress | APIs done. Source layer split into its own surface. FUB connector wired (read + admin-gated write). Owners Dashboard signed off. Gmail/Slack/ClickUp/GHL/Supabase still pending. Test-agent-on-cron not yet happened. |
| 4 | Intelligence (scouts) | ⏸ not started | Waits for Phase 3 complete |
| 5-7 | Departments, Personal Bots, Dev Team | ⏸ not started | Waits for Phase 4 |
| 8 | Kill old system | ⏸ not started | Final phase |

**This is not off-track.** This is executing in order. Foundation before agents is the plan. Significant progress since 2026-04-15 audit (50+ commits on main). Current session had stale view; updated after rebase.

---

## Recommended near-term priorities

No runtime pivot. No premature agent building. Finish foundation in the order the plan specifies.

**Updated 2026-04-17 after rebase to latest origin/main — removed items already completed.**

1. **Lock Q2 2026 priorities** — Steve does quarterly planning work, update `docs/strategy/quarterly-priorities.md`. BCrew Q2 starts May. *Status needs verification by reviewing agent.*
2. ~~SRC-OWNERS-001 signoff~~ — **DONE 2026-04-16** (commit `8745c72`).
3. **Promote full doctrine text** — system-strategy.md has the principles. If Steve wants the fuller reasoning/context from `2026-04-17-agent-doctrine-decisions.md` merged in, scope that as a doc update. Otherwise current state is sufficient.
4. ~~Ghost-agent rule to doctrine~~ — **DONE** in system-strategy.md line 104. Implementation work (dashboard kill switches, dead-man cron, cost tracking) remains in backlog as GHOST-001.
5. **File 25 backlog items on Mac Mini** — Codex session. Renumber audit-doc AGENT-001/002 to AGENT-004/005. Consolidate DEC-*/DECISION-* prefixes. *Status: unknown — reviewing agent please check if any of the 25 have been filed since 2026-04-15.*
6. **Move rebuild master plan into this repo** — either copy `BCrew-Buddy/docs/rebuild/rebuild-master-plan.md` into `bcrew-ai-os-review/docs/rebuild/` or replace with a pointer.
7. **Wire remaining data connectors** — Gmail, Slack, ClickUp, GHL, Supabase. These are ingestion, not agents. FUB now partial (reads + admin-gated writes) — next step depends on what connector unlocks highest-leverage work.

Phase 3 exit criterion (one test agent on cron) comes AFTER these. Don't skip ahead.

---

## Mistakes this auditor made (2026-04-17)

For transparency. Other reviewers should know where my reasoning was wrong:

1. **Recommended cloud deployment.** Steve explicitly rejected cloud and documented hundreds of hours lost to VPS split-brain. Mac Mini is non-negotiable. Suggesting otherwise was ignoring durable user context. Correction: Mac Mini stays. Forever.

2. **Claimed "OpenClaw is being bypassed."** Wrong framing. OpenClaw is the planned Phase 4 agent runtime. Foundation was always supposed to be runtime-neutral. What I saw as "drift" was architectural separation working as intended.

3. **Compared Mark Kashef 1:1.** He built a single-user personal productivity stack. This system serves a 5-user team scaling to organizational infrastructure and eventual multi-tenant SaaS. Different problem. Pattern-borrowing is valid; architectural copying is not. Confirmed by Steve and now corrected.

4. **Recommended "rebuild from scratch."** Inappropriate. Foundation is clean and reusable. The correct recommendation is "continue foundation work in order."

Other agents reviewing this doc: if I'm still wrong somewhere, surface it. Steve values directness over validation.

---

## Open questions for other agents

- Are the 25 staged backlog items still the right next write? Or has anything changed since 2026-04-15?
- Is the Q2 priority set already drafted somewhere, or does Steve need a planning session first?
- Any gaps in foundation work I missed? Specifically data connectors — which are highest-leverage to wire first?
- When agent layer begins (Phase 4), is the OpenClaw-plus-Agent-SDK-subprocess pattern still the plan, or has Steve's thinking shifted?

---

## Files referenced

- `docs/research/2026-04-15-backlog-additions.md` — 25 staged items
- `docs/research/2026-04-15-ghost-agent-lesson.md` — ghost agent incident
- `docs/research/2026-04-15-mark-kashef-claudeclaw-review.md` — Mark Kashef research (not adopted)
- `docs/research/2026-04-17-agent-doctrine-decisions.md` — doctrine candidates (companion doc)
- `docs/source-notes/owners-dashboard.md` — SRC-OWNERS-001 source notes
- `docs/source-registry.md` — stable source IDs + status
- `docs/system-strategy.md` — current doctrine
- `lib/foundation-db.js` — 105 seeded backlog items
- `server.js` — Foundation Trust Layer API
