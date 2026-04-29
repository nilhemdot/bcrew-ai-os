# Old System Retrospective — What We Did Wrong, What's Repeating, What's Missing

**Date:** 2026-04-23
**Author:** Claude Opus 4.7 (1M context), working in BCrew-Buddy on Windows
**Scope:** Retrospective audit. Steve's question: "what did we do wrong on the old system, are we repeating the same mistakes on the new one, what are we not doing yet, what are the next steps?"
**Why this doc:** Parallel audit to the two running in the new system. One output file to merge into a consolidated finding. Not a new architecture doc. Not a rebuild plan.

---

## Section 1 — Pattern inventory: what actually went wrong on BCrew-Buddy

Grouped by pattern, not by session. Each has the rule that eventually got written to prevent recurrence. If the rule had to be written, the mistake happened — often more than once.

### P1. Agents built before the foundation was locked
- 162+ agents in the inventory, overlapping scopers and avatar variants
- Sprint Master was merged into Campaign Planner but still exists as DEPRECATED
- Manual agent creation drift → forced through `create-agent.cjs` as Standing Order
- INT-141: agents pulled stale doctrine from VPS because `feedback_*.md` memories weren't synced
- **Rule written after:** Agent Creation mandate, Consolidation Principle 11, doctrine memory sync script

### P2. Agents declared tools they literally could not call
- Session 184D: Visual Designer + Frontend Dev SKILL.md said fal.ai, Recraft, Ideogram, Puppeteer, Context7. `code-runner.ts` passed `mcpServers:{}`. Steve paid for APIs the agents could not touch.
- **Rule written after:** Every MCP declared must be passed at runtime. `loadPipelineMcpServers()`, `getDesignMcpServers()`. DEV-032 verification gate.

### P3. Quality gates set too low or skipped
- Plan Critic thresholds started at 7.0–7.5. Raised to 9.5/9.75 in Session 200
- `config-only`, `docs-only`, `skill-update` classifications SKIPPED critic review entirely until Session 184D
- Vague critic output — "there are gaps that need resolution" — 5 rounds in a row with no file, no fix
- **Rule written after:** R2 threshold floor. Structured JSON critic schema with `blocking_issues[{issue, file, fix}]`.

### P4. Thin backlog items entering the pipeline
- Raw one-liner descriptions shoved into `code_tasks` bypassing Sprint Master
- DEV-031/032/033 added as blob descriptions with no What/Why/DoD/Details
- **Rule written after:** Sprint Master as the only gateway to `code_tasks`. Foundation template mandatory.

### P5. Silent degradation — agents succeed on stale data
- L1 (Session 145): Sprint Master read a stale file for 36 sessions. Tasks completed, data was wrong.
- L2 (Session 187–189): Business strategy split into 6 fragments. Stale within weeks.
- Session 217: I personally ran 6 parallel audit agents on the local filesystem instead of VPS. Gold Library "1 atom" (reality: 520). Wrote a 1400-line plan, passed Plan Critic at 9.94. Every conclusion was wrong.
- **Rule written after:** R16 self-maintenance + Executive Brief staleness check + VPS-first rule + `feedback_always_check_vps_first.md`.

### P6. Local vs cloud confusion
- Session 197: Lost a full day debugging phantom bugs that were local-DB-vs-VPS divergence
- Session 189: Local PM2 overwrote `agent-inventory.md`, duplicated bot instance
- **Rule written after:** R15 + `vps-production-rule.md` loaded on every session.

### P7. Ghost processes
- Old claudeclaw PM2 ran 3.5+ days on VPS after the system was believed decommissioned, silently spawning agents
- Only caught because the rebuild audit happened to look
- **Rule written after:** System-strategy doctrine line 104. GHOST-001 backlog item.

### P8. Docs-vs-reality drift
- L6: Fresh Claude chats proposed manual doc work for Steve, ignoring "Steve operates at the decision layer" doctrine
- Session 151: Updated 3 of 8 required deliverable docs
- **Rule written after:** R13 never-create-a-doc-the-system-can't-maintain. `scripts/cross-doc-validator.cjs` nightly. `session-validator.cjs`.

### P9. Dashboard drift
- Multiple dashboards drifted from each other and from the DB
- Recruiting v2 was explicitly called a "UX disaster"
- **Rule written after:** Principle 12 command-center doctrine. Gap never fully closed on the old system.

