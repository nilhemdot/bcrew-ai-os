# Data Source Maturity Model

Use this note to answer two questions:

- what level is a source at now
- what level are we trying to reach now

## The Eight Levels

| Level | Name | What it means | Done at this level |
|-------|------|---------------|--------------------|
| `Level 1` | Connected | AIOS can reach and read the source | source is visible and readable |
| `Level 2` | Trusted | the exact trusted unit, fields, and meaning are reviewed | trust boundary is explicit and signed off |
| `Level 3` | Monitored | refresh model, stale-state visibility, drift, and runtime ownership are explicit | freshness is visible and drift creates visible issues |
| `Level 4` | Extracted | source content is filed into governed artifacts/atoms with provenance | useful material is captured without losing source evidence |
| `Level 5` | Synthesized | extracted evidence becomes useful source-backed intelligence | the system can produce grounded findings, themes, or candidates |
| `Level 6` | Routed | intelligence becomes owner-bound decisions, tasks, questions, contradictions, or actions | a real person or hub owns the next move |
| `Level 7` | Governed Apply | approved writes or workflow changes can happen safely | automation is auditable, gated, and reversible enough for the risk |
| `Level 8` | Closed Loop | resolution is captured and history stays intact | stale findings stop reappearing after action is taken |

## Current Lock For This Rebuild Pass

| Surface | Current | Target now | Future target |
|---------|---------|------------|---------------|
| `SRC-STRATEGY-001` | `Level 3` for strategy docs | hold `Level 3` change/watch visibility | `Level 8` temporal truth / closed-loop decision history |
| `SRC-FREEDOM-COMMUNITY-001` | `Level 2` for current reality | hold `Level 2` | `Level 3` freshness |
| `SRC-FREEDOM-BHAG-001` | `Level 2` for current reality | hold `Level 2` | `Level 3` freshness |
| `SRC-FREEDOM-ENGINE-001` | `Level 2` for current reality | hold `Level 2` | `Level 3` freshness |
| `SRC-FUB-001` | `Level 6` for v1 source issues | keep Ops-routed findings live | `Level 7-8` approved source fixes and resolution awareness |
| `SRC-FINANCE-001` | `Level 2` for current reality | hold `Level 2` | `Level 3` freshness |
| `SRC-OWNERS-001` | `Level 6` for Admin review package | keep Ops-routed findings live | `Level 7-8` approved source fixes and resolution awareness |
| `SRC-SUPABASE-001` | `Level 2` for read rules | hold `Level 2` | `Level 3` KPI health / schema drift checks |

## What That Means

- strategy docs have first-pass `Level 3` change/watch visibility
- Freedom Community, BHAG, and Agent Engine are now captured deeply enough for current-reality `Level 2`; the source-contract label is `Signed Off For Current Reality`
- the broader strategy package is closed for source sign-off, but mixed: docs are `Level 3`; supporting inputs remain `Level 2`
- FUB v1 taxonomy/source issues are routed through Ops, but deeper Sales Hub opportunity semantics and approved source-fix writeback are future work
- finance is captured deeply enough for current-reality `Level 2`; QuickBooks remains optional compliance verification, not a current rebuild dependency
- we do **not** need every source at `Level 7-8` before it is useful; human-led strategy can use `Level 2`, always-on read hubs should depend on `Level 3`, and write/apply workflows need `Level 7+`

## Current Priority Order

### Priority 1

Hold signed-off current-reality inputs at `Level 2` unless new evidence proves drift:

- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-BHAG-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-FINANCE-001`
- `SRC-SUPABASE-001`

### Priority 2

Reuse the first `Level 3` freshness pattern more broadly:

- refresh model per source
- last refreshed / last verified
- visible stale state
- issue creation for new unmapped values

### Priority 3

Close the `Level 6-8` operating loop where the system already finds issues:

- owner-bound routing
- approval-gated source fixes
- writeback provenance
- resolution awareness
- temporal truth / supersession history

## Current Source Map

| Source ID | Current level | What it does today | Target now |
|-----------|---------------|--------------------|------------|
| `SRC-STRATEGY-001` | `Level 3` | signed-off strategy meaning plus first-pass change/watch visibility | hold `Level 3` |
| `SRC-OWNERS-001` | `Level 6` for Admin review package | trusted deal-ledger meaning plus routed Admin/Ops findings | hold routed v1, then add governed apply/resolution |
| `SRC-FINANCE-001` | `Level 2` for current reality | Weekly Actuals and Cashflow Dash are deeply mapped and documented | hold `Level 2` |
| `SRC-FUB-001` | `Level 6` for v1 source issues | readable CRM path, governed taxonomy, drift visibility, and Ops-routed findings | hold routed v1, then add governed apply/resolution |
| `SRC-SUPABASE-001` | `Level 2` | KPI database readable and first-pass read rules locked | `Level 3` health / schema drift checks |
| `SRC-FREEDOM-BHAG-001` | `Level 2` for current reality | BHAG planning inputs are deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-ENGINE-001` | `Level 2` for current reality | Agent Engine inputs, calculator, and caveats are deeply mapped | hold `Level 2` |
| `SRC-FREEDOM-TEAM-001` | `Level 2` for current reality | team/member source is deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-COMMUNITY-001` | `Level 2` for current reality | community tracker is deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-COMMUNITY-REV-001` | `Level 2` for current reality | community revenue source is deeply mapped and documented | hold `Level 2` |

## Backlog Hooks

- `SOURCE-014`
  - closed the full strategy live-input boundary for the current source package
- `DATA-001`
  - add Freedom Sheet schema-drift monitoring
- `DATA-003`
  - keep strategy values source-backed instead of markdown-held
- `DECISION-001`, `DECISION-002`, `DECISION-003`, `DECISION-005`
  - add traceability, visible change history, contradiction cleanup, and provenance
- `MEMORY-005`
  - add temporal strategy truth later without losing history
- `DATA-018`
  - queues review when new Follow Up Boss lead sources appear
- `DATA-019`
  - enforces approved Follow Up Boss lead sources in the Owners Dashboard
- `DATA-020`
  - first guarded freshness model now exists for Owners / FUB; reuse that pattern later for wider source layers
