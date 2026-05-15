# Foundation IA Rebuild — Game Plan

**ID:** FOUNDATION-IA-REBUILD-001
**Status:** Draft for review
**Owner:** Steve Zahnd
**Date:** 2026-05-15
**Reviewers:** Codex (main builder) · Old Claude Code (Tier-1 reviewer)
**Source audit:** All 34 new-system Foundation pages screenshotted under `/tmp/foundation-audit-2026-05-15/`; old-system `~/bcrew-buddy-reference` reviewed (6-pillar Foundation, 30+ dashboard surfaces, full marketing folder).

---

## 1. Why this exists

The new Foundation has 8 nav groups and 36 sections. Screenshot audit found 7 pages over 10,000px tall, 5 near-empty pages, 5 label collisions, a hidden breadcrumb parent ("Foundation Operations") that isn't in the nav, three different surfaces reporting "what changed," and one CSS grid bug that renders a system title one character per line. The mental model has drifted: Foundation has absorbed the Dev team's working surfaces (Backlog, Recent Work, Daily Summary, System Activity, Runtime Health) and a 40,000px Source Lifecycle engineering view. That's why "the pages are just so big and I don't even know what it all means or does."

This plan resets the boundary: **Foundation is the trunk; hubs plug in.** It maps every current page to a decision, lists what's missing, and sequences the work.

---

## 2. Core principle: Foundation is the trunk

Foundation owns what every hub needs to read. Hubs own the work they do with it.

The **silver-platter test** for any candidate page:
> "Would another hub (Marketing, Sales, Recruiting, etc.) need to read this when doing its job?"
> YES → Foundation. ONLY-ONE-CONSUMER → that consumer's hub.

Foundation = strategy + brand + data + system. The system is the engine; Foundation is its operating manual and its pantry. Hubs are the kitchen lines.

---

## 3. Foundation UP doctrine (new — load-bearing)

Foundation changes must propagate UP into every agent, hub, and surface at runtime. No hardcoded copies. No forks. No stale caches.

If brand guidelines change in Foundation → every content agent reads the new spec on next call.
If system strategy changes → every agent reads the new doctrine on next call.
If a data source contract changes → every downstream atom/synthesis/agent picks up the new contract.

**The old system's biggest mess:** Foundation docs would update, but agents had hardcoded copies and BS forks. Foundation became documentation theatre — true on paper, false in execution.

**Test of Foundation UP for any surface:** "If I change X in Foundation right now, can the system show me which downstream consumers will pick up the new value?" If no, propagation is broken — that's a runtime bug, not a UI bug.

Foundation UP is mostly a runtime architecture concern, not a UI concern. But the UI must reflect it: the canonical state has to be visible, and changes have to feel like they go somewhere.

---

## 4. Atom pool lives in Foundation

Foundation hosts the **atom pool** — the canonical business-intelligence units the whole system reads from. All atoms, retrieval, synthesis facts, synthesis engine, and action routing live in Foundation, not in hubs. Hubs *consume* intelligence; they don't run parallel synthesis.

Controlling spec: `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md` (the spine: REPORT-MINING → INTEL-ATOM-001 → RETRIEVAL-003 → SYNTHESIS-FACTS → SYNTHESIS-ENGINE → ACTION-ROUTER → Hub v2).

This is why Foundation is the "lifeblood feeding the hubs" — atoms produced once, consumed everywhere.

---

## 5. Foundation = 4 sections (down from 8 nav groups)

```
FOUNDATION
├── 1. STRATEGY    What we believe; where we're going
├── 2. BRAND       Locked spec hubs consume    (NEW — gap today)
├── 3. DATA        Sources + atoms + synthesis (the pantry, restructured)
└── 4. SYSTEM      Doctrine + registries + decisions + people
```

### 5.1 STRATEGY (keep, lightly trim)

Today's "Strategy docs" group is the gold-standard pattern. Keep:
- Strategy Packet (overview drill-in)
- BHAG Model (live data, year-by-year pace, green/red coloring)
- Core Values
- Agent Engine (live data)
- Department Mandates
- Governance
- MarketMasters

Plus from "System Strategy" group (rename, keep both):
- System Strategy (doctrine for the AI OS itself)
- Rebuild Plan

### 5.2 BRAND (new — biggest gap today)

Hubs cannot produce on-brand work without this. Source the canonical content from the old system's `docs/brand-guidelines.md`, `docs/brand-assets/`, and `docs/marketing/`.

