---

## Dev Data Pool UI Review — 2026-05-24

### 1. Verdict

The Dev page has correct shell structure, token usage, and typography loading, but it fails Steve's feedback on every specific point: active/hover are visually identical, card heights vary within rows, target rows don't share column edges with source cards, and hover only exists on one card type. The page reads as "close" from code but broken from the chair. No more implementation until the 8 patterns below are locked.

### 2. Consensus Design Philosophy to Lock

The Dev page is a **hub page** (not a launcher). Its north star is Strategy v1 / Sales Manager: sidebar shell, blue-pill opener, stat strip, then sectioned card grids on white. Hub launcher v9's dark station cards are a different context — that split is correct per the design contract. The single rule: **every repeated card on this page must inherit from one base card class with locked internal grid rows, one shared hover pattern, and a distinct active/selected treatment.** Foundation's status-card and Dev's source-card/extractor-card must converge on that base.

### 3. Findings by Severity

#### CRITICAL

**F1. Active and hover are identical on source cards.**
- Evidence: `dev.css:1007-1011` — `.source-card:hover` and `.source-card.active` share the exact same rules (border-color, box-shadow, transform). `dev.js:222` auto-selects the first card as `.active` on load.
- Result: The first card permanently looks hovered. User can't distinguish "selected" from "about to click." This is the loudest feedback item.
- Fix: Active gets `border: 2px solid var(--blue)` (use negative margin or box-shadow inset to avoid layout shift), `background: rgba(0,132,201,0.02)`, NO transform, NO lift shadow. Hover keeps the current subtle lift + soft blue shadow. These must be visually distinct at a glance.

**F2. Source cards are different heights within the same row.**
- Evidence: `measurements.json` — Row 1 heights: 249, 290, 257, 257px. Row 2 heights: 268, 290px. The 41px variance is visible in `dev-current-source-systems.png` (Video Artifacts and Meetings/Transcripts are taller).
- Root cause: `dev.css:984` sets `align-items: start` on `.source-grid`, allowing each card to shrink to its content.
- Fix: Remove `align-items: start` from `.source-grid`. CSS Grid's default `stretch` will force cards in the same row to match the tallest. The internal `grid-template-rows` on `.source-card` (line 990) already handles internal element alignment — it just needs the outer card to be the same height as its siblings.

#### HIGH

**F3. Target panel detail cards don't align with source cards above.**
- Evidence: Source cards left edges at x: 280, 563, 845, 1128. Target rows left edges at x: 303, 664, 1024. The 23px offset comes from `.target-panel`'s own 22px padding wrapping a 3-column grid inside a bordered panel.
- Result: Source → Target reads as two unrelated sections rather than a drill-down.
- Fix: Either (a) make target-list use 4 columns matching source-grid and remove the panel wrapper's padding from affecting column alignment, or (b) keep the panel wrapper but make the target-row grid columns explicitly share the same track positions as source-grid using consistent left-edge math.

**F4. Hover exists only on source cards; all other card types are flat.**
- Evidence: Only `.source-card` has `transition` (line 994) and `:hover` styles (line 1007). `.extractor-card`, `.candidate-card`, `.f-stat`, `.target-row` — none have hover.
- Result: One section feels modern/interactive; the rest feel dead. Steve noticed this contrast.
- Fix: Define one hover pattern (see Section 4). Apply it to every card that is clickable or represents an entity the user can inspect. Non-interactive cards (stat strip, truth-blurb) get no hover.

**F5. Sidebar border-right doesn't extend full page height.**
- Evidence: `.sidebar` height is `calc(100vh - 71px)` = ~829px, but page scrollHeight is 2513px. The `border-right: 1px solid var(--grey-line)` on `.sidebar` (line 281) only renders for 829px. The `.shell` gradient paints grey below, but without the hairline divider. In the full-page screenshot the grey rail visually "ends."
- Fix: Move the border from `.sidebar` to a `.shell::after` pseudo-element: `position: absolute; top: 0; left: var(--sidebar-w); width: 1px; height: 100%; background: var(--grey-line)`. This renders for the full `.shell` height regardless of sidebar scroll position.

**F6. Extractor/source card internal spacing has touching text and dead air.**
- Evidence: `dev.css:778` — uniform `gap: 12px` for all 5 internal rows. In `dev-current-full.png`, the "Slack" card has sparse body text with the same gaps as "YouTube / God Mode Pipeline" which is dense. Label-to-title gets the same gap as body-to-caps, which is wrong — the label is a tiny eyebrow that should sit tight above the title.
- Fix: Replace the uniform gap with row-specific spacing. Label→title: 6px. Title→status: 8px. Status→body: 10px. Body→caps: 12px. Use padding or margin on individual rows instead of a single `gap` value, or use `row-gap` with named grid areas that have padding.

