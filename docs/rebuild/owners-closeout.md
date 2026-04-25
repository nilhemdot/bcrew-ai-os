# Owners Closeout

Last updated: 2026-04-21
Status: Active

Use this page for one question:

- what exactly has to happen before the Owners package is actually closed

## Straight Read

`SRC-OWNERS-001` is already signed off for meaning.

What is still open is not the Admin-tab walkthrough.

What is still open is the operational closeout around:

- FUB parity
- lead-source lineage
- data-quality enforcement
- governed contract packages for exception logic
- one governed deal-review queue instead of ad hoc cleanup
- finance follow-through

Important rule:

- do **not** try to close this package by manually auditing the whole ledger with Steve
- use small review batches only to prove the governed review engine and expose the real failure buckets
- once the repeated buckets are clear, the work shifts to code, queue logic, and drift infrastructure

Reference:

- [AI deal review checklist](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-21-ai-deal-review-checklist.md)
- [Deal review queue model](/Users/bensoncrew/bcrew-ai-os/docs/handoffs/2026-04-21-deal-review-queue-model.md)

## Closeout Order

### 1. Revalidate FUB as the live parity source

Card:

- `SOURCE-008`

What this step does:

- prove live rebuild access
- lock the join path from Owners rows to FUB records
- make the CRM boundary explicit

### 2. Lock the Owners ↔ FUB attribution model

Cards:

- `DATA-005`
- `DATA-006`
- supporting doctrine: `FINANCE-002`

What this step does:

- define the canonical lead-source lineage
- define the actual Admin-tab quality rules
- make the business rules explicit instead of memory-based
- establish the first governed AI deal-review checklist for new and exception rows
- route findings into `Ops Hub -> Deal Review Inbox`
- compare exception rows against locked contract packages instead of re-reading contracts every time

Live now:

- firm / exception review runner:
  - manual re-review lane: `npm run deal-review:admin -- --queued`
  - first-pass backlog lane: `npm run deal-review:admin -- --backlog --backlog-since=2025-06-01 --backlog-limit=1`
- conditional review runner:
  - manual re-review lane: `npm run deal-review:conditional -- --queued`
  - first-pass backlog lane: `npm run deal-review:conditional -- --backlog --backlog-since=2025-06-01 --backlog-limit=1`
- combined governed inbox API:
  - `/api/owners/review-queue`
- scheduled Foundation jobs run queued re-reviews first, then one June 2025+ backlog item, and write only AI status/action/findings
- source-field corrections remain human-owned until an explicit apply/fix lane is approved

## First Proven Pattern

This closeout is no longer theoretical.

First end-to-end proof now exists:

- `T#26100`
- Owners row -> FUB person -> ClickUp roster -> Drive contract folder -> signed contract

What that proof already gives us:

- the join path works
- ISA evidence can be proven from CRM
- the `45 / 55` split on that row is contract-correct
- the row should still be treated as `Company`, not `Agent`
- the next system shape is clear:
  - governed contract registry
  - `Ops Hub -> Deal Review Inbox`
  - re-review after source fixes

### 3. Fix the historical data problems that block trust

Cards:

- `DATA-007`
- `DATA-008`
- `DATA-009`

What this step does:

- backfill invalid source rows
- backfill missing FUB links
- resolve suspicious duplicate-credit rows

Current review pattern already proven:

- repeated manual review is finding grouped buckets, not random chaos
- examples:
  - missing `Client Follow UP Boss ID`
  - duplicated `Gross To Team` on secondary split rows
  - linked FUB source / stage mismatch

Meaning:

- the next move is bucketed cleanup + governed automation
- not founder-led row-by-row review forever

### 4. Turn the approved taxonomy into enforcement and age it visibly

Cards:

- `DATA-020`

What now exists:

- the live Column `N` governed dropdown can now be watched directly in the Foundation UI
- the watch shows:
  - unexpected dropdown values
  - approved taxonomy values missing from the live list
  - duplicate dropdown values
- drift events now log into the shared change feed the same way FUB drift does
- FUB source drift now lands in the combined Owners review queue
- Owners governed-dropdown drift is also queue-ready instead of living only in a side panel
- the combined Owners queue now carries first freshness rules:
  - raw FUB snapshot stale after `24h`
  - governed review lanes warn after `72h`
  - governed review lanes go stale after `168h`
  - stale lanes can raise founder-alert state
- freshness now surfaces on:
  - `/api/fub/lead-sources`
  - `/api/owners/lead-source-governance`
  - `/api/owners/review-queue`
  - Current State queue summary

What this step does:

- make stale governed source lists visibly age instead of quietly drifting

Live now:

- the Foundation FUB panel now shows:
  - new names with no rule
  - open classification rows
  - legacy / invalid names still present
  - governed names not seen in the current snapshot
  - stale snapshot age
- drift changes now write into `change_events` as:
  - `source_drift_detected`
  - `source_drift_cleared`
- combined queue API now also carries:
  - Admin review lane
  - conditional review lane
  - FUB drift lane
  - Owners governed-dropdown drift lane

Still open here:

- expand the same change model to more governed source surfaces

### 5. Finance boundary

Card:

- `FOUNDATION-003`

What this step now means:

- `SRC-FINANCE-001` is signed off for current-reality meaning
- `Weekly Actuals` is the operating finance ledger
- `Cashflow Dash` is the management interpretation after partner-commission normalization
- QuickBooks is optional compliance verification, not a current rebuild dependency
- remaining finance work belongs to freshness, payment reconciliation, or future automation hardening, not source-signoff rediscovery

### 6. Then lock KPI as a readable foundation system

Card:

- `SOURCE-010`

What this step does:

- inspect `kpi.bensoncrew.ca`
- keep KPI as a live foundation system
- split pipeline, shopping-list, executed-deal, goal, competition, and usage truth layers
- define which AI OS jobs should read which KPI layer

## Important Dependency

This Owners closeout also clears the remaining strategy dependency hiding inside `SOURCE-014`.

Meaning:

- the strategy packet does **not** need a separate mystery walkthrough first
- the remaining strategy-used Owners slice closes as part of this Owners package work

## What “Done” Means

The Owners package is done when:

1. Owners rows can be reconciled to FUB with a real join path
2. exception rows can be compared against locked contract packages
3. invalid source values are no longer silently trusted
4. new source names trigger review instead of drift
5. governed source lists and review surfaces show stale-state clearly enough to trust them
6. review findings have one governed queue and re-review path
7. finance boundary is signed off far enough to trust the source contract
8. the strategy-used Owners slice is no longer open

Current temporary proof path for item `5`:

- firm / exception deals:
  - `ADMIN ONLY - Deal Data Entry!CC:CE`
- conditional deals:
  - `Listings and Conditional Deals!Q:U`

Remaining build layer on top of that proof path:

- grouped issue buckets
- visible backlog / inbox routing on top of the new combined queue API
- later drift-triggered review instead of blind periodic rescans

## What Is Not In This Closeout

- broad marketing rebuild
- wide connector expansion
- shared freshness rules across every source
- live automation everywhere

Those come after this package is closed.
