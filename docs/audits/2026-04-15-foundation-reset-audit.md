# Foundation Reset Audit

Date: 2026-04-15

Scope:
- current repo/system state
- saved conversation checkpoints:
  - `docs/handoffs/2026-04-15-full-convo-3.md`
  - `docs/handoffs/2026-04-14-full-convo-1.md`
  - `docs/handoffs/2026-04-14-full-convo-2.md`

## Findings Ordered By Severity

1. High: the live backlog model still hardcodes the world to `dev` vs `marketing`.
   - This blocks the modular and future-hub direction.
   - It was explicitly identified in the saved conversation and never promoted into a real backlog card.
   - Evidence:
     - `lib/foundation-db.js:2389`
     - `public/foundation.js:3849`
     - `docs/handoffs/2026-04-14-full-convo-1.md:9721`

2. High: `SYSTEM-003` is now doctrine drift.
   - Current doctrine says durable truth lives in docs/Git and volatile operating memory lives in PostgreSQL.
   - The card still says to move Foundation out of markdown and treat markdown as backup.
   - That is no longer aligned with the locked system model.
   - Evidence:
     - `docs/system-strategy.md:33`
     - `docs/system-strategy.md:54`
     - `lib/foundation-db.js:1091`

3. High: source trust still has duplicate and slightly contradictory truth surfaces.
   - Structured contracts show `SRC-OWNERS-001` as `In Review`.
   - The registry says no live spreadsheet or API source is signed off yet.
   - The source note says the Admin tab was "Signed Off In This Session".
   - The UI renders both the structured contracts and the markdown registry on the same page, so users see multiple overlapping truth layers.
   - Evidence:
     - `lib/source-contracts.js:113`
     - `docs/source-registry.md:7`
     - `docs/source-registry.md:18`
     - `docs/source-notes/owners-dashboard.md:49`
     - `public/foundation.js:4590`

4. Medium: operational trust is still mostly manual.
   - `FOUNDATION-VERIFY-001` is still open.
   - There is no real verification script in `package.json`.
   - "System Health" is only a memory-status grid, not a real health/verification surface.
   - Evidence:
     - `lib/foundation-db.js:70`
     - `package.json:6`
     - `public/foundation.js:4641`

5. Medium: backlog hygiene is drifting.
   - Live snapshot during this audit was:
     - 97 backlog items
     - 79 in `research`
     - 6 in `scoped`
     - 6 in `ranked`
     - 4 in `executing`
   - `DECISION-006` and `SYSTEM-006` are unranked.
   - `EXEC-002` and `EXEC-003` are exact duplicates.
   - Several cards still describe pre-closeout reality.
   - The Home sequence is stale and still says "Finish system strategy" even though the latest checkpoint marked that closed.
   - Evidence:
     - `public/foundation.js:156`
     - `docs/handoffs/2026-04-15-full-convo-3.md:89`

6. Low: the macro surface model is good enough.
   - Foundation has the right top-level homes.
   - Business Strategy keeps quarterly asks out of durable doctrine.
   - System Strategy has a coherent truth model.
   - Strategic Execution already exists as the separate home for quarterly priorities and strategic issues.
   - Evidence:
     - `public/foundation.html:24`
     - `docs/business-strategy.md:40`
     - `docs/system-strategy.md:22`
     - `public/strategic-execution.html:24`
     - `public/strategic-execution.js:551`

## Missing Backlog Work From The Saved Conversations

- One clear miss: add a card to make backlog teams and module views data-driven instead of `dev` and `marketing` hardcoding.
  - Scope should cover:
    - schema
    - API
    - migration
    - filter UI
    - root-vs-hub queue ownership
    - removal of the "marketing placeholder" assumption
  - Evidence:
    - `docs/handoffs/2026-04-14-full-convo-1.md:9745`

- Outside that, the three saved handoffs were mined well.
  - Most real gold was promoted:
    - `DECISION-006`
    - `SYSTEM-004`
    - `SYSTEM-005`
    - `SYSTEM-006`
    - `AGENT-005`
    - `AGENT-006`
    - `AGENT-007`
    - `SOURCE-012`
    - strengthened `DEV-002`

