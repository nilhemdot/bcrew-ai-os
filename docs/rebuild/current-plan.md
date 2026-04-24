# BCrew AI OS Rebuild Plan

Last updated: 2026-04-23
Status: Active

Use this doc for one question:

- what are we doing right now

Use [Current State](current-state.md) for the short read.
Use [Intelligence Pipeline Operating Model](intelligence-pipeline.md) for how archives, extractors, synthesis, briefs, and future agents fit together.

## Locked Now

- Mac Mini stays the machine.
- Foundation-first stays the build order.
- OpenClaw stays the planned runtime for the later live-agent layer.
- strategy docs stay canonical for narrative meaning
- live values come from source-backed surfaces, not markdown snapshots
- Harlan is a personal agent, not the whole OS
- we are not switching to Mark Kashef's stack
- we are not turning on a large agent swarm during Foundation

## What Counts As Done Right Now

| Surface | Current | Done now | Later |
|---------|---------|----------|-------|
| `SRC-STRATEGY-001` | `Level 2` | yes | `Level 3` drift monitoring + decision-linked change visibility |
| `SRC-FREEDOM-COMMUNITY-001` | `Level 2` for current reality | yes for current-reality capture | package closeout, then `Level 3` |
| `SRC-FREEDOM-BHAG-001` | `Level 2` for current reality | yes for current-reality capture | package closeout, then `Level 3` |
| `SRC-FREEDOM-ENGINE-001` | `Level 2` for current reality | yes for current-reality capture | package closeout, then `Level 3` |
| `SRC-FUB-001` | `Level 1` | no | target `Level 2`, then `Level 3` |
| `SRC-FINANCE-001` | partial `Level 2` | no | finish `Level 2`, then `Level 3` |
| `SRC-SUPABASE-001` | `Level 1` live readable | no | split KPI into explicit truth-layer read rules |
| `SRC-OWNERS-001` | `Level 2` | yes for meaning | `Level 3` freshness + parity checks |
| `SRC-GMAIL-001` | `Level 1` live readable | yes | route into the first governed shared-communications slice |
| `SRC-GCAL-001` | `Level 1` live readable | yes | route into the first governed shared-communications slice |
| `SRC-MISSIVE-001` | `Level 1` live readable | yes | route into the first governed shared-communications slice |
| `SRC-MEETINGS-001` | `Level 1` live readable | yes | sign off archive contract + govern the first extraction path |

## Current Execution Order

1. keep truth and verification stable
2. close the first usable shared-communications source layer:
   - Gmail, Calendar, Missive, Slack, and meeting reads are already live
   - archive depth is now real enough to use, and live counts belong in the shared-comms coverage job/dashboard instead of this plan
   - recovered historical Zoom chats and transcribed historical Zoom audio now contribute merger-era meeting context back to October 2024
   - Gmail/Missive raw archives have been materially deepened; keep exact oldest/newest windows in the coverage job instead of this static plan
   - keep Gmail / Missive history widening with chunked/cursor backfills instead of pretending the first bounded batches are full 180-day coverage
   - split live current-day sync from historical corpus crawl so the system stays fresh while it works backward through old data one safe bite at a time
   - first Foundation job registry + DB run ledger is now being used to move current sync, coverage, verification, transaction review, transcript-gap, and synthesis routines out of builder chat
   - keep meeting transcript enforcement tightening
   - keep Slack rollout explicit instead of assuming universal readability
3. build the missing synthesis layer on top of that shared archive:
   - `SOURCE-019`
   - `SYNTHESIS-ENGINE-001`
   - `COMMS-BACKFILL-001`
   - `EXTRACTION-TEAM-001`
   - `DRIVE-CORPUS-001`
   - `SKOOL-001`
   - `SYNTHESIS-FACTS-001`
   - cross-artifact linking
   - resolution detection
   - cross-source dedup
   - staleness scoring
   - actionability ranking
   - source-backed fact grounding from strategy, KPI, finance, Owners, FUB, marketing, and source contracts
   - first proof = useful strategy packet, not raw candidate dump
   - current proof = persisted synthesis run + `docs/handoffs/2026-04-23-shared-comms-synthesis-source-facts-proof.md`
   - latest proof now stores runs/items in PostgreSQL and includes source-backed facts from strategy/BHAG/Owners/backlog/open-question/change-event state
4. close the strategy truth boundary before Strategy Hub:
   - `SOURCE-014`
   - the strategy-used Owners slice
   - keep the strategy packet and rebuild docs aligned to the real queue
5. close the remaining source-signoff surfaces that still block strategy trust:
   - `SOURCE-008`
   - `FOUNDATION-003`
   - `SOURCE-010`
