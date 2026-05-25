# BCrew AI OS UI Design Contract

Status: Active
Version: 2026-05-24-v3
Owner: Foundation / Steve

This is the builder-facing style source of truth for BCrew AI OS surfaces.
Mockups are evidence. This contract is the rule a builder must load before
touching login, hub launcher, Foundation, or any hub page.

## Locked Standard

The current locked style is the May 24 Dev Data Pool pass combined with the
approved login and hub launcher direction. The rule is simple: fun and pro,
but every operator-facing word must be plain English and every repeated UI
pattern must align cleanly.

The live `/dev` page is the implementation proof for the hub-page pattern:

- blue hero pill without blue glow bleed
- first content band white, then grey/white/grey alternating bands
- left-accent cards for repeated work/proof items
- big-number evidence cards
- compact source mini-cards
- Director accordion with preview
- plain-English labels such as `ready`, `next`, `total`
- no visible `source-backed`, database table names, or internal report jargon

The live hub launcher station grid is the implementation proof for the launcher
station-card pattern:

- left-accent hub status rails
- plain status text instead of chunky status pills
- one clean source/value line
- aligned dashed footers across the full card row
- equal card heights on desktop and mobile

## Canonical Evidence

Use these files as the approved visual direction:

- `public/mockups-restored-2026-05-15/login.html`
- `public/mockups-restored-2026-05-15/hub-launcher-v9.html` as the primary
  north star. This is the best overall capture of the desired BCrew look.
- `public/mockups-restored-2026-05-15/strategy-hub.html` for the top-page
  blue-pill/hero treatment. Strategy v1 has the better top band.
- `public/mockups-restored-2026-05-15/sales-hub-manager.html` for the simple
  useful blue-pill header and work-queue density.
- `public/mockups-restored-2026-05-15/strategy-hub-v2.html` for lower-page
  structure below the blue pill.
- `public/dev.html`, `public/dev.css`, and `public/dev.js` as the first live
  implementation proof of the locked hub-page pattern.
- `public/index.html` and `public/hub-launcher.css` as the live implementation
  proof of the locked launcher station-card pattern.

Secondary references:

- `public/mockups-restored-2026-05-15/foundation-home.html`
- `public/mockups-restored-2026-05-15/sales-hub.html`
- `public/mockups-restored-2026-05-15/ops-hub.html`

Do not use these as canonical style:

- `public/mockups-restored-2026-05-15/command-center.html` is rejected.
- `public/mockups-2026-05-21/dev-page.html` is drift evidence only. It mixed the
  new look with old habits and made the Dev page feel busy.

## Intent

The look is fun and pro at the same time:

- high-confidence command center, not generic SaaS
- strong BCrew real estate energy, not sterile AI dashboard
- operational and scannable, not a long report page
- source-backed where values are shown
- visually consistent enough that login, launcher, and hubs feel like one system

## Plain-English Rule

Steve and non-technical reviewers should understand a page without translating
system language.

Do:

- say `From Mark Kashef videos`, not `source-backed candidate`
- say `Saved findings + proof`, not `intelligence_atoms`
- say `Waiting for approval`, not `action_required_items`
- say `5 ready`, `10 next`, `56 total`, not `build-now`,
  `strong-next`, or `ranked`
- say `14 links Steve needs to OK before the system reads them`

Do not show these in normal operator UI:

- database table names
- raw report artifact IDs
- internal job names
- `source-backed`
- `crawl`, unless the page is a technical admin/debug page
- `ranked candidates`, unless the page explains the ranking in plain English

Internal proof can still exist in tooltips, checks, logs, or admin/debug views.
The normal page should explain what the proof means, not expose how the database
stores it.

## Core Tokens

Every new surface should start from the May 15 token block unless the task is
explicitly creating a new approved version.

```css
:root {
  --ink: #0A0F1A;
  --blue: #0084C9;
  --blue-up: #4DBDFF;
  --blue-deep: #005FA3;
  --white: #FFFFFF;
  --grey: #EBEBEB;
  --grey-1: #F5F7FA;
  --grey-d: #4B5563;
  --grey-line: rgba(10, 15, 26, 0.08);

  --display: 'Stratum1', 'Arial Black', sans-serif;
  --body: 'Open Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;

  --t-micro: 11px;
  --t-xs: 12px;
  --t-sm: 13px;
  --t-body: 14px;
  --t-md: 16px;
  --t-lg: 18px;
  --t-xl: 22px;
  --t-2xl: 28px;
  --t-3xl: 38px;
  --t-4xl: 48px;
  --t-5xl: 60px;
  --t-mega: 88px;

  --r-sm: 8px;
  --r-md: 14px;
  --r-lg: 22px;
  --r-pill: 999px;

  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 20px;
  --s-6: 24px;
  --s-8: 32px;
  --s-10: 40px;
  --s-12: 48px;
}
```