### P10. Uncommitted work
- Session 184D: Left uncommitted changes. Orchestrator auto-stashed. Steve had to ask why.
- **Rule written after:** `feedback_always_commit.md` + `feedback_pipeline_must_commit.md`.

---

## Section 2 — Are we repeating these on BCrew AI OS? Honest read.

### What's genuinely better (give it the credit)

- **Foundation before agents is the committed sequence.** Phase 1-3 is explicit foundation work. No system agent exists yet beyond Harlan's blank default. This is the single biggest structural fix over the old system.
- **Single DB, one machine, one runtime.** No split-brain by design.
- **Source registry with stable IDs.** SRC-OWNERS-001 signed off. Old system had 13+ undeclared data sources drifting.
- **Bi-temporal columns** (`valid_from`, `valid_until`, `superseded_by`) baked into the schema from day 1. Old system bolted temporal reasoning on later and never finished.
- **Business atoms spec'd before anything consumes them.** `docs/specs/business-atoms-spec.md`. Prevents the "SKILL.md claims tools the runtime doesn't pass" pattern at the data level.
- **Doctrine absorbed into system-strategy.md** (lines 80, 100-104). Agents-outside-folders, three-tier taxonomy, isolated user boundaries, visible supervision — all principles before any agent exists.
- **"Not everything needs an agent"** explicit in rebuild-decisions. Old system never had this filter; every problem became an agent.
- **Ghost agent incident converted to doctrine + backlog BEFORE the first new agent runs.** Learning something the hard way once and codifying it is rare.

### Where the old patterns are starting to re-emerge

**2a. Staleness signal right now.**
- `origin/main` hasn't moved since 2026-04-17. My two audit commits are the last commits. Six days quiet on a branch that represents THE system.
- Two interpretations: (i) work is happening on Mac Mini, uncommitted, which is P10 re-emerging; (ii) work has actually slowed, which is worth naming. Either way, when "the system is the Mac Mini" but "git is the sync layer," a quiet main branch is the same problem shape as old-system's local-vs-VPS divergence.
- **Fix:** From Mac Mini, commit and push daily even on WIP branches. If work paused, say so in a handoff doc. Quiet main branch = uncertain truth.

**2b. Research accumulation without reconciliation.**
- Five research docs in `docs/research/` from 2026-04-15 to 2026-04-17. `2026-04-15-backlog-additions.md` explicitly says "partially-mined, do not bulk-file."
- That's honest, but it's exactly P8 doc-fragment-rot in a new skin. Every future audit pays a tax deciding what's still live.
- **Fix:** Each research doc gets a reconciliation date in the frontmatter. On that date: promote live items to backlog with provenance, mark the rest archived. Not a policy — a calendar event.

**2c. OpenClaw runtime billing is a paper plan.**
- Rebuild decisions say Anthropic banned Max-plan credits in OpenClaw (2026-04-04). API billing required.
- OpenClaw is still named as the Phase 4 runtime.
- If API billing isn't wired + budgeted + alerted, Phase 4 walls into the same "declared capability the infra can't support" pattern as P2, just at runtime scale.
- **Fix:** Before any Phase 4 work: (a) API billing account live, (b) per-task cost ceilings defined, (c) budget alerts wired to dashboard + Telegram. Or switch runtime now.

**2d. AGENTS.md has an identity problem.**
- `AGENTS.md` at the repo root reads like personal-assistant operating doctrine (heartbeats, group chat restraint, voice storytelling, MEMORY.md curation).
- But the decisions explicitly say: **repo is system documentation, not any agent's home.** Three-tier taxonomy separates personal agents (`~/.agents/`), system agents (DB rows), and per-repo coding agents (`.claude/`).
- Right now the repo root ambiguously plays "coding assistant for this repo" AND "personal-agent template." This is the OLD CLAUDE.md confusion at its root cause.
- **Fix:** Split. Keep the coding-assistant operating rules at repo root (`.claude/rules/` style, like BCrew-Buddy does). Move the personal-agent template to `templates/personal-agent/` or somewhere that isn't active instruction. Don't let the repo root double as anyone's "soul."

**2e. Supervision layer not built. GHOST-001 still spec-only.**
- Doctrine line exists (system-strategy.md line 104). Backlog item exists (GHOST-001, P0).
- But no dashboard running, no `cost_usd` column populating, no STOP button, no dead-man cron.
- The old system lost 3.5 days to a ghost because visibility was NOT a precondition for spawning. Doctrine does not save you. Plumbing does.
- **Fix:** Hard rule before any system agent boots — process list + live cost + STOP button + dead-man switch must exist and have been exercised. "Does this have a visible kill switch?" as the pre-launch question from the ghost-agent lesson.

