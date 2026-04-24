# Admin deal review batch 01

Date: 2026-04-21

Scope:

- Benson Crew era only
- full review age gate respected
- first `5` split-risk deals reviewed live into:
  - `ADMIN ONLY - Deal Data Entry!CC:CE`

## Reviewed deals

### `T#25328`

Rows:

- `139`
- `140`

Result:

- split math is clean
- linked FUB person exists
- FUB source = `Agent/Other Referral`
- row `140` still says `Realtor.ca`
- linked FUB person `114831` is still in `Contact - Non Lead/Non Supporter`

Meaning:

- this is not a split-math problem
- this is a source / CRM-stage parity problem

### `T#26015`

Rows:

- `91`
- `92`

Result:

- split totals and credits balance correctly
- `Gross To Team` is populated on both split rows
- `Client Follow UP Boss ID` is missing

Meaning:

- credit math is fine
- cash-anchor handling is wrong
- FUB parity could not be run yet

### `T#25079`

Rows:

- `115`
- `116`

Result:

- split totals and credits balance correctly
- `Gross To Team` is populated on both split rows
- `Client Follow UP Boss ID` is missing

Meaning:

- same pattern as `T#26015`

### `T#25216`

Rows:

- `224`
- `225`

Result:

- split totals and credits balance correctly
- `Gross To Team` is populated on both split rows
- `Client Follow UP Boss ID` is missing

Meaning:

- same pattern again

### `T#25288`

Rows:

- `177`
- `178`

Result:

- split math is clean
- lead source is still `<unspecified>` on both rows
- `Client Follow UP Boss ID` is missing

Meaning:

- math is not the issue
- attribution truth is still unresolved

## First pattern from this batch

Three issue classes showed up immediately:

1. split-row cash-anchor drift
   - `Gross To Team` is being duplicated across split rows on some deals
   - current examples:
     - `T#26015`
     - `T#25079`
     - `T#25216`
2. missing FUB linkage on split deals
   - blocks parity checks even when split math is readable
3. source / stage parity drift even when FUB linkage exists
   - current example:
     - `T#25328`

## What changed live

The reviewed rows now carry governed review output in:

- `CC = AI Review Status`
- `CD = THIS ROW ONLY: REVIEW ACTION`
- `CE = AI Findings By System / Suggestions`

Current status written for all `5` reviewed deals:

- `CC = Issues Found`
- `CD = Needs Fixing`

## Useful next batch

Best next batch is:

- more post-merge split deals first
- then rows with FUB links
- then rows with `ISA Set Deal = Yes`

