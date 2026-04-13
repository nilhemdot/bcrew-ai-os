# Foundation UI Patterns

Internal build note for keeping Foundation pages consistent while the system is still being rebuilt.

## Page Pattern

1. Keep the strategy explanation in markdown above the source-backed card.
2. Put the source footer inside the card, at the bottom:
   - source IDs
   - open or edit source links
   - as-of timestamp
3. Do not repeat the same explanation above and below the same card.
4. Lead with the decision or planning answer first, then the deeper live snapshot.

## Source-Backed Card Rules

- The card should show the live numbers.
- The markdown should explain what the numbers mean.
- Source links should come from source contracts, not hardcoded UI logic.
- If a card uses a long-range path and a live snapshot, show them in this order:
  1. model inputs or assumptions
  2. long-range path
  3. current requirement
  4. live pressures or live snapshot

## Table Rules

- Highlight the current year row.
- Use rounded display values for human reading.
- If the page shows a rounded requirement, the gap should be calculated from the same rounded requirement.
- Prefer whole-agent counts in strategy views.

## Copy Rules

- Keep headings short.
- Keep labels concrete and operational.
- Avoid dashboard language in strategy pages.
- Avoid repeating the canonical strategy in supporting docs.

## Current Examples

- `BHAG Model`
  - explanation above the table
  - source footer inside the card
  - long-range target path first, live pace below it
- `Agent Engine`
  - assumptions first
  - required-agent path second
  - current-year and next-year requirement before deeper live pressures
