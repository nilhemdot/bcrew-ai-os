# 2026-04-21 Current State Change Infrastructure

## What shipped

- Current State now shows a visible **Change Infrastructure** panel.
- The panel currently exposes:
  - strategy doc watch
  - sheet structure watch
  - decision cleanup watch
- Decisions page now also shows a first visible **decision cleanup review queue**.
- The review queue is now ordered top-to-bottom so operators can start at the top and work down:
  - hard fixes first
  - relationship cleanup later
- The decision model itself is no longer provenance-thin:
  - decisions now store:
    - decision owner
    - confirmed by
    - participant list
    - context ref
    - evidence notes
  - the create/update write path and operator form both support those fields
  - locked decisions with missing provenance now show up as explicit review items instead of hidden debt

## Live structure watch

- New API route: `/api/sheets/structure-status`
- Backed by the existing sheet verifier, now exported from:
  - `scripts/sheets-structure-verify.mjs`
- Current live baseline:
  - Freedom: clean
  - Owners: clean
  - Old BIS KPI: clean
- Verification result at ship time:
  - `180/180` checks passed

## What the Current State panel means now

- **Strategy doc watch**
  - visible now
  - reads pending strategy doc proposals plus applied strategy doc history
- **Sheet structure watch**
  - visible now
  - shows whether Freedom / Owners / Old BIS KPI still match the trusted baseline
- **Decision cleanup watch**
  - first summary is now live in Current State
  - the detailed review queue now lives on the Decisions page
  - current engine flags:
    - proposed decisions still needing lock
    - missing source refs
    - missing owner / confirmer / participant / context provenance on locked decisions
    - broken supersedes links
    - pending doc updates with no linked decision
    - possible relationship candidates
  - Decisions page now also shows the exact backlog cards behind deeper contradiction / provenance / temporal-truth work

## Why this matters

- Drift protection is no longer hidden in terminal scripts only.
- The site now tells the operator when:
  - strategy docs have pending review items
  - core workbook structure has drifted
  - decision contradiction cleanup is still an open system gap

## Next logical slice

1. promote a real contradiction review queue out of the decision backlog layer
2. backfill provenance on the already-locked decisions so the new queue is useful immediately
3. decide whether current overlap heuristics are strict enough or need narrower rules
4. expand structure watch from workbook-level summary into failure-detail drilldown only when drift exists
