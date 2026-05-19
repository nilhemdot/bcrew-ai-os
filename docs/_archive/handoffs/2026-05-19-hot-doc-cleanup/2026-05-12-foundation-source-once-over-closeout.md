# Foundation Source Once-Over Closeout - 2026-05-12

## Status

The Foundation Source Once-Over sprint is complete for v1 and pushed to `origin/main`.

Latest commit: `96fae9e` (`FOUNDATION-UI-COMPLETE-001 add source depth overview`)

The dashboard and Foundation worker were restarted by the ship gate and both served `96fae9e` during proof.

## What Shipped

Source Once-Over commits, in order:

1. `42cab80` - `SOURCE-MATURITY-GRID-001`: seven-stage maturity grid for every source contract.
2. `91808ed` - `SOURCE-EXTRACTION-COVERAGE-001`: source-level extraction status, last success, failures, and attention states.
3. `5ba52fa` - `SOURCE-COVERAGE-CLOSEOUT-001`: explicit routed decisions for source rows that are not green.
4. `a6dcf4f` - `MARKETING-SOURCE-MAP-001`: avatars and marketing sources mapped to five brand lanes.
5. `b545079` - `BRAND-STACK-001`: five brand entities and Brand Guardian boundaries modeled as Foundation data.
6. `20fafba` - `TIER-BEHAVIORAL-COMPLETION-001`: first non-owner read surfaces classified as owner-only or role-filtered.
7. `eb748c3` - `VERIFICATION-RUNS-001`: stale research/finding/action/backlog review candidates surfaced as proposed-only.
8. `40a351c` - `PER-USER-CHANGELOG-001`: per-actor activity history from existing change events.
9. `cdd27a1` - `DECISION-RESTRICTED-QUEUE-001`: sensitive decision classifier and owner-only restricted queue.
10. `96fae9e` - `FOUNDATION-UI-COMPLETE-001`: Source Lifecycle now starts with a scan-friendly Foundation 30-Second Read that aggregates all ten Source Once-Over surfaces.

## Proof

Final ship gate for `FOUNDATION-UI-COMPLETE-001` passed:

- `process:ship-check`: 31/31
- `process:fanout-check`: 22/22
- `process:post-ship-fanout`: 8/8
- `foundation:verify`: 264/264
- Total gate time: 186.4s, within the 300s target

Focused proof immediately before commit also passed:

- 10 Source Once-Over sections visible
- 35 sources counted
- 18 source maturity gaps visible
- 7 extraction attention items visible
- 5 brand lanes
- 15 avatars
- 5 brands
- 14 tier surfaces
- 54 stale verification candidates
- sprint complete with 10 done-this-sprint rows
- product expansion stayed false

One transient Postgres deadlock occurred on the first focused-proof run during DB initialization. The rerun passed cleanly. This matches the known transient class already covered by gate reliability work.

## Where To Look

- Foundation UI: `Foundation > Data Sources > Source Lifecycle > Foundation 30-Second Read`
- API: `/api/foundation/source-lifecycle` exposes `foundationUiComplete`
- API: `/api/foundation-hub` exposes `foundationUiComplete`
- Current plan: `docs/rebuild/current-plan.md`
- Current state: `docs/rebuild/current-state.md`
- Closeout: `foundation-ui-complete-v1` in `lib/foundation-build-log.js`

## Important Meaning

This sprint makes Foundation depth visible and governed. It does not mean every source is fully green.

The UI now shows the actual state:

- source maturity gaps are visible
- extraction attention items are visible
- routed follow-up rows are visible
- marketing source/brand data exists as Foundation data
- tier, audit, stale-review, and restricted-decision guardrails are visible

That is the correct v1 outcome: Steve no longer needs an outside audit to see where Foundation is strong or where the next source work is.

## Not Built

This sprint did not build:

- Reply Parser
- Watching Items
- Strategy Hub expansion
- Marketing production pipeline
- Telegram/mobile assistants
- Department Directors or Master Director
- new source ingestion
- Drive ACL mutation
- request-access emails

## Next Decision

Do a short sprint review/rollover before pulling any product-layer card.

Recommended decision point:

1. If Steve wants Foundation deeper before product work, start with the routed source follow-ups: `SOURCE-EXTRACTION-GAP-FOLLOWUP-001` and `SOURCE-MATURITY-GAP-FOLLOWUP-001`.
2. If Steve accepts the visible/deferred source gaps for v1, the next old-system rebuild target is `REPLY-WATCHING-LOOP-001`.
3. Do not silently roll straight into Reply/Watching Loop while the Source Once-Over gaps are still a business decision, not an automatic engineering decision.

Plain English: the Source Once-Over sprint is shipped and proven. The system now shows Foundation depth in one place. The next move is not more hidden build work; it is deciding whether the visible source gaps must be closed before the first product-behavior sprint.
