# BCrew AI OS Current State

Last updated: 2026-04-23
Purpose: one short answer to "what is actually closed, what is still partial, and what closes next?"

Rule: if a package depends on open live inputs or open parity work, the package is still open even if part of it is signed off.

## Level Guide

| Level | Meaning |
| --- | --- |
| Level 1 | The system can reach and read the source. |
| Level 2 | The trusted unit and meaning are reviewed and signed off. |
| Level 3 | Refresh cadence and stale-state visibility are explicit. |
| Level 4 | Approved writes and governed automation are live. |

## Foundation Surfaces

| Surface | State now | What exists now | Next to close | Later |
| --- | --- | --- | --- | --- |
| Strategy packet | Open now | `SRC-STRATEGY-001` is signed off. Freedom Community, BHAG, and Agent Engine are now captured for current reality. The packet now also has a visible strategy-change watch surface for pending doc proposals and applied-history visibility. The first decision-provenance model is live, the first decision-to-doc traceability layer is live, the first decision-linked strategy change ledger with doc-scoped annotations is live, and the first contradiction / cleanup review queue is live too, so decisions, doc proposals, and change events can now be read together instead of as separate fragments. The package is still open because it depends on the strategy-used slice of `SRC-OWNERS-001` and one explicit `SOURCE-014` closeout. | Finish the strategy-used Owners slice and close `SOURCE-014` at the package level. | Then deepen Freedom drift monitoring, source-backed value hardening, temporal truth, richer relationship cleanup, and richer inline annotations if needed. |
| System strategy | Done now | Doctrine and boundaries are visible. | None now. | Update only when doctrine changes. |
| Rebuild visibility | Done now | Current State and Rebuild Plan are live in repo and site. | Keep aligned with backlog truth. | Do not let side docs drift away from this page. |
| Verification baseline | Done now | `npm run foundation:verify` exists, is passing again, includes `npm run sheets:verify`, and Current State now shows the live sheet-structure watch for Freedom, Owners, and old KPI. | Keep the visible watch aligned with the verifier baseline. | Add checks only when new source surfaces close. |
| Owners Admin package | Open now | `SRC-OWNERS-001` is signed off for meaning. The first governed review path is now proven: Owners row -> FUB person -> ClickUp roster -> Drive contract package (`T#26100` / Matt Allman). Both temporary review lanes now have real row-scoped runners behind them: firm / exception deals in `ADMIN ONLY - Deal Data Entry!CC:CE` and conditional rows in `Listings and Conditional Deals!Q:U`. One combined governed inbox now exists at `/api/owners/review-queue`, FUB taxonomy drift lands in that same queue, Owners governed-dropdown drift is queue-ready, and the first fresh / warning / stale guardrails now age those governed lanes explicitly instead of leaving them timeless. What remains open is productizing the full parity, contract-registry, deeper cleanup, and the strategy-used Owners slice. | Close the Owners package in this order: `SOURCE-008`, `DATA-005`, `DATA-006`, `DATA-007`, `DATA-008`, `DATA-009`, with `FINANCE-002` supplying the first governed contract packages. | Then reuse this freshness pattern on more source layers. |
| FUB lead-source taxonomy | Open now | `SRC-FUB-001` review layer is live. Flexible open values stay visible. The first drift layer is now live too: new-name / open-classification / legacy-name / governed-missing buckets, stale snapshot age, drift change events, and freshness status for the current governed review state. | Finish the Level 2 baseline. | Then add issue routing and wider cross-source drift handling. |
| Finance sign-off | Open now | `SRC-FINANCE-001` is partially reviewed, not signed off. | Close `FOUNDATION-003` after FUB. | Then define freshness expectations. |
| KPI foundation system | Open now | `SRC-SUPABASE-001` is verified readable. KPI is live, but AI OS has not yet locked which truth layer to read for pipeline, shopping list, executed deals, goals, competition, and app usage. | Use `SOURCE-010` to split KPI into explicit read rules for `persons` / `appointments`, `leads`, `deal_data`, goals tables, competition tables, and `users_activity`. | Then add health checks, visible freshness, and future sales-hub extension surfaces. |
| Shared communications intelligence | Open now | `SRC-GMAIL-001`, `SRC-GCAL-001`, `SRC-MISSIVE-001`, `SRC-SLACK-001`, and `SRC-MEETINGS-001` are now verified readable. The current repo can now read Gmail, Calendar, Missive inbox/thread/comment context, Slack channels and thread history for channels the existing bot is actually in, scan Google Meet artifacts across the enabled delegated BCrew user list with paginated Drive reads, detect standalone transcript docs or transcript sections embedded inside Gemini notes, archive Gmail threads, Missive threads, Slack threads, meeting-note artifacts, and meeting-transcript artifacts into Postgres, mirror organized meeting copies into Crewbert Drive in copy mode, tag meetings `broadcast` vs `discussion`, report transcript gaps, and surface governed candidate lanes for meetings, Gmail, Missive, and Slack with Foundation context plus the first apply paths. Current archive depth is `2,182` Gmail threads, `2,246` Missive threads, `1,371` Slack threads, and `1,498` meeting artifacts. Gmail now reaches `2026-03-24`, Missive reaches `2026-03-23`, Slack reaches `2026-01-27`, recovered meeting text reaches `2024-10-03`, and meeting transcripts reach `2025-03-12`. Batch synthesis now persists runs and ranked items in PostgreSQL, is exposed through the Foundation snapshot/API, and the latest proof includes source-backed operating facts from strategy/BHAG/Owners/backlog/open-question/change-event state. Coverage is also now inspectable through Foundation and `npm run shared-comms:coverage`. What remains open is durable cursor-based Gmail/Missive backfill control, cross-source normalization, the last channel-rollout gaps, the full subject-person privacy/query layer, richer KPI/finance/FUB fact grounding, broader apply/read flows, and the synthesis layer that decides what is still live versus already resolved. | Close `SOURCE-019`, `SOURCE-020`, `COMMS-BACKFILL-001`, `SYNTHESIS-FACTS-001`, and `SYNTHESIS-ENGINE-001` by stabilizing the archive, adding durable backfill state, deepening strategy/KPI/finance/source-fact grounding, then promoting the first ranked synthesis output into a repeatable strategy/leadership packet. | Keep widening extraction types, apply flows, and channel coverage after the first governed paths stay stable. |
| Marketing source map | Open now | `SRC-META-001`, `SRC-GHL-001`, and `SRC-DATAFORSEO-001` are now verified readable. The old system proved the four-pillar marketing model and the multi-account reality across current and legacy brand assets. What remains open is the lane-owned source map, the broken Google marketing auth path, the SocialPilot enterprise auth context, and clear separation between Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters. | Close `SOURCE-016` by locking the real account/property map, fixing the Google auth break, validating SocialPilot auth, and separating current vs legacy assets by lane. | Then promote GA4 / Search Console / GBP / YouTube / remarketing audience surfaces into explicit source contracts and later marketing-hub inputs. |
| Shared freshness rules | Later | The first rule set now exists for the Owners / FUB governed layer only. The wider cross-source stale-state model is still not defined. | Reuse the new guarded pattern after strategy, FUB, and finance close at Level 2. | Use it to drive broader stale badges and cadence. |

## Execution Order

1. Keep truth and verification stable.
2. Close the first usable shared-communications source layer.
3. Build the synthesis layer above that archive.
4. Close the strategy truth boundary.
5. Close finance and KPI source meaning.
6. Close the marketing lane/account map.
7. Reuse the first freshness pattern across more sources.

## Active Plan Docs

Treat these as the only live plan surfaces:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`

Everything else is supporting archive unless promoted here.

## Keep The Boundary Clean

### Foundation now

- understand the source
- define the source boundary
- verify the source
- sign off the meaning
- expose what is done and open

### Future hub work

- coaching
- reminders
- data-entry enforcement agents
- ops accountability loops
- sales assistants
- manager nudges

Examples:

- FUB stage and opportunity rules = Foundation now
- FUB assistant that tells an agent to clean up their pipeline = Future Sales Hub
- KPI truth-layer map = Foundation now
- KPI coach that texts an agent about shopping-list quality = Future Sales Hub
