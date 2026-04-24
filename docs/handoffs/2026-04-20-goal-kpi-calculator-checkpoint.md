# Goal & KPI Calculator Checkpoint

Date: 2026-04-20

## Status

Locked for meaning.

`Goal & KPI Calculator` is a bridge-and-planning layer, not a root source.

## What It Does

- holds high-level annual planning assumptions
- holds execution and deposit seasonality
- turns those assumptions into monthly / quarterly target outputs
- imports the old BIS KPI engine into the Owners workbook

## Key Blocks

- `B1:J10`
  - annual planning assumptions
- `B11:J23`
  - execution seasonality
- `B24:J36`
  - deposit seasonality
- `B37:J54`
  - execution target outputs
- `B55:J72`
  - execution net-to-company targets
- `B73:J90`
  - deposit net-to-company targets

## Critical Bridge

- `O1`
  - `IMPORTRANGE` from old BIS workbook `KPI Calculator!A1:DA`

Meaning:

- this tab is the local Owners-side bridge between old KPI history and current dashboard reads

## Confirmed Downstream

- `Sales & Deposit`
  - actual-history strips come from the imported KPI side
  - goal strips come from the local planning / target side

## Important Constraint

Do not overstate direct budget-sheet dependency yet.

User confirmed:

- it likely feeds some targets elsewhere
- but the only clearly confirmed downstream surface right now is `Sales & Deposit`

## Rebuild Read

This tab should be preserved as deep logic context for rebuild work, but not treated as the future final source-of-truth model.