#### MEDIUM

**F7. Foundation card style and Dev card style have diverged.**
- Evidence: Foundation live screenshot — cards are `.status-card` inside `.panel` wrappers with panel-headers. No `::before` blue accent bar, no tag-pill rows, different internal grid shape. Dev screenshot — cards have `::before` accent bar, title-row with inline status badge, tag-pill row, different internal proportions.
- Result: Opening Foundation then clicking into Dev feels like two different products.
- Fix: Don't fix card-by-card. Lock the base card pattern (Section 4), then reconcile Foundation's cards to inherit from the same base in a separate pass after Dev is approved.

**F8. Extractor card row 2 is shorter than row 1 (322px vs 343px) — Slack card.**
- Evidence: `measurements.json` extractorCards — cards 0-2 are 343px tall, card 3 (Slack) is 322px. Same `align-items: start` problem as source cards.
- Fix: Same as F2 — remove `align-items: start` from `.extractor-grid` (line 769).

### 4. Reusable Patterns to Define

These 8 patterns must be named, specced, and locked in `bcrew-ui-design-contract.md` before the next implementation pass.

| Pattern | Job | Key specs |
|---|---|---|
| **Base card** | Atom for all repeated items | White, `--grey-line` border, `--r-md` radius, 18px padding, optional `::before` blue accent bar (36px wide, 3px, offset 22px from left). Internal CSS grid with named template-rows. |
| **Blue pill** | Page opener/hero | Ink left number rail + blue gradient body. One Stratum1 title, one tag line, one CTA. Already close — lock current `.foundation-card` as canonical. |
| **Hover** | Interactive affordance | `border-color: rgba(0,132,201,0.25)`, `translateY(-1px)`, `box-shadow: 0 12px 28px rgba(0,132,201,0.08)`, `transition: 160ms`. Apply to all clickable cards. |
| **Active/selected** | Current selection state | `border: 2px solid var(--blue)` (inset or negative-margin to avoid shift), `background: rgba(0,132,201,0.02)`, NO transform, NO lift shadow. Must be visually distinct from hover. |
| **Source card** | Source-family status | Base card + label, title-row (h3 + status badge), 4-line body, tag pills. `grid-template-rows` locks each zone so cards align across a row. |
| **Extractor card** | Extraction capability | Base card + label, h3, mono status/date line, 4-line body, capability pills. Own template-rows tuned to extractor content. |
| **Detail row** | Drill-down item inside a panel | `--grey-1` background, `--r-sm` radius, 14px padding. Head row: strong title + mono subtitle left, status pill right. Body text below. Fixed min-height for row alignment. |
| **Sidebar rail** | Hub navigation | 248px, `--grey-1`, sticky. Border-right rendered via `.shell` pseudo-element so it spans full page height. Back link, hub badge, nav links with 3px blue left-border active state. |

### 5. Implementation Order

1. **Fix active/hover split** (F1) — highest user-trust impact, smallest change
2. **Fix card equal heights** (F2 + F8) — remove `align-items: start` from `.source-grid` and `.extractor-grid`
3. **Fix sidebar rail full-height border** (F5) — move border to `.shell::after`
4. **Fix extractor/source card internal spacing** (F6) — variable row gaps
5. **Align target panel columns with source grid** (F3) — shared column tracks
6. **Add hover to extractor cards** (F4) — apply locked hover pattern
7. **Write locked pattern definitions into design contract** — update `bcrew-ui-design-contract.md` with Section 4 above
8. **Reconcile Foundation card base class** (F7) — separate pass after Dev patterns are Steve-approved

### 6. What NOT to Change Yet

- **Blue pill / foundation-card header** — working, close to canonical. Don't touch.
- **Topbar** — correct per design contract. No changes.
- **Shell layout (sidebar width, main max-width)** — correct at 248px / 1180px.
- **Stat strip** — matches the launcher pattern, no issues raised.
- **Director Lens accordion** — lower-priority section, pattern works. Revisit after cards are locked.
- **"How this works" truth-blurb** — functional, per-contract. Leave it.
- **Page IA / adding new sections** — scope stays on existing Data Pool view. No new pages.
- **Foundation card reconciliation** — don't start until Dev page patterns are locked and Steve has approved the base card shape. Changing Foundation before Dev is locked risks two moving targets.
- **Launcher station cards** — the dark-card launcher style is intentionally different from hub-page white cards. Don't merge them.
