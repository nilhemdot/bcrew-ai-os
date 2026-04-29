# Old KPI Engine Source Map

Date: 2026-04-20

## Locked Read

The old BIS `KPI Calculator` is a pivot-driven stats engine built directly on the old BIS `ADMIN ONLY - Deal Data Entry` tab.

It is not a raw-entry tab.
It is not random pasted reporting.
It is not a final future-state source contract either.

It is a real intermediate KPI engine.

## Workbook / Tabs

- old BIS workbook:
  - `010 - Zahnd Team BIS (Business Information System)`
  - id: `1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE`
- pivot source tab:
  - `ADMIN ONLY - Deal Data Entry`
  - sheet id: `533201019`
- KPI engine tab:
  - `KPI Calculator`
  - sheet id: `1373809826`

## What The Pivots Use

### Time Buckets

- executed month / year
  - `BH` = `Executed Month`
  - `BJ` = `Executed Year`
- executed quarter / year
  - `BI` = `Executed Quarter`
  - `BJ` = `Executed Year`
- closing month / year
  - `BO` = `Closing Month`
  - `BQ` = `Closing Year`
- closing quarter / year
  - `BP` = `Closing Quarter`
  - `BQ` = `Closing Year`
- deposit month / year
  - `BK` = `Deposit Month`
  - `BM` = `Deposit Year`
- deposit quarter / year
  - `BL` = `Deposit Quarter`
  - `BM` = `Deposit Year`

### Value Fields

- deal counts
  - `AI` = `Deal Credit`
- volume
  - `AG` = `Volume Credit`
- GCI
  - `AF` = `Gross To Team`
- company dollars
  - `AP` = `Company/Team Lead Portion`

## Old KPI Board Families

- executed
  - `A1:V24`
  - `A26:V48`
  - `A50:V72`
  - `A75:V97`
- closed
  - `AK1:BF24`
  - `AK26:BF48`
  - `AK50:BF72`
  - `AK75:BF97`
- deposited
  - `BU1:CP24`
  - `BU26:CP48`
  - `BU50:CP72`
  - `BU75:CP97`

## Why This Matters

- the old KPI engine is grounded in the Admin ledger
- the Owners `Goal & KPI Calculator` is importing this old KPI engine
- the Owners `Sales & Deposit` scoreboard is then reading that imported KPI surface

Current chain:

1. old BIS `ADMIN ONLY - Deal Data Entry`
2. old BIS `KPI Calculator` pivot engine
3. Owners `Goal & KPI Calculator` bridge
4. Owners `Sales & Deposit`

## Rebuild Read

This confirms the real rebuild direction:

- do not treat the old KPI engine as junk
- do not treat it as final truth either
- treat it as a proven stats-engine pattern built on the Admin ledger
- future rebuild can reproduce these boards directly from the canonical ledger without carrying forward the old BIS workbook
