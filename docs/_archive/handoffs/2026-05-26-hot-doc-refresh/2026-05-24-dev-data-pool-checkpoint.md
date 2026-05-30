# 2026-05-24 Dev Data Pool Checkpoint

## Plain-English Read

The architecture direction is right:

`approved sources -> Foundation pool -> hub-specific reader/director -> build candidates -> Steve approval -> scoped work`

The Dev hub should not own its own extractor or data silo. Foundation owns source
contracts, extraction runs, raw artifacts, atoms, evidence hits, reports, and
approval-required items. Dev owns the filtered view and the Dev Intelligence
Director interpretation.

## What Is Real

- `/api/foundation/dev-team-hub` exists and returns `ready`.
- The Dev Hub V0 proof already showed Foundation Build Intel can reach a real
  hub without creating a Dev-only store.
- Current API readback at this checkpoint:
  - research pool: `200`
  - ranked opportunities: `7`
  - approval-required links: `14`
  - atoms: `7`
  - evidence hits: `7`
  - God Mode eyes build candidates: `6`
- The current sprint still treats `MARK-KASHEF-LAST-50-BASELINE-001` as the
  active build card.

## Live Wiring Update

The redesigned `/dev` Data Pool page now consumes `/api/foundation/dev-team-hub`.
The page is still read-only and does not run extraction, write backlog cards, or
apply approvals.

The live wiring pass also fixed the Mark/source mapping gap:

- Mark latest video: `tjjX43FoAUg`
- Mark tracked count: `50`
- Dev Intelligence Director report exposed: `director:dev-team-intelligence-director-001:aios-mission-v0`
- Director picks exposed: `5`

Remaining source gaps are explicit on the page: Skool, GitHub/repo, internal
email/meeting, and community cards show pending/needs-source states until those
registries are wired into the Dev slice.

Follow-up adjustment after Steve reviewed the page:

- Director Lens moved directly under the "How this works" blurb.
- Director Lens is collapsed by default and shows the useful counts first:
  `5` build-now, `10` strong-next, `56` ranked total.
- The "Active Extractors" section was renamed to "Extraction System" because the
  cards are capabilities/lanes in the shared Foundation extraction system, not
  separate Dev-owned extractors.
- Internal signals are now visible as Foundation lanes: Meetings/transcripts,
  Gmail/Missive, Slack, and Synthesis + Action Router.
- These internal lanes are still not Dev Director inputs until a Dev relevance
  route is wired; the page should say that plainly instead of pretending those
  sources are fully connected to Dev recommendations.
- The three status-only middle cards (`ACTIVE CARD`, `DIRECTOR`, `SOURCE PROOF`)
  were removed because they duplicated proof already visible elsewhere and had
  no action.
- The "Data Sources" section was renamed to "Source Systems" and cleaned up:
  source cards should be real source families such as YouTube creators, video
  artifacts, Gmail/Missive/Slack, Meetings/transcripts, Skool/paid courses, and
  GitHub/repos. Do not show the Dev Director, God Mode Eyes, Creator Watchlist,
  or report bundles as if they are source systems.
- Current visible Source Systems: YouTube Creators, Video Artifacts,
  Skool/Paid Courses, GitHub/Repos, Gmail/Missive/Slack, and
  Meetings/Transcripts.

Second UI cleanup after screenshot review:

- Director Lens open state was too busy because it repeated Mission and Report
  metadata before showing the actual recommendations. The dropdown now keeps the
  mission/counts in the summary and uses compact recommendation rows inside.
- Extraction System cards now use fixed grid rows for label, title, run date,
  body, and capability chips. Long titles can wrap without pushing dates or
  chip rows out of alignment.
- Selected source rows no longer duplicate status in a loose middle column and
  a right pill. Rows now use left identity, left-justified explanation, and one
  right-aligned status pill.
- `docs/specs/bcrew-ui-design-contract.md` now explicitly requires repeated
  cards and detail rows to use stable tracks and aligned baselines.
- Layout proof screenshot:
  - `/tmp/bcrew-dev-data-pool-layout-cleanup.png`

Third UI cleanup after Steve reviewed the cleaned layout:

- Director count text is now a deliberate pill group: `5 build-now`,
  `10 strong-next`, `56 ranked`. It no longer floats as a sentence in the
  middle of the Director panel.
- Extraction cards were shortened by limiting visible capability chips and
  truncating long chip text. The page should not create massive cards just to
  preserve every capability label.