## Typography

- Stratum1 is for display headings, hub names, labels, numbers, and CTAs.
- Open Sans is for readable body copy.
- JetBrains Mono is for IDs, timestamps, counts, source IDs, and technical proof.
- Do not let Stratum1 fall back silently. A visual proof must show font files
  loaded.
- Do not use negative letter spacing except the canonical Stratum1 display
  treatment already present in the mockups.
- Keep body text at 14px or larger unless it is a compact label.

## Shell Patterns

### Login

Login is the exception surface:

- full-bleed blue/dark identity canvas
- large mascot/photo treatment
- one clean centered auth card
- minimal copy
- no hub navigation, no dashboard stats

### Hub Launcher

The hub launcher is the command center front door:

- topbar with logo, `BCREW AI OS`, `command center`, timestamp, live pill, user
  chip
- user chip opens an account menu with a plain `Log out` action so Steve can
  demo the login screen without clearing browser state
- topbar display font is `Stratum1` everywhere. Do not create page-specific
  aliases such as `LauncherStratum1`.
- large blue greeting band with mascot
- mission row
- hub cards as stations
- only source-backed values or explicit `Needs source`

Launcher station cards must use the same card philosophy as hub working pages.
The launcher is allowed to feel more celebratory, but the repeated hub cards
should not drift into a separate old UI system.

For launcher station cards:

- use the locked repeated-card skeleton: white card, thin border, 14px to 16px
  radius, stable row tracks, aligned footer line, and consistent hover lift
- prefer the left-accent status bar used on `/dev` when the card represents a
  hub/system status. Green/blue means live or healthy, amber means attention or
  partial, grey means planned/not active, and black means carve-out/strong
  system boundary
- do not use chunky status pills as the primary status pattern on repeated hub
  station cards
- if a status label is needed, use plain text or one compact badge in a
  consistent slot; do not combine a top accent bar, a status pill, a win box,
  and footer text in the same card
- Material-style icons are optional on launcher hub cards, but if used they
  must follow the same icon-circle pattern as the Dev Data Pool cards
- KPI/metric cards are a separate pattern. The launcher's hero KPI cards may
  keep their numeric treatment when the numbers are source-backed and aligned.

### Hub Pages

Hub pages use the light operating shell:

- white topbar using the same `launcher-topbar` / `launcher-brand` /
  `launcher-clock` / `launcher-live` / `launcher-user` classes as the hub
  launcher. Do not create page-local `topbar` or `tb-*` header systems.
- 248px left sidebar
- mobile topbar hides subtitles and clock first, keeps the live pill and avatar
  visible, and must not overflow horizontally
- max-width main content
- breadcrumb row
- Stratum1 uppercase page title
- optional blue doctrine/hero band when the page needs framing
- compact white cards with thin borders
- repeated items in consistent card grids or rows

The top-page blue pill is the preferred hub page opener when a surface needs a
hero/header:

- use the order `breadcrumb -> blue pill -> content`
- do not put a massive duplicate page title between the breadcrumb and blue pill
  unless the approved mockup for that exact surface requires it
- use the calm cyan-to-blue band from `strategy-hub.html` or
  `sales-hub-manager.html`
- keep it simple: eyebrow, one strong Stratum1 title, one useful sentence, one
  small status/action area if needed
- the blue pill does not need a blue glow. The blue color, black number rail,
  and shape already carry the energy. Use only a tiny neutral shadow or border
  so it does not bleed into the first content section.
- do not overfill the pill with many stats
- do not put large hub numbers, report counts, or dashboard stat grids inside
  the blue pill. If the page needs stats, put them in a separate stat strip
  directly below the pill.
- a black left rail with the hub/page number is allowed when it creates useful
  BCrew contrast and matches the page shell, but it must be the only heavy
  graphic element in the pill. Do not combine it with stat grids or extra
  decorative blocks inside the same pill.
- below the pill, use the clearer lower-page structure from `strategy-hub-v2.html`
  or `sales-hub-manager.html`

## Section Bands

Hub pages may use horizontal bands to separate major jobs.