6. close the marketing source map by real brand lane, not fuzzy legacy buckets:
   - `SOURCE-016`
   - split Benson Crew, Zahnd Team Ag, Steve Zahnd, and MarketMasters cleanly
   - prove which assets/accounts still authenticate
   - prove which legacy Zahnd-era assets still belong in live BCrew truth
   - fix Google marketing auth
   - finish SocialPilot auth validation
7. keep the governed Owners review engine moving, not more open-ended manual audit work:
   - row-scoped Admin review runner is live
   - row-scoped conditional review runner is live
   - review status + re-review path are live in the temporary sheet lanes
   - one governed Owners inbox API is now live:
     - `/api/owners/review-queue`
   - grouped finding buckets instead of one-off founder memory
   - promote that inbox from API truth into a visible Ops / Foundation surface
   - FUB drift findings now land in that same queue
   - Owners governed dropdown drift can land in that same queue when it is not clean
   - use manual review only to prove or tune the rules
8. close the Owners package as an integrated closure, not a sheet-only closeout:
   - `SOURCE-008`
   - `DATA-005`
   - `DATA-006`
   - `DATA-007`
   - `DATA-008`
   - `DATA-009`
   - supporting doctrine: `FINANCE-002`
   - shared-communications read layer now live inside this closure:
     - `SOURCE-001` Gmail verified readable
     - `SOURCE-002` Calendar verified readable
     - `SOURCE-006` Missive verified readable
     - `SOURCE-018` Meeting notes verified readable
   - next bounded slice inside this closure:
     - `SOURCE-019`
     - `SOURCE-020`
     - raw Gmail-thread archive is now live
     - raw Missive-thread archive is now live
     - raw meeting-note archive is now live
     - raw meeting-transcript archive is now live
     - first pending transcript-first candidate lane is now live
     - normalize one shared communication record across more surfaces
     - add the next governed extraction path after the first candidate lane proves out
   - first governed outputs:
     - contract registry starter entries
     - `Ops Hub -> Deal Review Inbox`
     - re-review path after source fixes
9. build shared change / drift infrastructure for governed sources:
   - source-list drift
   - spreadsheet structure drift
   - strategy / decision change visibility
   - visible stale-state and re-review triggers
   - first live slice now exists:
     - FUB lead-source drift panel
     - Owners governed lead-source dropdown drift panel
     - stale snapshot age
     - change-event logging for drift detected / cleared
      - strategy packet / strategy-doc change watch panel
      - visible pending strategy doc proposals and recent doc-update history
      - Current State sheet-structure watch for Freedom, Owners, and old KPI
      - Current State summary showing the first live decision cleanup / contradiction queue
      - Decisions page review queue for proposed items, traceability gaps, broken supersede links, missing provenance, and possible overlap candidates
      - first decision-provenance fields now live in the decision model:
        - decision owner
        - confirmed by
        - participant list
        - context ref
        - evidence notes
10. extend the shared communications layer after the first governed slice proves out:
   - `SOURCE-003` broader Drive hardening
   - `SOURCE-005` Slack channel-rollout and extraction hardening
   - widen extraction types only after archive + normalization + first decision path are stable
11. build the shared business-atoms layer in Foundation:
   - `STRATEGY-001`
   - atoms are shared evidence first
   - hubs add overlays instead of rebuilding ingestion
12. define the first overlay and scoper model:
   - `STRATEGY-006`
   - `SYSTEM-012`
   - marketing keeps the locked `10` RETAIN + `5` ATTRACT avatar model as the first heavy overlay
13. mine old intelligence reports and salvage doctrine intentionally:
   - `REPORT-MINING-001`
   - use the old scout/executive/director report families as synthesis references, not runtime architecture
   - preserve the old feedback-scout / director-brief output shapes as synthesis patterns, especially:
     - decisions
     - action items
     - bottlenecks
     - escalation-worthy issues
     - suggested owner
     - suggested next action
     - ranked findings with evidence
14. extend the first freshness pattern into shared `Level 3` rules across more sources
15. clean backlog ownership and the research lane
16. only then turn on the narrow memory baseline and the first trusted loop
17. only after the governed engines are stable and `SYSTEM-010` process supervision / kill switches are real, build the first narrow operating agent on top of them

## Current Work Mode

Right now:

- build the system
- do small proof audits only when they sharpen the system rules

Not right now:

- sitting with Steve to manually audit hundreds of rows
- building a full agent before the governed review and drift layers exist

Rule:

- if a manual audit does not improve the engine, stop doing it
- if the same finding repeats, turn it into code, queue logic, or drift monitoring

