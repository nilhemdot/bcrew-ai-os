# 2026-04-26 Strategy Prework Coverage And UI Checkpoint

## Why This Exists

Steve caught the right failure mode during live Strategy Advisor testing: Ryan's filled pre-strat doc existed, but the advisor initially only saw packet-level context and could not prove the exact note. If one participant note was hidden, others could be hidden too.

This checkpoint promotes that concern into system truth.

## What Shipped

- Added `getStrategyPreworkCoverageSnapshot()` in `lib/foundation-db.js`.
- Added `/api/strategic-execution/prework-coverage`.
- Added `preworkReadCoverage` to Strategy Advisor context.
- Added Strategic Execution UI panel: **Pre-Strat Read Coverage**.
- Reduced Strategy Overview repetition by removing the compact Review Board there and showing health, prework coverage, recommended priorities, current quarter, evidence packet, and docs instead.
- Added verifier coverage so the prework endpoint/UI/context cannot disappear silently.

## Live Coverage Snapshot

Expected Q2 rows:

- Steve Zahnd
- Scott Benson
- Ryan Campbell
- Carson
- Georgia Huntley
- Nick Bergmann
- Clare
- Ahsan
- Blake Berfelz

Current proof:

- `8/9` expected rows read.
- `10` current Q2 pre-work artifacts indexed.
- `100,382` chars available from current Q2 pre-work artifacts.
- Scott is covered through manual visual review of the handwritten PDF.
- Ryan, Carson, Georgia, and Ahsan are covered through extracted PDF form fields.
- Nick and Clare are covered through PDF text extraction.
- Steve is covered through the first-person AIOS draft markdown.
- Blake remains explicitly missing.

## Backlog Updated

- `STRATEGY-008` — done: Build pre-strat read coverage engine.
- `STRATEGY-009` — scoped P0: Clean Strategy Package UI/UX for live planning.
- `STRATEGY-004` enriched: remaining work is review/promote controls, source-specific views, and promotion into quarterly priorities, decisions, backlog, and Action Router records.

## Next

1. Run the live strategy session with the Advisor and Pre-Strat Read Coverage visible.
2. If Blake or any late participant note appears in Drive, rerun Drive content extraction and confirm the participant row changes to `Read`.
3. Do `STRATEGY-009`: make Strategic Execution pages non-repetitive and role-clear.
4. Do `STRATEGY-004`: add accept/reject/needs-evidence controls and promotion into real quarterly outputs.

## Important Rule

Packet synthesis is not enough for who-said-what questions. The Advisor must prefer direct artifacts and exact excerpts when available, and must say what is missing when an exact artifact is not surfaced.