Rules:

- The first content section after a blue pill is white. Do not put a grey band
  directly against the blue pill because it clashes and makes the top feel heavy.
- After the first white content section, alternate grey/white/grey when the page
  has multiple major sections.
- Use bands for meaning, not decoration. A band should separate a real job:
  recommendations, systems reading sources, evidence produced, source inputs,
  backlog, approvals, recent work.
- Keep band padding consistent. Do not leave a large dead gap between a closed
  accordion and the next section.
- Do not put cards inside cards just to create a band. Bands are page sections;
  cards are repeated items or focused tools.

Menus should open meaningful pages or views. Do not spend a full sidebar on
anchor links that only scroll one long report unless the task is explicitly a
single-page prototype.

## Cards And Panels

- Cards are for repeated items, focused tools, or grouped facts.
- Do not put cards inside cards.
- Prefer 8px to 14px radius. Avoid oversized soft cards.
- White card, `--grey-line` border, subtle shadow only when needed.
- Left accent bars are the default for repeated operating cards, status cards,
  source cards, extraction cards, evidence cards, and launcher hub station cards.
  Use top rules only for compact metric/KPI cards, legacy surfaces awaiting
  cleanup, or an explicitly approved design exception.
- Black top rule is for system/alert/strong emphasis.
- Every visible metric must be source-backed or clearly marked as placeholder or
  `Needs source`.
- Repeated cards must use stable grid tracks. Labels, titles, meta/date rows,
  body copy, and action/chip rows must line up across the whole row even when
  one title wraps.
- Do not let a long title push the date line, body, or chips lower than the
  neighboring cards. Use fixed/minmax row tracks, reserved title height, and
  bottom-aligned action rows.
- Do not overcorrect card alignment with giant fixed rows. Use adaptive rows:
  natural content flow, clear gaps, reserved minimum space only where needed to
  prevent collisions, and `align-items: start` when a solo card should stay
  tight instead of stretching to a full-row height.
- Do not use `flex-wrap` as the primary layout for repeated card structure when
  baseline alignment matters. Flex wrapping is fine inside a chip row only after
  the card rows are locked.
- Detail rows need explicit columns. Left label, middle explanation, and right
  status/action should have consistent tracks; middle columns must be
  left-justified, never floating or center-aligned by accident.
- Do not duplicate status as both a loose middle-column text value and a right
  status pill. Pick one status treatment, normally the right pill.
- Keep card patterns named and consistent on a page. If a page uses source
  cards, extractor/capability cards, and detail blocks, each pattern needs a
  clear job and a shared structure. Do not mix random card treatments because
  the content came from different APIs.
- Source cards show source-family status and value only. Do not show S/A/B/C
  quality grades until source-value scoring is actually wired. Source grade
  should roll up from the value of the items inside that source family, not from
  taste or assumed importance.

### Locked Hub Card Patterns

Use these patterns before inventing a new one.

**Left-accent repeated card**

- White card, thin border, 14px to 16px radius.
- 3px left accent bar.
- Green/blue means running or healthy. Amber means Steve/system attention is
  needed. Grey means planned or not active.
- Icon circle at the top when the item represents a system, source, or
  capability.
- Footer line stretches full width and aligns across every card in the row.
- Dates and metadata sit in the footer, not floating halfway down the card.

**Evidence number card**

- Use a large Stratum1 number.
- Label explains the number in two or three words.
- Body explains what the number means in plain English.
- Footer names the human-readable source or proof type.
- All footer divider lines must align across the row. Reserve equal footer
  height when one footer wraps.

**Source mini-card**

- Compact icon + source name + one status line.
- Use it for source families such as YouTube, Skool/Courses, GitHub, Gmail,
  Missive, Slack, or Meetings.
- On wide desktop, source mini-cards may use five columns when it avoids a
  single orphan card and the labels still read cleanly.
- Live/healthy sources do not need an extra `Live` pill in the detail panel.
  Only show a status pill when something needs attention.
- Selecting a source should reveal only new detail below. Do not repeat the
  whole source card as a second header.

**Director accordion**

- Closed state should preview what is inside.
- Counts use plain labels: `ready`, `next`, `total`.
- Open state shows short titles, plain-English descriptions, and a source line
  such as `From Mark Kashef videos`.
- Dim lower-priority items gently if needed, but do not make them look disabled
  unless they are actually unavailable.

## Pills And Badges

- Pills are compact status, filters, or actions. They are not free-floating
  copy decoration.