## Foundation Now vs Future Hubs

### Foundation now

- strategy package closeout
- Owners package closeout
- FUB source meaning, parity rules, and taxonomy baseline
- finance source meaning and sign-off
- KPI read rules by truth layer
- shared communications memory inputs:
  - email
  - calendar
  - drive docs / notes
  - meeting notes / transcripts
  - Slack / shared inbox layers where relevant
- shared communications intelligence work:
  - synthesize emails, comments, Slack, and meeting notes into tasks, decisions, blockers, and follow-through suggestions
- business atoms:
  - Foundation stores approved shared evidence atoms
  - hubs read those atoms through overlay models instead of building duplicate source readers
- shared verification and later freshness rules

Google rule:

- Google Workspace sources should use the delegated Google path as the canonical foundation standard.
- App connectors are fallback / temporary access paths, not the primary doctrine.
- Missive stays as the shared inbox layer.
- Google Workspace meeting-note output stays as the meeting source layer.

### Future hub work

- sales coaches inside KPI / FUB
- FUB cleanup assistants acting for agents
- ops accountability loops driven by Admin-tab and FUB parity
- support-network and past-client coaching flows
- shopping-list and appointment watchdog agents
- agent texting, email-reading, and manager nudging behavior

Rule:

- if the work helps AI OS understand a source correctly, it is Foundation
- if the work tells people what to do, nudges them, or acts inside a department workflow, it is Hub work
- shared communications collection and memory = Foundation
- shared atoms = Foundation
- hub overlays and Scopers = bridge layer between Foundation and later acting agents
- department-specific acting on those communications = Hub work

## Current Open Work

- the broader strategy-input package is no longer a separate first move; the remaining strategy-used Owners slice closes inside the package-level strategy boundary work
- FUB is readable and editable for taxonomy rules, but not signed off
- the first live cross-system deal proof now exists (`T#26100` -> FUB -> ClickUp -> contract), but it still needs to become governed system behavior
- finance is still not line-by-line signed off
- KPI is live and readable, but AI OS still has not locked which truth layer to read for each KPI job
- the marketing connector/source map still needs a clear lane-owned boundary before a future rebuild:
  - Benson Crew
  - Zahnd Team Ag
  - Steve Zahnd
  - MarketMasters
- the backlog scope registry is now live, but backlog cleanup is still open
- Gmail / Calendar / Missive / meeting-note reads are now live, and the first meeting-note + meeting-transcript archive with transcript-first candidate extraction is live, but the system still lacks the explicit synthesis layer that turns raw candidates into ranked live intelligence
- the research lane is still overloaded
- OpenClaw native memory baseline is still off

## Active Docs Only

Use these as the live plan truth:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/system-strategy.md`
- `docs/source-registry.md`

Treat most handoffs and research notes as supporting archive, not the plan.

## Strategy Backlog Map

Close now:

- `FOUNDATION-001` - keep the signed-off strategy layer aligned to real source truth
- `SOURCE-014` - close the full strategy live-input boundary for Freedom Community, BHAG, Agent Engine, and the strategy-used Owners slice

Hardening after Level 2 closeout:

- `DATA-001` - Freedom Sheet adapter + schema-drift monitoring
  - baseline structure verification is now live through `sheets:verify`
  - remaining work is adapter design plus visible health status in the app
- `DATA-003` - render source-backed strategy values instead of markdown-held math
- `ENGINE-001` - make planning attrition a first-class engine input
- `DECISION-001` - decision-to-doc traceability (first slice live)
- `DECISION-002` - visible strategy change ledger + doc-scoped annotations (first slice live)
- `DECISION-003` - contradiction detection and cleanup (first slice live)
- `DECISION-005` - decision provenance and participant model
- `MEMORY-005` - temporal truth model for strategy and decisions

## What Is Not Next

- not a runtime pivot
- not Harlan migration mid-foundation
- not `Level 3` freshness on every source before key `Level 2` work is done
- not multi-agent sprawl
- not rebuilding KPI inside AI OS
- not manually auditing the full deal ledger by hand with Steve
- not building the sales coach before KPI and FUB meaning is locked
- not building ops-hub automations before Owners / FUB parity is signed off

## Backlog Link

The live backlog is the execution queue.

If this plan and the backlog disagree, fix the backlog.

Related:

- [Current State](current-state.md)
- [System Strategy](../system-strategy.md)
- [Rebuild Decisions](../rebuild-decisions.md)
- [Agent Architecture](agent-architecture.md)
- [Current Runtime Map](current-runtime-map.md)
- [Foundation Backlog](/foundation#backlog)
