# FOUNDATION-SURFACE-UPDATES-001 Plan

## What

Make Foundation easier to operate without reading chats, git logs, or raw file paths. The v1 surface should show Steve where to click from Overview to Systems, Backlog, and Recent Work; make Recent Work location metadata useful; and make done backlog rows carry an honest done-date signal.

## Why

Foundation is Steve's CEO dashboard for system-building. If it shows useful data but hides where to click, where shipped changes live, or when done rows moved, the page still creates operator drag. This card turns existing live data into a clearer operator path without adding new system behavior.

## Reuse Existing Work

- Existing code reused: `public/foundation-current-state-renderers.js`, `public/foundation-operations-renderers.js`, `public/foundation.js`, `lib/foundation-verifier-operator-live-surface-assurance.js`, and `lib/foundation-recent-builds-verifier.js`.
- Existing docs reused: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/foundation-sprint-system.md`, and `docs/process/foundation-sprint-system-001-plan.md`.
- Existing scripts reused: `scripts/process-foundation-sprint-system-check.mjs`, `scripts/process-verifier-operator-live-surface-assurance-split-check.mjs`, `scripts/process-verifier-recent-builds-closeout-split-check.mjs`, and the new focused proof script.
- Current Sprint and live backlog truth reused: the card starts from the live `FOUNDATION-SURFACE-UPDATES-001` backlog row and the live active Current Sprint blocker.
- Existing policy reused: `FOUNDATION-SPRINT-SYSTEM-001` scoped this card as the broader operator UX follow-up, while the park-and-continue policy prevents one blocked action from stopping the sprint.

## Details

The live surfaces have the right data, but they still make Steve translate too much:

- Overview does not give a simple operator path for which Foundation page to open next.
- Recent Work shows `whereItLives` mostly as text, so app/doc destinations are not consistently clickable.
- Done backlog rows show an updated timestamp, but not an explicit done-date signal or honesty boundary.
- Existing verifier expectations still assume this card must stay scoped, which would make closing the card look like a regression.

Implementation:

1. Add `renderFoundationOperatorPathPanel()` to the Overview renderer. It must show `Overview -> Systems -> Backlog -> Recent Work` and link each page.
2. Add `resolveBuildLocationHref()` and `renderBuildLocationList()` to the Recent Work renderer. They must render `whereItLives` entries as app/doc/repo breadcrumbs:
   - Foundation app surfaces link to their `/foundation#...` route.
   - Docs link to `/doc?path=...`.
   - Backlog references link to `/foundation#backlog:<id>`.
   - Code/proof locations remain visible as repo/proof labels instead of pretending to be browser routes.
3. Update the Backlog renderer's existing timestamp row. It must show an explicit Backlog done-date signal for done rows, using `closedAt` when available and otherwise labeling `updatedAt` honestly as the done/last-updated signal.
4. Update verifier expectations so `FOUNDATION-SURFACE-UPDATES-001` can be either the old scoped follow-up or the new shipped closeout.
5. Add a focused process check that validates the plan approval, Plan Critic score, live Current Sprint ownership, UI source markers, dogfood rejection of text-only locations, package wiring, closeout registry, and safe sprint closeout.

Behavior proof is through the focused process command plus the real renderer/source functions. The proof does not rely on one substring only: it evaluates the exact helper names, safe link rules, live Current Sprint/backlog ownership, approval integrity, closeout registry, and dogfood location samples.

Gate decision tree: this card is a focused UI/process slice with full final ship because the changed files include operator-facing renderers and verifier expectations. The blast radius is bounded to Foundation Overview, Recent Work, Backlog, verifier expectations, and closeout metadata. Static proof is not enough; focused proof runs first, then `foundation:verify`, then full `process:foundation-ship`.

## Acceptance Criteria

- Overview shows a plain-English operator path with links to Overview, Systems, Backlog, and Recent Work.
- Recent Work turns app/doc/backlog `whereItLives` entries into clickable local links.
- Repo/code/proof `whereItLives` entries remain visible but are not fake links.
- Backlog done rows show a moved-to-done or done/last-updated signal.
- Existing verifier expectations accept the card as shipped under `foundation-surface-updates-v1`.
- Current Sprint can close the last card with all items done and no active blocker before the next sprint rollover.
- Operator value: Steve gets a real workflow for checking Foundation without babysitting builders: start at Overview, inspect Systems, open Backlog for queued work, then use Recent Work to see what shipped and where to click.
- This unlocks speed and quality because builders can point to visible app/doc locations instead of relying on chat memory or raw git paths.

## Tests

- `npm run process:foundation-surface-updates-check -- --json`
- `npm run process:foundation-surface-updates-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-SURFACE-UPDATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-SURFACE-UPDATES-001.json --closeoutKey=foundation-surface-updates-v1 --commitRef=HEAD`

## Risks

- Broken app/doc links could create more confusion than plain text.
- Backlog date language could accidentally overclaim a true done transition when only `updatedAt` is available.
- Old verifier assumptions could keep treating the card as scoped even after it ships.
- UI churn could sprawl into a broad redesign if the patch is not kept narrow.

Mitigation: the focused proof dogfoods location classification, checks honest done-date labels, requires verifier transition markers, and keeps the changed file set bounded.

Repair path: if any proof fails, fail closed, fix the renderer/verifier/backlog truth that caused the failure, rerun the focused proof, and only then continue to full ship. If the done-date signal proves too weak, reopen or scope a follow-up rather than inventing transition history.

## Not Next

- No broad Foundation redesign.
- No new source, extractor, agent, or value workflow.
- No external writes, sends, Drive permission changes, credential mutation, provider access, or paid/browser-auth work.
- No attempt to solve the future done-velocity chart beyond preserving the done-this-sprint count and date signal.
- No hardcoded live sprint or health values in markdown.

## Definition Of Done

- Overview shows a plain-English operator path with app links.
- Recent Work `whereItLives` renders clickable app/doc/backlog breadcrumbs and honest repo/proof labels.
- Backlog done rows show a done-date signal without inventing unavailable transition history.
- `FOUNDATION-SURFACE-UPDATES-001` is done in Backlog and Done This Sprint after closeout.
- Current Sprint can be all-done with no active blocker and remain healthy pending the next sprint rollover.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- The focused proof is proportional and fast enough to use by default before the heavier final gates.
