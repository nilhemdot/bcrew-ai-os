# Foundation Menu And Systems Audit

Date: 2026-04-26

## Reason

Steve flagged that the Foundation menu was turning into a pile of pages instead of a clear operating view. The specific failures were:

- no full system map between raw data sources and hubs
- Overview and Runtime Health were starting to overlap
- Decisions looked like they should contain old strategy decisions, but currently show the Foundation decision ledger
- Open Questions might contain stale carry-forward questions
- Agents, Rebuild Plan, Data Sources, and System Inventory needed clearer purpose boundaries

## Foundation Purpose

Foundation is the operating control plane. It is not the Strategy Hub.

Foundation should answer:

1. What sources and systems exist?
2. What level of trust/maturity has each reached?
3. What does each system power?
4. What evidence, connectors, jobs, and notes prove it?
5. What work moves it to the next level?
6. Where does cleanup or build work belong?

Hubs are the business cockpits that use Foundation output. Strategy Hub, Sales Hub, Ops Hub, and future agent assistants should consume Foundation systems instead of each inventing their own source truth.

## Menu Audit

| Page | Keep? | Purpose | Audit Result |
| --- | --- | --- | --- |
| Overview | Yes | Executive command view for what is ready, what is open, and execution order. | Keep short. It should not become the detailed systems page. |
| Systems | Yes, new | Full system map: purpose, maturity level, source contracts, connectors, jobs, notes, backlog, next-level plan. | Added because this was the missing middle layer. |
| Strategy Packet | Yes | Business strategy input package and supporting strategy docs. | Useful, but it is Business Strategy, not Foundation status. |
| Supporting Strategy Docs | Yes | BHAG, Agent Engine, governance, departments, values, MarketMasters. | Keep as source-backed strategy docs. Do not use as system inventory. |
| System Strategy | Yes | Doctrine for how AIOS is being rebuilt. | Better treated as Foundation doctrine/system strategy. |
| Rebuild Plan | Yes | Active execution doctrine from `docs/rebuild/current-plan.md`. | Correct live plan. Archived `rebuild-master-plan.md` is background only. |
| People / Users | Yes | Who the system is serving. | Useful context, not an operating queue. |
| People / Agents | Yes | Important agent identities and boundaries. | Keep tight. Harlan live separately, Crewbert planned, repo coders are tools. |
| Backlog | Yes | DB-backed build and cleanup work. | Operational truth for changing work. |
| Decisions | Yes, needs reconciliation | Foundation decision ledger. | Not a complete old strategy-decision import. Created `DECISION-007` to reconcile. |
| Open Questions | Yes, needs cleanup | Real unresolved Foundation questions only. | Some carry-forward questions may be stale. `DECISION-007` includes review/resolve/merge. |
| System Activity | Yes | Change/activity trace. | Useful audit surface. Keep as secondary. |
| Runtime Health | Yes | Job/debug/operator health: scheduled jobs, runs, status. | Correct name. This is not the system map. |
| Data Sources | Yes | Source contracts, grouped data systems, connectors, connection proof. | Keep as the source/connection detail page. |
| System Inventory | Yes | Docs, skills, plugins, and capability inventory. | Useful for audit/debug, not an everyday owner page. |

## Systems Added To Foundation

The new Systems page is backed by `groupedSourceSystems` in `lib/source-contracts.js`. It now maps:

- Foundation Source Truth System
- Runtime Jobs / Control Plane
- Owners / Ops Review System
- Sales Data / KPI-FUB-Deal System
- Strategy Corpus / Shared Intelligence System
- Meeting Intelligence System
- Drive / Corpus Extraction System
- Video / GOD-Mode Extraction System
- Strategy / Decision Truth System
- Action Router / Closed Loop System
- Agent Runtime / Assistant System
- Marketing Source / Publishing System

Each system carries:

- purpose
- current state
- maturity level
- next-level plan
- source contracts
- connectors
- runtime jobs where applicable
- backlog cards
- source-note or doc actions

## Decisions And Open Questions Gap

Current DB checkpoint:

- 7 decisions are in the live decision ledger.
- The decision ledger is Foundation/system focused, with only promoted strategy decisions included.
- The old strategy-decision artifacts still need reconciliation before the Decisions page can be treated as the full strategy agreement record.
- 5 open questions are present; at least some require stale/open review after Owners/Admin v1 and current strategy-source work.

Backlog created:

- `DECISION-007` - reconcile old strategy decisions, current Foundation decisions, and open questions into one clear ledger.

## Resulting Page Roles

- Overview: short command view.
- Systems: full system map.
- Data Sources: source/connector truth.
- Runtime Health: job/debug health.
- Backlog: work queue.
- Decisions/Open Questions: DB-backed governance ledger, pending reconciliation.

This keeps Steve from having to infer invisible systems from source notes, runtime job pages, or scattered docs.
