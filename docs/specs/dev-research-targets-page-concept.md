# Dev Data Pool Page Concept

Status: Active design checkpoint
Version: 2026-05-24-v2

## Purpose

This page proves the Dev hub can see the Dev-relevant slice of the shared
Foundation intelligence pool.

It is not the full Dev backlog, not the Sprint page, not the neural workflow
map, and not a giant report page.

Plain-English answer:

> What sources are feeding Foundation, which of those matter for Dev, what is
> active, what is pending approval, and what evidence-backed build intelligence
> is available?

## Ownership Model

The extractor works for Foundation, not for one hub.

Foundation owns:

- source connectors
- browser/session/auth boundaries
- extraction runs
- raw artifacts
- atoms
- evidence hits
- intelligence reports
- approval-required items

The Dev hub owns:

- a filtered view of the Foundation intelligence pool
- Dev-specific interpretation
- build candidates
- scoping requests
- what Steve should approve or build next

The Dev Intelligence Director is the first hub-specific reader. It reads the
shared Foundation pool and says, "from everything Foundation collected, these
items matter for building BCrew AI OS."

## Recommended Shape

Use one Dev menu item for now:

- `Data Pool`

The old neural workflow map should be linked from the blue pill as `Launch Map`,
not forced into the main page. It is reference/flow evidence, not the working
research inventory.

## Recommended Name

Menu label: `Data Pool`

Page title: `Dev Data Pool`

Why: the menu should stay simple and match Steve's mental model. The page must
make clear that this is not a separate Dev database. It is the Dev slice of the
shared Foundation data pool.

## Data Pool Page First Screen

Top blurb:

> This is the Dev view of the Foundation data pool. Foundation extracts from
> approved sources, stores the artifacts/atoms/reports, and Dev pulls the
> system-building signals from that shared pool.

Truth rule:

- If the value comes from `/api/foundation/dev-team-hub` or a named Foundation
  source contract, show it.
- If the field is known but not wired, show `Needs source`, `Pending registry`,
  or `Pending approval`.
- Do not show final-looking hardcoded stats.

The first screen should show source-type cards first:

- YouTube
- Skool Paid
- Skool Free
- Courses / Trainings
- GitHub / Repos
- Community Chats
- Email / Slack / Internal Signals
- Agent Feedback

This matches the bottom-up model: Foundation source extraction feeds the pool,
the Dev Intelligence Director reads the relevant slice, director output becomes
build candidates, candidates become scoped work.

Each source-type card should show:

- active target count
- pending target count
- last extraction run
- newest useful signal
- reports/candidates produced
- boundaries: public, paid approved, auth required, internal only, or pending
  approval

Clicking a source-type card should open a detail drawer or filtered view first.
Do not create a separate route for every card in v1.

## Source Type vs Creator

Use source type as the first grouping, then creators/targets inside it.

Reason: source-type cards show whether the system is connected to the right
research channels. Creator cards alone hide the bigger operating question: "are
we watching YouTube, Skool, paid courses, GitHub, communities, and internal team
signals correctly?"

Creator/target profiles still matter. A target like `Mark Kashef` should appear
inside each connected source type:

- YouTube: active
- Skool Paid: pending/approved auth boundary
- Course: pending approval
- Community Chat: pending approval

Later, clicking Mark can open a target profile that aggregates all of his
surfaces. In v1, keep this as a drawer/detail panel, not a new page.

## Target Card Model

Each target card should show:

- name: `Mark Kashef`, `Kia Ghasem`, `Matt Pocock`, `Stacked Podcast`, etc.
- target type: creator, community, course, repo, blog, podcast
- value grade: S, A, B, C, D, F
- status: Active, Pending Approval, Parked, Blocked
- surfaces watched: YouTube, Skool, GitHub, blog, X, course, community chat
- extraction mode: metadata watch, transcript, God Mode video, comments, links,
  private approval required
- current depth: last 50, last 20, daily latest, one-video proof, pending
- last run and next run
- latest useful item
- output count: reports, candidates, promoted cards, approval items
- boundaries: public-only, paid approved, auth required, do not follow links

## Page Layout

Use the approved hub shell:

- topbar from hub launcher / hub pages
- left sidebar with only `Data Pool` at first
- blue-pill header pattern from `strategy-hub.html` or
  `sales-hub-manager.html`, not the rejected command-center style
- breadcrumb, then blue pill, then short explanation
- filter pills: All, Active, Pending, Parked, S-Tier, Internal, External
- source-type card grid at the top, visually connected to the shared Foundation
  pool concept
- target cards inside the selected source type

Suggested groups:

1. `Active`
   - running now or scheduled
   - show next run and last report
2. `Pending Approval`
   - useful target but needs login/private/source approval
   - show exact approval needed
3. `Parked`
   - known target, not extracting yet
   - show why parked
4. `Watchlist Ideas`
   - Steve-mentioned targets not fully normalized yet

## What Not To Put Here

- no full backlog
- no shipped-work feed
- no raw transcript text
- no full evidence hits
- no neural pipeline visual
- no fake stats
- no five-page Dev rebuild in v1

The old neural map can live as `Dev Map` or reference evidence. This page should
be the clean operating inventory of the Dev slice of the Foundation data pool.

## Draft Dev Sidebar V1

For the first version, keep the Dev menu small:

- Data Pool

Do not add Sprint, Backlog, Recent Work, Approvals, Health, and Governance until
the page proves a real need. Foundation already has working sprint/backlog
surfaces.

Possible later menu, only after v1 proves value:

- Intelligence Reports
- Build Candidates
- Dev Map

## Data Source Direction

The page should eventually read from Foundation source/intelligence truth:

- creator watchlist / approved research target registry
- extraction run ledger
- intelligence report artifacts
- candidate/opportunity outputs
- approval-required items

If a field is not wired yet, show `Needs source` or `Pending registry` instead
of pretending.

## Current Truth Gap

The visual page is now wired to `/api/foundation/dev-team-hub`.

Current live API proof at checkpoint:

- API status: `ready`
- research pool: `200`
- ranked opportunities: `7`
- approval-required links: `14`
- atoms: `7`
- evidence hits: `7`
- God Mode eyes build candidates: `6`
- Dev Intelligence Director recommendations: `5`
- Mark latest video: `tjjX43FoAUg`
- Mark tracked count: `50`

Known remaining gap: Skool, GitHub/repo, internal email/meeting, and community
source cards are still shown as `Needs source`, `Pending registry`, or `Not
exposed here` until those source registries are wired into the Dev slice.

## Completed Live Wiring Slice

`DEV-DATA-POOL-LIVE-WIRING-001`

Status: implemented as a focused Dev Hub V0 wiring pass; not a separate broad
Dev workflow rebuild.

Goal: make `/dev` a truthful read-only Dev Data Pool surface.

Completed scope:

- wired `public/dev.js` to `/api/foundation/dev-team-hub`
- replaced hardcoded blue-pill values with live values
- replaced active source cards with Foundation-backed source contracts,
  target/watchlist status, report counts, approval counts, and candidate counts
- fixed the Mark/source mapping so active YouTube data does not show as
  `Needs source`
- exposed the persisted Dev Intelligence Director report in the API and page
- kept the page to one menu item, `Data Pool`
- kept the old neural map as a reference link only
- updated `process:dev-team-hub-v0-check` to prove the live wiring

Not in scope:

- rebuilding Sprint, Backlog, Recent Work, or full Dev workflow pages
- creating a separate Dev data store
- running new broad extraction
- auto-promoting candidates into backlog cards
