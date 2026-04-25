# Data Source Maturity Model

Use this note to answer two questions:

- what level is a source at now
- what level are we trying to reach now

## The Four Levels

| Level | Name | What it means | Done at this level |
|-------|------|---------------|--------------------|
| `Level 1` | Connected / Readable | the system can reach the source and read it | source is visible and readable |
| `Level 2` | Validated / Signed Off | the exact trusted unit and its meaning are reviewed | trust boundary is explicit and signed off |
| `Level 3` | Fresh / Monitored | refresh model and stale-state visibility are explicit | freshness is visible and drift creates visible issues |
| `Level 4` | Operational / Safe Automation | trusted reads, approved writes, and governed automation exist | automation is auditable and safe |

## Current Lock For This Rebuild Pass

| Surface | Current | Target now | Future target |
|---------|---------|------------|---------------|
| `SRC-STRATEGY-001` | `Level 2` | stay `Level 2` | `Level 3` doc-drift / visibility hardening |
| `SRC-FREEDOM-COMMUNITY-001` | `Level 2` for current reality | hold `Level 2` and finish package closeout | `Level 3` freshness |
| `SRC-FREEDOM-BHAG-001` | `Level 2` for current reality | hold `Level 2` and finish package closeout | `Level 3` freshness |
| `SRC-FREEDOM-ENGINE-001` | `Level 2` for current reality | hold `Level 2` and finish package closeout | `Level 3` freshness |
| `SRC-FUB-001` | `Level 1` | `Level 2` | `Level 3` freshness + issue routing |
| `SRC-FINANCE-001` | `Level 2` for current reality | hold `Level 2` | `Level 3` freshness |
| `SRC-OWNERS-001` | `Level 2` | hold `Level 2` | `Level 3` freshness + parity checks |

## What That Means

- strategy docs are done enough now
- Freedom Community, BHAG, and Agent Engine are now captured deeply enough for current-reality `Level 2`; the source-contract label is `Signed Off For Current Reality`
- the broader strategy package is still **not** closed until the strategy-used Owners slice and package-level closeout are finished
- FUB is **not** done yet
- finance is captured deeply enough for current-reality `Level 2`; QuickBooks remains optional compliance verification, not a current rebuild dependency
- we do **not** need full `Level 3` freshness before key `Level 2` work closes

## Current Priority Order

### Priority 1

Close `Level 2` on:

- `SRC-FUB-001`

Hold at `Level 2`:

- `SRC-FREEDOM-COMMUNITY-001`
- `SRC-FREEDOM-BHAG-001`
- `SRC-FREEDOM-ENGINE-001`
- `SRC-OWNERS-001`
- `SRC-FINANCE-001`

### Priority 2

Reuse the first `Level 3` freshness pattern more broadly:

- refresh model per source
- last refreshed / last verified
- visible stale state
- issue creation for new unmapped values

### Priority 3

Only after trust is real:

- safe writes
- agent usage rules
- governed automation

## Current Source Map

| Source ID | Current level | What it does today | Target now |
|-----------|---------------|--------------------|------------|
| `SRC-STRATEGY-001` | `Level 2` | signed-off strategy meaning | stay `Level 2` |
| `SRC-OWNERS-001` | `Level 2` | trusted deal-ledger meaning | hold `Level 2` |
| `SRC-FINANCE-001` | `Level 2` for current reality | Weekly Actuals and Cashflow Dash are deeply mapped and documented | hold `Level 2` |
| `SRC-FUB-001` | `Level 1` | readable CRM path plus taxonomy tooling | `Level 2` |
| `SRC-FREEDOM-BHAG-001` | `Level 2` for current reality | BHAG planning inputs are deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-ENGINE-001` | `Level 2` for current reality | Agent Engine inputs, calculator, and caveats are deeply mapped | hold `Level 2` |
| `SRC-FREEDOM-TEAM-001` | `Level 2` for current reality | team/member source is deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-COMMUNITY-001` | `Level 2` for current reality | community tracker is deeply mapped and documented | hold `Level 2` |
| `SRC-FREEDOM-COMMUNITY-REV-001` | `Level 2` for current reality | community revenue source is deeply mapped and documented | hold `Level 2` |

## Backlog Hooks

- `SOURCE-014`
  - close the full strategy live-input boundary
- `DATA-001`
  - add Freedom Sheet schema-drift monitoring
- `DATA-003`
  - keep strategy values source-backed instead of markdown-held
- `DECISION-001`, `DECISION-002`, `DECISION-003`, `DECISION-005`
  - add traceability, visible change history, contradiction cleanup, and provenance
- `MEMORY-005`
  - add temporal strategy truth later without losing history
- `DATA-018`
  - queue review when new Follow Up Boss lead sources appear
- `DATA-019`
  - enforce approved Follow Up Boss lead sources in the Owners Dashboard
- `DATA-020`
  - first guarded freshness model now exists for Owners / FUB; reuse that pattern later for wider source layers