- Separate repo-local miss, not from the named handoffs:
  - the ghost-agent safety lesson is documented as filed, but it is not actually in the live backlog or doctrine
  - evidence:
    - `docs/research/2026-04-15-ghost-agent-lesson.md:47`
    - `docs/research/2026-04-15-backlog-additions.md:22`

## Existing Backlog Cards That Need Richer Scope Or Context

- `SOURCE-012`
  - Add the explicit goal of collapsing duplicate source-truth surfaces and naming one canonical status model across contracts, registry, and notes.

- `FOUNDATION-VERIFY-001`
  - Expand beyond endpoint pings.
  - Include:
    - source-contract vs registry consistency checks
    - doc-apply integrity checks
    - one proof read for each signed-off critical source

- `DECISION-006`
  - Define the first concrete emitted artifacts now:
    - expense policy
    - ownership-pay rules
    - approval standards
    - supersession behavior

- `SYSTEM-006`
  - Add a concrete record map for:
    - what stays in root Foundation
    - what graduates into Strategic Execution
    - what moves into future hub-local queues

## Duplicate / Overlapping / Stale Cards To Clean Up

- `EXEC-002` and `EXEC-003`
  - exact duplicate
  - keep one

- `SYSTEM-003`
  - stale or misleading
  - retire it or rewrite it to match current doctrine

- `MEMORY-001`
  - stale
  - the business DB is already live
  - move to `done` or split any remaining work into smaller follow-ons

- `SCHEMA-001`
  - likely stale
  - the specific category drift it describes appears already resolved

- `UX-003` and `UX-004`
  - look effectively satisfied by the current nav/pattern work
  - either close them or fold them into `UX-005` and `docs/superpowers/specs/foundation-ui-patterns.md`

- `STRATEGY-003`
  - rewrite around the existing Strategic Execution hub instead of a hypothetical future workspace

- `DATA-004` and `SOURCE-012`
  - either clearly sequence them or merge them
  - right now they are close enough to drift

## Clean Current-State Summary

- Done enough:
  - `Home`
  - `Strategy Packet`
  - `System Strategy`
  - first-pass `Backlog`
  - first-pass `Decisions`

- Still open:
  - `Open Questions`
  - `System Activity`
  - `System Health`
  - source-trust closeout
  - minimal verification
  - memory baseline
  - future capabilities / agent / policy surfaces

- Source trust:
  - `SRC-STRATEGY-001` is signed off as doc truth
  - no live spreadsheet/API source is fully signed off
  - `SRC-OWNERS-001` is still in review
  - `SRC-FINANCE-001` is partially signed off

- Decision system:
  - real and usable
  - live snapshot during audit:
    - 7 locked decisions
    - 0 pending doc updates
  - missing piece is policy/SOP output, not the decision log itself

- Backlog/workflow:
  - real trust-layer backlog exists
  - it is still bloated and under-curated

- Verification:
  - not closed
  - there is no minimal repeatable proof layer yet

- Memory:
  - `Strategy Docs` live
  - `Business Memory DB` live
  - OpenClaw native memory still pending

- Agent/capabilities visibility:
  - doctrine and backlog cards exist
  - no live capabilities, registry, or agent-ops surface yet

## Recommended Next 5 Priorities

1. Add and execute the missing backlog team/module model card.
   - Remove `dev` and `marketing` hardcoding before more hubs or departmental queues arrive.

2. Unify source-truth status into one canonical model.
   - Then finish `FOUNDATION-002` and `FOUNDATION-003`.

3. Land `FOUNDATION-VERIFY-001` with real smoke checks and source-trust consistency checks.

4. Rank and drive `SYSTEM-006` and `DECISION-006`.
   - Foundation Operations ownership and policy/SOP output should stop living only in implied doctrine.

5. Clean the queue.
   - dedupe `EXEC-002` and `EXEC-003`
   - close stale cards
   - rank `DECISION-006` and `SYSTEM-006`
   - update the stale Home sequence

## What Not To Work On Yet

- extra agents
- heavy memory experiments
- Skool ingestion
- broad UI polish
- moving durable strategy out of docs

These are downstream of the five priorities above.

## Verdict

The system does not need a reset.

It needs:
- trust closure
- backlog cleanup
- ownership discipline

Directionally, the rebuild is still on the right path.
