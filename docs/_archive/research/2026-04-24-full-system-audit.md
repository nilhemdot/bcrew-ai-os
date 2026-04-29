# BCrew AI OS Full System Audit — 2026-04-24

**Author:** Claude Opus 4.7 (1M context), reading from a synced Windows clone of `bcrew-ai-os` main branch
**Audit pull state:** main at HEAD, 70+ handoffs, 9 audits, 141 docs total, latest commit on 4/24 doctrine corrections
**Scope:** Top-to-bottom audit of what's built, what's specified, what's not built, whether Foundation is closing or drifting toward Strategy Hub work prematurely
**Steve's question driving this audit:** "is the Foundation actually finishing or are we starting to build hubs before the trust layer is locked?"

---

## Section 0 — Lessons from the prior two audits (own them)

My 2026-04-23 retro doc was based on a stale clone. I claimed "main hasn't moved in 6 days" and "no consumer defined." Both wrong — `git pull` first then read second is now my rule. My recommendations to "pick a Director slice and build end-to-end" rediscovered work already done (T#26100 cross-system proof). Those errors are documented in the retro doc and corrected in conversation. This audit is built on a fresh `git pull` and reads of the four active-truth docs (`current-plan`, `current-state`, `intelligence-pipeline`, `current-runtime-map`) plus key specs.

---

## Section 1 — Verdict up top

**Foundation is closing methodically, not drifting. Codex is NOT prematurely building Strategy Hub.** Today's `2026-04-24-strategy-action-loop-correction.md` is a doctrine correction — it clarifies what Strategy Hub WILL be when it's built (first useful hub, action-routed loop), not a build-start. Current build work is hardening the substrate that synthesis runs on.

**But Foundation has two privacy-critical gaps that must close before any synthesis output reaches anyone other than Steve, and one structural gap before any agent boots.** Those three are the real audit findings.

**My estimate:** Foundation is ~70-75% built measured against the 17-step plan, with the remaining 25-30% being the most consequential layer (auth/tier/vault, redaction, process supervision). Plan ordering is largely sound. One ordering tangle and one missing-from-plan layer are flagged below.

---

## Section 2 — What's actually built and live

Verified by reading code paths, package.json, current-state.md, and recent handoffs.

### 2a. Runtime layer — LIVE

| Capability | Status | Evidence |
|---|---|---|
| Foundation job runner | LIVE | `npm run foundation:job` |
| Foundation worker (long-running) | LIVE | `npm run foundation:worker` + `ai.bcrew.foundation-worker` LaunchAgent |
| Dashboard runtime | LIVE | `ai.bcrew.dashboard` LaunchAgent |
| DB-backed pause/resume per job | LIVE | proven in `2026-04-24-runtime-router-current-day-sync-checkpoint.md` |
| Active-run locking | LIVE | same |
| Process-group timeout cleanup | LIVE | same |
| Verifier | LIVE, 24/24 passing | `npm run foundation:verify` |

### 2b. LLM routing and cost control — LIVE

| Capability | Status | Evidence |
|---|---|---|
| LLM router with route selection + execution | LIVE | `lib/llm-router.js`, `llm_routes`, `llm_calls` |
| Subscription-first routing (free) | LIVE | OpenClaw / chatgpt_subscription_gateway, $0/call recorded |
| Spend guard against direct API spend | LIVE | `lib/llm-spend-policy.js`, `LLM_ALLOW_DIRECT_OPENAI_RESPONSES` flag required |
| Verifier check for unguarded direct spend | LIVE | included in `foundation:verify` 24/24 |
| Real synthesis routed through subscription | PROVEN | `synth-20260424T203755Z-e6b01782ad` |
| Real Gmail extraction routed | PROVEN | `lib/shared-candidate-extraction.js` migrated |

**Gap:** Claude Code / Claude Agent SDK subscription adapter is NOT built. Router currently has OpenAI subscription path only. Listed as next-build item.

### 2c. Source layer — partial, ordered

19 source contracts. Maturity-model levels per `docs/specs/data-source-maturity-model.md`:

| Level | What it means | Count | Sources |
|---|---|---|---|
| Level 2 (signed off) | trusted unit + meaning reviewed | 1 | `SRC-OWNERS-001` |
| Level 2 for current reality | deeply mapped, package not fully closed | 6 | `SRC-STRATEGY-001`, `SRC-FREEDOM-TEAM/COMMUNITY/COMMUNITY-REV/ENGINE/BHAG-001` |
| Level 1.5 | partial sign-off in progress | 2 | `SRC-FINANCE-001`, `SRC-OWNERS-LISTS-001` |
| Level 1 (readable) | system can reach + read | 10 | `SRC-FUB/SUPABASE/GMAIL/GCAL/MISSIVE/SLACK/MEETINGS/DATAFORSEO/GHL/META-001` |
| Pending revalidation | connector exists, not verified | 4 | `SRC-CLICKUP/GDRIVE/VIDEO/GADS-001` |
| Gap (no connection) | needs build | 8 | `SRC-PUBLISH/REAL/EMAIL-TEAM/REVIEWS/TRAINING/CONTENT/LOOM/SKOOL-001` |

**Reality check:** 1 source is fully closed at Level 2. The "fully signed off" claim some readers might assume from "Foundation done" is wrong — Foundation is sign-off-in-progress, with deep current-reality capture but few full closeouts.

### 2d. Extraction layer — LIVE substrate, partial coverage

| Capability | Status | Evidence |
|---|---|---|
| Extraction control ledger | LIVE | `source_crawl_targets`, `source_crawl_items`, `/api/foundation/extraction-control` |
| Per-source cursors and leases | LIVE | `2026-04-24-runtime-router-current-day-sync-checkpoint.md` |
| 8 extraction targets seeded | LIVE | Gmail/Missive/Meetings/Slack/Drive/Skool/Old-system-reports/Zoom-audio |
| Content-hash scoped processing | LIVE | `shared_communication_artifact_processing_runs` (today) |
| Zero-candidate artifact memory | LIVE | so artifacts aren't re-mined forever |
| Sensitivity tagging at extraction | PARTIAL | candidates have sensitivity field; extraction doesn't yet inject Foundation context |
| Subject-people tagging | NOT BUILT | spec'd in `2026-04-23-auth-tiers-vault.md` but not implemented |
| Foundation-context-aware extraction | NOT BUILT | "extraction reads transcript with Foundation context" is Layer 4 of the spec, not yet wired |

### 2e. Archive depth — real but not complete

From `2026-04-23-late-night-foundation-clean-checkpoint.md` and `runtime-router` checkpoint:

| Source | Archived | Oldest |
|---|---|---|
| Gmail | 1,103 threads | 2026-04-09 |
| Missive | 1,248 threads | 2026-04-09 |
| Slack | 1,371 threads | 2026-01-27 |
| Meetings | 1,498 artifacts | varies |
| Meeting transcripts | embedded | 2025-03-12 |
| Recovered Zoom | 79 chats | 2024-10-03 |
| **Total** | **12,074 artifacts, 4,529 candidates** | |

**Honest read:** Gmail and Missive are NOT 180-day complete. Synthesis runs on partial history. This is documented; it's a known limit being addressed via cursor-based chunked backfill.

**Candidate breakdown:** 1,977 task / 263 decision / 281 blocker / 470 feedback / 1,490 atom.

### 2f. Synthesis layer — V1 PROOF LIVE, not continuous

| Capability | Status | Evidence |
|---|---|---|
| V1 spec | LIVE | `docs/specs/2026-04-23-synthesis-engine-v1.md` |
| Batch synthesis script | LIVE | `scripts/generate-shared-comms-synthesis.mjs` |
| Persisted synthesis runs and items | LIVE | `shared_communication_synthesis_runs`, `shared_communication_synthesized_items` |
| Synthesis API | LIVE | `/api/shared-communications/synthesis` |
| Cross-artifact linking | V1 | done in batch |
| Resolution detection | V1 | conservative — marks `needs_review` when uncertain |
| Staleness scoring | V1 | fresh / active / stale_watch / historical_context |
| Actionability ranking | V1 | strategic relevance, recency, source count, evidence quality |
| Continuous synthesis | NOT BUILT | V1 is batch-only |
| Source-backed fact bundle injection | PARTIAL | `doc_source_snapshots` + open backlog + open questions; NOT yet KPI/finance/Owners/FUB facts |

**Latest router-backed synthesis output (real):** `synth-20260424T203755Z-e6b01782ad` — 5 ranked items: KPI deal-data display/sync failure, June cash gap, SocialPilot publishing instability, Union Street delivery retry, Loom account migration. These are real strategic issues surfaced from the archive automatically.

### 2g. Apply paths and review queues — LIVE

| Capability | Status | Notes |
|---|---|---|
| Decision apply flow | LIVE | candidates → decision ledger |
| Backlog apply flow | LIVE | candidates → backlog |
| Question apply flow | LIVE | blocker candidates → open questions |
| Owners review queue (combined) | LIVE | `/api/owners/review-queue` |
| Cross-system proof T#26100 | LIVE | Owners → FUB → ClickUp → Drive |
| Firm/exception deal review runner | LIVE | `npm run deal-review:admin -- --queued` |
| Conditional deal review runner | LIVE | `npm run deal-review:conditional -- --queued` |

### 2h. Drift and freshness — LIVE for FUB and Owners only

| Capability | Status | Notes |
|---|---|---|
| FUB lead-source drift panel | LIVE | new-name / open-class / legacy-name / governed-missing buckets |
| Owners governed-dropdown drift panel | LIVE | unexpected values, missing approved values, duplicates |
| Drift events in `change_events` | LIVE | `source_drift_detected`, `source_drift_cleared` |
| Freshness rules on Owners/FUB | LIVE | 24h fresh / 72h warn / 168h stale |
| Sheet structure verifier | LIVE | `npm run sheets:verify` for Freedom + Owners + KPI |
| Cross-source freshness | NOT BUILT | only Owners/FUB have it; rest is Later |

### 2i. Decisions and strategy traceability — LIVE first slice

| Capability | Status | Notes |
|---|---|---|
| Decision provenance model | LIVE | owner / confirmed-by / participants / context-ref / evidence-notes |
| Decision-to-doc traceability | LIVE | first slice |
| Strategy change ledger with annotations | LIVE | first slice |
| Contradiction / cleanup queue | LIVE | first slice |
| Strategy packet output | NOT BUILT | spec'd in synthesis-engine-v1, not generated yet |

---

## Section 3 — What's specified but NOT YET BUILT

These are known and named, but not in code:

### 3a. Auth, Tier, Vault layer (`docs/specs/2026-04-23-auth-tiers-vault.md`)

**Status:** Full design spec, 18-24 hours of focused Codex time estimated. Zero code shipped.

Five layers:
1. **Cloudflare Access** at edge — gates `*.bensoncrew.ca` to allow-listed `@bensoncrew.ca` users
2. **App middleware** — reads `Cf-Access-Authenticated-User-Email`, attaches `req.user = { email, name, tier }`
3. **Data vault** — raw transcripts/comms move to `crewbert@bensoncrew.ca` Drive vault, ACL stripped
4. **Context-aware extraction** — transcript + Foundation context (strategy/people/decisions/backlog/source registry) → structured extractions with `min_tier` and `subject_people` tagging
5. **Subject-person redaction** — content ABOUT a user with sensitivity ∈ {performance_concern, termination_risk, comp_discussion, undisclosed_feedback} suppressed from THAT user's view, even if their tier would allow it
6. **Tier-filtered query API** — `/api/query` returns only what the asking user is allowed to see, in uniform shape (never reveals existence of suppressed content)

**This is the gating layer.** Synthesis output cannot be exposed to anyone other than Steve until at least layers 1-2 + 5 are in place. Currently `/api/shared-communications/synthesis` has no tier gate. If Nick or Carson hits that endpoint, they see unfiltered output including any termination/comp signals.

### 3b. Continuous synthesis engine

V1 is batch. Continuous engine needs:
- supersession detection across runs
- resolution events updating prior synthesized items
- subscribers / scheduled runs
- per-consumer view generation (strategy / leadership / sales / ops / marketing / retention / source-trust)

### 3c. SYSTEM-010 visible process control before autonomous loops

**Status:** PARTIAL — pause/resume buttons live on Foundation jobs. NOT yet built:
- One-command decommission flow
- Cost dashboard with anomaly alerts
- Dead-man switch (auto-pause if admin heartbeat missing N days)
- Single registry of every running process across job runner, worker, scheduled tasks, agents
- Pre-launch checklist enforcement ("does this have a visible kill switch?")

This is the hard precondition for first agent. Doctrine line 104 of `system-strategy.md` already requires it.

### 3d. Hub-capacity registry for routing

Per `2026-04-24-subscription-router-and-intelligence-checkpoint.md`: "hub-dedicated capacity lanes: Foundation, Marketing, Strategy, Ops, Sales, Recruiting, Agent Hub, Steve Zahnd, MarketMasters, Steve-owned education/monetization." Routes need to be assigned by hub, not blind account rotation. Not built.

### 3e. Persisted backfill cursors

Current Gmail/Missive backfill is partly manual. Item-level cursors and leases for chunked historical reads are listed in next-build-order step 3.

---

## Section 4 — Open Foundation closeouts (the work that finishes the trust layer)

Per `current-plan.md` and `owners-closeout.md`:

| Card | What closes | Dependency chain |
|---|---|---|
| `SOURCE-008` | FUB Level 2 sign-off | unblocks `DATA-005/006/007/008/009` |
| `DATA-005` | Owners ↔ FUB lead-source lineage | depends on `SOURCE-008` |
| `DATA-006` | Admin-tab quality rules + governed AI deal-review checklist | depends on `SOURCE-008` |
| `DATA-007/008/009` | Historical data cleanup (invalid sources, missing FUB links, suspicious duplicates) | depends on `DATA-005/006` |
| `FOUNDATION-003` | Finance Level 2 sign-off | follows FUB |
| `SOURCE-010` | KPI truth-layer split | follows finance |
| `SOURCE-014` | Strategy package closeout | the strategy-used Owners slice closes inside Owners package |
| `SOURCE-016` | Marketing source map (Benson Crew / Zahnd Team Ag / Steve Zahnd / MarketMasters lanes) | independent of Owners closeout |
| `DATA-020` enforcement | FUB drift → enforcement on Owners Dashboard | partially live as queue-ready, not enforced |

**Visible chain:** FUB → Owners attribution → historical cleanup → finance → KPI → marketing lanes. That's roughly 6 source closeouts ahead of any Strategy Hub work.

---

## Section 5 — Strategy Hub readiness check (Steve's worry test)

Steve's worry: Codex wants to start Strategy Hub before Foundation is finished.

Read what Codex actually plans:

From `2026-04-24-subscription-router-and-intelligence-checkpoint.md`:
> "Next Build Order:
> 1. Add Claude Code / Claude Agent SDK subscription adapter to lib/llm-router.js.
> 2. Add hub-capacity registry fields or policy rows...
> 3. Run monitored bounded extraction/synthesis bites through the router and confirm llm_calls remain subscription-routed.
> 4. **Connect shared-comms-intelligence-bite output to Strategy Hub/action routing after the route proof stays clean.**
> 5. Continue Drive/meeting retry hardening; do not restart giant manual backfills."

From today's strategy-action-loop-correction:
> "The first useful hub is Strategy Hub, not an email digest or daily dashboard brief."
> "Synthesis is a function inside the operating loop, not the product."

**Honest read:** Step 4 is "connect synthesis output to Strategy Hub/action routing AFTER route proof stays clean." That's not building Strategy Hub. That's wiring the action loop tail of synthesis into a future Hub surface. **The doctrine correction was a clarification, not a build trigger.**

**But there's a real risk worth naming:**

The plan's 17-step ordering (`current-plan.md`) has Strategy Hub at step 7, BEFORE the Owners/FUB/Finance/KPI source closeouts (which are at steps 8-9 inside the Owners package). The strategy-used Owners slice closes inside that package. Reading both docs together, the right order is:

1. Substrate hardening (router adapters, hub capacity, processing provenance) — Codex's stated next 3 steps
2. **Auth / Tier / Vault / Redaction (NOT in current-plan's 17 steps but spec'd separately)** — gating layer for any synthesis exposure beyond Steve
3. **SYSTEM-010 process supervision** — required before any autonomous loop
4. Owners package closeout (`SOURCE-008` → `DATA-005/006/007/008/009` → `FINANCE-002`) — clears strategy-used Owners slice
5. Finance Level 2 (`FOUNDATION-003`)
6. KPI truth-layer split (`SOURCE-010`)
7. Marketing source map (`SOURCE-016`)
8. THEN Strategy Hub on top

**The auth/tier/vault layer is the most consequential gap in the plan.** It's specified in a separate spec doc but not visible in `current-plan.md` as a gating step. If a builder reads only `current-plan.md`, they could ship synthesis exposure without the privacy layer. This is the same shape as the old system's L5 lesson — RESTRICTED meeting notes exposed in shared folder. Don't repeat it.

---

## Section 6 — Risks and gaps

### 6a. Privacy layer not in active plan
Auth/Tier/Vault/Redaction spec exists (`2026-04-23-auth-tiers-vault.md`) but is NOT a step in `current-plan.md`. Result: any future Hub or `/api/query` work that ships before this spec lands will leak. **Promote this to a gating step in current-plan.md before any Hub work begins.**

### 6b. Synthesis output is currently un-gated
`/api/shared-communications/synthesis` has no tier check. As long as access is bounded (Steve only / dev), this is safe. But the moment that endpoint is reachable by any other user, content with termination/comp signals is exposed. **Add a tier-check to that endpoint TODAY** as a temporary guard until Layer 5 lands.

### 6c. Doc fragment rot is a present risk, not a future one
70 handoffs in 4/22-4/24 alone. `doc-cleanup-plan.md` started indexes but consolidation Phase 2 (promote durable truth into active docs) is not complete. Without follow-through, this becomes the L2 lesson from the old system. **Indexes alone don't fix it; the promotion phase must close.**

### 6d. SYSTEM-010 partial = doctrine without all the plumbing
Pause/resume exists. Decommission flow, dead-man, and cost dashboard don't. Doctrine line 104 says "every long-running runtime needs visible supervision, a stop path, and a clean decommission path." Three out of those four exist. The 4th (clean decommission) is the one that matters when an agent goes wrong.

### 6e. Pending Revalidation sources include critical ones
- `SRC-CLICKUP-001` (Carson) — task management is fundamental for ops
- `SRC-GADS-001` — invalid_grant blocks Google Ads visibility
- `SRC-GDRIVE-001` — Drive corpus crawl depends on this

These need owners and ETAs.

### 6f. Hub Supply Chain in `intelligence-pipeline.md` lists 10 hub consumers
Strategy / Sales-recruiting / Ops / Marketing / Agent Hub / Benson Crew / Zahnd Team Ag / Steve Zahnd / MarketMasters / Steve education-monetization. If each becomes a Hub build, scope creep is real. Need explicit Hub-build sequence (Strategy first, then Ops, then Sales, etc.) before any Hub starts.

### 6g. Synthesis runs on partial archive
Gmail 1,103 threads oldest 4/9, Missive 1,248 oldest 4/9. That's roughly 2 weeks. Strategic issues from older periods are absent. Cursor-based backfill is in next-build-order; until then any synthesis claim about "system-wide patterns" should be qualified as "since 4/9."

### 6h. Old-system patterns that haven't been ported yet
- **No notification routing.** Old system delivered briefs daily via Telegram. New system has zero human-delivery wired. Once Strategy Hub generates a packet, who reads it where?
- **No Plan Critic equivalent.** Old system's quality gate (9.5/9.75 thresholds, structured JSON criticism). New system has `foundation:verify` for source state but no equivalent for build output.
- **No acknowledged-states registry.** Explicit pause/deferral table that prevents audits from flagging known states as bugs. Old system built it after losing time to false positives. Not in new system yet.
- **No Verification Agent** for synthesis claims. Old system built this to prevent gaslighting. Subject-person redaction is a different problem; gaslighting prevention is still needed.

### 6i. Plan ordering tangle
`current-plan.md` step 4 = strategy truth boundary. Step 7 = Strategy Hub. Step 8 = Owners package closeout. But owners-closeout.md says strategy-used Owners slice closes INSIDE the Owners package. So step 7 (Strategy Hub) actually depends on step 8 (Owners closeout) finishing. Either re-number or call out the dependency explicitly.

---

## Section 7 — Recommended next-build order (with reasoning)

Concrete, in priority order:

### Tier A — Substrate completion (Codex is on this)
1. **Claude Code / Agent SDK subscription adapter** under `lib/llm-router.js`. Locks in cost-controlled multi-model capacity.
2. **Hub-capacity registry** so routes get assigned by hub, not blind rotation.
3. **Run bounded extraction/synthesis bites through router** until `llm_calls` stay subscription-routed across multiple sources. Proves the substrate.

### Tier B — Privacy and supervision (BEFORE any Hub or wider synthesis exposure)
4. **Auth/Tier middleware (Layers 1-2 of auth-tiers-vault spec).** Cloudflare Access + `req.user.tier` + `assertTier()` helper. ~1-2 hours per spec.
5. **Subject-person redaction (Layer 5).** Tag extractions with `subject_people` and `sensitivity`. Filter at query time. THIS is the line between "useful intelligence" and "data leak."
6. **Add tier gate to `/api/shared-communications/synthesis` immediately as a temp guard.** Tier 1 only until Layer 5 ships. 15 minutes.
7. **SYSTEM-010 completion.** Decommission flow, dead-man cron, cost dashboard. Doctrine line 104 is binding.

### Tier C — Foundation closeout
8. **FUB Level 2 (`SOURCE-008`)** → unblocks Owners attribution.
9. **Owners package closeout (`DATA-005/006/007/008/009`)** → clears strategy-used Owners slice → closes `SOURCE-014`.
10. **Finance Level 2 (`FOUNDATION-003`).**
11. **KPI truth-layer split (`SOURCE-010`).**
12. **Marketing source map (`SOURCE-016`).**

### Tier D — Synthesis maturity
13. **Continuous synthesis from V1 batch.** Supersession + resolution + per-consumer view generation.
14. **Source-backed fact bundle expansion.** Wire KPI / finance / Owners / FUB / source-contract facts into synthesis grounding.
15. **Backfill cursors persisted** so Gmail/Missive can deepen overnight.

### Tier E — First Hub
16. **Strategy Hub action-routing layer.** Synthesis output → routed decision/contradiction/task/owner-bound action with source evidence.
17. **Notification routing.** Telegram / email delivery to leadership inboxes for Strategy packets.

### Tier F — Doc cleanup discipline (continuous)
18. Complete `doc-cleanup-plan.md` Phase 2 (promote durable truth) and Phase 3 (mark superseded). Not a separate tier — runs alongside Tier C.

---

## Section 8 — Direct answers to Steve's question

> "wants to start building strategy but we didn't finish the foundation, I don't want a Frankenstein, I want to make sure we finish the foundation"

**Are we finishing Foundation?** Yes, methodically. Substrate is real, sources are tracking through maturity levels with explicit signals, synthesis V1 has shipped a real proof, drift detection is live for the closed sources.

**Is Strategy Hub being prematurely built?** No. Today's doctrine correction clarified what Strategy Hub will be when it's built; it's not a build-trigger. Codex's next 3-5 steps are substrate hardening, not Hub work.

**Is the rebuild becoming Frankenstein?** Not visibly. The discipline is showing — single Foundation runtime, single LLM router, single archive, single synthesis layer, governed apply paths. The OPPOSITE of Frankenstein.

**Are there real things to worry about?** Yes, three:
1. **Auth/Tier/Vault/Redaction spec is not in `current-plan.md` as a gating step.** It needs to be promoted to a hard precondition before any Hub or wider synthesis exposure. Otherwise the system leaks restricted content and replays the old L5 lesson.
2. **Doc fragment rot is starting.** 70 handoffs in 3 days. Indexes started; promotion phase must close before they become the next source of confusion.
3. **SYSTEM-010 only partially done** (pause/resume yes; decommission/dead-man/cost dashboard no). Has to be fully done before first agent.

If those three close on schedule alongside the Foundation closeouts (FUB → Owners → Finance → KPI → Marketing), Foundation will close clean and Strategy Hub will land on a real trust layer instead of a leaky one.

---

## Section 9 — What this auditor read vs didn't read

For transparency. Reviewing agents should weight findings against this scope.

**Read in full:**
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/rebuild/intelligence-pipeline.md`
- `docs/rebuild/current-runtime-map.md`
- `docs/rebuild/agent-architecture.md`
- `docs/rebuild/owners-closeout.md`
- `docs/rebuild/doc-cleanup-plan.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`
- `docs/specs/data-source-maturity-model.md`
- `docs/specs/2026-04-23-synthesis-engine-v1.md`
- `docs/specs/2026-04-23-auth-tiers-vault.md`
- Recent handoffs: `runtime-router-current-day-sync`, `subscription-router-and-intelligence`, `strategy-action-loop-correction`, `late-night-foundation-clean`, `plan-reset-after-regroup`, `old-system-shared-comms-audit`
- `package.json` (45 npm scripts), `lib/` inventory (13 files)

**Read partially or not at all:**
- `docs/specs/business-atoms-spec.md` — mentioned but I haven't opened it this pass
- `docs/handoffs/INDEX.md` — exists but not read
- `lib/foundation-db.js` — not opened (PostgreSQL schema)
- `server.js` — not opened (endpoint inventory)
- `docs/rebuild/rebuild-master-plan.md` — original master plan, not opened this pass
- `docs/strategy/*` — modular strategy docs not opened
- `docs/source-notes/*` — source-specific notes not opened
- `scripts/foundation-verify.mjs` — what the 24/24 actually checks, not opened

**Did not query:**
- Live PostgreSQL state on Mac Mini
- Live process state on Mac Mini
- LaunchAgent status
- Any actual data in the archive

A Mac-Mini-resident reviewer should verify schema claims against the database, endpoint claims against `server.js`, and `foundation:verify` content against the actual script. My evidence is from code + docs + handoffs, not live runtime.

---

## Closing

Foundation is closer to closing than I gave credit yesterday. The substrate is more sophisticated than the old system in every measurable way. The biggest concrete risks are not "Codex is going to build a Frankenstein" — they're "the privacy layer is on a different doc than the active plan" and "doc cleanup needs to close before it inverts." If you act on the three Tier B items (auth/tier/redaction temp gate, SYSTEM-010 completion, plan-promotion of the auth spec) before any Hub work begins, Foundation closes correctly.

Do not let anyone start Strategy Hub UI/feature work before Tier A and Tier B are done. That ordering is the whole game.