**2f. No agent-creation script enforcement yet.**
- Old system: `create-agent.cjs` was the enforcement point. Imperfect but tooling beat doctrine.
- New system: no analog yet. Three-tier taxonomy is doctrine without a tool that makes compliance easier than non-compliance.
- **Fix:** Before Phase 4, write `create-system-agent` / `create-personal-agent` scripts. Make them the only spawn paths. Registration + identity file + memory scope wired by the tool, not by discipline.

---

## Section 3 — What we're not doing yet but the old system eventually did

Things the old system only built after being burned. The new system hasn't been burned on these yet — but will be.

1. **Cross-doc validator** — nightly drift detection across Pillars. Specs + strategy + schema can drift silently without it.
2. **Acknowledged-states table** — the "this is an intentional pause / accepted gap" registry that keeps audits from flagging known states as bugs.
3. **Session validator tool** — enforces Section Closeout Discipline. Without it, that checklist is aspiration, not enforcement.
4. **Decision Capture System** — old system had `save-decision.cjs`. New system's spec references it but filing is currently manual.
5. **Doctrine memory sync to production machine** — the `feedback_*.md` → production pipeline. Old system lost a day to INT-141 because this didn't exist. New system has feedback memories on Windows only right now.
6. **Finding verification agent** — old system built this specifically to prevent scouts from gaslighting briefs with fictional data. Any scout built on the new system needs this guard from day 1, not as a post-incident rule.

---

## Section 4 — Next 5 moves, priority order

1. **Supervision layer before first agent (GHOST-001).** Process registry + `agent_activity.cost_usd` + STOP button + dead-man cron on dashboard. Hard rule: no system agent boots until this ships. P0.
2. **`create-system-agent` script.** Template enforcement by tool, not doctrine. Registration, identity file, memory scope, MCP allowlist wired automatically. P1.
3. **Research reconciliation pass.** Walk the 5 research docs in `docs/research/`. Promote anything live to backlog with provenance. Archive the rest with a dated note. Kills doc-fragment-rot before it sets. P1.
4. **Confirm or replace OpenClaw.** API billing account, per-task ceilings, budget alerts — or pick a different Phase 4 runtime. Decide before Phase 4 starts, not during. P1.
5. **Sync feedback memories + session discipline to Mac Mini.** The old system's `feedback_*.md` set is hard-won doctrine. Either port what still applies, or explicitly declare the new system starts fresh. Then: every new session on Mac Mini writes daily memory + pushes it. Closes P5/P8 at the root. P2.

---

## Section 5 — Mistakes this auditor made (for the reviewing agents)

Transparency so reviewers can weight this doc.

1. **I audited from a Windows git clone.** The Mac Mini is the system. `origin/main` is as fresh as my last `git pull`. Nothing I claim here reflects live PostgreSQL state, live process state, or uncommitted Mac Mini work. A Mac-Mini-resident reviewer should re-verify every claim against the database and `ps`.
2. **My previous audit (2026-04-17) implied "25 unfiled backlog items."** Closer read of `2026-04-15-backlog-additions.md` explicitly says "partially-mined, do not bulk-file, promote selectively." Correction: it's a reconciliation gap, not a filing backlog. Different problem, smaller scale.
3. **I did not query PostgreSQL directly.** Every schema claim in this doc is from reading `lib/foundation-db.js`, not from `SELECT` against the live DB. Schema-in-code-equals-schema-in-DB is an assumption I did not verify.
4. **I read five research docs + system-strategy + rebuild-decisions, but did not read `docs/strategy/*`, `docs/specs/business-atoms-spec.md`, or `docs/source-registry.md` in full this pass.** Conclusions are weighted toward what I read. A reviewer should spot-check specs I didn't open.

---

## Closing

The new system is structurally better than the old one in ways that matter — foundation-first sequencing, single source of truth, doctrine captured early, no split-brain. The patterns that will kill it are the same patterns that killed the old one at small scale: staleness, thin artifacts, tools that declare capability they can't deliver, and ghost processes. The five moves above close those lanes before Phase 4 begins.

The right question isn't "are we building a Frankenstein again." The right question is "are we enforcing the foundation with tools, or just with doctrine?" Tools win every time.
