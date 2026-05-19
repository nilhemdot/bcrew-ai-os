# Sales GLS V1 Closeout

Date: 2026-05-01  
Scope owner: `SALES-GLS-SCOREBOARD-V1`  
Surface: `/sales#gls-dashboard`, `/sales#gls-system`, `/api/sales-hub`

## What Shipped

- Get Listings Sold (GLS) is framed as one Sales Hub system, not the whole Sales Hub.
- The GLS Dashboard has two scoreboards:
  - Active GLS pipeline: current unresolved cases only.
  - Total GLS cases: persisted historical outcomes and conversion context.
- Metrics are case-first, while still preserving listing counts where they explain grouped projects.
- Weekly cohort rows use case counts only.
- Sales leader scoreboard shows active cases, plans, adjusted/implemented, sold, stuck, failed, and win-rate context.
- GLS Manager gives a work queue with grouped project cards, individual listings, assignment/status/game-plan controls, and visible case history.
- Nick Bergmann's seven-listing Goderich project counts as one GLS case unless a later override card splits it.
- Sold/closed persisted cases stay visible after leaving the active ClickUp list.
- Carson can access Sales Hub through Ops access. John Kitchens is explicitly enabled as a Sales Hub user by Google login.
- Approved leadership emails were sent, and Steve was later forwarded copies.

## Speed Pass

Steve flagged that the page felt slow and that sales leaders do not need to open the ClickUp board.

The final pass:

- removed the `Open ClickUp View` CTA from the Sales Hub hero
- replaced it with a smaller deliberate `Refresh from ClickUp` control
- labels the page as an `AIOS cached view`
- shows the last ClickUp refresh time beside the control
- explains that GLS edits save to AIOS immediately, while refresh only pulls new ClickUp listing/date/status changes
- returns cached Sales Hub data immediately when the cache is stale
- refreshes stale ClickUp data in the background instead of blocking normal viewing
- keeps manual `/api/sales-hub?refresh=1` for live proof and deliberate refreshes
- avoids the extra redundant live refresh after save actions

## Proof

- `npm run process:sales-listings-hub-check`
- `npm run backlog:hygiene -- --json`
- live `/api/sales-hub?refresh=1` proof
- manual `/sales#gls-dashboard` review
- manual `/sales#gls-system` review

## Conversation Review Capture

The following ideas from Steve's review are now backlog-owned:

- `SALES-GLS-GROUPING-OVERRIDES-001`: split/merge grouped GLS cases when auto-grouping is wrong.
- `SALES-GLS-RESTALE-REOPEN-001`: adjusted listings that go stale again reopen the same case as owner-needed.
- `SALES-GLS-MANAGER-USABILITY-001`: make the manager work queue tighter and easier to use.
- `SALES-GLS-LEADER-ACCOUNTABILITY-001`: turn leader rows into an accountability/reporting rhythm.
- `SALES-GLS-FUNNEL-FILTERS-001`: add date slicing to total GLS outcomes.
- `SALES-GLS-HISTORY-CONTROLS-001`: define safe hide/archive/delete controls for case history.
- `SALES-006`: enriched for the future GROW KPI Sales Dashboard, including GBS, Shopping List, and conversion-rate driver branches.
- `FOUNDATION-USERS-001`: enriched for external-user login method visibility and password fallback.

## Not Built

- No CRM replacement.
- No agent coach.
- No GBS system.
- No broad ClickUp/source expansion.
- No new Sales Hub menu sprawl.
- No Strategy/Scoper/Agent work.
- No additional email sends after Steve's approved leadership and John login sends.

## Next Review

Use V1 in Sales Hub, then choose the next GLS card from the captured follow-ups. The most operational next card is probably `SALES-GLS-GROUPING-OVERRIDES-001` if grouped-case trust becomes the blocker, or `SALES-GLS-LEADER-ACCOUNTABILITY-001` if the team wants the owner-meeting rhythm next.
