# Weekly Actuals Validation Sequence

Date: 2026-04-19
Scope: `(Input) Weekly Actuals`
Purpose: tell Steve exactly how to walk this tab with the system without wasting time

## Straight Read

We do **not** need Steve to explain every weekly transaction.

We do **not** need to go cell by cell through historical cash entries.

We **do** need Steve to confirm:

- business meaning
- intentional workarounds
- ambiguous legacy formulas
- whether a row is real current logic or just old spreadsheet scar tissue

The system can already self-verify:

- structure
- formula presence
- source references
- note locations
- helper-strip math patterns
- which rows are formula-assisted versus pure input

## What The System Already Knows

Locked enough that Steve does not need to re-explain:

- row architecture:
  - `1:14`
  - summary strip
  - `16:18`
  - setup / key / expected commission bridge
  - `19:25`
  - cash / bank / card helper strip
  - `27`
  - week spine
  - `28:211`
  - ledger
- only confirmed external dependency:
  - `ADMIN ONLY - Deal Data Entry`
- row `18` logic:
  - weekly `SUMIFS` over `ADMIN ONLY - Deal Data Entry!AP`
  - windowed by `ADMIN ONLY - Deal Data Entry!I`
  - anchored to week spine row `27`
- row `19:25` mechanics:
  - starting cash
  - ending cash engine
  - bank helper
  - BMO / TD / CIBC cumulative card balance
- placeholder rows `197:211`
  - inactive
  - not currently part of rollup truth
- there are many note hotspots and many formula-bearing rows

## What Steve Actually Needs To Validate

Steve should focus only on the rows where business intent matters.

For each row or block, the system wants these answers:

1. What does this row mean in plain English?
2. Is it still current reality or legacy spreadsheet logic?
3. If it has formulas, why does that formula exist?
4. Is this row supposed to survive the rebuild?
5. If rebuilt later, what is the cleaner real source of truth?

That is enough.

## Best Walkthrough Order

### Pass 1 - Setup and helper strip

Rows:

- `16:18`
- `19:25`
- `27`

What Steve needs to confirm:

- setup meaning
- whether the week spine logic is still right
- whether row `18` is still the right expected-commission bridge
- whether rows `19:25` still reflect how cash should be interpreted

Why first:

- this locks the reading frame for the whole tab

### Pass 2 - Revenue block

Rows:

- `28:40`

Main focus:

- `28`
  - Commission Income
- `29`
  - Revenue Share
- `35`
  - Other Income
- `36:40`
  - partner-commission workaround rows

What Steve needs to confirm:

- what each revenue lane means
- why historical balancing formulas exist
- whether partner rows are still the right current reality

### Pass 3 - Expense blocks by category

Walk category by category, not every row blindly:

- `41:44`
  - Real Broker Fees
- `45:52`
  - Auto + Office Space
- `53:62`
  - General Operating Expenses
- `63:67`
  - Software & Technology
- `68:71`
  - Banking and Interest
- `72:79`
  - Cost to Service Clients
- `80:102`
  - Team
- `103:107`
  - Owners
- `108:114`
  - Contractors
- `115:134`
  - Marketing
- `135:142`
  - Client / Agent Appreciation
- `143:147`
  - Other P&L Cash Out

What Steve needs to confirm:

- any row with notes
- any row with formulas
- any row whose title is not enough to explain intent
- whether the category is still active or legacy

System behavior:

- I should drive the pass
- I should call out only the rows in each block that need Steve
- I should not make Steve explain obvious rows that already read cleanly

### Pass 4 - HST

Rows:

- `148:150`

What Steve needs to confirm:

- whether current HST handling is still the intended operating reality
- whether remittance timing and carried balances still work this way

### Pass 5 - Financing / balance-sheet movement

Rows:

- `151:196`

Main focus:

- credit cards
- payroll liabilities
- partner loans in / out
- unpaid commissions
- investment rows
- agent loans
- legacy debt rows

What Steve needs to confirm:

- which of these are still live
- which are legacy
- which rows are true operating lanes versus temporary spreadsheet workarounds

## How I Should Run The Conversation

The right pattern is:

1. I inspect the block first.
2. I tell Steve what I already know.
3. I ask only the missing meaning.
4. Steve answers in plain English.
5. I write the durable note immediately.
6. I checkpoint before moving on.

The wrong pattern is:

- making Steve narrate the whole sheet from scratch
- asking him to explain rows I can already read
- pretending all formulas are equal when only some need human meaning

## What Counts As Closed

`Weekly Actuals` is closed for meaning when:

- every block has a plain-English role
- every formula-assisted row has a reason
- every important note row has been absorbed into the durable note
- partner-commission reality is explicit
- HST / financing / card logic is understood
- ambiguous legacy rows are marked as either:
  - still current
  - legacy but intentionally retained
  - rebuild target

That is the bar.

## Short Version For Steve

You do **not** need to take me through every historical cash entry.

You **do** need to help me close:

1. setup / helper strip
2. revenue meaning
3. expense blocks by category
4. HST
5. financing

I should drive each pass and only stop you where business meaning is missing.
