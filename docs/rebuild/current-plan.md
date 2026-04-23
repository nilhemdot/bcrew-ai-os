# BCrew AI OS Rebuild Plan

Last updated: 2026-04-23
Status: Active

Use this doc for one question:

- what are we doing right now

Use [Current State](current-state.md) for the short read.

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
2. build the governed Owners review engine, not more open-ended manual audit work:
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
3. close the Owners package as an integrated closure, not a sheet-only closeout:
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
     - raw meeting-note archive is now live
     - first pending task-candidate lane is now live
     - normalize one shared communication record across more surfaces
     - add the next governed extraction path after task candidates prove out
   - first governed outputs:
     - contract registry starter entries
     - `Ops Hub -> Deal Review Inbox`
     - re-review path after source fixes
4. build shared change / drift infrastructure for governed sources:
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
5. close `SRC-FINANCE-001` to `Level 2` via `FOUNDATION-003`
6. lock KPI source-layer read rules via `SOURCE-010`
7. close the required connector/source map by pillar:
   - company
   - Steve / agent brand
   - MarketMasters
8. extend the shared communications layer after the first governed slice proves out:
   - `SOURCE-003` broader Drive hardening
   - `SOURCE-005` Slack read-only revalidation
   - widen extraction types only after archive + normalization + first decision path are stable
9. build the shared business-atoms layer in Foundation:
   - `STRATEGY-001`
   - atoms are shared evidence first
   - hubs add overlays instead of rebuilding ingestion
10. define the first overlay and scoper model:
   - `STRATEGY-006`
   - `SYSTEM-012`
   - marketing keeps the locked `10` RETAIN + `5` ATTRACT avatar model as the first heavy overlay
11. extend the first freshness pattern into shared `Level 3` rules across more sources
12. clean backlog ownership and the research lane
13. only then turn on the narrow memory baseline and the first trusted loop
14. only after the governed engines are stable, build the first narrow operating agent on top of them

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

- the broader strategy-input package is no longer a separate first move; the remaining strategy-used Owners slice closes inside the Owners package work
- FUB is readable and editable for taxonomy rules, but not signed off
- the first live cross-system deal proof now exists (`T#26100` -> FUB -> ClickUp -> contract), but it still needs to become governed system behavior
- finance is still not line-by-line signed off
- KPI is live and readable, but AI OS still has not locked which truth layer to read for each KPI job
- the marketing connector/source map still needs a clear pillar-owned boundary before a future rebuild
- the backlog scope registry is now live, but backlog cleanup is still open
- Gmail / Calendar / Missive / meeting-note reads are now live, and the first meeting-note archive + task-candidate slice is live, but the broader shared archive / normalize / extraction layer does not exist yet
- the research lane is still overloaded
- OpenClaw native memory baseline is still off

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
