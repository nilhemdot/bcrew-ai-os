# DEV-INTEL-SOURCE-COVERAGE-001 Plan

## What

Create a read-only Dev intelligence source coverage matrix.

Plain English: before Dev approves build work, Steve needs to know which source families are actually feeding Dev, which ones are only discovered, which ones are blocked by auth/source packets, and what the next card is for each family.

## Why

The Dev system should not depend on Steve manually remembering every source: YouTube, GitHub/repos, Skool, MyICOR, meetings, Gmail/Missive, Slack, Drive/course docs, and public communities.

Foundation owns the shared source pond. Dev reads the system-building slice. The missing piece is a simple coverage view/contract that says what is wired today and what is still pending.

## Acceptance Criteria

- Lists the main Dev intelligence source families.
- Every family has source IDs or an explicit source-contract blocker.
- Every family has a status:
  - active
  - partial
  - blocked
  - planned
- Every active family names the router/extractor/report path that feeds Dev.
- Every blocked family names the exact blocker and next card/source packet.
- YouTube links are represented as resolver/scoper work, not Steve homework.
- Shared meetings/Gmail/Missive/Slack are represented as one Foundation source pond feeding Dev through the Dev source-slice router.
- Paid/private/community/course sources stay blocked until source-packet approval.
- Output is read-only/proposal-only; no extraction, backlog writes, auth use, model calls, or external writes.

## Definition Of Done

- Add `lib/dev-intel-source-coverage.js`.
- Add `scripts/process-dev-intel-source-coverage-check.mjs`.
- Add package script `process:dev-intel-source-coverage-check`.
- Focused proof verifies active YouTube, active shared comms, blocked Skool/MyICOR, planned GitHub/repos, and no source family without a status/blocker.

## Not Next

- Do not run extraction.
- Do not log into Skool/MyICOR.
- Do not crawl paid/private/community/course sources.
- Do not create backlog cards from the matrix.
- Do not redesign `/dev`.
- Do not replace source contracts or Data Sources.

## Tests

- `node --check lib/dev-intel-source-coverage.js`
- `node --check scripts/process-dev-intel-source-coverage-check.mjs`
- `npm run process:dev-intel-source-coverage-check -- --json`
