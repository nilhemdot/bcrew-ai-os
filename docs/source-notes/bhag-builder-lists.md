# BHAG Builder / Old BIS KPI Lists Source

Source ID: `SRC-OWNERS-LISTS-001`

Workbook: `1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE`

Tab: `Lists` (`gid=1609537489`)

## Role

This tab is the upstream source for list/dropdown data consumed by the Owners Dashboard.

The Owners Dashboard workbook (`18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk`) has its own `Lists` tab, but that tab is not an owned write surface. It mirrors this source tab through:

```gs
=IMPORTRANGE("https://docs.google.com/spreadsheets/d/1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE/edit#gid=1609537489","Lists!A1:ai")
```

Do not write into the Owners Dashboard `Lists!A:AI` mirror. Write to this source workbook or to a deliberately non-imported destination.

## Critical Columns

- `J` — governed lead-source dropdown list for Owners Admin `Lead Source` and `Ground Zero`.
- `AA` — active agent/user names.
- `AB` — active agent/user emails.
- `AC` — cap start month/day.
- `AD` — active flag.
- `AE` — yearly cap.
- `AF` — roster sequence number.
- `AG` — selected email helper.
- `AH` — active agents helper.
- `AI` — selected agents helper.

## Current Repair

On 2026-04-24, the governed FUB-approved lead-source list was moved to source `Lists!J3:J` and `No Extra Lead Source` was inserted into the same governed list so Admin `Lead Source` and `Ground Zero` can reuse one controlled dropdown.

The Owners Dashboard Admin tab now validates:

- `N3:N` against `=Lists!$J$3:$J`
- `P3:P` against `=Lists!$J$3:$J`
- `S3:S` against `=Lists!$AA$2:$AA`

The repair script is:

```bash
npm run owners:repair-lists -- --apply
```

## Governance Rule

Before any Google Sheets service-account write, the write helper must check whether the target range is an imported mirror. If the target overlaps the Owners Dashboard `Lists!A:AI` mirror, the write must be blocked unless a narrowly scoped repair override is used.

This prevents a repeat of the April 2026 bug where governed dropdown helper lists were written into the imported mirror and blocked the entire `IMPORTRANGE` spill.