- A count group should be a visible pill group with plain labels (`5 ready`,
  `10 next`, `56 total`), not a random sentence floating in the middle of a panel.
- Status pills should use one meaning at a time: live/active, pending/needs
  source, verified/proof, or action required.
- Do not duplicate status. If a source card says `Running`, the detail panel
  does not also need a `Live` pill.
- Prefer no pill for healthy/live state on dense pages. Save visible pills for
  warnings, missing sources, approvals, locked state, or filters.
- Quality/rank badges are a different pattern from status pills. Do not use
  letter grades unless the score is source-backed and the page explains what is
  being graded.

## Imagery

- Mascot/photo assets should be transparent or intentionally staged.
- Do not use blurry blue boxes behind transparent mascot cutouts.
- Do not ship mascot cutouts with semi-transparent studio background, floor, or
  haze pixels. On blue hero surfaces these become visible as blurry rectangles.
- Do not over-clean cutouts. Hair, face, hands, and confetti need anti-aliased
  edge pixels preserved; otherwise blue leaks through the hairline and the
  subject looks clipped.
- If the supplied transparent asset is already acceptable, use it directly. Do
  not trim it just because it is on a blue page.
- Avoid heavy CSS `drop-shadow()` on full mascot cutouts in login/hero surfaces.
  It creates a dark halo around hair and face edges.
- Keep cleaned `*-cutout` mascot assets separate from the source art so the
  original image remains available for future edits.
- Do not add generic gradient orbs, glass blobs, or stock AI backgrounds.
- If a page uses the mascot, the image must reinforce the page's job. Login and
  launcher can be high-energy. Operational hub pages should use it sparingly.

## Data Rules

Foundation UP means hubs consume shared truth. A hub page should not invent its
own numbers.

When a page shows live data:

- identify the source ID or API behind it
- show `Needs source` when the source is missing
- do not hardcode KPI values into page JavaScript as final truth
- keep source proof out of the hero unless proof is the page's main job
- translate technical proof into plain-English visible copy. Keep raw source IDs
  and table names in admin/debug views, tooltips, or verifiers unless Steve is
  explicitly auditing sources.

## UI Build Rules

Before building a new surface:

1. Load this contract.
2. Load the closest canonical mockup files.
3. Decide whether the page is login, launcher, or hub-shell.
4. Create or update page-scoped CSS unless a shared-token change is explicitly
   approved.
5. Keep the first screen focused on the user decision or task.
6. Put raw proof, long logs, and evidence pools behind deeper views.

Before handoff:

1. Capture desktop and mobile screenshots.
2. Verify font files loaded.
3. Verify no console errors or failed requests.
4. Compare topbar, sidebar, headings, cards, and spacing to the canonical
   mockup family.
   - Hub pages must prove the shared launcher header classes render the same on
     desktop and mobile; "close copy" header CSS is not acceptable.
5. List every visible live value and its source. If unsupported, mark it
   `Needs source`.
6. Run a visible-copy scan. Normal operator pages should not show internal
   language such as `source-backed`, `ranked candidates`, database table names,
   raw artifact IDs, or job keys.
7. Check repeated card alignment. Titles, body rows, footer divider lines, dates,
   and metadata must line up across the row on desktop and mobile.

For high-sensitivity UI work, run a visual critique against this contract and
the canonical mockups before calling it done. Promote only the durable lessons
into this contract or a handoff; do not make future builders chase old chat or
stale audit drafts.

## Current /dev Direction

- `/dev` is the first live proof of the locked hub-page pattern.
- `/dev` is not a busy all-in-one report and should not copy the May 21 Dev
  attempt.
- The active Dev surface is `Data Pool`: one page showing the Dev-relevant slice
  of the shared Foundation intelligence pool.
- Current page order is locked until a new approved design changes it:
  blue pill, Director Lens, Extraction Systems, Evidence Produced, Source
  Inputs.
- Director Lens comes first because Steve should see the useful
  recommendations before reading extraction mechanics or source proof.
- Extraction Systems explain what is reading/hearing/watching/navigating
  sources.
- Evidence Produced explains what the system found in plain English.
- Source Inputs show where the data came from and what is active, pending, or
  planned.
- The old neural map is useful as reference evidence and may remain behind a
  `Launch Map` action, but it is not the main operating UI.
- Technical source proof belongs in APIs, checks, verifiers, source detail, or
  admin/debug views unless Steve is explicitly auditing source plumbing.