- Source cards now use compact status pills (`Live`, `Verified`, `Pending`,
  `Needs source`) instead of raw contract wording.
- Removed source letter grades from the live page for now. Steve likes S/A/B/C
  grading, but only when it is real. Future `Source Value Grade` should roll up
  from the quality/value of the targets inside that source family, e.g. YouTube
  grade comes from creator/video value, not a hardcoded taste label.
- Selected source detail is now a compact block row. Mark no longer shows the
  latest video title as unexplained noise; it shows tracked count, watch status,
  and last run.
- Updated screenshot:
  - `/tmp/bcrew-dev-data-pool-card-system-v5.png`

Gemini UI/UX audit pass:

- Ran Gemini API reviewer against `/dev` plus canonical screenshots for hub
  launcher v9, strategy hub v1, and sales hub manager.
- Saved audit:
  - `docs/audits/2026-05-24-gemini-dev-ui-ux-audit.json`
  - `docs/audits/2026-05-24-gemini-dev-ui-ux-audit.md`
- Applied high-confidence fixes from the audit:
  - simplified the blue pill and moved the `07` block back as a deliberate
    black left rail after Steve confirmed the black/blue contrast was part of
    the desired energy
  - moved flow stats out of the blue pill into a separate stat strip
  - normalized drifting type sizes back toward design tokens
  - kept Director counts as explicit count pills
  - standardized card accent width
- Post-audit screenshot:
  - `/tmp/bcrew-dev-data-pool-gemini-audit-v6.png`

Adaptive card spacing pass:

- Replaced fixed-height extractor card rows with adaptive rows so short content
  stays tight and solo cards do not inherit dead space from grouped cards.
- Source cards now reserve enough title/body space to prevent title/body
  collision, but no longer rely on brittle fixed title rows.
- Pills/tags moved to the 12px floor and several invented font sizes were
  removed.
- Sidebar grey rail now belongs to the full shell background so the menu column
  stays visually continuous down the whole page; the menu remains sticky.
- Screenshot:
  - `/tmp/bcrew-dev-data-pool-adaptive-cards-v8.png`

## Locked UI Direction

- First Dev page is one menu item only: `Data Pool`.
- The old neural workflow map stays available through `Launch Map`; it is
  reference evidence, not the main working page.
- Use the approved BCrew shell and blue-pill treatment from the May 15 mockups,
  especially hub launcher v9, strategy hub v1, sales manager, and strategy hub
  v2 lower-page structure.
- Do not use the rejected command-center mockup or the busy May 21 Dev attempt
  as the style standard.

## Page Blurb

Use this truth statement near the top of the page:

> Dev does not crawl sources directly. Foundation ingests approved sources into
> the shared intelligence pool. This page shows the Dev-relevant slice: what
> sources are active, what intel is coming in, what needs approval, and what can
> become build work.

## Completed Wiring Slice

`DEV-DATA-POOL-LIVE-WIRING-001`

Goal: make `/dev` a truthful read-only Dev Data Pool surface.

Completed:

- wired `public/dev.js` to `/api/foundation/dev-team-hub`
- replaced hardcoded blue-pill values with live values or explicit pending
  states
- replaced active source cards with Foundation-backed source contracts,
  target/watchlist status, report counts, approval counts, and candidate counts
- fixed the Mark/source mapping gap
- exposed Director report output in the API and UI
- keep the page to one menu item, `Data Pool`
- keep the old neural map as a reference link only
- proved desktop/mobile render with no console errors, failed requests, or
  horizontal overflow
- proved the Director-first/collapsed pass with Playwright:
  - `/tmp/bcrew-dev-data-pool-director-top.png`
- proved the source-system cleanup with Playwright:
  - `/tmp/bcrew-dev-data-pool-source-systems.png`

Not next:

- rebuilding Sprint, Backlog, Recent Work, or full Dev workflow pages
- creating a separate Dev data store
- running new broad extraction
- auto-promoting candidates into backlog cards

Proof:

- `npm run process:dev-team-hub-v0-check -- --json`
- Playwright screenshots:
  - `/tmp/bcrew-dev-data-pool-live-desktop.png`
  - `/tmp/bcrew-dev-data-pool-live-mobile.png`

## Supporting Docs

- `docs/specs/bcrew-ui-design-contract.md`
- `docs/specs/dev-research-targets-page-concept.md`
- `docs/_archive/handoffs/2026-05-22-dev-team-hub-v0-closeout.md`
- `docs/_archive/handoffs/2026-05-24-dev-team-intelligence-director-overnight-checkpoint.md`