Leaf pages:
- **Brand Guidelines** — colors (#000000, #0084C9, #FFFFFF, #EBEBEB), Stratum1 + Open Sans, logo rules, dashboard UI extensions (#ED1C24 etc.). Render the existing locked spec.
- **Brand Assets** — logos (web/print), font files, deck templates. With downloadable artifacts and the Google Drive source-of-truth links.
- **Voice Profiles** — `voice-profile.md` + attract + retain variants (3 voices).
- **Avatars / ICPs** — attract-avatars.md, retain-avatars.md, avatar-reference-brief.md.
- **Marketing Asset Registry** — the canonical inventory: bensoncrew.ca homepage/about/team/testimonials/careers/contact + 2 developments + 36 agent pages, HVH subdomain, 15+ community search pages, 4 Facebook pages, IG/LinkedIn/X/YouTube state, tracking pixel IDs (FB Pixel 704929865953118, GTM-KLR3NBFP), Google Business Profiles. Marketing Hub will *edit* these later; Foundation owns the *canonical record*.

### 5.3 DATA (restructure)

Today's Data Sources group is organized by **technical type** (Docs / Spreadsheets / APIs / Connectors / Lifecycle). Hubs don't read data that way. Restructure to **business categories**, matching how the old system did it (8 categories, 52 data points):

Leaf pages:
- **Sources by category** — People & Team / Sales & Production / Operations / Marketing & Content / Financial / Intelligence / Communication / Brokerage (Real Broker / reZEN). Status per row: CONNECTED / PARTIAL / NOT CONNECTED / NEEDS VALIDATION.
- **Connectors** — keep as the engineering layer (access paths). Connector ≠ trusted source; that's already a boundary the new system understands.
- **Lifecycle** — *demoted from peer*. Source Lifecycle is currently 39,518px. It's source-engineering depth, not a top-level surface. Live as drill-in under each category.
- **Atom Pool** *(new — when INTEL-ATOM-001 ships)* — canonical atoms with provenance, queryable by hub.
- **Synthesis Engine** *(new — when SYNTHESIS-FACTS / SYNTHESIS-ENGINE ship)* — computed intelligence the system stands behind.
- **Action Router** *(new — when ACTION-ROUTER ships)* — where actions go after approval.

### 5.4 SYSTEM (consolidate)

Leaf pages:
- **System Doctrine** (today's "System Strategy" + Rebuild Plan, grouped here).
- **Skills Registry** — what skills exist, what they do, where they live.
- **Plugins / MCPs Registry** — what plugins/MCPs are installed.
- **Agents Registry** — what agents exist with *honest status* (WORKING / DEGRADED / PLANNED / SHELL / IDLE — restore the old framing). Today's `capabilities-agents` is too thin; the old `agent-inventory.md` is the template (86 agents organized by team, each with status + owner + capabilities).
- **People** — Steve, Harlan, Crewbert, future profiles.
- **Decisions Ledger** — keep today's Decisions page (it's solid). Fold Open Questions into a tab here.
- **Repo Docs Inventory + Archive** — keep, demote from top-level. Useful for system engineers but not front-line.

---

## 6. Hub topology (Foundation's customers)

Foundation hands these the silver platter. Each hub adds working surfaces, not its own copy of the truth.

| Hub | Owner | Reads from Foundation | Owns (working surfaces) | Status |
|---|---|---|---|---|
| Strategy Hub | Steve + John Kitchens | Strategy / Decisions / Data | Quarterly priorities, strategic issues, dept reviews | Partial — `/strategic-execution` exists |
| Marketing Hub | Tanner | Brand / Voice / Avatars / Asset Registry / Data › Marketing | Content pipeline, campaigns, asset production, video lab | Stub — Video Lab WIP only |
| Sales Hub | Nick | Data › Sales / People / Brand | Deals, agent production, KPI scoreboard | Not built |
| Recruiting Hub | Scott | Data › People / Brand / Voice | Attract pipeline, agent acquisition, mentor mapping | Not built |
| Retention Hub | Georgia | Data › People / Decisions | Agent risk, intervention queue, departure tracking | Not built |
| Ops Hub | Carson | Data › Operations / Decisions | Admin/Conditional/FUB drift cleanup, owner queues | Exists at `/ops` |
| Dev / Build Hub | Codex | System Doctrine / Skills / Plugins / Agents Registry | Backlog, Recent Work, Daily Summary, System Activity, Runtime Health, ship gates | **Currently jammed into Foundation** |
| Finance Hub | Ahsan | Data › Financial / Decisions | Revenue, costs, margin tracking | Not built |

**Key move:** Carve Dev/Build Hub out of Foundation. Backlog, Recent Work, Daily Summary, System Activity, Runtime Health move to Dev Hub. Foundation may surface a read-only roll-up (e.g., "Build state: 12 P1 cards in-flight; 3 probes degraded") but the working surfaces leave.

---

## 7. Current state → proposed disposition (every page)

Decision codes: **KEEP** · **KEEP+TRIM** (kill chrome) · **MERGE** (combine with another surface) · **MOVE-TO-HUB** · **DEMOTE** (becomes drill-in, not peer) · **KILL** (remove entirely) · **NEW** (does not exist today)

### Foundation group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| Overview (current-state) | KEEP+TRIM | Becomes "Foundation Home" — canonical state snapshot. Kill the "Page Job 3-card" + "Operator Tools" chrome. Pull live data; surface "system grade" + "what changed" + "what needs attention" per the CEO dashboard pattern. |
| Systems | KEEP+TRIM + **FIX BUG** | Service-area map is useful. Bug on "Agent Onboarding Feedback System" row: long sentence in `source-tag-neutral` collapses CSS grid to 0px. Two fixes: (1) status pills get `max-width` + `overflow-wrap: break-word`; (2) grid uses `minmax(min(290px, 100%), auto) auto` not `auto auto`; (3) data: stop routing descriptions into tag slots. |
| Backlog | MOVE-TO-HUB | → Dev/Build Hub. Foundation may show a read-only roll-up. |
| Recent Work | MOVE-TO-HUB | → Dev/Build Hub. |
| Daily Summary | MOVE-TO-HUB + MERGE | → Dev/Build Hub, merge into Activity with day-picker. |
| Runtime Health | MOVE-TO-HUB + DEMOTE | → Dev/Build Hub. 22,873px / 23 probes is a tester's dashboard. Surface a one-line health pill on Foundation Home. |

### Review queues group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| Decisions | KEEP+TRIM | Strong page. Trim Page Job chrome. |
| Open Questions | MERGE | → into Decisions as a tab. 0 open today; doesn't deserve top-level. |
| System Activity | MOVE-TO-HUB + MERGE | → Dev/Build Hub Activity. Third "what changed" surface; collapse with Recent Work + Daily Summary. |

### Data Sources group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| Overview (source-overview) | RESTRUCTURE | Becomes "Data" hub page with 8 business-category drill-ins. 18,508px → split. |
| Docs | RENAME + MERGE | Rename to "Source Docs" to disambiguate from Inventory › Repo Docs. Fold into Data › Marketing & Content (it's 1 source contract). |
| Spreadsheets | RESTRUCTURE | Cross-tag rows into the 8 business categories. Workbook-level access path stays as a detail field. |
| APIs and apps | RESTRUCTURE | Same — 14 systems get cross-tagged into business categories. |
| Connectors | KEEP | Engineering layer. Useful as-is, demote from peer to sub-section under Data. |
| Lifecycle | DEMOTE | 39,518px engineering view. Move under Data as deep-drill, not a peer. |

### System Inventory group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| Current Docs | RENAME + DEMOTE | Rename "Repo Docs" (collision with Data › Docs). Move under System as drill-in. |
| Archive / History | KEEP + DEMOTE | Move under System. |
| Skills | KEEP+TRIM | Move under System › Skills Registry. |
| Plugins and MCPs | KEEP+TRIM | Move under System › Plugins Registry. |
| Agents (capabilities) | KEEP + EXTEND | Move under System › Agents Registry. **Extend to honest-status framing** (WORKING / DEGRADED / PLANNED / SHELL / IDLE) from the old `agent-inventory.md`. Today's page shows ~3 entries; the real registry has more (incl. all "planned" agents). |

### Strategy docs group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| Strategy Packet (overview) | KEEP | Gold-standard pattern. Untouched. |
| BHAG Model | KEEP | Live data, pace, red/green. Untouched. |
| Core Values | KEEP | Untouched. |
| Agent Engine | KEEP | Live data, required-agent path, this-year/next-year card. Untouched. |
| Department Mandates | KEEP | Untouched. |
| Governance | KEEP | Untouched. |
| MarketMasters | KEEP | Untouched. |

### System Strategy group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| System Strategy (doctrine) | KEEP | Move under System › System Doctrine. |
| Rebuild Plan | KEEP | Move under System › System Doctrine. |

### People and agents group (top-level today)
| Section | Decision | Why / where |
|---|---|---|
| People Overview | KEEP+TRIM | Move under System › People. |
| Steve | KEEP | Profile page; under System › People. |
| Agent Model | KEEP | Move under System › Agents Registry as the *model* doc; ties to honest agent inventory. |
| Harlan | KEEP | Profile under Agents Registry. |
| Crewbert | KEEP | Profile under Agents Registry. |

### New pages to build (do not exist today)
| Section | Why |
|---|---|
| **Brand Guidelines** | Hubs need locked brand spec to render anything on-brand. |
| **Brand Assets** | Hubs need downloadable logos / fonts / decks. |
| **Voice Profiles** | Marketing + Strategy + Recruiting reference these. |
| **Avatars / ICPs** | Marketing + Sales + Strategy reference these. |
| **Marketing Asset Registry** | Single inventory of all owned web/social properties. |
| **Atom Pool surface** | Canonical INTEL-ATOM-001 output, queryable, with provenance. |
| **Synthesis Engine surface** | Computed facts the system stands behind. |
| **Action Router surface** | Where approved actions flow to real owners. |

---

## 8. Universal chrome to kill across the board

Patterns that appear on 12+ pages today and cost real density / visual signal:

- **"Page Job" 3-card explainer** (Page Job / Live Backing / Boundary) — useful first time, noise every other visit. Move to a one-line page subtitle or a `?` tooltip. Saves ~250–400px per page.
- **"Operator Tools — Collapsed until needed"** strips — universally collapsed. Remove the visible stub; surface controls via a button when relevant.
- **"Strategy Change Watch / This doc change queue and history"** footers on every Strategy doc page — always 0/0/neutral. Show only when non-zero.
- **Repeated row descriptions** ("Preserved history kept reachable without crowding the current-doc view." on every Archive row) — single explanation in the page header, not per-row.

Net effect: the average page shrinks 20–40% with zero data loss. The Strategy docs (which already lack this chrome) become the visual template the rest converges toward.

---

## 9. What carries forward from the old system (the good ideas)

- **6-pillar mental model** — was conceptually right. Maps to the new 4-section trunk (Strategy / Brand / Data / System) with Strategy and System absorbing pillar 1 + 2 + 4, Data absorbing pillar 6, Brand as a new pillar, and the rest folded under System.
- **Single Foundation page that drills into the truth docs** — old `source-of-truth.js` was one clean page. The new system's Strategy Packet pattern is the modern equivalent. Extend that pattern to the other three sections.
- **Honest agent status** (WORKING / DEGRADED / PLANNED / SHELL / IDLE) — restore from `agent-inventory.md`.
- **Business-category data registry** — restore the 8-category shape from `business-data-sources.md`.
- **Live data pull on doctrine pages** — BHAG Model and Agent Engine already do this. Worth extending to any Foundation page that surfaces business state.
- **Decision ledger with provenance** — the new Decisions page is already better than the old `decisions-log.md`. Keep.
- **Help / Legends panel** — the old system had a "?" panel with grade/status/priority/pipeline definitions. Re-add as a Foundation-wide help drawer so the legend is one place, not embedded on every page.

---

## 10. What we don't repeat from the old system (anti-patterns)

- **86 unmaintained agents** — restore *honest status*, not the count. Most old agents were SHELL or IDLE. Foundation should show *what's real*, not what was planned.
- **Hardcoded Foundation values in agent code** — Foundation UP propagation must be the rule; runtime reads only.
- **Split-brain VPS / local** — N/A in current architecture (single Mac mini), but the propagation discipline matters wherever any cache lives.
- **Markdown-only registries** — old pillars 4–6 were docs. New system already moved data sources, decisions, skills, plugins, and agents into DB-backed surfaces. Continue that.
- **Documentation theatre** — every Foundation surface must answer "what reads this at runtime?" If nothing does, the surface is decoration.

---

## 11. Build order (suggested phasing)

Each phase is a backlog card; each card scopes → plans → reviews → executes per Tier-1 quality-gating doctrine.

| # | Phase | Scope | Why first/later |
|---|---|---|---|
| 0 | **Kill the noise** | Strip Page Job 3-cards, Operator Tools strips, empty Change Watch footers across all current Foundation pages | Lowest-risk visible win; no IA change required; lifts visual quality on existing pages immediately. |
| 1 | **Fix the P0 Systems bug** | CSS grid fix + tag-pill `max-width` + stop routing descriptions into tag slots | Pages currently unreadable on that row. |
| 2 | **Restructure top nav** | 8 groups → 4 sections (Strategy / Brand / Data / System). No content moves yet; just labels and grouping. | Cheap. Resets mental model before content work. |
| 3 | **Carve out Dev/Build Hub** | Move Backlog, Recent Work, Daily Summary, System Activity, Runtime Health to a new `/build` (or `/dev`) surface. Foundation Home gets a read-only roll-up. | Largest single boost to Foundation clarity. Requires hub scaffolding. |
| 4 | **Build Brand section** | Brand Guidelines, Brand Assets, Voice, Avatars, Marketing Asset Registry. Source content from `~/bcrew-buddy-reference/docs/brand-guidelines.md` + `docs/marketing/`. | Unblocks Marketing Hub when it ships. |
| 5 | **Restructure Data by business category** | Sources by category (8 lanes). Lifecycle and Connectors demote to sub-pages. APIs/Sheets/Docs collapse from peer pages into category drill-ins. | Aligns with how hubs actually consume data. |
| 6 | **Foundation Home redesign** | Apply CEO dashboard pattern: capabilities + system grade + recent improvements + what needs attention. Use BHAG-page visual standard (live data, red/green, source-traceable). | The front door. Done last among visible pages so it can pull from the cleaned sections. |
| 7 | **Honest agent inventory restoration** | Extend `capabilities-agents` to the full registry with WORKING/DEGRADED/PLANNED/SHELL/IDLE statuses. Pull from `lib/foundation-db.js` agent registry. | Needs registry table + UI. |
| 8 | **Atom Pool / Synthesis / Action Router surfaces** | Build the three spine surfaces under Data, once INTEL-ATOM-001 and downstream ship. | Sequenced behind `[[project_spine_sequence]]`. |
| 9 | **Foundation UP propagation wiring** | Audit every agent codebase for hardcoded Foundation values; replace with runtime reads from Foundation contracts. Add propagation audit probe. | Mostly backend; runs alongside UI work. |
| 10 | **Visual polish** | Iconography on cards, KPI sparklines, density tuning. Apply to non-Strategy pages so they catch up to BHAG/Agent Engine's visual standard. | Last; rest on top of the new IA. |

Phases 0–2 are safe to do in parallel; phases 3+ should sequence.

---

## 12. P0 bug — for inclusion in the first backlog card

**Page:** `/foundation#systems`, row "Agent Onboarding Feedback System"
**Symptom:** Title text renders one character per vertical line; row unreadable.
**Root cause:**
1. **Data:** `.source-card-tags > .source-tag-neutral` slot contains a full descriptive sentence ("Production initial feedback send and live reminders are governed with duplicate ledgers, repair state, and Runtime/Ops visibility") as a 752px-wide inline pill instead of a 1–2-word status label.
2. **CSS:** `.foundation-system-summary` grid uses `grid-template-columns: auto auto`, so the unbreakable wide tag pushes the right column to 962px and collapses the left (title) column to 0px.
3. **CSS:** `.source-tag` lacks `max-width` and `overflow-wrap: break-word`, so even when content is wide the pill doesn't wrap.

**Fixes (any one resolves the visual; all three are correct):**
- Stop routing descriptions into tag slots — that field is a status pill, not a paragraph.
- Add `.source-tag { max-width: 100%; overflow-wrap: break-word; }`.
- Change `.foundation-system-summary { grid-template-columns: minmax(min(290px, 100%), auto) auto; }`.

**Evidence:** `/tmp/foundation-audit-2026-05-15/02-systems.png`. DOM diagnostic shows row 7 grid resolves to `0px 962px`.

---

## 13. Open questions (decisions only Steve can make)

These don't have a "correct" answer; they need a call before Codex starts swinging.

1. **Backlog dual-surfacing.** When Backlog moves to Dev/Build Hub, does Foundation Home show a read-only roll-up ("12 P1 in flight, 3 needs review") or no surface at all?
2. **Marketing data split.** Brand guidelines and locked spec → Foundation, confirmed. What about *campaign drafts* and *content pipeline state* — do they belong in Foundation Brand or only in Marketing Hub?
3. **Strategy Hub split.** Strategy Packet docs live in Foundation. What about *Q2 priorities* and *strategic issues* — do they move to Strategy Hub when it ships, or stay in Foundation since every hub reads them? Current `/strategic-execution` exists outside Foundation, suggesting the split is already partially made.
4. **Atom Pool naming.** "Atom Pool" or "Intelligence Pool" or "Facts" or "Knowledge Base" in the UI? Internal naming is fine; surface naming should be the term operators will use.
5. **Honest agent registry visibility.** Today's `capabilities-agents` shows a handful. The full registry (per old `agent-inventory.md`) has 86 agents, most PLANNED/SHELL. Do we surface the full honest list (warts and all) or filter to "anything in WORKING/DEGRADED state plus the next planned slice"?
6. **Dev / Build Hub naming.** "Dev Hub" implies developers; "Build Hub" implies the build pipeline. "Engine Hub"? "Ops Hub" is taken. Steve's call.
7. **Foundation UP audit cadence.** Should there be a daily probe that lists agents/surfaces with stale or hardcoded Foundation values, or only an on-demand audit?
8. **Marketing Asset Registry source.** Is the old `marketing-asset-inventory.md` (crawled 2026-03-08) still accurate, or does it need a re-crawl before being surfaced as canonical?

---

## 14. Done = means

A successful Foundation rebuild ships when:
- Every Foundation surface answers "what reads this at runtime?" with at least one downstream consumer.
- A change to any Foundation page can demonstrate which agents/hubs picked it up (Foundation UP visible).
- The four sections (Strategy / Brand / Data / System) hold; no page lives outside them.
- Dev/Build Hub holds all build-time surfaces; Foundation contains zero build-workflow pages.
- Marketing Hub (when built) reads its brand/voice/avatars/asset registry exclusively from Foundation. No copies.
- Page-level chrome (Page Job 3-cards, Operator Tools, empty Change Watch) is gone from every operational page.
- The P0 Systems-page bug is fixed and no similar grid collapse exists.

---

## 15. Appendix — audit evidence

**New-system screenshots:** `/tmp/foundation-audit-2026-05-15/01-home-current-state.png` through `34-agent-crewbert.png` (full pages of every current Foundation nav entry).

**Old-system reference:** `~/bcrew-buddy-reference/`
- `docs/brand-guidelines.md` — locked brand spec
- `docs/brand-assets/` — logos, reference imagery
- `docs/marketing/` — brand-guidelines, voice profiles (3), avatars, asset inventory, playbook, platform constraints, references
- `docs/business-data-sources.md` — 52 data points, 8 business categories
- `docs/system-capabilities.md` — 626-line capabilities map
- `docs/agent-inventory.md` — 86 agents with honest status
- `docs/business-strategy.md` — pillar 1 (300 lines, unified)
- `dashboard/public/source-of-truth.js` — old "Foundation" page (one surface, 6 pillars)

**Page-height census (px), new system:**

| Tier | Pages |
|---|---|
| Mega (>10k) | Recent Work (15k), Daily Summary (12k), System Activity (13k), Runtime Health (23k), Source Lifecycle (40k), Data Sources Overview (18k), Rebuild Plan (~17k) |
| Mid (3–10k) | Systems (~7k), Backlog (~3.8k), Decisions (3.3k), Inventory Docs (4.2k), Skills (3k), Plugins (3.4k), Governance (5k), System Strategy (4.9k), BHAG (2.7k), Agent Engine (3.3k), Departments (2.6k), APIs and apps (7.3k) |
| Small (<3k) | Strategy Packet (2.2k), Core Values (1.3k), MarketMasters (1.5k), Agents-capabilities (2.5k), Archive (1k), People Overview, Steve, Harlan, Crewbert, Agent Model |
| Near-empty (<1.5k) | Open Questions (0.9k), Source Docs (1k), Spreadsheets (1.1k), Connectors (1k) |

---

## 16. Reviewer ask

**Codex (main builder):** Review phases 0–2 first — they're the safest. Confirm: (a) the chrome-kill list is correct and doesn't break any data binding; (b) the P0 grid fix is the minimal correct change; (c) the 8 → 4 nav restructure can be done as labels-only first, with content moves following per phase.

**Old Claude Code (Tier-1 reviewer):** Audit this plan against the old-system experience. Particularly: (a) is the 4-section Foundation actually a covering set for what hubs will read, or are we missing a category? (b) is the Foundation UP doctrine correctly framed as a runtime concern, or am I treating it as UI? (c) is the build order resilient if a phase slips (e.g., if INTEL-ATOM-001 lands later than expected, does phase 8 still hold)?

End of plan.
